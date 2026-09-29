import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoredItem } from "./meta";
import { accountStorage, browserStorage, type ToolStorage } from "./storage";

export type SaveState = "saving" | "saved" | "failed";

export interface ToolItems<T> {
  items: StoredItem<T>[];
  /** True until the first list has loaded (never, when the page provided it). */
  loading: boolean;
  /** The last failure to load or delete, fit to show. */
  error: string | null;
  saveStates: Readonly<Partial<Record<string, SaveState>>>;
  /** Something typed hasn't reached storage yet (or failed to). */
  unsaved: boolean;
  /** Shows the change at once and saves it in the background. */
  save: (key: string, value: T) => void;
  /** Tries a failed save again. */
  retry: (key: string) => void;
  /** Deletes; resolves to whether it worked. */
  remove: (key: string) => Promise<boolean>;
  /** Fetches the list again (e.g. after moving things into it). */
  reload: () => Promise<void>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** This browser's storage, or the account's when signed in; stable across renders. */
export function useToolStorage<T>(
  slug: string,
  signedIn: boolean,
): ToolStorage<T> {
  return useMemo(
    () => (signedIn ? accountStorage<T>(slug) : browserStorage<T>(slug)),
    [slug, signedIn],
  );
}

/**
 * A tool's saved things, kept in step with storage. Saves are optimistic and one at a
 * time per key: typing faster than the network only sends the latest value.
 * `initial` (from the server-rendered page) skips the first load.
 */
export function useToolItems<T>(
  storage: ToolStorage<T>,
  initial?: StoredItem<T>[],
): ToolItems<T> {
  const [items, setItems] = useState<StoredItem<T>[]>(initial ?? []);
  const [loading, setLoading] = useState(initial === undefined);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<
    Partial<Record<string, SaveState>>
  >({});

  // The newest unsaved value per key, keys with a save under way, and keys deleted
  // meanwhile (a late save must not bring them back).
  const pending = useRef(new Map<string, T>());
  const inFlight = useRef(new Set<string>());
  const removed = useRef(new Set<string>());
  const hasInitial = useRef(initial !== undefined);

  useEffect(() => {
    if (hasInitial.current) return;
    let cancelled = false;
    storage.list().then(
      (list) => {
        if (cancelled) return;
        setItems(list);
        setLoading(false);
      },
      (failure: unknown) => {
        if (cancelled) return;
        setError(messageOf(failure));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const setSaveState = (key: string, state: SaveState | undefined) => {
    setSaveStates((states) => {
      const others = Object.entries(states).filter(([other]) => other !== key);
      return Object.fromEntries(state ? [...others, [key, state]] : others);
    });
  };

  /** Saves a key's waiting value, then any newer one typed meanwhile, until none is left. */
  const flush = useCallback(
    (key: string) => {
      if (inFlight.current.has(key) || !pending.current.has(key)) return;
      inFlight.current.add(key);
      setSaveState(key, "saving");

      void (async () => {
        let saved: StoredItem<T> | undefined;
        for (
          let value = pending.current.get(key);
          value !== undefined;
          value = pending.current.get(key)
        ) {
          pending.current.delete(key);
          try {
            saved = await storage.put(key, value);
          } catch {
            inFlight.current.delete(key);
            // Keep what was typed (unless something newer is waiting) for a retry.
            if (!pending.current.has(key)) pending.current.set(key, value);
            setSaveState(key, "failed");
            return;
          }
          if (removed.current.has(key)) {
            // Deleted while this save was under way: delete it again.
            inFlight.current.delete(key);
            await storage.remove(key).catch(() => undefined);
            return;
          }
        }
        inFlight.current.delete(key);
        const updatedAt = saved?.updatedAt;
        if (updatedAt) {
          setItems((list) =>
            list.map((item) =>
              item.key === key ? { ...item, updatedAt } : item,
            ),
          );
        }
        setSaveState(key, "saved");
      })();
    },
    [storage],
  );

  const save = useCallback(
    (key: string, value: T) => {
      removed.current.delete(key);
      setItems((list) =>
        list.some((item) => item.key === key)
          ? list.map((item) => (item.key === key ? { ...item, value } : item))
          : [...list, { key, value, updatedAt: new Date().toISOString() }],
      );
      pending.current.set(key, value);
      flush(key);
    },
    [flush],
  );

  const remove = useCallback(
    async (key: string) => {
      pending.current.delete(key);
      removed.current.add(key);
      try {
        await storage.remove(key);
      } catch (failure) {
        removed.current.delete(key);
        setError(messageOf(failure));
        return false;
      }
      setItems((list) => list.filter((item) => item.key !== key));
      setSaveState(key, undefined);
      setError(null);
      return true;
    },
    [storage],
  );

  const reload = useCallback(async () => {
    try {
      setItems(await storage.list());
      setError(null);
    } catch (failure) {
      setError(messageOf(failure));
    }
  }, [storage]);

  const unsaved = Object.values(saveStates).some(
    (state) => state === "saving" || state === "failed",
  );

  return {
    items,
    loading,
    error,
    saveStates,
    unsaved,
    save,
    retry: flush,
    remove,
    reload,
  };
}
