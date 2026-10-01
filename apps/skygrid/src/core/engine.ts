/**
 * The rules. Pure: the same state and actions give the same result, in the browser
 * and (to check it) on the server. Time is always passed in, never read.
 */
import {
  ATTACK_MS,
  BASE_STATS,
  COMBAT_DAMAGE_PER_LEVEL,
  DEATH_PENALTY,
  MOBS,
  MOB_RESET_MS,
  REGEN_PER_SECOND,
  SET_BONUSES,
  SKILL_STATS,
  type Stats,
} from "./content/combat";
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
  NO_DAILY,
  TASKS_PER_DAY,
  currentStreak,
  dailyReward,
  dayOf,
  describeTask,
  gatherCandidates,
  gatherTarget,
  type DailyTask,
  type TaskKind,
} from "./content/daily";
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
  GEAR_SLOTS,
  GameRuleError,
  SKILLS,
  type Action,
  type Dir,
  type GameEvent,
  type GameState,
  type GearSlot,
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
    skills: { farming: 0, mining: 0, foraging: 0, fishing: 0, combat: 0 },
    collections: {},
    minions: home.slots.map(() => null),
    depleted: {},
    fishing: null,
    health: BASE_STATS.health,
    equipment: {},
    mobs: {},
    daily: { ...NO_DAILY, tasks: [] },
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

function addStats(total: Stats, extra: Partial<Stats>, times = 1): void {
  for (const [key, value] of Object.entries(extra) as [keyof Stats, number][]) {
    total[key] += value * times;
  }
}

/** Your stats: the base, plus skill levels, gear, and a full set's bonus. */
export function playerStats(state: GameState): Stats {
  const stats = { ...BASE_STATS };
  for (const skill of SKILLS) {
    addStats(stats, SKILL_STATS[skill], skillLevel(state, skill));
  }
  const sets = new Map<string, number>();
  for (const item of Object.values(state.equipment)) {
    const gear = ITEMS[item]?.gear;
    if (!gear) continue;
    addStats(stats, gear.stats);
    if (gear.set) sets.set(gear.set, (sets.get(gear.set) ?? 0) + 1);
  }
  for (const [set, pieces] of sets) {
    const bonus = SET_BONUSES[set];
    if (bonus && pieces >= 4) addStats(stats, bonus.stats);
  }
  return stats;
}

/** Your health right now, rounded down for showing. */
export function currentHealth(state: GameState): number {
  return Math.floor(state.health);
}

/** Whether a tile with `char` is within `reach` tiles of you (any direction). */
function near(state: GameState, char: string, reach: number): boolean {
  const island = islandOf(state);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (charAt(island, state.pos.x + dx, state.pos.y + dy) === char)
        return true;
    }
  }
  return false;
}

export function nearMerchant(state: GameState): boolean {
  return near(state, "M", MERCHANT_REACH);
}

/** At the Bazaar's stall in the Hub (trading happens there). */
export function nearBazaar(state: GameState): boolean {
  return near(state, "¤", MERCHANT_REACH);
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
  track(state, events, "xp", skill, n);
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

/** Moves today's tasks along; says so when one is done. */
function track(
  state: GameState,
  events: GameEvent[],
  kind: TaskKind,
  key: string,
  n: number,
): void {
  for (const task of state.daily.tasks) {
    if (task.kind !== kind || (task.key !== key && task.key !== "any"))
      continue;
    if (task.progress >= task.target) continue;
    task.progress = Math.min(task.target, task.progress + n);
    if (task.progress >= task.target) {
      events.push({ type: "note", text: `Task done: ${describeTask(task)}.` });
      if (state.daily.tasks.every((t) => t.progress >= t.target)) {
        events.push({
          type: "note",
          text: "All of today's tasks are done: claim your reward (Skills).",
        });
      }
    }
  }
}

/** A day's tasks, picked from what this island has unlocked (the same everywhere). */
export function dailyTasks(state: GameState, day: number): DailyTask[] {
  const options: DailyTask[] = gatherCandidates(state.collections).map(
    (node) => ({
      kind: "gather",
      key: node.item,
      target: gatherTarget(node.ms),
      progress: 0,
    }),
  );
  if ((state.collections.rotten_flesh ?? 0) > 0) {
    options.push({ kind: "kill", key: "Zombie", target: 15, progress: 0 });
  }
  if ((state.collections.string ?? 0) > 0) {
    options.push({ kind: "kill", key: "Spider", target: 8, progress: 0 });
  }
  if (bestTool(state, "rod")) {
    options.push({ kind: "fish", key: "any", target: 10, progress: 0 });
  }
  if (state.minions.some((minion) => minion !== null)) {
    options.push({ kind: "minion", key: "any", target: 200, progress: 0 });
  }
  options.push({ kind: "xp", key: "any", target: 100, progress: 0 });
  for (const skill of SKILLS) {
    const level = skillLevel(state, skill);
    if (level >= 3) {
      options.push({
        kind: "xp",
        key: skill,
        target: Math.max(50, Math.round((level * level * 10) / 50) * 50),
        progress: 0,
      });
    }
  }
  // Seeded by the day and the island, not the game's own generator: picking
  // tasks mustn't change what drops next.
  const picker = { seed: (Math.imul(day, 2654435761) ^ state.createdAt) | 0 };
  const picked: DailyTask[] = [];
  while (picked.length < TASKS_PER_DAY && options.length > 0) {
    const index = Math.floor(random(picker) * options.length);
    const [task] = options.splice(index, 1);
    if (task) picked.push(task);
  }
  return picked;
}

/** Brings the world up to `now`: minions work, nodes grow back. */
function advanceInPlace(state: GameState, now: number): void {
  if (now <= state.now) return;
  const day = dayOf(now);
  if (state.daily.day !== day) {
    state.daily = {
      ...state.daily,
      day,
      tasks: dailyTasks(state, day),
      claimed: false,
    };
  }
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
  const max = playerStats(state).health;
  if (state.health < max) {
    const regained = ((now - state.now) / 1000) * max * REGEN_PER_SECOND;
    state.health = Math.min(max, state.health + regained);
  } else {
    state.health = max;
  }
  const mobs: GameState["mobs"] = {};
  for (const [island, wounded] of Object.entries(state.mobs)) {
    const still = Object.entries(wounded).filter(
      ([, mob]) => now - mob.at < MOB_RESET_MS,
    );
    if (still.length > 0) {
      mobs[island as keyof typeof mobs] = Object.fromEntries(still);
    }
  }
  state.mobs = mobs;
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
  track(state, events, "gather", node.item, n);
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
  track(state, events, "fish", "any", 1);
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
  track(state, events, "minion", "any", n);
}

function pickup(state: GameState, events: GameEvent[], slot: number): void {
  collect(state, events, slot);
  const minion = state.minions[slot];
  if (!minion) return;
  state.minions[slot] = null;
  give(state, events, `${minion.kind}_minion_${String(minion.tier)}`, 1);
}

function randomInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1));
}

/** Whether you can attack what's at (x, y). */
export function attackCheck(
  state: GameState,
  x: number,
  y: number,
): Check<null> {
  if (!MOBS[charAt(islandOf(state), x, y)])
    return fail("There's nothing to fight there.");
  if (!isAdjacent(state, x, y)) return fail("Too far away.");
  if (isDepleted(state, x, y)) return fail("Nothing's there right now.");
  return { ok: true, value: null };
}

function die(state: GameState, events: GameEvent[]): void {
  const lost = Math.floor(state.coins * DEATH_PENALTY);
  state.coins -= lost;
  const hub = ISLAND_MAPS.hub;
  state.pos = { island: "hub", x: hub.spawn.x, y: hub.spawn.y };
  state.health = playerStats(state).health;
  state.fishing = null;
  events.push({ type: "death", lost });
}

function attack(
  state: GameState,
  events: GameEvent[],
  t: number,
  x: number,
  y: number,
): void {
  const check = attackCheck(state, x, y);
  if (!check.ok) throw new GameRuleError(check.reason);
  const mob = MOBS[charAt(islandOf(state), x, y)];
  if (!mob) return;
  state.busyUntil = t + ATTACK_MS;
  state.fishing = null;
  const island = state.pos.island;
  const key = `${String(x)},${String(y)}`;
  const wounded = (state.mobs[island] ??= {});
  const hp = wounded[key]?.hp ?? mob.hp;

  const stats = playerStats(state);
  const combat = skillLevel(state, "combat");
  const crit = random(state) * 100 < stats.critChance;
  const damage = Math.max(
    1,
    Math.round(
      stats.damage *
        (1 + stats.strength / 100) *
        (1 + (combat * COMBAT_DAMAGE_PER_LEVEL) / 100) *
        (crit ? 1 + stats.critDamage / 100 : 1),
    ),
  );
  const left = Math.max(0, hp - damage);
  events.push({
    type: "hit",
    mob: mob.name,
    x,
    y,
    damage,
    crit,
    hp: left,
    max: mob.hp,
  });

  if (left === 0) {
    state.mobs[island] = Object.fromEntries(
      Object.entries(wounded).filter(([spot]) => spot !== key),
    );
    (state.depleted[island] ??= {})[key] = t + mob.respawn;
    events.push({ type: "kill", mob: mob.name, x, y });
    track(state, events, "kill", mob.name, 1);
    addCoins(state, events, randomInt(state, mob.coins[0], mob.coins[1]));
    for (const drop of mob.drops) {
      if (random(state) >= drop.chance) continue;
      const n = randomInt(state, drop.min, drop.max);
      give(state, events, drop.item, n);
      addCollection(state, events, drop.item, n);
    }
    addXp(state, events, "combat", mob.xp);
    return;
  }

  wounded[key] = { hp: left, at: t };
  const taken = Math.max(
    1,
    Math.round((mob.damage * 100) / (100 + stats.defense)),
  );
  state.health -= taken;
  events.push({ type: "hurt", mob: mob.name, damage: taken });
  if (state.health <= 0) die(state, events);
}

function claimDaily(state: GameState, events: GameEvent[]): void {
  const { daily } = state;
  if (
    daily.tasks.length === 0 ||
    daily.tasks.some((t) => t.progress < t.target)
  ) {
    throw new GameRuleError("Finish today's tasks first.");
  }
  if (daily.claimed) throw new GameRuleError("You've had today's reward.");
  const streak = currentStreak(daily, daily.day) + 1;
  state.daily = { ...daily, claimed: true, streak, lastClaimed: daily.day };
  const coins = dailyReward(streak);
  events.push({
    type: "note",
    text: `Daily reward: ${String(coins)} coins (${String(streak)}-day streak).`,
  });
  addCoins(state, events, coins);
}

function equip(state: GameState, events: GameEvent[], item: ItemId): void {
  const gear = ITEMS[item]?.gear;
  if (!gear) throw new GameRuleError("You can't wear or wield that.");
  take(state, events, item, 1);
  const previous = state.equipment[gear.slot];
  if (previous) give(state, events, previous, 1);
  state.equipment[gear.slot] = item;
  state.health = Math.min(state.health, playerStats(state).health);
}

function unequip(state: GameState, events: GameEvent[], slot: GearSlot): void {
  if (!GEAR_SLOTS.includes(slot))
    throw new GameRuleError("There's no such slot.");
  const item = state.equipment[slot];
  if (!item) throw new GameRuleError("There's nothing there.");
  state.equipment = Object.fromEntries(
    Object.entries(state.equipment).filter(([key]) => key !== slot),
  );
  give(state, events, item, 1);
  state.health = Math.min(state.health, playerStats(state).health);
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
    case "attack":
      attack(next, events, t, action.x, action.y);
      break;
    case "equip":
      equip(next, events, action.item);
      break;
    case "unequip":
      unequip(next, events, action.slot);
      break;
    case "daily":
      claimDaily(next, events);
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
