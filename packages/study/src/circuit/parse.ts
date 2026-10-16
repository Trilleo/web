/**
 * Circuits written on a grid. Every part runs straight between two grid points, so
 * the text says both what the circuit is (for the solver) and where it goes (for the
 * drawing); points that meet are connected.
 *
 *   V1 0,4 0,0 5V        a voltage source from − (first point) to + (second)
 *   R1 0,0 4,0 1k        a resistor; the unit may be left out (Ω)
 *   R2 4,0 4,4 2k [100..10k]   a range for the simulator's slider
 *   C1 6,0 6,4 10u       capacitor (F), L1 … inductor (H)
 *   I1 8,4 8,0 2mA       a current source, flowing from the first point to the second
 *   W 0,4 4,4 8,4        a wire through points (a point on a wire joins it)
 *   G 0,4                ground (0 V)
 *   label a 4,0          names a node
 *   # a comment
 *
 * Parts need at least 2 grid squares (their symbol fills the middle).
 */
import { parseQuantity, splitUnit } from "../units";

export type ElementKind = "R" | "C" | "L" | "V" | "I";

export const ELEMENT_UNITS: Readonly<Record<ElementKind, string>> = {
  R: "Ω",
  C: "F",
  L: "H",
  V: "V",
  I: "A",
};

export const ELEMENT_NAMES: Readonly<Record<ElementKind, string>> = {
  R: "resistor",
  C: "capacitor",
  L: "inductor",
  V: "voltage source",
  I: "current source",
};

export interface Point {
  x: number;
  y: number;
}

export interface CircuitElement {
  kind: ElementKind;
  name: string;
  from: Point;
  to: Point;
  /** In base units (Ω, F, H, V, A). */
  value: number;
  /** As written, unit included ("1 kΩ"). */
  valueText: string;
  /** The simulator's slider, if given. */
  range?: [number, number];
}

export interface Circuit {
  elements: CircuitElement[];
  wires: Point[][];
  grounds: Point[];
  labels: { name: string; at: Point }[];
}

export interface CircuitParse {
  circuit: Circuit;
  errors: string[];
}

/** Grid coordinates stay small: drawings are a few hundred pixels wide. */
export const GRID_MAX = 40;

export function pointKey(point: Point): string {
  return `${String(point.x)},${String(point.y)}`;
}

function parsePoint(text: string): Point | null {
  const match = /^(\d+),(\d+)$/.exec(text);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return x <= GRID_MAX && y <= GRID_MAX ? { x, y } : null;
}

/** "1k", "1kΩ", "10 µF", "5V", "-2mA": the value in base units, or null. */
export function parseValue(text: string, kind: ElementKind): number | null {
  const unit = ELEMENT_UNITS[kind];
  const quantity = parseQuantity(text);
  if (!quantity) return null;
  if (quantity.unit === unit || quantity.unit === "") return quantity.value;
  // "1k": a prefix with the unit left out.
  const number = parseQuantity(text.replace(/[\p{L}µΩ]+$/u, ""));
  const suffix = /[\p{L}µΩ]+$/u.exec(text.trim())?.[0] ?? "";
  const [factor, rest] = splitUnit(suffix + unit);
  return number && rest === unit && number.unit === ""
    ? number.value * factor
    : null;
}

/** "1k" → "1 kΩ" (the written value, with its unit). */
function valueText(text: string, kind: ElementKind): string {
  const unit = ELEMENT_UNITS[kind];
  const compact = text
    .replace(/\s+/g, "")
    .replace(/ohms?$/i, "Ω")
    .replace(/u/g, "µ");
  const number =
    /^[+\-−]?[\d.]+(?:e[+\-−]?\d+)?/i.exec(compact)?.[0] ?? compact;
  let suffix = compact.slice(number.length);
  if (!suffix.endsWith(unit)) suffix += unit;
  return `${number.replace("-", "−")} ${suffix}`;
}

export function parseCircuit(body: string): CircuitParse {
  const circuit: Circuit = { elements: [], wires: [], grounds: [], labels: [] };
  const errors: string[] = [];
  const names = new Set<string>();

  body.split("\n").forEach((raw, index) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") return;
    const where = `Line ${String(index + 1)}`;
    const words = line.split(/\s+/);
    const head = words[0] ?? "";

    if (head === "W" || head === "wire") {
      const points = words.slice(1).map(parsePoint);
      if (points.length < 2 || points.some((point) => point === null)) {
        errors.push(`${where}: a wire needs two or more points like 0,4.`);
        return;
      }
      const wire = points as Point[];
      for (let i = 1; i < wire.length; i += 1) {
        const a = wire[i - 1];
        const b = wire[i];
        if (a && b && a.x !== b.x && a.y !== b.y)
          errors.push(
            `${where}: wires run straight across or down (${pointKey(a)} → ${pointKey(b)}).`,
          );
      }
      circuit.wires.push(wire);
      return;
    }
    if (head === "G" || head === "ground") {
      const point = parsePoint(words[1] ?? "");
      if (!point || words.length !== 2)
        errors.push(`${where}: ground takes one point, like G 0,4.`);
      else circuit.grounds.push(point);
      return;
    }
    if (head === "label") {
      const point = parsePoint(words[2] ?? "");
      const name = words[1] ?? "";
      if (!point || !/^[\p{L}\p{N}_']{1,6}$/u.test(name) || words.length !== 3)
        errors.push(`${where}: write a node's label as “label a 4,0”.`);
      else circuit.labels.push({ name, at: point });
      return;
    }

    const element = /^([RCLVI])([A-Za-z0-9_]*)$/.exec(head);
    if (!element) {
      errors.push(
        `${where}: “${head}” isn't a part (R, C, L, V, I, W, G or label).`,
      );
      return;
    }
    const kind = element[1] as ElementKind;
    if (names.has(head)) {
      errors.push(`${where}: there's already a part called ${head}.`);
      return;
    }
    names.add(head);
    const from = parsePoint(words[1] ?? "");
    const to = parsePoint(words[2] ?? "");
    if (!from || !to) {
      errors.push(`${where}: ${head} needs two points, like ${head} 0,0 4,0.`);
      return;
    }
    if (from.x !== to.x && from.y !== to.y) {
      errors.push(`${where}: ${head} must run straight across or down.`);
      return;
    }
    if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) < 2) {
      errors.push(`${where}: ${head} needs at least 2 grid squares.`);
      return;
    }
    let rest = words.slice(3).join(" ");
    let range: [number, number] | undefined;
    const bracket = /\[([^\]]*)\]\s*$/.exec(rest);
    if (bracket) {
      rest = rest.slice(0, bracket.index).trim();
      const [low, high] = (bracket[1] ?? "")
        .split("..")
        .map((part) => parseValue(part.trim(), kind));
      if (low == null || high == null || !(high > low)) {
        errors.push(
          `${where}: write ${head}'s range as [low..high], like [100..10k].`,
        );
        return;
      }
      range = [low, high];
    }
    if (rest === "") {
      errors.push(
        `${where}: ${head} needs a value (in ${ELEMENT_UNITS[kind]}).`,
      );
      return;
    }
    const value = parseValue(rest, kind);
    if (value === null) {
      errors.push(
        `${where}: “${rest}” isn't a value in ${ELEMENT_UNITS[kind]}.`,
      );
      return;
    }
    if ((kind === "R" || kind === "C" || kind === "L") && !(value > 0)) {
      errors.push(`${where}: ${head}'s value must be more than 0.`);
      return;
    }
    circuit.elements.push({
      kind,
      name: head,
      from,
      to,
      value,
      valueText: valueText(rest, kind),
      ...(range && { range }),
    });
  });

  if (circuit.elements.length === 0 && errors.length === 0)
    errors.push("The circuit has no parts.");
  return { circuit, errors };
}
