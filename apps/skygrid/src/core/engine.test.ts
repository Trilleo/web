import { describe, expect, it } from "vitest";
import { ISLAND_MAPS, NEIGHBOURS, charAt, tileKind } from "./content/islands";
import { minionId } from "./content/items";
import { LEVEL_XP, levelOf } from "./content/progression";
import {
  MIN_STEP_MS,
  advance,
  applyAction,
  gatherCheck,
  minionCapacity,
  minionInterval,
  newGame,
  pathNextTo,
  pathTo,
} from "./engine";
import { parseSave } from "./save";
import {
  GameRuleError,
  type Action,
  type GameState,
  type IslandId,
} from "./types";

const T0 = 1_800_000_000_000;

/** A ground tile beside the first `char` on an island, and where that char is. */
function besideChar(island: IslandId, char: string) {
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

function at(
  state: GameState,
  island: IslandId,
  x: number,
  y: number,
): GameState {
  return { ...state, pos: { island, x, y } };
}

function with_(state: GameState, inventory: Record<string, number>): GameState {
  return { ...state, inventory: { ...state.inventory, ...inventory } };
}

/** Applies actions in order, returning the final state. */
function run(state: GameState, actions: Action[]): GameState {
  return actions.reduce((s, action) => applyAction(s, action).state, state);
}

function rejects(state: GameState, action: Action, message: RegExp): void {
  expect(() => applyAction(state, action)).toThrow(GameRuleError);
  expect(() => applyAction(state, action)).toThrow(message);
}

describe("a new game", () => {
  it("starts on your island with nothing", () => {
    const game = newGame(42, T0);
    expect(game.pos.island).toBe("home");
    expect(game.coins).toBe(0);
    expect(game.minions).toHaveLength(5);
    expect(parseSave(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });
});

describe("walking", () => {
  const game = newGame(1, T0);

  it("steps onto ground, not into the sky or scenery", () => {
    const moved = applyAction(game, { t: T0 + 200, k: "move", d: "R" }).state;
    expect(moved.pos.x).toBe(game.pos.x + 1);

    const edge = at(game, "home", 3, 5); // "  ..\"" row: two tiles of grass, then sky
    const left = applyAction(edge, { t: T0 + 200, k: "move", d: "L" }).state;
    rejects(left, { t: T0 + 400, k: "move", d: "L" }, /Blocked/);
  });

  it("has a speed limit", () => {
    const moved = applyAction(game, { t: T0 + 200, k: "move", d: "R" }).state;
    rejects(
      moved,
      { t: T0 + 200 + MIN_STEP_MS - 1, k: "move", d: "R" },
      /Slow down/,
    );
  });

  it("takes you through portals, arriving beside the portal back", () => {
    const portal = ISLAND_MAPS.home.portals[0];
    if (!portal) throw new Error("no portal");
    const beside = at(game, "home", portal.x - 1, portal.y);
    const { state, events } = applyAction(beside, {
      t: T0 + 200,
      k: "move",
      d: "R",
    });
    expect(state.pos.island).toBe("hub");
    expect(events).toContainEqual({ type: "travel", to: "hub" });
    const back = ISLAND_MAPS.hub.portals.find((p) => p.to === "home");
    expect(
      Math.abs((back?.x ?? 0) - state.pos.x) +
        Math.abs((back?.y ?? 0) - state.pos.y),
    ).toBe(1);
  });

  it("refuses actions from the past", () => {
    const later = advance(game, T0 + 5000);
    rejects(later, { t: T0 + 1000, k: "move", d: "R" }, /past/);
  });

  it("finds paths around obstacles", () => {
    const { target, stand } = besideChar("home", "T");
    const path = pathNextTo(game, target.x, target.y);
    expect(path).not.toBeNull();
    let state = game;
    let t = T0;
    for (const d of path ?? []) {
      t += 150;
      state = applyAction(state, { t, k: "move", d }).state;
    }
    expect(
      Math.abs(state.pos.x - target.x) + Math.abs(state.pos.y - target.y),
    ).toBe(1);
    expect(pathTo(game, stand.x, stand.y)).not.toBeNull();
    expect(pathTo(game, 0, 0)).toBeNull(); // the sky
  });
});

describe("gathering", () => {
  const tree = besideChar("home", "T");
  const game = at(newGame(7, T0), "home", tree.stand.x, tree.stand.y);

  it("chops a tree by hand, slowly, for logs and XP", () => {
    const check = gatherCheck(game, tree.target.x, tree.target.y);
    expect(check).toMatchObject({ ok: true, value: { ms: 3200 } });
    const { state, events } = applyAction(game, {
      t: T0 + 10,
      k: "gather",
      ...tree.target,
    });
    expect(state.inventory.oak_log).toBeGreaterThanOrEqual(1);
    expect(state.skills.foraging).toBe(6);
    expect(state.collections.oak_log).toBe(state.inventory.oak_log);
    expect(events[0]).toMatchObject({ type: "gain", item: "oak_log" });
    expect(state.busyUntil).toBe(T0 + 10 + 3200);
  });

  it("goes faster with an axe", () => {
    const check = gatherCheck(
      with_(game, { wooden_axe: 1 }),
      tree.target.x,
      tree.target.y,
    );
    expect(check).toMatchObject({ ok: true, value: { ms: 1600 } });
  });

  it("keeps you busy, then the tree needs time to grow back", () => {
    const chopped = applyAction(game, {
      t: T0 + 10,
      k: "gather",
      ...tree.target,
    }).state;
    rejects(chopped, { t: T0 + 1000, k: "move", d: "U" }, /busy/);
    rejects(
      chopped,
      { t: T0 + 4000, k: "gather", ...tree.target },
      /grown back/,
    );
    const later = applyAction(chopped, {
      t: T0 + 20_000,
      k: "gather",
      ...tree.target,
    }).state;
    expect(later.skills.foraging).toBe(12);
  });

  it("must be next to it", () => {
    const far = at(
      game,
      "home",
      ISLAND_MAPS.home.spawn.x,
      ISLAND_MAPS.home.spawn.y,
    );
    rejects(far, { t: T0 + 10, k: "gather", ...tree.target }, /Too far/);
  });

  it("needs a pickaxe for ore, and the level for harder nodes", () => {
    const stone = besideChar("mines", "*");
    const miner = at(newGame(3, T0), "mines", stone.stand.x, stone.stand.y);
    rejects(
      miner,
      { t: T0 + 10, k: "gather", ...stone.target },
      /wooden pickaxe/,
    );
    const mined = applyAction(with_(miner, { wooden_pickaxe: 1 }), {
      t: T0 + 10,
      k: "gather",
      ...stone.target,
    }).state;
    expect(mined.inventory.cobblestone).toBeGreaterThanOrEqual(1);

    const gold = besideChar("mines", "$");
    const deep = at(
      with_(miner, { iron_pickaxe: 1 }),
      "mines",
      gold.stand.x,
      gold.stand.y,
    );
    rejects(deep, { t: T0 + 10, k: "gather", ...gold.target }, /Mining 8/);
  });

  it("drops more with fortune, replayably", () => {
    const crop = besideChar("home", '"');
    const farmer = {
      ...at(
        with_(newGame(99, T0), { iron_hoe: 1 }),
        "home",
        crop.stand.x,
        crop.stand.y,
      ),
      skills: {
        farming: LEVEL_XP[25] ?? 0,
        mining: 0,
        foraging: 0,
        fishing: 0,
      },
    };
    // 25 levels × 4 + 45 = 145% fortune: 2 or 3 wheat each time.
    const first = applyAction(farmer, {
      t: T0 + 10,
      k: "gather",
      ...crop.target,
    });
    const again = applyAction(farmer, {
      t: T0 + 10,
      k: "gather",
      ...crop.target,
    });
    expect(first).toEqual(again);
    expect([2, 3]).toContain(first.state.inventory.wheat);
  });
});

describe("skills and collections", () => {
  it("level up with coins, and collections unlock recipes", () => {
    const crop = besideChar("home", '"');
    let state = at(newGame(5, T0), "home", crop.stand.x, crop.stand.y);
    const events = [];
    let t = T0;
    for (let i = 0; i < 60; i++) {
      t += 6000;
      const step = applyAction(state, { t, k: "gather", ...crop.target });
      state = step.state;
      events.push(...step.events);
    }
    expect(levelOf(state.skills.farming)).toBe(2); // 180 XP
    expect(events).toContainEqual({
      type: "level",
      skill: "farming",
      level: 1,
      coins: 25,
    });
    expect(events).toContainEqual({
      type: "collection",
      item: "wheat",
      tier: 1,
      coins: 50,
    });
    expect(events).toContainEqual({
      type: "note",
      text: expect.stringContaining("Wheat Minion I") as string,
    });
  });
});

describe("crafting", () => {
  const game = newGame(1, T0);

  it("turns resources into tools", () => {
    const state = applyAction(with_(game, { oak_log: 10 }), {
      t: T0 + 1,
      k: "craft",
      recipe: "wooden_pickaxe",
      times: 1,
    }).state;
    expect(state.inventory).toEqual({ oak_log: 2, wooden_pickaxe: 1 });
  });

  it("needs the ingredients and the unlock", () => {
    rejects(
      game,
      { t: T0 + 1, k: "craft", recipe: "wooden_pickaxe", times: 1 },
      /enough/,
    );
    rejects(
      with_(game, { wheat: 100 }),
      { t: T0 + 1, k: "craft", recipe: minionId("wheat", 1), times: 1 },
      /unlocked/,
    );
    const unlocked = {
      ...with_(game, { wheat: 100 }),
      collections: { wheat: 50 },
    };
    const state = applyAction(unlocked, {
      t: T0 + 1,
      k: "craft",
      recipe: minionId("wheat", 1),
      times: 1,
    }).state;
    expect(state.inventory).toEqual({ wheat: 20, wheat_minion_1: 1 });
  });

  it("refuses silly amounts", () => {
    rejects(
      game,
      { t: T0 + 1, k: "craft", recipe: "wooden_axe", times: 0 },
      /number/,
    );
    rejects(
      game,
      { t: T0 + 1, k: "craft", recipe: "wooden_axe", times: 1.5 },
      /number/,
    );
    rejects(
      game,
      { t: T0 + 1, k: "craft", recipe: "nope", times: 1 },
      /no such/,
    );
  });
});

describe("the merchant", () => {
  const shop = besideChar("hub", "M");
  const game = at(
    with_(newGame(1, T0), { wheat: 10 }),
    "hub",
    shop.stand.x,
    shop.stand.y,
  );

  it("buys and sells nearby, and nowhere else", () => {
    const sold = applyAction(game, {
      t: T0 + 1,
      k: "sell",
      item: "wheat",
      n: 10,
    }).state;
    expect(sold.coins).toBe(20);
    const bought = applyAction(sold, {
      t: T0 + 2,
      k: "buy",
      item: "wooden_hoe",
      n: 1,
    }).state;
    expect(bought.coins).toBe(0);
    expect(bought.inventory.wooden_hoe).toBe(1);
    rejects(sold, { t: T0 + 2, k: "buy", item: "fishing_rod", n: 1 }, /coins/);
    rejects(
      sold,
      { t: T0 + 2, k: "buy", item: "iron_pickaxe", n: 1 },
      /doesn't sell/,
    );

    const away = at(
      game,
      "home",
      ISLAND_MAPS.home.spawn.x,
      ISLAND_MAPS.home.spawn.y,
    );
    rejects(away, { t: T0 + 1, k: "sell", item: "wheat", n: 1 }, /merchant/);
  });
});

describe("minions", () => {
  const slot = ISLAND_MAPS.home.slots[0];
  if (!slot) throw new Error("no slot");
  const stand = NEIGHBOURS.map(([dx, dy]) => ({
    x: slot.x + dx,
    y: slot.y + dy,
  })).find((p) => tileKind(charAt(ISLAND_MAPS.home, p.x, p.y)) === "ground");
  if (!stand) throw new Error("slot unreachable");
  const game = at(
    with_(newGame(1, T0), { wheat_minion_1: 1 }),
    "home",
    stand.x,
    stand.y,
  );
  const placed = applyAction(game, {
    t: T0,
    k: "place",
    slot: 0,
    item: "wheat_minion_1",
  }).state;

  it("work while you're away, up to their storage", () => {
    const minion = placed.minions[0];
    if (!minion) throw new Error("not placed");
    expect(minionInterval(minion)).toBe(30_000);
    expect(advance(placed, T0 + 95_000).minions[0]?.stored).toBe(3);
    const aWeekLater = advance(placed, T0 + 7 * 86_400_000);
    expect(aWeekLater.minions[0]?.stored).toBe(minionCapacity(minion));
  });

  it("give the same result however often time is advanced", () => {
    let stepped = placed;
    for (let t = T0; t <= T0 + 600_000; t += 7_777)
      stepped = advance(stepped, t);
    stepped = advance(stepped, T0 + 600_000);
    expect(stepped.minions).toEqual(advance(placed, T0 + 600_000).minions);
  });

  it("hand over what they made, which counts for the collection", () => {
    const later = applyAction(placed, {
      t: T0 + 300_000,
      k: "collect",
      slot: 0,
    }).state;
    expect(later.inventory.wheat).toBe(10);
    expect(later.collections.wheat).toBe(10);
    expect(later.minions[0]?.stored).toBe(0);

    const picked = applyAction(later, {
      t: T0 + 330_000,
      k: "pickup",
      slot: 0,
    }).state;
    expect(picked.minions[0]).toBeNull();
    expect(picked.inventory).toEqual({ wheat: 11, wheat_minion_1: 1 });
  });

  it("only live on your island, one per slot", () => {
    rejects(
      placed,
      { t: T0 + 1, k: "place", slot: 0, item: "wheat_minion_1" },
      /taken/,
    );
    const far = at(
      game,
      "home",
      ISLAND_MAPS.home.spawn.x,
      ISLAND_MAPS.home.spawn.y,
    );
    rejects(
      far,
      { t: T0 + 1, k: "place", slot: 0, item: "wheat_minion_1" },
      /Too far/,
    );
  });
});

describe("fishing", () => {
  const water = besideChar("shore", "~");
  const game = at(
    with_(newGame(11, T0), { fishing_rod: 1 }),
    "shore",
    water.stand.x,
    water.stand.y,
  );

  it("catches a fish if you reel in on the bite", () => {
    const cast = applyAction(game, { t: T0, k: "cast", ...water.target }).state;
    const biteAt = cast.fishing?.biteAt ?? 0;
    expect(biteAt).toBeGreaterThanOrEqual(T0 + 2500);
    const { state } = applyAction(cast, { t: biteAt + 200, k: "reel" });
    expect(state.skills.fishing).toBeGreaterThan(0);
    expect(state.fishing).toBeNull();
  });

  it("loses it if you're too early or too late", () => {
    const cast = applyAction(game, { t: T0, k: "cast", ...water.target }).state;
    const biteAt = cast.fishing?.biteAt ?? 0;
    for (const t of [biteAt - 100, biteAt + 5000]) {
      const { state, events } = applyAction(cast, { t, k: "reel" });
      expect(state.skills.fishing).toBe(0);
      expect(events[0]?.type).toBe("note");
    }
  });

  it("needs a rod, and water", () => {
    rejects(
      { ...game, inventory: {} },
      { t: T0, k: "cast", ...water.target },
      /rod/,
    );
    rejects(
      game,
      { t: T0, k: "cast", x: water.stand.x, y: water.stand.y },
      /water/,
    );
  });
});

describe("replays", () => {
  it("give the same game from the same actions", () => {
    const tree = besideChar("home", "T");
    const start = at(newGame(2024, T0), "home", tree.stand.x, tree.stand.y);
    const actions: Action[] = [
      { t: T0 + 1, k: "gather", ...tree.target },
      { t: T0 + 20_000, k: "gather", ...tree.target },
      { t: T0 + 40_000, k: "gather", ...tree.target },
    ];
    expect(run(start, actions)).toEqual(run(start, actions));
  });
});

describe("parseSave", () => {
  const game = newGame(1, T0);

  it("rejects what isn't a save", () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave({ ...game, v: 2 })).toBeNull();
    expect(parseSave({ ...game, coins: -5 })).toBeNull();
    expect(parseSave({ ...game, inventory: { diamond_sword: 1 } })).toBeNull();
    expect(
      parseSave({ ...game, pos: { island: "home", x: 0, y: 0 } }),
    ).toBeNull();
    expect(
      parseSave({
        ...game,
        minions: [{ kind: "wheat", tier: 9, stored: 0, lastAt: 0 }],
      }),
    ).toBeNull();
  });

  it("drops empty stacks", () => {
    expect(
      parseSave({ ...game, inventory: { wheat: 0, carrot: 2 } })?.inventory,
    ).toEqual({
      carrot: 2,
    });
  });
});
