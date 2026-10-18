/**
 * Circuits written on a grid. Every part runs straight between two grid points (or,
 * for transistors and op-amps, sits at one point with its pins in fixed places), so
 * the text says both what the circuit is (for the solver) and where it goes (for the
 * drawing); points that meet are connected.
 *
 *   V1 0,4 0,0 5V        a voltage source from − (first point) to + (second)
 *   R1 0,0 4,0 1k        a resistor; the unit may be left out (Ω)
 *   R2 4,0 4,4 2k [100..10k]   a range for the simulator's slider
 *   R3 4,0 8,0 RL        a symbol instead of a value: drawn, but not simulated
 *   C1 6,0 6,4 10u       capacitor (F), L1 … inductor (H)
 *   I1 8,4 8,0 2mA       a current source, flowing from the first point to the second
 *   A1 0,4 0,0 u2        an AC source (any label)
 *   D1 0,0 4,0 1N4007    a diode, anode first (label optional)
 *   Z1 4,4 4,0 6V        a Zener diode, anode first (label optional)
 *   S1 0,0 2,0 closed    a switch, open (the default) or closed
 *   F1 4,4 4,0 gmUgs     a controlled (dependent) current source, flowing from the
 *                        first point to the second; E1 … a controlled voltage source,
 *                        − to + (diamonds; the label says what controls them)
 *   Q1 npn 2,2           a BJT: base at 2,2, collector at 4,0, emitter at 4,4
 *                        (pnp; add "left" to face left, "flip" to swap C and E)
 *   M1 nmos 2,2          a MOSFET (nmos, pmos, nmos-d, pmos-d for depletion) or a
 *                        JFET (njfet, pjfet): gate 2,2, drain 4,0, source 4,4
 *   U1 opamp 2,2         an op-amp: − input 2,1, + input 2,3, output 6,2
 *                        ("plus-top" puts + at 2,1)
 *   T1 transformer 2,0   a transformer: primary 2,0–2,4, secondary 4,0–4,4
 *                        (centre-tap adds a tap at 4,2; "left" puts the primary right)
 *   W 0,4 4,4 8,4        a wire through points (a point on a wire joins it)
 *   G 0,4                ground (0 V)
 *   label +VCC 4,0       names a node
 *   # a comment
 *
 * Two-terminal parts need at least 2 grid squares (their symbol fills the middle).
 * Text after a transistor's, op-amp's or transformer's options is shown beside it ("β=50").
 */
import { parseQuantity, splitUnit } from "../units";

export type ElementKind =
  "R" | "C" | "L" | "V" | "I" | "A" | "D" | "Z" | "S" | "E" | "F";

/** Parts with a value the simulator uses; the others carry a label. */
export const VALUED_KINDS: readonly ElementKind[] = ["R", "C", "L", "V", "I"];

export const ELEMENT_UNITS: Readonly<Record<ElementKind, string>> = {
  R: "Ω",
  C: "F",
  L: "H",
  V: "V",
  I: "A",
  A: "",
  D: "",
  Z: "",
  S: "",
  E: "",
  F: "",
};

export const ELEMENT_NAMES: Readonly<Record<ElementKind, string>> = {
  R: "resistor",
  C: "capacitor",
  L: "inductor",
  V: "voltage source",
  I: "current source",
  A: "AC source",
  D: "diode",
  Z: "Zener diode",
  S: "switch",
  E: "controlled voltage source",
  F: "controlled current source",
};

export type DeviceKind = "Q" | "M" | "U" | "T";

export const DEVICE_MODELS: Readonly<Record<DeviceKind, readonly string[]>> = {
  Q: ["npn", "pnp"],
  M: ["nmos", "pmos", "nmos-d", "pmos-d", "njfet", "pjfet"],
  U: ["opamp"],
  T: ["transformer", "centre-tap"],
};

export const MODEL_NAMES: Readonly<Record<string, string>> = {
  npn: "NPN transistor",
  pnp: "PNP transistor",
  nmos: "N-channel enhancement MOSFET",
  pmos: "P-channel enhancement MOSFET",
  "nmos-d": "N-channel depletion MOSFET",
  "pmos-d": "P-channel depletion MOSFET",
  njfet: "N-channel JFET",
  pjfet: "P-channel JFET",
  opamp: "op-amp",
  transformer: "transformer",
  "centre-tap": "centre-tapped transformer",
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
  /** In base units (Ω, F, H, V, A); for a switch 1 closed, 0 open; NaN for labels. */
  value: number;
  /** As written, unit included ("1 kΩ"), or the part's label. */
  valueText: string;
  /** The simulator's slider, if given. */
  range?: [number, number];
}

/** A transistor, op-amp or transformer: one point places it, its pins sit around it. */
export interface CircuitDevice {
  kind: DeviceKind;
  name: string;
  model: string;
  at: Point;
  /** Faces left (pins mirrored). */
  left: boolean;
  /** Collector/drain and emitter/source swapped; for an op-amp, + on top. */
  flip: boolean;
  /** Pin name → grid point: b c e, g d s, minus plus out, or p1 p2 s1 s2 (ct). */
  pins: Record<string, Point>;
  text: string;
}

export interface Circuit {
  elements: CircuitElement[];
  devices: CircuitDevice[];
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

/** Where a device's pins are, from its placing point and options. */
export function devicePins(
  kind: DeviceKind,
  at: Point,
  left: boolean,
  flip: boolean,
  model = "",
): Record<string, Point> {
  const dir = left ? -1 : 1;
  const side = (dx: number, dy: number): Point => ({
    x: at.x + dir * dx,
    y: at.y + dy,
  });
  if (kind === "T")
    return {
      p1: side(0, 0),
      p2: side(0, 4),
      s1: side(2, 0),
      s2: side(2, 4),
      ...(model === "centre-tap" && { ct: side(2, 2) }),
    };
  if (kind === "U")
    return flip
      ? { plus: side(0, -1), minus: side(0, 1), out: side(4, 0) }
      : { minus: side(0, -1), plus: side(0, 1), out: side(4, 0) };
  const top = flip ? 2 : -2;
  const [input, upper, lower] =
    kind === "Q" ? ["b", "c", "e"] : ["g", "d", "s"];
  return {
    [input]: side(0, 0),
    [upper]: side(2, top),
    [lower]: side(2, -top),
  };
}

export function parseCircuit(body: string): CircuitParse {
  const circuit: Circuit = {
    elements: [],
    devices: [],
    wires: [],
    grounds: [],
    labels: [],
  };
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
      if (
        !point ||
        !/^[\p{L}\p{N}_'+\-.]{1,8}$/u.test(name) ||
        words.length !== 3
      )
        errors.push(`${where}: write a node's label as “label a 4,0”.`);
      else circuit.labels.push({ name, at: point });
      return;
    }

    const device = /^([QMUT])([A-Za-z0-9_]*)$/.exec(head);
    if (device) {
      const kind = device[1] as DeviceKind;
      if (names.has(head)) {
        errors.push(`${where}: there's already a part called ${head}.`);
        return;
      }
      names.add(head);
      const model = words[1] ?? "";
      const at = parsePoint(words[2] ?? "");
      if (!DEVICE_MODELS[kind].includes(model) || !at) {
        errors.push(
          `${where}: write ${head} as “${head} ${DEVICE_MODELS[kind][0] ?? ""} 2,2” (${DEVICE_MODELS[kind].join(", ")}).`,
        );
        return;
      }
      const options = words.slice(3);
      let left = false;
      let flip = false;
      while (options.length > 0) {
        const option = options[0];
        if (option === "left") left = true;
        else if (kind !== "T" && (option === "flip" || option === "plus-top"))
          flip = true;
        else break;
        options.shift();
      }
      const pins = devicePins(kind, at, left, flip, model);
      if (Object.values(pins).some((pin) => pin.x < 0 || pin.y < 0)) {
        errors.push(`${where}: ${head}'s pins would go off the grid.`);
        return;
      }
      circuit.devices.push({
        kind,
        name: head,
        model,
        at,
        left,
        flip,
        pins,
        text: options.join(" "),
      });
      return;
    }

    const element = /^([RCLVIADZSEF])([A-Za-z0-9_]*)$/.exec(head);
    if (!element) {
      errors.push(
        `${where}: “${head}” isn't a part (R, C, L, V, I, A, D, Z, S, E, F, Q, M, U, T, W, G or label).`,
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

    if (!VALUED_KINDS.includes(kind)) {
      if (kind === "S") {
        if (rest !== "" && rest !== "open" && rest !== "closed") {
          errors.push(`${where}: a switch is “open” or “closed”.`);
          return;
        }
        circuit.elements.push({
          kind,
          name: head,
          from,
          to,
          value: rest === "closed" ? 1 : 0,
          valueText: rest === "closed" ? "closed" : "open",
        });
        return;
      }
      if (rest.length > 16) {
        errors.push(`${where}: ${head}'s label is too long (16 characters).`);
        return;
      }
      circuit.elements.push({
        kind,
        name: head,
        from,
        to,
        value: NaN,
        valueText: rest,
      });
      return;
    }

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
    // A symbol instead of a value ("RL", "Rb", "R/2", "2C"), as textbooks label parts:
    // drawn, not simulated.
    if (
      value === null &&
      !range &&
      /^(?=.*\p{L})[\p{L}\p{N}_'][\p{L}\p{N}_'/]{0,7}$/u.test(rest)
    ) {
      circuit.elements.push({
        kind,
        name: head,
        from,
        to,
        value: NaN,
        valueText: rest,
      });
      return;
    }
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

  if (
    circuit.elements.length === 0 &&
    circuit.devices.length === 0 &&
    errors.length === 0
  )
    errors.push("The circuit has no parts.");
  return { circuit, errors };
}

/** Why the DC simulator can't take a circuit (diodes, transistors, …), or null. */
export function simulationProblem(circuit: Circuit): string | null {
  const unvalued = circuit.elements.find(
    (entry) => VALUED_KINDS.includes(entry.kind) && Number.isNaN(entry.value),
  );
  if (unvalued)
    return `The simulator needs numbers: ${unvalued.name} is labelled “${unvalued.valueText}”.`;
  const element = circuit.elements.find(
    (entry) => !VALUED_KINDS.includes(entry.kind) && entry.kind !== "S",
  );
  const device = circuit.devices[0];
  const part = element
    ? `${element.name} (${ELEMENT_NAMES[element.kind]})`
    : device
      ? `${device.name} (${MODEL_NAMES[device.model] ?? device.model})`
      : null;
  return part
    ? `The simulator works with R, C, L, V, I and switches; ${part} can only be drawn (use ::: circuit).`
    : null;
}
