import { pick, random } from "./rng";
import type { BiomeId, ObstacleKind, PickupKind, PowerKind } from "./types";

/** The rules' version: a replay made under other numbers wouldn't replay the same. */
export const RULES_VERSION = 1;

/** Steps per second. Every number below is per second and scaled by DT. */
export const FPS = 60;
export const DT = 1 / FPS;

// The screen, in course pixels.
export const VIEW_W = 480;
export const VIEW_H = 160;
export const GROUND_Y = 136;
export const PIXELS_PER_METRE = 10;

// The robot.
export const PLAYER_X = 56;
export const PLAYER_W = 14;
export const PLAYER_H = 18;
export const SLIDE_W = 18;
export const SLIDE_H = 10;

// Movement (px/s, px/s²).
export const GRAVITY = 1700;
export const JUMP_V = -480;
/** Letting go of the key early caps the rise here: a short hop. */
export const JUMP_CUT = -200;
export const DOUBLE_JUMP_V = -400;
/** Holding down in the air falls this many times faster. */
export const FAST_FALL = 2.6;
export const JUMP_BUFFER = 8;
export const COYOTE = 5;
/** How far below the ground line a fall ends the run. */
export const PIT_DEPTH = 10;

// The course.
export const SPEED_START = 240;
export const SPEED_MAX = 560;
export const ACCEL = 3;
export const BUG_SPEED = 30;
/** Pixels of open floor before the first obstacle. */
export const RUNWAY = 560;
export const MIN_SPACING = 150;

// Pickups.
export const TOKEN_POINTS = 10;
export const COMPACT_FRAMES = 5 * FPS;
export const COMPACT_FACTOR = 0.6;
export const MAGNET_FRAMES = 8 * FPS;
export const MAGNET_RANGE = 110;
export const SHIELD_SAFE_FRAMES = 45;
export const SHIELD_BOUNCE_V = -560;
export const POWER_EVERY: readonly [number, number] = [4000, 8000];
export const MILESTONE_METRES = 500;

export const POWERS: Readonly<
  Record<PowerKind, { name: string; summary: string }>
> = {
  compact: {
    name: "/compact",
    summary: "Clears some room: the world slows down for five seconds.",
  },
  shield: {
    name: "Context shield",
    summary: "Takes one hit, or bounces you out of one gap.",
  },
  magnet: {
    name: "Token magnet",
    summary: "Pulls nearby tokens in for eight seconds.",
  },
};

export const CRASH_LINES: Readonly<Record<ObstacleKind, string>> = {
  bug: "Ran into a bug",
  stack: "Crashed into a stack trace",
  drone: "Clipped a drone",
  gap: "Fell through a 404",
};

/** The shapes a pattern can be built from. */
export type PatternId =
  | "bug"
  | "bugs"
  | "stack"
  | "tall-stack"
  | "drone-low"
  | "drone-mid"
  | "drone-high"
  | "drone-over-bug"
  | "gap"
  | "wide-gap"
  | "conflict"
  | "tokens";

export interface Biome {
  id: BiomeId;
  name: string;
  /** Where it starts. */
  fromMetres: number;
  /** One line for the banner. */
  line: string;
  patterns: readonly (readonly [PatternId, number])[];
}

export const BIOMES: readonly Biome[] = [
  {
    id: "terminal",
    name: "Terminal",
    fromMetres: 0,
    line: "A blinking cursor and a long way to go.",
    patterns: [
      ["bug", 3],
      ["stack", 3],
      ["gap", 1],
      ["tokens", 1],
    ],
  },
  {
    id: "server-room",
    name: "Server room",
    fromMetres: 1000,
    line: "Racks hum. Drones patrol the aisles.",
    patterns: [
      ["bug", 2],
      ["bugs", 1],
      ["stack", 2],
      ["tall-stack", 2],
      ["drone-low", 2],
      ["drone-mid", 2],
      ["drone-high", 1],
      ["gap", 1],
    ],
  },
  {
    id: "cloud",
    name: "The cloud",
    fromMetres: 2000,
    line: "Mind the gaps between the availability zones.",
    patterns: [
      ["gap", 2],
      ["wide-gap", 2],
      ["drone-mid", 2],
      ["drone-over-bug", 1],
      ["tall-stack", 2],
      ["bugs", 1],
      ["drone-low", 1],
    ],
  },
  {
    id: "production",
    name: "Production",
    fromMetres: 3000,
    line: "Everything is on fire. Ship it.",
    patterns: [
      ["conflict", 3],
      ["wide-gap", 2],
      ["drone-over-bug", 1],
      ["drone-mid", 2],
      ["bugs", 2],
      ["tall-stack", 1],
      ["drone-low", 1],
    ],
  },
];

export function biomeAt(metres: number): Biome {
  let found = BIOMES[0];
  for (const biome of BIOMES) if (metres >= biome.fromMetres) found = biome;
  if (!found) throw new Error("No biomes");
  return found;
}

export function biomeById(id: BiomeId): Biome {
  const found = BIOMES.find((biome) => biome.id === id);
  if (!found) throw new Error(`Unknown biome ${id}`);
  return found;
}

/** One thing in a pattern, placed `dx` pixels after its start. */
export type Piece =
  | {
      kind: ObstacleKind;
      dx: number;
      w: number;
      h: number;
      /** Drones: how far their underside is above the ground. */
      lift?: number;
    }
  | { kind: PickupKind; dx: number; lift: number };

export interface Pattern {
  pieces: Piece[];
  /** Pixels from its start to its end. */
  length: number;
}

// Drone heights (their underside above the ground). Low: jump over it. Mid: too
// low to run under standing, high enough to slide under. High: run under it, and
// don't jump into it.
export const DRONE_LIFT = { low: 4, mid: 12, high: 44 } as const;
export const DRONE_W = 16;
export const DRONE_H = 10;
export const BUG_W = 14;
export const BUG_H = 10;
export const STACK_W = 10;

/** A token arc's heights, one every ARC_STEP pixels, to follow over a jump. */
const ARC = [16, 30, 40, 44, 40, 30, 16] as const;
const ARC_STEP = 16;

function arcOver(centre: number): Piece[] {
  const start = centre - ((ARC.length - 1) * ARC_STEP) / 2;
  return ARC.map((lift, index) => ({
    kind: "token" as const,
    dx: start + index * ARC_STEP,
    lift,
  }));
}

interface Rng {
  seed: number;
}

function between(rng: Rng, low: number, high: number): number {
  return Math.round(low + random(rng) * (high - low));
}

function drone(dx: number, lift: number): Piece {
  return { kind: "drone", dx, w: DRONE_W, h: DRONE_H, lift };
}

function stack(dx: number, h: number): Piece {
  return { kind: "stack", dx, w: STACK_W, h };
}

function bug(dx: number): Piece {
  return { kind: "bug", dx, w: BUG_W, h: BUG_H };
}

/** Builds one pattern. Arcs of tokens sometimes hang over the jumps. */
export function buildPattern(id: PatternId, rng: Rng, speed: number): Pattern {
  const withArc = (pattern: Pattern, centre: number): Pattern =>
    random(rng) < 0.35
      ? { ...pattern, pieces: [...pattern.pieces, ...arcOver(centre)] }
      : pattern;

  switch (id) {
    case "bug":
      return withArc({ pieces: [bug(0)], length: BUG_W }, BUG_W / 2);
    case "bugs": {
      const apart = between(rng, 26, 40);
      return { pieces: [bug(0), bug(apart)], length: apart + BUG_W };
    }
    case "stack": {
      const h = between(rng, 14, 22);
      return withArc({ pieces: [stack(0, h)], length: STACK_W }, STACK_W / 2);
    }
    case "tall-stack":
      return withArc(
        { pieces: [stack(0, between(rng, 26, 32))], length: STACK_W },
        STACK_W / 2,
      );
    case "drone-low":
      return { pieces: [drone(0, DRONE_LIFT.low)], length: DRONE_W };
    case "drone-mid":
      return { pieces: [drone(0, DRONE_LIFT.mid)], length: DRONE_W };
    case "drone-high":
      return { pieces: [drone(0, DRONE_LIFT.high)], length: DRONE_W };
    case "drone-over-bug":
      // A short hop clears the bug and stays under the drone.
      return {
        pieces: [bug(0), drone(-1, DRONE_LIFT.high)],
        length: DRONE_W,
      };
    case "gap": {
      const w = between(rng, 28, 44);
      return withArc(
        {
          pieces: [{ kind: "gap", dx: 0, w, h: VIEW_H - GROUND_Y }],
          length: w,
        },
        w / 2,
      );
    }
    case "wide-gap": {
      const w = between(rng, 52, 72);
      return withArc(
        {
          pieces: [{ kind: "gap", dx: 0, w, h: VIEW_H - GROUND_Y }],
          length: w,
        },
        w / 2,
      );
    }
    case "conflict": {
      // Two stack traces close enough for one long jump (or a double jump).
      const apart = Math.round(Math.min(90, Math.max(44, speed * 0.17)));
      const h = between(rng, 16, 24);
      return {
        pieces: [stack(0, h), stack(apart, between(rng, 16, 24))],
        length: apart + STACK_W,
      };
    }
    case "tokens": {
      const count = between(rng, 4, 6);
      return {
        pieces: Array.from({ length: count }, (_, index) => ({
          kind: "token" as const,
          dx: index * ARC_STEP,
          lift: 8,
        })),
        length: (count - 1) * ARC_STEP,
      };
    }
  }
}

/** The next pattern for this stretch of the course. */
export function nextPattern(rng: Rng, biome: Biome, speed: number): Pattern {
  return buildPattern(pick(rng, biome.patterns), rng, speed);
}

/** A lone power-up, floating at jumping height. */
export function powerPattern(rng: Rng): Pattern {
  const kind = pick<PowerKind>(rng, [
    ["shield", 2],
    ["compact", 2],
    ["magnet", 1],
  ]);
  return { pieces: [{ kind, dx: 0, lift: 30 }], length: 12 };
}

/** Open floor after a pattern: about 0.75–1.35 seconds of running. */
export function spacing(rng: Rng, speed: number): number {
  return Math.max(MIN_SPACING, speed * (0.75 + random(rng) * 0.6));
}
