/**
 * The cheapest way to get every shard (hours per shard), and how: SkyShards'
 * Bellman-Ford-style relaxation (src/services/minCostSolver.ts), ported faithfully,
 * odd corners included, on shard indexes. Every shard starts at its hunting cost; a
 * shard is looked at again whenever one of its inputs gets cheaper, until nothing
 * improves by more than TOLERANCE.
 *
 * A shard with a recipe chosen by hand keeps that recipe (or hunting, for null). As in
 * SkyShards, it starts priced at its hunting cost with the recipe already current, so
 * a chosen recipe can make a shard cheaper than hunting it but never dearer.
 */
import {
  directCost,
  effectiveOutput,
  multipliers,
  sameRecipe,
  type Graph,
  type GraphRecipe,
} from "./graph";
import type { CalcSettings } from "./settings";

/** How much cheaper a recipe must be to win: hours, or coins in coin mode (SkyShards'). */
export const TOLERANCE = 1e-10;
export const COIN_TOLERANCE = 1e-2;
/** A starting cost for loops of chosen recipes with no finite way in. */
const CYCLE_SEED_COST = 1e10;

/** Chosen recipes by shard index (null: hunt it). */
export type Overrides = Map<number, GraphRecipe | null>;

export interface Solved {
  /** Hours per shard, by index. */
  cost: Float64Array;
  /** How each shard is got: a recipe, or null to hunt it. */
  choice: (GraphRecipe | null)[];
}

export function solve(
  graph: Graph,
  settings: CalcSettings,
  overrides: Overrides = new Map(),
  /** Leave Crocodile out (cycle entries are priced without it, as in SkyShards). */
  options: { noCrocodile?: boolean } = {},
): Solved {
  const n = graph.shards.length;
  const mult = multipliers(
    options.noCrocodile
      ? {
          ...settings,
          levels: {
            ...settings.levels,
            crocodile: 0,
            seaSerpent: 0,
            tiamat: 0,
          },
        }
      : settings,
  );
  const tolerance = graph.mode === "coins" ? COIN_TOLERANCE : TOLERANCE;
  const cost = new Float64Array(n);
  const choice: (GraphRecipe | null)[] = new Array<GraphRecipe | null>(n).fill(
    null,
  );
  const fuse = Int32Array.from(graph.shards, (shard) => shard.fuse);

  const unitCost = (recipe: GraphRecipe): number =>
    ((cost[recipe.a] ?? Infinity) * (fuse[recipe.a] ?? 1) +
      (cost[recipe.b] ?? Infinity) * (fuse[recipe.b] ?? 1) +
      mult.fusionCost) /
    effectiveOutput(recipe, mult.crocodile);

  // Which shards use each shard.
  const dependents: number[][] = graph.shards.map(() => []);
  for (let output = 0; output < n; output++) {
    const seen = new Set<number>();
    for (const recipe of graph.recipes[output] ?? []) {
      for (const input of [recipe.a, recipe.b])
        if (!seen.has(input)) {
          seen.add(input);
          dependents[input]?.push(output);
        }
    }
  }

  for (let i = 0; i < n; i++) cost[i] = directCost(graph, i);
  for (const [shard, recipe] of overrides) if (recipe) choice[shard] = recipe;
  if (overrides.size > 0) {
    for (const loop of findCycles(choice)) {
      if (loop.every((shard) => !Number.isFinite(cost[shard] ?? Infinity)))
        for (const shard of loop) cost[shard] = CYCLE_SEED_COST;
    }
  }

  const queue: number[] = [];
  const queued = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    queue.push(i);
    queued[i] = 1;
  }
  const update = (shard: number, value: number, recipe: GraphRecipe | null) => {
    cost[shard] = value;
    choice[shard] = recipe;
    for (const dependent of dependents[shard] ?? [])
      if (!queued[dependent]) {
        queue.push(dependent);
        queued[dependent] = 1;
      }
  };

  // A for-of over an array also visits what's pushed onto it meanwhile: a work queue.
  for (const shard of queue) {
    queued[shard] = 0;
    const current = cost[shard] ?? Infinity;
    const currentRecipe = choice[shard] ?? null;
    if (overrides.has(shard)) {
      const chosen = overrides.get(shard) ?? null;
      if (chosen === null) {
        const hunt = directCost(graph, shard);
        if (Math.abs(hunt - current) > tolerance) update(shard, hunt, null);
      } else {
        const value = unitCost(chosen);
        if (value < current - tolerance || !sameRecipe(chosen, currentRecipe))
          update(shard, value, chosen);
      }
      continue;
    }
    let best = current;
    let bestRecipe = currentRecipe;
    for (const recipe of graph.recipes[shard] ?? []) {
      const value = unitCost(recipe);
      if (value < best - tolerance) {
        best = value;
        bestRecipe = recipe;
      }
    }
    if (best < current - tolerance || bestRecipe !== currentRecipe)
      update(shard, best, bestRecipe);
  }
  return { cost, choice };
}

/**
 * Loops in the chosen recipes (Tarjan's strongly connected components): groups of 2+
 * shards, or a shard made from itself. Only Crocodile (fractional output) or chosen
 * recipes can make the cheapest choices loop.
 */
export function findCycles(
  choice: readonly (GraphRecipe | null)[],
): number[][] {
  let counter = 0;
  const order = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const cycles: number[][] = [];

  // Iterative, so a long chain can't overflow the call stack.
  for (let root = 0; root < choice.length; root++) {
    if (!choice[root] || order.has(root)) continue;
    const work: { node: number; next: number }[] = [{ node: root, next: 0 }];
    order.set(root, counter);
    low.set(root, counter++);
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      if (!frame) break;
      const recipe = choice[frame.node];
      const inputs = recipe ? [recipe.a, recipe.b] : [];
      if (frame.next < inputs.length) {
        const next = inputs[frame.next++] ?? -1;
        if (!choice[next]) continue;
        if (!order.has(next)) {
          order.set(next, counter);
          low.set(next, counter++);
          stack.push(next);
          onStack.add(next);
          work.push({ node: next, next: 0 });
        } else if (onStack.has(next)) {
          low.set(
            frame.node,
            Math.min(low.get(frame.node) ?? 0, order.get(next) ?? 0),
          );
        }
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent)
        low.set(
          parent.node,
          Math.min(low.get(parent.node) ?? 0, low.get(frame.node) ?? 0),
        );
      if (low.get(frame.node) === order.get(frame.node)) {
        const group: number[] = [];
        let member: number;
        do {
          member = stack.pop() ?? frame.node;
          onStack.delete(member);
          group.push(member);
        } while (member !== frame.node);
        const self = choice[frame.node];
        if (
          group.length > 1 ||
          (self && (self.a === frame.node || self.b === frame.node))
        )
          cycles.push(group);
      }
    }
  }
  return cycles;
}

/** Loops only matter with Crocodile or chosen recipes; the plain data has none. */
export function cyclesIfNeeded(
  solved: Solved,
  settings: CalcSettings,
  overrides: Overrides,
): number[][] {
  return settings.levels.crocodile > 0 || overrides.size > 0
    ? findCycles(solved.choice)
    : [];
}
