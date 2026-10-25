/**
 * Building charts on the admin's computer and bundling them for the site
 * (scripts/chunithm-bundle.ts is the command around it). It works through a to-do
 * list from /admin/chunithm/todo.json, one chart at a time from sdvx.in, with
 * picture.ts (the server's own code), and writes ZIP bundles (bundle.ts) of up to
 * about BUNDLE_LIMITS.targetBytes each into `outDir`, ready to upload at
 * /admin/chunithm/import/.
 *
 * Up to `parallel` charts download at once (`fetchLayers`: the script and three
 * compressed layers), starting at most one every `delayMs`; joining and encoding
 * (`makePicture` with what was fetched) run one chart at a time, so memory and CPU
 * stay as for one. A chart goes into a bundle only once its whole picture is made,
 * so a failure leaves nothing half-written. `progress.json` in `outDir` records charts bundled
 * (once their bundle is finished) and charts that failed, with why, so running again
 * carries on; failed ones are tried again only with `retryFailed`. Stopping
 * (`signal`) starts nothing new and lets the charts in progress finish; `drop` also
 * abandons those (they're left for the next run). Either way the open bundle is
 * finished first.
 */
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import {
  BUNDLE_FORMAT,
  BUNDLE_INDEX,
  BUNDLE_LIMITS,
  tileFile,
  type BundleChart,
  type BundleIndex,
  type Todo,
  type TodoChart,
} from "./bundle";
import {
  BUILD_VERSION,
  fetchLayers,
  makePicture,
  type Fetched,
  type PictureStep,
  type Tile,
} from "./picture";
import { encodeWebp } from "./webp";
import { ZipWriter } from "./zip-writer";

export const PROGRESS_FILE = "progress.json";
/** Downloads at once: the default, and the most allowed. */
export const PARALLEL = { default: 3, max: 8 };

export interface Progress {
  /** "<chart>-<variant>" → the bundle it went into. */
  bundled: Record<string, string>;
  /** "<chart>-<variant>" → why it failed. */
  failed: Record<string, string>;
}

/** Where the run has got: which chart (1-based of `total`), and its step. */
export interface BundleProgress {
  index: number;
  total: number;
  chart: TodoChart;
  step:
    | PictureStep
    | { stage: "waiting"; ms: number }
    /** Downloaded; waiting for its turn to be joined. */
    | { stage: "queued" }
    /** Finished: in the bundle, failed, or dropped (left for the next run). */
    | { stage: "done"; result: "bundled" | "failed" | "dropped" };
}

export interface BundlerOptions {
  todo: Todo;
  outDir: string;
  sdvxOrigin: string;
  fetch?: typeof fetch;
  /** Wait between charts, to be polite to sdvx.in. */
  delayMs?: number;
  /** Start a new bundle past this many bytes. */
  targetBytes?: number;
  /** Charts built at most this run. */
  limit?: number;
  retryFailed?: boolean;
  /** Downloads at once (1 to PARALLEL.max). */
  parallel?: number;
  /** Start no more charts; let those in progress finish. */
  signal?: AbortSignal;
  /** Also abandon the charts in progress. */
  drop?: AbortSignal;
  log?: (line: string) => void;
  /** Hears each step (the script's live progress line). */
  progress?: (event: BundleProgress) => void;
  now?: () => Date;
}

export interface BundlerResult {
  bundles: { file: string; charts: number; bytes: number }[];
  built: number;
  failed: { chart: TodoChart; reason: string }[];
  /** Charts left for another run (stopped, or the limit). */
  left: number;
}

const keyOf = (chart: { chartId: number; variant: string }) =>
  `${String(chart.chartId)}-${chart.variant}`;

export function readProgress(outDir: string): Progress {
  const file = join(outDir, PROGRESS_FILE);
  if (!existsSync(file)) return { bundled: {}, failed: {} };
  const value = JSON.parse(readFileSync(file, "utf8")) as Partial<Progress>;
  return { bundled: value.bundled ?? {}, failed: value.failed ?? {} };
}

function writeProgress(outDir: string, progress: Progress): void {
  const file = join(outDir, PROGRESS_FILE);
  writeFileSync(`${file}.tmp`, JSON.stringify(progress, null, 2));
  renameSync(`${file}.tmp`, file);
}

/** A bundle being written: entries go to `<name>.part`, renamed once finished. */
class OpenBundle {
  readonly charts: BundleChart[] = [];
  private readonly fd: number;
  private readonly zip: ZipWriter;

  constructor(
    readonly dir: string,
    readonly name: string,
  ) {
    this.fd = openSync(join(dir, `${name}.part`), "w");
    this.zip = new ZipWriter((chunk) => {
      writeSync(this.fd, chunk);
    });
  }

  get bytes(): number {
    return this.zip.size;
  }

  add(chart: BundleChart, tiles: Tile[]): void {
    for (const [index, tile] of tiles.entries())
      this.zip.add(chart.tiles[index]?.file ?? "", tile.bytes);
    this.charts.push(chart);
  }

  finish(createdAt: Date): number {
    const index: BundleIndex = {
      kind: "chunithm-bundle",
      format: BUNDLE_FORMAT,
      buildVersion: BUILD_VERSION,
      createdAt: createdAt.toISOString(),
      charts: this.charts,
    };
    this.zip.add(BUNDLE_INDEX, new TextEncoder().encode(JSON.stringify(index)));
    this.zip.finish();
    closeSync(this.fd);
    renameSync(join(this.dir, `${this.name}.part`), join(this.dir, this.name));
    return this.zip.size;
  }
}

/** The next free bundle name for the day ("chunithm-bundle-2026-10-25-3.zip"). */
function nextName(dir: string, day: string): string {
  for (let n = 1; ; n++) {
    const name = `chunithm-bundle-${day}-${String(n)}.zip`;
    if (!existsSync(join(dir, name))) return name;
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

export async function bundleCharts(
  options: BundlerOptions,
): Promise<BundlerResult> {
  const {
    todo,
    outDir,
    sdvxOrigin,
    signal,
    delayMs = 1000,
    targetBytes = BUNDLE_LIMITS.targetBytes,
  } = options;
  const log = options.log ?? (() => undefined);
  const now = options.now ?? (() => new Date());
  if (todo.buildVersion !== BUILD_VERSION)
    throw new Error(
      `The to-do list is for build code version ${String(todo.buildVersion)}; this checkout is on ${String(BUILD_VERSION)}. Update the checkout (or download a new list).`,
    );
  mkdirSync(outDir, { recursive: true });
  const progress = readProgress(outDir);
  const result: BundlerResult = { bundles: [], built: 0, failed: [], left: 0 };
  const day = now().toISOString().slice(0, 10);
  let bundle: OpenBundle | null = null;
  let pending: string[] = [];

  const close = () => {
    if (!bundle) return;
    const bytes = bundle.finish(now());
    for (const key of pending) progress.bundled[key] = bundle.name;
    writeProgress(outDir, progress);
    result.bundles.push({
      file: join(outDir, bundle.name),
      charts: bundle.charts.length,
      bytes,
    });
    log(
      `Wrote ${bundle.name}: ${String(bundle.charts.length)} charts, ${(bytes / 1024 / 1024).toFixed(1)} MB.`,
    );
    bundle = null;
    pending = [];
  };

  const todoCharts = todo.charts.filter((chart) => {
    const key = keyOf(chart);
    if (progress.bundled[key]) return false;
    return options.retryFailed === true || !progress.failed[key];
  });
  const wanted = Math.min(todoCharts.length, options.limit ?? Infinity);
  const parallel = Math.max(
    1,
    Math.min(PARALLEL.max, Math.floor(options.parallel ?? PARALLEL.default)),
  );
  const drop = options.drop;
  const baseFetch = options.fetch ?? fetch;
  // Downloads are cut off when the run is dropped.
  const fetcher: typeof fetch = drop
    ? (input, init) =>
        baseFetch(input, {
          ...init,
          signal: init?.signal ? AbortSignal.any([init.signal, drop]) : drop,
        })
    : baseFetch;
  const stopped = () => signal?.aborted === true || drop?.aborted === true;

  let next = 0;
  let finished = 0;
  // Starts are spaced `delayMs` apart across every download.
  let pace: Promise<void> = Promise.resolve();
  let lastStart = 0;
  const startTurn = (index: number, chart: TodoChart) => {
    const run = pace.then(async () => {
      const wait = lastStart + delayMs - Date.now();
      if (lastStart > 0 && wait > 0 && !stopped()) {
        options.progress?.({
          index,
          total: todoCharts.length,
          chart,
          step: { stage: "waiting", ms: wait },
        });
        await sleep(wait, signal);
      }
      lastStart = Date.now();
    });
    pace = run;
    return run;
  };
  // Joining and encoding: one chart at a time.
  let joining: Promise<unknown> = Promise.resolve();
  const inTurn = (work: () => Promise<void>) => {
    const run = joining.then(work);
    joining = run.catch(() => undefined);
    return run;
  };

  const worker = async () => {
    for (;;) {
      if (stopped() || next >= wanted) return;
      const chart = todoCharts[next];
      if (!chart) return;
      const index = ++next;
      const tell = (step: BundleProgress["step"]) => {
        options.progress?.({ index, total: todoCharts.length, chart, step });
      };
      await startTurn(index, chart);
      if (stopped()) {
        tell({ stage: "done", result: "dropped" });
        return;
      }
      const key = keyOf(chart);
      const label = `[${String(index)}/${String(todoCharts.length)}] #${String(chart.songId)} ${chart.title} (${chart.difficulty})`;
      const fail = (error: unknown) => {
        // Dropped mid-way: not a failure; the next run does it.
        if (drop?.aborted) {
          tell({ stage: "done", result: "dropped" });
          return;
        }
        tell({ stage: "done", result: "failed" });
        finished++;
        const reason = error instanceof Error ? error.message : String(error);
        progress.failed[key] = reason;
        writeProgress(outDir, progress);
        result.failed.push({ chart, reason });
        log(`${label}: ${reason}`);
      };
      const deps = {
        fetch: fetcher,
        sdvxOrigin,
        encode: encodeWebp,
        progress:
          options.progress &&
          ((step: PictureStep) => {
            tell(step);
          }),
      };
      let fetched: Fetched;
      try {
        fetched = await fetchLayers(deps, chart.sdvxPath, chart.variant);
      } catch (error) {
        fail(error);
        continue;
      }
      tell({ stage: "queued" });
      await inTurn(async () => {
        if (drop?.aborted) {
          tell({ stage: "done", result: "dropped" });
          return;
        }
        const tiles: Tile[] = [];
        try {
          const picture = await makePicture(
            deps,
            chart.sdvxPath,
            chart.variant,
            (tile) => {
              tiles.push(tile);
              return Promise.resolve();
            },
            fetched,
          );
          const entry: BundleChart = {
            chartId: chart.chartId,
            variant: chart.variant,
            sdvxPath: chart.sdvxPath,
            source: picture.source,
            manifest: picture.manifest,
            tiles: tiles.map((tile) => ({
              file: tileFile(chart.chartId, chart.variant, tile.index),
              height: tile.height,
            })),
          };
          bundle ??= new OpenBundle(outDir, nextName(outDir, day));
          bundle.add(entry, tiles);
          pending.push(key);
          progress.failed = Object.fromEntries(
            Object.entries(progress.failed).filter(
              ([failed]) => failed !== key,
            ),
          );
          finished++;
          result.built++;
          tell({ stage: "done", result: "bundled" });
          log(`${label}: ${String(tiles.length)} tiles.`);
          if (bundle.bytes >= targetBytes) close();
        } catch (error) {
          fail(error);
        }
      });
    }
  };

  try {
    await Promise.all(Array.from({ length: parallel }, worker));
  } finally {
    close();
  }
  result.left = todoCharts.length - finished;
  return result;
}
