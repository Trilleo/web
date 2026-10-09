import { beforeEach, describe, expect, it } from "vitest";
import {
  ToolStorageError,
  accountStorage,
  CONSENT_STORAGE_KEY,
  browserStorage,
  moveItems,
  preferenceStore,
  type ToolStorage,
} from "./storage";

interface Note {
  body: string;
}

/** A Storage that can be told to refuse writes (full, or blocked). */
function memoryStore(): Storage & { refuse: boolean } {
  const data = new Map<string, string>();
  return {
    refuse: false,
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
    setItem(key, value) {
      if (this.refuse) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
  };
}

describe("browserStorage", () => {
  let store: ReturnType<typeof memoryStore>;
  let notes: ToolStorage<Note>;
  beforeEach(() => {
    store = memoryStore();
    notes = browserStorage<Note>("notes", () => store);
  });

  it("saves, lists and removes items under one entry per tool", async () => {
    const saved = await notes.put("a1", { body: "hello" });
    expect(saved).toMatchObject({ key: "a1", value: { body: "hello" } });
    expect(Date.parse(saved.updatedAt)).not.toBeNaN();
    await notes.put("b2", { body: "world" });

    expect((await notes.list()).map((item) => item.key)).toEqual(["a1", "b2"]);
    expect(store.getItem("trilleo:tool:notes")).toContain("hello");

    await notes.remove("a1");
    expect((await notes.list()).map((item) => item.key)).toEqual(["b2"]);
  });

  it("keeps tools apart", async () => {
    await notes.put("a1", { body: "note" });
    const other = browserStorage<Note>("other", () => store);
    expect(await other.list()).toEqual([]);
  });

  it("treats corrupt or foreign data as empty", async () => {
    store.setItem("trilleo:tool:notes", "{not json");
    expect(await notes.list()).toEqual([]);
    store.setItem(
      "trilleo:tool:notes",
      JSON.stringify({
        "bad key!": { value: 1, updatedAt: "x" },
        ok: { value: 2 },
      }),
    );
    expect(await notes.list()).toEqual([]);
  });

  it("explains a full or blocked storage", async () => {
    store.refuse = true;
    await expect(notes.put("a1", { body: "x" })).rejects.toThrow(
      ToolStorageError,
    );
    const nowhere = browserStorage<Note>("notes", () => null);
    await expect(nowhere.put("a1", { body: "x" })).rejects.toThrow(
      /can’t save/,
    );
    expect(await nowhere.list()).toEqual([]);
  });

  it("refuses keys the data API wouldn't accept", async () => {
    await expect(notes.put("../etc", { body: "x" })).rejects.toThrow(
      /Invalid key/,
    );
  });
});

describe("accountStorage", () => {
  interface Call {
    url: string;
    init: RequestInit | undefined;
  }

  function fakeApi(respond: (call: Call) => Response) {
    const calls: Call[] = [];
    const fetchImpl: typeof fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const call = { url, init };
      calls.push(call);
      return Promise.resolve(respond(call));
    };
    return { calls, notes: accountStorage<Note>("notes", fetchImpl) };
  }

  const item = {
    key: "a1",
    value: { body: "hi" },
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("lists, saves and deletes through the data API", async () => {
    const { calls, notes } = fakeApi(({ init }) =>
      init?.method === "PUT"
        ? Response.json(item)
        : init?.method === "DELETE"
          ? new Response(null, { status: 204 })
          : Response.json({ items: [item, { junk: true }] }),
    );

    expect(await notes.list()).toEqual([item]);
    expect(await notes.put("a1", { body: "hi" })).toEqual(item);
    await notes.remove("a1");

    expect(calls.map((call) => [call.init?.method ?? "GET", call.url])).toEqual(
      [
        ["GET", "/api/tools/notes/data"],
        ["PUT", "/api/tools/notes/data/a1"],
        ["DELETE", "/api/tools/notes/data/a1"],
      ],
    );
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ value: { body: "hi" } }),
    );
    expect(new Headers(calls[1]?.init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("passes on the server's explanation, with the status", async () => {
    const { notes } = fakeApi(() =>
      Response.json({ error: "That’s too big to save." }, { status: 413 }),
    );
    const failure = await notes
      .put("a1", { body: "x" })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ToolStorageError);
    expect(failure).toMatchObject({
      message: "That’s too big to save.",
      status: 413,
    });
  });

  it("explains being signed out and being offline", async () => {
    const signedOut = fakeApi(() => new Response("", { status: 401 }));
    await expect(signedOut.notes.list()).rejects.toThrow(/signed out/);

    const offline = accountStorage<Note>("notes", () =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    await expect(offline.list()).rejects.toThrow(/Couldn’t reach the server/);
  });
});

describe("moveItems", () => {
  it("moves everything and empties the source", async () => {
    const store = memoryStoreWith(2);
    const from = browserStorage<Note>("notes", () => store);
    const saved: string[] = [];
    const to: ToolStorage<Note> = {
      kind: "account",
      list: () => Promise.resolve([]),
      put: (key, value) => {
        saved.push(key);
        return Promise.resolve({ key, value, updatedAt: "now" });
      },
      remove: () => Promise.resolve(),
    };
    expect(await moveItems(from, to)).toBe(2);
    expect(saved).toEqual(["n0", "n1"]);
    expect(await from.list()).toEqual([]);
  });

  it("stops at the first failure and keeps what didn't move", async () => {
    const store = memoryStoreWith(3);
    const from = browserStorage<Note>("notes", () => store);
    let puts = 0;
    const to: ToolStorage<Note> = {
      kind: "account",
      list: () => Promise.resolve([]),
      put: (key, value) =>
        ++puts === 2
          ? Promise.reject(new ToolStorageError("nope"))
          : Promise.resolve({ key, value, updatedAt: "now" }),
      remove: () => Promise.resolve(),
    };
    await expect(moveItems(from, to)).rejects.toThrow("nope");
    expect((await from.list()).map((item) => item.key)).toEqual(["n1", "n2"]);
  });
});

/** A store already holding `count` notes (n0, n1, …). */
function memoryStoreWith(count: number): Storage {
  const store = memoryStore();
  const entries = Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `n${String(i)}`,
      {
        value: { body: `note ${String(i)}` },
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]),
  );
  store.setItem("trilleo:tool:notes", JSON.stringify(entries));
  return store;
}

describe("preferenceStore", () => {
  it("is localStorage, or this tab's sessionStorage with preferences off", () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    expect(preferenceStore()).toBe(localStorage);
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ v: 1, analytics: false, preferences: false, at: "x" }),
    );
    expect(preferenceStore()).toBe(sessionStorage);
    localStorage.setItem(CONSENT_STORAGE_KEY, "{broken");
    expect(preferenceStore()).toBe(localStorage);
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  });
});
