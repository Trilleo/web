import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  dailyReward,
  dayOf,
  describeTask,
  type DailyTask,
} from "./content/daily";
import { ISLAND_MAPS, NEIGHBOURS, charAt, tileKind } from "./content/islands";
import { advance, applyAction, dailyTasks, newGame } from "./engine";
import { parseSave } from "./save";
import { GameRuleError, type GameState } from "./types";

// Midday, so a few hours of play stay on the same day.
const DAY = 20_000;
const NOON = DAY * DAY_MS + DAY_MS / 2;

function besideWheat(state: GameState): GameState {
  const home = ISLAND_MAPS.home;
  for (let y = 0; y < home.height; y++) {
    for (let x = 0; x < home.width; x++) {
      if (charAt(home, x, y) !== '"') continue;
      for (const [dx, dy] of NEIGHBOURS) {
        if (tileKind(charAt(home, x + dx, y + dy)) === "ground") {
          return { ...state, pos: { island: "home", x: x + dx, y: y + dy } };
        }
      }
    }
  }
  throw new Error("no wheat");
}

/** Today's tasks, all marked done. */
function finished(state: GameState): GameState {
  return {
    ...state,
    daily: {
      ...state.daily,
      tasks: state.daily.tasks.map((task) => ({
        ...task,
        progress: task.target,
      })),
    },
  };
}

describe("daily tasks", () => {
  it("arrive with the day: three of them, the same for the same island", () => {
    const game = advance(newGame(1, NOON - 1000), NOON);
    expect(game.daily.day).toBe(DAY);
    expect(game.daily.tasks).toHaveLength(3);
    expect(advance(newGame(1, NOON - 1000), NOON).daily).toEqual(game.daily);
    // A new player gets what a new player can do.
    for (const task of game.daily.tasks) {
      expect([
        "Gather 80 Wheat",
        "Gather 30 Oak Log",
        "Earn 100 XP in any skill",
      ]).toContain(describeTask(task));
    }
  });

  it("vary with what you've unlocked", () => {
    const veteran = {
      ...newGame(1, NOON),
      collections: { rotten_flesh: 5, string: 5, coal: 10, gold: 3 },
      inventory: { fishing_rod: 1 },
    };
    const kinds = new Set(
      Array.from({ length: 30 }, (_, i) => dailyTasks(veteran, DAY + i))
        .flat()
        .map((task) => task.kind),
    );
    expect(kinds).toEqual(new Set(["gather", "kill", "fish", "xp"]));
  });

  it("move along as you play, and say when they're done", () => {
    let state = besideWheat(advance(newGame(1, NOON - 1000), NOON));
    state = {
      ...state,
      daily: {
        ...state.daily,
        tasks: [
          {
            kind: "gather",
            key: "wheat",
            target: 2,
            progress: 0,
          } satisfies DailyTask,
        ],
      },
    };
    const wheat = besideWheatTarget(state);
    const first = applyAction(state, { t: NOON + 10, k: "gather", ...wheat });
    expect(first.state.daily.tasks[0]?.progress).toBeGreaterThanOrEqual(1);
    const second = applyAction(first.state, {
      t: NOON + 20_000,
      k: "gather",
      ...wheat,
    });
    expect(second.state.daily.tasks[0]?.progress).toBe(2);
    expect(second.events).toContainEqual({
      type: "note",
      text: "Task done: Gather 2 Wheat.",
    });
  });

  it("pay a reward once they're all done, more for a streak", () => {
    const today = advance(newGame(1, NOON - 1000), NOON);
    expect(() => applyAction(today, { t: NOON + 1, k: "daily" })).toThrow(
      GameRuleError,
    );

    const day1 = applyAction(finished(today), {
      t: NOON + 1,
      k: "daily",
    }).state;
    expect(day1.coins).toBe(dailyReward(1));
    expect(day1.daily).toMatchObject({
      claimed: true,
      streak: 1,
      lastClaimed: DAY,
    });
    expect(() => applyAction(day1, { t: NOON + 2, k: "daily" })).toThrow(
      /today's reward/,
    );

    const tomorrow = advance(day1, NOON + DAY_MS);
    expect(tomorrow.daily).toMatchObject({
      day: DAY + 1,
      claimed: false,
      streak: 1,
    });
    const day2 = applyAction(finished(tomorrow), {
      t: NOON + DAY_MS + 1,
      k: "daily",
    }).state;
    expect(day2.daily.streak).toBe(2);
    expect(day2.coins - day1.coins).toBe(dailyReward(2));

    // A day missed: the streak starts again.
    const later = advance(day2, NOON + 3 * DAY_MS);
    const again = applyAction(finished(later), {
      t: NOON + 3 * DAY_MS + 1,
      k: "daily",
    }).state;
    expect(again.daily.streak).toBe(1);
  });

  it("are counted in UTC days", () => {
    expect(dayOf(DAY * DAY_MS)).toBe(DAY);
    expect(dayOf(DAY * DAY_MS - 1)).toBe(DAY - 1);
  });

  it("come with old saves that had none", () => {
    const current = newGame(1, NOON);
    const old = Object.fromEntries(
      Object.entries(current).filter(([key]) => key !== "daily"),
    );
    expect(parseSave(old)?.daily).toEqual(current.daily);
    expect(parseSave({ ...current, daily: { day: "today" } })).toBeNull();
  });
});

function besideWheatTarget(state: GameState) {
  const home = ISLAND_MAPS.home;
  for (const [dx, dy] of NEIGHBOURS) {
    const x = state.pos.x + dx;
    const y = state.pos.y + dy;
    if (charAt(home, x, y) === '"') return { x, y };
  }
  throw new Error("not beside wheat");
}
