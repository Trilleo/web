import type { DatabaseHandle } from "@trilleo/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATABASE_KEY,
  DEV_DATABASE_DIR,
  closeDatabase,
  guardShutdown,
  isDatabaseFolder,
  resolveDatabaseUrl,
} from "./db";

type Store = Record<
  symbol,
  { handle?: Promise<DatabaseHandle>; guarded?: boolean } | undefined
>;
const store = globalThis as unknown as Store;

/** Puts a fake open database in the shared slot; returns its close spy. */
function fakeOpen() {
  const close = vi.fn(() => Promise.resolve());
  const state = (store[DATABASE_KEY] ??= {});
  state.handle = Promise.resolve({
    db: {},
    close,
  } as unknown as DatabaseHandle);
  return close;
}

afterEach(() => {
  store[DATABASE_KEY] = undefined;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("resolveDatabaseUrl", () => {
  it("uses DATABASE_URL whenever it's set", () => {
    const env = { DATABASE_URL: "postgres://trilleo@db:5432/trilleo" };
    expect(resolveDatabaseUrl(env, false)).toBe(env.DATABASE_URL);
    expect(resolveDatabaseUrl(env, true)).toBe(env.DATABASE_URL);
    expect(resolveDatabaseUrl({ DATABASE_URL: " memory:// " }, false)).toBe(
      "memory://",
    );
  });

  it("falls back to a local PGlite folder in dev", () => {
    expect(resolveDatabaseUrl({}, true)).toBe(DEV_DATABASE_DIR);
    expect(resolveDatabaseUrl({ DATABASE_URL: "" }, true)).toBe(
      DEV_DATABASE_DIR,
    );
  });

  it("refuses to guess outside dev", () => {
    expect(() => resolveDatabaseUrl({}, false)).toThrow(/DATABASE_URL/);
  });
});

describe("isDatabaseFolder", () => {
  it("is only a PGlite folder on disk", () => {
    expect(isDatabaseFolder(DEV_DATABASE_DIR)).toBe(true);
    expect(isDatabaseFolder("memory://")).toBe(false);
    expect(isDatabaseFolder("postgres://trilleo@db:5432/trilleo")).toBe(false);
  });
});

describe("the shared database", () => {
  it("survives the module being loaded again, as dev reloads it", async () => {
    vi.stubEnv("DATABASE_URL", "memory://");
    const first = await import("./db");
    vi.resetModules();
    const again = await import("./db");
    expect(again).not.toBe(first);
    expect(await again.getDb()).toBe(await first.getDb());
    await closeDatabase();
  });

  it("closes once and forgets, so the next use opens it again", async () => {
    const close = fakeOpen();
    await closeDatabase();
    await closeDatabase();
    expect(close).toHaveBeenCalledTimes(1);
    expect(store[DATABASE_KEY]?.handle).toBeUndefined();
  });

  it("ignores a database that never opened", async () => {
    const state = (store[DATABASE_KEY] ??= {});
    state.handle = Promise.reject(new Error("no"));
    await expect(closeDatabase()).resolves.toBeUndefined();
  });
});

describe("guardShutdown", () => {
  function target() {
    const handlers = new Map<string, () => void>();
    const exit = vi.fn();
    return {
      handlers,
      exit,
      process: {
        once: (signal: string, handler: () => void) => {
          handlers.set(signal, handler);
        },
        exit,
      } as unknown as Parameters<typeof guardShutdown>[0],
    };
  }

  it("closes the database on Ctrl-C before exiting, and installs once", async () => {
    const close = fakeOpen();
    const t = target();
    guardShutdown(t.process);
    guardShutdown(t.process);
    expect([...t.handlers.keys()].sort()).toEqual(["SIGHUP", "SIGINT"]);
    t.handlers.get("SIGINT")?.();
    await vi.waitFor(() => {
      expect(t.exit).toHaveBeenCalledWith(130);
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("exits anyway when the database won't close", async () => {
    vi.useFakeTimers();
    const state = (store[DATABASE_KEY] ??= {});
    state.handle = Promise.resolve({
      db: {},
      close: () => new Promise<void>(() => undefined),
    } as unknown as DatabaseHandle);
    const t = target();
    guardShutdown(t.process);
    t.handlers.get("SIGHUP")?.();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.exit).toHaveBeenCalledWith(129);
  });
});
