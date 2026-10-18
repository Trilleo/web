/**
 * Draws a circuit as an SVG schematic, in the style of Chinese (GB/IEC) textbooks:
 * resistors are boxes, sources are circles, controlled sources diamonds. Lines and text use currentColor, so the
 * page's colours (both themes) apply; class names let the stylesheet set the type.
 * Pure string building: the server draws static circuits, the simulator redraws
 * with its readings.
 */
import { escapeHtml } from "../escape";
import { formatQuantity } from "../units";
import {
  ELEMENT_NAMES,
  ELEMENT_UNITS,
  MODEL_NAMES,
  pointKey,
  type Circuit,
  type CircuitDevice,
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

interface XY {
  x: number;
  y: number;
}

function polygon(points: readonly XY[], className: string): string {
  return `<polygon points="${points.map((p) => `${String(round(p.x))},${String(round(p.y))}`).join(" ")}" class="${className}"/>`;
}

function polyline(points: readonly XY[]): string {
  return `<path d="${points.map((p, i) => `${i === 0 ? "M" : "L"}${String(round(p.x))} ${String(round(p.y))}`).join(" ")}" class="sc-line"/>`;
}

/** An arrowhead at `tip`, pointing from `from` towards it. */
function arrow(from: XY, tip: XY, size = 7): string {
  const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const ux = (tip.x - from.x) / length;
  const uy = (tip.y - from.y) / length;
  const base = { x: tip.x - ux * size, y: tip.y - uy * size };
  return polygon(
    [
      tip,
      { x: base.x - uy * size * 0.5, y: base.y + ux * size * 0.5 },
      { x: base.x + uy * size * 0.5, y: base.y - ux * size * 0.5 },
    ],
    "sc-fill",
  );
}

/** A coil down the page at grid offset `gx`, its humps bulging right (`bulge` 1) or left (−1) on the page. */
function coil(
  at: (gx: number, gy: number) => XY,
  gx: number,
  bulge: number,
): string {
  const humps = 4;
  const from = 0.8;
  const to = 3.2;
  const step = (to - from) / humps;
  const start = at(gx, from);
  let d = `M${String(round(start.x))} ${String(round(start.y))}`;
  for (let i = 1; i <= humps; i += 1) {
    const end = at(gx, from + i * step);
    const radius = round((step * GRID) / 2);
    // Going down the page, a clockwise arc (sweep 1) bulges to the right.
    const sweep = bulge > 0 ? 1 : 0;
    d += ` A${String(radius)} ${String(radius)} 0 0 ${String(sweep)} ${String(round(end.x))} ${String(round(end.y))}`;
  }
  return `<path d="${d}" class="sc-line"/>`;
}

/** A transistor, op-amp or transformer, drawn around its placing point. */
function drawDevice(device: CircuitDevice, px: (point: Point) => XY): string[] {
  const origin = px(device.at);
  const dir = device.left ? -1 : 1;
  // Grid offsets from the placing point → page coordinates (mirrored when facing left).
  const at = (gx: number, gy: number): XY => ({
    x: origin.x + dir * gx * GRID,
    y: origin.y + gy * GRID,
  });
  const out: string[] = [];
  if (device.kind === "T") {
    // Two coils facing each other across an iron core (two lines).
    out.push(
      polyline([at(0, 0), at(0, 0.8)]),
      polyline([at(0, 3.2), at(0, 4)]),
      polyline([at(2, 0), at(2, 0.8)]),
      polyline([at(2, 3.2), at(2, 4)]),
      coil(at, 0, dir),
      coil(at, 2, -dir),
    );
    for (const gx of [0.9, 1.1]) {
      const top = at(gx, 0.7);
      const bottom = at(gx, 3.3);
      out.push(line(top.x, top.y, bottom.x, bottom.y));
    }
    return out;
  }
  if (device.kind === "U") {
    const top = device.flip ? "+" : "−";
    const bottom = device.flip ? "−" : "+";
    out.push(
      polygon([at(0.5, -1.7), at(0.5, 1.7), at(3.4, 0)], "sc-body"),
      polyline([at(0, -1), at(0.5, -1)]),
      polyline([at(0, 1), at(0.5, 1)]),
      polyline([at(3.4, 0), at(4, 0)]),
    );
    const sign = (where: XY, symbol: string) => {
      out.push(line(where.x - 4, where.y, where.x + 4, where.y));
      if (symbol === "+")
        out.push(line(where.x, where.y - 4, where.x, where.y + 4));
    };
    sign(at(0.8, -1), top);
    sign(at(0.8, 1), bottom);
    return out;
  }
  const up = device.flip ? 1 : -1; // where the collector/drain goes
  if (device.kind === "Q") {
    const barTop = at(0.9, -0.5);
    const barBottom = at(0.9, 0.5);
    const centre = at(1.35, 0);
    out.push(
      `<circle cx="${String(round(centre.x))}" cy="${String(round(centre.y))}" r="${String(0.85 * GRID)}" class="sc-body"/>`,
      polyline([at(0, 0), at(0.9, 0)]),
      line(barTop.x, barTop.y, barBottom.x, barBottom.y, ' stroke-width="3"'),
      polyline([at(0.9, up * 0.25), at(2, up * 1), at(2, up * 2)]),
      polyline([at(0.9, -up * 0.25), at(2, -up * 1), at(2, -up * 2)]),
    );
    // The emitter's arrow points out of an NPN, into a PNP.
    const start = at(0.9, -up * 0.25);
    const end = at(2, -up * 1);
    const middle = {
      x: start.x * 0.35 + end.x * 0.65,
      y: start.y * 0.35 + end.y * 0.65,
    };
    out.push(
      device.model === "npn"
        ? arrow(start, middle)
        : arrow(end, {
            x: start.x * 0.75 + end.x * 0.25,
            y: start.y * 0.75 + end.y * 0.25,
          }),
    );
    return out;
  }
  // FETs: gate on the left, channel, drain and source on the right.
  const jfet = device.model.endsWith("jfet");
  const nType = device.model.startsWith("n");
  const depletion = device.model.endsWith("-d") || jfet;
  const channelX = jfet ? 0.9 : 1.05;
  if (jfet) {
    out.push(
      line(
        at(channelX, -0.6).x,
        at(channelX, -0.6).y,
        at(channelX, 0.6).x,
        at(channelX, 0.6).y,
        ' stroke-width="3"',
      ),
      polyline([at(0, 0), at(channelX, 0)]),
      nType
        ? arrow(at(0.2, 0), at(channelX, 0))
        : arrow(at(channelX, 0), at(0.25, 0)),
    );
  } else {
    const gate = 0.8;
    out.push(
      polyline([at(0, 0), at(gate, 0)]),
      line(
        at(gate, -0.55).x,
        at(gate, -0.55).y,
        at(gate, 0.55).x,
        at(gate, 0.55).y,
      ),
    );
    // The channel: one bar when it's there already (depletion), three dashes when it must be induced.
    if (depletion)
      out.push(
        line(
          at(channelX, -0.6).x,
          at(channelX, -0.6).y,
          at(channelX, 0.6).x,
          at(channelX, 0.6).y,
          ' stroke-width="2.5"',
        ),
      );
    else
      for (const [from, to] of [
        [-0.6, -0.25],
        [-0.15, 0.15],
        [0.25, 0.6],
      ] as const)
        out.push(
          line(
            at(channelX, from).x,
            at(channelX, from).y,
            at(channelX, to).x,
            at(channelX, to).y,
            ' stroke-width="2.5"',
          ),
        );
    // The substrate arrow points into an N channel, out of a P channel, and the substrate joins the source.
    out.push(
      polyline([at(2, 0), at(channelX, 0)]),
      nType
        ? arrow(at(2, 0), at(channelX + 0.1, 0))
        : arrow(at(channelX, 0), at(1.85, 0)),
      polyline([at(2, 0), at(2, -up * 0.4)]),
    );
  }
  out.push(
    polyline([at(channelX, up * 0.4), at(2, up * 0.4), at(2, up * 2)]),
    polyline([at(channelX, -up * 0.4), at(2, -up * 0.4), at(2, -up * 2)]),
  );
  return out;
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
    ...circuit.devices.flatMap((device) => [
      ...Object.values(device.pins),
      // Room for the name beside it (a transformer's goes above and below).
      device.kind === "T"
        ? device.at
        : {
            x: Math.max(0, device.at.x + (device.left ? -3 : 3)),
            y: device.at.y,
          },
    ]),
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
    } else if (element.kind === "D" || element.kind === "Z") {
      // A triangle pointing from anode to cathode, and the cathode's bar.
      lead(10);
      symbol.push(
        polygon([at(c - 10, -9), at(c - 10, 9), at(c + 8, 0)], "sc-body"),
        seg(c + 10, 0, c + 8, 0),
      );
      if (element.kind === "D") symbol.push(seg(c + 8, -9, c + 8, 9));
      else
        symbol.push(
          polyline([
            at(c + 4, -12),
            at(c + 8, -9),
            at(c + 8, 9),
            at(c + 12, 12),
          ]),
        );
    } else if (element.kind === "S") {
      lead(12);
      const pivot = at(c - 12, 0);
      const contact = at(c + 12, 0);
      const blade = element.value === 1 ? at(c + 12, 0) : at(c + 8, -12);
      symbol.push(
        line(pivot.x, pivot.y, blade.x, blade.y),
        `<circle cx="${String(round(pivot.x))}" cy="${String(round(pivot.y))}" r="2.5" class="sc-fill"/>`,
        `<circle cx="${String(round(contact.x))}" cy="${String(round(contact.y))}" r="2.5" class="sc-body"/>`,
      );
    } else if (element.kind === "E" || element.kind === "F") {
      // Controlled sources are diamonds: + and − for voltage, an arrow for current.
      lead(16);
      symbol.push(
        polygon(
          [at(c - 16, 0), at(c, -16), at(c + 16, 0), at(c, 16)],
          "sc-body",
        ),
      );
      if (element.kind === "E") {
        const plus = at(c + 7, 0);
        const minus = at(c - 7, 0);
        symbol.push(
          line(plus.x - 3.5, plus.y, plus.x + 3.5, plus.y),
          line(plus.x, plus.y - 3.5, plus.x, plus.y + 3.5),
          line(minus.x - 3.5, minus.y, minus.x + 3.5, minus.y),
        );
      } else
        symbol.push(
          seg(c - 8, 0, c + 4, 0),
          polygon([at(c + 9, 0), at(c + 3, -4), at(c + 3, 4)], "sc-fill"),
        );
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
      if (element.kind === "A") {
        // A sine wave, always drawn upright.
        const centre2 = at(c, 0);
        symbol.push(
          `<path d="M${String(round(centre2.x - 9))} ${String(round(centre2.y))} q4.5 -10 9 0 t9 0" class="sc-line"/>`,
        );
      } else if (element.kind === "V") {
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
      element.kind === "S" || element.valueText === element.name
        ? ""
        : shown === undefined
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
        (element.kind === "C" ? 20 : "VIAEF".includes(element.kind) ? 22 : 14);
      parts.push(
        text(mid.x, y - 14, element.name, "middle", "sc-name"),
        text(mid.x, y, valueLabel, "middle", "sc-value"),
      );
    }
  }

  // Transistors and op-amps, with their name (and text) beside them; a
  // transformer's name above it, its text (a ratio, voltages) below.
  for (const device of circuit.devices) {
    parts.push(
      `<g class="sc-part" data-part="${escapeHtml(device.name)}">${drawDevice(device, px).join("")}</g>`,
    );
    const origin = px(device.at);
    if (device.kind === "T") {
      const x = origin.x + (device.left ? -1 : 1) * GRID;
      parts.push(text(x, origin.y - 8, device.name, "middle", "sc-name"));
      if (device.text)
        parts.push(
          text(x, origin.y + 4 * GRID + 18, device.text, "middle", "sc-value"),
        );
      continue;
    }
    const dir = device.left ? -1 : 1;
    const anchor = device.left ? "end" : "start";
    const x = origin.x + dir * (device.kind === "U" ? 2.2 : 2.35) * GRID;
    const y = device.kind === "U" ? origin.y - 1.2 * GRID : origin.y - 4;
    parts.push(text(x, y, device.name, anchor, "sc-name"));
    if (device.text)
      parts.push(text(x, y + 15, device.text, anchor, "sc-value"));
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
  const pins = circuit.devices.flatMap((device) => Object.values(device.pins));
  for (const pin of pins) bump(pin);
  const allPoints = new Map<string, Point>();
  for (const point of [
    ...circuit.elements.flatMap((e) => [e.from, e.to]),
    ...segments.flat(),
    ...pins,
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

  const description = [
    ...circuit.elements.map((element) =>
      [element.name, ELEMENT_NAMES[element.kind], element.valueText]
        .filter(Boolean)
        .join(", "),
    ),
    ...circuit.devices.map((device) =>
      [device.name, MODEL_NAMES[device.model] ?? device.model, device.text]
        .filter(Boolean)
        .join(", "),
    ),
  ].join("; ");
  const titleId = `${options.id}-title`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="study-circuit" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(round(width * DISPLAY_SCALE))}" height="${String(round(height * DISPLAY_SCALE))}" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${escapeHtml(`${options.title}. ${description}.`)}</title>${parts.join("")}</svg>`;
}
