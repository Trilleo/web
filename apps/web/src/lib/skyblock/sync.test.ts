import { deflateSync } from "node:zlib";
import {
  adminAlerts,
  openDatabase,
  sbDatasets,
  sbIcons,
  sbSyncs,
  type DatabaseHandle,
} from "@trilleo/db";
import { RULE_SOURCES } from "@trilleo/skyblock/calc";
import { sourceFiles } from "@trilleo/skyblock/testing";
import { LocalDriver } from "@trilleo/storage/server";
import { asc } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodePng, encodePng } from "../chunithm/png";
import { forgetData, shardData } from "./data";
import {
  DATA_FILES,
  ICON_DIR,
  fetchBytes,
  gitBlobSha,
  type SkyblockSource,
} from "./source";
import {
  BACKLOG_GAP_MS,
  FAILURES_TO_ALERT,
  ICON_PREFIX,
  SYNC_EVERY_MS,
  passDue,
  syncShards,
  type SyncDeps,
} from "./sync";

const SOURCE: SkyblockSource = {
  repo: "someone/skyshards",
  apiUrl: "https://api.test",
  rawUrl: "https://raw.test",
};

/** Filler shards in the fixture: 205 shards in all. */
const EXTRA = 200;

// The committed copy, as far as these tests know: the fixture (205 shards), with
// Grove's icon committed.
const groveIcon = encodePng({
  width: 2,
  height: 2,
  data: new Uint8Array(16).fill(200),
});
vi.mock("./data", async (importOriginal) => {
  const original = await importOriginal<typeof import("./data")>();
  const { readSources: read } = await import("@trilleo/skyblock");
  const { sourceFiles: files } = await import("@trilleo/skyblock/testing");
  const { encodePng: encode } = await import("../chunithm/png");
  const { gitBlobSha: blob } = await import("./source");
  const data = read(files({ extra: 200 }));
  const icon = encode({
    width: 2,
    height: 2,
    data: new Uint8Array(16).fill(200),
  });
  const snapshot = { commit: "0".repeat(40), files: {}, data };
  return {
    ...original,
    committedSnapshot: () => snapshot,
    STATIC_ICONS: { SHARD_GROVE: { file: "grove.webp", sha: blob(icon) } },
  };
});

let handle: DatabaseHandle;
let storage: LocalDriver;
let clock: Date;
let commit: string;
/** Repository files at the current commit: path → bytes. */
let repo: Map<string, Uint8Array>;
let requests: string[];
/** Paths that answer 503 (or a status) instead of the file. */
let failing: Map<string, number>;
/** SkyShards' calculator files in the tree: path → blob SHA (RULE_SOURCES unless changed). */
let rules: Record<string, string>;

const json = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));

function setFiles(files = sourceFiles({ extra: EXTRA })): void {
  repo.set(DATA_FILES.fusionData, json(files.fusionData));
  repo.set(DATA_FILES.properties, json(files.properties));
  repo.set(DATA_FILES.descriptions, json(files.descriptions));
  repo.set(DATA_FILES.rates, json(files.rates));
}

const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  requests.push(url);
  const respond = (body: Uint8Array | string, status = 200) =>
    Promise.resolve(
      new Response(typeof body === "string" ? body : Buffer.from(body), {
        status,
      }),
    );
  if (url === `${SOURCE.apiUrl}/repos/${SOURCE.repo}/commits/HEAD`)
    return respond(JSON.stringify({ sha: commit }));
  if (
    url ===
    `${SOURCE.apiUrl}/repos/${SOURCE.repo}/git/trees/${commit}?recursive=1`
  )
    return respond(
      JSON.stringify({
        tree: [
          ...[...repo].map(([path, bytes]) => ({
            path,
            type: "blob",
            sha: gitBlobSha(bytes),
          })),
          ...Object.entries(rules).map(([path, sha]) => ({
            path,
            type: "blob",
            sha,
          })),
        ],
        truncated: false,
      }),
    );
  const prefix = `${SOURCE.rawUrl}/${SOURCE.repo}/${commit}/`;
  if (url.startsWith(prefix)) {
    const path = url.slice(prefix.length);
    const status = failing.get(path);
    if (status) return respond("no", status);
    const bytes = repo.get(path);
    return bytes ? respond(bytes) : respond("missing", 404);
  }
  return respond("unknown", 404);
};

const deps = (over: SyncDeps = {}): SyncDeps => ({
  fetch: fakeFetch,
  source: SOURCE,
  storage,
  now: () => clock,
  sleep: () => Promise.resolve(),
  ...over,
});

const icon = (shade: number) =>
  encodePng({ width: 4, height: 4, data: new Uint8Array(64).fill(shade) });

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });
  clock = new Date("2026-11-20T08:00:00.000Z");
  commit = "a".repeat(40);
  repo = new Map();
  requests = [];
  failing = new Map();
  rules = { ...RULE_SOURCES };
  setFiles();
  repo.set(`${ICON_DIR}C1.png`, groveIcon);
  repo.set(`${ICON_DIR}R45.png`, icon(90));
  repo.set(`${ICON_DIR}L6.png`, icon(120));
  forgetData();
});

afterEach(async () => {
  await handle.close();
});

const iconRows = () =>
  handle.db.select().from(sbIcons).orderBy(asc(sbIcons.shardId));

describe("syncShards", () => {
  it("reads the files, keeps their SHAs, and copies icons that aren't committed", async () => {
    const result = await syncShards(handle.db, deps());
    // The committed copy had no file SHAs, so the files were read; their data is the
    // same, so it isn't a new version, but a row remembers the SHAs.
    expect(result).toMatchObject({
      ok: true,
      commit,
      changed: false,
      shards: 205,
      pairs: 5,
      iconsCopied: 2,
      iconsLeft: 0,
    });
    const rows = await handle.db.select().from(sbDatasets);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.files[DATA_FILES.rates]).toBe(
      gitBlobSha(repo.get(DATA_FILES.rates) ?? new Uint8Array()),
    );
    const icons = await iconRows();
    expect(icons.map((row) => row.shardId)).toEqual([
      "SHARD_CROCODILE",
      "SHARD_TIAMAT",
    ]);
    const key = icons[0]?.key ?? "";
    expect(key.startsWith(`${ICON_PREFIX}crocodile-`)).toBe(true);
    expect((await storage.head(key))?.size).toBeGreaterThan(0);

    const data = await shardData(handle.db, storage);
    expect(data.datasetId).toBe(rows[0]?.id);
    expect(data.icons.get("SHARD_GROVE")).toBe(
      "/tools/skyblock/shard-icons/grove.webp",
    );
    expect(data.icons.get("SHARD_CROCODILE")).toBe(storage.publicUrl(key));
  });

  it("downloads nothing when the files haven't changed", async () => {
    await syncShards(handle.db, deps());
    requests = [];
    commit = "b".repeat(40);
    const result = await syncShards(handle.db, deps());
    expect(result).toMatchObject({ ok: true, changed: false, iconsCopied: 0 });
    expect(requests).toHaveLength(2);
    expect(await handle.db.select().from(sbDatasets)).toHaveLength(1);
  });

  it("keeps a new version, noting new and departed shards", async () => {
    await syncShards(handle.db, deps());
    const files = sourceFiles({ extra: EXTRA });
    const data = files.fusionData as {
      shards: Record<string, Record<string, unknown>>;
    };
    const props = files.properties as Record<string, Record<string, unknown>>;
    delete data.shards.U1;
    delete props.U1;
    data.shards.E900 = {
      ...data.shards.E1,
      name: "Newcomer",
      internal_id: "SHARD_NEWCOMER",
    };
    props.E900 = { ...props.E1, name: "Newcomer" };
    setFiles(files);
    const result = await syncShards(handle.db, deps());
    expect(result).toMatchObject({
      changed: true,
      newShards: ["Newcomer"],
      removedShards: ["Bogged"],
    });
    const [alert] = await handle.db.select().from(adminAlerts);
    expect(alert?.summary).toBe(
      "SkyBlock: new shard: Newcomer; gone from the data: Bogged.",
    );
    forgetData();
    expect(
      (await shardData(handle.db, storage)).catalog.bySlugOf("newcomer"),
    ).toBeDefined();
  });

  it("keeps the old version when the files don't read, still copying icons", async () => {
    repo.set(DATA_FILES.fusionData, json({ shards: {} }));
    const result = await syncShards(handle.db, deps());
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/no recipes/);
    expect(await handle.db.select().from(sbDatasets)).toHaveLength(0);
    expect(result.iconsCopied).toBe(2);
  });

  it("refuses a list that lost too many shards", async () => {
    setFiles(sourceFiles({ extra: 150 }));
    const result = await syncShards(handle.db, deps());
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/155 shards against 205/);
  });

  it("tries flaky downloads again", async () => {
    failing.set(DATA_FILES.rates, 503);
    let calls = 0;
    const flaky: typeof fetch = (input, init) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.endsWith(DATA_FILES.rates) && calls++ === 1)
        failing.delete(DATA_FILES.rates);
      return fakeFetch(input, init);
    };
    expect((await syncShards(handle.db, deps({ fetch: flaky }))).ok).toBe(true);
  });

  it("copies an icon again when SkyShards changes it, removing the old copy", async () => {
    await syncShards(handle.db, deps());
    const [before] = await iconRows();
    repo.set(`${ICON_DIR}R45.png`, icon(30));
    commit = "c".repeat(40);
    expect((await syncShards(handle.db, deps())).iconsCopied).toBe(1);
    const [after] = await iconRows();
    expect(after?.key).not.toBe(before?.key);
    expect(await storage.head(before?.key ?? "")).toBeNull();
  });

  it("waits a day before trying a failed icon again", async () => {
    repo.set(`${ICON_DIR}L6.png`, new TextEncoder().encode("not a png"));
    const first = await syncShards(handle.db, deps());
    expect(first).toMatchObject({ iconsCopied: 1, iconsFailed: 1 });
    const failed = (await iconRows()).find(
      (row) => row.shardId === "SHARD_TIAMAT",
    );
    expect(failed).toMatchObject({ key: null, error: "not a PNG" });
    expect((await syncShards(handle.db, deps())).iconsFailed).toBe(0);
    clock = new Date(clock.getTime() + 25 * 60 * 60 * 1000);
    expect((await syncShards(handle.db, deps())).iconsFailed).toBe(1);
  });

  it("tells the admin once when SkyShards changes its calculator rules", async () => {
    rules["src/services/minCostSolver.ts"] = "f".repeat(40);
    expect((await syncShards(handle.db, deps())).rulesChanged).toEqual([
      "src/services/minCostSolver.ts",
    ]);
    commit = "d".repeat(40);
    await syncShards(handle.db, deps());
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts.map((alert) => alert.summary)).toEqual([
      "SkyBlock: SkyShards changed its calculator rules (src/services/minCostSolver.ts): check packages/skyblock/src/calc against them.",
    ]);
  });

  it("does nothing with fetching off, and alerts after failures in a row", async () => {
    for (let i = 0; i < FAILURES_TO_ALERT; i++) {
      const result = await syncShards(handle.db, deps({ source: null }));
      expect(result.errors).toEqual([
        "Fetching is switched off (SKYBLOCK_SYNC=off).",
      ]);
    }
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.summary).toMatch(/failed 4 times in a row/);
    expect(await handle.db.select().from(sbSyncs)).toHaveLength(
      FAILURES_TO_ALERT,
    );
  });
});

describe("shardData", () => {
  it("uses the committed copy until a version is kept", async () => {
    // (data.ts reads the real snapshot.json: the mock above only reaches the sync.)
    const data = await shardData(handle.db, null);
    expect(data.datasetId).toBeNull();
    expect(data.catalog.shards.length).toBeGreaterThan(300);
    expect(data.catalog.bySlugOf("tiamat")?.rarity).toBe("legendary");
    expect(data.icons.get("SHARD_TIAMAT")).toBe(
      "/tools/skyblock/shard-icons/tiamat.webp",
    );
  });
});

describe("passDue", () => {
  it("waits SYNC_EVERY_MS, or BACKLOG_GAP_MS while icons wait", () => {
    expect(
      passDue({ lastStart: 0, lastEnd: 10, backlog: false }, SYNC_EVERY_MS - 1),
    ).toBe(false);
    expect(
      passDue({ lastStart: 0, lastEnd: 10, backlog: false }, SYNC_EVERY_MS),
    ).toBe(true);
    expect(
      passDue(
        { lastStart: 0, lastEnd: 10, backlog: true },
        BACKLOG_GAP_MS + 10,
      ),
    ).toBe(true);
  });
});

describe("fetchBytes", () => {
  it("gives up at once on a 404, and after its tries on 503s", async () => {
    let calls = 0;
    const answer =
      (status: number): typeof fetch =>
      () => {
        calls++;
        return Promise.resolve(new Response("x", { status }));
      };
    await expect(
      fetchBytes(answer(404), "https://x.test/a", 10, {
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toThrow(/HTTP 404/);
    expect(calls).toBe(1);
    calls = 0;
    await expect(
      fetchBytes(answer(503), "https://x.test/a", 10, {
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toThrow(/HTTP 503/);
    expect(calls).toBe(3);
  });

  it("refuses bodies over the limit", async () => {
    const big: typeof fetch = () =>
      Promise.resolve(new Response("x".repeat(20)));
    await expect(fetchBytes(big, "https://x.test/a", 10)).rejects.toThrow(
      /more than 10 bytes/,
    );
  });
});

describe("decodePng", () => {
  it("reads 4-bit palette images (some shard icons are)", async () => {
    // 3×1, palette red/green/blue, indexes 0 1 2 packed two to a byte.
    const chunk = (type: string, data: Uint8Array) => {
      const out = new Uint8Array(12 + data.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, data.length);
      out.set(new TextEncoder().encode(type), 4);
      out.set(data, 8);
      return out;
    };
    const header = new Uint8Array(13);
    new DataView(header.buffer).setUint32(0, 3);
    new DataView(header.buffer).setUint32(4, 1);
    header[8] = 4;
    header[9] = 3;
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("PLTE", new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255])),
      chunk("tRNS", new Uint8Array([255, 128])),
      chunk("IDAT", deflateSync(Buffer.from([0, 0x01, 0x20]))),
      chunk("IEND", new Uint8Array()),
    ]);
    const image = await decodePng(new Uint8Array(png));
    expect([...image.data]).toEqual([
      255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255,
    ]);
  });
});
