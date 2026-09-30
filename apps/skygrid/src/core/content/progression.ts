import type { SkillId } from "../types";

export const MAX_LEVEL = 25;

/** XP needed for each next level: index 0 is level 0 → 1. */
const XP_STEPS = [
  25, 60, 100, 150, 250, 375, 500, 750, 1000, 1750, 2500, 3750, 5000, 7500,
  10000, 15000, 25000, 37500, 50000, 100000, 150000, 200000, 250000, 300000,
  350000,
] as const;

/** Total XP at each level: LEVEL_XP[n] is the XP where level n starts. */
export const LEVEL_XP: readonly number[] = XP_STEPS.reduce<number[]>(
  (totals, step) => [...totals, (totals.at(-1) ?? 0) + step],
  [0],
);

export function levelOf(xp: number): number {
  let level = 0;
  while (level < MAX_LEVEL && xp >= (LEVEL_XP[level + 1] ?? Infinity)) {
    level += 1;
  }
  return level;
}

/** How far into the current level, 0–1 (1 at the maximum). */
export function levelProgress(xp: number): number {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return 1;
  const start = LEVEL_XP[level] ?? 0;
  const end = LEVEL_XP[level + 1] ?? start + 1;
  return (xp - start) / (end - start);
}

/** Coins for reaching a level. */
export function levelReward(level: number): number {
  return level * 25;
}

export const SKILL_NAMES: Readonly<Record<SkillId, string>> = {
  farming: "Farming",
  mining: "Mining",
  foraging: "Foraging",
  fishing: "Fishing",
};

/** Each level adds this much fortune (percent more drops) to its skill's gathering. */
export const FORTUNE_PER_LEVEL = 4;

/** Collection milestones: tier n is reached at COLLECTION_TIERS[n - 1]. */
export const COLLECTION_TIERS = [
  50, 100, 250, 1000, 2500, 5000, 10000, 25000, 50000,
] as const;

export function collectionTier(count: number): number {
  return COLLECTION_TIERS.filter((threshold) => count >= threshold).length;
}

export function collectionReward(tier: number): number {
  return tier * 50;
}
