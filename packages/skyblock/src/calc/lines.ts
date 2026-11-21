/**
 * Fusion lines: SkyShards' pruned fusion graph (src/utilities/fusionLines.ts and
 * fusionGraphLayout.ts), ported on shard indexes. Within a family the raw recipes are
 * near-complete in both directions, so "X goes into Y" means little; what counts is
 * dominance: a real parent is in most of a shard's recipes, catalysts are noise.
 * Keeping only dominant edges leaves the lines people know, e.g. Gecko → Iguana →
 * Komodo Dragon → Wyvern (special fusions) and Ghost → Sphinx → King Minos (ID).
 * Chameleon recipes are left out entirely.
 */
import { shardsToMax } from "../attributes";
import type { Graph } from "./graph";
import { CHAMELEON } from "./hunting";

export type LineKind = "special" | "id";

export interface FusionLines {
  /** Edges by kind: from → the shards it leads to. */
  special: Map<number, Set<number>>;
  id: Map<number, Set<number>>;
  /** The same, backwards: to → where it comes from. */
  specialRev: Map<number, Set<number>>;
  idRev: Map<number, Set<number>>;
}

export interface LinesOptions {
  /** Least share of a shard's recipes (for one output quantity) an input must be in. */
  dominance?: number;
  /** Least number of those recipes (drops noise from tiny groups). */
  minCount?: number;
  /** Prune roots that can never be got directly (SkyShards: base rate > 0). */
  obtainable?: (shard: number) => boolean;
  /** Each shard's cheapest cost: edges from a dearer shard to a cheaper one go. */
  cost?: (shard: number) => number;
}

const DOMINANCE = 0.2;
const MIN_COUNT = 2;

function addEdge(
  fwd: Map<number, Set<number>>,
  rev: Map<number, Set<number>>,
  from: number,
  to: number,
): void {
  let out = fwd.get(from);
  if (!out) fwd.set(from, (out = new Set()));
  out.add(to);
  let back = rev.get(to);
  if (!back) rev.set(to, (back = new Set()));
  back.add(from);
}

function removeEdge(
  fwd: Map<number, Set<number>>,
  rev: Map<number, Set<number>>,
  from: number,
  to: number,
): void {
  const out = fwd.get(from);
  if (out) {
    out.delete(to);
    if (out.size === 0) fwd.delete(from);
  }
  const back = rev.get(to);
  if (back) {
    back.delete(from);
    if (back.size === 0) rev.delete(to);
  }
}

/** The dominance-pruned graph: X → Y when X is in enough of Y's recipes. */
export function fusionLines(
  graph: Graph,
  options: LinesOptions = {},
): FusionLines {
  const dominance = options.dominance ?? DOMINANCE;
  const minCount = options.minCount ?? MIN_COUNT;
  const chameleon = graph.index.get(CHAMELEON) ?? -1;
  const lines: FusionLines = {
    special: new Map(),
    id: new Map(),
    specialRev: new Map(),
    idRev: new Map(),
  };
  graph.recipes.forEach((recipes, output) => {
    const byQuantity = new Map<number, typeof recipes>();
    for (const recipe of recipes) {
      const group = byQuantity.get(recipe.quantity);
      if (group) group.push(recipe);
      else byQuantity.set(recipe.quantity, [recipe]);
    }
    for (const [quantity, group] of byQuantity) {
      const usable = group.filter(
        (r) => r.a !== chameleon && r.b !== chameleon,
      );
      if (usable.length === 0) continue;
      const counts = new Map<number, number>();
      for (const recipe of usable)
        for (const input of [recipe.a, recipe.b])
          counts.set(input, (counts.get(input) ?? 0) + 1);
      const special = quantity === 2;
      const fwd = special ? lines.special : lines.id;
      const rev = special ? lines.specialRev : lines.idRev;
      for (const [input, count] of counts) {
        if (input === output || count < minCount) continue;
        if (count / usable.length < dominance) continue;
        addEdge(fwd, rev, input, output);
      }
    }
  });
  // Cost first: dropping a backwards edge can leave a dead root for the next step.
  if (options.cost) pruneDearer(lines, options.cost);
  if (options.obtainable) pruneUnobtainable(lines, options.obtainable);
  return lines;
}

function canReach(
  fwd: Map<number, Set<number>>,
  start: number,
  goal: number,
): boolean {
  const seen = new Set<number>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop() ?? -1;
    if (node === goal) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of fwd.get(node) ?? []) stack.push(next);
  }
  return false;
}

/**
 * Drops edges from a dearer shard to a cheaper one: nobody fuses a pricier shard into a
 * cheaper one. Every such ID edge goes; a special edge only if it's part of a loop, so
 * one-way family chains survive even when their start is dear.
 */
function pruneDearer(
  lines: FusionLines,
  cost: (shard: number) => number,
): void {
  const prune = (
    fwd: Map<number, Set<number>>,
    rev: Map<number, Set<number>>,
    allow: (from: number, to: number) => boolean,
  ) => {
    const doomed: [number, number][] = [];
    for (const [from, tos] of fwd) {
      const fromCost = cost(from);
      for (const to of tos)
        if (fromCost > cost(to) && allow(from, to)) doomed.push([from, to]);
    }
    for (const [from, to] of doomed) removeEdge(fwd, rev, from, to);
  };
  prune(lines.id, lines.idRev, () => true);
  prune(lines.special, lines.specialRev, (from, to) =>
    canReach(lines.special, to, from),
  );
}

/**
 * Strips the edges of roots (nothing leads to them) that can never be got directly,
 * again and again, since that can leave new dead roots.
 */
function pruneUnobtainable(
  lines: FusionLines,
  obtainable: (shard: number) => boolean,
): void {
  const removeFrom = (
    fwd: Map<number, Set<number>>,
    rev: Map<number, Set<number>>,
    from: number,
  ) => {
    for (const to of fwd.get(from) ?? []) {
      const back = rev.get(to);
      if (back) {
        back.delete(from);
        if (back.size === 0) rev.delete(to);
      }
    }
    fwd.delete(from);
  };
  for (;;) {
    const dead: number[] = [];
    for (const shard of new Set([
      ...lines.special.keys(),
      ...lines.id.keys(),
    ])) {
      const out =
        (lines.special.get(shard)?.size ?? 0) > 0 ||
        (lines.id.get(shard)?.size ?? 0) > 0;
      const into =
        (lines.specialRev.get(shard)?.size ?? 0) > 0 ||
        (lines.idRev.get(shard)?.size ?? 0) > 0;
      if (out && !into && !obtainable(shard)) dead.push(shard);
    }
    if (dead.length === 0) break;
    for (const shard of dead) {
      removeFrom(lines.special, lines.specialRev, shard);
      removeFrom(lines.id, lines.idRev, shard);
    }
  }
}

/** The lines as SkyShards draws them: base rates decide what's obtainable, costs from `cost`. */
export function standardLines(graph: Graph, cost: Float64Array): FusionLines {
  return fusionLines(graph, {
    obtainable: (shard) => (graph.shards[shard]?.rate ?? 0) > 0,
    cost: (shard) => cost[shard] ?? Infinity,
  });
}

export type LineFilter = "both" | LineKind;

const mapsFor = (lines: FusionLines, filter: LineFilter, back: boolean) => {
  const maps: Map<number, Set<number>>[] = [];
  if (filter !== "id") maps.push(back ? lines.specialRev : lines.special);
  if (filter !== "special") maps.push(back ? lines.idRev : lines.id);
  return maps;
};

/** Everything on `shard`'s line: all it comes from and all it leads to, itself included. */
export function connectedLine(
  shard: number,
  lines: FusionLines,
  filter: LineFilter = "both",
): Set<number> {
  const result = new Set<number>([shard]);
  const walk = (maps: Map<number, Set<number>>[]) => {
    const stack = [shard];
    while (stack.length > 0) {
      const node = stack.pop() ?? -1;
      for (const map of maps)
        for (const next of map.get(node) ?? [])
          if (!result.has(next)) {
            result.add(next);
            stack.push(next);
          }
    }
  };
  walk(mapsFor(lines, filter, false));
  walk(mapsFor(lines, filter, true));
  return result;
}

export interface Neighbourhood {
  /** Steps from the centre per shard: negative where it comes from, positive where it leads. */
  depth: Map<number, number>;
  /** Edges between the shards shown. */
  edges: { from: number; to: number; kind: LineKind }[];
  /** Shards just past the edge of what's shown, on each side (more to see). */
  more: { before: boolean; after: boolean };
}

/**
 * `shard` and what's within `steps` of it along the lines, each side; a shard found on
 * both sides stays on the side where it's nearer (where it leads, on a tie).
 */
export function neighbourhood(
  shard: number,
  lines: FusionLines,
  steps: number,
  filter: LineFilter = "both",
): Neighbourhood {
  const depth = new Map<number, number>([[shard, 0]]);
  const more = { before: false, after: false };
  const reach = (back: boolean) => {
    const maps = mapsFor(lines, filter, back);
    const found = new Map<number, number>();
    let frontier = [shard];
    for (let step = 1; frontier.length > 0; step++) {
      const next: number[] = [];
      for (const node of frontier)
        for (const map of maps)
          for (const to of map.get(node) ?? [])
            if (to !== shard && !found.has(to)) {
              if (step > steps) {
                if (back) more.before = true;
                else more.after = true;
                continue;
              }
              found.set(to, step);
              next.push(to);
            }
      if (step > steps) break;
      frontier = next;
    }
    return found;
  };
  const after = reach(false);
  const before = reach(true);
  for (const [node, step] of after) depth.set(node, step);
  for (const [node, step] of before) {
    const forward = after.get(node);
    if (forward === undefined || step < forward) depth.set(node, -step);
  }
  const edges: Neighbourhood["edges"] = [];
  for (const kind of ["special", "id"] as const) {
    if (filter !== "both" && filter !== kind) continue;
    for (const [from, tos] of lines[kind])
      if (depth.has(from))
        for (const to of tos) if (depth.has(to)) edges.push({ from, to, kind });
  }
  return { depth, edges, more };
}

/**
 * Shards that may be spent freely from an inventory: the shard and everything its
 * special-fusion line leads to are all maxed in the person's attributes, so there's
 * nothing left to keep it for. `fused`: shards fused into each attribute; empty gives
 * none (SkyShards').
 */
export function freelyUsableShards(
  graph: Graph,
  fused: Map<number, number>,
  cost: Float64Array,
): Set<number> {
  const result = new Set<number>();
  if (fused.size === 0) return result;
  const lines = standardLines(graph, cost);
  const isMaxed = (index: number) => {
    const shard = graph.shards[index];
    return (
      shard !== undefined &&
      (fused.get(index) ?? 0) >= shardsToMax(shard.rarity)
    );
  };
  for (let index = 0; index < graph.shards.length; index++) {
    // Downstream along special edges only, the shard included.
    const closure = new Set<number>([index]);
    const stack = [...(lines.special.get(index) ?? [])];
    let allMaxed = isMaxed(index);
    while (allMaxed && stack.length > 0) {
      const node = stack.pop() ?? -1;
      if (closure.has(node)) continue;
      closure.add(node);
      if (!isMaxed(node)) allMaxed = false;
      for (const next of lines.special.get(node) ?? [])
        if (!closure.has(next)) stack.push(next);
    }
    if (allMaxed) result.add(index);
  }
  return result;
}
