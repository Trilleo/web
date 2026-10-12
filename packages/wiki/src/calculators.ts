/**
 * What the calculator components read from their blocks, and what they compute. Pure,
 * shared by the server (the defaults, rendered into the page) and the browser (as
 * readers change inputs): the same code gives the same numbers on both.
 */
import {
  evaluateFormula,
  formatNumber,
  formulaNames,
  parseFormula,
  FormulaError,
  type Formula,
} from "./formula";
import type { MaterialNode, MaterialsResult } from "./minecraft/recipes";
import { escapeHtml } from "./syntax";

export interface CalculatorSpec {
  inputs: { name: string; label: string; value: number }[];
  results: { name: string; label: string; formula: string }[];
}

// The rest is trimmed where it's used: a \s* before it would backtrack.
const LINE = /^(input|result)\s+([a-z_][a-z0-9_]*)\s*:(.+)$/i;

/** `input name: Label = 100` and `result name: Label = formula` lines. */
export function parseCalculator(body: string): {
  spec: CalculatorSpec;
  problems: string[];
} {
  const spec: CalculatorSpec = { inputs: [], results: [] };
  const problems: string[] = [];
  const known = new Set<string>();
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const match = LINE.exec(line);
    const rest = match?.[3] ?? "";
    const equals = rest.lastIndexOf("=");
    if (!match?.[1] || !match[2] || equals === -1) {
      problems.push(
        `“${line}” isn't \`input name: Label = 10\` or \`result name: Label = formula\`.`,
      );
      continue;
    }
    const name = match[2].toLowerCase();
    const label = rest.slice(0, equals).trim() || name;
    const value = rest.slice(equals + 1).trim();
    if (known.has(name)) {
      problems.push(`“${name}” is used twice.`);
      continue;
    }
    if (match[1].toLowerCase() === "input") {
      const number = Number(value.replace(/[\s_]/g, ""));
      if (!Number.isFinite(number)) {
        problems.push(`Input “${name}” needs a number after =.`);
        continue;
      }
      spec.inputs.push({ name, label, value: number });
    } else {
      try {
        const unknown = [...formulaNames(parseFormula(value))].filter(
          (used) => !known.has(used),
        );
        if (unknown.length > 0) {
          problems.push(
            `Result “${name}” uses ${unknown.map((n) => `“${n}”`).join(", ")}, which ${unknown.length === 1 ? "isn't an input or an earlier result" : "aren't inputs or earlier results"}.`,
          );
          continue;
        }
      } catch (error) {
        problems.push(
          `Result “${name}”: ${error instanceof FormulaError ? error.message : "the formula can't be read."}`,
        );
        continue;
      }
      spec.results.push({ name, label, formula: value });
    }
    known.add(name);
  }
  if (spec.results.length === 0)
    problems.push("Add at least one `result` line.");
  return { spec, problems };
}

/** Every result, in order, from the inputs' values (missing ones take their defaults). */
export function computeCalculator(
  spec: CalculatorSpec,
  given: ReadonlyMap<string, number> = new Map(),
  parsed = new Map<string, Formula>(),
): Map<string, number> {
  const values = new Map<string, number>();
  for (const input of spec.inputs)
    values.set(input.name, given.get(input.name) ?? input.value);
  for (const result of spec.results) {
    let formula = parsed.get(result.name);
    if (!formula) {
      formula = parseFormula(result.formula);
      parsed.set(result.name, formula);
    }
    values.set(result.name, evaluateFormula(formula, values));
  }
  return values;
}

export interface CostsSpec {
  columns: string[];
  rows: { label: string; values: number[] }[];
}

/** `columns: A, B` then `Label: 1, 2` rows (numbers without thousands commas). */
export function parseCosts(body: string): {
  spec: CostsSpec;
  problems: string[];
} {
  const spec: CostsSpec = { columns: [], rows: [] };
  const problems: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      problems.push(`“${line}” isn't \`Label: 1, 2\`.`);
      continue;
    }
    const label = line.slice(0, colon).trim();
    const cells = line
      .slice(colon + 1)
      .split(",")
      .map((cell) => cell.trim());
    if (label.toLowerCase() === "columns") {
      spec.columns = cells.filter(Boolean);
      continue;
    }
    const values = cells.map((cell) =>
      cell === "" ? 0 : Number(cell.replace(/[\s_]/g, "")),
    );
    if (values.some((value) => !Number.isFinite(value))) {
      problems.push(
        `Row “${label}” has something that isn't a number (write 1000, not 1,000).`,
      );
      continue;
    }
    spec.rows.push({ label, values });
  }
  if (spec.columns.length === 0)
    problems.push("Name the columns: `columns: Coins, Wheat`.");
  if (spec.rows.length === 0) problems.push("Add rows: `Tier II: 100, 160`.");
  for (const row of spec.rows)
    if (row.values.length > spec.columns.length)
      problems.push(
        `Row “${row.label}” has more numbers than there are columns.`,
      );
  return { spec, problems };
}

/**
 * What it costs to go from just after row `from` (−1: from the start) to row `to`,
 * both indexes into the rows: the rows in between added up, column by column.
 */
export function sumCosts(spec: CostsSpec, from: number, to: number): number[] {
  const totals = spec.columns.map(() => 0);
  for (let i = from + 1; i <= to; i += 1)
    spec.rows[i]?.values.forEach((value, column) => {
      totals[column] = (totals[column] ?? 0) + value;
    });
  return totals;
}

/** Where a materials tree's items link, and what they're called, by key. */
export type ItemLinks = Readonly<
  Record<string, { name: string; href: string }>
>;

function itemLink(
  node: Pick<MaterialNode, "key" | "name">,
  links: ItemLinks,
): string {
  const link = links[node.key];
  const name = escapeHtml(link?.name ?? node.name);
  return link ? `<a href="${escapeHtml(link.href)}">${name}</a>` : name;
}

function nodeHtml(node: MaterialNode, links: ItemLinks): string {
  const how =
    node.crafts > 0
      ? ` <span class="wiki-materials-how">${formatNumber(node.crafts)} × ${escapeHtml(node.station ?? "")}${node.makes > 1 ? `, ${formatNumber(node.makes)} each` : ""}</span>`
      : node.loop
        ? ' <span class="wiki-materials-how">(its recipe needs itself)</span>'
        : "";
  const children =
    node.children.length > 0
      ? `<ul>${node.children.map((child) => nodeHtml(child, links)).join("")}</ul>`
      : "";
  return `<li><span class="wiki-materials-count">${formatNumber(node.count)} ×</span> ${itemLink(node, links)}${how}${children}</li>`;
}

/** The tree and the totals of raw materials, as the calculator shows them. */
export function materialsHtml(
  result: MaterialsResult,
  links: ItemLinks,
): {
  tree: string;
  totals: string;
} {
  const raw = [...result.raw.entries()].sort((a, b) => b[1].count - a[1].count);
  return {
    tree: `<ul class="wiki-materials-tree">${nodeHtml(result.tree, links)}</ul>`,
    totals:
      raw.length === 0
        ? "<p>Nothing: you have it all.</p>"
        : `<ul class="wiki-materials-totals">${raw
            .map(
              ([key, ingredient]) =>
                `<li><span class="wiki-materials-count">${formatNumber(ingredient.count)} ×</span> ${itemLink({ key, name: ingredient.name }, links)}</li>`,
            )
            .join("")}</ul>`,
  };
}

/** JSON for a script data block: `<` escaped, so nothing in it can close the tag. */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
