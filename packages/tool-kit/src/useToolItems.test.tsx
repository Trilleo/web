import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StoredItem } from "./meta";
import { ToolStorageError, type ToolStorage } from "./storage";
import { useToolItems } from "./useToolItems";

interface Note {
  body: string;
}

interface PendingPut {
  key: string;
  value: Note;
  resolve: (item: StoredItem<Note>) => void;
  reject: (error: Error) => void;
}

/** A storage whose saves finish only when the test says so. */
function controlledStorage(
  listed: Promise<StoredItem<Note>[]> = Promise.resolve([]),
) {
  const puts: PendingPut[] = [];
  const storage = {
    kind: "account" as const,
    list: vi.fn(() => listed),
    put: vi.fn(
      (key: string, value: Note) =>
        new Promise<StoredItem<Note>>((resolve, reject) => {
          puts.push({ key, value, resolve, reject });
        }),
    ),
    remove: vi.fn(() => Promise.resolve()),
  } satisfies ToolStorage<Note>;
  const finish = async (
    index: number,
    updatedAt = "2026-02-02T00:00:00.000Z",
  ) => {
    const put = puts[index];
    if (!put) throw new Error(`no save #${String(index)}`);
    await act(async () => {
      put.resolve({ key: put.key, value: put.value, updatedAt });
      await Promise.resolve();
    });
  };
  const fail = async (index: number) => {
    await act(async () => {
      puts[index]?.reject(new ToolStorageError("offline"));
      await Promise.resolve();
    });
  };
  return { storage, puts, finish, fail };
}

const note = (key: string, body: string): StoredItem<Note> => ({
  key,
  value: { body },
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("useToolItems", () => {
  it("loads from storage, unless the page already provided the items", async () => {
    const { storage } = controlledStorage(
      Promise.resolve([note("a", "loaded")]),
    );
    const loaded = renderHook(() => useToolItems(storage));
    expect(loaded.result.current.loading).toBe(true);
    await waitFor(() => {
      expect(loaded.result.current.loading).toBe(false);
    });
    expect(loaded.result.current.items).toEqual([note("a", "loaded")]);

    const given = controlledStorage();
    const provided = renderHook(() =>
      useToolItems(given.storage, [note("b", "given")]),
    );
    expect(provided.result.current.loading).toBe(false);
    expect(provided.result.current.items).toEqual([note("b", "given")]);
    expect(given.storage.list).not.toHaveBeenCalled();
  });

  it("reports a failed load", async () => {
    const { storage } = controlledStorage(
      Promise.reject(new ToolStorageError("Down")),
    );
    const { result } = renderHook(() => useToolItems(storage));
    await waitFor(() => {
      expect(result.current.error).toBe("Down");
    });
    expect(result.current.loading).toBe(false);
  });

  it("shows a save at once, then records when it's stored", async () => {
    const { storage, finish } = controlledStorage();
    const { result } = renderHook(() => useToolItems(storage, []));

    act(() => {
      result.current.save("a", { body: "draft" });
    });
    expect(result.current.items.map((item) => item.value.body)).toEqual([
      "draft",
    ]);
    expect(result.current.saveStates.a).toBe("saving");
    expect(result.current.unsaved).toBe(true);

    await finish(0, "2026-03-03T00:00:00.000Z");
    expect(result.current.saveStates.a).toBe("saved");
    expect(result.current.unsaved).toBe(false);
    expect(result.current.items[0]?.updatedAt).toBe("2026-03-03T00:00:00.000Z");
  });

  it("sends only the latest value when edits outpace saving", async () => {
    const { storage, puts, finish } = controlledStorage();
    const { result } = renderHook(() => useToolItems(storage, []));

    act(() => {
      result.current.save("a", { body: "v1" });
      result.current.save("a", { body: "v2" });
      result.current.save("a", { body: "v3" });
    });
    expect(puts.map((put) => put.value.body)).toEqual(["v1"]);
    await finish(0);
    expect(puts.map((put) => put.value.body)).toEqual(["v1", "v3"]);
    await finish(1);
    expect(result.current.saveStates.a).toBe("saved");
    expect(result.current.items[0]?.value.body).toBe("v3");
  });

  it("keeps a failed save for a retry", async () => {
    const { storage, puts, fail, finish } = controlledStorage();
    const { result } = renderHook(() => useToolItems(storage, []));

    act(() => {
      result.current.save("a", { body: "important" });
    });
    await fail(0);
    expect(result.current.saveStates.a).toBe("failed");
    expect(result.current.unsaved).toBe(true);

    act(() => {
      result.current.retry("a");
    });
    expect(puts[1]?.value.body).toBe("important");
    await finish(1);
    expect(result.current.saveStates.a).toBe("saved");
  });

  it("deletes, and a save still under way can't bring it back", async () => {
    const { storage, finish } = controlledStorage();
    const { result } = renderHook(() =>
      useToolItems(storage, [note("old", "x")]),
    );

    act(() => {
      result.current.save("new", { body: "typed then deleted" });
    });
    await act(async () => {
      expect(await result.current.remove("new")).toBe(true);
    });
    expect(result.current.items.map((item) => item.key)).toEqual(["old"]);

    await finish(0);
    // The late save landed after the delete, so it's deleted again.
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(result.current.items.map((item) => item.key)).toEqual(["old"]);
  });

  it("reloads the list on request", async () => {
    const { storage } = controlledStorage(
      Promise.resolve([note("moved", "in")]),
    );
    const { result } = renderHook(() => useToolItems(storage, []));
    expect(result.current.items).toEqual([]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.items).toEqual([note("moved", "in")]);
  });

  it("keeps an item whose delete failed, and says why", async () => {
    const { storage } = controlledStorage();
    storage.remove.mockImplementationOnce(() =>
      Promise.reject(new ToolStorageError("Couldn’t delete")),
    );
    const { result } = renderHook(() =>
      useToolItems(storage, [note("a", "x")]),
    );
    await act(async () => {
      expect(await result.current.remove("a")).toBe(false);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBe("Couldn’t delete");
  });
});
