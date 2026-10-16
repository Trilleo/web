/**
 * Draws a circuit as an SVG schematic, in the style of Chinese (GB/IEC) textbooks:
 * resistors are boxes, sources are circles. Lines and text use currentColor, so the
 * page's colours (both themes) apply; class names let the stylesheet set the type.
 * Pure string building: the server draws static circuits, the simulator redraws
 * with its readings.
 */
import { escapeHtml } from "../escape";
import { formatQuantity } from "../units";
import {
  ELEMENT_NAMES,
  ELEMENT_UNITS,
  pointKey,
  type Circuit,
  type Point,
} from "./parse";
import { connectivity } from "./solve";

/** Pixels per grid square (in the drawing's own units). */
export const GRID = 40;
/** Shown this much larger than drawn (the SVG scales; phones shrink it to fit). */
const DISPLAY_SCALE = 1.4;
const PAD = 44;
const BODY = 20; // half the symbol's length

export interface DrawOptions {
  /** Read out by screen readers (with a list of the parts). */
  title: string;
  /** Unique on the page: the title's id. */
  id: string;
  /** Text at points (the simulator's node voltages). */
  notes?: readonly { at: Point; text: string }[];
  /** Values to show instead of the written ones, by part name. */
  values?: Readonly<Record<string, number>>;
}

const round = (n: number) => Math.round(n * 10) / 10;

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  extra = "",
): string {
  return `<line x1="${String(round(x1))}" y1="${String(round(y1))}" x2="${String(round(x2))}" y2="${String(round(y2))}"${extra}/>`;
}

function text(
  x: number,
  y: number,
  content: string,
  anchor: string,
  className: string,
): string {
  return `<text x="${String(round(x))}" y="${String(round(y))}" text-anchor="${anchor}" class="${className}">${escapeHtml(content)}</text>`;
}

export function circuitSize(circuit: Circuit): {
  width: number;
  height: number;
  minX: number;
  minY: number;
} {
  const points = [
    ...circuit.elements.flatMap((element) => [element.from, element.to]),
    ...circuit.wires.flat(),
    ...circuit.grounds,
    ...circuit.labels.map((label) => label.at),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs, 0);
  const minY = Math.min(...ys, 0);
  const maxX = Math.max(...xs, 0);
  // Room under the lowest point for ground symbols.
  const maxY = Math.max(...ys, 0) + (circuit.grounds.length > 0 ? 0.6 : 0);
  return {
    width: round((maxX - minX) * GRID + PAD * 2),
    height: round((maxY - minY) * GRID + PAD * 2),
    minX,
    minY,
  };
}

export function drawCircuit(circuit: Circuit, options: DrawOptions): string {
  const { width, height, minX, minY } = circuitSize(circuit);
  const px = (point: Point) => ({
    x: PAD + (point.x - minX) * GRID,
    y: PAD + (point.y - minY) * GRID,
  });
  const parts: string[] = [];

  // Wires.
  for (const wire of circuit.wires) {
    const path = wire
      .map((point, i) => {
        const { x, y } = px(point);
        return `${i === 0 ? "M" : "L"}${String(round(x))} ${String(round(y))}`;
      })
      .join(" ");
    parts.push(`<path d="${path}" class="sc-wire"/>`);
  }

  // Parts, drawn along the line from their first point to their second.
  for (const element of circuit.elements) {
    const a = px(element.from);
    const b = px(element.to);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;
    // (u along, v across) → page coordinates.
    const at = (u: number, v: number) => ({
      x: a.x + u * dx - v * dy,
      y: a.y + u * dy + v * dx,
    });
    const seg = (u1: number, v1: number, u2: number, v2: number) => {
      const p = at(u1, v1);
      const q = at(u2, v2);
      return line(p.x, p.y, q.x, q.y);
    };
    const c = length / 2;
    const symbol: string[] = [];
    const lead = (half: number) => {
      symbol.push(seg(0, 0, c - half, 0), seg(c + half, 0, length, 0));
    };
    if (element.kind === "R") {
      lead(BODY);
      const corners = [
        at(c - BODY, -8),
        at(c + BODY, -8),
        at(c + BODY, 8),
        at(c - BODY, 8),
      ];
      symbol.push(
        `<polygon points="${corners.map((p) => `${String(round(p.x))},${String(round(p.y))}`).join(" ")}" class="sc-body"/>`,
      );
    } else if (element.kind === "C") {
      lead(4);
      symbol.push(seg(c - 4, -14, c - 4, 14), seg(c + 4, -14, c + 4, 14));
    } else if (element.kind === "L") {
      lead(BODY);
      let d = "";
      for (let i = 0; i < 4; i += 1) {
        const start = at(c - BODY + i * 10, 0);
        const end = at(c - BODY + (i + 1) * 10, 0);
        // Humps bulge to the left of the direction of travel.
        d += `${i === 0 ? `M${String(round(start.x))} ${String(round(start.y))} ` : ""}A5 5 0 0 1 ${String(round(end.x))} ${String(round(end.y))} `;
      }
      symbol.push(`<path d="${d.trim()}" class="sc-line"/>`);
    } else {
      lead(16);
      const centre = at(c, 0);
      symbol.push(
        `<circle cx="${String(round(centre.x))}" cy="${String(round(centre.y))}" r="16" class="sc-body"/>`,
      );
      if (element.kind === "V") {
        // + by the second point, − by the first; signs stay upright.
        const plus = at(c + 8, 0);
        const minus = at(c - 8, 0);
        symbol.push(
          line(plus.x - 4, plus.y, plus.x + 4, plus.y),
          line(plus.x, plus.y - 4, plus.x, plus.y + 4),
          line(minus.x - 4, minus.y, minus.x + 4, minus.y),
        );
      } else {
        symbol.push(seg(c - 9, 0, c + 9, 0));
        const tip = at(c + 10, 0);
        const left = at(c + 3, -5);
        const right = at(c + 3, 5);
        symbol.push(
          `<polygon points="${[tip, left, right].map((p) => `${String(round(p.x))},${String(round(p.y))}`).join(" ")}" class="sc-fill"/>`,
        );
      }
    }
    parts.push(
      `<g class="sc-part" data-part="${escapeHtml(element.name)}">${symbol.join("")}</g>`,
    );

    // Name and value beside the symbol: above a part that runs across, right of one that runs down.
    const shown = options.values?.[element.name];
    const valueLabel =
      shown === undefined
        ? element.valueText
        : formatQuantity(shown, ELEMENT_UNITS[element.kind]);
    const mid = at(c, 0);
    if (Math.abs(dy) > 0.5) {
      const x =
        mid.x + (element.kind === "R" || element.kind === "L" ? 15 : 22);
      parts.push(
        text(x, mid.y - 3, element.name, "start", "sc-name"),
        text(x, mid.y + 12, valueLabel, "start", "sc-value"),
      );
    } else {
      const y =
        mid.y -
        (element.kind === "C"
          ? 20
          : element.kind === "V" || element.kind === "I"
            ? 22
            : 14);
      parts.push(
        text(mid.x, y - 14, element.name, "middle", "sc-name"),
        text(mid.x, y, valueLabel, "middle", "sc-value"),
      );
    }
  }

  // Grounds.
  for (const ground of circuit.grounds) {
    const { x, y } = px(ground);
    parts.push(
      `<g class="sc-ground">${line(x, y, x, y + 10)}${line(x - 10, y + 10, x + 10, y + 10)}${line(x - 6, y + 14, x + 6, y + 14)}${line(x - 2, y + 18, x + 2, y + 18)}</g>`,
    );
  }

  // Junctions: dots where three or more connections meet.
  const { segments } = connectivity(circuit);
  const degree = new Map<string, number>();
  const bump = (point: Point, by = 1) => {
    degree.set(pointKey(point), (degree.get(pointKey(point)) ?? 0) + by);
  };
  for (const element of circuit.elements) {
    bump(element.from);
    bump(element.to);
  }
  for (const [a, b] of segments) {
    bump(a);
    bump(b);
  }
  const allPoints = new Map<string, Point>();
  for (const point of [
    ...circuit.elements.flatMap((e) => [e.from, e.to]),
    ...segments.flat(),
  ])
    allPoints.set(pointKey(point), point);
  for (const point of allPoints.values())
    for (const [a, b] of segments) {
      const inside =
        (a.x === b.x &&
          point.x === a.x &&
          point.y > Math.min(a.y, b.y) &&
          point.y < Math.max(a.y, b.y)) ||
        (a.y === b.y &&
          point.y === a.y &&
          point.x > Math.min(a.x, b.x) &&
          point.x < Math.max(a.x, b.x));
      if (inside) bump(point, 2);
    }
  for (const [key, count] of degree) {
    if (count < 3) continue;
    const point = allPoints.get(key);
    if (!point) continue;
    const { x, y } = px(point);
    parts.push(
      `<circle cx="${String(round(x))}" cy="${String(round(y))}" r="3" class="sc-fill"/>`,
    );
  }

  // Node labels and notes.
  for (const label of circuit.labels) {
    const { x, y } = px(label.at);
    parts.push(text(x - 6, y - 7, label.name, "end", "sc-node"));
  }
  for (const note of options.notes ?? []) {
    const { x, y } = px(note.at);
    parts.push(text(x + 6, y - 7, note.text, "start", "sc-note"));
  }

  const description = circuit.elements
    .map(
      (element) =>
        `${element.name}, ${ELEMENT_NAMES[element.kind]}, ${element.valueText}`,
    )
    .join("; ");
  const titleId = `${options.id}-title`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="study-circuit" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(round(width * DISPLAY_SCALE))}" height="${String(round(height * DISPLAY_SCALE))}" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${escapeHtml(`${options.title}. ${description}.`)}</title>${parts.join("")}</svg>`;
}
