/**
 * A plan to copy: as plain text, or in the formats the SkyOcean, NoFrills and SkyHanni
 * mods read (SkyShards' src/components/results/treeExport.ts). A mod format is a
 * versioned prefix and gzipped JSON in base64; `modPayload` gives the prefix and the
 * JSON, and the browser gzips it (CompressionStream), so this stays pure.
 */
import type { Graph } from "./graph";
import type { Plan, PlanNode } from "./plan";

export const MOD_FORMATS = ["skyocean", "nofrills", "skyhanni"] as const;
export type ModFormat = (typeof MOD_FORMATS)[number];

export const MOD_LABELS: Readonly<Record<ModFormat, string>> = {
  skyocean: "SkyOcean",
  nofrills: "NoFrills",
  skyhanni: "SkyHanni",
};

const PREFIX: Readonly<Record<ModFormat, string>> = {
  skyocean: "<SkyOceanRecipe>(V2):",
  nofrills: "<NoFrillsRecipe>(V1):",
  skyhanni: "<SkyHanniRecipe>(V1):",
};

type SkyOceanNode =
  | { shard: string; method: "direct"; quantity: number }
  | {
      shard: string;
      method: "cycle";
      quantity: number;
      craftsExpected: number;
      outputQuantity: number;
      pureReptile: number;
      steps: { shard: string; inputs: [string, string] }[];
      inputRecipe?: SkyOceanNode;
      cycleInputs: SkyOceanNode[];
    }
  | {
      shard: string;
      method: "recipe";
      quantity: number;
      craftsExpected: number;
      outputQuantity: number;
      pureReptile: number;
      inputs: SkyOceanNode[];
    };

/** SkyOcean names shards by SkyShards' keys ("C1"). */
function skyOcean(graph: Graph, node: PlanNode): SkyOceanNode {
  const key = (index: number) => graph.shards[index]?.key ?? "";
  if (node.kind === "hunt")
    return {
      shard: key(node.shard),
      method: "direct",
      quantity: node.quantity,
    };
  if (node.kind === "owned")
    return {
      shard: key(node.shard),
      method: "direct",
      quantity: node.quantity,
    };
  if (node.kind === "split") {
    // SkyOcean has no splits; plans with held shards don't offer it (`modFormatsFor`).
    const main =
      node.parts.find((part) => part.kind !== "owned") ?? node.parts[0];
    return main
      ? { ...skyOcean(graph, main), quantity: node.quantity }
      : { shard: key(node.shard), method: "direct", quantity: node.quantity };
  }
  if (node.kind === "cycle") {
    const outputQuantity = node.steps[0]?.recipe.quantity ?? 1;
    return {
      shard: key(node.shard),
      method: "cycle",
      quantity: node.quantity,
      craftsExpected: node.crafts,
      outputQuantity,
      pureReptile: node.quantity / outputQuantity,
      steps: node.steps.map((step) => ({
        shard: key(step.output),
        inputs: [key(step.recipe.a), key(step.recipe.b)],
      })),
      inputRecipe: skyOcean(graph, node.entry),
      cycleInputs: node.inputs.map((input) => skyOcean(graph, input)),
    };
  }
  const outputQuantity = node.recipe.quantity;
  return {
    shard: key(node.shard),
    method: "recipe",
    quantity: node.quantity,
    craftsExpected: node.crafts,
    outputQuantity,
    pureReptile:
      (node.quantity - node.crafts * outputQuantity) / outputQuantity,
    inputs: node.inputs.map((input) => skyOcean(graph, input)),
  };
}

/** Every node's quantity summed by a key (null skips the node). */
function sumNodes(
  tree: PlanNode,
  keyOf: (node: PlanNode) => string | null,
): Map<string, number> {
  const totals = new Map<string, number>();
  const visit = (node: PlanNode) => {
    const key = keyOf(node);
    if (key !== null) totals.set(key, (totals.get(key) ?? 0) + node.quantity);
    if (node.kind === "fuse") node.inputs.forEach(visit);
    else if (node.kind === "split") node.parts.forEach(visit);
    else if (node.kind === "cycle") {
      visit(node.entry);
      node.inputs.forEach(visit);
    }
  };
  visit(tree);
  return totals;
}

const SOURCE = {
  hunt: "Direct",
  owned: "Direct",
  fuse: "Fuse",
  cycle: "Cycle",
  split: null,
} as const;

/**
 * The mod formats a plan can go to: SkyOcean's tree can't show shards taken from what
 * you hold, so plans using held shards offer the lists only.
 */
export function modFormatsFor(plan: Plan): readonly ModFormat[] {
  return plan.used && plan.used.size > 0
    ? MOD_FORMATS.filter((format) => format !== "skyocean")
    : MOD_FORMATS;
}

/** The mod's prefix and the JSON to gzip after it. */
export function modPayload(
  graph: Graph,
  plan: Plan,
  format: ModFormat,
): { prefix: string; json: string } {
  const name = (index: number) => graph.shards[index]?.name ?? "";
  let payload: unknown;
  if (format === "skyocean") payload = skyOcean(graph, plan.tree);
  else if (format === "nofrills") {
    payload = [
      ...sumNodes(plan.tree, (node) => {
        const source = SOURCE[node.kind];
        return source === null ? null : `${String(node.shard)}|${source}`;
      }),
    ].map(([key, needed]) => {
      const [shard = "0", source = "Direct"] = key.split("|");
      return { name: name(Number(shard)), needed, source };
    });
  } else {
    payload = [
      ...sumNodes(plan.tree, (node) =>
        node.kind === "hunt" ? String(node.shard) : null,
      ),
    ].map(([shard, needed]) => ({ name: name(Number(shard)), needed }));
  }
  return { prefix: PREFIX[format], json: JSON.stringify(payload) };
}

const formatNumber = (n: number) =>
  Number.isInteger(n)
    ? n.toLocaleString("en")
    : n.toLocaleString("en", { maximumFractionDigits: 2 });

/** The tree as indented text lines ("Fuse 12× Tiamat: 5 Caiman + 2 Ghost"). */
export function planText(graph: Graph, plan: Plan): string {
  const name = (index: number) => graph.shards[index]?.name ?? "?";
  const lines: string[] = [
    `${formatNumber(plan.quantity)} ${name(plan.target)}: ${formatNumber(plan.crafts)} fusions`,
  ];
  const visit = (node: PlanNode, depth: number) => {
    const pad = "  ".repeat(depth);
    if (node.kind === "hunt") {
      lines.push(
        `${pad}${graph.mode === "coins" ? "Buy" : "Hunt"} ${formatNumber(node.quantity)} ${name(node.shard)}`,
      );
    } else if (node.kind === "owned") {
      lines.push(
        `${pad}Use ${formatNumber(node.quantity)} ${name(node.shard)} you have`,
      );
    } else if (node.kind === "split") {
      node.parts.forEach((part) => {
        visit(part, depth);
      });
    } else if (node.kind === "fuse") {
      const fuse = (index: number) => graph.shards[index]?.fuse ?? 1;
      lines.push(
        `${pad}Fuse ${formatNumber(node.quantity)} ${name(node.shard)} (${formatNumber(node.crafts)}× ${String(fuse(node.recipe.a))} ${name(node.recipe.a)} + ${String(fuse(node.recipe.b))} ${name(node.recipe.b)})`,
      );
      node.inputs.forEach((input) => {
        visit(input, depth + 1);
      });
    } else {
      lines.push(
        `${pad}Loop for ${formatNumber(node.quantity)} ${name(node.shard)} (${formatNumber(node.crafts)} fusions: ${node.steps.map((step) => `${name(step.output)} = ${name(step.recipe.a)} + ${name(step.recipe.b)}`).join("; ")})`,
      );
      lines.push(`${pad}  To start:`);
      visit(node.entry, depth + 2);
      node.inputs.forEach((input) => {
        visit(input, depth + 1);
      });
    }
  };
  visit(plan.tree, 1);
  return lines.join("\n");
}
