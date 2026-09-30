import type { SkillId } from "../types";
import type { ResourceId } from "./items";

/** What makes you tougher and hit harder. Percentages are whole numbers. */
export interface Stats {
  /** Maximum health. */
  health: number;
  /** Damage taken is multiplied by 100 / (100 + defense). */
  defense: number;
  /** Damage dealt goes up by this percentage. */
  strength: number;
  /** Chance of a critical hit, in percent. */
  critChance: number;
  /** A critical hit does this much more damage, in percent. */
  critDamage: number;
  /** The weapon's base damage (bare hands add 5). */
  damage: number;
}

export const STAT_NAMES: Readonly<Record<keyof Stats, string>> = {
  health: "Health",
  defense: "Defense",
  strength: "Strength",
  critChance: "Crit chance",
  critDamage: "Crit damage",
  damage: "Damage",
};

export const BASE_STATS: Readonly<Stats> = {
  health: 100,
  defense: 0,
  strength: 0,
  critChance: 10,
  critDamage: 50,
  damage: 5,
};

/** What each skill level adds. Combat's damage bonus is separate (COMBAT_DAMAGE_PER_LEVEL). */
export const SKILL_STATS: Readonly<Record<SkillId, Partial<Stats>>> = {
  farming: { health: 2 },
  mining: { defense: 1 },
  foraging: { strength: 1 },
  fishing: { health: 1 },
  combat: { critChance: 0.5 },
};

/** Each Combat level: this much more damage, in percent. */
export const COMBAT_DAMAGE_PER_LEVEL = 4;

/** Wearing all four pieces of a set adds this. */
export const SET_BONUSES: Readonly<
  Record<string, { name: string; stats: Partial<Stats> }>
> = {
  iron: { name: "Iron Armor", stats: { defense: 25 } },
  zombie: { name: "Zombie Armor", stats: { health: 60, defense: 40 } },
  spider: { name: "Spider Armor", stats: { critChance: 15, critDamage: 40 } },
};

/** Health regained each second, as a share of the maximum. */
export const REGEN_PER_SECOND = 0.02;
/** Time between swings. */
export const ATTACK_MS = 450;
/** A wounded mob left alone this long is back to full health. */
export const MOB_RESET_MS = 10_000;
/** Dying costs this share of your coins. */
export const DEATH_PENALTY = 0.25;

export interface MobDef {
  name: string;
  hp: number;
  /** Damage per hit back, before your defense. */
  damage: number;
  xp: number;
  coins: readonly [number, number];
  drops: readonly {
    item: ResourceId;
    /** 0–1 */
    chance: number;
    min: number;
    max: number;
  }[];
  /** Milliseconds until another one turns up. */
  respawn: number;
}

/** Keyed by the map character. */
export const MOBS: Readonly<Record<string, MobDef>> = {
  z: {
    name: "Zombie",
    hp: 60,
    damage: 8,
    xp: 8,
    coins: [2, 5],
    drops: [{ item: "rotten_flesh", chance: 1, min: 1, max: 2 }],
    respawn: 8000,
  },
  s: {
    name: "Spider",
    hp: 150,
    damage: 18,
    xp: 20,
    coins: [5, 10],
    drops: [
      { item: "string", chance: 1, min: 1, max: 3 },
      { item: "spider_eye", chance: 0.3, min: 1, max: 1 },
    ],
    respawn: 10_000,
  },
  B: {
    name: "Broodmother",
    hp: 2000,
    damage: 55,
    xp: 250,
    coins: [150, 300],
    drops: [
      { item: "string", chance: 1, min: 12, max: 20 },
      { item: "spider_eye", chance: 1, min: 3, max: 6 },
      { item: "brood_fang", chance: 0.35, min: 1, max: 1 },
    ],
    respawn: 180_000,
  },
};
