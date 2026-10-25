/**
 * The bundling script's live progress block (scripts/chunithm-bundle.ts draws it):
 * one line per chart in progress, the chart then what it's doing, e.g.
 * "[12/1100] #3062 コンクエスト・チャレンジ (master) · notes 6.2 / 14.8 MB · 310 KB/s",
 * and a total line ("12 done · 1 failed · 1085 left · 0.9 MB/s"). Pure, so it's
 * tested; speeds are worked out from the events' times.
 */
import type { BundleProgress } from "./bundler";

function size(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${String(Math.round(bytes / 1024))} KB`;
}

function rate(bytesPerSecond: number): string {
  return bytesPerSecond >= 1024 * 1024
    ? `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
    : `${String(Math.round(bytesPerSecond / 1024))} KB/s`;
}

/** Columns a character takes in a terminal: 2 for wide East Asian ones. */
function columnsOf(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
    ? 2
    : 1;
}

/** Cuts `text` to fit `columns` terminal columns (with "…" when cut). */
export function fitColumns(text: string, columns: number): string {
  let used = 0;
  let out = "";
  const chars = Array.from(
    new Intl.Segmenter().segment(text),
    (part) => part.segment,
  );
  const total = chars.reduce((sum, char) => sum + columnsOf(char), 0);
  if (total <= columns) return text;
  for (const char of chars) {
    const width = columnsOf(char);
    if (used + width > columns - 1) break;
    out += char;
    used += width;
  }
  return `${out}…`;
}

/** Turns progress events into the line's text, keeping track of each layer's speed. */
export class ProgressLine {
  private layer: {
    key: string;
    at: number;
    from: number;
    last: number;
  } | null = null;

  text(event: BundleProgress, now: number): string {
    const { chart, step } = event;
    const head = `[${String(event.index)}/${String(event.total)}] #${String(chart.songId)} ${chart.title} (${chart.difficulty})`;
    switch (step.stage) {
      case "waiting":
        return `${head} · next in ${(step.ms / 1000).toFixed(step.ms < 10_000 ? 1 : 0)} s`;
      case "downloading":
        return `${head} · connecting`;
      case "queued":
        return `${head} · downloaded, waiting to be joined`;
      case "joining":
        return `${head} · joining`;
      case "done":
        return `${head} · ${step.result}`;
      case "tiles":
        return `${head} · tiles ${String(step.done + 1)}/${String(step.total)}`;
      case "layer": {
        const key = `${String(event.index)}:${step.name}`;
        // A new layer, or a download that started over: measure from here.
        if (this.layer?.key !== key || step.received < this.layer.last)
          this.layer = { key, at: now, from: step.received, last: 0 };
        this.layer.last = step.received;
        const seconds = (now - this.layer.at) / 1000;
        const speed =
          seconds >= 1 ? (step.received - this.layer.from) / seconds : null;
        return [
          `${head} · ${step.name} ${size(step.received)}${step.total === null ? "" : ` / ${size(step.total)}`}`,
          ...(speed === null ? [] : [rate(speed)]),
          ...(step.resumes > 0
            ? [
                `resumed ${step.resumes === 1 ? "once" : `${String(step.resumes)}×`}`,
              ]
            : []),
        ].join(" · ");
      }
    }
  }
}

/** How far back the total speed looks. */
const SPEED_WINDOW_MS = 5000;

/** Every chart in progress, a line each, and a total line under them. */
export class ProgressBoard {
  private readonly slots = new Map<
    number,
    { line: ProgressLine; text: string }
  >();
  private readonly received = new Map<number, number>();
  private samples: { at: number; bytes: number }[] = [];
  private firstAt: number | null = null;
  private done = 0;
  private failed = 0;
  private total = 0;

  update(event: BundleProgress, now: number): void {
    this.total = event.total;
    const { step } = event;
    if (step.stage === "done") {
      this.slots.delete(event.index);
      this.received.delete(event.index);
      // A dropped chart is still left, for the next run.
      if (step.result === "bundled") this.done++;
      else if (step.result === "failed") this.failed++;
      return;
    }
    if (step.stage === "layer") {
      const last = this.received.get(event.index) ?? 0;
      // Bytes since the last event; a download that started over counts afresh.
      const bytes =
        step.received >= last ? step.received - last : step.received;
      this.received.set(event.index, step.received);
      this.firstAt ??= now;
      this.samples.push({ at: now, bytes });
    } else if (step.stage !== "waiting") this.received.delete(event.index);
    const slot = this.slots.get(event.index) ?? {
      line: new ProgressLine(),
      text: "",
    };
    slot.text = slot.line.text(event, now);
    this.slots.set(event.index, slot);
  }

  /** Bytes a second over the last few seconds, all downloads together. */
  speed(now: number): number | null {
    this.samples = this.samples.filter(
      (sample) => now - sample.at <= SPEED_WINDOW_MS,
    );
    if (this.firstAt === null || now - this.firstAt < 1000) return null;
    const span = Math.min(SPEED_WINDOW_MS, now - this.firstAt) / 1000;
    return this.samples.reduce((sum, sample) => sum + sample.bytes, 0) / span;
  }

  totalLine(now: number): string {
    const speed = this.speed(now);
    return [
      `${String(this.done)} done`,
      ...(this.failed > 0 ? [`${String(this.failed)} failed`] : []),
      `${String(Math.max(0, this.total - this.done - this.failed))} left`,
      ...(speed === null ? [] : [rate(speed)]),
    ].join(" · ");
  }

  /** The block: the charts in progress (in the order they started), then the total. */
  lines(now: number): string[] {
    return [
      ...[...this.slots.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, slot]) => slot.text),
      this.totalLine(now),
    ];
  }
}
