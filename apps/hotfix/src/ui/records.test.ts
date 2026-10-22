import { describe, expect, it } from "vitest";
import { newRun, score } from "../core";
import {
  NO_RECORDS,
  RECORDS_KEY,
  afterRun,
  dailyBest,
  loadRecords,
  saveRecords,
} from "./records";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe("records", () => {
  it("start empty, and keep what's saved", () => {
    const storage = memoryStorage();
    expect(loadRecords(storage)).toEqual(NO_RECORDS);
    expect(loadRecords(null)).toEqual(NO_RECORDS);
    const kept = {
      best: 500,
      furthest: 420,
      runs: 3,
      tokens: 8,
      daily: { day: "2026-10-22", best: 90 },
    };
    saveRecords(storage, kept);
    expect(loadRecords(storage)).toEqual(kept);
  });

  it("ignore broken or tampered data", () => {
    const storage = memoryStorage();
    storage.setItem(RECORDS_KEY, "{not json");
    expect(loadRecords(storage)).toEqual(NO_RECORDS);
    storage.setItem(
      RECORDS_KEY,
      JSON.stringify({ best: -4, furthest: "far", runs: 1.5, tokens: 2 }),
    );
    expect(loadRecords(storage)).toEqual({ ...NO_RECORDS, tokens: 2 });
  });

  it("add a finished run, and say whether it's the best", () => {
    const run = newRun(1);
    run.distance = 1234;
    run.tokens = 4;
    const first = afterRun(NO_RECORDS, run);
    expect(first.newBest).toBe(true);
    expect(first.records).toEqual({
      best: score(run),
      furthest: 123,
      runs: 1,
      tokens: 4,
      daily: null,
    });
    const again = afterRun(first.records, run);
    expect(again.newBest).toBe(false);
    expect(again.records.runs).toBe(2);
    expect(again.records.tokens).toBe(8);
  });

  it("keep the Daily Run's best per day, apart from the endless one", () => {
    const run = newRun(1);
    run.distance = 500;
    const today = afterRun(NO_RECORDS, run, "daily", "2026-10-22");
    expect(today.newBest).toBe(true);
    expect(today.records.best).toBe(0);
    expect(dailyBest(today.records, "2026-10-22")).toBe(score(run));
    expect(dailyBest(today.records, "2026-10-23")).toBe(0);
    const tomorrow = afterRun(today.records, run, "daily", "2026-10-23");
    expect(tomorrow.newBest).toBe(true);
  });
});
