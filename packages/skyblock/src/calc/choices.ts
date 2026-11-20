/**
 * Choosing recipes by hand: saved choices (by Hypixel IDs) to the solver's overrides,
 * and the alternatives for one shard with what each would cost.
 */
import {
  directCost,
  effectiveOutput,
  multipliers,
  pricedOrInfinity,
  sameRecipe,
  type Graph,
  type GraphRecipe,
} from "./graph";
import type { ChosenRecipe, CalcSettings } from "./settings";
import type { Overrides, Solved } from "./solver";

/**
 * Saved choices as overrides. A choice whose shard or recipe is no longer in the data
 * is left out (and reported), so a data update never breaks the calculator.
 */
export function toOverrides(
  graph: Graph,
  chosen: readonly ChosenRecipe[],
): { overrides: Overrides; stale: ChosenRecipe[] } {
  const overrides: Overrides = new Map();
  const stale: ChosenRecipe[] = [];
  for (const choice of chosen) {
    const shard = graph.index.get(choice.shard);
    if (shard === undefined) {
      stale.push(choice);
      continue;
    }
    if (choice.recipe === null) {
      if (!overrides.has(shard)) overrides.set(shard, null);
      continue;
    }
    const [x, y] = choice.recipe.inputs.map((id) => graph.index.get(id));
    const quantity = choice.recipe.quantity;
    const recipe = (graph.recipes[shard] ?? []).find(
      (r) =>
        r.quantity === quantity &&
        ((r.a === x && r.b === y) || (r.a === y && r.b === x)),
    );
    if (recipe) {
      if (!overrides.has(shard)) overrides.set(shard, recipe);
    } else stale.push(choice);
  }
  return { overrides, stale };
}

/** A recipe (or hunting) for a shard, as it's saved. */
export function chosenOf(
  graph: Graph,
  shard: number,
  recipe: GraphRecipe | null,
): ChosenRecipe {
  const id = (index: number) => graph.shards[index]?.id ?? "";
  return {
    shard: id(shard),
    recipe: recipe
      ? { inputs: [id(recipe.a), id(recipe.b)], quantity: recipe.quantity }
      : null,
  };
}

/** Replaces any choice for the same shard. */
export function withChoice(
  chosen: readonly ChosenRecipe[],
  choice: ChosenRecipe,
): ChosenRecipe[] {
  return [...chosen.filter((c) => c.shard !== choice.shard), choice];
}

export function withoutChoice(
  chosen: readonly ChosenRecipe[],
  shard: string,
): ChosenRecipe[] {
  return chosen.filter((c) => c.shard !== shard);
}

export interface Alternative {
  /** null: hunt it. */
  recipe: GraphRecipe | null;
  /** Hours per shard this way, with today's prices of its inputs. */
  hoursPerShard: number;
  current: boolean;
}

/**
 * Every way to get `shard`, cheapest first: hunting it (unless `withHunting` is
 * false) and each distinct recipe. Hours are per shard made, from the solved costs.
 */
export function alternatives(
  graph: Graph,
  solved: Solved,
  settings: CalcSettings,
  shard: number,
  withHunting = true,
): Alternative[] {
  const mult = multipliers(settings);
  const current = solved.choice[shard] ?? null;
  const fuse = (index: number) => graph.shards[index]?.fuse ?? 1;
  const seen = new Set<string>();
  const options: Alternative[] = [];
  for (const recipe of graph.recipes[shard] ?? []) {
    const [lo, hi] =
      recipe.a <= recipe.b ? [recipe.a, recipe.b] : [recipe.b, recipe.a];
    const key = `${String(lo)}+${String(hi)}x${String(recipe.quantity)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const total =
      pricedOrInfinity(solved.cost[recipe.a]) * fuse(recipe.a) +
      pricedOrInfinity(solved.cost[recipe.b]) * fuse(recipe.b) +
      mult.fusionHours;
    options.push({
      recipe,
      hoursPerShard: total / effectiveOutput(recipe, mult.crocodile),
      current: sameRecipe(recipe, current),
    });
  }
  if (withHunting)
    options.push({
      recipe: null,
      hoursPerShard: directCost(graph, shard),
      current: current === null,
    });
  return options.sort((a, b) => a.hoursPerShard - b.hoursPerShard);
}
