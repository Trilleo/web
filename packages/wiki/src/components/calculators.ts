/**
 * Calculators in the core set: `::: calculator` (inputs and formulas) and `::: costs`
 * (a table of levels with totals between two of them). The server renders them with
 * their defaults worked out; the browser script (client.ts) makes them live.
 */
import {
  computeCalculator,
  parseCalculator,
  parseCosts,
  scriptJson,
  sumCosts,
} from "../calculators";
import { FUNCTION_NAMES, formatNumber } from "../formula";
import type { BlockComponent } from "../types";

const CORE = "core";

const calculator: BlockComponent = {
  kind: "block",
  name: "calculator",
  set: CORE,
  summary:
    "Inputs readers change and results worked out from them with formulas: damage, costs, chances.",
  example: `::: calculator Damage per hit
input base: Base damage = 100
input strength: Strength = 50
input crit: Crit damage % = 80
result hit: Normal hit = base * (1 + strength / 100)
result critical: Critical hit = round(hit * (1 + crit / 100))
:::`,
  notes: [
    "`input name: Label = 100` gives readers a number to change.",
    "`result name: Label = formula` works one out, from inputs and earlier results.",
    `Formulas use + - * / % ^, brackets and ${FUNCTION_NAMES.join(", ")}; round(x, 2) keeps two decimals.`,
  ],
  render({ argument, body }, context) {
    const { spec, problems } = parseCalculator(body);
    if (problems.length > 0)
      return problems.map((problem) => context.error(problem)).join("");
    const values = computeCalculator(spec);
    const title = argument || "Calculator";
    const inputs = spec.inputs
      .map((input) => {
        const id = context.id("wiki-calc");
        return `<div class="wiki-calculator-input"><label for="${id}">${context.inline(input.label)}</label><input id="${id}" type="number" step="any" inputmode="decimal" value="${String(input.value)}" data-input="${context.escape(input.name)}" readonly></div>`;
      })
      .join("");
    const results = spec.results
      .map(
        (result) =>
          `<div class="wiki-calculator-result"><dt>${context.inline(result.label)}</dt><dd><output data-result="${context.escape(result.name)}">${formatNumber(values.get(result.name) ?? NaN)}</output></dd></div>`,
      )
      .join("");
    return `<section class="wiki-calculator" data-calculator aria-label="${context.escape(title)}"><p class="wiki-calculator-title">${context.inline(title)}</p>${inputs ? `<div class="wiki-calculator-inputs">${inputs}</div>` : ""}<dl class="wiki-calculator-results" aria-live="polite">${results}</dl><script type="application/json" data-calculator-spec>${scriptJson(spec)}</script></section>\n`;
  },
};

const costs: BlockComponent = {
  kind: "block",
  name: "costs",
  set: CORE,
  summary:
    "A table of levels or tiers and what each costs; readers pick where they are and where they're going, and see the total.",
  example: `::: costs Minion upgrades
columns: Coins, Wheat
Tier I: 0, 80
Tier II: 100, 160
Tier III: 400, 320
Tier IV: 1000, 640
:::`,
  notes: [
    "`columns:` names what's counted; each row is `Label: numbers`, in the columns' order.",
    "Write numbers without thousands commas (1000, or 1 000).",
  ],
  render({ argument, body }, context) {
    const { spec, problems } = parseCosts(body);
    if (problems.length > 0)
      return problems.map((problem) => context.error(problem)).join("");
    const title = argument || "Costs";
    const last = spec.rows.length - 1;
    const totals = sumCosts(spec, -1, last);
    const fromId = context.id("wiki-costs");
    const toId = context.id("wiki-costs");
    const options = (selected: number, withStart: boolean) =>
      [
        ...(withStart
          ? [
              `<option value="-1"${selected === -1 ? " selected" : ""}>The start</option>`,
            ]
          : []),
        ...spec.rows.map(
          (row, index) =>
            `<option value="${String(index)}"${index === selected ? " selected" : ""}>${context.escape(row.label)}</option>`,
        ),
      ].join("");
    const total = spec.columns
      .map(
        (column, index) =>
          `<div><dt>${context.inline(column)}</dt><dd data-costs-total="${String(index)}">${formatNumber(totals[index] ?? 0)}</dd></div>`,
      )
      .join("");
    const head = `<tr><th scope="col">Level</th>${spec.columns.map((column) => `<th scope="col">${context.inline(column)}</th>`).join("")}</tr>`;
    const rows = spec.rows
      .map(
        (row) =>
          `<tr><th scope="row">${context.inline(row.label)}</th>${spec.columns.map((_, index) => `<td>${formatNumber(row.values[index] ?? 0)}</td>`).join("")}</tr>`,
      )
      .join("");
    return `<section class="wiki-costs" data-costs aria-label="${context.escape(title)}"><p class="wiki-calculator-title">${context.inline(title)}</p><div class="wiki-costs-pick"><div class="wiki-calculator-input"><label for="${fromId}">From</label><select id="${fromId}" data-from disabled>${options(-1, true)}</select></div><div class="wiki-calculator-input"><label for="${toId}">To</label><select id="${toId}" data-to disabled>${options(last, false)}</select></div></div><dl class="wiki-calculator-results" aria-live="polite">${total}</dl><div class="table-scroll"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div><script type="application/json" data-costs-spec>${scriptJson(spec)}</script></section>\n`;
  },
};

export const CALCULATOR_COMPONENTS = [calculator, costs] as const;
