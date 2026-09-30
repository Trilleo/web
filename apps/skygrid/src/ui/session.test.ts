import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ISLAND_MAPS, newGame, type GameState } from "../core";
import { GameSession, SAVE_DELAY_MS, SAVE_KEY, loadSave } from "./session";

const T0 = 1_800_000_000_000;

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

describe("GameSession", () => {
  let clock = T0;
  const now = () => clock;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = T0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a new island and saves it shortly after you act", () => {
    const storage = memoryStorage();
    const session = new GameSession(null, { now, storage });
    expect(session.getView().log.at(-1)?.text).toMatch(/wake up/);
    clock += 200;
    expect(session.act({ k: "move", d: "R" })).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(loadSave(storage)?.pos).toEqual(session.getView().state.pos);
  });

  it("logs why an action isn't allowed, except bumping into things", () => {
    const session = new GameSession(null, { now, storage: null });
    const lines = session.getView().log.length;
    expect(session.act({ k: "sell", item: "wheat", n: 1 })).toBe(false);
    expect(session.getView().log.at(-1)).toMatchObject({ tone: "warn" });
    expect(session.act({ k: "move", d: "U" })).toBe(true);
    clock += 150;
    session.act({ k: "move", d: "U" }); // may or may not be blocked; never logged
    expect(session.getView().log.length).toBe(lines + 1);
  });

  it("tells you what minions made while you were away", () => {
    const slot = ISLAND_MAPS.home.slots[0];
    const saved: GameState = {
      ...newGame(1, T0),
      minions: [
        { kind: "wheat", tier: 1, stored: 0, lastAt: T0 },
        ...ISLAND_MAPS.home.slots.slice(1).map(() => null),
      ],
    };
    expect(slot).toBeDefined();
    clock = T0 + 10 * 60_000;
    const session = new GameSession(saved, { now, storage: null });
    expect(session.getView().log.at(-1)?.text).toBe(
      "While you were away, your minions made 20 Wheat.",
    );
  });

  it("shows a gather's haul when the work is done", () => {
    const tree = { x: 17, y: 7 };
    const start: GameState = {
      ...newGame(1, T0),
      pos: { island: "home", x: 18, y: 7 },
    };
    const session = new GameSession(start, { now, storage: null });
    clock += 10;
    expect(session.act({ k: "gather", ...tree })).toBe(true);
    expect(session.getView().busy).toMatchObject(tree);
    expect(session.getView().log.at(-1)?.text).not.toMatch(/Oak Log/);
    vi.advanceTimersByTime(3200);
    expect(session.getView().busy).toBeNull();
    expect(session.getView().log.at(-1)?.text).toBe("+1 Oak Log");
    expect(session.getView().floaters.map((f) => f.text)).toContain(
      "+1 Oak Log",
    );
  });
});
