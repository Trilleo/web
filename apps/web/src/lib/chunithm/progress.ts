/**
 * The bundling script's live progress line (scripts/chunithm-bundle.ts draws it):
 * the chart, then what it's doing, e.g.
 * "[12/1100] #3062 コンクエスト・チャレンジ (master) · notes 6.2 / 14.8 MB · 310 KB/s".
 * Pure, so it's tested; the speed is worked out from the events' times.
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
      case "script":
        return `${head} · reading its page`;
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
