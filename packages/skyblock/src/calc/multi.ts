/**
 * Several targets at once (the hunting planner): each target planned as the calculator
 * would, one after another, with what's held handed on from one to the next, then the
 * totals put together. SkyShards' multi-shard mode adds up separate plans the same
 * way; this also spends held shards across them.
 */
import { multipliers, type Graph, type GraphRecipe } from "./graph";
import { inventoryPlanIn, prepareInventory, type Inventory } from "./inventory";
import { planFrom, type Plan } from "./plan";
import type { CalcSettings } from "./settings";
import { cyclesIfNeeded, solve, type Overrides } from "./solver";

export interface Target {
  shard: number;
  quantity: number;
}

export interface MultiPlan {
  /** One plan per target, in order. */
  plans: Plan[];
  /** Shards to hunt (or buy), all targets together. */
  hunt: Map<number, number>;
  /** Shards taken from what's held. */
  used: Map<number, number>;
  crafts: number;
  fusionCost: number;
  /** Hours, or coins in coin mode; Infinity when a target can't be made. */
  cost: number;
}

const add = (
  into: Map<number, number>,
  from: Map<number, number> | undefined,
) => {
  for (const [shard, quantity] of from ?? [])
    into.set(shard, (into.get(shard) ?? 0) + quantity);
};

export function multiPlan(
  graph: Graph,
  targets: readonly Target[],
  settings: CalcSettings,
  options: {
    overrides?: Overrides;
    /** Held shards to use (null: inventory mode off). */
    inventory?: Inventory | null;
    fused?: Map<number, number>;
  } = {},
): MultiPlan {
  const overrides: Overrides =
    options.overrides ?? new Map<number, GraphRecipe | null>();
  const plans: Plan[] = [];
  if (options.inventory) {
    const ctx = prepareInventory(graph, settings, {
      overrides,
      fused: options.fused,
    });
    let left = new Map(options.inventory);
    for (const target of targets) {
      const result = inventoryPlanIn(ctx, target.shard, target.quantity, left);
      plans.push(result.plan);
      left = result.left;
    }
  } else {
    const solved = solve(graph, settings, overrides);
    const cycles = cyclesIfNeeded(solved, settings, overrides);
    for (const target of targets)
      plans.push(
        planFrom(
          graph,
          target.shard,
          target.quantity,
          solved,
          cycles,
          settings,
        ),
      );
  }
  const hunt = new Map<number, number>();
  const used = new Map<number, number>();
  let crafts = 0;
  let cost = 0;
  for (const plan of plans) {
    add(hunt, plan.hunt);
    add(used, plan.used);
    crafts += plan.crafts;
    cost += plan.cost;
  }
  return {
    plans,
    hunt,
    used,
    crafts,
    fusionCost: crafts * multipliers(settings).fusionCost,
    cost,
  };
}
