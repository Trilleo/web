/**
 * Which Minecraft versions a file says it works with, in the many ways files say it:
 * Fabric's npm-style ranges ("~1.21.4", ">=1.20 <1.21"), Forge's Maven ranges
 * ("[1.20.1,1.21)"), a plugin's minimum api-version, a pack's format number, or a
 * world's data version. Each becomes a `VersionRule`; `matchVersions` applies one
 * to the list of known versions.
 */

/** "1.21.4" → [1, 21, 4]; anything else (snapshots, "*") → null. */
export function parseVersion(id: string): number[] | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(id.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

/** Negative when a < b. "1.21" equals "1.21.0". */
export function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** A version interval; an open end is undefined. */
interface Interval {
  min?: number[];
  minInclusive?: boolean;
  max?: number[];
  maxInclusive?: boolean;
}

export type VersionRule =
  /** Any of these intervals. */
  | { kind: "intervals"; intervals: Interval[] }
  /** Exactly these. */
  | { kind: "exact"; versions: string[] };

const ALL: Interval = {};

function within(version: number[], interval: Interval): boolean {
  if (interval.min) {
    const c = compare(version, interval.min);
    if (c < 0 || (c === 0 && interval.minInclusive === false)) return false;
  }
  if (interval.max) {
    const c = compare(version, interval.max);
    if (c > 0 || (c === 0 && !interval.maxInclusive)) return false;
  }
  return true;
}

/** The known versions a rule allows, in the known list's order. */
export function matchVersions(
  rule: VersionRule,
  known: readonly string[],
): string[] {
  if (rule.kind === "exact")
    return known.filter((id) => rule.versions.includes(id));
  return known.filter((id) => {
    const version = parseVersion(id);
    return (
      version !== null &&
      rule.intervals.some((interval) => within(version, interval))
    );
  });
}

/**
 * The numbers given ("1.21" → [1, 21]), and whether an x or * stands for the rest
 * ("1.21.x"). Fabric reads a bare "1.21" as exactly 1.21, so only a wildcard makes
 * a range.
 */
function partial(
  text: string,
): { parts: number[]; given: number; wildcard: boolean } | null {
  const pieces = text.replace(/^v/, "").split("-")[0]?.split(".") ?? [];
  const parts: number[] = [];
  let wildcard = false;
  for (const piece of pieces.slice(0, 3)) {
    if (piece === "x" || piece === "X" || piece === "*") {
      wildcard = true;
      break;
    }
    if (!/^\d+$/.test(piece)) return null;
    parts.push(Number(piece));
  }
  return { parts, given: parts.length, wildcard };
}

/** The interval just past a prefix: 1.21 → <1.22, 1 → <2. */
function after(parts: number[]): number[] {
  const next = [...parts];
  const last = next.length - 1;
  next[last] = (next[last] ?? 0) + 1;
  return next;
}

/**
 * Ranges longer than this aren't read (real ones are a few dozen characters). The
 * text comes from uploaded files, so parsing also avoids regexes that can backtrack.
 */
export const MAX_RANGE_LENGTH = 256;

/** Comparison operators, longest first so ">=" isn't read as ">". */
const OPERATORS = [">=", "<=", ">", "<", "=", "~", "^"] as const;

/** One npm-style comparator ("~1.21.4", ">=1.20", "1.21.x") as an interval. */
function comparator(text: string): Interval | null {
  const trimmed = text.trim();
  const op = OPERATORS.find((candidate) => trimmed.startsWith(candidate)) ?? "";
  const value = trimmed.slice(op.length).trimStart();
  if (!value) return null;
  if (value === "*" || value === "x") return ALL;
  const version = partial(value);
  if (!version) return null;
  const { parts, given, wildcard } = version;
  if (given === 0) return ALL;
  switch (op) {
    case ">=":
      return { min: parts, minInclusive: true };
    case ">":
      return wildcard
        ? { min: after(parts), minInclusive: true }
        : { min: parts, minInclusive: false };
    case "<=":
      return wildcard
        ? { max: after(parts), maxInclusive: false }
        : { max: parts, maxInclusive: true };
    case "<":
      return { max: parts, maxInclusive: false };
    case "~":
      // ~1.21.4 and ~1.21: within 1.21; ~1: within 1.
      return {
        min: parts,
        minInclusive: true,
        max: after(parts.slice(0, Math.min(given, 2))),
        maxInclusive: false,
      };
    case "^":
      return {
        min: parts,
        minInclusive: true,
        max: after(parts.slice(0, 1)),
        maxInclusive: false,
      };
    default:
      // "1.21.4" or "1.21" exactly; "1.21.x": the whole line.
      return !wildcard
        ? { min: parts, minInclusive: true, max: parts, maxInclusive: true }
        : {
            min: parts,
            minInclusive: true,
            max: after(parts),
            maxInclusive: false,
          };
  }
}

function intersect(a: Interval, b: Interval): Interval {
  const out: Interval = { ...a };
  if (b.min && (!out.min || compare(b.min, out.min) > 0)) {
    out.min = b.min;
    out.minInclusive = b.minInclusive;
  }
  if (b.max && (!out.max || compare(b.max, out.max) < 0)) {
    out.max = b.max;
    out.maxInclusive = b.maxInclusive;
  }
  return out;
}

/**
 * An npm-style range, as Fabric and Quilt write them: "||" alternatives of
 * space-separated comparators. Also takes a list (any of them).
 */
export function semverRule(
  range: string | readonly string[],
): VersionRule | null {
  const list = typeof range === "string" ? [range] : range;
  if (list.some((part) => part.length > MAX_RANGE_LENGTH)) return null;
  const alternatives = list.flatMap((part) => part.split("||"));
  const intervals: Interval[] = [];
  for (const alternative of alternatives) {
    // "1.20 - 1.21" (a hyphen range).
    const hyphen = /^\s*(\S+)\s+-\s+(\S+)\s*$/.exec(alternative);
    const comparators = hyphen
      ? [`>=${hyphen[1] ?? ""}`, `<=${hyphen[2] ?? ""}`]
      : alternative
          .replace(/(>=|<=|>|<|=|~|\^)\s+/g, "$1")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
    if (comparators.length === 0) continue;
    let interval: Interval = ALL;
    let valid = true;
    for (const text of comparators) {
      const part = comparator(text);
      if (!part) {
        valid = false;
        break;
      }
      interval = intersect(interval, part);
    }
    if (valid) intervals.push(interval);
  }
  return intervals.length > 0 ? { kind: "intervals", intervals } : null;
}

/** Where the first of `chars` is in `text`, from `from` (-1: nowhere). */
function firstOf(text: string, chars: string, from: number): number {
  for (let i = from; i < text.length; i++)
    if (chars.includes(text[i] ?? "")) return i;
  return -1;
}

/** A Maven range, as Forge and NeoForge write them: "[1.20.1,1.21)", "[1.21.1]". */
export function mavenRule(range: string): VersionRule | null {
  if (range.length > MAX_RANGE_LENGTH) return null;
  const intervals: Interval[] = [];
  let matched = false;
  // Each "[low,high)" in turn: find the bracket that opens it and the one that
  // closes it, then split what's between at its comma.
  let at = 0;
  for (;;) {
    const start = firstOf(range, "[(", at);
    if (start < 0) break;
    const end = firstOf(range, "])", start + 1);
    if (end < 0) break;
    at = end + 1;
    const pieces = range.slice(start + 1, end).split(",");
    if (pieces.length > 2) continue;
    matched = true;
    const open = range[start];
    const close = range[end];
    const low = pieces[0]?.trim() ?? "";
    const high = pieces.length === 2 ? (pieces[1]?.trim() ?? "") : undefined;
    const lowParts = low
      ? (parseVersion(low) ?? partial(low)?.parts)
      : undefined;
    // "[1.21.1]": exactly one version.
    if (high === undefined) {
      if (!lowParts) return null;
      intervals.push({
        min: lowParts,
        minInclusive: true,
        max: lowParts,
        maxInclusive: true,
      });
      continue;
    }
    const highParts = high
      ? (parseVersion(high) ?? partial(high)?.parts)
      : undefined;
    intervals.push({
      ...(lowParts ? { min: lowParts, minInclusive: open === "[" } : {}),
      ...(highParts ? { max: highParts, maxInclusive: close === "]" } : {}),
    });
  }
  if (!matched) {
    // A bare version is Maven's "soft" requirement: that version.
    const exact = parseVersion(range);
    return exact
      ? {
          kind: "intervals",
          intervals: [
            { min: exact, minInclusive: true, max: exact, maxInclusive: true },
          ],
        }
      : null;
  }
  return intervals.length > 0 ? { kind: "intervals", intervals } : null;
}

/** This version and every later one (a plugin's api-version). */
export function atLeast(id: string): VersionRule | null {
  const parts = partial(id)?.parts;
  if (!parts || parts.length === 0) return null;
  return { kind: "intervals", intervals: [{ min: parts, minInclusive: true }] };
}

/** One line: "1.21" → 1.21, 1.21.1, … */
export function line(id: string): VersionRule | null {
  return semverRule(`${id}.x`);
}

// --- Pack formats and data versions ------------------------------------------------

/**
 * Resource pack formats → the versions that read them (first, last). From the
 * Minecraft wiki; newer formats are added as they're known. Unknown formats give no
 * hint rather than a wrong one.
 */
export const RESOURCE_PACK_FORMATS: Readonly<Record<number, [string, string]>> =
  {
    1: ["1.6.1", "1.8.9"],
    2: ["1.9", "1.10.2"],
    3: ["1.11", "1.12.2"],
    4: ["1.13", "1.14.4"],
    5: ["1.15", "1.16.1"],
    6: ["1.16.2", "1.16.5"],
    7: ["1.17", "1.17.1"],
    8: ["1.18", "1.18.2"],
    9: ["1.19", "1.19.2"],
    12: ["1.19.3", "1.19.3"],
    13: ["1.19.4", "1.19.4"],
    15: ["1.20", "1.20.1"],
    18: ["1.20.2", "1.20.2"],
    22: ["1.20.3", "1.20.4"],
    32: ["1.20.5", "1.20.6"],
    34: ["1.21", "1.21.1"],
    42: ["1.21.2", "1.21.3"],
    46: ["1.21.4", "1.21.4"],
    55: ["1.21.5", "1.21.5"],
  };

/** Data pack formats, the same way. */
export const DATA_PACK_FORMATS: Readonly<Record<number, [string, string]>> = {
  4: ["1.13", "1.14.4"],
  5: ["1.15", "1.16.1"],
  6: ["1.16.2", "1.16.5"],
  7: ["1.17", "1.17.1"],
  8: ["1.18", "1.18.1"],
  9: ["1.18.2", "1.18.2"],
  10: ["1.19", "1.19.3"],
  12: ["1.19.4", "1.19.4"],
  15: ["1.20", "1.20.1"],
  18: ["1.20.2", "1.20.2"],
  26: ["1.20.3", "1.20.4"],
  41: ["1.20.5", "1.20.6"],
  48: ["1.21", "1.21.1"],
  57: ["1.21.2", "1.21.3"],
  61: ["1.21.4", "1.21.4"],
  71: ["1.21.5", "1.21.5"],
};

/** The versions a span of pack formats covers (formats we don't know are skipped). */
export function packFormatRule(
  table: Readonly<Record<number, [string, string]>>,
  min: number,
  max = min,
): VersionRule | null {
  const intervals: Interval[] = [];
  for (const [format, [first, last]] of Object.entries(table)) {
    const n = Number(format);
    if (n < min || n > max) continue;
    const low = parseVersion(first);
    const high = parseVersion(last);
    if (low && high)
      intervals.push({
        min: low,
        minInclusive: true,
        max: high,
        maxInclusive: true,
      });
  }
  return intervals.length > 0 ? { kind: "intervals", intervals } : null;
}

/**
 * Data versions (the number every Java save and schematic carries) of releases, so a
 * build made in a version can be named. Each entry: the version's data version.
 */
export const DATA_VERSIONS: readonly [string, number][] = [
  ["1.21.5", 4325],
  ["1.21.4", 4189],
  ["1.21.3", 4082],
  ["1.21.2", 4080],
  ["1.21.1", 3955],
  ["1.21", 3953],
  ["1.20.6", 3839],
  ["1.20.5", 3837],
  ["1.20.4", 3700],
  ["1.20.3", 3698],
  ["1.20.2", 3578],
  ["1.20.1", 3465],
  ["1.20", 3463],
  ["1.19.4", 3337],
  ["1.19.3", 3218],
  ["1.19.2", 3120],
  ["1.19.1", 3117],
  ["1.19", 3105],
  ["1.18.2", 2975],
  ["1.18.1", 2865],
  ["1.18", 2860],
  ["1.17.1", 2730],
  ["1.17", 2724],
  ["1.16.5", 2586],
  ["1.16.4", 2584],
  ["1.16.3", 2580],
  ["1.16.2", 2578],
  ["1.16.1", 2567],
  ["1.16", 2566],
  ["1.15.2", 2230],
  ["1.14.4", 1976],
  ["1.13.2", 1631],
  ["1.12.2", 1343],
];

/** The release a data version belongs to; null when it's newer than the table. */
export function versionOfData(dataVersion: number): string | null {
  const newest = DATA_VERSIONS[0];
  if (!newest || dataVersion > newest[1]) return null;
  return DATA_VERSIONS.find(([, n]) => n <= dataVersion)?.[0] ?? null;
}
