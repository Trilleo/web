import { describe, expect, it } from "vitest";
import { LEVEL_XP } from "./content/progression";
import { newGame } from "./engine";
import {
  IMPORT_LIMITS,
  parseActions,
  prepareImport,
  totalSkillXp,
} from "./save";

const T0 = 1_800_000_000_000;

describe("parseActions", () => {
  it("accepts each kind of action", () => {
    const actions = [
      { t: T0, k: "move", d: "L" },
      { t: T0, k: "gather", x: 1, y: 2 },
      { t: T0, k: "attack", x: 3, y: 4 },
      { t: T0, k: "equip", item: "wooden_sword" },
      { t: T0, k: "unequip", slot: "weapon" },
      { t: T0, k: "cast", x: 1, y: 2 },
      { t: T0, k: "reel" },
      { t: T0, k: "craft", recipe: "wooden_axe", times: 2 },
      { t: T0, k: "sell", item: "wheat", n: 3 },
      { t: T0, k: "buy", item: "wooden_hoe", n: 1 },
      { t: T0, k: "place", slot: 0, item: "wheat_minion_1" },
      { t: T0, k: "collect", slot: 0 },
      { t: T0, k: "pickup", slot: 0 },
    ];
    expect(parseActions(actions, 100)).toEqual(actions);
  });

  it("drops extra fields, and refuses anything malformed or too many", () => {
    expect(parseActions([{ t: T0, k: "reel", coins: 1e9 }], 10)).toEqual([
      { t: T0, k: "reel" },
    ]);
    expect(parseActions([{ t: T0, k: "move", d: "X" }], 10)).toBeNull();
    expect(parseActions([{ t: -1, k: "reel" }], 10)).toBeNull();
    expect(parseActions([{ t: T0, k: "gather", x: 1.5, y: 2 }], 10)).toBeNull();
    expect(parseActions([{ t: T0, k: "teleport" }], 10)).toBeNull();
    expect(
      parseActions([{ t: T0, k: "unequip", slot: "cape" }], 10),
    ).toBeNull();
    expect(parseActions({ length: 1 }, 10)).toBeNull();
    expect(
      parseActions(
        [
          { t: T0, k: "reel" },
          { t: T0, k: "reel" },
        ],
        1,
      ),
    ).toBeNull();
  });
});

describe("prepareImport", () => {
  const rich = {
    ...newGame(1, T0),
    coins: 5_000_000,
    busyUntil: T0 + 5000,
    inventory: { wheat: 1_000_000, oak_log: 12 },
    collections: { wheat: 9_000_000 },
    skills: {
      farming: 99_999_999,
      mining: 10,
      foraging: 0,
      fishing: 0,
      combat: 0,
    },
    depleted: { home: { "1,1": T0 + 9000 } },
    fishing: { x: 1, y: 1, biteAt: T0 + 100 },
    minions: [
      { kind: "wheat", tier: 1, stored: 99_999, lastAt: T0 - 1e9 },
      null,
      null,
      null,
      null,
    ],
  };
  const later = T0 + 60_000;
  const imported = prepareImport(rich, later, 77);

  it("caps what couldn't be checked", () => {
    expect(imported.coins).toBe(IMPORT_LIMITS.coins);
    expect(imported.inventory).toEqual({
      wheat: IMPORT_LIMITS.items,
      oak_log: 12,
    });
    expect(imported.collections.wheat).toBe(IMPORT_LIMITS.collection);
    expect(imported.skills.farming).toBe(LEVEL_XP[IMPORT_LIMITS.level]);
    expect(imported.skills.mining).toBe(10);
    expect(imported.minions[0]).toEqual({
      kind: "wheat",
      tier: 1,
      stored: 384,
      lastAt: later,
    });
  });

  it("takes the server's clock and seed, and drops unfinished work", () => {
    expect(imported).toMatchObject({
      now: later,
      seed: 77,
      busyUntil: 0,
      lastMoveAt: 0,
      depleted: {},
      fishing: null,
    });
    expect(imported.pos).toEqual(rich.pos);
  });

  it("totals skill XP for the leaderboards", () => {
    expect(
      totalSkillXp({
        ...rich,
        skills: { farming: 5, mining: 6, foraging: 7, fishing: 8, combat: 0 },
      }),
    ).toBe(26);
  });
});
