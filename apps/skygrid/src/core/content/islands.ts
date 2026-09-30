import type { IslandId } from "../types";
import { MOBS } from "./combat";
import { NODES } from "./nodes";

/**
 * The islands, drawn in plain ASCII (the grid is set in Geist Mono, which has no
 * symbols beyond it). Legend:
 *   (space) sky         .  grass          :  path          #  rock
 *   @  where a new game starts (grass)   >  portal: walk onto it to travel
 *   M  merchant   ¤  Bazaar   G  guide   _  minion slot   ~  water (fish from the shore)
 *   crops " v o   trees T Y A   ores * % = $ (see nodes.ts)
 *   mobs z s B (see combat.ts)   + gravestone (scenery)
 *   [TEXT] is a sign: scenery, whatever letters it holds.
 * Portals lead, in reading order, to the islands listed in `portals`.
 */
const MAPS: Record<
  IslandId,
  { name: string; map: string; portals: IslandId[] }
> = {
  home: {
    name: "Your Island",
    portals: ["hub"],
    map: String.raw`
             ..........
        ..T.............T..
     ......._...._...._.......T.
    ..T.........................
   ......................._...._..
  ..""""""..........@.........>..[HUB]
   ...............................
    .""""""......T.........T...
      ..........................
         ....................
             ...........`,
  },
  hub: {
    name: "The Hub",
    portals: ["home", "forest", "shore", "mines", "cave"],
    map: String.raw`
                             ~~~~~~~~~~
                  T.T.T    ~~~~~~~~~~~~~~
              T.T...........~~~~~~~~~~~~..
         ..................................T.T...
       ..""""""""....::::::::::::::::::::::.....vvvvvv...
[HOME]>..............:......M.......G.....:...............>[FOREST]
       ..""""""""....:.....¤[BAZAAR]......:.....vvvvvv...
       ..............::::::::::::::::::::::.............
         .....ooo..........................ooo.....>[SHORE]
           ...ooo............>.............ooo.........
              .............[MINES]...........+..z...+..
                   ...........................z.....z..
                         ..............+..z..+....+..z.
                              ..........z......>[SPIDER CAVE]
                                   ...+...z..+...
                                        ......`,
  },
  forest: {
    name: "The Forest",
    portals: ["hub"],
    map: String.raw`
            T.T.T.T.T.T.T
        T.T...............T.T
     T.....T...T...T...T.....Y.Y.Y
   T...T.......................Y...Y.Y
[HUB]>...T...T...T.........Y...Y...Y....
   T...T.........................A.A...A
     T.....T...T...Y...Y.....A...A...A.
        ...........................A.A
           A...A...A...A..........`,
  },
  mines: {
    name: "The Mines",
    portals: ["hub"],
    map: String.raw`
        ####################################
        #***.***.***.%%%.%%%.%%%.####
[HUB]>..........................===.===.##
        #*.*.**.**.%%.%%.%%...=.=.......=#
        #.................%.=.=.===.===.=#
        #**.***.**.%%%.%%...............#
        ######......................$$.$#
             ####.$$.$$$.$$.$$$.$.......#
                 #.......................#
                 ##.$$.$$$.$$.$$$.$$.####
                  ######################`,
  },
  cave: {
    name: "Spider Cave",
    portals: ["hub"],
    map: String.raw`
      ##################################
      #..s....#......s.....#....s......##
[HUB]>......s......s...#.......s.........#
      #...s.......#...........s....###..#
      #......s....#....s...#.......#B...#
      ##....s.........s....#...s.......##
       ##############################`,
  },
  shore: {
    name: "The Shore",
    portals: ["hub"],
    map: String.raw`
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~~~~~~.....~~~~~~~~~~~.....~~~~~~~~~~~~~
 ~~~.................................~~~~
[HUB]>.......................:::::.....~~
  .......T.........T.......:.....T...~
     .............................
         ...................`,
  },
};

/**
 * What the grid may draw. It's set in Geist Mono, which (as self-hosted) covers
 * ASCII and little else: anything outside falls back to another font, wider and
 * not code-like.
 */
export const MONO_GLYPHS = /^[\x20-\x7e•¤]$/u;

/** What a sign's letters count as in the rules (the map still shows the letters). */
const SIGN = "[";

export type TileKind =
  | "sky"
  | "ground"
  | "wall"
  | "portal"
  | "merchant"
  | "bazaar"
  | "guide"
  | "slot"
  | "water"
  | "node"
  | "mob"
  | "sign";

const KINDS: Readonly<Record<string, TileKind>> = {
  " ": "sky",
  ".": "ground",
  ":": "ground",
  "@": "ground",
  "#": "wall",
  ">": "portal",
  M: "merchant",
  "¤": "bazaar",
  G: "guide",
  _: "slot",
  "~": "water",
  [SIGN]: "sign",
};

/** The kind of a tile, from its character in `tiles` (see charAt). */
export function tileKind(char: string): TileKind {
  if (Object.hasOwn(KINDS, char)) return KINDS[char] ?? "sign";
  if (Object.hasOwn(NODES, char)) return "node";
  return Object.hasOwn(MOBS, char) ? "mob" : "sign";
}

export function isWalkable(char: string): boolean {
  const kind = tileKind(char);
  return kind === "ground" || kind === "portal";
}

export const NEIGHBOURS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

export interface Island {
  id: IslandId;
  name: string;
  width: number;
  height: number;
  /** One string per row, padded to `width`; each char is one tile. */
  rows: readonly string[];
  /** What's drawn: the rows split into characters. */
  grid: readonly (readonly string[])[];
  /** What the rules see: the same, but every sign character is "[". */
  tiles: readonly (readonly string[])[];
  portals: readonly { x: number; y: number; to: IslandId }[];
  /** Minion slots, in reading order (only your island has them). */
  slots: readonly { x: number; y: number }[];
  /** Where a new game starts (the `@`), or else the first portal. */
  spawn: { x: number; y: number };
}

function parse(id: IslandId): Island {
  const { name, map, portals: targets } = MAPS[id];
  const lines = map.split("\n").slice(1);
  const width = Math.max(...lines.map((line) => Array.from(line).length));
  const rows: string[] = [];
  const grid: string[][] = [];
  const tiles: string[][] = [];
  const portals: { x: number; y: number; to: IslandId }[] = [];
  const slots: { x: number; y: number }[] = [];
  let spawn: { x: number; y: number } | undefined;
  lines.forEach((line, y) => {
    const chars = Array.from(line.padEnd(width));
    let inSign = false;
    const logic = chars.map((char) => {
      if (char === "[") inSign = true;
      const tile = inSign ? SIGN : char;
      if (char === "]") inSign = false;
      return tile;
    });
    logic.forEach((char, x) => {
      if (char === ">") {
        const to = targets[portals.length];
        if (!to) throw new Error(`${id}: more portals than targets`);
        portals.push({ x, y, to });
      } else if (char === "_") {
        slots.push({ x, y });
      } else if (char === "@") {
        spawn = { x, y };
      }
    });
    const ground = (char: string) => (char === "@" ? "." : char);
    grid.push(chars.map(ground));
    tiles.push(logic.map(ground));
    rows.push(chars.map(ground).join(""));
  });
  if (portals.length !== targets.length) {
    throw new Error(
      `${id}: ${String(portals.length)} portals for ${String(targets.length)} targets`,
    );
  }
  // No `@`: beside the first portal.
  const first = portals[0];
  if (!spawn && first) {
    for (const [dx, dy] of NEIGHBOURS) {
      if (KINDS[tiles[first.y + dy]?.[first.x + dx] ?? " "] === "ground") {
        spawn = { x: first.x + dx, y: first.y + dy };
        break;
      }
    }
  }
  return {
    id,
    name,
    width,
    height: rows.length,
    rows,
    grid,
    tiles,
    portals,
    slots,
    spawn: spawn ?? { x: first?.x ?? 0, y: first?.y ?? 0 },
  };
}

export const ISLAND_MAPS: Readonly<Record<IslandId, Island>> = {
  home: parse("home"),
  hub: parse("hub"),
  forest: parse("forest"),
  mines: parse("mines"),
  shore: parse("shore"),
  cave: parse("cave"),
};

/** The tile's character as the rules see it (signs are "["); sky outside the map. */
export function charAt(island: Island, x: number, y: number): string {
  return island.tiles[y]?.[x] ?? " ";
}

/** Where you arrive on `island` coming from `from`: beside the portal back. */
export function arrivalFrom(
  island: Island,
  from: IslandId,
): { x: number; y: number } {
  const portal = island.portals.find((candidate) => candidate.to === from);
  if (!portal) return island.spawn;
  for (const [dx, dy] of NEIGHBOURS) {
    const x = portal.x + dx;
    const y = portal.y + dy;
    const kind = tileKind(charAt(island, x, y));
    if (kind === "ground") return { x, y };
  }
  return { x: portal.x, y: portal.y };
}
