import { describe, expect, it } from "vitest";
import { ATTACK_MS, BASE_STATS, MOBS, MOB_RESET_MS } from "./content/combat";
import { ISLAND_MAPS, NEIGHBOURS, charAt, tileKind } from "./content/islands";
import { LEVEL_XP } from "./content/progression";
import {
  advance,
  applyAction,
  isDepleted,
  newGame,
  playerStats,
} from "./engine";
import { parseSave } from "./save";
import { GameRuleError, type GameState, type IslandId } from "./types";

const T0 = 1_800_000_000_000;

function beside(island: IslandId, char: string) {
  const map = ISLAND_MAPS[island];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (charAt(map, x, y) !== char) continue;
      for (const [dx, dy] of NEIGHBOURS) {
        if (tileKind(charAt(map, x + dx, y + dy)) === "ground") {
          return { target: { x, y }, stand: { x: x + dx, y: y + dy } };
        }
      }
    }
  }
  throw new Error(`No reachable ${char} on ${island}`);
}

function fighter(
  island: IslandId,
  char: string,
  extra: Partial<GameState> = {},
) {
  const { target, stand } = beside(island, char);
  const state: GameState = {
    ...newGame(3, T0),
    pos: { island, ...stand },
    ...extra,
  };
  return { state, target };
}

/** Swings until the mob at `target` dies (or `max` swings), returning the state. */
function fight(start: GameState, target: { x: number; y: number }, max = 50) {
  let state = start;
  let t = T0;
  for (let i = 0; i < max; i++) {
    t += ATTACK_MS;
    const step = applyAction(state, { t, k: "attack", ...target });
    state = step.state;
    if (step.events.some((e) => e.type === "kill" || e.type === "death")) {
      return { state, events: step.events, swings: i + 1 };
    }
  }
  return { state, events: [], swings: max };
}

describe("stats", () => {
  it("start from the base, and grow with skills", () => {
    const fresh = newGame(1, T0);
    expect(playerStats(fresh)).toEqual(BASE_STATS);
    const trained = {
      ...fresh,
      skills: {
        ...fresh.skills,
        farming: LEVEL_XP[10] ?? 0,
        mining: LEVEL_XP[5] ?? 0,
      },
    };
    expect(playerStats(trained)).toMatchObject({ health: 120, defense: 5 });
  });

  it("add up gear, and a full set's bonus", () => {
    const worn = {
      ...newGame(1, T0),
      equipment: {
        weapon: "iron_sword",
        helmet: "iron_helmet",
        chestplate: "iron_chestplate",
        leggings: "iron_leggings",
      },
    };
    expect(playerStats(worn)).toMatchObject({
      damage: 50,
      strength: 10,
      defense: 70,
    });
    const full = {
      ...worn,
      equipment: { ...worn.equipment, boots: "iron_boots" },
    };
    // 80 from the pieces, 25 for the set.
    expect(playerStats(full).defense).toBe(105);
  });
});

describe("equipping", () => {
  const game = {
    ...newGame(1, T0),
    inventory: { wooden_sword: 1, stone_sword: 1 },
  };

  it("moves gear between the bag and your slots", () => {
    let state = applyAction(game, {
      t: T0 + 1,
      k: "equip",
      item: "wooden_sword",
    }).state;
    expect(state.equipment.weapon).toBe("wooden_sword");
    state = applyAction(state, {
      t: T0 + 2,
      k: "equip",
      item: "stone_sword",
    }).state;
    expect(state.equipment.weapon).toBe("stone_sword");
    expect(state.inventory).toEqual({ wooden_sword: 1 });
    state = applyAction(state, {
      t: T0 + 3,
      k: "unequip",
      slot: "weapon",
    }).state;
    expect(state.equipment).toEqual({});
    expect(state.inventory).toEqual({ wooden_sword: 1, stone_sword: 1 });
  });

  it("refuses what isn't gear, or isn't yours", () => {
    expect(() =>
      applyAction(game, { t: T0 + 1, k: "equip", item: "oak_log" }),
    ).toThrow(GameRuleError);
    expect(() =>
      applyAction(game, { t: T0 + 1, k: "equip", item: "iron_sword" }),
    ).toThrow(/Not enough/);
  });
});

describe("fighting", () => {
  it("hits a zombie, takes a hit back, and keeps you busy for a swing", () => {
    const { state, target } = fighter("hub", "z", {
      equipment: { weapon: "wooden_sword" },
    });
    const { state: after, events } = applyAction(state, {
      t: T0 + 10,
      k: "attack",
      ...target,
    });
    expect(events[0]).toMatchObject({ type: "hit", mob: "Zombie", max: 60 });
    expect(events[1]).toMatchObject({ type: "hurt", damage: 8 });
    expect(after.health).toBe(92);
    expect(after.busyUntil).toBe(T0 + 10 + ATTACK_MS);
    expect(
      after.mobs.hub?.[`${String(target.x)},${String(target.y)}`]?.hp,
    ).toBeLessThan(60);
  });

  it("defeats it for coins, drops and Combat XP; it comes back later", () => {
    const { state, target } = fighter("hub", "z", {
      equipment: { weapon: "wooden_sword" },
    });
    const { state: after, events } = fight(state, target);
    expect(events.map((e) => e.type)).toContain("kill");
    expect(after.inventory.rotten_flesh).toBeGreaterThanOrEqual(1);
    expect(after.collections.rotten_flesh).toBe(after.inventory.rotten_flesh);
    expect(after.skills.combat).toBe(MOBS.z?.xp);
    expect(after.coins).toBeGreaterThanOrEqual(2);
    expect(isDepleted(after, target.x, target.y)).toBe(true);
    expect(after.mobs.hub).toEqual({});
    expect(
      isDepleted(advance(after, after.now + 60_000), target.x, target.y),
    ).toBe(false);
  });

  it("lets a wounded mob heal if you walk away", () => {
    const { state, target } = fighter("hub", "z", {
      equipment: { weapon: "wooden_sword" },
    });
    const hit = applyAction(state, {
      t: T0 + 10,
      k: "attack",
      ...target,
    }).state;
    expect(advance(hit, T0 + 10 + MOB_RESET_MS).mobs).toEqual({});
  });

  it("regenerates your health over time", () => {
    const hurt = { ...newGame(1, T0), health: 50 };
    expect(advance(hurt, T0 + 10_000).health).toBe(70);
    expect(advance(hurt, T0 + 60_000).health).toBe(100);
  });

  it("costs a quarter of your coins when you die, and sends you to the Hub", () => {
    const { state, target } = fighter("cave", "s", { coins: 1000, health: 10 });
    const { state: after, events } = applyAction(state, {
      t: T0 + 10,
      k: "attack",
      ...target,
    });
    expect(events.at(-1)).toEqual({ type: "death", lost: 250 });
    expect(after).toMatchObject({
      coins: 750,
      health: 100,
      pos: { island: "hub" },
    });
  });

  it("needs gear for the cave: bare hands lose to a spider", () => {
    const { state, target } = fighter("cave", "s");
    expect(fight(state, target).events.at(-1)?.type).toBe("death");
    const armed = {
      ...state,
      equipment: {
        weapon: "iron_sword",
        helmet: "iron_helmet",
        chestplate: "iron_chestplate",
        leggings: "iron_leggings",
        boots: "iron_boots",
      },
      health: 170,
    };
    expect(fight(armed, target).events.map((e) => e.type)).toContain("kill");
  });

  it("only fights what's there, next to you", () => {
    const { state, target } = fighter("hub", "z");
    expect(() =>
      applyAction(state, {
        t: T0 + 10,
        k: "attack",
        x: target.x + 5,
        y: target.y,
      }),
    ).toThrow(GameRuleError);
  });
});

describe("old saves", () => {
  it("get Combat, full health and empty slots", () => {
    const current = newGame(1, T0);
    const old = Object.fromEntries(
      Object.entries(current).filter(
        ([key]) => !["health", "equipment", "mobs"].includes(key),
      ),
    );
    const skills = { farming: 0, mining: 0, foraging: 0, fishing: 0 };
    expect(parseSave({ ...old, skills })).toEqual(current);
  });

  it("refuse gear in the wrong slot", () => {
    expect(
      parseSave({ ...newGame(1, T0), equipment: { helmet: "iron_sword" } }),
    ).toBeNull();
  });
});
