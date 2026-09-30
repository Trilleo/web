/**
 * The rules. Pure: the same state and actions give the same result, in the browser
 * and (to check it) on the server. Time is always passed in, never read.
 */
import {
  ITEMS,
  MINION_SPEED,
  MINION_STORAGE,
  RESOURCES,
  SHOP,
  itemName,
  type ResourceId,
  type ToolStats,
  type ToolType,
} from "./content/items";
import {
  ISLAND_MAPS,
  NEIGHBOURS,
  arrivalFrom,
  charAt,
  isWalkable,
  tileKind,
  type Island,
} from "./content/islands";
import {
  BITE_MIN_MS,
  BITE_SPREAD_MS,
  CATCHES,
  HAND_SPEED,
  NODES,
  REEL_WINDOW_MS,
  type NodeDef,
} from "./content/nodes";
import {
  FORTUNE_PER_LEVEL,
  SKILL_NAMES,
  collectionReward,
  collectionTier,
  levelOf,
  levelReward,
} from "./content/progression";
import { RECIPE_BY_ID, unlocksAt, type Recipe } from "./content/recipes";
import { random, roll } from "./rng";
import {
  GameRuleError,
  type Action,
  type Dir,
  type GameEvent,
  type GameState,
  type ItemId,
  type PlacedMinion,
  type SkillId,
  type Step,
} from "./types";

/** The quickest you can take a step (the client walks at STEP_MS). */
export const MIN_STEP_MS = 100;
export const STEP_MS = 125;
/** How close to the merchant you must be to trade (tiles, any direction). */
export const MERCHANT_REACH = 2;
/** Most of one thing crafted, bought or sold in one go. */
export const MAX_BATCH = 10_000;

export const DIRS: Readonly<Record<Dir, readonly [number, number]>> = {
  U: [0, -1],
  D: [0, 1],
  L: [-1, 0],
  R: [1, 0],
};

export function newGame(seed: number, now: number): GameState {
  const home = ISLAND_MAPS.home;
  return {
    v: 1,
    seed: seed | 0,
    now,
    createdAt: now,
    coins: 0,
    pos: { island: "home", x: home.spawn.x, y: home.spawn.y },
    busyUntil: 0,
    lastMoveAt: 0,
    inventory: {},
    skills: { farming: 0, mining: 0, foraging: 0, fishing: 0 },
    collections: {},
    minions: home.slots.map(() => null),
    depleted: {},
    fishing: null,
  };
}

export function islandOf(state: GameState): Island {
  return ISLAND_MAPS[state.pos.island];
}

export function skillLevel(state: GameState, skill: SkillId): number {
  return levelOf(state.skills[skill]);
}

export function count(state: GameState, item: ItemId): number {
  return state.inventory[item] ?? 0;
}

// Queries the interface uses too.

export function isDepleted(state: GameState, x: number, y: number): boolean {
  const until = state.depleted[state.pos.island]?.[`${String(x)},${String(y)}`];
  return until !== undefined && until > state.now;
}

function isAdjacent(state: GameState, x: number, y: number): boolean {
  return Math.abs(state.pos.x - x) + Math.abs(state.pos.y - y) === 1;
}

/** Your best tool of a type (the fastest), if you have one. */
export function bestTool(
  state: GameState,
  type: ToolType,
): (ToolStats & { id: ItemId }) | undefined {
  let best: (ToolStats & { id: ItemId }) | undefined;
  for (const [id, n] of Object.entries(state.inventory)) {
    const tool = ITEMS[id]?.tool;
    if (n > 0 && tool?.type === type && (!best || tool.speed > best.speed)) {
      best = { ...tool, id };
    }
  }
  return best;
}

export type Check<T> = { ok: true; value: T } | { ok: false; reason: string };

const fail = (reason: string) => ({ ok: false, reason }) as const;

/** Whether you can gather the node at (x, y) now, and how long it takes. */
export function gatherCheck(
  state: GameState,
  x: number,
  y: number,
): Check<{ node: NodeDef; ms: number; fortune: number }> {
  const node = NODES[charAt(islandOf(state), x, y)];
  if (!node) return fail("There's nothing to gather there.");
  if (!isAdjacent(state, x, y)) return fail("Too far away.");
  if (isDepleted(state, x, y)) return fail("It hasn't grown back yet.");
  const level = skillLevel(state, node.skill);
  if (level < node.level) {
    return fail(
      `Needs ${SKILL_NAMES[node.skill]} ${String(node.level)} (you're ${String(level)}).`,
    );
  }
  const tool = bestTool(state, node.tool);
  if (node.tier > 0 && (!tool || tool.tier < node.tier)) {
    return fail(`Needs a ${tierName(node.tier)} ${node.tool} or better.`);
  }
  const speed = tool?.speed ?? HAND_SPEED[node.tool];
  const fortune = level * FORTUNE_PER_LEVEL + (tool?.fortune ?? 0);
  return {
    ok: true,
    value: { node, ms: Math.round(node.ms / speed), fortune },
  };
}

function tierName(tier: number): string {
  return ["wooden", "wooden", "stone", "iron"][tier] ?? "better";
}

export function nearMerchant(state: GameState): boolean {
  const island = islandOf(state);
  for (let dy = -MERCHANT_REACH; dy <= MERCHANT_REACH; dy++) {
    for (let dx = -MERCHANT_REACH; dx <= MERCHANT_REACH; dx++) {
      if (charAt(island, state.pos.x + dx, state.pos.y + dy) === "M")
        return true;
    }
  }
  return false;
}

export function isUnlocked(state: GameState, recipe: Recipe): boolean {
  if (!recipe.unlock) return true;
  return (
    collectionTier(state.collections[recipe.unlock.item] ?? 0) >=
    recipe.unlock.tier
  );
}

/** How many times you could craft it with what you have. */
export function craftableTimes(state: GameState, recipe: Recipe): number {
  let times = Infinity;
  for (const [item, n] of Object.entries(recipe.inputs)) {
    times = Math.min(times, Math.floor(count(state, item) / n));
  }
  return Number.isFinite(times) ? times : 0;
}

export function minionInterval(minion: PlacedMinion): number {
  const resource = RESOURCES[minion.kind as ResourceId] as {
    minionSeconds?: number;
  };
  const seconds = resource.minionSeconds ?? 60;
  return Math.round(seconds * 1000 * (MINION_SPEED[minion.tier - 1] ?? 1));
}

export function minionCapacity(minion: PlacedMinion): number {
  return MINION_STORAGE[minion.tier - 1] ?? MINION_STORAGE[0];
}

/** The minion slot at (x, y) on your island, if any. */
export function slotAt(state: GameState, x: number, y: number): number {
  if (state.pos.island !== "home") return -1;
  return ISLAND_MAPS.home.slots.findIndex(
    (slot) => slot.x === x && slot.y === y,
  );
}

// Changing things. The functions below work on a copy of the state.

function give(
  state: GameState,
  events: GameEvent[],
  item: ItemId,
  n: number,
): void {
  if (n <= 0) return;
  state.inventory[item] = count(state, item) + n;
  events.push({ type: "gain", item, n });
}

function take(
  state: GameState,
  events: GameEvent[],
  item: ItemId,
  n: number,
): void {
  const have = count(state, item);
  if (have < n) throw new GameRuleError(`Not enough ${itemName(item)}.`);
  if (have === n) {
    state.inventory = Object.fromEntries(
      Object.entries(state.inventory).filter(([key]) => key !== item),
    );
  } else {
    state.inventory[item] = have - n;
  }
  events.push({ type: "lose", item, n });
}

function addCoins(state: GameState, events: GameEvent[], n: number): void {
  if (n === 0) return;
  state.coins += n;
  events.push({ type: "coins", n });
}

function addXp(
  state: GameState,
  events: GameEvent[],
  skill: SkillId,
  n: number,
): void {
  const before = levelOf(state.skills[skill]);
  state.skills[skill] += n;
  events.push({ type: "xp", skill, n });
  const after = levelOf(state.skills[skill]);
  for (let level = before + 1; level <= after; level++) {
    const coins = levelReward(level);
    events.push({ type: "level", skill, level, coins });
    addCoins(state, events, coins);
  }
}

function addCollection(
  state: GameState,
  events: GameEvent[],
  item: ItemId,
  n: number,
): void {
  const before = collectionTier(state.collections[item] ?? 0);
  state.collections[item] = (state.collections[item] ?? 0) + n;
  const after = collectionTier(state.collections[item]);
  for (let tier = before + 1; tier <= after; tier++) {
    const coins = collectionReward(tier);
    events.push({ type: "collection", item, tier, coins });
    addCoins(state, events, coins);
    const unlocked = unlocksAt(item, tier);
    if (unlocked.length > 0) {
      events.push({ type: "note", text: `Unlocked: ${unlocked.join(", ")}.` });
    }
  }
}

/** Brings the world up to `now`: minions work, nodes grow back. */
function advanceInPlace(state: GameState, now: number): void {
  if (now <= state.now) return;
  for (const minion of state.minions) {
    if (!minion) continue;
    const interval = minionInterval(minion);
    const capacity = minionCapacity(minion);
    if (minion.stored >= capacity) {
      minion.lastAt = now;
      continue;
    }
    const made = Math.floor((now - minion.lastAt) / interval);
    if (made <= 0) continue;
    const room = capacity - minion.stored;
    if (made >= room) {
      minion.stored = capacity;
      minion.lastAt = now;
    } else {
      minion.stored += made;
      minion.lastAt += made * interval;
    }
  }
  const depleted: GameState["depleted"] = {};
  for (const [island, nodes] of Object.entries(state.depleted)) {
    const growing = Object.entries(nodes).filter(([, until]) => until > now);
    if (growing.length > 0) {
      depleted[island as keyof typeof depleted] = Object.fromEntries(growing);
    }
  }
  state.depleted = depleted;
  state.now = now;
}

export function advance(state: GameState, now: number): GameState {
  if (now <= state.now) return state;
  const next = structuredClone(state);
  advanceInPlace(next, now);
  return next;
}

function requireAdjacent(state: GameState, x: number, y: number): void {
  if (!isAdjacent(state, x, y)) throw new GameRuleError("Too far away.");
}

function requireCount(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > MAX_BATCH) {
    throw new GameRuleError("That's not a number of things.");
  }
}

function move(state: GameState, events: GameEvent[], t: number, d: Dir): void {
  if (t - state.lastMoveAt < MIN_STEP_MS) {
    throw new GameRuleError("Slow down.");
  }
  const [dx, dy] = DIRS[d];
  const island = islandOf(state);
  const x = state.pos.x + dx;
  const y = state.pos.y + dy;
  if (!isWalkable(charAt(island, x, y))) throw new GameRuleError("Blocked.");
  state.lastMoveAt = t;
  state.fishing = null;
  const portal = island.portals.find((p) => p.x === x && p.y === y);
  if (portal) {
    const to = ISLAND_MAPS[portal.to];
    state.pos = { island: portal.to, ...arrivalFrom(to, island.id) };
    events.push({ type: "travel", to: portal.to });
    return;
  }
  state.pos = { ...state.pos, x, y };
}

function gather(
  state: GameState,
  events: GameEvent[],
  t: number,
  x: number,
  y: number,
): void {
  const check = gatherCheck(state, x, y);
  if (!check.ok) throw new GameRuleError(check.reason);
  const { node, ms, fortune } = check.value;
  state.busyUntil = t + ms;
  const island = state.pos.island;
  const nodes = (state.depleted[island] ??= {});
  nodes[`${String(x)},${String(y)}`] = t + ms + node.respawn;
  const n = roll(state, 1 + fortune / 100);
  give(state, events, node.item, n);
  addCollection(state, events, node.item, n);
  addXp(state, events, node.skill, node.xp);
}

export function castCheck(state: GameState, x: number, y: number): Check<null> {
  if (tileKind(charAt(islandOf(state), x, y)) !== "water") {
    return fail("Cast into water.");
  }
  if (!isAdjacent(state, x, y)) return fail("Too far away.");
  if (!bestTool(state, "rod")) return fail("You need a fishing rod.");
  return { ok: true, value: null };
}

function cast(state: GameState, t: number, x: number, y: number): void {
  const check = castCheck(state, x, y);
  if (!check.ok) throw new GameRuleError(check.reason);
  const rod = bestTool(state, "rod");
  const wait =
    BITE_MIN_MS + (random(state) * BITE_SPREAD_MS) / (rod?.speed ?? 1);
  state.fishing = { x, y, biteAt: t + Math.round(wait) };
}

function reel(state: GameState, events: GameEvent[], t: number): void {
  const fishing = state.fishing;
  if (!fishing) throw new GameRuleError("You're not fishing.");
  state.fishing = null;
  if (t < fishing.biteAt) {
    events.push({ type: "note", text: "Too soon: nothing on the line." });
    return;
  }
  if (t > fishing.biteAt + REEL_WINDOW_MS) {
    events.push({ type: "note", text: "Too slow: it got away." });
    return;
  }
  const level = skillLevel(state, "fishing");
  const rod = bestTool(state, "rod");
  const options = CATCHES.filter((c) => c.level <= level);
  const total = options.reduce((sum, c) => sum + c.weight, 0);
  let pick = random(state) * total;
  const caught =
    options.find((c) => (pick -= c.weight) < 0) ?? options[0] ?? CATCHES[0];
  if (!caught) return;
  const n = roll(state, 1 + (rod?.fortune ?? 0) / 100);
  give(state, events, caught.item, n);
  addCollection(state, events, caught.item, n);
  addXp(state, events, "fishing", caught.xp);
}

function craft(
  state: GameState,
  events: GameEvent[],
  id: string,
  times: number,
): void {
  requireCount(times);
  const recipe = RECIPE_BY_ID.get(id);
  if (!recipe) throw new GameRuleError("There's no such recipe.");
  if (!isUnlocked(state, recipe)) {
    throw new GameRuleError("You haven't unlocked that recipe yet.");
  }
  if (craftableTimes(state, recipe) < times) {
    throw new GameRuleError("You don't have enough to craft that.");
  }
  for (const [item, n] of Object.entries(recipe.inputs)) {
    take(state, events, item, n * times);
  }
  give(state, events, recipe.output, recipe.qty * times);
}

function sell(
  state: GameState,
  events: GameEvent[],
  item: ItemId,
  n: number,
): void {
  requireCount(n);
  if (!nearMerchant(state)) throw new GameRuleError("Find the merchant ($).");
  const price = ITEMS[item]?.price ?? 0;
  if (price <= 0) throw new GameRuleError("The merchant won't buy that.");
  take(state, events, item, n);
  addCoins(state, events, price * n);
}

function buy(
  state: GameState,
  events: GameEvent[],
  item: ItemId,
  n: number,
): void {
  requireCount(n);
  if (!nearMerchant(state)) throw new GameRuleError("Find the merchant ($).");
  const offer = SHOP.find((entry) => entry.item === item);
  if (!offer) throw new GameRuleError("The merchant doesn't sell that.");
  const cost = offer.price * n;
  if (state.coins < cost) throw new GameRuleError("Not enough coins.");
  addCoins(state, events, -cost);
  give(state, events, item, n);
}

function slotTile(state: GameState, slot: number): { x: number; y: number } {
  const tile = ISLAND_MAPS.home.slots[slot];
  if (state.pos.island !== "home" || !tile) {
    throw new GameRuleError("Minions live on your island.");
  }
  requireAdjacent(state, tile.x, tile.y);
  return tile;
}

function place(
  state: GameState,
  events: GameEvent[],
  t: number,
  slot: number,
  item: ItemId,
): void {
  slotTile(state, slot);
  if (state.minions[slot]) throw new GameRuleError("That slot is taken.");
  const minion = ITEMS[item]?.minion;
  if (!minion) throw new GameRuleError("That's not a minion.");
  take(state, events, item, 1);
  state.minions[slot] = { ...minion, stored: 0, lastAt: t };
}

function collect(state: GameState, events: GameEvent[], slot: number): void {
  slotTile(state, slot);
  const minion = state.minions[slot];
  if (!minion) throw new GameRuleError("There's no minion there.");
  if (minion.stored === 0) return;
  const wasFull = minion.stored >= minionCapacity(minion);
  const n = minion.stored;
  minion.stored = 0;
  if (wasFull) minion.lastAt = state.now;
  give(state, events, minion.kind, n);
  addCollection(state, events, minion.kind, n);
}

function pickup(state: GameState, events: GameEvent[], slot: number): void {
  collect(state, events, slot);
  const minion = state.minions[slot];
  if (!minion) return;
  state.minions[slot] = null;
  give(state, events, `${minion.kind}_minion_${String(minion.tier)}`, 1);
}

/**
 * Applies one action, or throws GameRuleError (and changes nothing). Actions must
 * come in time order, and not while you're busy gathering.
 */
export function applyAction(state: GameState, action: Action): Step {
  const { t } = action;
  if (!Number.isFinite(t) || t < state.now) {
    throw new GameRuleError("That happened in the past.");
  }
  if (t < state.busyUntil) throw new GameRuleError("You're busy.");
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  advanceInPlace(next, t);
  switch (action.k) {
    case "move":
      move(next, events, t, action.d);
      break;
    case "gather":
      gather(next, events, t, action.x, action.y);
      break;
    case "cast":
      cast(next, t, action.x, action.y);
      break;
    case "reel":
      reel(next, events, t);
      break;
    case "craft":
      craft(next, events, action.recipe, action.times);
      break;
    case "sell":
      sell(next, events, action.item, action.n);
      break;
    case "buy":
      buy(next, events, action.item, action.n);
      break;
    case "place":
      place(next, events, t, action.slot, action.item);
      break;
    case "collect":
      collect(next, events, action.slot);
      break;
    case "pickup":
      pickup(next, events, action.slot);
      break;
  }
  return { state: next, events };
}

/** Where you can walk from here, for click-to-move: the steps to reach (x, y). */
export function pathTo(state: GameState, x: number, y: number): Dir[] | null {
  const island = islandOf(state);
  const start = `${String(state.pos.x)},${String(state.pos.y)}`;
  const goal = `${String(x)},${String(y)}`;
  if (start === goal) return [];
  const from = new Map<string, [string, Dir]>();
  const queue: [number, number][] = [[state.pos.x, state.pos.y]];
  const seen = new Set([start]);
  const dirs = Object.entries(DIRS) as [Dir, readonly [number, number]][];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift() ?? [0, 0];
    for (const [d, [dx, dy]] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${String(nx)},${String(ny)}`;
      if (seen.has(key)) continue;
      const char = charAt(island, nx, ny);
      // Portals only as the destination: walking through one would travel.
      const isGoal = key === goal;
      if (!isWalkable(char) || (tileKind(char) === "portal" && !isGoal)) {
        continue;
      }
      seen.add(key);
      from.set(key, [`${String(cx)},${String(cy)}`, d]);
      if (isGoal) {
        const path: Dir[] = [];
        let at = key;
        while (at !== start) {
          const [prev, step] = from.get(at) ?? [start, "U"];
          path.unshift(step);
          at = prev;
        }
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

/** A walkable tile next to (x, y) that you can reach, nearest first. */
export function pathNextTo(
  state: GameState,
  x: number,
  y: number,
): Dir[] | null {
  let best: Dir[] | null = null;
  const island = islandOf(state);
  for (const [dx, dy] of NEIGHBOURS) {
    if (state.pos.x === x + dx && state.pos.y === y + dy) return [];
    // Standing on a portal would travel.
    if (tileKind(charAt(island, x + dx, y + dy)) === "portal") continue;
    const path = pathTo(state, x + dx, y + dy);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}
