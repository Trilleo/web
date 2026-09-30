/** Everything the engine keeps and exchanges. Plain JSON, so saves and syncs are easy. */

export type Dir = "U" | "D" | "L" | "R";

export const SKILLS = ["farming", "mining", "foraging", "fishing"] as const;
export type SkillId = (typeof SKILLS)[number];

export const ISLANDS = ["home", "hub", "forest", "mines", "shore"] as const;
export type IslandId = (typeof ISLANDS)[number];

export type ItemId = string;

export interface Position {
  island: IslandId;
  x: number;
  y: number;
}

/** A minion on a slot of your island, working since `lastAt`. */
export interface PlacedMinion {
  /** The resource it makes (see content/minions.ts). */
  kind: ItemId;
  tier: number;
  stored: number;
  /** When its next item started: it makes one every interval after this. */
  lastAt: number;
}

export interface Fishing {
  x: number;
  y: number;
  /** When the fish bites: reel in within REEL_WINDOW_MS of it. */
  biteAt: number;
}

export interface GameState {
  /** Save format version (see save.ts). */
  v: 1;
  /** The random generator's state: drops and bites are replayable. */
  seed: number;
  /** The time the world was last brought up to (ms since the epoch). */
  now: number;
  createdAt: number;
  coins: number;
  pos: Position;
  /** Busy gathering until then: no other action before it. */
  busyUntil: number;
  lastMoveAt: number;
  inventory: Record<ItemId, number>;
  /** XP per skill. */
  skills: Record<SkillId, number>;
  /** How many of each resource you've ever gathered (or your minions made). */
  collections: Record<ItemId, number>;
  /** Your island's minion slots, in reading order. */
  minions: (PlacedMinion | null)[];
  /** Gathered nodes, per island: "x,y" → when they grow back. */
  depleted: Partial<Record<IslandId, Record<string, number>>>;
  fishing: Fishing | null;
}

/** One thing the player did. `t` is when it started (ms since the epoch). */
export type Action =
  | { t: number; k: "move"; d: Dir }
  | { t: number; k: "gather"; x: number; y: number }
  | { t: number; k: "cast"; x: number; y: number }
  | { t: number; k: "reel" }
  | { t: number; k: "craft"; recipe: string; times: number }
  | { t: number; k: "sell"; item: ItemId; n: number }
  | { t: number; k: "buy"; item: ItemId; n: number }
  | { t: number; k: "place"; slot: number; item: ItemId }
  | { t: number; k: "collect"; slot: number }
  | { t: number; k: "pickup"; slot: number };

/** What happened, for the log and the floating "+3 Wheat". */
export type GameEvent =
  | { type: "gain"; item: ItemId; n: number }
  | { type: "lose"; item: ItemId; n: number }
  | { type: "coins"; n: number }
  | { type: "xp"; skill: SkillId; n: number }
  | { type: "level"; skill: SkillId; level: number; coins: number }
  | { type: "collection"; item: ItemId; tier: number; coins: number }
  | { type: "travel"; to: IslandId }
  | { type: "note"; text: string };

export interface Step {
  state: GameState;
  events: GameEvent[];
}

/** An action the rules don't allow: the message is fit to show the player. */
export class GameRuleError extends Error {
  override name = "GameRuleError";
}
