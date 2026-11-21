/**
 * Inventory mode: a plan that uses the shards someone already holds. SkyShards'
 * InvCalculationService (src/services/invCalculationService.ts), ported faithfully on
 * shard indexes: it builds the cheapest tree as usual, then rewrites it top-down so
 * held shards replace hunting and fusing where they can, and may carve a fusion into
 * segments made by other recipes whose inputs are held. Taking the better of that and
 * plain substitution means holding shards never makes a plan dearer.
 *
 * Held shards are spent with an eye on what they're worth elsewhere: a shard that is
 * nearly always an input to something valuable (exclusivity) is kept back unless the
 * tree itself needs it, except when its whole special-fusion line is maxed in the
 * person's attributes ("freely usable", lines.ts).
 */
import {
  effectiveOutput,
  multipliers,
  pricedOrInfinity,
  sameRecipe,
  type Graph,
  type GraphRecipe,
} from "./graph";
import { freelyUsableShards } from "./lines";
import {
  assignQuantities,
  buildTree,
  craftsFor,
  directTotal,
  snapToInteger,
  treeStats,
  type Plan,
  type PlanNode,
} from "./plan";
import type { CalcSettings } from "./settings";
import { cyclesIfNeeded, solve, type Overrides, type Solved } from "./solver";

/** Shards held, by index, and how many. */
export type Inventory = Map<number, number>;

/**
 * A tiny cost left on spending a freely usable shard: far below hunting it, so held
 * ones still win, but scaled by its worth so the cheaper ones go first (SkyShards').
 */
const FREELY_USABLE_RESIDUAL = 0.02;

/** An input must be in at least this share of an output's recipes to be exclusive. */
const EXCLUSIVE_PRESENCE = 0.8;

/** SkyShards' `x || 0` on a number: a missing or NaN value counts as 0. */
const orZero = (value: number | undefined) =>
  value === undefined || Number.isNaN(value) ? 0 : value;

type FuseNode = Extract<PlanNode, { kind: "fuse" }>;

interface Context {
  graph: Graph;
  settings: CalcSettings;
  solved: Solved;
  cycles: number[][];
  overrides: Overrides;
  exclusivity: Float64Array;
  freelyUsable: Set<number>;
  crocodile: number;
  fusionCost: number;
}

/**
 * How irreplaceable each shard is as an input, 0–1: for every output and output
 * quantity, inputs in at least EXCLUSIVE_PRESENCE of its recipes score by how
 * dominant they are, weighted by the output's worth (and √quantity). Each shard keeps
 * its best score. Not normalised: callers multiply by the shard's own worth.
 */
export function exclusivityScores(
  graph: Graph,
  cost: Float64Array,
): Float64Array {
  const n = graph.shards.length;
  const best = new Float64Array(n);
  let maxValue = 0;
  for (let i = 0; i < n; i++) {
    const value = orZero(cost[i]);
    if (Number.isFinite(value)) maxValue = Math.max(maxValue, value);
  }
  if (maxValue === 0) maxValue = 1;
  for (let output = 0; output < n; output++) {
    const recipes = graph.recipes[output] ?? [];
    if (recipes.length === 0) continue;
    const value = orZero(cost[output]);
    if (value <= 0 || !Number.isFinite(value)) continue;
    const normalized = value / maxValue;
    const byQuantity = new Map<number, GraphRecipe[]>();
    for (const recipe of recipes) {
      const group = byQuantity.get(recipe.quantity);
      if (group) group.push(recipe);
      else byQuantity.set(recipe.quantity, [recipe]);
    }
    for (const [quantity, group] of byQuantity) {
      const weight = normalized * Math.sqrt(quantity);
      const usage = new Map<number, number>();
      for (const recipe of group)
        for (const input of new Set([recipe.a, recipe.b]))
          usage.set(input, (usage.get(input) ?? 0) + 1);
      for (const [input, count] of usage) {
        const presence = count / group.length;
        if (presence < EXCLUSIVE_PRESENCE) continue;
        // A literal 0.2, as SkyShards: 1 - 0.8 is 0.19999999999999996.
        const strength = (presence - EXCLUSIVE_PRESENCE) / 0.2;
        const weighted = strength * weight;
        if (weighted > (best[input] ?? 0)) best[input] = weighted;
      }
    }
  }
  return best.map((score) => Math.min(1, Math.max(0, score)));
}

export interface InventoryOptions {
  /** Shards fused into each attribute so far, by index (for freely usable shards). */
  fused?: Map<number, number>;
  overrides?: Overrides;
}

/** Everything inventory plans share for one setup: solve once, plan many targets. */
export type InventorySetup = Readonly<Context>;

export function prepareInventory(
  graph: Graph,
  settings: CalcSettings,
  options: InventoryOptions = {},
): InventorySetup {
  const overrides: Overrides =
    options.overrides ?? new Map<number, GraphRecipe | null>();
  const solved = solve(graph, settings, overrides);
  const mult = multipliers(settings);
  return {
    graph,
    settings,
    solved,
    cycles: cyclesIfNeeded(solved, settings, overrides),
    overrides,
    exclusivity: exclusivityScores(graph, solved.cost),
    freelyUsable: freelyUsableShards(
      graph,
      options.fused ?? new Map<number, number>(),
      solved.cost,
    ),
    crocodile: mult.crocodile,
    fusionCost: mult.fusionCost,
  };
}

/**
 * The plan for `quantity` of `target` using held shards. `used` says what it takes
 * from the inventory, `left` what's left of it; `produced` is `quantity`
 * (SkyShards'), and fused-but-unneeded extras aren't counted.
 */
export function inventoryPlanIn(
  ctx: InventorySetup,
  target: number,
  quantity: number,
  inventory: Inventory,
): { plan: Plan; left: Inventory } {
  const { graph, solved, settings } = ctx;
  const evaluate = (allowAlternatives: boolean) => {
    const left: Inventory = new Map(inventory);
    const plain = buildTree(graph, target, solved.choice, ctx.cycles, settings);
    assignQuantities(graph, plain, quantity, { total: 0 }, ctx.crocodile);
    const tree = new Substitution(ctx, left, plain).run(allowAlternatives);
    const { crafts, hunt } = treeStats(tree);
    const fusionCost = crafts * ctx.fusionCost;
    return {
      tree,
      left,
      crafts,
      hunt,
      fusionCost,
      cost: directTotal(graph, hunt) + fusionCost,
    };
  };
  // The alternatives are a heuristic and can now and then pick a worse shape; plain
  // substitution only ever replaces work with held shards. The better one wins.
  const withAlternatives = evaluate(true);
  const substitutionOnly = evaluate(false);
  const best =
    withAlternatives.cost <= substitutionOnly.cost
      ? withAlternatives
      : substitutionOnly;

  const used = new Map<number, number>();
  for (const [shard, held] of inventory) {
    const taken = held - (best.left.get(shard) ?? 0);
    if (taken > 0) used.set(shard, taken);
  }
  return {
    plan: {
      target,
      quantity,
      produced: quantity,
      tree: best.tree,
      crafts: best.crafts,
      fusionCost: best.fusionCost,
      hunt: best.hunt,
      cost: best.cost,
      costPerShard: quantity > 0 ? best.cost / quantity : 0,
      used,
    },
    left: best.left,
  };
}

/** Solve and plan one target with held shards in one go. */
export function inventoryPlan(
  graph: Graph,
  target: number,
  quantity: number,
  settings: CalcSettings,
  options: InventoryOptions & { inventory: Inventory },
): { plan: Plan; solved: Solved; left: Inventory } {
  const ctx = prepareInventory(graph, settings, options);
  return {
    ...inventoryPlanIn(ctx, target, quantity, options.inventory),
    solved: ctx.solved,
  };
}

const clone = <T>(value: T): T => structuredClone(value);

/**
 * One pass over a quantified tree, spending from `inventory` as it goes, top-down. For
 * each node: take it from the inventory, wholly or in part (the rest is made or
 * hunted); otherwise, for a fusion, try carving it into segments by other recipes
 * whose inputs are held; otherwise go on to its inputs. Holding a shard beats any
 * recipe for it, hence the order.
 *
 * `path` holds the shards being made further up the branch: a shard is never taken
 * from the inventory, or fed into an alternative, inside its own subtree.
 */
class Substitution {
  /** What the whole tree asks of each shard, so alternatives don't take what's needed elsewhere. */
  private readonly demand: Map<number, number>;
  private readonly processed = new WeakMap<object, PlanNode>();

  constructor(
    private readonly ctx: Context,
    private readonly inventory: Inventory,
    private readonly tree: PlanNode,
  ) {
    this.demand = treeDemand(tree);
  }

  run(allowAlternatives: boolean): PlanNode {
    return mergeSegments(this.process(this.tree, allowAlternatives));
  }

  /** Quantities again for a node not yet substituted (substitution goes top-down). */
  private requantify(node: PlanNode, quantity: number): void {
    assignQuantities(
      this.ctx.graph,
      node,
      quantity,
      { total: 0 },
      this.ctx.crocodile,
    );
  }

  private process(
    node: PlanNode,
    allowAlternatives = true,
    path = new Set<number>(),
  ): PlanNode {
    if (node.kind === "split")
      return {
        ...node,
        parts: node.parts.map((part) =>
          this.process(part, allowAlternatives, path),
        ),
      };
    if (node.kind === "owned") return node;
    if (node.kind !== "hunt") {
      const done = this.processed.get(node);
      if (done) return done;
    }

    const held = path.has(node.shard)
      ? 0
      : (this.inventory.get(node.shard) ?? 0);
    if (held >= node.quantity) {
      this.inventory.set(node.shard, held - node.quantity);
      return this.remember(node, {
        kind: "owned",
        shard: node.shard,
        quantity: node.quantity,
      });
    }
    if (held > 0) {
      const owned: PlanNode = {
        kind: "owned",
        shard: node.shard,
        quantity: held,
      };
      const rest = node.quantity - held;
      this.inventory.set(node.shard, 0);
      if (node.kind === "hunt")
        return split(node.shard, [
          owned,
          { kind: "hunt", shard: node.shard, quantity: rest },
        ]);
      // Requantify a copy, so the caller's node stays whole, and process the rest as a
      // node of its own so it can still take alternatives (none of it is held now).
      const made = clone(node);
      this.requantify(made, rest);
      return this.remember(
        node,
        split(node.shard, [owned, this.process(made, allowAlternatives, path)]),
      );
    }
    if (node.kind === "hunt") return node;
    if (allowAlternatives && node.kind === "fuse") {
      const segments = this.alternatives(node, path);
      if (segments) return this.remember(node, segments);
    }
    this.processInputs(node, allowAlternatives, path);
    return this.remember(node, node);
  }

  private remember(node: PlanNode, result: PlanNode): PlanNode {
    if (node.kind !== "hunt") this.processed.set(node, result);
    return result;
  }

  private processInputs(
    node: PlanNode,
    allowAlternatives: boolean,
    path: Set<number>,
  ): void {
    if (node.kind === "fuse") {
      node.inputs[0] = this.process(node.inputs[0], allowAlternatives, path);
      node.inputs[1] = this.process(node.inputs[1], allowAlternatives, path);
    } else if (node.kind === "cycle") {
      node.entry = this.process(node.entry, allowAlternatives, path);
      for (let i = 0; i < node.inputs.length; i++) {
        const input = node.inputs[i];
        if (input)
          node.inputs[i] = this.process(input, allowAlternatives, path);
      }
    }
  }

  /**
   * Carves `node` into segments made by other recipes that held shards make cheaper,
   * cheapest first, until none helps; the rest stays on its recipe. Null when no
   * alternative was used.
   */
  private alternatives(node: FuseNode, path: Set<number>): PlanNode | null {
    const { graph, overrides } = this.ctx;
    if (path.has(node.shard)) return null;
    const available = graph.recipes[node.shard] ?? [];
    if (available.length <= 1) return null;
    if (overrides.has(node.shard)) return null;
    const others = available.filter(
      (recipe) => !sameRecipe(recipe, node.recipe),
    );
    if (others.length === 0) return null;

    const childPath = new Set(path).add(node.shard);
    let remaining = node.quantity;
    const segments: PlanNode[] = [];
    while (remaining > 0) {
      const surplus = this.surplus();
      let best: Candidate | null = null;
      for (const recipe of others) {
        const candidate = this.evaluate(recipe, node, remaining, surplus, path);
        if (candidate && (!best || candidate.cost < best.cost))
          best = candidate;
      }
      if (!best || best.crafts <= 0) break;
      const produced = Math.min(
        remaining,
        Math.floor(snapToInteger(best.crafts * best.output)),
      );
      if (produced <= 0) break;
      const segment = this.fuseNode(
        node.shard,
        best.recipe,
        best.crafts,
        produced,
      );
      // The segment's own recipe stays; its inputs may still take theirs.
      this.processInputs(segment, true, childPath);
      segments.push(segment);
      remaining -= produced;
    }
    if (segments.length === 0) return null;
    if (remaining > 0) {
      this.requantify(node, remaining);
      this.processInputs(node, true, childPath);
      segments.push(node);
    }
    return segments.length === 1
      ? (segments[0] ?? null)
      : split(node.shard, segments);
  }

  /**
   * Held shards free to go into an alternative: only what the tree doesn't need itself
   * (even freely usable ones). Exclusive shards the tree doesn't use are kept back.
   */
  private surplus(): Map<number, number> {
    const { exclusivity, freelyUsable } = this.ctx;
    const surplus = new Map<number, number>();
    for (const [shard, held] of this.inventory) {
      const demand = this.demand.get(shard) ?? 0;
      const exclusive = orZero(exclusivity[shard]);
      const keepBack =
        !freelyUsable.has(shard) && exclusive > 0 && demand === 0;
      surplus.set(shard, keepBack ? 0 : Math.max(0, held - demand));
    }
    return surplus;
  }

  /** `recipe` against the node's own over the segment it could fill; null if it can't help. */
  private evaluate(
    recipe: GraphRecipe,
    node: FuseNode,
    remaining: number,
    surplus: Map<number, number>,
    path: Set<number>,
  ): Candidate | null {
    const { graph, crocodile, exclusivity, freelyUsable } = this.ctx;
    const inputs = [recipe.a, recipe.b];
    // Never feed the shard being made (or one above it) back into making it.
    if (inputs.some((input) => input === node.shard || path.has(input)))
      return null;
    const fuse = (input: number) => graph.shards[input]?.fuse ?? 1;

    // Inputs both recipes share are spent either way: the whole inventory, at no extra
    // cost, not limiting the segment. The alternative's own inputs use only surplus.
    const shared = new Set([node.recipe.a, node.recipe.b]);
    const fair = new Map<number, number>();
    for (const input of inputs)
      fair.set(
        input,
        (shared.has(input) ? this.inventory.get(input) : surplus.get(input)) ??
          0,
      );
    if (!inputs.some((input) => (fair.get(input) ?? 0) >= fuse(input)))
      return null;

    const discounts = new Map<number, number>();
    for (const input of inputs) {
      if (shared.has(input) || freelyUsable.has(input)) {
        discounts.set(input, 1);
      } else {
        const free = surplus.get(input) ?? 0;
        const demand = this.demand.get(input) ?? 0;
        discounts.set(input, free + demand > 0 ? free / (free + demand) : 0);
      }
    }

    const limits: number[] = [];
    for (const input of inputs) {
      if (shared.has(input)) continue;
      const free = surplus.get(input) ?? 0;
      if (free >= fuse(input)) limits.push(Math.floor(free / fuse(input)));
    }
    const supported = limits.length > 0 ? Math.min(...limits) : 0;
    if (supported <= 0) return null;

    // Both recipes priced over the same batch: the segment this one could fill.
    const output = effectiveOutput(recipe, crocodile);
    const crafts = Math.min(supported, craftsFor(remaining, output));
    const segment = Math.min(remaining, crafts * output);
    const current = this.effectiveCost(node.recipe, this.inventory, {
      crafts: craftsFor(segment, effectiveOutput(node.recipe, crocodile)),
    });
    const cost = this.effectiveCost(recipe, fair, {
      crafts,
      discounts,
      exclusivity,
      freelyUsable,
      shared,
    });
    if (cost >= current) return null;
    return { recipe, output, crafts, cost };
  }

  /**
   * Cost per shard made by `recipe`, each input discounted by the share of what it
   * needs that `inventory` covers (scaled by `discounts`). With `exclusivity`, spending
   * a held input also costs what it's worth elsewhere (worth × exclusivity, or a small
   * residual for freely usable shards); shared inputs are exempt.
   */
  private effectiveCost(
    recipe: GraphRecipe,
    inventory: Map<number, number>,
    options: CostOptions,
  ): number {
    const { graph, solved, crocodile, fusionCost } = this.ctx;
    const { crafts, discounts, exclusivity, freelyUsable, shared } = options;
    const inputCost = (input: number) => {
      const fuse = graph.shards[input]?.fuse ?? 1;
      const held = inventory.get(input) ?? 0;
      const base = pricedOrInfinity(solved.cost[input]) * fuse;
      if (held < fuse) return { cost: base, opportunity: 0 };
      const coverage = crafts > 0 ? Math.min(1, held / (fuse * crafts)) : 1;
      const cost = (1 - coverage * (discounts?.get(input) ?? 1)) * base;
      let opportunity = 0;
      if (exclusivity && !shared?.has(input)) {
        if (freelyUsable?.has(input))
          opportunity = base * FREELY_USABLE_RESIDUAL;
        else {
          const exclusive = orZero(exclusivity[input]);
          if (exclusive > 0) opportunity = base * exclusive;
        }
      }
      return { cost, opportunity };
    };
    const first = inputCost(recipe.a);
    const second = inputCost(recipe.b);
    return (
      (first.cost +
        second.cost +
        first.opportunity +
        second.opportunity +
        fusionCost) /
      effectiveOutput(recipe, crocodile)
    );
  }

  /** A fusion node for `crafts` of `recipe`, with fresh, quantified input trees. */
  private fuseNode(
    shard: number,
    recipe: GraphRecipe,
    crafts: number,
    quantity: number,
  ): FuseNode {
    const { graph, solved, cycles, settings, crocodile } = this.ctx;
    const tree = (input: number) => {
      const built = buildTree(graph, input, solved.choice, cycles, settings);
      assignQuantities(
        graph,
        built,
        crafts * (graph.shards[input]?.fuse ?? 1),
        { total: 0 },
        crocodile,
      );
      return built;
    };
    return {
      kind: "fuse",
      shard,
      quantity,
      recipe,
      crafts,
      inputs: [tree(recipe.a), tree(recipe.b)],
    };
  }
}

interface Candidate {
  recipe: GraphRecipe;
  output: number;
  /** Fusions of it in the segment: limited by held surplus and what's still needed. */
  crafts: number;
  cost: number;
}

interface CostOptions {
  crafts: number;
  discounts?: Map<number, number>;
  exclusivity?: Float64Array;
  freelyUsable?: Set<number>;
  shared?: Set<number>;
}

function split(shard: number, parts: PlanNode[]): PlanNode {
  return {
    kind: "split",
    shard,
    quantity: parts.reduce((sum, part) => sum + part.quantity, 0),
    parts,
  };
}

/** What every node of the tree asks of each shard, in all. */
function treeDemand(tree: PlanNode): Map<number, number> {
  const demand = new Map<number, number>();
  const walk = (node: PlanNode) => {
    if (node.kind === "split") {
      node.parts.forEach(walk);
      return;
    }
    demand.set(node.shard, (demand.get(node.shard) ?? 0) + node.quantity);
    if (node.kind === "fuse") {
      walk(node.inputs[0]);
      walk(node.inputs[1]);
    } else if (node.kind === "cycle") {
      walk(node.entry);
      node.inputs.forEach(walk);
    }
  };
  walk(tree);
  return demand;
}

/**
 * Tidies the tree bottom-up: flattens splits inside splits and merges neighbouring
 * parts got the same way (held, hunted, or the same recipe). Loops never merge.
 */
export function mergeSegments(tree: PlanNode): PlanNode {
  if (tree.kind === "split") {
    const merged: PlanNode[] = [];
    for (const part of tree.parts) {
      const result = mergeSegments(part);
      for (const node of result.kind === "split" ? result.parts : [result]) {
        const previous = merged[merged.length - 1];
        if (previous && canMerge(previous, node))
          merged[merged.length - 1] = mergeNodes(previous, node);
        else merged.push(node);
      }
    }
    return merged.length === 1 && merged[0]
      ? merged[0]
      : split(tree.shard, merged);
  }
  if (tree.kind === "fuse")
    return {
      ...tree,
      inputs: [mergeSegments(tree.inputs[0]), mergeSegments(tree.inputs[1])],
    };
  if (tree.kind === "cycle")
    return {
      ...tree,
      entry: mergeSegments(tree.entry),
      inputs: tree.inputs.map(mergeSegments),
    };
  return tree;
}

function canMerge(a: PlanNode, b: PlanNode): boolean {
  if (a.shard !== b.shard || a.kind !== b.kind) return false;
  if (a.kind === "hunt" || a.kind === "owned") return true;
  if (a.kind === "fuse" && b.kind === "fuse")
    return sameRecipe(a.recipe, b.recipe);
  return false;
}

function mergeNodes(a: PlanNode, b: PlanNode): PlanNode {
  if (a.kind === "fuse" && b.kind === "fuse")
    return {
      kind: "fuse",
      shard: a.shard,
      quantity: a.quantity + b.quantity,
      recipe: a.recipe,
      crafts: a.crafts + b.crafts,
      inputs: [
        mergeSegments(split(a.inputs[0].shard, [a.inputs[0], b.inputs[0]])),
        mergeSegments(split(a.inputs[1].shard, [a.inputs[1], b.inputs[1]])),
      ],
    };
  if (a.kind === "hunt" || a.kind === "owned")
    return { kind: a.kind, shard: a.shard, quantity: a.quantity + b.quantity };
  return a;
}
