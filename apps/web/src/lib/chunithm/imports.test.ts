import { makeChart } from "@trilleo/chunithm/testing";
import {
  chuniBuilds,
  chuniCharts,
  chuniImports,
  chuniSongs,
  files,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver, readBytes } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUNDLE_FORMAT,
  BUNDLE_INDEX,
  tileFile,
  webpSize,
  type BundleIndex,
} from "./bundle";
import { bundleCharts, readProgress } from "./bundler";
import { chartTodo, queueImport, runImports, waitingBundles } from "./imports";
import { encodePng } from "./png";
import { BUILD_VERSION } from "./picture";
import { encodeWebp } from "./webp";
import { ZipWriter } from "./zip-writer";

const ORIGIN = "https://sdvx.test";
const chart = makeChart(400, [100, 60, 150], [10, 250, 300, 600, 790]);
const script = (id: string) =>
  `function PNG${id}M(){document.write("<img src=/chunithm/${id.slice(3)}/bg/${id}bg.png height=792><p class=data><img src=/chunithm/${id.slice(3)}/obj/data${id}mst.png height=792></p><p class=data><img src=/chunithm/${id.slice(3)}/bg/${id}bar.png height=792></p>");}`;

let served: Map<string, Uint8Array | string>;
let fetched: string[];
const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  fetched.push(url);
  const body = served.get(url);
  return Promise.resolve(
    body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(
          typeof body === "string" ? body : new Blob([new Uint8Array(body)]),
          { status: 200, headers: { etag: '"1"' } },
        ),
  );
};

function serve(id: string): void {
  const folder = id.slice(3);
  served.set(`${ORIGIN}/chunithm/${folder}/js/${id}data.js`, script(id));
  served.set(
    `${ORIGIN}/chunithm/${folder}/bg/${id}bg.png`,
    encodePng(chart.bg),
  );
  served.set(
    `${ORIGIN}/chunithm/${folder}/obj/data${id}mst.png`,
    encodePng(chart.obj),
  );
  served.set(
    `${ORIGIN}/chunithm/${folder}/bg/${id}bar.png`,
    encodePng(chart.bar),
  );
}

let handle: DatabaseHandle;
let storage: LocalDriver;
let out: string;
const clock = new Date("2026-10-25T08:00:00.000Z");
const ids: Record<string, number> = {};
const deps = () => ({ db: handle.db, storage, now: () => clock });

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });
  out = mkdtempSync(join(tmpdir(), "chunithm-bundles-"));
  fetched = [];
  served = new Map();
  serve("00001");
  serve("00002");
  await handle.db.insert(chuniSongs).values([
    { id: 1, title: "Older", addedOn: "2025-01-10" },
    { id: 2, title: "Newer", addedOn: "2026-07-02" },
    { id: 3, title: "Gone", addedOn: "2026-08-01", inGame: false },
  ]);
  const rows = await handle.db
    .insert(chuniCharts)
    .values([
      { songId: 1, difficulty: "master", level: "13", sdvxPath: "01/00001mst" },
      { songId: 2, difficulty: "master", level: "14", sdvxPath: "02/00002mst" },
      { songId: 2, difficulty: "expert", level: "12", sdvxPath: "02/00002exp" },
      { songId: 3, difficulty: "master", level: "13", sdvxPath: "03/00003mst" },
    ])
    .returning({
      id: chuniCharts.id,
      songId: chuniCharts.songId,
      difficulty: chuniCharts.difficulty,
    });
  for (const row of rows)
    ids[`${String(row.songId)}${row.difficulty}`] = row.id;
});
afterEach(async () => {
  await handle.close();
  rmSync(out, { recursive: true, force: true });
});

/** Uploads a bundle file as the admin's upload would leave it (processed). */
async function upload(path: string, id = "bundle000001"): Promise<string> {
  const bytes = new Uint8Array(readFileSync(path));
  const key = `f/${id}/bundle.zip`;
  await storage.put(key, bytes, {
    contentType: "application/zip",
    contentDisposition: "attachment",
    cacheControl: "private, no-store",
  });
  await handle.db.insert(files).values({
    id,
    purpose: "chunithm-import",
    name: path.split("/").at(-1) ?? "bundle.zip",
    key,
    size: bytes.length,
    contentType: "application/zip",
    kind: "archive",
    label: "ZIP archive",
    visibility: "private",
    status: "published",
  });
  return id;
}

function bundlesIn(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".zip"))
    .sort()
    .map((name) => join(dir, name));
}

/** A bundle written by hand, to try what the importer refuses. */
function handMade(index: Partial<BundleIndex>, tiles: [string, Uint8Array][]) {
  const path = join(out, "hand-made.zip");
  const chunks: Buffer[] = [];
  const zip = new ZipWriter((chunk) => chunks.push(Buffer.from(chunk)));
  for (const [name, bytes] of tiles) zip.add(name, bytes);
  zip.add(
    BUNDLE_INDEX,
    new TextEncoder().encode(
      JSON.stringify({
        kind: "chunithm-bundle",
        format: BUNDLE_FORMAT,
        buildVersion: BUILD_VERSION,
        createdAt: clock.toISOString(),
        charts: [],
        ...index,
      }),
    ),
  );
  zip.finish();
  const bytes = Buffer.concat(chunks);
  writeFileSync(path, bytes);
  return path;
}

describe("the to-do list", () => {
  it("lists in-game Master charts without a picture, newest first", async () => {
    let todo = await chartTodo(handle.db, clock);
    expect(todo).toMatchObject({
      kind: "chunithm-todo",
      buildVersion: BUILD_VERSION,
    });
    expect(todo.charts.map((row) => row.chartId)).toEqual([
      ids["2master"],
      ids["1master"],
    ]);
    // A failed build still needs a picture; a ready one doesn't.
    await handle.db.insert(chuniBuilds).values([
      { chartId: ids["2master"] ?? 0, variant: "normal", status: "failed" },
      {
        chartId: ids["1master"] ?? 0,
        variant: "normal",
        status: "ready",
        manifest: {
          width: 200,
          height: 1,
          gutter: 50,
          lane: 150,
          tiles: [],
          measures: [],
          columns: 1,
        },
      },
    ]);
    todo = await chartTodo(handle.db, clock);
    expect(todo.charts.map((row) => row.chartId)).toEqual([ids["2master"]]);
  });
});

describe("building on the admin's computer and importing", () => {
  it("bundles the list, and the import makes the charts ready", async () => {
    const todo = await chartTodo(handle.db, clock);
    const steps: string[] = [];
    const result = await bundleCharts({
      todo,
      outDir: out,
      sdvxOrigin: ORIGIN,
      fetch: fakeFetch,
      delayMs: 0,
      now: () => clock,
      progress: (event) => {
        const step =
          event.step.stage === "layer" ? event.step.name : event.step.stage;
        const line = `${String(event.index)}/${String(event.total)} ${step}`;
        if (steps.at(-1) !== line) steps.push(line);
      },
    });
    expect(result).toMatchObject({ built: 2, failed: [], left: 0 });
    // Each chart's steps, for the script's progress line.
    expect(steps).toEqual([
      "1/2 script",
      "1/2 lanes",
      "1/2 notes",
      "1/2 measure numbers",
      "1/2 tiles",
      "2/2 script",
      "2/2 lanes",
      "2/2 notes",
      "2/2 measure numbers",
      "2/2 tiles",
    ]);
    const [bundle] = bundlesIn(out);
    expect(bundlesIn(out)).toHaveLength(1);

    const fileId = await upload(bundle ?? "");
    expect(await waitingBundles(handle.db)).toHaveLength(1);
    expect(await queueImport(handle.db, fileId, clock)).toBe(true);
    // Queued once only.
    expect(await queueImport(handle.db, fileId, clock)).toBe(false);
    expect(await runImports(deps())).toBe(1);

    const [row] = await handle.db.select().from(chuniImports);
    expect(row).toMatchObject({ status: "done" });
    expect(row?.summary).toEqual({ imported: 2, skipped: [], refused: [] });
    for (const chartId of [ids["1master"], ids["2master"]]) {
      const [build] = await handle.db
        .select()
        .from(chuniBuilds)
        .where(eq(chuniBuilds.chartId, chartId ?? 0));
      expect(build).toMatchObject({
        status: "ready",
        version: BUILD_VERSION,
        variant: "normal",
      });
      expect(build?.source?.tags.obj).toBe(
        `"1"|${String(encodePng(chart.obj).length)}`,
      );
      for (const tile of build?.manifest?.tiles ?? []) {
        const bytes = await readBytes(await storage.read(tile.key));
        expect(webpSize(bytes)).toEqual({ width: 200, height: tile.height });
        // Served publicly, as a build's tiles are.
        const served = await storage.handle(
          new Request("http://localhost/", { method: "HEAD" }),
          `public/${tile.key}`,
        );
        expect(served.status).toBe(200);
      }
    }
    // The upload is gone once imported.
    const [file] = await handle.db.select().from(files);
    expect(file?.status).toBe("deleted");
    expect(await storage.head(file?.key ?? "")).toBeNull();
    expect(await waitingBundles(handle.db)).toEqual([]);
  });

  it("carries on where it stopped, and leaves failed charts for a retry", async () => {
    served.delete(`${ORIGIN}/chunithm/01/bg/00001bar.png`);
    const todo = await chartTodo(handle.db, clock);
    const options = {
      todo,
      outDir: out,
      sdvxOrigin: ORIGIN,
      fetch: fakeFetch,
      delayMs: 0,
      now: () => clock,
    };
    const first = await bundleCharts({ ...options, limit: 1 });
    expect(first).toMatchObject({ built: 1, left: 1 });
    const second = await bundleCharts(options);
    expect(second.built).toBe(0);
    expect(second.failed[0]?.reason).toMatch(/measure numbers layer/);
    expect(bundlesIn(out)).toHaveLength(1);

    // Running again skips both: one bundled, one failed (until asked to retry).
    fetched = [];
    expect(await bundleCharts(options)).toMatchObject({ built: 0, left: 0 });
    expect(fetched).toEqual([]);
    serve("00001");
    const third = await bundleCharts({ ...options, retryFailed: true });
    expect(third.built).toBe(1);
    expect(bundlesIn(out)).toHaveLength(2);
    const progress = readProgress(out);
    expect(Object.keys(progress.bundled).sort()).toEqual(
      [
        `${String(ids["1master"])}-normal`,
        `${String(ids["2master"])}-normal`,
      ].sort(),
    );
    expect(progress.failed).toEqual({});
  });

  it("skips charts that no longer need a picture", async () => {
    const todo = await chartTodo(handle.db, clock);
    await bundleCharts({
      todo,
      outDir: out,
      sdvxOrigin: ORIGIN,
      fetch: fakeFetch,
      delayMs: 0,
    });
    // Song 2's Master got a picture meanwhile; song 1's moved to another page.
    await handle.db.insert(chuniBuilds).values({
      chartId: ids["2master"] ?? 0,
      variant: "normal",
      status: "building",
    });
    await handle.db
      .update(chuniCharts)
      .set({ sdvxPath: "01/00001mst2" })
      .where(eq(chuniCharts.id, ids["1master"] ?? 0));
    const fileId = await upload(bundlesIn(out)[0] ?? "");
    await queueImport(handle.db, fileId, clock);
    await runImports(deps());
    const [row] = await handle.db.select().from(chuniImports);
    expect(row?.summary?.imported).toBe(0);
    expect(row?.summary?.skipped.map((note) => note.reason).sort()).toEqual([
      "it's being built here right now",
      "its sdvx.in page has changed since the to-do list",
    ]);
  });

  it("refuses bundles and charts that don't check out", async () => {
    const todo = await chartTodo(handle.db, clock);
    await bundleCharts({
      todo,
      outDir: out,
      sdvxOrigin: ORIGIN,
      fetch: fakeFetch,
      delayMs: 0,
    });
    // Take the real bundle's index apart to make bad ones from it.
    const real = new Uint8Array(readFileSync(bundlesIn(out)[0] ?? ""));
    const { listZip, readZipEntry } = await import("@trilleo/storage");
    const read = (start: number, end: number) =>
      Promise.resolve(real.slice(start, end));
    const listing = await listZip(real.length, read, 1000);
    const entries = new Map(
      listing?.entries.map((entry) => [entry.name, entry]),
    );
    const indexEntry = entries.get(BUNDLE_INDEX);
    const index = JSON.parse(
      new TextDecoder().decode(
        (indexEntry && (await readZipEntry(indexEntry, read))) ?? undefined,
      ),
    ) as BundleIndex;
    const [newer, older] = index.charts;
    const tile = async (name: string) => {
      const entry = entries.get(name);
      return (entry && (await readZipEntry(entry, read))) ?? new Uint8Array();
    };
    const newerTile = await tile(newer?.tiles[0]?.file ?? "");

    // Made by other build code: the whole bundle is refused.
    let fileId = await upload(
      handMade({ buildVersion: BUILD_VERSION + 1, charts: index.charts }, []),
      "bundle000002",
    );
    await queueImport(handle.db, fileId, clock);
    await runImports(deps());
    let [row] = await handle.db
      .select()
      .from(chuniImports)
      .where(eq(chuniImports.fileId, fileId));
    expect(row).toMatchObject({ status: "failed" });
    expect(row?.summary?.error).toMatch(/build code version/);

    // One chart's tile is missing, the other's isn't a picture.
    fileId = await upload(
      handMade({ charts: index.charts }, [
        [
          tileFile(older?.chartId ?? 0, "normal", 0),
          new TextEncoder().encode("not a picture at all, sorry"),
        ],
      ]),
      "bundle000003",
    );
    await queueImport(handle.db, fileId, clock);
    await runImports(deps());
    [row] = await handle.db
      .select()
      .from(chuniImports)
      .where(eq(chuniImports.fileId, fileId));
    expect(row?.summary?.imported).toBe(0);
    expect(row?.summary?.refused.map((note) => note.reason).sort()).toEqual([
      `its tile ${older?.tiles[0]?.file ?? ""} isn't a WebP picture`,
      `its tile ${newer?.tiles[0]?.file ?? ""} is missing`,
    ]);
    expect(await handle.db.select().from(chuniBuilds)).toEqual([]);

    // A tile of the wrong size, under the right name: refused.
    const height = newer?.tiles[0]?.height ?? 1;
    const short = await encodeWebp({
      width: 200,
      height: height - 1,
      data: new Uint8Array(200 * (height - 1) * 4).fill(255),
    });
    fileId = await upload(
      handMade({ charts: newer ? [newer] : [] }, [
        [newer?.tiles[0]?.file ?? "", short],
      ]),
      "bundle000004",
    );
    await queueImport(handle.db, fileId, clock);
    await runImports(deps());
    [row] = await handle.db
      .select()
      .from(chuniImports)
      .where(eq(chuniImports.fileId, fileId));
    expect(row?.summary?.refused[0]?.reason).toBe(
      `its tile ${newer?.tiles[0]?.file ?? ""} is 200×${String(height - 1)}, not 200×${String(height)}`,
    );

    // The real tile imports.
    fileId = await upload(
      handMade({ charts: newer ? [newer] : [] }, [
        [newer?.tiles[0]?.file ?? "", newerTile],
      ]),
      "bundle000005",
    );
    await queueImport(handle.db, fileId, clock);
    await runImports(deps());
    [row] = await handle.db
      .select()
      .from(chuniImports)
      .where(eq(chuniImports.fileId, fileId));
    expect(row?.summary?.imported).toBe(1);
  });
});
