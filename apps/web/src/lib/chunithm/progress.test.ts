import { describe, expect, it } from "vitest";
import type { BundleProgress } from "./bundler";
import { ProgressBoard, ProgressLine, fitColumns } from "./progress";

const chart = {
  chartId: 9,
  songId: 3062,
  title: "コンクエスト・チャレンジ",
  difficulty: "master",
  sdvxRef: "11061/mst",
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
    expect(line.text(at({ stage: "downloading" }), 0)).toBe(
      `${head} · connecting`,
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

describe("the progress board", () => {
  const layer = (index: number, received: number): BundleProgress => ({
    index,
    total: 10,
    chart: { ...chart, songId: index },
    step: {
      stage: "layer",
      name: "notes",
      received,
      total: 4 * MB,
      resumes: 0,
    },
  });

  it("has a line per chart in progress, in the order they started, and a total", () => {
    const board = new ProgressBoard();
    board.update(layer(2, 0), 0);
    board.update(layer(1, 0), 0);
    board.update(layer(1, MB), 2000);
    board.update(layer(2, MB), 2000);
    expect(board.lines(2000)).toEqual([
      "[1/10] #1 コンクエスト・チャレンジ (master) · notes 1.0 MB / 4.0 MB · 512 KB/s",
      "[2/10] #2 コンクエスト・チャレンジ (master) · notes 1.0 MB / 4.0 MB · 512 KB/s",
      // Both downloads together.
      "0 done · 10 left · 1.0 MB/s",
    ]);
  });

  it("drops a chart's line when it's done, and counts it", () => {
    const board = new ProgressBoard();
    for (const index of [1, 2, 3]) board.update(layer(index, 0), 0);
    board.update(
      { ...layer(1, 0), step: { stage: "done", result: "bundled" } },
      100,
    );
    board.update(
      { ...layer(2, 0), step: { stage: "done", result: "failed" } },
      100,
    );
    // A dropped chart is still left, for the next run.
    board.update(
      { ...layer(3, 0), step: { stage: "done", result: "dropped" } },
      100,
    );
    expect(board.lines(100)).toEqual(["1 done · 1 failed · 8 left"]);
  });

  it("measures the total speed over the last few seconds", () => {
    const board = new ProgressBoard();
    board.update(layer(1, 0), 0);
    board.update(layer(1, 5 * MB), 5000);
    expect(board.speed(5000)).toBe(MB);
    // Nothing for a while: the old bytes fall out of the window.
    expect(board.speed(10_001)).toBe(0);
  });
});
