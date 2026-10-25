import { describe, expect, it } from "vitest";
import type { BundleProgress } from "./bundler";
import { ProgressLine, fitColumns } from "./progress";

const chart = {
  chartId: 9,
  songId: 3062,
  title: "コンクエスト・チャレンジ",
  difficulty: "master",
  sdvxPath: "11/11061mst",
  variant: "normal" as const,
};
const at = (step: BundleProgress["step"], index = 12): BundleProgress => ({
  index,
  total: 1100,
  chart,
  step,
});
const head = "[12/1100] #3062 コンクエスト・チャレンジ (master)";
const MB = 1024 * 1024;

describe("the progress line", () => {
  it("says what each step is doing", () => {
    const line = new ProgressLine();
    expect(line.text(at({ stage: "script" }), 0)).toBe(
      `${head} · reading its page`,
    );
    expect(line.text(at({ stage: "tiles", done: 0, total: 2 }), 0)).toBe(
      `${head} · tiles 1/2`,
    );
    expect(line.text(at({ stage: "waiting", ms: 1000 }, 13), 0)).toBe(
      "[13/1100] #3062 コンクエスト・チャレンジ (master) · next in 1.0 s",
    );
  });

  it("shows a layer's size and speed, and when it resumed", () => {
    const line = new ProgressLine();
    const layer = (received: number, resumes = 0) =>
      at({
        stage: "layer",
        name: "notes",
        received,
        total: 15 * MB,
        resumes,
      });
    // Too soon to tell the speed.
    expect(line.text(layer(0), 0)).toBe(`${head} · notes 0 KB / 15.0 MB`);
    expect(line.text(layer(2 * MB), 4000)).toBe(
      `${head} · notes 2.0 MB / 15.0 MB · 512 KB/s`,
    );
    expect(line.text(layer(4 * MB, 1), 6000)).toBe(
      `${head} · notes 4.0 MB / 15.0 MB · 683 KB/s · resumed once`,
    );
    // Started over: the speed is measured afresh.
    expect(line.text(layer(0, 2), 7000)).toBe(
      `${head} · notes 0 KB / 15.0 MB · resumed 2×`,
    );
  });

  it("fits a terminal's width, counting wide characters as two", () => {
    expect(fitColumns("abcdef", 6)).toBe("abcdef");
    expect(fitColumns("abcdef", 4)).toBe("abc…");
    expect(fitColumns("コンクエスト", 6)).toBe("コン…");
  });
});
