/**
 * Daily tasks: three a day (UTC), picked from what you've already unlocked, the same
 * way on every device and on the server (seeded by the day and your island).
 */
import type { SkillId } from "../types";
import { itemName } from "./items";
import { NODES } from "./nodes";
import { SKILL_NAMES } from "./progression";

export type TaskKind = "gather" | "kill" | "fish" | "minion" | "xp";

export interface DailyTask {
  kind: TaskKind;
  /** What counts: an item (gather), a mob's name (kill), a skill (xp), or "any". */
  key: string;
  target: number;
  progress: number;
}

export interface Daily {
  /** The UTC day these tasks are for (days since 1970); -1: none yet. */
  day: number;
  tasks: DailyTask[];
  /** Today's reward has been claimed. */
  claimed: boolean;
  /** Days in a row with the reward claimed, ending on `lastClaimed`. */
  streak: number;
  lastClaimed: number;
}

export const TASKS_PER_DAY = 3;
export const DAY_MS = 86_400_000;

export function dayOf(time: number): number {
  return Math.floor(time / DAY_MS);
}

export const NO_DAILY: Daily = {
  day: -1,
  tasks: [],
  claimed: false,
  streak: 0,
  lastClaimed: -1,
};

/** Coins for finishing a day's tasks, on the `streak`-th day in a row. */
export function dailyReward(streak: number): number {
  return 150 + 50 * Math.min(streak, 10);
}

/** The streak as it stands today: it's over if yesterday went unclaimed. */
export function currentStreak(daily: Daily, day: number): number {
  return daily.lastClaimed >= day - 1 ? daily.streak : 0;
}

/** Amounts that take a few minutes of focused play: quick nodes ask for more. */
export function gatherTarget(ms: number): number {
  return Math.max(10, Math.round(40_000 / ms / 10) * 10);
}

export function describeTask(task: DailyTask): string {
  const n = task.target.toLocaleString("en");
  switch (task.kind) {
    case "gather":
      return `Gather ${n} ${itemName(task.key)}`;
    case "kill":
      return `Defeat ${n} ${task.key}${task.target === 1 ? "" : "s"}`;
    case "fish":
      return `Catch ${n} fish`;
    case "minion":
      return `Collect ${n} items from your minions`;
    case "xp":
      return task.key === "any"
        ? `Earn ${n} XP in any skill`
        : `Earn ${n} ${SKILL_NAMES[task.key as SkillId]} XP`;
  }
}

/** The nodes worth a gather task: always the starters, then whatever you've gathered. */
export function gatherCandidates(collections: Record<string, number>) {
  return Object.values(NODES).filter(
    (node) =>
      node.item === "wheat" ||
      node.item === "oak_log" ||
      (collections[node.item] ?? 0) > 0,
  );
}
