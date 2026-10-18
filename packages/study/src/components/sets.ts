/**
 * `::: venn`: Venn diagrams for events and sets. Each `shade:` line is a panel: the
 * region it names is shaded, so a few panels side by side show a law (De Morgan's)
 * or the parts of a union. Expressions are read by logic.ts (A ∪ B, AB, A − B, A′),
 * so the shading is worked out, never drawn by hand. Plain SVG: no JavaScript.
 */
import type { BlockComponent } from "@trilleo/wiki";
import {
  LogicError,
  assignments,
  evaluateLogic,
  logicVariables,
  parseLogic,
  setLatex,
  type LogicExpression,
} from "../logic";
import { STUDY_SET, nextNumber } from "./shared";

const WIDTH = 240;
const HEIGHT = 170;
/** Circle centres and radius for two and for three sets. */
const LAYOUTS: Record<number, { circles: [number, number][]; r: number }> = {
  1: { circles: [[120, 88]], r: 58 },
  2: {
    circles: [
      [95, 88],
      [145, 88],
    ],
    r: 56,
  },
  3: {
    circles: [
      [96, 70],
      [144, 70],
      [120, 112],
    ],
    r: 48,
  },
};
/** Where each set's letter goes: outside its circle, away from the others. */
const LABELS: Record<number, [number, number][]> = {
  1: [[60, 36]],
  2: [
    [38, 40],
    [202, 40],
  ],
  3: [
    [42, 32],
    [198, 32],
    [178, 158],
  ],
};

interface Panel {
  source: string;
  expression: LogicExpression;
}

function drawPanel(
  panel: Panel,
  sets: readonly string[],
  id: string,
  escape: (text: string) => string,
): string {
  const layout = LAYOUTS[sets.length] ?? LAYOUTS[2];
  if (!layout) return "";
  const circle = (index: number, extra = "") => {
    const [cx, cy] = layout.circles[index] ?? [0, 0];
    return `<circle cx="${String(cx)}" cy="${String(cy)}" r="${String(layout.r)}"${extra}/>`;
  };
  const defs: string[] = [];
  const shaded: string[] = [];
  sets.forEach((_, index) => {
    defs.push(
      `<clipPath id="${id}-in${String(index)}">${circle(index)}</clipPath>`,
    );
  });
  // Each cell of the diagram (one combination of in/out per set) that the
  // expression makes true: inside its sets (nested clips), outside the rest (a mask).
  assignments(sets).forEach((row, cell) => {
    if (!evaluateLogic(panel.expression, row)) return;
    const inside = sets.flatMap((name, index) => (row[name] ? [index] : []));
    const outside = sets.flatMap((name, index) => (row[name] ? [] : [index]));
    const maskId = `${id}-c${String(cell)}`;
    defs.push(
      `<mask id="${maskId}"><rect width="${String(WIDTH)}" height="${String(HEIGHT)}" fill="#fff"/>${outside.map((index) => circle(index, ' fill="#000"')).join("")}</mask>`,
    );
    let shape = `<rect x="6" y="6" width="${String(WIDTH - 12)}" height="${String(HEIGHT - 12)}"/>`;
    for (const index of inside)
      shape = `<g clip-path="url(#${id}-in${String(index)})">${shape}</g>`;
    shaded.push(`<g mask="url(#${maskId})">${shape}</g>`);
  });
  const labels = sets
    .map((name, index) => {
      const [x, y] = LABELS[sets.length]?.[index] ?? [0, 0];
      return `<text x="${String(x)}" y="${String(y)}" text-anchor="middle" class="venn-label">${escape(name)}</text>`;
    })
    .join("");
  return `<svg class="study-venn-svg" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" aria-hidden="true"><defs>${defs.join("")}</defs><g class="venn-shade">${shaded.join("")}</g><rect x="6" y="6" width="${String(WIDTH - 12)}" height="${String(HEIGHT - 12)}" class="venn-line"/>${sets.map((_, index) => circle(index, ' class="venn-line"')).join("")}${labels}<text x="${String(WIDTH - 14)}" y="24" text-anchor="end" class="venn-label venn-omega">Ω</text></svg>`;
}

/** Which of the 2ⁿ cells a panel shades, in words (for screen readers). */
function describeCells(panel: Panel, sets: readonly string[]): string {
  const cells = assignments(sets).filter((row) =>
    evaluateLogic(panel.expression, row),
  );
  if (cells.length === 0) return "nothing shaded";
  if (cells.length === 2 ** sets.length) return "everything shaded";
  return `shaded: ${cells
    .map((row) =>
      sets.every((name) => !row[name])
        ? `outside ${sets.join(" and ")}`
        : sets
            .map((name) => (row[name] ? `in ${name}` : `not in ${name}`))
            .join(", "),
    )
    .join("; ")}`;
}

const venn: BlockComponent = {
  kind: "block",
  name: "venn",
  set: STUDY_SET,
  summary:
    "Venn diagrams of events: each shade: line is a panel with that region shaded (A ∪ B, AB, A − B, A′).",
  example: `::: venn De Morgan's law
shade: (A ∪ B)'
shade: A'B'
:::`,
  notes: [
    "shade: an event in A, B, C (up to 3 sets): ∪ or + (union), ∩, · or side by side (intersection), A − B (difference: bracket a longer right side, A − (BC)), A' (complement), Ω and ∅. Up to 4 panels.",
    "sets: A B C fixes which circles are drawn (otherwise the letters the panels use).",
  ],
  render({ argument, body }, context) {
    const panels: Panel[] = [];
    let sets: string[] | null = null;
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (line === "" || line.startsWith("#")) continue;
      const field = /^(shade|sets):\s*(.*)$/.exec(line);
      if (!field)
        return context.error(
          `“${line}” isn't part of a Venn diagram (shade: A ∪ B, or sets: A B C).`,
        );
      const value = field[2] ?? "";
      if (field[1] === "sets") {
        sets = value.split(/[\s,]+/).filter(Boolean);
        if (sets.some((name) => !/^[A-Z]$/.test(name)))
          return context.error("sets: takes capital letters, like A B C.");
        continue;
      }
      try {
        panels.push({ source: value, expression: parseLogic(value) });
      } catch (error) {
        return context.error(
          `“${value}” can't be read: ${error instanceof LogicError ? error.message : "it's invalid"}`,
        );
      }
    }
    if (panels.length === 0)
      return context.error("Shade something: shade: A ∪ B.");
    if (panels.length > 4)
      return context.error("A Venn figure has at most 4 panels.");
    const used = [
      ...new Set(panels.flatMap((panel) => logicVariables(panel.expression))),
    ].sort();
    const drawn = sets ?? (used.length === 0 ? ["A"] : used);
    const missing = used.filter((name) => !drawn.includes(name));
    if (missing.length > 0)
      return context.error(
        `sets: doesn't include ${missing.join(", ")}, which a panel uses.`,
      );
    if (drawn.length > 3)
      return context.error("A Venn diagram draws at most 3 sets.");
    const number = nextNumber(context, "figure");
    const title = argument.trim();
    const figures = panels
      .map((panel) => {
        const id = context.id("venn");
        const latex = setLatex(panel.expression);
        return `<figure class="study-venn-panel" role="img" aria-label="${context.escape(`${panel.source}: ${describeCells(panel, drawn)}`)}">${drawPanel(panel, drawn, id, (text) => context.escape(text))}<figcaption>${context.inline(`$${latex}$`)}</figcaption></figure>`;
      })
      .join("");
    return `<figure class="study-figure study-venn"><div class="study-venn-panels">${figures}</div><figcaption><span class="study-box-kind">Figure ${number}</span> ${title ? context.inline(title) : "Venn diagram"}</figcaption></figure>\n`;
  },
};

export const SET_COMPONENTS = [venn] as const;
