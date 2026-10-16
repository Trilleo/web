import { describe, expect, test } from "vitest";
import { STUDY_STORAGE_KEY, StudyStore, type StoreDeps } from "./store";

const NOW = new Date("2026-11-10T04:00:00Z");

/** A Storage in memory. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

/** A fake server: who's signed in, what it holds, and whether it's up. */
function server(signedIn: boolean) {
  const state = {
    signedIn,
    up: true,
    events: [] as unknown[],
    settings: null as unknown,
    posts: 0,
  };
  const fetcher: typeof fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? "GET";
    if (!state.up) return Promise.reject(new Error("offline"));
    if (url === "/api/study" && method === "GET")
      return Promise.resolve(
        Response.json(
          signedIn
            ? { signedIn: true, events: state.events, settings: state.settings }
            : { signedIn: false },
        ),
      );
    if (url === "/api/study/events" && method === "POST") {
      state.posts += 1;
      const { events } = JSON.parse(init?.body as string) as {
        events: unknown[];
      };
      state.events.push(...events);
      return Promise.resolve(Response.json({ saved: events.length }));
    }
    if (url === "/api/study/settings" && method === "PUT") {
      state.settings = (
        JSON.parse(init?.body as string) as { settings: unknown }
      ).settings;
      return Promise.resolve(Response.json({ settings: state.settings }));
    }
    return Promise.resolve(Response.json({ error: "no" }, { status: 404 }));
  };
  return { state, fetcher };
}

let ids = 0;
function store(
  fetcher: typeof fetch,
  storage: Storage | null,
  extra: Partial<StoreDeps> = {},
) {
  return new StudyStore({
    fetch: fetcher,
    storage: () => storage,
    now: () => NOW,
    uuid: () => {
      ids += 1;
      return `00000000-0000-4000-8000-${String(ids).padStart(12, "0")}`;
    },
    retryMs: 5,
    ...extra,
  });
}

const studied = {
  kind: "studied",
  subject: "circuits",
  item: "ohm",
  data: {},
} as const;

describe("StudyStore", () => {
  test("signed out, keeps records in this browser", async () => {
    const storage = memoryStorage();
    const { fetcher } = server(false);
    const first = store(fetcher, storage);
    await first.load();
    expect(first.getState()).toMatchObject({
      status: "ready",
      mode: "browser",
      events: [],
    });
    first.record([studied]);
    await first.saveSettings({ newPerDay: 5, retention: 0.85 });

    // The next page reads them back.
    const second = store(fetcher, storage);
    await second.load();
    expect(second.getState().events.map((entry) => entry.item)).toEqual([
      "ohm",
    ]);
    expect(second.getState().settings).toEqual({
      newPerDay: 5,
      retention: 0.85,
    });
    expect(storage.getItem(STUDY_STORAGE_KEY)).toContain('"v":1');
  });

  test("signed in, sends records to the account and retries until they arrive", async () => {
    const { state, fetcher } = server(true);
    const account = store(fetcher, memoryStorage());
    await account.load();
    expect(account.getState().mode).toBe("account");
    state.up = false;
    account.record([studied]);
    // The save goes out in the background, and fails.
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(account.getState().unsaved).toBe(1);
    expect(account.getState().error).toBeTruthy();
    state.up = true;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(account.getState()).toMatchObject({ unsaved: 0, error: null });
    expect(state.events).toHaveLength(1);
  });

  test("offers to move this browser's records into the account", async () => {
    const storage = memoryStorage();
    const before = store(server(false).fetcher, storage);
    await before.load();
    before.record([
      studied,
      {
        kind: "attempt",
        subject: "circuits",
        item: "q:ohm:x",
        data: { correct: true, response: "1 V" },
      },
    ]);

    const { state, fetcher } = server(true);
    const after = store(fetcher, storage);
    await after.load();
    expect(after.getState().browserRecords).toBe(2);
    expect(await after.moveBrowserRecords()).toBe(2);
    expect(state.events).toHaveLength(2);
    expect(after.getState()).toMatchObject({ browserRecords: 0 });
    expect(after.getState().events).toHaveLength(2);
    expect(storage.getItem(STUDY_STORAGE_KEY)).toBeNull();
  });

  test("works on in this browser when the server can't be reached", async () => {
    const { state, fetcher } = server(true);
    state.up = false;
    const offline = store(fetcher, memoryStorage());
    await offline.load();
    expect(offline.getState()).toMatchObject({ mode: "browser" });
    expect(offline.getState().error).toMatch(/this browser/);
  });

  test("drops records it can't read back, and refuses bad settings", async () => {
    const storage = memoryStorage();
    storage.setItem(
      STUDY_STORAGE_KEY,
      JSON.stringify({
        events: [{ kind: "nope" }],
        settings: { newPerDay: -1 },
      }),
    );
    const browser = store(server(false).fetcher, storage);
    await browser.load();
    expect(browser.getState().events).toEqual([]);
    expect(browser.getState().settings).toEqual({
      newPerDay: 20,
      retention: 0.9,
    });
    await expect(
      browser.saveSettings({ newPerDay: 1000, retention: 0.9 }),
    ).rejects.toThrow();
  });
});
