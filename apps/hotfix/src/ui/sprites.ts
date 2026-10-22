/**
 * Pixel art, one string per row. `#` ink, `o` accent, `p` paper, `m` muted, `h` a
 * hairline grey, `.` nothing. Colours come from the site's tokens when drawn, so
 * every sprite works in both themes.
 *
 * The robot is our own, and kept plain: a block with an orange visor, on two legs.
 */
import type { AccessoryId } from "../core";

export type Sprite = readonly string[];

const ROBOT_TOP = [
  "...##########...",
  "..############..",
  "..######oooooo..",
  "..######oooooo..",
  "..############..",
  "...##########...",
  "....########....",
  "...##########...",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "...##########...",
  "....##....##....",
] as const;

export const ROBOT_RUN_A: Sprite = [
  ...ROBOT_TOP,
  "...##......##...",
  "...##......##...",
  "..###......###..",
  "................",
];

export const ROBOT_RUN_B: Sprite = [
  ...ROBOT_TOP,
  ".....##..##.....",
  ".....##..##.....",
  "....###..###....",
  "................",
];

export const ROBOT_JUMP: Sprite = [
  ...ROBOT_TOP.slice(0, -1),
  "...###....###...",
  "...##......##...",
  "................",
  "................",
  "................",
];

export const ROBOT_SLIDE: Sprite = [
  "..........##########",
  ".........#######oooo",
  ".........#######oooo",
  "...################.",
  "..#################.",
  ".##################.",
  ".##################.",
  "..################..",
  "...##.........##....",
  "...##.........##....",
];

export const ROBOT_CRASH: Sprite = [
  "...##########...",
  "..############..",
  "..######mmmmmm..",
  "..######mmmmmm..",
  "..############..",
  "...##########...",
  "....########....",
  "...##########...",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "...##########...",
  "....##....##....",
  "...##......##...",
  "..##........##..",
  ".###........###.",
  "................",
];

export const BUG_A: Sprite = [
  "..#........#..",
  "...#......#...",
  "....######....",
  "..##########..",
  ".##p####p####.",
  "##############",
  ".############.",
  "..##########..",
  ".#.#.#..#.#.#.",
  "#.#.#....#.#.#",
];

export const BUG_B: Sprite = [
  "...#......#...",
  "..#........#..",
  "....######....",
  "..##########..",
  ".##p####p####.",
  "##############",
  ".############.",
  "..##########..",
  "#.#.#....#.#.#",
  ".#.#.#..#.#.#.",
];

export const DRONE_A: Sprite = [
  "###....##....###",
  ".......##.......",
  "...##########...",
  "..############..",
  "..#oooooooooo#..",
  "..############..",
  "...##########...",
  "....#......#....",
  "...#........#...",
  "................",
];

export const DRONE_B: Sprite = [
  ".##....##....##.",
  ".......##.......",
  "...##########...",
  "..############..",
  "..#oooo##oooo#..",
  "..############..",
  "...##########...",
  "....#......#....",
  "....#......#....",
  "................",
];

export const TOKEN: Sprite = [
  "..ooo..",
  ".ooooo.",
  "oo###oo",
  "ooo#ooo",
  "ooo#ooo",
  ".oo#oo.",
  "..ooo..",
];

const POWER_FRAME_TOP = "############";
const POWER_FRAME_SIDE = (inner: string) => `#${inner}#`;

function framed(inner: readonly string[]): Sprite {
  return [POWER_FRAME_TOP, ...inner.map(POWER_FRAME_SIDE), POWER_FRAME_TOP];
}

/** /compact: an hourglass, for slow motion. */
export const POWER_COMPACT: Sprite = framed([
  "pppppppppp",
  "poooooooop",
  "ppoooooopp",
  "pppooooppp",
  "ppppoopppp",
  "ppppoopppp",
  "pppooooppp",
  "ppoooooopp",
  "poooooooop",
  "pppppppppp",
]);

/** The context shield. */
export const POWER_SHIELD: Sprite = framed([
  "pppppppppp",
  "poooooooop",
  "poooooooop",
  "poooooooop",
  "poooooooop",
  "ppoooooopp",
  "ppoooooopp",
  "pppooooppp",
  "ppppoopppp",
  "pppppppppp",
]);

/** The token magnet. */
export const POWER_MAGNET: Sprite = framed([
  "pppppppppp",
  "pmmppppmmp",
  "pmmppppmmp",
  "pooppppoop",
  "pooppppoop",
  "pooppppoop",
  "poooooooop",
  "ppoooooopp",
  "pppppppppp",
  "pppppppppp",
]);

/** Pixel digits, 3×5, for the 404 at the bottom of a gap. */
export const DIGITS: Readonly<Record<"0" | "4", Sprite>> = {
  "0": ["mmm", "m.m", "m.m", "m.m", "mmm"],
  "4": ["m.m", "m.m", "mmm", "..m", "..m"],
};

/** A small cloud for the cloud biome. */
export const CLOUD: Sprite = [
  ".......hhhh.........",
  ".....hhhhhhhh.......",
  "..hhhhhhhhhhhhhh....",
  ".hhhhhhhhhhhhhhhhhh.",
  "hhhhhhhhhhhhhhhhhhhh",
];

/** A flame for Production, two frames. */
export const FLAME_A: Sprite = [
  "...o....",
  "..oo..o.",
  "..ooo.oo",
  ".ooooooo",
  "oooo#ooo",
  "ooo##ooo",
  ".oo##oo.",
];

export const FLAME_B: Sprite = [
  "....o...",
  ".o..oo..",
  "oo.ooo..",
  "ooooooo.",
  "ooo#oooo",
  "ooo##ooo",
  ".oo##oo.",
];

export function spriteWidth(sprite: Sprite): number {
  return Math.max(...sprite.map((row) => row.length));
}

/**
 * Accessories, drawn over the robot's head. `dx`/`dy` place the sprite against the
 * head's top-left corner (rows above the head are negative). Ink and accent only.
 */
export interface AccessoryArt {
  sprite: Sprite;
  dx: number;
  dy: number;
}

export const ACCESSORY_ART: Readonly<Record<AccessoryId, AccessoryArt>> = {
  cap: {
    dx: 0,
    dy: -3,
    sprite: ["..########....", ".##########...", ".#############"],
  },
  antenna: {
    dx: 4,
    dy: -5,
    sprite: [".o.", "ooo", ".o.", ".#.", ".#."],
  },
  headphones: {
    dx: -1,
    dy: -3,
    sprite: [
      "....######....",
      "...#......#...",
      "..#........#..",
      ".#..........#.",
      "oo..........oo",
      "oo..........oo",
      "oo..........oo",
    ],
  },
  halo: {
    dx: 1,
    dy: -6,
    sprite: ["..oooooo..", ".o......o.", "..oooooo.."],
  },
  "party-hat": {
    dx: 2,
    dy: -8,
    sprite: [
      "....#....",
      "...ooo...",
      "...o#o...",
      "..ooooo..",
      "..o#o#o..",
      ".ooooooo.",
      ".o#o#o#o.",
      "ooooooooo",
    ],
  },
  crown: {
    dx: 1,
    dy: -5,
    sprite: [
      ".o...o...o.",
      ".oo.ooo.oo.",
      ".ooooooooo.",
      ".o#ooooo#o.",
      ".ooooooooo.",
    ],
  },
};
