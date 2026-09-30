/** What the world looks like right now, as characters and tones (pure, so tested). */
import {
  ISLAND_MAPS,
  isDepleted,
  islandOf,
  minionCapacity,
  tileKind,
  type GameState,
} from "../core";
import type { Busy } from "./session";

/**
 * How a cell is drawn. The accent is only ever a background (with dark text on
 * it): orange text on the light paper is too faint to read.
 */
export type Tone = "dim" | "ink" | "strong" | "mark";

export interface Drawing {
  width: number;
  height: number;
  chars: string[][];
  tones: Tone[][];
}

const DEPLETED = ",";
const MINION = "&";
const BOBBER = "•";

/** Everything drawWorld adds on top of the map (tested to be in Geist Mono). */
export const OVERLAY_GLYPHS = ["@", "!", DEPLETED, MINION, BOBBER] as const;

function baseTone(char: string): Tone {
  switch (tileKind(char)) {
    case "ground":
    case "water":
    case "slot":
      return "dim";
    case "node":
    case "portal":
    case "merchant":
    case "guide":
      return "strong";
    default:
      return "ink";
  }
}

export function drawWorld(
  state: GameState,
  busy: Busy | null,
  now: number,
): Drawing {
  const island = islandOf(state);
  const chars = island.grid.map((row) => [...row]);
  // Tones follow the rules' view of a tile: a sign's "T" isn't a tree.
  const tones = island.tiles.map((row) => row.map(baseTone));
  const set = (x: number, y: number, char: string, tone: Tone) => {
    const row = chars[y];
    const toneRow = tones[y];
    if (!row || !toneRow || x < 0 || x >= row.length) return;
    row[x] = char;
    toneRow[x] = tone;
  };

  island.tiles.forEach((row, y) => {
    row.forEach((char, x) => {
      if (tileKind(char) === "node" && isDepleted(state, x, y)) {
        set(x, y, DEPLETED, "dim");
      }
    });
  });

  if (island.id === "home") {
    ISLAND_MAPS.home.slots.forEach((slot, index) => {
      const minion = state.minions[index];
      if (!minion) return;
      const full = minion.stored >= minionCapacity(minion);
      set(slot.x, slot.y, MINION, full ? "mark" : "strong");
    });
  }

  if (busy) set(busy.x, busy.y, island.grid[busy.y]?.[busy.x] ?? " ", "mark");

  const { fishing } = state;
  if (fishing) {
    const biting = now >= fishing.biteAt;
    set(
      fishing.x,
      fishing.y,
      biting ? "!" : BOBBER,
      biting ? "mark" : "strong",
    );
  }

  set(state.pos.x, state.pos.y, "@", "mark");
  return { width: island.width, height: island.height, chars, tones };
}

/** The part of the world that fits, centred on the player where it can be. */
export function camera(
  size: { width: number; height: number },
  view: { cols: number; rows: number },
  focus: { x: number; y: number },
): { x: number; y: number; cols: number; rows: number } {
  const cols = Math.min(size.width, view.cols);
  const rows = Math.min(size.height, view.rows);
  const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(value, max));
  return {
    x: clamp(focus.x - Math.floor(cols / 2), size.width - cols),
    y: clamp(focus.y - Math.floor(rows / 2), size.height - rows),
    cols,
    rows,
  };
}
