import { KEY_PATTERN, type StoredItem } from "./meta";

/** Where a tool keeps its things: this browser, or the signed-in account. */
export interface ToolStorage<T> {
  readonly kind: "browser" | "account";
  list(): Promise<StoredItem<T>[]>;
  put(key: string, value: T): Promise<StoredItem<T>>;
  remove(key: string): Promise<void>;
}

/** A storage failure, with a message fit to show (and the HTTP status, if any). */
export class ToolStorageError extends Error {
  override name = "ToolStorageError";
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStoredItem(value: unknown): value is StoredItem<unknown> {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    "value" in value &&
    typeof value.updatedAt === "string"
  );
}

function checkKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new ToolStorageError(`Invalid key: ${key}`);
}

type Saved = Record<string, { value: unknown; updatedAt: string }>;

/** Runs synchronous work as a promise, so failures reject like the API's do. */
function attempt<R>(work: () => R): Promise<R> {
  return new Promise((resolve) => {
    resolve(work());
  });
}

/**
 * Where signed-out tool data lives: localStorage, or this tab's sessionStorage when
 * the visitor turned "preferences" off in the cookie settings. Mirrors
 * preferenceStorage() in @trilleo/ui's consent.ts (tool-kit doesn't depend on ui):
 * keep the key and the rule the same.
 */
export const CONSENT_STORAGE_KEY = "trilleo:consent";

export function preferenceStore(): Storage | null {
  try {
    // Throws in some privacy modes; missing outside browsers.
    if (typeof localStorage === "undefined") return null;
    let off = false;
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      const consent: unknown = raw ? JSON.parse(raw) : null;
      off =
        typeof consent === "object" &&
        consent !== null &&
        (consent as { preferences?: unknown }).preferences === false;
    } catch {
      // A broken record is no choice: preferences stay on, as in consent.ts.
    }
    return off ? sessionStorage : localStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps a tool's things in this browser (one entry per tool, where preferenceStore
 * says). Used when nobody is signed in. Unreadable or corrupt data counts as empty.
 */
export function browserStorage<T>(
  slug: string,
  getStore: () => Storage | null = preferenceStore,
): ToolStorage<T> {
  const name = `trilleo:tool:${slug}`;

  const read = (): Saved => {
    try {
      const raw = getStore()?.getItem(name);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (!isRecord(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([key, entry]) =>
            KEY_PATTERN.test(key) &&
            isRecord(entry) &&
            "value" in entry &&
            typeof entry.updatedAt === "string",
        ),
      ) as Saved;
    } catch {
      return {};
    }
  };

  const write = (saved: Saved): void => {
    const store = getStore();
    if (!store)
      throw new ToolStorageError("This browser can’t save anything here.");
    try {
      store.setItem(name, JSON.stringify(saved));
    } catch {
      throw new ToolStorageError("This browser’s storage is full or blocked.");
    }
  };

  return {
    kind: "browser",
    list: () =>
      attempt(() =>
        Object.entries(read()).map(([key, entry]) => ({
          key,
          value: entry.value as T,
          updatedAt: entry.updatedAt,
        })),
      ),
    put: (key, value) =>
      attempt(() => {
        checkKey(key);
        const entry = { value, updatedAt: new Date().toISOString() };
        write({ ...read(), [key]: entry });
        return { key, ...entry };
      }),
    remove: (key) =>
      attempt(() => {
        write(
          Object.fromEntries(Object.entries(read()).filter(([k]) => k !== key)),
        );
      }),
  };
}

async function failureMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") return body.error;
  } catch {
    // Not JSON: fall through to a generic message.
  }
  return response.status === 401
    ? "You’re signed out. Sign in again to save."
    : `The server couldn’t save (${String(response.status)}).`;
}

/**
 * Keeps a tool's things in the signed-in account, via the site's data API
 * (/api/tools/<slug>/data). Failures throw a ToolStorageError worth showing.
 */
export function accountStorage<T>(
  slug: string,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): ToolStorage<T> {
  const base = `/api/tools/${encodeURIComponent(slug)}/data`;
  const itemUrl = (key: string) => `${base}/${encodeURIComponent(key)}`;

  const request = async (
    url: string,
    init: RequestInit = {},
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, headers });
    } catch {
      throw new ToolStorageError(
        "Couldn’t reach the server. Check your connection.",
      );
    }
    if (!response.ok) {
      throw new ToolStorageError(
        await failureMessage(response),
        response.status,
      );
    }
    return response;
  };

  return {
    kind: "account",
    async list() {
      const body: unknown = await (await request(base)).json();
      if (!isRecord(body) || !Array.isArray(body.items)) {
        throw new ToolStorageError("The server sent something unexpected.");
      }
      return body.items.filter(isStoredItem) as StoredItem<T>[];
    },
    async put(key, value) {
      checkKey(key);
      const response = await request(itemUrl(key), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const body: unknown = await response.json();
      if (!isStoredItem(body)) {
        throw new ToolStorageError("The server sent something unexpected.");
      }
      return body as StoredItem<T>;
    },
    async remove(key) {
      checkKey(key);
      await request(itemUrl(key), { method: "DELETE" });
    },
  };
}

/**
 * Moves everything from one storage to another (e.g. this browser's notes into a
 * newly signed-in account), deleting each from the source once it's saved. Stops at
 * the first failure, so nothing is lost. Returns how many moved.
 */
export async function moveItems<T>(
  from: ToolStorage<T>,
  to: ToolStorage<T>,
): Promise<number> {
  let moved = 0;
  for (const item of await from.list()) {
    await to.put(item.key, item.value);
    await from.remove(item.key);
    moved += 1;
  }
  return moved;
}
