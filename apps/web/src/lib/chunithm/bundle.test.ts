import { COLUMN, TILE_HEIGHT } from "@trilleo/chunithm";
import { listZip, readZipEntry } from "@trilleo/storage";
import { describe, expect, it } from "vitest";
import {
  BUNDLE_FORMAT,
  TODO_FORMAT,
  checkBundleChart,
  parseBundleIndex,
  parseTodo,
  tileFile,
  webpSize,
  type BundleChart,
} from "./bundle";
import { BUILD_VERSION } from "./picture";
import { encodeWebp } from "./webp";
import { ZipWriter } from "./zip-writer";

function zipOf(entries: [string, Uint8Array][]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const zip = new ZipWriter((chunk) => chunks.push(chunk.slice()));
  for (const [name, bytes] of entries) zip.add(name, bytes);
  zip.finish();
  const out = new Uint8Array(zip.size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

const chart = (over: Partial<BundleChart> = {}): BundleChart => {
  const height = TILE_HEIGHT + 500;
  return {
    chartId: 7,
    variant: "normal",
    sdvxRef: "01001/mst",
    source: {
      ref: "01001/mst",
      path: "",
      bg: "/chunithm/01/bg/01001bg.webp",
      obj: "/chunithm/01/obj/data01001mst.webp",
      bar: "/chunithm/01/bg/01001bar.webp",
      tags: { bg: '"1"|10', obj: '"1"|20', bar: '"1"|30' },
    },
    manifest: {
      width: COLUMN.pitch,
      height,
      gutter: COLUMN.gutter,
      lane: COLUMN.lane,
      measures: [0, 400, 900],
      columns: 3,
    },
    tiles: [
      { file: tileFile(7, "normal", 0), height: TILE_HEIGHT },
      { file: tileFile(7, "normal", 1), height: 500 },
    ],
    ...over,
  };
};

describe("the zip writer", () => {
  it("writes archives the storage's reader reads back", async () => {
    const one = new TextEncoder().encode("one");
    const two = new Uint8Array(70_000).map((_, i) => i % 251);
    const bytes = zipOf([
      ["a/1.webp", one],
      ["bundle.json", two],
    ]);
    const read = (start: number, end: number) =>
      Promise.resolve(bytes.slice(start, end));
    const listing = await listZip(bytes.length, read);
    expect(listing?.entries.map((entry) => [entry.name, entry.size])).toEqual([
      ["a/1.webp", 3],
      ["bundle.json", 70_000],
    ]);
    const [first, second] = listing?.entries ?? [];
    expect(first && (await readZipEntry(first, read))).toEqual(one);
    expect(second && (await readZipEntry(second, read))).toEqual(two);
  });

  it("refuses entries after it's finished", () => {
    const zip = new ZipWriter(() => undefined);
    zip.finish();
    expect(() => {
      zip.add("late", new Uint8Array(1));
    }).toThrow("finished");
  });
});

describe("to-do lists", () => {
  const todo = {
    kind: "chunithm-todo",
    format: TODO_FORMAT,
    buildVersion: BUILD_VERSION,
    createdAt: "2026-10-25T00:00:00.000Z",
    charts: [
      {
        chartId: 1,
        songId: 2,
        title: "Song",
        difficulty: "master",
        sdvxRef: "02002/mst",
        variant: "normal",
      },
    ],
  };

  it("reads what the admin page writes", () => {
    expect(parseTodo(todo)).toEqual(todo);
  });

  it("says what's wrong with anything else", () => {
    expect(parseTodo({ kind: "something" })).toMatch(/isn't a CHUNITHM/);
    expect(parseTodo({ ...todo, format: 99 })).toMatch(/update your checkout/);
    expect(
      parseTodo({ ...todo, charts: [{ ...todo.charts[0], variant: "flip" }] }),
    ).toMatch(/damaged chart/);
  });
});

describe("bundles", () => {
  const index = {
    kind: "chunithm-bundle",
    format: BUNDLE_FORMAT,
    buildVersion: BUILD_VERSION,
    createdAt: "2026-10-25T00:00:00.000Z",
    charts: [chart()],
  };

  it("reads an index and checks a chart laid out as builds lay them out", () => {
    const parsed = parseBundleIndex(index);
    expect(parsed).toEqual(index);
    expect(checkBundleChart(chart())).toBeNull();
  });

  it("refuses damaged indexes", () => {
    // Bundles from before sdvx.in's new viewer (by its older pages) are refused.
    expect(parseBundleIndex({ ...index, format: 1 })).toMatch(
      /format 2, not 1/,
    );
    expect(
      parseBundleIndex({
        ...index,
        charts: [{ ...chart(), manifest: { width: "wide" } }],
      }),
    ).toMatch(/Chart 7 is damaged/);
  });

  it("refuses charts that don't add up", () => {
    const base = chart();
    expect(
      checkBundleChart({
        ...base,
        manifest: { ...base.manifest, width: 300 },
      }),
    ).toMatch(/columns/);
    expect(
      checkBundleChart({
        ...base,
        tiles: [{ file: tileFile(7, "normal", 0), height: TILE_HEIGHT + 500 }],
      }),
    ).toMatch(/tiles/);
    expect(
      checkBundleChart({
        ...base,
        tiles: [
          { file: "elsewhere.webp", height: TILE_HEIGHT },
          { file: tileFile(7, "normal", 1), height: 500 },
        ],
      }),
    ).toMatch(/tiles/);
    expect(
      checkBundleChart({
        ...base,
        manifest: { ...base.manifest, measures: [0, 900, 400] },
      }),
    ).toMatch(/measures/);
    expect(checkBundleChart({ ...base, sdvxRef: "02002/mst" })).toMatch(
      /another of sdvx.in's charts/,
    );
  });

  it("reads a WebP tile's size from its header", async () => {
    const width = 200;
    const height = 37;
    const webp = await encodeWebp({
      width,
      height,
      data: new Uint8Array(width * height * 4).fill(255),
    });
    expect(webpSize(webp)).toEqual({ width, height });
    expect(webpSize(new TextEncoder().encode("RIFF....WEBPVP8 nope"))).toBe(
      null,
    );
    expect(webpSize(new Uint8Array(40))).toBeNull();
  });
});
