import { makeChart } from "@trilleo/chunithm/testing";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TODO_FORMAT, type Todo } from "./bundle";
import { bundleCharts, readProgress, type BundleProgress } from "./bundler";
import { BUILD_VERSION } from "./picture";
import { encodePng } from "./png";

const ORIGIN = "https://sdvx.test";
const CHARTS = 6;
const chart = makeChart(400, [100, 60, 150], [10, 250, 300, 600, 790]);
const layers = {
  bg: encodePng(chart.bg),
  obj: encodePng(chart.obj),
  bar: encodePng(chart.bar),
};
const id = (n: number) => String(n).padStart(5, "0");
const folder = (n: number) => String(n).padStart(2, "0");

const todo: Todo = {
  kind: "chunithm-todo",
  format: TODO_FORMAT,
  buildVersion: BUILD_VERSION,
  createdAt: "2026-10-25T00:00:00.000Z",
  charts: Array.from({ length: CHARTS }, (_, i) => ({
    chartId: i + 1,
    songId: i + 1,
    title: `Song ${String(i + 1)}`,
    difficulty: "master",
    sdvxPath: `${folder(i + 1)}/${id(i + 1)}mst`,
    variant: "normal" as const,
  })),
};

let out: string;
/** Layer downloads in flight right now, and the most seen at once. */
let inFlight = 0;
let mostInFlight = 0;
/** Each layer takes this long to arrive. */
let layerMs = 20;
let failing = new Set<number>();

const fakeFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const path = new URL(url).pathname;
  const script = /^\/chunithm\/(\d+)\/js\/(\d+)data\.js$/.exec(path);
  if (script) {
    const n = Number(script[2]);
    if (failing.has(n)) return new Response("missing", { status: 404 });
    const [f, i] = [script[1] ?? "", script[2] ?? ""];
    return new Response(
      `function PNG${i}M(){document.write("<img src=/chunithm/${f}/bg/${i}bg.png height=792><p class=data><img src=/chunithm/${f}/obj/data${i}mst.png height=792></p><p class=data><img src=/chunithm/${f}/bg/${i}bar.png height=792></p>");}`,
    );
  }
  const body = path.endsWith("bg.png")
    ? layers.bg
    : path.endsWith("mst.png")
      ? layers.obj
      : path.endsWith("bar.png")
        ? layers.bar
        : null;
  if (!body) return new Response("missing", { status: 404 });
  inFlight++;
  mostInFlight = Math.max(mostInFlight, inFlight);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, layerMs);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  } finally {
    inFlight--;
  }
  return new Response(new Blob([new Uint8Array(body)]), {
    headers: { etag: '"1"', "content-length": String(body.length) },
  });
};

beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), "chunithm-parallel-"));
  inFlight = 0;
  mostInFlight = 0;
  layerMs = 20;
  failing = new Set();
});
afterEach(() => {
  rmSync(out, { recursive: true, force: true });
});

const run = (over: Partial<Parameters<typeof bundleCharts>[0]> = {}) =>
  bundleCharts({
    todo,
    outDir: out,
    sdvxOrigin: ORIGIN,
    fetch: fakeFetch,
    delayMs: 0,
    ...over,
  });

describe("downloading in parallel", () => {
  it("downloads several charts at once, but joins them one at a time", async () => {
    const events: BundleProgress[] = [];
    const result = await run({
      parallel: 3,
      progress: (event) => events.push(event),
    });
    expect(result).toMatchObject({ built: CHARTS, failed: [], left: 0 });
    expect(mostInFlight).toBe(3);

    // Between a chart's "joining" and its "done", no other chart joins.
    let joining: number | null = null;
    for (const event of events) {
      if (event.step.stage === "joining") {
        expect(joining).toBeNull();
        joining = event.index;
      }
      if (event.step.stage === "done" && event.index === joining)
        joining = null;
    }
    // Every chart is bundled once.
    expect(Object.keys(readProgress(out).bundled)).toHaveLength(CHARTS);
  });

  it("keeps to one download with --parallel 1, and never more than the most", async () => {
    await run({ parallel: 1 });
    expect(mostInFlight).toBe(1);
    rmSync(out, { recursive: true, force: true });
    mostInFlight = 0;
    await run({ parallel: 50 });
    expect(mostInFlight).toBeLessThanOrEqual(8);
  });

  it("spaces out the starts across every download", async () => {
    const starts: number[] = [];
    await run({
      parallel: 3,
      delayMs: 40,
      progress: (event) => {
        if (event.step.stage === "script") starts.push(Date.now());
      },
    });
    expect(starts).toHaveLength(CHARTS);
    for (let i = 1; i < starts.length; i++)
      expect((starts[i] ?? 0) - (starts[i - 1] ?? 0)).toBeGreaterThanOrEqual(
        35,
      );
  });

  it("records failures without holding up the others", async () => {
    failing = new Set([2, 5]);
    const result = await run({ parallel: 3 });
    expect(result.built).toBe(CHARTS - 2);
    expect(
      result.failed.map((failure) => failure.chart.chartId).sort(),
    ).toEqual([2, 5]);
    expect(Object.keys(readProgress(out).failed).sort()).toEqual([
      "2-normal",
      "5-normal",
    ]);
  });

  it("when stopped, finishes the charts in progress and starts no more", async () => {
    const stop = new AbortController();
    layerMs = 30;
    const result = await run({
      parallel: 3,
      signal: stop.signal,
      progress: (event) => {
        if (event.index === 3 && event.step.stage === "script") stop.abort();
      },
    });
    expect(result.built).toBe(3);
    expect(result.left).toBe(CHARTS - 3);
    expect(
      readdirSync(out).filter((name) => name.endsWith(".zip")),
    ).toHaveLength(1);
  });

  it("when dropped, abandons the charts in progress for the next run", async () => {
    const stop = new AbortController();
    const drop = new AbortController();
    layerMs = 200;
    const done: string[] = [];
    const result = await run({
      parallel: 3,
      signal: stop.signal,
      drop: drop.signal,
      progress: (event) => {
        if (event.step.stage === "done") done.push(event.step.result);
        if (event.index === 3 && event.step.stage === "layer") {
          stop.abort();
          drop.abort();
        }
      },
    });
    expect(result).toMatchObject({ built: 0, failed: [], left: CHARTS });
    expect(done).toEqual(["dropped", "dropped", "dropped"]);
    expect(readProgress(out)).toEqual({ bundled: {}, failed: {} });
    // The next run does them.
    layerMs = 1;
    expect(await run({ parallel: 3 })).toMatchObject({ built: CHARTS });
  });
});
