/** The stretches of the course, in order: each has its own scenery and obstacles. */
export type BiomeId = "terminal" | "server-room" | "cloud" | "production";

/**
 * Things in the way. Bugs scuttle along the ground, stack traces stand on it, drones
 * fly at one of three heights, and gaps are holes in the floor.
 */
export type ObstacleKind = "bug" | "stack" | "drone" | "gap";

/** Pickups that change the run for a while. */
export type PowerKind = "compact" | "shield" | "magnet";

export type PickupKind = "token" | PowerKind;

/** What ended a run. */
export type CrashCause = ObstacleKind;

/**
 * Everything the player does. Each key has a press and a release, so how long the
 * jump key is held is part of the record (it sets the jump's height).
 */
export type Input = "jump" | "jump-end" | "down" | "down-end";

/** One input, applied just before step `f` (the run's frame count at the time). */
export interface LoggedInput {
  f: number;
  i: Input;
}

/**
 * Positions are in course pixels on a VIEW_W × VIEW_H screen, y growing downwards.
 * Things move left past a player who stays at PLAYER_X.
 */
export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  /** Top edge. Gaps start at the ground line and run to the bottom. */
  y: number;
  w: number;
  h: number;
  /** Knocked aside by a shield: drawn tumbling, no longer in the way. */
  hit: boolean;
  /** Behind the robot, cleared without a hit (counted once). */
  passed: boolean;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  /** Centre, so magnets can pull it along a straight line. */
  y: number;
}

export interface Player {
  /** Feet: GROUND_Y when standing, more when falling into a gap. */
  y: number;
  vy: number;
  onGround: boolean;
  sliding: boolean;
  /** Jumps left before landing again (the double jump). */
  airJumps: number;
  /** Frames a jump press is remembered for, so one pressed just before landing counts. */
  jumpBuffer: number;
  /** Frames after running off an edge in which a jump still works. */
  coyote: number;
  /** Frames left of not being hurt, after a shield breaks. */
  safe: number;
}

export interface Powers {
  /** Frames left of slow motion. */
  compact: number;
  /** Frames left of pulling tokens in. */
  magnet: number;
  /** Takes one hit. */
  shield: boolean;
}

/** Something that happened during a step, for the screen to show. */
export type RunEvent =
  | { type: "jump" }
  | { type: "double-jump" }
  | { type: "land" }
  | { type: "token"; x: number; y: number }
  | { type: "power"; kind: PowerKind }
  | { type: "shield-break" }
  | { type: "biome"; biome: BiomeId }
  | { type: "milestone"; metres: number }
  | { type: "crash"; cause: CrashCause };

/** Counts kept during a run, for achievements. They never change how it plays. */
export interface RunStats {
  jumps: number;
  doubleJumps: number;
  slides: number;
  powers: number;
  /** Hits a shield took. */
  shields: number;
  /** Obstacles left behind (gaps jumped included). */
  cleared: number;
}

/** One run, from the first step to the crash. Mutated in place by the engine. */
export interface RunState {
  /** Version of the rules, for replays. */
  v: number;
  /** The generator's state; starts as the run's seed. */
  seed: number;
  frame: number;
  /** Course pixels travelled (ten to the metre). */
  distance: number;
  /** Pixels per second before slow motion. */
  speed: number;
  tokens: number;
  alive: boolean;
  cause: CrashCause | null;
  biome: BiomeId;
  player: Player;
  powers: Powers;
  held: { jump: boolean; down: boolean };
  obstacles: Obstacle[];
  pickups: Pickup[];
  /** Pixels until the next pattern of obstacles. */
  spawnIn: number;
  /** Pixels until a power-up may appear. */
  powerIn: number;
  nextId: number;
  stats: RunStats;
  /** What the last step did. */
  events: RunEvent[];
}
