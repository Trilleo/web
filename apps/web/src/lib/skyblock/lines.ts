/**
 * Fusion lines (/tools/skyblock/lines/): SkyShards' pruned fusion graph (the engine's
 * lines.ts) worked out once per shard data, with the default setup's costs, and a
 * shard's neighbourhood laid out in columns for the page's diagram: where it comes
 * from to the left, where it leads to the right.
 */
import {
  DEFAULT_SETTINGS,
  buildGraph,
  connectedLine,
  deckOf,
  neighbourhood,
  solve,
  standardLines,
  type Deck,
  type FusionLines,
  type Graph,
  type LineFilter,
  type LineKind,
} from "@trilleo/skyblock/calc";
import { shardLink, type ShardLink } from "./public";
import type { ShardData } from "./data";

const deckMemo = new WeakMap<ShardData, Deck>();

/** The calculator's view of the data, once per version of it. */
export function deckFor(data: ShardData): Deck {
  let deck = deckMemo.get(data);
  if (!deck) {
    deck = deckOf(
      data.catalog.dataset,
      "",
      data.commit,
      (id) => data.icons.get(id) ?? null,
    );
    deckMemo.set(data, deck);
  }
  return deck;
}

const linesMemo = new WeakMap<
  ShardData,
  { graph: Graph; lines: FusionLines }
>();

export function linesFor(data: ShardData): {
  graph: Graph;
  lines: FusionLines;
} {
  let memo = linesMemo.get(data);
  if (!memo) {
    const graph = buildGraph(deckFor(data), DEFAULT_SETTINGS);
    const lines = standardLines(graph, solve(graph, DEFAULT_SETTINGS).cost);
    memo = { graph, lines };
    linesMemo.set(data, memo);
  }
  return memo;
}

export const LINE_STEPS = [1, 2, 3] as const;
export const LINE_FILTERS: Readonly<Record<LineFilter, string>> = {
  both: "Both kinds",
  special: "Special fusions",
  id: "ID fusions",
};

export function isLineFilter(value: unknown): value is LineFilter {
  return typeof value === "string" && value in LINE_FILTERS;
}

/** The diagram's sizes, in its own units. */
export const LINE_LAYOUT = {
  width: 176,
  height: 44,
  columnGap: 72,
  rowGap: 14,
  pad: 8,
};

export interface LineNode {
  shard: ShardLink;
  /** Steps from the centre: negative where it comes from, positive where it leads. */
  depth: number;
  x: number;
  y: number;
}

export interface LinesPage {
  centre: ShardLink;
  nodes: LineNode[];
  edges: { from: string; to: string; kind: LineKind }[];
  /** More to see past the shown steps, each side. */
  more: { before: boolean; after: boolean };
  /** Shards on the whole line (all it comes from and leads to). */
  lineSize: number;
  width: number;
  height: number;
  /** Per side, the shards by step (for the text version). */
  columns: { depth: number; shards: ShardLink[] }[];
}

/** `slug`'s neighbourhood, laid out; null when there's no such shard. */
export function linesPage(
  data: ShardData,
  slug: string,
  steps: number,
  filter: LineFilter,
): LinesPage | null {
  const record = data.catalog.bySlugOf(slug);
  if (!record) return null;
  const { graph, lines } = linesFor(data);
  const centre = graph.index.get(record.id);
  if (centre === undefined) return null;
  const near = neighbourhood(centre, lines, steps, filter);
  const linkOf = (index: number): ShardLink | null => {
    const shard = graph.shards[index];
    const found = shard ? data.catalog.get(shard.key) : undefined;
    return found ? shardLink(data, found) : null;
  };
  const byDepth = new Map<number, ShardLink[]>();
  const slugOf = new Map<number, string>();
  for (const [index, depth] of near.depth) {
    const link = linkOf(index);
    if (!link) continue;
    slugOf.set(index, link.slug);
    const column = byDepth.get(depth) ?? [];
    column.push(link);
    byDepth.set(depth, column);
  }
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const column of byDepth.values())
    column.sort((a, b) => a.name.localeCompare(b.name));
  const { width, height, columnGap, rowGap, pad } = LINE_LAYOUT;
  const tallest = Math.max(
    ...[...byDepth.values()].map((column) => column.length),
  );
  const fullHeight = tallest * height + (tallest - 1) * rowGap;
  const nodes: LineNode[] = [];
  depths.forEach((depth, columnIndex) => {
    const column = byDepth.get(depth) ?? [];
    const columnHeight = column.length * height + (column.length - 1) * rowGap;
    const top = pad + (fullHeight - columnHeight) / 2;
    column.forEach((shard, row) => {
      nodes.push({
        shard,
        depth,
        x: pad + columnIndex * (width + columnGap),
        y: top + row * (height + rowGap),
      });
    });
  });
  const centreLink = linkOf(centre);
  if (!centreLink) return null;
  return {
    centre: centreLink,
    nodes,
    edges: near.edges.flatMap((edge) => {
      const from = slugOf.get(edge.from);
      const to = slugOf.get(edge.to);
      return from && to ? [{ from, to, kind: edge.kind }] : [];
    }),
    more: near.more,
    lineSize: connectedLine(centre, lines, filter).size,
    width: pad * 2 + depths.length * width + (depths.length - 1) * columnGap,
    height: pad * 2 + fullHeight,
    columns: depths.map((depth) => ({
      depth,
      shards: byDepth.get(depth) ?? [],
    })),
  };
}

/** Shards that are on some line, for the page's picker (alphabetical). */
export function shardsOnLines(data: ShardData): ShardLink[] {
  const { graph, lines } = linesFor(data);
  const on = new Set<number>();
  for (const map of [lines.special, lines.id, lines.specialRev, lines.idRev])
    for (const key of map.keys()) on.add(key);
  return [...on]
    .flatMap((index) => {
      const shard = graph.shards[index];
      const found = shard ? data.catalog.get(shard.key) : undefined;
      return found ? [shardLink(data, found)] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Whether a shard (Hypixel ID) is on any fusion line. */
export function isOnLine(data: ShardData, id: string): boolean {
  const { graph, lines } = linesFor(data);
  const index = graph.index.get(id);
  if (index === undefined) return false;
  return [lines.special, lines.id, lines.specialRev, lines.idRev].some((map) =>
    map.has(index),
  );
}
