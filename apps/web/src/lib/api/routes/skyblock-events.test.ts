import { readFileSync } from "node:fs";
import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetFeeds, refreshFeeds, FEEDS } from "../../skyblock/feeds";
import { dispatch } from "../dispatch";
import { RateLimiter } from "../rate-limit";
import { ROUTES } from "./index";

let handle: DatabaseHandle;

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../../../../../packages/skyblock/src/events/fixtures/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
}

/** Loads the saved Hypixel answers as if the site had fetched them. */
async function loadFeeds() {
  const bodies: Record<string, unknown> = {
    [FEEDS.election.path]: fixture("election"),
    [FEEDS.firesales.path]: fixture("firesales"),
    [FEEDS.bingo.path]: fixture("bingo"),
    [FEEDS.news.path]: fixture("news"),
  };
  await refreshFeeds(handle.db, {
    base: "https://hypixel.test",
    crops: null,
    sleep: () => Promise.resolve(),
    fetch: (input) => {
      const path = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      ).pathname;
      return Promise.resolve(
        new Response(JSON.stringify(bodies[path]), { status: 200 }),
      );
    },
  });
  forgetFeeds();
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  forgetFeeds();
});
afterEach(async () => {
  await handle.close();
});

async function get(path: string) {
  const url = new URL(path, "https://api.trilleo.net");
  const response = await dispatch(new Request(url), url, {
    getDb: () => Promise.resolve(handle.db),
    limiter: new RateLimiter(),
    routes: ROUTES,
    clientIp: "203.0.113.1",
    apiOrigin: "https://api.trilleo.net",
    siteOrigin: "https://www.trilleo.net",
    now: () => new Date(),
    purge: false,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe("SkyBlock event timer routes", () => {
  it("gives the SkyBlock date and every calendar event", async () => {
    const { status, body } = await get("/v1/skyblock/calendar");
    expect(status).toBe(200);
    const events = body.events as {
      slug: string;
      next: unknown;
      schedule: string;
    }[];
    expect(events.map((e) => e.slug)).toContain("spooky-festival");
    expect(events.find((e) => e.slug === "spooky-festival")?.schedule).toBe(
      "Autumn 29th to 31st",
    );
    expect(events.every((e) => e.next !== null)).toBe(true);
    expect((body.date as { year: number }).year).toBeGreaterThan(500);
  });

  it("lists times in the coming hours, of one kind if asked", async () => {
    const { body } = await get("/v1/skyblock/events?hours=3&category=farming");
    const items = body.items as { slug: string }[];
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.slug === "jacobs-farming-contest")).toBe(true);
    expect((await get("/v1/skyblock/events?hours=999")).status).toBe(400);
  });

  it("says when the feeds haven't loaded, then serves them", async () => {
    expect((await get("/v1/skyblock/mayor")).status).toBe(503);
    expect((await get("/v1/skyblock/bingo")).status).toBe(503);
    expect((await get("/v1/skyblock/firesales")).body.items).toEqual([]);
    await loadFeeds();
    const mayor = await get("/v1/skyblock/mayor");
    expect(mayor.status).toBe(200);
    expect(mayor.body.mayor).toMatchObject({ name: "Aatrox" });
    const perks = (
      mayor.body.mayor as {
        perks: { description: string; descriptionRaw: string }[];
      }
    ).perks;
    expect(perks[0]?.description).not.toContain("§");
    expect(perks[0]?.descriptionRaw).toContain("§");
    expect((mayor.body.election as { year: number }).year).toBe(527);
    const bingo = await get("/v1/skyblock/bingo");
    expect(bingo.body.name).toBe("November 2026");
  });

  it("lists recorded elections and gives one with its hours", async () => {
    await loadFeeds();
    const list = await get("/v1/skyblock/elections");
    const items = list.body.items as {
      year: number;
      closed: boolean;
      mayor: string | null;
    }[];
    expect(items.map((e) => [e.year, e.closed, e.mayor])).toEqual([
      [527, false, null],
      [526, true, "slayer"],
    ]);
    const running = await get("/v1/skyblock/elections/527");
    expect((running.body.hours as unknown[]).length).toBe(1);
    expect((await get("/v1/skyblock/elections/1")).status).toBe(404);
  });
});
