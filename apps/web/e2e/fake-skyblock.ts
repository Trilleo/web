/**
 * Hypixel's API for the SkyBlock e2e specs. /v2/skyblock/bazaar answers with every
 * shard in the committed snapshot, priced from its hunting rate (rarer, slower shards
 * dearer; a few shards with nobody selling), so the profit list has rows and coin mode
 * has prices (SKYBLOCK_BAZAAR_URL in playwright.config.ts). The event timer's feeds
 * (SKYBLOCK_HYPIXEL_URL) answer as of the request: Marina is mayor with Fishing
 * Festival, Diaz minister, a running election with fixed votes, a fire sale and Bingo
 * on now, and two news posts. /hysky/calendar stands in for the Skyblocker mod's
 * calendar (SKYBLOCK_CROPS_URL): the next contests with crops in turn.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

export const FAKE_SKYBLOCK_PORT = 4335;
export const FAKE_SKYBLOCK = `http://127.0.0.1:${String(FAKE_SKYBLOCK_PORT)}`;

interface SnapshotShard {
  id: string;
  rate: number;
  rarity: string;
}

const RARITY_PRICE: Record<string, number> = {
  common: 1_000,
  uncommon: 5_000,
  rare: 20_000,
  epic: 80_000,
  legendary: 300_000,
};

/** The Bazaar's answer: an ask and a bid per shard, from the snapshot's shards. */
export function bazaarBody(now = Date.now()): unknown {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("../src/lib/skyblock/snapshot.json", import.meta.url),
      "utf8",
    ),
  ) as { data: { shards: SnapshotShard[] } };
  const products: Record<string, unknown> = {};
  snapshot.data.shards.forEach((shard, index) => {
    const base = RARITY_PRICE[shard.rarity] ?? 1_000;
    // Hunted fast: cheap. Not huntable (fused only): dear, so fusing it pays.
    const ask = Math.round(
      shard.rate > 0 ? base * (60 / Math.max(6, shard.rate)) : base * 8,
    );
    const bid = Math.round(ask * 0.85);
    products[shard.id] = {
      product_id: shard.id,
      buy_summary:
        index % 37 === 5 ? [] : [{ amount: 64, pricePerUnit: ask, orders: 3 }],
      sell_summary: [{ amount: 64, pricePerUnit: bid, orders: 4 }],
      quick_status: {
        buyMovingWeek: 5000 + index,
        sellMovingWeek: 4000 + index,
      },
    };
  });
  return { success: true, lastUpdated: now, products };
}

const perk = (name: string, description: string, minister = false) => ({
  name,
  description,
  minister,
});

/** SkyBlock's calendar, as @trilleo/skyblock/events counts it (this runs on plain Node). */
const EPOCH_MS = 1_560_275_700_000;
const SB_DAY_MS = 1_200_000;
const SB_YEAR_MS = 372 * SB_DAY_MS;

/**
 * The year of the election whose mayor is in office now: terms start on Late Spring
 * 27th (day 89 of the year, from 0) of the year after the booth opened.
 */
export function electedYear(now = Date.now()): number {
  const since = now - EPOCH_MS;
  const year = Math.floor(since / SB_YEAR_MS) + 1;
  const day = Math.floor((since % SB_YEAR_MS) / SB_DAY_MS);
  return day >= 2 * 31 + 26 ? year - 1 : year - 2;
}

/** The election: Marina won it, so her term (and Fishing Festival) is running now. */
export function electionBody(elected = electedYear()): unknown {
  return {
    success: true,
    lastUpdated: Date.now(),
    mayor: {
      key: "fishing",
      name: "Marina",
      perks: [
        perk(
          "Fishing Festival",
          "Start a special fishing event the first §b3 §7days of each month!",
          true,
        ),
        perk("Luck of the Sea 2.0", "Gain §3+15α Sea Creature Chance§7."),
      ],
      minister: {
        key: "economist",
        name: "Diaz",
        perk: perk(
          "Shopping Spree",
          "Increase daily NPC buy limits by §e10x§7.",
          true,
        ),
      },
      election: {
        year: elected,
        candidates: [
          { key: "fishing", name: "Marina", votes: 500_000, perks: [] },
          { key: "economist", name: "Diaz", votes: 300_000, perks: [] },
        ],
      },
    },
    current: {
      year: elected + 1,
      candidates: [
        {
          key: "pets",
          name: "Diana",
          votes: 120_000,
          perks: [perk("Pet XP Buff", "Gain §d35% §7more pet XP.")],
        },
        {
          key: "farming",
          name: "Finnegan",
          votes: 80_000,
          perks: [perk("GOATed", "§eJacob's Farming Contest §7brackets grow.")],
        },
      ],
    },
  };
}

const DAY_MS = 86_400_000;

const CROPS = [
  ["Wheat", "Carrot", "Potato"],
  ["Cactus", "Melon", "Pumpkin"],
  ["Sugar Cane", "Nether Wart", "Mushroom"],
];

/**
 * The Skyblocker calendar's shape: the next dozen Jacob's contests (every hour, a
 * SkyBlock day after each third day starts) with crops in turn.
 */
export function cropsBody(now = Date.now()): unknown {
  const period = 3 * SB_DAY_MS;
  const anchor = EPOCH_MS + SB_DAY_MS;
  const first = anchor + Math.ceil((now - anchor) / period) * period;
  return Array.from({ length: 12 }, (_, i) => ({
    timestamp: (first + i * period) / 1000,
    duration: 1199,
    event: "Jacob's Farming Contest",
    location: "/warp garden",
    extras: CROPS[i % CROPS.length],
  }));
}

function feedBody(path: string, now = Date.now()): unknown {
  if (path === "/hysky/calendar") return cropsBody(now);
  if (path === "/v2/resources/skyblock/election") return electionBody();
  if (path === "/v2/skyblock/firesales")
    return {
      success: true,
      sales: [
        {
          item_id: "PET_SKIN_TEST",
          start: now - DAY_MS,
          end: now + DAY_MS,
          amount: 2500,
          price: 650,
        },
      ],
    };
  if (path === "/v2/resources/skyblock/bingo")
    return {
      success: true,
      lastUpdated: now,
      id: 60,
      name: "Test Bingo",
      start: now - DAY_MS,
      end: now + 6 * DAY_MS,
      modifier: "NORMAL",
      goals: [
        { id: "fish", name: "Gone Fishing", lore: "§7Catch §e50 §7fish." },
      ],
    };
  if (path === "/v2/skyblock/news")
    return {
      success: true,
      items: [
        {
          title: "SkyBlock v0.99",
          text: "1st December 2026",
          link: "https://hypixel.net/threads/1/",
          item: { material: "NETHER_STAR" },
        },
        {
          title: "SkyBlock v0.98",
          text: "1st November 2026",
          link: "https://hypixel.net/threads/2/",
          item: { material: "PAPER" },
        },
      ],
    };
  return null;
}

function serve(): void {
  createServer((request, response) => {
    const path = new URL(request.url ?? "/", FAKE_SKYBLOCK).pathname;
    if (path === "/health") {
      response.end("ok");
      return;
    }
    if (path === "/v2/skyblock/bazaar") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(bazaarBody()));
      return;
    }
    const feed = feedBody(path);
    if (feed !== null) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(feed));
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  }).listen(FAKE_SKYBLOCK_PORT, "127.0.0.1", () => {
    console.log(`Fake Hypixel on ${FAKE_SKYBLOCK}`);
  });
}

if (import.meta.main) serve();
