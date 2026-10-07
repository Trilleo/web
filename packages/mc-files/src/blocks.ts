/**
 * How blocks look in the 3D preview: one flat colour each (hand-picked to read as
 * the block, never Mojang's textures) and a rough shape: a full cube, a slab, a
 * flat layer (carpet, rails) or a small piece (torches, flowers). Unknown blocks get
 * a colour from their name's family, else a neutral grey.
 */

export type BlockShape = "full" | "slab" | "flat" | "small";

const DYES: Readonly<Record<string, number>> = {
  white: 0xe9ecec,
  light_gray: 0x8e8e86,
  gray: 0x3e4447,
  black: 0x141519,
  brown: 0x724728,
  red: 0xa12722,
  orange: 0xf07613,
  yellow: 0xf8c527,
  lime: 0x70b919,
  green: 0x546d1b,
  cyan: 0x158991,
  light_blue: 0x3aafd9,
  blue: 0x35399d,
  purple: 0x7a2aac,
  magenta: 0xbd44b3,
  pink: 0xed8dac,
};

const WOODS: Readonly<Record<string, number>> = {
  oak: 0xa2834f,
  spruce: 0x725431,
  birch: 0xc0af79,
  jungle: 0xa0734d,
  acacia: 0xa85a32,
  dark_oak: 0x4a3018,
  mangrove: 0x763631,
  cherry: 0xe2b3ac,
  bamboo: 0xc4af52,
  crimson: 0x653147,
  warped: 0x2b6963,
  pale_oak: 0xe3dcd3,
};

/** Exact names first. */
const EXACT: Readonly<Record<string, number>> = {
  stone: 0x7d7d7d,
  cobblestone: 0x7a7a7a,
  mossy_cobblestone: 0x6e7b5d,
  smooth_stone: 0x9e9e9e,
  stone_bricks: 0x7a7a7a,
  mossy_stone_bricks: 0x6f7a5f,
  cracked_stone_bricks: 0x767676,
  chiseled_stone_bricks: 0x787878,
  granite: 0x956755,
  polished_granite: 0x9a6a59,
  diorite: 0xbcbcbc,
  polished_diorite: 0xc0c0c2,
  andesite: 0x888889,
  polished_andesite: 0x848786,
  deepslate: 0x505053,
  cobbled_deepslate: 0x4d4d50,
  polished_deepslate: 0x484849,
  deepslate_bricks: 0x464646,
  deepslate_tiles: 0x363637,
  tuff: 0x6c6d66,
  calcite: 0xdfe0dc,
  dirt: 0x866043,
  coarse_dirt: 0x77553b,
  rooted_dirt: 0x90684d,
  grass_block: 0x6f9a3f,
  podzol: 0x5c3f18,
  mycelium: 0x6f6265,
  mud: 0x3c393d,
  packed_mud: 0x8e6b50,
  mud_bricks: 0x89684f,
  clay: 0xa0a6b3,
  gravel: 0x837f7e,
  sand: 0xdbcfa3,
  red_sand: 0xbe6721,
  sandstone: 0xd8cb9b,
  smooth_sandstone: 0xe0d6aa,
  cut_sandstone: 0xd9cd9f,
  chiseled_sandstone: 0xd7ca9a,
  red_sandstone: 0xb5621f,
  bricks: 0x966153,
  terracotta: 0x985e43,
  snow: 0xf3fafa,
  snow_block: 0xf3fafa,
  ice: 0x91b7fd,
  packed_ice: 0x8db4fa,
  blue_ice: 0x74a8fd,
  water: 0x3f76e4,
  lava: 0xcf5b13,
  obsidian: 0x0f0b19,
  crying_obsidian: 0x200a3c,
  bedrock: 0x555555,
  netherrack: 0x612626,
  nether_bricks: 0x2c1519,
  red_nether_bricks: 0x450709,
  soul_sand: 0x51403e,
  soul_soil: 0x4b3a2f,
  basalt: 0x505055,
  polished_basalt: 0x636366,
  blackstone: 0x2a2328,
  polished_blackstone: 0x353038,
  polished_blackstone_bricks: 0x302a31,
  glowstone: 0xab8654,
  end_stone: 0xdbde9e,
  end_stone_bricks: 0xdae0a2,
  purpur_block: 0xa97ea9,
  purpur_pillar: 0xab81ab,
  prismarine: 0x639c97,
  prismarine_bricks: 0x63aba0,
  dark_prismarine: 0x335c4b,
  sea_lantern: 0xacc8be,
  quartz_block: 0xece6df,
  smooth_quartz: 0xece6df,
  quartz_bricks: 0xeae5dd,
  quartz_pillar: 0xebe6e0,
  chiseled_quartz_block: 0xe7e2da,
  iron_block: 0xdcdcdc,
  gold_block: 0xf6d03e,
  diamond_block: 0x62ede4,
  emerald_block: 0x2acb58,
  lapis_block: 0x1f438c,
  redstone_block: 0xb01a04,
  coal_block: 0x101010,
  netherite_block: 0x423d3f,
  copper_block: 0xc06c50,
  exposed_copper: 0xa17e68,
  weathered_copper: 0x6c9e6c,
  oxidized_copper: 0x52a284,
  amethyst_block: 0x8562c0,
  hay_block: 0xa68b0c,
  bookshelf: 0x75603d,
  crafting_table: 0x7b5a37,
  furnace: 0x6e6e6e,
  chest: 0x9b6d2c,
  barrel: 0x86643a,
  pumpkin: 0xc67718,
  carved_pumpkin: 0xc67718,
  jack_o_lantern: 0xd99620,
  melon: 0x6f9123,
  tnt: 0xb53d29,
  slime_block: 0x6fc05b,
  honey_block: 0xfbbc3d,
  redstone_lamp: 0x5f3620,
  lantern: 0x6a5b4b,
  glass: 0xc9e6ee,
  tinted_glass: 0x2c2731,
  beacon: 0x7ee0dc,
  sponge: 0xc3c04a,
  dried_kelp_block: 0x323a28,
  moss_block: 0x596e2d,
  shroomlight: 0xf09446,
  ochre_froglight: 0xf6e8ad,
  verdant_froglight: 0xe5f4e3,
  pearlescent_froglight: 0xf5f0f0,
  scaffolding: 0xaa8449,
  ladder: 0x7d6133,
  rail: 0x7f7564,
  powered_rail: 0x9a7744,
  detector_rail: 0x7d6d5d,
  activator_rail: 0x775f55,
  redstone_wire: 0xb01a04,
  redstone_torch: 0xc22d14,
  torch: 0xffd85a,
  soul_torch: 0x6ed0d6,
  lever: 0x6f5a3d,
  repeater: 0xa09e9b,
  comparator: 0xa59f9a,
  observer: 0x5e5e5e,
  piston: 0x9f8a63,
  sticky_piston: 0x88a35a,
  dispenser: 0x7a7a7a,
  dropper: 0x7a7a7a,
  hopper: 0x4a4a4a,
  target: 0xe2a8a3,
  note_block: 0x5d3c2a,
  short_grass: 0x6f9a3f,
  tall_grass: 0x6f9a3f,
  fern: 0x5f8a39,
  vine: 0x4f7a26,
  sugar_cane: 0x95c165,
  cactus: 0x587d27,
  bamboo: 0x5d8b2f,
};

/** Name endings that tell a block's family when the exact name isn't listed. */
const FAMILY: readonly [RegExp, number][] = [
  [/(^|_)leaves$/, 0x4a7a26],
  [/sapling$/, 0x4f7a26],
  [
    /(tulip|poppy|dandelion|orchid|allium|bluet|daisy|cornflower|lily|rose|peony|lilac|flower)/,
    0xd65a6a,
  ],
  [/mushroom/, 0xa66a4c],
  [/ore$/, 0x7f7f7f],
  [/_bricks?$/, 0x8a7a70],
  [/stone/, 0x7d7d7d],
  [/glass/, 0xc9e6ee],
  [/copper/, 0xc06c50],
  [/concrete_powder$/, 0xb0b0b0],
];

/** Blocks the preview draws as flat layers, small pieces, or half cubes. */
const FLAT =
  /(carpet|rail|redstone_wire|pressure_plate|_trapdoor|lily_pad|snow$|moss_carpet)$/;
const SMALL =
  /(torch|lantern|flower|tulip|poppy|dandelion|orchid|allium|bluet|daisy|cornflower|rose|sapling|mushroom$|short_grass|^fern$|button|lever|_sign$|_banner$|candle|head$|skull$|fence_gate|chain$|_bars$|_pane$|ladder|vine$|sea_pickle|^repeater$|^comparator$)/;

/** Blocks you can see through: the preview draws the faces behind them. */
const SEE_THROUGH =
  /(glass|leaves|ice$|^water$|_pane$|_bars$|slime_block|honey_block|scaffolding|_door$|_trapdoor$|fence|_wall$|stairs$|_slab$)/;

function familyColour(name: string): number | undefined {
  // Dyed: white_wool, red_stained_glass, light_blue_concrete…
  for (const [dye, colour] of Object.entries(DYES)) {
    if (name.startsWith(`${dye}_`)) {
      if (name.includes("terracotta")) return shade(colour, 0.7);
      if (name.includes("glass")) return mix(colour, 0xffffff, 0.35);
      return colour;
    }
  }
  // Woods: oak_planks, spruce_log, birch_stairs…
  for (const [wood, colour] of Object.entries(WOODS)) {
    if (name.startsWith(`${wood}_`) || name.startsWith(`stripped_${wood}_`)) {
      if (
        /(_log|_wood|_stem|_hyphae)$/.test(name) &&
        !name.startsWith("stripped_")
      )
        return shade(colour, 0.65);
      if (name.endsWith("_leaves")) return 0x4a7a26;
      return colour;
    }
  }
  // Slabs, stairs and walls take their material's colour.
  const base = name.replace(
    /_(slab|stairs|wall|fence|fence_gate|button|pressure_plate)$/,
    "",
  );
  if (base !== name) {
    const exact =
      EXACT[base] ??
      EXACT[`${base}s`] ??
      EXACT[base.replace(/_brick$/, "_bricks")];
    if (exact !== undefined) return exact;
  }
  for (const [pattern, colour] of FAMILY) if (pattern.test(name)) return colour;
  return undefined;
}

function mix(a: number, b: number, t: number): number {
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function shade(colour: number, factor: number): number {
  return mix(0, colour, factor);
}

const cache = new Map<string, number>();

/** A block's colour, 0xRRGGBB. */
export function blockColour(name: string): number {
  let colour = cache.get(name);
  if (colour === undefined) {
    colour = EXACT[name] ?? familyColour(name) ?? 0x8c8c8c;
    cache.set(name, colour);
  }
  return colour;
}

/** "#7d7d7d", for swatches. */
export function blockHex(name: string): string {
  return `#${blockColour(name).toString(16).padStart(6, "0")}`;
}

export function blockShape(name: string): BlockShape {
  if (SMALL.test(name)) return "small";
  if (FLAT.test(name)) return "flat";
  if (name.endsWith("_slab")) return "slab";
  return "full";
}

/** Whether a block hides the faces of blocks behind it. */
export function blockOccludes(name: string): boolean {
  return blockShape(name) === "full" && !SEE_THROUGH.test(name);
}

/** "oak_planks" → "Oak planks". */
export function blockLabel(name: string): string {
  const words = name.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
