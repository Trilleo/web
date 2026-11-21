/**
 * A plan as things to do, in order: what to hunt, then the fusions from the bottom of
 * the tree up (the same fusion in several branches done together). Steps have stable
 * IDs from Hypixel's IDs, so a checklist survives recalculating and data updates.
 */
import type { Graph, GraphRecipe } from "./graph";
import type { Plan, PlanNode } from "./plan";

export type Step =
  | {
      kind: "fuse";
      id: string;
      output: number;
      recipe: GraphRecipe;
      crafts: number;
      /** Shards it gives (crafts × output, before Crocodile). */
      quantity: number;
    }
  | {
      kind: "loop";
      id: string;
      output: number;
      steps: { output: number; recipe: GraphRecipe }[];
      crafts: number;
      quantity: number;
    };

const idOf = (graph: Graph, index: number) =>
  graph.shards[index]?.id ?? String(index);

/** "SHARD_TIAMAT=SHARD_CAIMAN+SHARD_X*2": the same fusion always has the same ID. */
export function stepId(
  graph: Graph,
  output: number,
  recipe: GraphRecipe,
): string {
  const [a, b] = [idOf(graph, recipe.a), idOf(graph, recipe.b)].sort();
  return `${idOf(graph, output)}=${a ?? ""}+${b ?? ""}*${String(recipe.quantity)}`;
}

/** The fusions of a plan, deepest first (each after everything it needs). */
export function fusionSteps(graph: Graph, plan: Plan): Step[] {
  const order: Step[] = [];
  const byId = new Map<string, Step>();
  const add = (step: Step) => {
    const existing = byId.get(step.id);
    if (existing) {
      existing.crafts += step.crafts;
      existing.quantity += step.quantity;
      return;
    }
    byId.set(step.id, step);
    order.push(step);
  };
  const visit = (node: PlanNode) => {
    if (node.kind === "hunt" || node.kind === "owned") return;
    if (node.kind === "split") {
      node.parts.forEach(visit);
      return;
    }
    if (node.kind === "fuse") {
      node.inputs.forEach(visit);
      add({
        kind: "fuse",
        id: stepId(graph, node.shard, node.recipe),
        output: node.shard,
        recipe: node.recipe,
        crafts: node.crafts,
        quantity: node.quantity,
      });
      return;
    }
    visit(node.entry);
    node.inputs.forEach(visit);
    add({
      kind: "loop",
      id: `loop:${node.steps
        .map((step) => stepId(graph, step.output, step.recipe))
        .sort()
        .join("|")}`,
      output: node.shard,
      steps: node.steps,
      crafts: node.crafts,
      quantity: node.quantity,
    });
  };
  visit(plan.tree);
  return order;
}
