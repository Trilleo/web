import { describe, expect, it } from "vitest";
import { DEV_DATABASE_DIR, resolveDatabaseUrl } from "./db";

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
