/**
 * A plan for some number of one shard: the tree of how each part is got (hunted,
 * fused, or made in a loop of chosen recipes), how many of each, how many fusions,
 * and the hours it all takes. Ported from SkyShards (src/services/recipeTree.ts and
 * fusionMath.ts), whose float handling is deliberate: keep the order of the maths.
 */
import {
  directCost,
  effectiveOutput,
  multipliers,
  pricedOrInfinity,
  type Graph,
  type GraphRecipe,
} from "./graph";
import type { CalcSettings } from "./settings";
import { cyclesIfNeeded, solve, type Overrides, type Solved } from "./solver";

export type PlanNode =
  | { kind: "hunt"; shard: number; quantity: number }
  | {
      kind: "fuse";
      shard: number;
      quantity: number;
      recipe: GraphRecipe;
      /** Fusions done. */
      crafts: number;
      inputs: [PlanNode, PlanNode];
    }
  | {
      kind: "cycle";
      shard: number;
      quantity: number;
      /** The loop's recipes, each making one of its shards. */
      steps: { output: number; recipe: GraphRecipe }[];
      crafts: number;
      /** Crocodile's multiplier the loop ran with. */
      multiplier: number;
      /** How the loop is first entered: one fusion's worth of its cheapest shard. */
      entry: PlanNode;
      /** What each lap uses from outside the loop. */
      inputs: PlanNode[];
    };

export interface Plan {
  target: number;
  quantity: number;
  /** Shards the last fusions give (whole fusions; reptile ones may give more). */
  produced: number;
  tree: PlanNode;
  /** Every fusion, loops included. */
  crafts: number;
  /** Hours spent fusing (crafts × the setting). */
  fusionCost: number;
  /** Shards to hunt, by index, and how many. */
  hunt: Map<number, number>;
  /** Hunting (or buying) plus fusing: hours, or coins in coin mode. */
  cost: number;
  costPerShard: number;
}

const INTEGER_EPSILON = 1e-12;

/** Rounds to the nearest whole number if it's only float noise away from it. */
export function snapToInteger(value: number): number {
  if (!Number.isFinite(value)) return value;
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <=
    INTEGER_EPSILON * Math.max(1, Math.abs(value))
    ? rounded
    : value;
}

/** Fusions needed to make `quantity` (12 / 1.2 landing a hair above 10 is 10). */
export function craftsFor(quantity: number, output: number): number {
  return Math.ceil(snapToInteger(quantity / output));
}

/** Prices for entering loops: solved without Crocodile or chosen recipes, per graph. */
const entryCosts = new WeakMap<Graph, { key: string; solved: Solved }>();

function noCrocodile(graph: Graph, settings: CalcSettings): Solved {
  const key = JSON.stringify(settings);
  const memo = entryCosts.get(graph);
  if (memo?.key === key) return memo.solved;
  const solved = solve(graph, settings, new Map(), { noCrocodile: true });
  entryCosts.set(graph, { key, solved });
  return solved;
}

/** The tree of how `shard` is got under `choice`, quantities left at 0. */
export function buildTree(
  graph: Graph,
  shard: number,
  choice: readonly (GraphRecipe | null)[],
  cycles: number[][],
  settings: CalcSettings,
): PlanNode {
  const loop = cycles.find((group) => group.includes(shard));
  if (loop) return buildCycle(graph, shard, choice, loop, settings);
  const recipe = choice[shard] ?? null;
  if (!recipe) return { kind: "hunt", shard, quantity: 0 };
  return {
    kind: "fuse",
    shard,
    quantity: 0,
    recipe,
    crafts: 0,
    inputs: [
      buildTree(graph, recipe.a, choice, cycles, settings),
      buildTree(graph, recipe.b, choice, cycles, settings),
    ],
  };
}

function buildCycle(
  graph: Graph,
  shard: number,
  choice: readonly (GraphRecipe | null)[],
  loop: number[],
  settings: CalcSettings,
): PlanNode {
  const steps: { output: number; recipe: GraphRecipe }[] = [];
  for (const output of loop) {
    const recipe = choice[output];
    if (recipe) steps.push({ output, recipe });
  }
  const plain = noCrocodile(graph, settings);
  // Enter through the loop's cheapest shard, with one fusion's worth of it.
  let entryShard = shard;
  let entryCost = pricedOrInfinity(plain.cost[shard]);
  for (const step of steps) {
    const value = pricedOrInfinity(plain.cost[step.output]);
    if (value < entryCost) {
      entryCost = value;
      entryShard = step.output;
    }
  }
  const entry = buildTree(graph, entryShard, plain.choice, [], settings);
  assignQuantities(
    graph,
    entry,
    graph.shards[entryShard]?.fuse ?? 1,
    { total: 0 },
    1,
  );
  const inside = new Set(steps.map((step) => step.output));
  const outside: number[] = [];
  for (const step of steps)
    for (const input of [step.recipe.a, step.recipe.b])
      if (!inside.has(input) && !outside.includes(input)) outside.push(input);
  return {
    kind: "cycle",
    shard,
    quantity: 0,
    steps,
    crafts: 0,
    multiplier: 1,
    entry,
    inputs: outside.map((input) =>
      buildTree(graph, input, plain.choice, [], settings),
    ),
  };
}

/**
 * A loop's numbers for `required` of `shard`: fusions (whole laps), and what each
 * outside input is needed in. Null when no step makes `shard`.
 */
export function cycleQuantities(
  graph: Graph,
  shard: number,
  steps: readonly { output: number; recipe: GraphRecipe }[],
  required: number,
  crocodile: number,
): { crafts: number; inputQuantity: (input: number) => number } | null {
  const outputStep = steps.find((step) => step.output === shard);
  if (!outputStep) return null;
  const expected = effectiveOutput(outputStep.recipe, crocodile);
  // What the loop eats of the target on its way round.
  let consumed = 0;
  for (const step of steps)
    for (const input of [step.recipe.a, step.recipe.b])
      if (input === shard) consumed += graph.shards[input]?.fuse ?? 1;
  const net = snapToInteger(expected - consumed);
  const expectedCrafts = craftsFor(required, net > 0 ? net : expected);
  const crafts = Math.ceil(expectedCrafts / steps.length) * steps.length;
  const inside = new Set(steps.map((step) => step.output));
  const perLap = new Map<number, number>();
  for (const step of steps)
    for (const input of [step.recipe.a, step.recipe.b])
      if (!inside.has(input))
        perLap.set(
          input,
          (perLap.get(input) ?? 0) + (graph.shards[input]?.fuse ?? 1),
        );
  return {
    crafts,
    inputQuantity: (input) =>
      (perLap.get(input) ?? 0) * (crafts / steps.length),
  };
}

/** Fills in quantities from the top: each fusion makes enough, inputs follow. */
export function assignQuantities(
  graph: Graph,
  node: PlanNode,
  required: number,
  counter: { total: number },
  crocodile: number,
): void {
  node.quantity = required;
  if (node.kind === "fuse") {
    const crafts = craftsFor(required, effectiveOutput(node.recipe, crocodile));
    node.crafts = crafts;
    counter.total += crafts;
    const [first, second] = node.inputs;
    assignQuantities(
      graph,
      first,
      crafts * (graph.shards[node.recipe.a]?.fuse ?? 1),
      counter,
      crocodile,
    );
    assignQuantities(
      graph,
      second,
      crafts * (graph.shards[node.recipe.b]?.fuse ?? 1),
      counter,
      crocodile,
    );
  } else if (node.kind === "cycle") {
    const loop = cycleQuantities(
      graph,
      node.shard,
      node.steps,
      required,
      crocodile,
    );
    if (!loop) return;
    node.multiplier = crocodile;
    node.crafts = loop.crafts;
    counter.total += loop.crafts;
    for (const input of node.inputs)
      assignQuantities(
        graph,
        input,
        loop.inputQuantity(input.shard),
        counter,
        crocodile,
      );
  }
}

/** Fusions and shards to hunt over a tree (a loop's entry counts fusions, not shards). */
export function treeStats(node: PlanNode): {
  crafts: number;
  hunt: Map<number, number>;
} {
  let crafts = 0;
  const hunt = new Map<number, number>();
  const visit = (current: PlanNode) => {
    if (current.kind === "hunt") {
      hunt.set(
        current.shard,
        (hunt.get(current.shard) ?? 0) + current.quantity,
      );
    } else if (current.kind === "fuse") {
      crafts += current.crafts;
      current.inputs.forEach(visit);
    } else {
      crafts += current.crafts;
      visit(current.entry);
      current.inputs.forEach(visit);
    }
  };
  visit(node);
  return { crafts, hunt };
}

/** Hours to hunt these shards. */
export function directTotal(graph: Graph, hunt: Map<number, number>): number {
  let total = 0;
  for (const [shard, quantity] of hunt)
    total += directCost(graph, shard) * quantity;
  return total;
}

/** The whole plan for `quantity` of `target`, from solved choices. */
export function planFrom(
  graph: Graph,
  target: number,
  quantity: number,
  solved: Solved,
  cycles: number[][],
  settings: CalcSettings,
): Plan {
  const mult = multipliers(settings);
  const tree = buildTree(graph, target, solved.choice, cycles, settings);
  assignQuantities(graph, tree, quantity, { total: 0 }, mult.crocodile);
  const { crafts, hunt } = treeStats(tree);
  const fusionCost = crafts * mult.fusionCost;
  const last = solved.choice[target];
  const produced = last
    ? snapToInteger(
        craftsFor(quantity, effectiveOutput(last, mult.crocodile)) *
          effectiveOutput(last, mult.crocodile),
      )
    : quantity;
  const cost = directTotal(graph, hunt) + fusionCost;
  return {
    target,
    quantity,
    produced,
    tree,
    crafts,
    fusionCost,
    hunt,
    cost,
    costPerShard: cost / produced,
  };
}

/** Solve and plan in one go. */
export function plan(
  graph: Graph,
  target: number,
  quantity: number,
  settings: CalcSettings,
  overrides: Overrides = new Map(),
): { plan: Plan; solved: Solved } {
  const solved = solve(graph, settings, overrides);
  const cycles = cyclesIfNeeded(solved, settings, overrides);
  return {
    plan: planFrom(graph, target, quantity, solved, cycles, settings),
    solved,
  };
}
