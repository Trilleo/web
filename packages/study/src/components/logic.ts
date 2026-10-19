/**
 * Digital-logic components: `::: logic` (a lab: switch the inputs, watch the outputs,
 * with the truth table), `::: kmap` (a Karnaugh map drawn from its minterms, with
 * groups written as product terms and checked), and `::: gates` (gate symbols in
 * both the national-standard rectangular and the distinctive shapes).
 */
import type { BlockComponent } from "@trilleo/wiki";
import {
  LogicError,
  assignments,
  evaluateLogic,
  grayCode,
  logicLatex,
  logicVariables,
  mintermsOf,
  parseLogic,
  type LogicExpression,
} from "../logic";
import type { LogicProps } from "../types";
import { STUDY_SET, island, nextNumber } from "./shared";

const NAME = /^[A-Za-z]\d*$/;

interface LogicSpec {
  inputs: string[];
  outputs: { name: string; source: string; expression: LogicExpression }[];
}

/** `inputs: A B C` and `Y = …` lines. */
export function parseLogicSpec(body: string): {
  spec: LogicSpec;
  errors: string[];
} {
  const errors: string[] = [];
  let inputs: string[] | null = null;
  const outputs: LogicSpec["outputs"] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("inputs:")) {
      inputs = line
        .slice(7)
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean);
      const bad = inputs.find((name) => !NAME.test(name));
      if (bad)
        errors.push(
          `“${bad}” isn't an input name (one letter, then digits if you like: A, D0).`,
        );
      continue;
    }
    const equals = line.indexOf("=");
    const name = line.slice(0, equals).trim();
    if (equals < 1 || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      errors.push(`“${line}” isn't an output (write it as Y = A B' + A' B).`);
      continue;
    }
    const source = line.slice(equals + 1).trim();
    try {
      outputs.push({ name, source, expression: parseLogic(source) });
    } catch (error) {
      errors.push(
        `${name}: ${error instanceof LogicError ? error.message : "it can't be read"}`,
      );
    }
  }
  const used = [
    ...new Set(outputs.flatMap((output) => logicVariables(output.expression))),
  ].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const chosen = inputs ?? used;
  const missing = used.filter((name) => !chosen.includes(name));
  if (missing.length > 0)
    errors.push(
      `The outputs use ${missing.join(", ")}, which aren't among the inputs.`,
    );
  if (outputs.length === 0) errors.push("There are no outputs (like Y = A B).");
  if (chosen.length > 6)
    errors.push("At most 6 inputs (a 64-row truth table).");
  return { spec: { inputs: chosen, outputs }, errors };
}

const logic: BlockComponent = {
  kind: "block",
  name: "logic",
  set: STUDY_SET,
  summary:
    "A logic lab: switch the inputs on and off, watch the outputs, and see the whole truth table.",
  example: `::: logic Exclusive OR from basic gates
inputs: A B
Y = A B' + A' B
Z = A ⊕ B
:::`,
  notes: [
    "Outputs are “Name = expression”; inputs: lists the inputs in order (left out: every letter used, A–Z).",
    "Write NOT as A' (or !A), AND by writing terms side by side (or A·B), OR as +, XOR as ⊕ (or ^), XNOR as ⊙.",
  ],
  render({ argument, body }, context) {
    const { spec, errors } = parseLogicSpec(body);
    if (errors.length > 0) return context.error(errors.join(" "));
    const number = nextNumber(context, "figure");
    const props: Omit<LogicProps, "id"> = {
      title: argument || "Try it",
      label: `Figure ${number}`,
      inputs: spec.inputs,
      outputs: spec.outputs.map((output) => ({
        name: output.name,
        source: output.source,
        html: context.inline(
          `$${output.name} = ${logicLatex(output.expression)}$`,
        ),
      })),
    };
    return island(context, { name: "logic", props });
  },
};

function numbers(text: string): number[] | null {
  const parts = text
    .replace(/^m\s*\(|^d\s*\(|\)$/g, "")
    .split(/[\s,]+/)
    .filter(Boolean);
  const values = parts.map(Number);
  return values.every((value) => Number.isInteger(value) && value >= 0)
    ? values
    : null;
}

const GROUP_TAGS = "abcdefgh";

const kmap: BlockComponent = {
  kind: "block",
  name: "kmap",
  set: STUDY_SET,
  summary:
    "A Karnaugh map (卡诺图) drawn from its minterms, with its groups and the simplified expression.",
  example: `::: kmap Y
vars: A B C D
ones: 0 2 5 7 8 10 13 15
group: B D
group: B' D'
:::`,
  notes: [
    "vars: 2 to 4 variables, most significant first; rows take the first half, columns the rest, in Gray-code order.",
    "ones: the minterm numbers where the function is 1 (or expression: A B' + C to work them out); dont-care: the ×s.",
    "Each group: is a product term (B D'); the map checks it only covers 1s and ×s, and the groups' terms make the result.",
  ],
  render({ argument, body }, context) {
    let variables: string[] = [];
    let ones: number[] = [];
    let dontCares: number[] = [];
    const groups: { source: string; expression: LogicExpression }[] = [];
    let expressionSource: string | null = null;
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (line === "") continue;
      const colon = line.indexOf(":");
      const key = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      if (key === "vars") variables = value.split(/[\s,]+/).filter(Boolean);
      else if (key === "ones" || key === "dont-care") {
        const list = numbers(value);
        if (!list)
          return context.error(`“${line}”: list minterm numbers, like 0 2 5.`);
        if (key === "ones") ones = list;
        else dontCares = list;
      } else if (key === "expression") expressionSource = value;
      else if (key === "group") {
        try {
          groups.push({ source: value, expression: parseLogic(value) });
        } catch (error) {
          return context.error(
            `group ${value}: ${error instanceof LogicError ? error.message : "it can't be read"}`,
          );
        }
      } else
        return context.error(
          `“${line}” isn't part of a map (vars:, ones:, dont-care:, expression:, group:).`,
        );
    }
    if (
      variables.length < 2 ||
      variables.length > 4 ||
      variables.some((name) => !NAME.test(name))
    )
      return context.error("vars: takes 2 to 4 variable names, like A B C D.");
    const size = 2 ** variables.length;
    if (expressionSource !== null) {
      try {
        ones = mintermsOf(parseLogic(expressionSource), variables);
      } catch (error) {
        return context.error(
          `expression: ${error instanceof LogicError ? error.message : "it can't be read"}`,
        );
      }
    }
    const outOfRange = [...ones, ...dontCares].find((value) => value >= size);
    if (outOfRange !== undefined)
      return context.error(
        `Minterm ${String(outOfRange)} is too big for ${String(variables.length)} variables.`,
      );
    const covered: number[][] = [];
    for (const group of groups) {
      const extra = logicVariables(group.expression).filter(
        (name) => !variables.includes(name),
      );
      if (extra.length > 0)
        return context.error(
          `group ${group.source} uses ${extra.join(", ")}, which isn't a map variable.`,
        );
      const cells = mintermsOf(group.expression, variables);
      const wrong = cells.filter(
        (cell) => !ones.includes(cell) && !dontCares.includes(cell),
      );
      if (wrong.length > 0)
        return context.error(
          `group ${group.source} covers m${wrong.join(", m")}, which ${wrong.length === 1 ? "is" : "are"} 0.`,
        );
      if (!cells.some((cell) => ones.includes(cell)))
        return context.error(
          `group ${group.source} covers only don't-cares: leave it out.`,
        );
      covered.push(cells);
    }
    const uncovered =
      groups.length > 0
        ? ones.filter((cell) => !covered.some((cells) => cells.includes(cell)))
        : [];
    if (uncovered.length > 0)
      return context.error(
        `The groups leave m${uncovered.join(", m")} uncovered.`,
      );

    const rowBits = Math.floor(variables.length / 2);
    const colBits = variables.length - rowBits;
    const rowVars = variables.slice(0, rowBits);
    const colVars = variables.slice(rowBits);
    const rows = grayCode(rowBits);
    const cols = grayCode(colBits);
    const name = argument.trim() || "Y";
    const varLatex = (names: string[]) =>
      names.map((n) => n.replace(/^([A-Za-z])(\d+)$/, "$1_{$2}")).join("");
    // A plain cell: it labels both headers at once, so it isn't a column header.
    const corner = `<td class="study-kmap-corner">${context.inline(`$${varLatex(rowVars)}\\backslash ${varLatex(colVars)}$`)}</td>`;
    const head = `<tr>${corner}${cols.map((code) => `<th scope="col">${code}</th>`).join("")}</tr>`;
    const body2 = rows
      .map((rowCode) => {
        const cells = cols
          .map((colCode) => {
            const minterm = parseInt(rowCode + colCode, 2);
            const value = ones.includes(minterm)
              ? "1"
              : dontCares.includes(minterm)
                ? "×"
                : "0";
            const tags = covered
              .map((cells2, index) =>
                cells2.includes(minterm) ? (GROUP_TAGS[index] ?? "") : "",
              )
              .join("");
            return `<td data-value="${value === "×" ? "x" : value}"${tags ? ` data-grouped=""` : ""}><span class="study-kmap-value">${value}</span><span class="study-kmap-m">m${String(minterm)}</span>${tags ? `<span class="study-kmap-tags" aria-label="in group${tags.length > 1 ? "s" : ""} ${tags.split("").join(", ")}">${tags}</span>` : ""}</td>`;
          })
          .join("");
        return `<tr><th scope="row">${rowCode}</th>${cells}</tr>`;
      })
      .join("");
    const number = nextNumber(context, "figure");
    const legend =
      groups.length > 0
        ? `<ul class="study-kmap-groups">${groups
            .map(
              (group, index) =>
                `<li><span class="study-kmap-tag">${GROUP_TAGS[index] ?? ""}</span> ${context.inline(`$${logicLatex(group.expression)}$`)} <span class="study-muted">covers m${covered[index]?.join(", m") ?? ""}</span></li>`,
            )
            .join("")}</ul><p class="study-kmap-result">${context.inline(
            `$${name} = ${groups.map((group) => logicLatex(group.expression)).join(" + ")}$`,
          )}</p>`
        : "";
    const description = `Karnaugh map of ${name}(${variables.join(", ")}): 1 at m${ones.join(", m") || " none"}${dontCares.length ? `; don't-care at m${dontCares.join(", m")}` : ""}.`;
    return `<figure class="study-figure study-kmap"><div class="study-table" tabindex="0" role="group" aria-label="${context.escape(description)}"><table><caption class="sr-only">${context.escape(description)}</caption><thead>${head}</thead><tbody>${body2}</tbody></table></div>${legend}<figcaption><span class="study-box-kind">Figure ${number}</span> Karnaugh map of ${context.inline(`$${name}$`)}</figcaption></figure>\n`;
  },
};

// Gate symbols. Each is drawn in a 120 × 60 box, inputs on the left, output on the right.
const GATES = {
  and: { label: "AND", zh: "与", mark: "&", bubble: false, expression: "A B" },
  or: { label: "OR", zh: "或", mark: "≥1", bubble: false, expression: "A + B" },
  not: { label: "NOT", zh: "非", mark: "1", bubble: true, expression: "A'" },
  nand: {
    label: "NAND",
    zh: "与非",
    mark: "&",
    bubble: true,
    expression: "(A B)'",
  },
  nor: {
    label: "NOR",
    zh: "或非",
    mark: "≥1",
    bubble: true,
    expression: "(A + B)'",
  },
  xor: {
    label: "XOR",
    zh: "异或",
    mark: "=1",
    bubble: false,
    expression: "A ⊕ B",
  },
  xnor: {
    label: "XNOR",
    zh: "同或",
    mark: "=",
    bubble: false,
    expression: "A ⊙ B",
  },
} as const;
type GateName = keyof typeof GATES;

function svg(content: string, label: string): string {
  return `<svg class="study-gate" viewBox="0 0 120 60" width="120" height="60" role="img" aria-label="${label}">${content}</svg>`;
}

function rectangularGate(name: GateName): string {
  const gate = GATES[name];
  const inputs = name === "not" ? [30] : [18, 42];
  const outEnd = gate.bubble ? 86 : 80;
  return svg(
    `${inputs.map((y) => `<line x1="10" y1="${String(y)}" x2="40" y2="${String(y)}"/>`).join("")}<rect x="40" y="8" width="40" height="44" class="sc-body"/><text x="60" y="26" text-anchor="middle" class="study-gate-mark">${gate.mark}</text>${gate.bubble ? `<circle cx="83" cy="30" r="3" class="sc-body"/>` : ""}<line x1="${String(outEnd)}" y1="30" x2="110" y2="30"/>`,
    `${gate.label} gate, national standard (rectangular) symbol`,
  );
}

function distinctiveGate(name: GateName): string {
  const gate = GATES[name];
  const parts: string[] = [];
  let tip: number;
  if (name === "not") {
    parts.push(
      `<line x1="10" y1="30" x2="40" y2="30"/><path d="M40 12 L40 48 L76 30 Z" class="sc-body"/>`,
    );
    tip = 76;
  } else if (name === "and" || name === "nand") {
    parts.push(
      `<line x1="10" y1="18" x2="40" y2="18"/><line x1="10" y1="42" x2="40" y2="42"/><path d="M40 8 L60 8 A22 22 0 0 1 60 52 L40 52 Z" class="sc-body"/>`,
    );
    tip = 82;
  } else {
    const shift = name === "xor" || name === "xnor" ? 6 : 0;
    parts.push(
      `<line x1="10" y1="18" x2="${String(44 + shift)}" y2="18"/><line x1="10" y1="42" x2="${String(44 + shift)}" y2="42"/><path d="M${String(36 + shift)} 8 Q${String(52 + shift)} 30 ${String(36 + shift)} 52 Q${String(70 + shift)} 52 ${String(84 + shift)} 30 Q${String(70 + shift)} 8 ${String(36 + shift)} 8 Z" class="sc-body"/>`,
    );
    if (shift) parts.push(`<path d="M36 8 Q52 30 36 52" class="sc-line"/>`);
    tip = 84 + shift;
  }
  const bubble = gate.bubble || name === "xnor";
  if (bubble)
    parts.push(
      `<circle cx="${String(tip + 3)}" cy="30" r="3" class="sc-body"/>`,
    );
  parts.push(
    `<line x1="${String(tip + (bubble ? 6 : 0))}" y1="30" x2="112" y2="30"/>`,
  );
  return svg(parts.join(""), `${gate.label} gate, distinctive-shape symbol`);
}

const gates: BlockComponent = {
  kind: "block",
  name: "gates",
  set: STUDY_SET,
  summary:
    "Logic gates side by side: the national-standard (rectangular) and distinctive symbols, the expression and the truth table.",
  example: `::: gates
and or not
:::`,
  notes: [
    `Gates: ${Object.keys(GATES).join(", ")} (any of them, in your order).`,
  ],
  render({ body }, context) {
    const names = body.split(/[\s,]+/).filter(Boolean);
    const unknown = names.find((name) => !(name in GATES));
    if (unknown)
      return context.error(
        `“${unknown}” isn't a gate (${Object.keys(GATES).join(", ")}).`,
      );
    if (names.length === 0)
      return context.error("Name some gates, like: and or not.");
    const rows = (names as GateName[]).map((name) => {
      const gate = GATES[name];
      const expression = parseLogic(gate.expression);
      const variables = name === "not" ? ["A"] : ["A", "B"];
      const table = assignments(variables)
        .map(
          (row) =>
            `${variables.map((v) => String(row[v] ?? 0)).join("")}→${String(evaluateLogic(expression, row))}`,
        )
        .join(" ");
      return `<tr><th scope="row">${gate.label} <span class="study-zh" lang="zh-CN">${gate.zh}</span></th><td>${rectangularGate(name)}</td><td>${distinctiveGate(name)}</td><td>${context.inline(`$Y = ${logicLatex(expression)}$`)}</td><td class="study-gate-table">${context.escape(table)}</td></tr>`;
    });
    return `<div class="study-table study-gates" tabindex="0" role="group" aria-label="Logic gate symbols"><table><thead><tr><th scope="col">Gate</th><th scope="col">National standard</th><th scope="col">Distinctive shape</th><th scope="col">Expression</th><th scope="col">Truth table (inputs→Y)</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>\n`;
  },
};

export const LOGIC_COMPONENTS = [logic, kmap, gates] as const;
