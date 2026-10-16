/**
 * Pixel icons for Minecraft materials (`bell`, `lime_stained_glass_pane`), drawn
 * for this wiki: small sprites in our own colours, never Mojang's textures. Most
 * come from shape families (a pane, a dye, a banner, a sword…) coloured per
 * material; the rest are drawn one by one. Each renders as an inline SVG on a 16×16
 * grid at most, so it stays crisp at any size and needs no request. A material without a
 * sprite gets a swatch with its first letter.
 */
import { escapeHtml } from "../syntax";

/** Rows of palette characters ("." is transparent), at most 16×16. */
export interface Sprite {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

const SIZE = 16;

/* ---------- colours ---------- */

/** The sixteen dye colours, in our own shades. */
export const DYE_COLORS: Readonly<Record<string, string>> = {
  white: "#eeeeea",
  orange: "#e07b20",
  magenta: "#c24fbd",
  light_blue: "#5ab4e0",
  yellow: "#f2d13a",
  lime: "#7cc627",
  pink: "#ee90ad",
  gray: "#4f5458",
  light_gray: "#9d9d97",
  cyan: "#178a8f",
  purple: "#7d2fb0",
  blue: "#3a45a8",
  brown: "#7a4f2c",
  green: "#556e1c",
  red: "#b02e26",
  black: "#26262b",
};

const DYE_NAMES = Object.keys(DYE_COLORS).join("|");

/** A colour lightened (amount > 0) or darkened (< 0), -1…1. */
function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 0xff, value & 0xff].map(
    (channel) => {
      const next =
        amount >= 0
          ? channel + (255 - channel) * amount
          : channel * (1 + amount);
      return Math.round(Math.min(255, Math.max(0, next)));
    },
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** A stable pseudo-random number in [0, 1) for a pixel, so textures never change. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A sprite drawn by a function of each pixel (16×16). */
function drawn(
  palette: Record<string, string>,
  pixel: (x: number, y: number) => string,
): Sprite {
  const rows: string[] = [];
  for (let y = 0; y < SIZE; y += 1) {
    let row = "";
    for (let x = 0; x < SIZE; x += 1) row += pixel(x, y);
    rows.push(row);
  }
  return { rows, palette };
}

/** A full block face: speckles of a few shades, picked by `weights`. */
function speckled(
  colors: readonly string[],
  seed: number,
  weights: readonly number[] = colors.map(() => 1),
): Sprite {
  const keys = "abcdefgh".slice(0, colors.length);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const palette = Object.fromEntries(
    colors.map((color, index) => [keys[index] ?? "a", color]),
  );
  return drawn(palette, (x, y) => {
    let roll = noise(x, y, seed) * total;
    for (let index = 0; index < colors.length; index += 1) {
      roll -= weights[index] ?? 0;
      if (roll < 0) return keys[index] ?? "a";
    }
    return keys[0] ?? "a";
  });
}

/* ---------- families ---------- */

function pane(color: string): Sprite {
  return drawn(
    { f: shade(color, -0.35), g: color, h: shade(color, 0.45) },
    (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return "f";
      if ((x === 2 && y >= 2 && y <= 5) || (y === 2 && x >= 2 && x <= 5))
        return "h";
      if (x + y === 20 || x + y === 22) return "h";
      return "g";
    },
  );
}

function glassBlock(color: string): Sprite {
  return drawn(
    { f: shade(color, -0.3), g: shade(color, 0.25), h: shade(color, 0.7) },
    (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return "f";
      if ((x === 2 && y >= 2 && y <= 5) || (y === 2 && x >= 2 && x <= 5))
        return "h";
      return x + y === 21 ? "h" : ".";
    },
  );
}

function dye(color: string): Sprite {
  return {
    rows: [
      ".....ll.....",
      "....lccl....",
      "...lccccl...",
      "..lcchcccl..",
      ".lcchccccdl.",
      ".lcccccccdl.",
      "lccccccccddl",
      "lcccccccdddl",
      ".lcccccdddl.",
      "..llddddll..",
      "....llll....",
    ],
    palette: {
      l: shade(color, -0.45),
      c: color,
      h: shade(color, 0.5),
      d: shade(color, -0.2),
    },
  };
}

function concrete(color: string, seed: number): Sprite {
  return speckled(
    [color, shade(color, -0.06), shade(color, 0.05)],
    seed,
    [6, 1, 1],
  );
}

function wool(color: string, seed: number): Sprite {
  return speckled(
    [color, shade(color, -0.15), shade(color, 0.12), shade(color, -0.28)],
    seed,
    [5, 3, 2, 1],
  );
}

function banner(color: string): Sprite {
  return {
    rows: [
      "ssssssssssss",
      "..bbbbbbbb..",
      "..bhbbbbbb..",
      "..bhbbbbdb..",
      "..bbbbbbdb..",
      "..bbbbbbdb..",
      "..bbbbbbbb..",
      "..bbbbbbbb..",
      "..bbbbbbdb..",
      "..bbbbbbbb..",
      "..bb.bb.bb..",
      ".....pp.....",
      ".....pp.....",
      ".....pp.....",
    ],
    palette: {
      s: "#6b4a2a",
      p: "#7a5a32",
      b: color,
      h: shade(color, 0.3),
      d: shade(color, -0.25),
    },
  };
}

function bed(color: string): Sprite {
  return {
    rows: [
      "..............",
      "wwww..........",
      "wwwwbbbbbbbbbb",
      "wwwwbhhhhhhhbb",
      "bbbbbbbbbbbbbb",
      "dddddddddddddd",
      "pppppppppppppp",
      "p............p",
    ],
    palette: {
      w: "#eeeeea",
      b: color,
      h: shade(color, 0.25),
      d: shade(color, -0.3),
      p: "#7a5a32",
    },
  };
}

/** Tool and armour colours: `m` the material, `l` its highlight. */
const TIERS: Readonly<Record<string, { m: string; l: string }>> = {
  wooden: { m: "#8a6a3a", l: "#b8945a" },
  stone: { m: "#6a6a6a", l: "#9a9a9a" },
  iron: { m: "#727272", l: "#e4e4e4" },
  golden: { m: "#c69a1e", l: "#f8e070" },
  diamond: { m: "#23a39b", l: "#7ae8e0" },
  netherite: { m: "#3d3636", l: "#6e6464" },
  leather: { m: "#7a4a2a", l: "#a8683a" },
  chainmail: { m: "#5e5e5e", l: "#b0b0b0" },
  copper: { m: "#b4643a", l: "#e8946a" },
};
const TIER_NAMES = Object.keys(TIERS).join("|");
const HANDLE = { h: "#6b4a2a", g: "#4a321c" };

const TOOL_SHAPES: Readonly<Record<string, readonly string[]>> = {
  sword: [
    "..........mm",
    ".........mlm",
    "........mlm.",
    ".......mlm..",
    "......mlm...",
    ".....mlm....",
    ".g..mlm.....",
    "..gmlm......",
    "...gg.......",
    "..hhgg......",
    ".hh..g......",
    "hh..........",
  ],
  pickaxe: [
    "..mmmmmmmm..",
    ".mllllllllm.",
    "mm...hh...mm",
    "m....hh....m",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....gg.....",
  ],
  shovel: [
    "....mmmm....",
    "...mllllm...",
    "...mllllm...",
    "...mllllm...",
    "....mmmm....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....hh.....",
    ".....gg.....",
  ],
  axe: [
    "...mmmhh....",
    "..mlllhh....",
    "..mlllhh....",
    "...mmmhh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......gg....",
  ],
  hoe: [
    "..mmmmhh....",
    "..mll.hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......hh....",
    "......gg....",
  ],
  helmet: [
    "..mmmmmmmm..",
    ".mllllllmmm.",
    "mllmmmmmmmmm",
    "mlm......mmm",
    "mm........mm",
    "mm........mm",
  ],
  chestplate: [
    "mmmm....mmmm",
    "mlmmmmmmmmlm",
    "mllllllllllm",
    ".mllllllllm.",
    ".mllllllllm.",
    ".mllllllllm.",
    ".mmmmmmmmmm.",
  ],
  leggings: [
    "mmmmmmmmmm",
    "mllllllllm",
    "mllmmmmllm",
    "mlm....mlm",
    "mlm....mlm",
    "mlm....mlm",
    "mmm....mmm",
  ],
  boots: [
    ".mmm....mmm.",
    ".mlm....mlm.",
    ".mlm....mlm.",
    "mmlm....mlmm",
    "mmmm....mmmm",
  ],
};

function tool(shape: string, tier: { m: string; l: string }): Sprite | null {
  const rows = TOOL_SHAPES[shape];
  if (!rows) return null;
  return { rows, palette: { ...tier, ...HANDLE } };
}

const METALS: Readonly<Record<string, string>> = {
  gold: "#e8b82a",
  iron: "#c8c8c8",
  copper: "#c36a3a",
  netherite: "#4a4242",
};

function nugget(color: string): Sprite {
  return {
    rows: ["...nn...", ".nnlnn..", "nnlnnnnn", ".nnnnndd", "..nnddd."],
    palette: { n: color, l: shade(color, 0.5), d: shade(color, -0.3) },
  };
}

function ingot(color: string): Sprite {
  return {
    rows: [
      "...mmmmmm...",
      "..mllllllm..",
      ".mllllllllm.",
      "mmmmmmmmmmmm",
      ".dddddddddd.",
    ],
    palette: { m: color, l: shade(color, 0.45), d: shade(color, -0.35) },
  };
}

/** A block of a metal or gem: a bevelled square. */
function bevelled(color: string): Sprite {
  return drawn(
    {
      a: shade(color, 0.4),
      b: color,
      c: shade(color, -0.25),
      d: shade(color, 0.15),
    },
    (x, y) => {
      if (x === 0 || y === 0) return "a";
      if (x === 15 || y === 15) return "c";
      if ((x === 3 || x === 12) && y >= 3 && y <= 12) return "d";
      if ((y === 3 || y === 12) && x >= 3 && x <= 12) return "d";
      return "b";
    },
  );
}

function gem(color: string): Sprite {
  return {
    rows: [
      "....gggg....",
      "...gllllg...",
      "..glwlllgg..",
      ".glwllllggg.",
      ".gllllllggg.",
      ".gllllllggg.",
      "..glllllgg..",
      "...glllgg...",
      "....gggg....",
    ],
    palette: { g: shade(color, -0.4), l: color, w: shade(color, 0.6) },
  };
}

function bucket(contents: string | null): Sprite {
  const rows = [
    ".hhhhhhhhhh.",
    "h..........h",
    "iccccccccccd",
    "iccccccccccd",
    ".iiiiiiiidd.",
    ".iiiiiiiidd.",
    "..iiiiiidd..",
    "..iiiiiidd..",
    "...iiiidd...",
  ];
  return {
    rows: contents ? rows : rows.map((row) => row.replace(/c/g, "k")),
    palette: {
      h: "#8a8a8a",
      i: "#c8c8c8",
      d: "#8a8a8a",
      c: contents ?? "#3a3a3a",
      k: "#3a3a3a",
    },
  };
}

/** Heads: an 8×8 face drawn at twice the size. */
function head(
  face: readonly string[],
  palette: Record<string, string>,
): Sprite {
  const rows = face.flatMap((row) => {
    const doubled = row.replace(/./g, "$&$&");
    return [doubled, doubled];
  });
  return { rows, palette };
}

const HEADS: Readonly<Record<string, Sprite>> = {
  player_head: head(
    [
      "hhhhhhhh",
      "hhhhhhhh",
      "hssssssh",
      "swbssbws",
      "ssssssss",
      "sssnnsss",
      "ssmmmmss",
      "ssssssss",
    ],
    {
      h: "#4a3020",
      s: "#d9a77e",
      w: "#f4f4f4",
      b: "#3a5ab0",
      n: "#b8845e",
      m: "#8a4a3a",
    },
  ),
  zombie_head: head(
    [
      "dddddddd",
      "gggggggg",
      "gggggggg",
      "gkkggkkg",
      "gggddggg",
      "ggddddgg",
      "gggggggg",
      "gggggggg",
    ],
    { d: "#2e5a2a", g: "#5a9a4a", k: "#1a1a1a" },
  ),
  creeper_head: head(
    [
      "gglggggg",
      "gggggglg",
      "gkkggkkg",
      "gkkggkkg",
      "gggkkggg",
      "ggkkkkgg",
      "ggkkkkgg",
      "lgkggkgg",
    ],
    { g: "#5fb04a", l: "#8ad070", k: "#1a1a1a" },
  ),
  skeleton_skull: head(
    [
      "wwwwwwww",
      "wwwgwwww",
      "wwwwwwww",
      "wkkwwkkw",
      "wkkwwkkw",
      "wwwkkwww",
      "wkgkgkgw",
      "wwwwwwww",
    ],
    { w: "#d0d0c8", g: "#a8a8a0", k: "#2a2a2a" },
  ),
  wither_skeleton_skull: head(
    [
      "kkkkkkkk",
      "kkkgkkkk",
      "kkkkkkkk",
      "kwwkkwwk",
      "kkkkkkkk",
      "kkkwwkkk",
      "kgkgkgkk",
      "kkkkkkkk",
    ],
    { k: "#2a2a2a", g: "#4a4a4a", w: "#101010" },
  ),
};

function book(cover: string, label: string): Sprite {
  return {
    rows: [
      "sscccccccc..",
      "ssccccccccp.",
      "sscchhhhccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      "ssccccccccp.",
      ".scccccccc..",
    ],
    palette: { s: shade(cover, -0.4), c: cover, h: label, p: "#f0ead6" },
  };
}

const WRITABLE_BOOK: Sprite = {
  rows: [
    "sscccccccc.q",
    "ssccccccccqq",
    "sscchhhhcqq.",
    "ssccccccqqp.",
    "ssccccckqcp.",
    "sscccckcccp.",
    "ssccccccccp.",
    "ssccccccccp.",
    "ssccccccccp.",
    "ssccccccccp.",
    ".scccccccc..",
  ],
  palette: {
    s: "#4a2a12",
    c: "#8a5228",
    h: "#c9a46a",
    p: "#f0ead6",
    q: "#f4f4f4",
    k: "#1a1a1a",
  },
};

/** Round things: compasses, clocks. */
function dial(palette: Record<string, string>): Sprite {
  return {
    rows: [
      "....oooo....",
      "..ooffffoo..",
      ".offfffffro.",
      ".offffffrfo.",
      "offfffrrfffo",
      "offffkkffffo",
      "offffkkffffo",
      "offfwwfffffo",
      ".offwfffffo.",
      ".ofwffffffo.",
      "..ooffffoo..",
      "....oooo....",
    ],
    palette,
  };
}

/** Balls: pearls, eyes, snowballs, fire charges. */
function orb(palette: Record<string, string>): Sprite {
  return {
    rows: [
      "...oooo...",
      ".oobbbboo.",
      ".obwwbbbo.",
      "obwwbbbbbo",
      "obwbppbbbo",
      "obbbppbbdo",
      "obbbbbbddo",
      ".obbbbddo.",
      ".oobbddoo.",
      "...oooo...",
    ],
    palette,
  };
}

function flower(palette: Record<string, string>): Sprite {
  return {
    rows: [
      "..pp..pp..",
      ".pppppppp.",
      ".ppphhppp.",
      "..pppppp..",
      "...pccp...",
      "....gg....",
      "..g.gg....",
      "..gggg.gg.",
      "....gggg..",
      "....gg....",
      "....gg....",
    ],
    palette,
  };
}

function plant(leaf: string, stem: string): Sprite {
  return {
    rows: [
      "...l..l...",
      "..lll.ll..",
      ".llllllll.",
      "..llsll...",
      "..l.sl.l..",
      "....s.....",
      "....s.....",
      "...ss.....",
    ],
    palette: { l: leaf, s: stem },
  };
}

function dust(color: string): Sprite {
  return {
    rows: [
      "....d.....",
      "..d.dd.d..",
      ".dddhddd..",
      "d.dddddd.d",
      ".dhdddhdd.",
      "dddddddddd",
      ".s.ddsdd..",
      "..ssssss..",
    ],
    palette: { d: color, h: shade(color, 0.45), s: shade(color, -0.35) },
  };
}

function map(filled: boolean): Sprite {
  const inside = filled
    ? [
        "wwwggggg",
        "wwgggggg",
        "wggggtgg",
        "wwgggggs",
        "wwwggsss",
        "wwwwgsss",
        "wwwwwgss",
        "wwwwwwgs",
      ]
    : [
        "pppppppp",
        "pllllllp",
        "pppppppp",
        "pllllppp",
        "pppppppp",
        "plllllpp",
        "pppppppp",
        "pppppppp",
      ];
  return {
    rows: [
      "bbbbbbbbbbbb",
      "bppppppppppb",
      ...inside.map((row) => `bp${row}pb`),
      "bppppppppppb",
      "bbbbbbbbbbbb",
    ],
    palette: {
      b: "#8a6a3a",
      p: "#e8dcb8",
      l: "#b8a888",
      w: "#3a6ac8",
      g: "#5a9a3a",
      t: "#2e6a24",
      s: "#e0d090",
    },
  };
}

function sign(hanging: boolean): Sprite {
  const board = [
    "bbbbbbbbbbbb",
    "bppppppppppb",
    "bpllllllllpb",
    "bppppppppppb",
    "bpllllllpppb",
    "bppppppppppb",
    "bbbbbbbbbbbb",
  ];
  const rows = hanging
    ? ["..c......c..", "..c......c..", "..c......c..", ...board]
    : [...board, ...Array<string>(5).fill(".....ss.....")];
  return {
    rows,
    palette: {
      b: "#6b4a2a",
      p: "#b8945a",
      l: "#7a5a32",
      s: "#6b4a2a",
      c: "#8a8a8a",
    },
  };
}

function door(colors: { f: string; p: string; w: string }): Sprite {
  return {
    rows: [
      "ffffffffff",
      "fppppppppf",
      "fpwwppwwpf",
      "fpwwppwwpf",
      "fppppppppf",
      "fppppppppf",
      "ffffffffff",
      "fppppppppf",
      "fpppppphpf",
      "fppppppppf",
      "fppppppppf",
      "ffffffffff",
      "fppppppppf",
      "fppppppppf",
      "ffffffffff",
    ],
    palette: { ...colors, h: "#3a3a3a" },
  };
}

function cart(load: Sprite["palette"], top: readonly string[]): Sprite {
  return {
    rows: [
      ...top,
      "iiiiiiiiiiii",
      "iddddddddddi",
      ".iddddddddi.",
      ".kk......kk.",
    ],
    palette: { ...load, i: "#8a8a8a", d: "#5a5a5a", k: "#2a2a2a" },
  };
}

/** Stone bricks, optionally cracked or mossy. */
function stoneBricks(kind: "plain" | "cracked" | "mossy"): Sprite {
  return drawn(
    { a: "#8a8a8a", b: "#7a7a7a", m: "#5a5a5a", k: "#3a3a3a", g: "#4f7a2e" },
    (x, y) => {
      const mortar = y % 8 === 7 || (y < 8 ? x === 7 : x === 15 || x === 0);
      if (mortar) return "m";
      if (kind === "cracked" && (x - y === 2 || (x + y === 18 && y > 8)))
        return "k";
      if (kind === "mossy" && noise(x, y, 9) < (y > 9 ? 0.45 : 0.15))
        return "g";
      return noise(x, y, 4) < 0.3 ? "b" : "a";
    },
  );
}

function bricks(): Sprite {
  return drawn({ r: "#9a4a38", d: "#7a3628", m: "#c8b8a8" }, (x, y) => {
    if (y % 4 === 3) return "m";
    const offset = Math.floor(y / 4) % 2 === 0 ? 0 : 4;
    if ((x + offset) % 8 === 7) return "m";
    return noise(x, y, 2) < 0.25 ? "d" : "r";
  });
}

function cobble(mossy: boolean): Sprite {
  return drawn(
    { a: "#8a8a8a", b: "#6a6a6a", k: "#4a4a4a", g: "#4f7a2e" },
    (x, y) => {
      const edge = (x * 3 + y * 5) % 7 === 0 || (x * 5 + y * 2) % 9 === 0;
      if (mossy && noise(x, y, 5) < 0.3) return "g";
      if (edge) return "k";
      return noise(x, y, 6) < 0.4 ? "b" : "a";
    },
  );
}

function grassBlock(): Sprite {
  return drawn(
    {
      g: "#5f9e35",
      h: "#78b84a",
      d: "#8a5e3a",
      e: "#6e4a2c",
      f: "#a07048",
    },
    (x, y) => {
      const depth = 3 + (noise(x, 0, 3) < 0.5 ? 0 : 1);
      if (y < depth) return noise(x, y, 7) < 0.3 ? "h" : "g";
      const roll = noise(x, y, 8);
      return roll < 0.25 ? "e" : roll < 0.4 ? "f" : "d";
    },
  );
}

function planks(palette: Record<string, string>, seed: number): Sprite {
  return drawn(palette, (x, y) => {
    if (y % 4 === 3) return "d";
    const offset = Math.floor(y / 4) % 2 === 0 ? 3 : 11;
    if (x === offset) return "d";
    return noise(x, y, seed) < 0.2 ? "l" : "p";
  });
}

function bookshelf(): Sprite {
  const books = ["#b02e26", "#3a45a8", "#556e1c", "#c69a1e", "#7d2fb0"];
  return drawn(
    {
      p: "#b8945a",
      d: "#6b4a2a",
      a: books[0] ?? "",
      b: books[1] ?? "",
      c: books[2] ?? "",
      e: books[3] ?? "",
      f: books[4] ?? "",
    },
    (x, y) => {
      if (y < 2 || y > 13 || y === 7 || y === 8) return y === 7 ? "d" : "p";
      if (x === 0 || x === 15) return "d";
      if (x % 3 === 0) return "d";
      return "abcef"[Math.floor(x / 3 + (y > 8 ? 2 : 0)) % 5] ?? "a";
    },
  );
}

function barrel(): Sprite {
  return drawn(
    { p: "#8a6a3a", l: "#a07a48", d: "#5a4024", i: "#6a6a6a" },
    (x, y) => {
      if (y === 2 || y === 13) return "i";
      if (x % 4 === 0) return "d";
      return noise(x, y, 11) < 0.2 ? "l" : "p";
    },
  );
}

function chest(colors: { b: string; d: string; l: string; k: string }): Sprite {
  return drawn(colors, (x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return "d";
    if (y === 6) return "d";
    if (x >= 7 && x <= 8 && y >= 5 && y <= 8) return "k";
    return y < 6 ? "l" : "b";
  });
}

function tnt(): Sprite {
  return drawn(
    { r: "#c8302a", d: "#8a201c", w: "#eeeeea", k: "#2a2a2a" },
    (x, y) => {
      if (y >= 6 && y <= 9) {
        const letter =
          (y === 6 && x >= 2 && x <= 13) ||
          ((x === 3 || x === 7 || x === 8 || x === 12) && y > 6);
        return letter ? "k" : "w";
      }
      return x % 4 === 3 ? "d" : "r";
    },
  );
}

function commandBlock(): Sprite {
  return drawn(
    { o: "#b8763a", d: "#7a4a24", g: "#9a9a9a", k: "#4a4a4a" },
    (x, y) => {
      if (x === 0 || x === 15 || y === 0 || y === 15) return "d";
      if (x >= 4 && x <= 11 && y >= 4 && y <= 11) {
        if (x === 4 || x === 11 || y === 4 || y === 11) return "k";
        return (x + y) % 3 === 0 ? "k" : "g";
      }
      return noise(x, y, 12) < 0.2 ? "d" : "o";
    },
  );
}

function lodestone(): Sprite {
  return drawn(
    { a: "#8a8a8e", b: "#6e6e72", k: "#3a3a3e", c: "#b8b8bc" },
    (x, y) => {
      if (x === 0 || x === 15 || y === 0 || y === 15) return "k";
      if ((x === 5 || x === 10) && y >= 5 && y <= 10) return "k";
      if ((y === 5 || y === 10) && x >= 5 && x <= 10) return "k";
      if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return "c";
      return noise(x, y, 13) < 0.3 ? "b" : "a";
    },
  );
}

function respawnAnchor(): Sprite {
  return drawn(
    { k: "#1e1a2a", d: "#2e2840", p: "#a03ae0", l: "#e090ff" },
    (x, y) => {
      if (x >= 4 && x <= 11 && y >= 4 && y <= 11) {
        if (x === 4 || x === 11 || y === 4 || y === 11) return "d";
        return noise(x, y, 14) < 0.3 ? "l" : "p";
      }
      return noise(x, y, 15) < 0.3 ? "d" : "k";
    },
  );
}

function beacon(): Sprite {
  return drawn(
    { g: "#c8e8f0", f: "#8ab8c8", c: "#4ae8e0", w: "#e8fffe", k: "#2a3a48" },
    (x, y) => {
      if (x === 0 || x === 15 || y === 0 || y === 15) return "f";
      if (y >= 12) return "k";
      if (x >= 5 && x <= 10 && y >= 4 && y <= 11)
        return x === 6 && y === 5 ? "w" : "c";
      return "g";
    },
  );
}

function ironBars(): Sprite {
  return drawn({ i: "#a0a0a0", d: "#5a5a5a" }, (x, y) => {
    if (y === 1 || y === 14) return "i";
    if (x % 5 === 2) return "i";
    if (x % 5 === 3) return "d";
    return ".";
  });
}

/* ---------- drawn one by one ---------- */

const SINGLES: Readonly<Record<string, Sprite>> = {
  bell: {
    rows: [
      ".....oo.....",
      "....oyyo....",
      "...oyyyyo...",
      "...oywyyo...",
      "...oywyyo...",
      "..oyywyyyo..",
      "..oyyyyyyo..",
      ".oyyyyyyyyo.",
      ".oyyyyyyyyo.",
      "oooooooooooo",
      ".....oo.....",
    ],
    palette: { o: "#8a6414", y: "#f2c230", w: "#fff2a8" },
  },
  barrier: {
    rows: [
      "....rrrr....",
      "..rrrrrrrr..",
      ".rrr....rrr.",
      ".rr....rrrr.",
      "rr....rrr.rr",
      "rr...rrr..rr",
      "rr..rrr...rr",
      "rr.rrr....rr",
      ".rrrr....rr.",
      ".rrr....rrr.",
      "..rrrrrrrr..",
      "....rrrr....",
    ],
    palette: { r: "#e0242a" },
  },
  paper: {
    rows: [
      "wwwwwwwwwwg.",
      "wllllllllwgg",
      "wwwwwwwwwwwg",
      "wllllllllwwg",
      "wwwwwwwwwwwg",
      "wlllllllwwwg",
      "wwwwwwwwwwwg",
      "wllllllwwwwg",
      "wwwwwwwwwwwg",
      "gggggggggggg",
    ],
    palette: { w: "#f4f4ee", l: "#c9c9c0", g: "#a8a89e" },
  },
  name_tag: {
    rows: [
      "..........s.",
      ".........s.s",
      "..ttttttts..",
      ".tccccccctt.",
      "tcwwcwwcccct",
      "tcccccccccct",
      ".tccccccctt.",
      "..tttttttt..",
    ],
    palette: { t: "#6b4a2a", c: "#d9c08a", w: "#3a2a18", s: "#bfbfbf" },
  },
  lever: {
    rows: [
      ".......h..",
      "......sh..",
      "......s...",
      ".....s....",
      ".....s....",
      "....s.....",
      "....s.....",
      "..gggggg..",
      ".gddgdggg.",
      ".gggggdgg.",
      ".ggdggggg.",
    ],
    palette: { h: "#9a7a4a", s: "#6b4a2a", g: "#8a8a8a", d: "#5a5a5a" },
  },
  stick: {
    rows: [
      "........ss",
      ".......sd.",
      "......sd..",
      ".....sd...",
      "....sd....",
      "...sd.....",
      "..sd......",
      ".sd.......",
      "sd........",
    ],
    palette: { s: "#8a6a3a", d: "#5a4024" },
  },
  bone: {
    rows: [
      "........bb",
      ".......bbb",
      "......bb..",
      ".....bb...",
      "....bb....",
      "...bb.....",
      "..bb......",
      "bbb.......",
      "bb........",
    ],
    palette: { b: "#e8e4d4" },
  },
  arrow: {
    rows: [
      "......hhh.",
      ".......hh.",
      "......s.h.",
      ".....s....",
      "....s.....",
      "...s......",
      "f.s.......",
      ".ff.......",
      "fff.......",
    ],
    palette: { h: "#c8c8c8", s: "#6b4a2a", f: "#f0f0f0" },
  },
  spectral_arrow: {
    rows: [
      "......hhh.",
      ".......hh.",
      "......s.h.",
      ".....s....",
      "....s.....",
      "...s......",
      "f.s.......",
      ".ff.......",
      "fff.......",
    ],
    palette: { h: "#f8d838", s: "#c69a1e", f: "#f8e888" },
  },
  shield: {
    rows: [
      "iiiiiiiiii",
      "ippppppppi",
      "ippppppppi",
      "ipdpppdppi",
      "ippppppppi",
      "ippppppppi",
      "ippdppppdi",
      "ippppppppi",
      ".ippppppi.",
      "..ippppi..",
      "...iiii...",
    ],
    palette: { i: "#8a8a8a", p: "#a07a48", d: "#7a5a32" },
  },
  tripwire_hook: {
    rows: [
      "...rrr....",
      "..r...r...",
      "..r...r...",
      "...rrr....",
      "....s.....",
      "....s.....",
      "...wsw....",
      "...www....",
    ],
    palette: { r: "#9a9a9a", s: "#6b4a2a", w: "#b8945a" },
  },
  spyglass: {
    rows: [
      "........gg",
      ".......ccg",
      "......cc..",
      ".....cc...",
      "....cc....",
      "...kk.....",
      "..kk......",
      ".kk.......",
      "kk........",
    ],
    palette: { c: "#c36a3a", g: "#a8d8e8", k: "#3a2a20" },
  },
  flint_and_steel: {
    rows: [
      "..ssss....",
      ".s....s...",
      ".s....s...",
      "..s..s....",
      "...ss.....",
      "......ff..",
      ".....ffff.",
      "....ffff..",
      ".....ff...",
    ],
    palette: { s: "#a0a0a0", f: "#3a3a3a" },
  },
  iron_chain: {
    rows: [
      "..cccc..",
      ".cl..dc.",
      ".c....c.",
      ".cd..dc.",
      "..cccc..",
      "...dd...",
      "..dddd..",
      ".d....d.",
      ".d....d.",
      "..dddd..",
      "...cc...",
      "..cccc..",
      ".cl..dc.",
      "..cccc..",
    ],
    palette: { c: "#4e535c", d: "#3a3e46", l: "#9aa0aa" },
  },
  experience_bottle: {
    rows: [
      "....kk....",
      "....gg....",
      "...gggg...",
      "..gllllg..",
      ".glwllllg.",
      ".gllllllg.",
      ".gllllllg.",
      "..gggggg..",
    ],
    palette: { k: "#8a6a3a", g: "#9ad0e8", l: "#b8e83a", w: "#f0ffb0" },
  },
  redstone_torch: {
    rows: [
      "....rr....",
      "...rhhr...",
      "...rhhr...",
      "....ss....",
      "....ss....",
      "....ss....",
      "....ss....",
      "....ss....",
      "....ss....",
    ],
    palette: { r: "#c81e1e", h: "#ff6a50", s: "#6b4a2a" },
  },
  repeater: {
    rows: [
      "..r......r..",
      "..s......s..",
      "gggggggggggg",
      "grrrrrrrrrrg",
      "gggggggggggg",
      "dddddddddddd",
    ],
    palette: { g: "#a8a8a8", d: "#6a6a6a", r: "#c81e1e", s: "#6b4a2a" },
  },
  comparator: {
    rows: [
      ".r....r...r.",
      ".s....s...s.",
      "gggggggggggg",
      "grrrrrrrrrrg",
      "gggggggggggg",
      "dddddddddddd",
    ],
    palette: { g: "#a8a8a8", d: "#6a6a6a", r: "#c81e1e", s: "#6b4a2a" },
  },
  oak_boat: {
    rows: [
      "b..........b",
      "bb........bb",
      "bpbbbbbbbbpb",
      ".bppppppppb.",
      "..bbbbbbbb..",
    ],
    palette: { b: "#5a3a1e", p: "#b8945a" },
  },
  goat_horn: {
    rows: [
      "........hh",
      ".......hh.",
      "......hhd.",
      ".....hhd..",
      "....hhd...",
      "..hhhd....",
      ".hhdd.....",
      "hhd.......",
      "hd........",
    ],
    palette: { h: "#c8b898", d: "#8a7a5a" },
  },
  end_crystal: {
    rows: [
      ".gggggggggg.",
      "g..........g",
      "g..pppppp..g",
      "g..pwppppp.g",
      "g..pppppp..g",
      "g..pppppp..g",
      "g..ppppdp..g",
      "g..pppppp..g",
      "g..........g",
      ".gggggggggg.",
      "....bbbb....",
      "...bbbbbb...",
    ],
    palette: {
      g: "#c8c8e8",
      p: "#e070e0",
      w: "#ffd0ff",
      d: "#a040a0",
      b: "#3a2a3a",
    },
  },
  tnt_minecart: cart({ r: "#c8302a", w: "#eeeeea" }, [
    "..rrrrrrrr..",
    "..rwwwwwwr..",
    "..rrrrrrrr..",
  ]),
  minecart: cart({}, []),
  chest_minecart: cart({ c: "#a07a48", k: "#4a3a2a" }, [
    "..cccccccc..",
    "..ccckkccc..",
    "..cccccccc..",
  ]),
  painting: {
    rows: [
      "ffffffffffff",
      "fsssssssssyf",
      "fssssssssyyf",
      "fssssssssssf",
      "fsssgsssgssf",
      "fssggggggggf",
      "fgggggggdggf",
      "fggdgggggggf",
      "ffffffffffff",
    ],
    palette: {
      f: "#8a5a2a",
      s: "#6ab0e8",
      y: "#f0d040",
      g: "#4a9a3a",
      d: "#2e6a24",
    },
  },
  nether_star: {
    rows: [
      ".....w.....",
      ".....w.....",
      "....www....",
      "w..wwyww..w",
      ".wwwyyywww.",
      "..wyyyyyw..",
      ".wwwyyywww.",
      "w..wwyww..w",
      "....www....",
      ".....w.....",
      ".....w.....",
    ],
    palette: { w: "#f0f0ff", y: "#fff4a0" },
  },
  brush: {
    rows: [
      "........hh",
      ".......hh.",
      "......hh..",
      ".....cc...",
      "...bbc....",
      "..bbbb....",
      ".bbbb.....",
      "bbbb......",
      "bb........",
    ],
    palette: { h: "#6b4a2a", c: "#c36a3a", b: "#e8d8b0" },
  },
  armor_stand: {
    rows: [
      "....hh....",
      "....hh....",
      "aaaaaaaaaa",
      "....ss....",
      "..aaaaaa..",
      "....ss....",
      "...s..s...",
      "...s..s...",
      "...s..s...",
      "bbbbbbbbbb",
    ],
    palette: { a: "#b8945a", h: "#b8945a", s: "#b8945a", b: "#8a8a8a" },
  },
  lectern: {
    rows: [
      "..pppppppppp",
      ".pllllllllp.",
      "pppppppppp..",
      "....dd......",
      "....dd......",
      "....dd......",
      "....dd......",
      "..dddddd....",
      "pppppppppp..",
    ],
    palette: { p: "#b8945a", l: "#f0ead6", d: "#7a5a32" },
  },
  anvil: {
    rows: [
      "aaaaaaaaaaaaa.",
      ".aaaaaaaaaaaaa",
      "..dddddddddd..",
      ".....dddd.....",
      ".....dddd.....",
      "....dddddd....",
      "..aaaaaaaaaa..",
      "..dddddddddd..",
    ],
    palette: { a: "#5a5a5a", d: "#3e3e3e" },
  },
  hopper: {
    rows: [
      "gggggggggggg",
      "g.dddddddd.g",
      "g.dddddddd.g",
      "gggggggggggg",
      ".gggggggggg.",
      "..gggggggg..",
      "...gggggg...",
      "....gggg....",
      ".....gg.....",
      ".....gg.....",
    ],
    palette: { g: "#5a5a5a", d: "#2a2a2a" },
  },
  structure_void: {
    rows: [
      "........",
      ".cccccc.",
      ".c....c.",
      ".c....c.",
      ".c....c.",
      ".c....c.",
      ".cccccc.",
      "........",
    ],
    palette: { c: "#a8d8f0" },
  },
  writable_book: WRITABLE_BOOK,
  book: book("#8a5228", "#c9a46a"),
  written_book: book("#6b4026", "#e8c040"),
  knowledge_book: book("#9c2f2f", "#e8c040"),
  enchanted_book: book("#6a2a8a", "#e8c040"),
  compass: dial({
    o: "#7a7a7a",
    f: "#4d4d4d",
    r: "#d02a2a",
    k: "#222222",
    w: "#d8d8d8",
  }),
  recovery_compass: dial({
    o: "#2a6f78",
    f: "#1d2e34",
    r: "#4ae0d8",
    k: "#0a1418",
    w: "#7aa0a8",
  }),
  clock: dial({
    o: "#c69a1e",
    f: "#e8d27a",
    r: "#4a3a10",
    k: "#4a3a10",
    w: "#8a6a20",
  }),
  ender_pearl: orb({
    o: "#0a3a34",
    b: "#1a6a5e",
    w: "#6ad0c0",
    d: "#0f4a42",
    p: "#1a6a5e",
  }),
  ender_eye: orb({
    o: "#1a4a2a",
    b: "#3a8a4a",
    w: "#9ae0a0",
    d: "#2a5a3a",
    p: "#102010",
  }),
  snowball: orb({
    o: "#b8c8d8",
    b: "#f4f8ff",
    w: "#ffffff",
    d: "#c8d8e8",
    p: "#f4f8ff",
  }),
  fire_charge: orb({
    o: "#2a1a10",
    b: "#6a3010",
    w: "#ffa030",
    d: "#3a1a08",
    p: "#ff6010",
  }),
  slime_ball: orb({
    o: "#3a8a2a",
    b: "#7ad05a",
    w: "#c0f0a0",
    d: "#4aa03a",
    p: "#7ad05a",
  }),
  poppy: flower({ p: "#d12d2d", h: "#ff6a5c", c: "#2a1a10", g: "#3d8a2a" }),
  dandelion: flower({ p: "#f2d13a", h: "#fff09a", c: "#c69a1e", g: "#3d8a2a" }),
  wither_rose: flower({
    p: "#2b2b2b",
    h: "#4a4a4a",
    c: "#111111",
    g: "#3a3a2a",
  }),
  oak_sapling: plant("#4f9a2a", "#6b4a2a"),
  dead_bush: plant("#8a6a3a", "#6b4a2a"),
  redstone: dust("#c81e1e"),
  glowstone_dust: dust("#f2c840"),
  gunpowder: dust("#6a6a6a"),
  bone_meal: dust("#e8e8e0"),
  sugar: dust("#f4f4f4"),
  map: map(false),
  filled_map: map(true),
  oak_sign: sign(false),
  oak_hanging_sign: sign(true),
  oak_door: door({ f: "#6b4a2a", p: "#a07a48", w: "#d8c8a0" }),
  iron_door: door({ f: "#8a8a8a", p: "#c8c8c8", w: "#e8e8e8" }),
  water_bucket: bucket("#3a6ac8"),
  lava_bucket: bucket("#e86a1a"),
  milk_bucket: bucket("#f4f4f4"),
  bucket: bucket(null),
  diamond: gem("#4ad8d0"),
  emerald: gem("#2fd06a"),
  amethyst_shard: gem("#a070e0"),
};

/** Whole blocks, drawn on first use. */
const BLOCKS: Readonly<Record<string, () => Sprite>> = {
  grass_block: grassBlock,
  dirt: () => speckled(["#8a5e3a", "#6e4a2c", "#a07048"], 21, [5, 2, 2]),
  coarse_dirt: () =>
    speckled(["#7a5232", "#5a3c22", "#9a6a44", "#6a6a6a"], 22, [4, 3, 2, 1]),
  netherrack: () => speckled(["#7a2e2e", "#5a1e1e", "#9a4040"], 23, [4, 3, 2]),
  end_stone: () => speckled(["#e0e0a8", "#c8c890", "#f0f0c0"], 24, [4, 2, 2]),
  glowstone: () =>
    speckled(["#f2c840", "#c8902a", "#fff0a0", "#8a6020"], 25, [4, 3, 2, 1]),
  moss_block: () => speckled(["#5a8a2e", "#4a7426", "#6e9e3a"], 26, [4, 2, 2]),
  sand: () => speckled(["#e0d090", "#c8b878", "#f0e0a8"], 27, [4, 2, 2]),
  gravel: () =>
    speckled(["#8a8484", "#6a6464", "#a8a2a2", "#4a4444"], 28, [3, 3, 2, 1]),
  stone: () => speckled(["#8a8a8a", "#7a7a7a", "#9a9a9a"], 29, [4, 2, 1]),
  cobblestone: () => cobble(false),
  mossy_cobblestone: () => cobble(true),
  stone_bricks: () => stoneBricks("plain"),
  cracked_stone_bricks: () => stoneBricks("cracked"),
  mossy_stone_bricks: () => stoneBricks("mossy"),
  bricks,
  oak_planks: () => planks({ p: "#b8945a", l: "#c8a46a", d: "#7a5a32" }, 31),
  spruce_planks: () => planks({ p: "#7a5a32", l: "#8a6a3a", d: "#4a3420" }, 32),
  bookshelf,
  barrel,
  chest: () =>
    chest({ b: "#a07a48", l: "#b8945a", d: "#5a3a1e", k: "#c8c8c8" }),
  ender_chest: () =>
    chest({ b: "#1e2a2a", l: "#2a3a3a", d: "#0a1414", k: "#4ae0a0" }),
  tnt,
  command_block: commandBlock,
  lodestone,
  respawn_anchor: respawnAnchor,
  beacon,
  iron_bars: ironBars,
  gold_block: () => bevelled("#e8b82a"),
  iron_block: () => bevelled("#d8d8d8"),
  diamond_block: () => bevelled("#4ad8d0"),
  emerald_block: () => bevelled("#2fd06a"),
  redstone_block: () => bevelled("#c81e1e"),
  lapis_block: () => bevelled("#2a4ab0"),
  glass: () => glassBlock("#c8e8f0"),
  glass_pane: () => pane("#c8e8f0"),
};

/* ---------- lookup ---------- */

/** "Lime Stained Glass Pane", "minecraft:lime_stained_glass_pane" → "lime_stained_glass_pane". */
export function materialKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/[\s-]+/g, "_");
}

const FAMILY_PATTERNS: readonly [
  RegExp,
  (match: RegExpExecArray) => Sprite | null,
][] = [
  [
    new RegExp(`^(${DYE_NAMES})_stained_glass_pane$`),
    (m) => pane(DYE_COLORS[m[1] ?? ""] ?? "#888888"),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_stained_glass$`),
    (m) => glassBlock(DYE_COLORS[m[1] ?? ""] ?? "#888888"),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_dye$`),
    (m) => dye(DYE_COLORS[m[1] ?? ""] ?? ""),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_concrete$`),
    (m) => concrete(DYE_COLORS[m[1] ?? ""] ?? "", 41),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_(?:wool|carpet)$`),
    (m) => wool(DYE_COLORS[m[1] ?? ""] ?? "", 42),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_terracotta$`),
    (m) => concrete(shade(DYE_COLORS[m[1] ?? ""] ?? "", -0.25), 43),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_banner$`),
    (m) => banner(DYE_COLORS[m[1] ?? ""] ?? ""),
  ],
  [
    new RegExp(`^(${DYE_NAMES})_bed$`),
    (m) => bed(DYE_COLORS[m[1] ?? ""] ?? ""),
  ],
  [
    new RegExp(
      `^(${TIER_NAMES})_(sword|pickaxe|shovel|axe|hoe|helmet|chestplate|leggings|boots)$`,
    ),
    (m) => {
      const tier = TIERS[m[1] ?? ""];
      return tier ? tool(m[2] ?? "", tier) : null;
    },
  ],
  [/^(gold|iron|copper)_nugget$/, (m) => nugget(METALS[m[1] ?? ""] ?? "")],
  [
    /^(gold|iron|copper|netherite)_ingot$/,
    (m) => ingot(METALS[m[1] ?? ""] ?? ""),
  ],
];

const cache = new Map<string, Sprite | null>();

/** The sprite for a material, or null when there's none. */
export function materialSprite(name: string): Sprite | null {
  const key = materialKey(name);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let sprite: Sprite | null =
    SINGLES[key] ?? HEADS[key] ?? BLOCKS[key]?.() ?? null;
  if (!sprite)
    for (const [pattern, make] of FAMILY_PATTERNS) {
      const match = pattern.exec(key);
      if (match) {
        sprite = make(match);
        break;
      }
    }
  cache.set(key, sprite);
  return sprite;
}

/** Every material with a sprite of its own (families listed by their dye and tier names). */
export function knownMaterials(): string[] {
  const names = new Set([
    ...Object.keys(SINGLES),
    ...Object.keys(HEADS),
    ...Object.keys(BLOCKS),
  ]);
  for (const dyeName of Object.keys(DYE_COLORS))
    for (const kind of [
      "stained_glass_pane",
      "stained_glass",
      "dye",
      "concrete",
      "wool",
      "carpet",
      "terracotta",
      "banner",
      "bed",
    ])
      names.add(`${dyeName}_${kind}`);
  for (const tier of Object.keys(TIERS))
    for (const shape of Object.keys(TOOL_SHAPES)) {
      const name = `${tier}_${shape}`;
      if (materialSprite(name)) names.add(name);
    }
  return [...names].sort();
}

/**
 * A sprite as SVG: one path per colour, a rectangle per run of pixels. The picture is
 * centred in a square a pixel wider than it on each side (16 at most, 12 at least), so
 * small sprites fill their slot as the game's items do.
 */
export function spriteSvg(sprite: Sprite): string {
  const height = sprite.rows.length;
  const width = Math.max(0, ...sprite.rows.map((row) => row.length));
  const box = Math.min(SIZE, Math.max(width, height, 10) + 2);
  const left = Math.floor((box - width) / 2);
  const top = Math.floor((box - height) / 2);
  const paths = new Map<string, string>();
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x] ?? ".";
      let end = x + 1;
      while (end < row.length && row[end] === char) end += 1;
      if (char !== ".") {
        const color = sprite.palette[char];
        if (color)
          paths.set(
            color,
            `${paths.get(color) ?? ""}M${String(left + x)} ${String(top + y)}h${String(end - x)}v1h-${String(end - x)}z`,
          );
      }
      x = end;
    }
  });
  const body = [...paths]
    .map(([color, d]) => `<path fill="${color}" d="${d}"/>`)
    .join("");
  return `<svg viewBox="0 0 ${String(box)} ${String(box)}" shape-rendering="crispEdges">${body}</svg>`;
}

const svgCache = new Map<string, string>();

/**
 * A material's icon: its sprite (inside an `mc-icon mc-pixel` span), or a swatch
 * with its first letter when it has none.
 */
export function materialIconHtml(
  name: string,
  size: "small" | "large" = "small",
): string {
  const sprite = materialSprite(name);
  if (!sprite) {
    const letter = materialKey(name).charAt(0).toUpperCase() || "?";
    return `<span class="mc-icon mc-swatch mc-c-7" data-size="${size}" aria-hidden="true">${escapeHtml(letter)}</span>`;
  }
  const key = materialKey(name);
  let svg = svgCache.get(key);
  if (!svg) {
    svg = spriteSvg(sprite);
    svgCache.set(key, svg);
  }
  return `<span class="mc-icon mc-pixel" data-size="${size}" aria-hidden="true">${svg}</span>`;
}
