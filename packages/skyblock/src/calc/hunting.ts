/**
 * How hunting rates change with a player's setup: Hunting Fortune, the rarity pets'
 * attribute levels (Newt, Salamander, Lizard King, Leviathan), Frog, the black-hole
 * shards' Python and King Cobra bonuses (boosted by Sea Serpent, itself by Tiamat),
 * wooden bait, Chameleon, and Kraken's rate from Kuudra runs. Crocodile scales reptile
 * fusions' output.
 *
 * Ported from SkyShards (src/constants/shards.ts, src/services/shardData.ts and
 * fusionMath.ts at commit 37d4c92), whose lists are keyed by its own shard keys; here
 * they're keyed by Hypixel's IDs, which don't change between versions of the data.
 * These rules are code, not data: the site's sync compares SkyShards' files with
 * RULE_SOURCES and tells the admin when they change, so this file can be checked.
 */

/** SkyShards' files these rules (and the solver) were ported from, with git blob SHAs. */
export const RULE_SOURCES: Readonly<Record<string, string>> = {
  "src/constants/shards.ts": "cee5c744602bc7b13a9e735328388552a076cb00",
  "src/services/shardData.ts": "6e8a6a143914beac4abd788358ac940144af7337",
  "src/services/fusionMath.ts": "fbafdbdfceaaef186cc2efc020b7edee7ef3244c",
  "src/services/minCostSolver.ts": "1d10ebf034a1ffe1f8f4aa614da66371d1fc1d04",
  "src/services/recipeTree.ts": "fde439f6d135b5a9ffe92f92e19c641209010ce7",
  "src/components/results/treeExport.ts":
    "bdf480d5078561dc13fb445083384cc3745eaf4e",
};

/** Shards whose rate ignores Hunting Fortune. */
export const NO_FORTUNE: ReadonlySet<string> = new Set([
  "SHARD_CROW",
  "SHARD_SPARROW",
  "SHARD_HERON",
  "SHARD_SEAGULL",
  "SHARD_ARACHNE",
  "SHARD_BITBUG",
  "SHARD_REVENANT",
  "SHARD_WITHER",
  "SHARD_HIVETHIEF",
  "SHARD_CHAMELEON",
  "SHARD_KRAKEN",
  "SHARD_POWER_DRAGON",
  "SHARD_APEX_DRAGON",
]);

/** Shards caught with wooden bait (cut down by "no wooden bait"). */
export const WOODEN_BAIT: ReadonlySet<string> = new Set([
  "SHARD_SILENTDEPTH",
  "SHARD_SHINYFISH",
  "SHARD_INFERNO_KOI",
  "SHARD_ABYSSAL_LANTERN",
  "SHARD_DREADWING",
]);

/**
 * Black-hole shards: every one gets King Cobra's fortune bonus; those marked true also
 * get Python's rate bonus.
 */
export const BLACK_HOLE: Readonly<Record<string, boolean>> = {
  SHARD_TITANOBOA: false,
  SHARD_HELLWISP: false,
  SHARD_LORD_JAWBUS: false,
  SHARD_TAURUS: false,
  SHARD_GHOST: true,
  SHARD_SEA_EMPEROR: false,
  SHARD_FLARE: true,
  SHARD_WATER_HYDRA: false,
  SHARD_FIRE_EEL: false,
  SHARD_LAVA_FLAME: false,
  SHARD_DREADWING: false,
  SHARD_MATCHO: false,
  SHARD_WITHER_SPECTER: true,
  SHARD_CARROT_KING: false,
  SHARD_KADA_KNIGHT: true,
  SHARD_THYST: true,
  SHARD_STAR_SENTRY: false,
  SHARD_DROWNED: false,
  SHARD_GLACITE_WALKER: true,
  SHARD_STRIDER_SURFER: true,
  SHARD_BRUISER: true,
  SHARD_FLAMING_SPIDER: true,
  SHARD_MAGMA_SLUG: true,
  SHARD_SOUL_OF_THE_ALPHA: false,
  SHARD_ENT: false,
  SHARD_SYCOPHANT: false,
  SHARD_OBSIDIAN_DEFENDER: true,
  SHARD_SEER: true,
  SHARD_RAIN_SLIME: true,
  SHARD_MINER_ZOMBIE: true,
  SHARD_YOG: true,
  SHARD_BEZAL: true,
  SHARD_GOLDEN_GHOUL: false,
  SHARD_ZEALOT: true,
  SHARD_TADGANG: false,
  SHARD_VORACIOUS_SPIDER: true,
  SHARD_SEA_ARCHER: false,
  SHARD_CHILL: true,
  SHARD_LAPIS_ZOMBIE: true,
  SHARD_DUMPSTER_DIVER: false,
};

export const KRAKEN = "SHARD_KRAKEN";
export const SHINYFISH = "SHARD_SHINYFISH";
export const CHAMELEON = "SHARD_CHAMELEON";

/** Share of the rate kept without wooden bait: Shinyfish 10%, the others 5%. */
export const NO_WOODEN_BAIT_RATE = { shinyfish: 0.1, other: 0.05 };
export const FROG_RATE_BONUS = 1.1;

export const KUUDRA_TIERS = ["t1", "t2", "t3", "t4", "t5"] as const;
export type KuudraTier = (typeof KUUDRA_TIERS)[number];

/** A Kuudra run's usual time (seconds), key cost (coins) and Kraken shard multiplier. */
export const KUUDRA: Readonly<
  Record<KuudraTier, { seconds: number; keyCost: number; multiplier: number }>
> = {
  t1: { seconds: 60, keyCost: 155_000, multiplier: 1 },
  t2: { seconds: 60, keyCost: 310_000, multiplier: 1 },
  t3: { seconds: 60, keyCost: 582_000, multiplier: 1 },
  t4: { seconds: 60, keyCost: 1_164_000, multiplier: 1.25 },
  t5: { seconds: 100, keyCost: 2_328_000, multiplier: 1.5 },
};
/** Time between runs (seconds). */
export const KUUDRA_DOWNTIME_SECONDS = 25;

/**
 * Kraken shards an hour from Kuudra runs. The key's cost becomes time at
 * `coinsPerHour` (null: free; 0: keys can't be afforded).
 */
export function kuudraRate(
  tier: KuudraTier,
  coinsPerHour: number | null,
  runSeconds: number | null,
): number {
  const info = KUUDRA[tier];
  const total = (runSeconds ?? info.seconds) + KUUDRA_DOWNTIME_SECONDS;
  const keySeconds =
    coinsPerHour === null
      ? 0
      : coinsPerHour === 0
        ? 1e12
        : (info.keyCost / coinsPerHour) * 3600;
  return info.multiplier * (3600 / (total + keySeconds));
}

/**
 * The shards whose attribute levels change the result, with the attribute's effect
 * in words. Order is the form's.
 */
export const LEVEL_SHARDS = [
  {
    key: "newt",
    id: "SHARD_NEWT",
    effect: "+2 fortune a level for Common shards",
  },
  {
    key: "salamander",
    id: "SHARD_SALAMANDER",
    effect: "+2 fortune a level for Uncommon shards",
  },
  {
    key: "lizardKing",
    id: "SHARD_LIZARD_KING",
    effect: "+1 fortune a level for Rare shards",
  },
  {
    key: "leviathan",
    id: "SHARD_LEVIATHAN",
    effect: "+1 fortune a level for Epic shards",
  },
  {
    key: "python",
    id: "SHARD_PYTHON",
    effect: "+5% a level to some black-hole shards' rate",
  },
  {
    key: "kingCobra",
    id: "SHARD_KING_COBRA",
    effect: "+1% a level to black-hole shards' fortune",
  },
  {
    key: "seaSerpent",
    id: "SHARD_SEA_SERPENT",
    effect: "+2% a level to Python and King Cobra",
  },
  { key: "tiamat", id: "SHARD_TIAMAT", effect: "+5% a level to Sea Serpent" },
  {
    key: "crocodile",
    id: "SHARD_CROCODILE",
    effect: "+2% a level to reptile fusions' output",
  },
] as const;
export type LevelKey = (typeof LEVEL_SHARDS)[number]["key"];
