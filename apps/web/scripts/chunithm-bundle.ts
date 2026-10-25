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
 *   --delay <ms>      wait between charts (default 1000)
 *   --limit <n>       build at most n charts this run
 *   --retry-failed    try charts that failed last time again
 *
 * A live line shows the chart being built and the layer coming in (size, speed,
 * resumes); without a terminal (output to a file) it's a plain line every 10 s.
 * Running again carries on (progress.json in the output folder). Ctrl-C finishes
 * the bundle being written, then stops. CHUNITHM_SDVX_URL points it elsewhere
 * (tests); otherwise it reads sdvx.in.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseTodo } from "../src/lib/chunithm/bundle";
import { bundleCharts, type BundleProgress } from "../src/lib/chunithm/bundler";
import { ProgressLine, fitColumns } from "../src/lib/chunithm/progress";
import { SDVX_ORIGIN } from "../src/lib/chunithm/sources";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    delay: { type: "string" },
    limit: { type: "string" },
    "retry-failed": { type: "boolean" },
  },
});

// pnpm runs scripts from apps/web; paths are typed from wherever it was run.
const here = process.env.INIT_CWD ?? process.cwd();
const listArg = positionals[0];
if (!listArg) {
  console.error(
    "Usage: pnpm --filter @trilleo/web chunithm:bundle <chunithm-todo.json> [--out dir] [--delay ms] [--limit n] [--retry-failed]",
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

// The live line: redrawn in place on a terminal (at most every 100 ms), or written
// out now and then otherwise.
const live = process.stdout.isTTY;
const line = new ProgressLine();
let shown = "";
let drawnAt = 0;
let lastStage = "";
const clear = () => {
  if (live && shown) process.stdout.write("\r\x1b[2K");
};
// A finished chart's line goes above; the live line comes back with the next step.
const say = (text: string) => {
  clear();
  shown = "";
  console.log(text);
};
const progress = (event: BundleProgress) => {
  const now = Date.now();
  const stage = `${String(event.index)}:${event.step.stage}`;
  const due = now - drawnAt >= (live ? 100 : 10_000);
  if (!due && stage === lastStage) return;
  const text = line.text(event, now);
  drawnAt = now;
  lastStage = stage;
  if (live) {
    shown = fitColumns(text, (process.stdout.columns || 80) - 1);
    process.stdout.write(`\r\x1b[2K${shown}`);
  } else if (due) console.log(text);
};

const stop = new AbortController();
process.once("SIGINT", () => {
  say("Stopping after this chart; the bundle being written is kept.");
  stop.abort();
});

const outDir = values.out
  ? resolve(here, values.out)
  : join(dirname(listPath), "chunithm-bundles");
console.log(
  `${String(todo.charts.length)} charts on the list; bundles go to ${outDir}.`,
);
try {
  const result = await bundleCharts({
    todo,
    outDir,
    sdvxOrigin: process.env.CHUNITHM_SDVX_URL ?? SDVX_ORIGIN,
    delayMs: whole(values.delay, "delay"),
    limit: whole(values.limit, "limit"),
    retryFailed: values["retry-failed"] ?? false,
    signal: stop.signal,
    log: say,
    progress,
  });
  clear();
  shown = "";
  console.log(
    `Built ${String(result.built)}, failed ${String(result.failed.length)}, ${String(result.left)} left for another run.`,
  );
  for (const bundle of result.bundles) console.log(`  ${bundle.file}`);
  if (result.bundles.length > 0)
    console.log("Upload them at /admin/chunithm/import/.");
} catch (error) {
  clear();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
