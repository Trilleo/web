/**
 * Builds CHUNITHM chart pictures on this computer, over this computer's network,
 * and bundles them for the site (src/lib/chunithm/bundler.ts does the work).
 *
 * 1. /admin/chunithm/ → "Download to-do list" (chunithm-todo-<day>.json).
 * 2. pnpm --filter @trilleo/web chunithm:bundle <to-do list> [options]
 * 3. Upload the bundles at /admin/chunithm/import/ and import them.
 *
 * Options:
 *   --out <dir>       where bundles go (default: chunithm-bundles beside the list)
 *   --parallel <n>    charts downloading at once (default 3, at most 8)
 *   --delay <ms>      wait between starting downloads (default 1000)
 *   --limit <n>       build at most n charts this run
 *   --retry-failed    try charts that failed last time again
 *
 * A live block shows each chart in progress and the layer coming in (size, speed,
 * resumes), with a total line under it; without a terminal (output to a file) it's
 * printed every 10 s. Running again carries on (progress.json in the output folder).
 * Ctrl-C starts nothing new and lets the charts in progress finish; a second Ctrl-C
 * drops those too (the next run does them). Either way the bundle being written is
 * finished. CHUNITHM_SDVX_URL points it elsewhere
 * (tests); otherwise it reads sdvx.in.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseTodo } from "../src/lib/chunithm/bundle";
import { PARALLEL, bundleCharts } from "../src/lib/chunithm/bundler";
import { ProgressBoard, fitColumns } from "../src/lib/chunithm/progress";
import { SDVX_ORIGIN } from "../src/lib/chunithm/sources";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    delay: { type: "string" },
    parallel: { type: "string" },
    limit: { type: "string" },
    "retry-failed": { type: "boolean" },
  },
});

// pnpm runs scripts from apps/web; paths are typed from wherever it was run.
const here = process.env.INIT_CWD ?? process.cwd();
const listArg = positionals[0];
if (!listArg) {
  console.error(
    "Usage: pnpm --filter @trilleo/web chunithm:bundle <chunithm-todo.json> [--out dir] [--parallel n] [--delay ms] [--limit n] [--retry-failed]",
  );
  process.exit(2);
}
const listPath = resolve(here, listArg);
let read: unknown;
try {
  read = JSON.parse(readFileSync(listPath, "utf8"));
} catch (error) {
  console.error(
    `Couldn't read the to-do list at ${listPath}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
const todo = parseTodo(read);
if (typeof todo === "string") {
  console.error(todo);
  process.exit(1);
}

const whole = (text: string | undefined, name: string) => {
  if (text === undefined) return undefined;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) {
    console.error(`--${name} takes a whole number.`);
    process.exit(2);
  }
  return value;
};

// The live block: redrawn in place on a terminal, or printed now and then otherwise.
const live = process.stdout.isTTY;
const board = new ProgressBoard();
let height = 0;
const clear = () => {
  if (!live || height === 0) return;
  process.stdout.write(
    `\r${height > 1 ? `\x1b[${String(height - 1)}A` : ""}\x1b[J`,
  );
  height = 0;
};
const draw = () => {
  const width = (process.stdout.columns || 80) - 1;
  const lines = board.lines(Date.now()).map((line) => fitColumns(line, width));
  clear();
  process.stdout.write(lines.join("\n"));
  height = lines.length;
};
// Finished charts' lines go above the block.
const say = (text: string) => {
  clear();
  console.log(text);
  if (live && running) draw();
};
let running = false;
const ticker = setInterval(
  () => {
    if (!running) return;
    if (live) draw();
    else
      console.log(
        board
          .lines(Date.now())
          .reverse()
          .map((line, i) => (i === 0 ? line : `  ${line}`))
          .join("\n"),
      );
  },
  live ? 150 : 10_000,
);
ticker.unref();

const stop = new AbortController();
const drop = new AbortController();
process.on("SIGINT", () => {
  if (!stop.signal.aborted) {
    say(
      "Stopping: nothing new starts; the charts in progress finish (Ctrl-C again to drop them).",
    );
    stop.abort();
  } else if (!drop.signal.aborted) {
    say("Dropping the charts in progress; the next run does them.");
    drop.abort();
  }
});

const outDir = values.out
  ? resolve(here, values.out)
  : join(dirname(listPath), "chunithm-bundles");
console.log(
  `${String(todo.charts.length)} charts on the list; bundles go to ${outDir}.`,
);
const parallel = whole(values.parallel, "parallel");
if (parallel !== undefined && (parallel < 1 || parallel > PARALLEL.max)) {
  console.error(`--parallel takes 1 to ${String(PARALLEL.max)}.`);
  process.exit(2);
}
running = true;
try {
  const result = await bundleCharts({
    todo,
    outDir,
    sdvxOrigin: process.env.CHUNITHM_SDVX_URL ?? SDVX_ORIGIN,
    delayMs: whole(values.delay, "delay"),
    parallel,
    limit: whole(values.limit, "limit"),
    retryFailed: values["retry-failed"] ?? false,
    signal: stop.signal,
    drop: drop.signal,
    log: say,
    progress: (event) => {
      board.update(event, Date.now());
    },
  });
  running = false;
  clear();
  console.log(
    `Built ${String(result.built)}, failed ${String(result.failed.length)}, ${String(result.left)} left for another run.`,
  );
  for (const bundle of result.bundles) console.log(`  ${bundle.file}`);
  if (result.bundles.length > 0)
    console.log("Upload them at /admin/chunithm/import/.");
} catch (error) {
  running = false;
  clear();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
