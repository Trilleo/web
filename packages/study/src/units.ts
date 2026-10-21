/**
 * Quantities as people write them: "4.7 kΩ", "0.5mA", "2.2 uF", "-3e-3 V",
 * "1.5 km/s". A quantity is a number and a unit; an SI prefix on the unit's first
 * symbol scales the number, so "4.7 kΩ" and "4700 ohm" are the same answer. Used to
 * check numeric quiz answers and to write values with the right prefix.
 */

export interface Quantity {
  /** In the base unit (no prefix): 4.7 kΩ → 4700. */
  value: number;
  /** The unit without its prefix ("Ω", "m/s"), or "" for a plain number. */
  unit: string;
}

export const PREFIXES: Readonly<Record<string, number>> = {
  p: 1e-12,
  n: 1e-9,
  µ: 1e-6,
  μ: 1e-6,
  u: 1e-6,
  m: 1e-3,
  c: 1e-2,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};

/** Unit symbols a prefix may stand in front of. */
export const UNITS: readonly string[] = [
  "V",
  "A",
  "Ω",
  "W",
  "F",
  "H",
  "Hz",
  "s",
  "m",
  "g",
  "J",
  "N",
  "C",
  "Pa",
  "K",
  "mol",
  "rad",
  "S",
  "Wb",
  "T",
  "eV",
  "VA",
  "var",
  "L",
  "dB",
];

/** Other spellings of units. */
const ALIASES: Readonly<Record<string, string>> = {
  ohm: "Ω",
  ohms: "Ω",
  Ohm: "Ω",
  Ohms: "Ω",
  Ω: "Ω",
  volt: "V",
  volts: "V",
  amp: "A",
  amps: "A",
  watt: "W",
  watts: "W",
  sec: "s",
  hz: "Hz",
};

/** Units nothing scales: "%" and degrees. */
const PLAIN_UNITS = new Set(["%", "°", "°C"]);

function normalizeSymbol(symbol: string): string {
  return ALIASES[symbol] ?? symbol;
}

/** "kΩ" → [1000, "Ω"]; "m/s" → [1, "m/s"]; "km/s" → [1000, "m/s"]. */
export function splitUnit(raw: string): [number, string] {
  const unit = raw
    .trim()
    .split(/([/·*])/)
    .map((piece) => piece.trim())
    .join("");
  if (unit === "") return [1, ""];
  if (PLAIN_UNITS.has(unit)) return [1, unit];
  const split = unit.search(/[/·*]/);
  const head = split === -1 ? unit : unit.slice(0, split);
  const tail = split === -1 ? "" : unit.slice(split);
  const whole = normalizeSymbol(head);
  if (UNITS.includes(whole)) return [1, whole + tail];
  for (const [prefix, factor] of Object.entries(PREFIXES)) {
    if (!head.startsWith(prefix)) continue;
    const rest = normalizeSymbol(head.slice(prefix.length));
    if (UNITS.includes(rest)) return [factor, rest + tail];
  }
  return [1, whole + tail];
}

/**
 * Whether text is a unit this file knows ("kJ", "J/(mol·K)", "m^-3", "°C"), so a
 * worked-out answer's last word can be told apart from part of its arithmetic.
 */
export function isUnit(text: string): boolean {
  const [, unit] = splitUnit(text);
  if (unit === "" || PLAIN_UNITS.has(unit)) return unit !== "";
  const head = withoutPower(unit.split(/[/·*]/)[0] ?? "");
  return UNITS.includes(head);
}

const SUPERSCRIPTS = "⁻¹²³";

/**
 * A unit without its power ("m^-3" → "m", "m²" → "m"), by hand rather than with an
 * end-anchored regex, which backtracks badly on long runs of superscripts.
 */
function withoutPower(unit: string): string {
  const caret = unit.lastIndexOf("^");
  if (caret !== -1 && /^\^[-−]?\d+$/u.test(unit.slice(caret)))
    return unit.slice(0, caret);
  let end = unit.length;
  while (end > 0 && SUPERSCRIPTS.includes(unit.charAt(end - 1))) end -= 1;
  return unit.slice(0, end);
}

const NUMBER =
  /^[+\-−]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:\s*[eE][+\-−]?\d+|\s*[×x*]\s*10\s*\^\s*[+\-−]?\d+)?/;

/** A quantity, or null when the text doesn't start with a number. */
export function parseQuantity(text: string): Quantity | null {
  const trimmed = text.trim();
  const match = NUMBER.exec(trimmed);
  if (!match) return null;
  const numberText = match[0]
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .replace(/[×x*]10\^/, "e");
  const number = Number(numberText);
  if (!Number.isFinite(number)) return null;
  const [factor, unit] = splitUnit(trimmed.slice(match[0].length));
  return { value: number * factor, unit };
}

/** The prefix factor of a written quantity's unit: "0.5 mA" → 0.001. */
export function writtenFactor(text: string): number {
  const trimmed = text.trim();
  const match = NUMBER.exec(trimmed);
  return match ? splitUnit(trimmed.slice(match[0].length))[0] : 1;
}

export interface Tolerance {
  /** Relative (0.01 for 1%) or absolute, in the answer's base unit. */
  kind: "relative" | "absolute";
  amount: number;
}

/** The default: answers within 1% are right (rounding in between steps). */
export const DEFAULT_TOLERANCE: Tolerance = { kind: "relative", amount: 0.01 };

/** "2%" → relative; "0.05" or "5 mA" → absolute (in base units). */
export function parseTolerance(text: string): Tolerance | null {
  const trimmed = text.trim();
  if (trimmed.endsWith("%")) {
    const amount = Number(trimmed.slice(0, -1).trim());
    return Number.isFinite(amount) && amount >= 0
      ? { kind: "relative", amount: amount / 100 }
      : null;
  }
  const quantity = parseQuantity(trimmed);
  return quantity && quantity.value >= 0
    ? { kind: "absolute", amount: quantity.value }
    : null;
}

export function withinTolerance(
  actual: number,
  expected: number,
  tolerance: Tolerance,
): boolean {
  const difference = Math.abs(actual - expected);
  if (tolerance.kind === "absolute")
    return difference <= tolerance.amount + 1e-15;
  if (expected === 0) return difference <= 1e-12;
  return difference <= tolerance.amount * Math.abs(expected) * (1 + 1e-12);
}

const DISPLAY_PREFIXES: readonly [string, number][] = [
  ["T", 1e12],
  ["G", 1e9],
  ["M", 1e6],
  ["k", 1e3],
  ["", 1],
  ["m", 1e-3],
  ["µ", 1e-6],
  ["n", 1e-9],
  ["p", 1e-12],
];

/** Units that take prefixes when shown (not "%", "dB", or none). */
function takesPrefix(unit: string): boolean {
  const head = unit.split(/[/·*]/)[0] ?? "";
  return UNITS.includes(head) && head !== "dB";
}

/**
 * A value in its unit with a fitting prefix and `digits` significant figures:
 * (0.0025, "A") → "2.5 mA"; (4700, "Ω") → "4.7 kΩ"; (0.5, "") → "0.5".
 */
export function formatQuantity(
  value: number,
  unit: string,
  digits = 3,
): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const size = Math.abs(value);
  let prefix = "";
  let scaled = size;
  if (takesPrefix(unit) && size !== 0) {
    const found =
      DISPLAY_PREFIXES.find(([, factor]) => size >= factor * 0.9995) ??
      DISPLAY_PREFIXES[DISPLAY_PREFIXES.length - 1];
    if (found) {
      prefix = found[0];
      scaled = size / found[1];
    }
  }
  const text = formatNumber(scaled, digits);
  if (!unit) return `${sign}${text}`;
  const space = unit === "%" || unit.startsWith("°") ? "" : " ";
  return `${sign}${text}${space}${prefix}${unit}`;
}

/** A number with `digits` significant figures and no trailing zeros. */
export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const size = Math.abs(value);
  if (size >= 1e6 || size < 1e-4) {
    const [mantissa = "", exponent = ""] = value
      .toExponential(digits - 1)
      .split("e");
    return `${trimZeros(mantissa)}×10^${exponent.replace("+", "")}`.replaceAll(
      "-",
      "−",
    );
  }
  return String(Number(value.toPrecision(digits))).replace("-", "−");
}

function trimZeros(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}
