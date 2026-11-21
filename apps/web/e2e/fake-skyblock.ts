/**
 * Hypixel's Bazaar for the SkyBlock e2e specs: /v2/skyblock/bazaar answers with every
 * shard in the committed snapshot, priced from its hunting rate (rarer, slower shards
 * dearer; a few shards with nobody selling), so the profit list has rows and coin mode
 * has prices. The site fetches it (SKYBLOCK_BAZAAR_URL in playwright.config.ts).
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
    response.statusCode = 404;
    response.end("not found");
  }).listen(FAKE_SKYBLOCK_PORT, "127.0.0.1", () => {
    console.log(`Fake Bazaar on ${FAKE_SKYBLOCK}`);
  });
}

if (import.meta.main) serve();
