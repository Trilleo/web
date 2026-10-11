import { describe, expect, it } from "vitest";
import { DIFF_CELLS, diffLines, diffStats, foldDiff } from "./diff";

describe("diffLines", () => {
  it("finds added, removed and unchanged lines with their numbers", () => {
    const diff = diffLines("a\nb\nc\n", "a\nB\nc\nd");
    expect(diff).toEqual([
      { op: "same", text: "a", oldLine: 1, newLine: 1 },
      { op: "added", text: "B", newLine: 2 },
      { op: "removed", text: "b", oldLine: 2 },
      { op: "same", text: "c", oldLine: 3, newLine: 3 },
      { op: "added", text: "d", newLine: 4 },
    ]);
    expect(diffStats(diff)).toEqual({ added: 2, removed: 1 });
  });

  it("handles empty sides and Windows line ends", () => {
    expect(diffLines("", "x")).toEqual([
      { op: "added", text: "x", newLine: 1 },
    ]);
    expect(diffLines("x\r\ny", "x\ny")).toEqual([
      { op: "same", text: "x", oldLine: 1, newLine: 1 },
      { op: "same", text: "y", oldLine: 2, newLine: 2 },
    ]);
  });

  it("numbers the unchanged end after a change", () => {
    const diff = diffLines("a\nz", "a\nb\nc\nz");
    expect(diff.at(-1)).toEqual({
      op: "same",
      text: "z",
      oldLine: 2,
      newLine: 4,
    });
  });

  it("gives up on comparing huge changes, but still shows them", () => {
    const side = Math.ceil(Math.sqrt(DIFF_CELLS)) + 1;
    const before = Array.from({ length: side }, (_, i) => `a${String(i)}`).join(
      "\n",
    );
    const after = Array.from({ length: side }, (_, i) => `b${String(i)}`).join(
      "\n",
    );
    const stats = diffStats(diffLines(before, after));
    expect(stats).toEqual({ added: side, removed: side });
  });
});

describe("foldDiff", () => {
  it("folds unchanged runs outside the context", () => {
    const before = Array.from({ length: 20 }, (_, i) => String(i)).join("\n");
    const after = before.replace("10", "ten");
    const folded = foldDiff(diffLines(before, after), 2);
    expect(folded[0]).toEqual({ op: "skip", count: 8 });
    expect(folded.at(-1)).toEqual({ op: "skip", count: 7 });
    expect(folded.filter((line) => line.op !== "skip")).toHaveLength(6);
  });
});
