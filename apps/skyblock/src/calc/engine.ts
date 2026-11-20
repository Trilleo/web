/**
 * The calculator's engine host: holds the Deck, keeps the last graph and solution, and
 * answers plans and alternatives as plain views (Hypixel IDs, no indexes), fit to post
 * from a Web Worker. worker.ts runs it off the main thread; client.ts falls back to
 * running it here where workers aren't available (tests).
 */
import {
  MOD_FORMATS,
  alternatives,
  buildGraph,
  cyclesIfNeeded,
  directCost,
  fusionSteps,
  modPayload,
  planFrom,
  planText,
  solve,
  toOverrides,
  type CalcSettings,
  type ChosenRecipe,
  type Deck,
  type Graph,
  type GraphRecipe,
  type ModFormat,
  type Overrides,
  type PlanNode,
  type Solved,
} from "@trilleo/skyblock/calc";
import type { Rarity } from "@trilleo/skyblock";

export interface PlanRequest {
  settings: CalcSettings;
  chosen: ChosenRecipe[];
  /** Hypixel ID. */
  target: string;
  quantity: number;
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
  | { kind: "hunt"; shard: string; quantity: number; hours: number }
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
  target: string;
  quantity: number;
  produced: number;
  crafts: number;
  fusionHours: number;
  hours: number;
  hoursPerShard: number;
  tree: NodeView;
  /** What to hunt, longest first. */
  hunt: { shard: string; quantity: number; hours: number }[];
  steps: StepView[];
  /** Saved choices the data no longer has. */
  stale: ChosenRecipe[];
  /** Every shard the plan mentions. */
  shards: Record<string, ShardInfo>;
  text: string;
  mods: Record<ModFormat, { prefix: string; json: string }>;
}

export interface AlternativesView {
  shard: string;
  /** Distinct recipes in all (only the cheapest are listed). */
  total: number;
  options: {
    recipe: RecipeView | null;
    hoursPerShard: number;
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

  constructor(private deck: Deck) {}

  get version(): string {
    return this.deck.version;
  }

  private graph(settings: CalcSettings): Graph {
    const key = JSON.stringify(settings);
    if (this.graphMemo?.key !== key)
      this.graphMemo = { key, graph: buildGraph(this.deck, settings) };
    return this.graphMemo.graph;
  }

  private solved(graph: Graph, settings: CalcSettings, chosen: ChosenRecipe[]) {
    const key = JSON.stringify([settings, chosen]);
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
    const graph = this.graph(request.settings);
    const target = graph.index.get(request.target);
    if (target === undefined) return null;
    const { solved, cycles, overrides, stale } = this.solved(
      graph,
      request.settings,
      request.chosen,
    );
    const result = planFrom(
      graph,
      target,
      request.quantity,
      solved,
      cycles,
      request.settings,
    );
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
    const view = (node: PlanNode): NodeView => {
      if (node.kind === "hunt")
        return {
          kind: "hunt",
          shard: id(node.shard),
          quantity: node.quantity,
          hours: directCost(graph, node.shard) * node.quantity,
        };
      if (node.kind === "fuse")
        return {
          kind: "fuse",
          shard: id(node.shard),
          quantity: node.quantity,
          crafts: node.crafts,
          recipe: recipeView(node.recipe),
          chosen: overrides.has(node.shard),
          inputs: [view(node.inputs[0]), view(node.inputs[1])],
        };
      return {
        kind: "cycle",
        shard: id(node.shard),
        quantity: node.quantity,
        crafts: node.crafts,
        multiplier: node.multiplier,
        steps: node.steps.map((step) => ({
          output: id(step.output),
          recipe: recipeView(step.recipe),
        })),
        entry: view(node.entry),
        inputs: node.inputs.map(view),
      };
    };
    const tree = view(result.tree);
    const hunt = [...result.hunt]
      .map(([index, quantity]) => ({
        shard: id(index),
        quantity,
        hours: directCost(graph, index) * quantity,
      }))
      .sort((a, b) => b.hours - a.hours);
    const steps: StepView[] = fusionSteps(graph, result).map((step) =>
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
          },
    );
    return {
      version: this.deck.version,
      target: request.target,
      quantity: request.quantity,
      produced: result.produced,
      crafts: result.crafts,
      fusionHours: result.fusionHours,
      hours: result.hours,
      hoursPerShard: result.hoursPerShard,
      tree,
      hunt,
      steps,
      stale,
      shards,
      text: planText(graph, result),
      mods: Object.fromEntries(
        MOD_FORMATS.map((format) => [
          format,
          modPayload(graph, result, format),
        ]),
      ) as PlanView["mods"],
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
        .sort((a, b) => a.hoursPerShard - b.hoursPerShard)
        .map((option) => ({
          recipe: option.recipe
            ? {
                a: id(option.recipe.a),
                b: id(option.recipe.b),
                quantity: option.recipe.quantity,
                reptile: option.recipe.reptile,
              }
            : null,
          hoursPerShard: option.hoursPerShard,
          current: option.current,
        })),
      shards,
    };
  }
}
