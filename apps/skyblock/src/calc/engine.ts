/**
 * The calculator's engine host: holds the Deck, keeps the last graph and solution, and
 * answers plans and alternatives as plain views (Hypixel IDs, no indexes), fit to post
 * from a Web Worker. worker.ts runs it off the main thread; client.ts falls back to
 * running it here where workers aren't available (tests).
 */
import {
  alternatives,
  buildGraph,
  cyclesIfNeeded,
  directCost,
  fusedOf,
  fusionSteps,
  inventoryOf,
  inventoryPlanIn,
  modFormatsFor,
  modPayload,
  multiPlan,
  prepareInventory,
  planFrom,
  planText,
  solve,
  toOverrides,
  type CalcSettings,
  type ChosenRecipe,
  type Collection,
  type Deck,
  type Graph,
  type GraphRecipe,
  type InventorySetup,
  type ModFormat,
  type Overrides,
  type Plan,
  type PlanNode,
  type PriceTable,
  type Solved,
} from "@trilleo/skyblock/calc";
import type { Rarity } from "@trilleo/skyblock";

export interface PlanRequest {
  settings: CalcSettings;
  chosen: ChosenRecipe[];
  /** Hypixel ID. */
  target: string;
  quantity: number;
  /** The Collection, read when `settings.useCollection` is on. */
  collection?: Collection | null;
}

/** The hunting planner: several targets with one setup. */
export interface MultiRequest {
  settings: CalcSettings;
  chosen: ChosenRecipe[];
  targets: { shard: string; quantity: number }[];
  collection?: Collection | null;
}

export interface ShardInfo {
  id: string;
  name: string;
  slug: string;
  rarity: Rarity;
  icon: string | null;
  fuse: number;
  /** Shards an hour with the setup (0: can't be hunted). */
  rate: number;
}

export interface RecipeView {
  a: string;
  b: string;
  quantity: number;
  reptile: boolean;
}

export type NodeView =
  | { kind: "hunt"; shard: string; quantity: number; cost: number }
  | { kind: "owned"; shard: string; quantity: number }
  | { kind: "split"; shard: string; quantity: number; parts: NodeView[] }
  | {
      kind: "fuse";
      shard: string;
      quantity: number;
      crafts: number;
      recipe: RecipeView;
      /** This recipe was chosen by hand. */
      chosen: boolean;
      inputs: [NodeView, NodeView];
    }
  | {
      kind: "cycle";
      shard: string;
      quantity: number;
      crafts: number;
      multiplier: number;
      steps: { output: string; recipe: RecipeView }[];
      entry: NodeView;
      inputs: NodeView[];
    };

export type StepView =
  | {
      kind: "fuse";
      id: string;
      output: string;
      recipe: RecipeView;
      crafts: number;
      quantity: number;
    }
  | {
      kind: "loop";
      id: string;
      output: string;
      steps: { output: string; recipe: RecipeView }[];
      crafts: number;
      quantity: number;
    };

export interface PlanView {
  version: string;
  /** "time": costs in hours; "coins": in coins. */
  mode: CalcSettings["mode"];
  /** The target's Bazaar prices (coin mode), to show what it sells for. */
  market: { ask: number | null; bid: number | null } | null;
  target: string;
  quantity: number;
  produced: number;
  crafts: number;
  fusionCost: number;
  cost: number;
  costPerShard: number;
  tree: NodeView;
  /** What to hunt, longest first. */
  hunt: { shard: string; quantity: number; cost: number }[];
  /** Inventory mode: what's taken from the Collection (null: mode off). */
  used: { shard: string; quantity: number }[] | null;
  steps: StepView[];
  /** Saved choices the data no longer has. */
  stale: ChosenRecipe[];
  /** Every shard the plan mentions. */
  shards: Record<string, ShardInfo>;
  text: string;
  /** The mod formats this plan offers (not SkyOcean with held shards). */
  mods: Partial<Record<ModFormat, { prefix: string; json: string }>>;
}

export interface MultiView {
  version: string;
  mode: CalcSettings["mode"];
  /** Each target's share. */
  targets: {
    shard: string;
    quantity: number;
    cost: number;
    crafts: number;
  }[];
  crafts: number;
  fusionCost: number;
  cost: number;
  hunt: { shard: string; quantity: number; cost: number }[];
  used: { shard: string; quantity: number }[] | null;
  /** Every target's fusions, deepest first, the same fusion done together. */
  steps: StepView[];
  stale: ChosenRecipe[];
  shards: Record<string, ShardInfo>;
  /** Targets not in the data any more. */
  unknown: string[];
}

export interface AlternativesView {
  shard: string;
  /** Distinct recipes in all (only the cheapest are listed). */
  total: number;
  options: {
    recipe: RecipeView | null;
    costPerShard: number;
    current: boolean;
  }[];
  shards: Record<string, ShardInfo>;
}

/** Alternatives listed for one shard (some have thousands of recipes). */
export const ALTERNATIVES_SHOWN = 40;

export class CalcEngine {
  private graphMemo: { key: string; graph: Graph } | null = null;
  private solvedMemo: {
    key: string;
    solved: Solved;
    cycles: number[][];
    overrides: Overrides;
    stale: ChosenRecipe[];
  } | null = null;

  private inventoryMemo: { key: string; setup: InventorySetup } | null = null;

  /** The Bazaar's prices, for coin mode, and when they were fetched. */
  private prices: PriceTable | null = null;
  private pricesAt = "";

  constructor(private deck: Deck) {}

  setPrices(prices: PriceTable | null, fetchedAt: string): void {
    this.prices = prices;
    this.pricesAt = fetchedAt;
  }

  get version(): string {
    return this.deck.version;
  }

  private graph(settings: CalcSettings): Graph {
    const key = JSON.stringify([
      settings,
      settings.mode === "coins" ? this.pricesAt : "",
    ]);
    if (this.graphMemo?.key !== key)
      this.graphMemo = {
        key,
        graph: buildGraph(this.deck, settings, this.prices),
      };
    return this.graphMemo.graph;
  }

  private solved(graph: Graph, settings: CalcSettings, chosen: ChosenRecipe[]) {
    const key = JSON.stringify([
      settings,
      chosen,
      settings.mode === "coins" ? this.pricesAt : "",
    ]);
    if (this.solvedMemo?.key !== key) {
      const { overrides, stale } = toOverrides(graph, chosen);
      const solved = solve(graph, settings, overrides);
      this.solvedMemo = {
        key,
        solved,
        overrides,
        stale,
        cycles: cyclesIfNeeded(solved, settings, overrides),
      };
    }
    return this.solvedMemo;
  }

  /** Inventory mode's setup (solved once per setup, choices and attribute levels). */
  private inventorySetup(
    graph: Graph,
    settings: CalcSettings,
    chosen: ChosenRecipe[],
    collection: Collection,
  ): InventorySetup {
    const key = JSON.stringify([
      settings,
      chosen,
      collection.levels,
      settings.mode === "coins" ? this.pricesAt : "",
    ]);
    if (this.inventoryMemo?.key !== key) {
      const { overrides } = this.solved(graph, settings, chosen);
      this.inventoryMemo = {
        key,
        setup: prepareInventory(graph, settings, {
          overrides,
          fused: fusedOf(graph, collection),
        }),
      };
    }
    return this.inventoryMemo.setup;
  }

  /** Views of shards, nodes and steps for one answer, gathering the shards it names. */
  private viewer(graph: Graph, overrides: Overrides) {
    const shards: Record<string, ShardInfo> = {};
    const id = (index: number) => {
      const info = this.info(graph, index);
      shards[info.id] = info;
      return info.id;
    };
    const recipeView = (recipe: GraphRecipe): RecipeView => ({
      a: id(recipe.a),
      b: id(recipe.b),
      quantity: recipe.quantity,
      reptile: recipe.reptile,
    });
    const node = (current: PlanNode): NodeView => {
      switch (current.kind) {
        case "hunt":
          return {
            kind: "hunt",
            shard: id(current.shard),
            quantity: current.quantity,
            cost: directCost(graph, current.shard) * current.quantity,
          };
        case "owned":
          return {
            kind: "owned",
            shard: id(current.shard),
            quantity: current.quantity,
          };
        case "split":
          return {
            kind: "split",
            shard: id(current.shard),
            quantity: current.quantity,
            parts: current.parts.map(node),
          };
        case "fuse":
          return {
            kind: "fuse",
            shard: id(current.shard),
            quantity: current.quantity,
            crafts: current.crafts,
            recipe: recipeView(current.recipe),
            chosen: overrides.has(current.shard),
            inputs: [node(current.inputs[0]), node(current.inputs[1])],
          };
        case "cycle":
          return {
            kind: "cycle",
            shard: id(current.shard),
            quantity: current.quantity,
            crafts: current.crafts,
            multiplier: current.multiplier,
            steps: current.steps.map((step) => ({
              output: id(step.output),
              recipe: recipeView(step.recipe),
            })),
            entry: node(current.entry),
            inputs: current.inputs.map(node),
          };
      }
    };
    const huntList = (hunt: Map<number, number>) =>
      [...hunt]
        .map(([index, quantity]) => ({
          shard: id(index),
          quantity,
          cost: directCost(graph, index) * quantity,
        }))
        .sort((a, b) => b.cost - a.cost);
    const usedList = (used: Map<number, number> | undefined) =>
      used
        ? [...used]
            .map(([index, quantity]) => ({ shard: id(index), quantity }))
            .sort((a, b) => b.quantity - a.quantity)
        : null;
    const steps = (plans: Plan[]): StepView[] => {
      const order: StepView[] = [];
      const byId = new Map<string, StepView>();
      for (const plan of plans)
        for (const step of fusionSteps(graph, plan)) {
          const existing = byId.get(step.id);
          if (existing) {
            existing.crafts += step.crafts;
            existing.quantity += step.quantity;
            continue;
          }
          const view: StepView =
            step.kind === "fuse"
              ? {
                  kind: "fuse",
                  id: step.id,
                  output: id(step.output),
                  recipe: recipeView(step.recipe),
                  crafts: step.crafts,
                  quantity: step.quantity,
                }
              : {
                  kind: "loop",
                  id: step.id,
                  output: id(step.output),
                  steps: step.steps.map((s) => ({
                    output: id(s.output),
                    recipe: recipeView(s.recipe),
                  })),
                  crafts: step.crafts,
                  quantity: step.quantity,
                };
          byId.set(step.id, view);
          order.push(view);
        }
      return order;
    };
    return { shards, id, node, huntList, usedList, steps };
  }

  private info(graph: Graph, index: number): ShardInfo {
    const shard = graph.shards[index];
    if (!shard) throw new Error(`no shard ${String(index)}`);
    return {
      id: shard.id,
      name: shard.name,
      slug: shard.slug,
      rarity: shard.rarity,
      icon: shard.icon,
      fuse: shard.fuse,
      rate: graph.rates[index] ?? 0,
    };
  }

  plan(request: PlanRequest): PlanView | null {
    const { settings } = request;
    const graph = this.graph(settings);
    const target = graph.index.get(request.target);
    if (target === undefined) return null;
    const { solved, cycles, overrides, stale } = this.solved(
      graph,
      settings,
      request.chosen,
    );
    const collection = settings.useCollection
      ? (request.collection ?? null)
      : null;
    const result = collection
      ? inventoryPlanIn(
          this.inventorySetup(graph, settings, request.chosen, collection),
          target,
          request.quantity,
          inventoryOf(graph, collection),
        ).plan
      : planFrom(graph, target, request.quantity, solved, cycles, settings);
    const v = this.viewer(graph, overrides);
    const tree = v.node(result.tree);
    return {
      version: this.deck.version,
      mode: settings.mode,
      market: this.prices?.[request.target]
        ? {
            ask: this.prices[request.target]?.ask ?? null,
            bid: this.prices[request.target]?.bid ?? null,
          }
        : null,
      target: request.target,
      quantity: request.quantity,
      produced: result.produced,
      crafts: result.crafts,
      fusionCost: result.fusionCost,
      cost: result.cost,
      costPerShard: result.costPerShard,
      tree,
      hunt: v.huntList(result.hunt),
      used: v.usedList(result.used),
      steps: v.steps([result]),
      stale,
      shards: v.shards,
      text: planText(graph, result),
      mods: Object.fromEntries(
        modFormatsFor(result).map((format) => [
          format,
          modPayload(graph, result, format),
        ]),
      ),
    };
  }

  multi(request: MultiRequest): MultiView {
    const { settings } = request;
    const graph = this.graph(settings);
    const { overrides, stale } = this.solved(graph, settings, request.chosen);
    const unknown: string[] = [];
    const targets: { shard: number; quantity: number }[] = [];
    for (const target of request.targets) {
      const index = graph.index.get(target.shard);
      if (index === undefined) unknown.push(target.shard);
      else targets.push({ shard: index, quantity: target.quantity });
    }
    const collection = settings.useCollection
      ? (request.collection ?? null)
      : null;
    const result = multiPlan(graph, targets, settings, {
      overrides,
      inventory: collection ? inventoryOf(graph, collection) : null,
      fused: collection ? fusedOf(graph, collection) : undefined,
    });
    const v = this.viewer(graph, overrides);
    return {
      version: this.deck.version,
      mode: settings.mode,
      targets: result.plans.map((plan) => ({
        shard: v.id(plan.target),
        quantity: plan.quantity,
        cost: plan.cost,
        crafts: plan.crafts,
      })),
      crafts: result.crafts,
      fusionCost: result.fusionCost,
      cost: result.cost,
      hunt: v.huntList(result.hunt),
      used: collection ? v.usedList(result.used) : null,
      steps: v.steps(result.plans),
      stale,
      shards: v.shards,
      unknown,
    };
  }

  alternatives(request: PlanRequest, shardId: string): AlternativesView | null {
    const graph = this.graph(request.settings);
    const shard = graph.index.get(shardId);
    if (shard === undefined) return null;
    const { solved } = this.solved(graph, request.settings, request.chosen);
    const options = alternatives(graph, solved, request.settings, shard);
    const shards: Record<string, ShardInfo> = {};
    const id = (index: number) => {
      const info = this.info(graph, index);
      shards[info.id] = info;
      return info.id;
    };
    id(shard);
    const hunting = options.find((option) => option.recipe === null);
    const recipes = options.filter((option) => option.recipe !== null);
    const shown = recipes.slice(0, ALTERNATIVES_SHOWN);
    // The current recipe is always listed, even when it isn't among the cheapest.
    const current = recipes.find((option) => option.current);
    if (current && !shown.includes(current)) shown.push(current);
    return {
      shard: shardId,
      total: recipes.length,
      options: [...shown, ...(hunting ? [hunting] : [])]
        .sort((a, b) => a.costPerShard - b.costPerShard)
        .map((option) => ({
          recipe: option.recipe
            ? {
                a: id(option.recipe.a),
                b: id(option.recipe.b),
                quantity: option.recipe.quantity,
                reptile: option.recipe.reptile,
              }
            : null,
          costPerShard: option.costPerShard,
          current: option.current,
        })),
      shards,
    };
  }
}
