import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  FAILURES_TO_RAISE,
  PUZZLE_CELLS,
  SHAPES,
  answerKey,
  cellSvg,
  checkPow,
  leadingZeroBits,
  makePuzzle,
  normalizeTextAnswer,
  requiredLevel,
  sha256,
  solvePow,
} from "./index";

/** A seeded generator (mulberry32), so puzzles are repeatable here. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
const nodeHash = (input: string) =>
  new Uint8Array(createHash("sha256").update(input).digest());

describe("sha256", () => {
  it("matches node:crypto across block boundaries", () => {
    for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 200]) {
      const input = "a".repeat(length);
      expect(hex(sha256(new TextEncoder().encode(input)))).toBe(
        hex(nodeHash(input)),
      );
    }
  });
});

describe("proof-of-work", () => {
  it("counts leading zero bits", () => {
    expect(leadingZeroBits(new Uint8Array([0, 0x0f, 0xff]))).toBe(12);
    expect(leadingZeroBits(new Uint8Array([0x80]))).toBe(0);
    expect(leadingZeroBits(new Uint8Array([0, 0]))).toBe(16);
  });

  it("solves, and the server's hash agrees", async () => {
    const nonce = await solvePow("salt-1", 10);
    expect(checkPow("salt-1", 10, nonce)).toBe(true);
    expect(checkPow("salt-1", 10, nonce, nodeHash)).toBe(true);
    expect(checkPow("salt-2", 30, nonce, nodeHash)).toBe(false);
  });

  it("refuses odd nonces", () => {
    expect(checkPow("s", 0, -1)).toBe(false);
    expect(checkPow("s", 0, 1.5)).toBe(false);
    expect(checkPow("s", 0, 3)).toBe(true);
  });

  it("reports progress and can be stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    let reported = 0;
    await expect(
      solvePow("x", 40, {
        slice: 100,
        signal: controller.signal,
        onProgress: (tried) => (reported = tried),
      }),
    ).rejects.toThrow("aborted");
    expect(reported).toBe(100);
  });
});

describe("requiredLevel", () => {
  const steps = [3, 6, 10] as const;
  const at = (recent: number, extra: object = {}) =>
    requiredLevel({ recent, failures: 0, steps, mode: "normal", ...extra });

  it("climbs with use", () => {
    expect([0, 2, 3, 5, 6, 9, 10, 50].map((n) => at(n))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it("adds a level after failures", () => {
    expect(at(0, { failures: FAILURES_TO_RAISE })).toBe(1);
    expect(at(10, { failures: FAILURES_TO_RAISE })).toBe(3);
  });

  it("follows the admin's mode", () => {
    expect(at(0, { mode: "raised" })).toBe(1);
    expect(at(3, { mode: "raised" })).toBe(2);
    expect(at(0, { mode: "attack" })).toBe(2);
    expect(at(3, { mode: "attack" })).toBe(2);
    expect(at(6, { mode: "attack" })).toBe(3);
  });
});

describe("puzzle", () => {
  it("places 3 to 6 targets and nothing else of that shape", () => {
    for (let seed = 1; seed < 200; seed++) {
      const puzzle = makePuzzle(seeded(seed));
      expect(puzzle.cells).toHaveLength(PUZZLE_CELLS);
      expect(puzzle.answer.length).toBeGreaterThanOrEqual(3);
      expect(puzzle.answer.length).toBeLessThanOrEqual(6);
      const found = puzzle.cells.flatMap((cell, i) =>
        cell.shape === puzzle.target ? [i] : [],
      );
      expect(found).toEqual(puzzle.answer);
      expect(SHAPES).toContain(puzzle.target);
    }
  });

  it("asks a question it can answer", () => {
    for (let seed = 1; seed < 50; seed++) {
      const puzzle = makePuzzle(seeded(seed));
      expect(puzzle.question).toMatch(/\?/);
      expect(normalizeTextAnswer(puzzle.textAnswer)).toBe(puzzle.textAnswer);
      if (puzzle.question.startsWith("Which"))
        expect(puzzle.question).toContain(puzzle.textAnswer);
    }
  });

  it("keys answers the same whatever the order", () => {
    expect(answerKey([5, 1, 1, 12])).toBe("1,5,12");
    expect(answerKey([3, 99, -1, 2.5])).toBe("3");
    expect(normalizeTextAnswer(" Orange! ")).toBe("orange");
  });

  it("draws only paths in currentColor", () => {
    const [cell] = makePuzzle(seeded(7)).cells;
    if (!cell) throw new Error("No cells");
    const svg = cellSvg(cell);
    expect(svg).not.toMatch(/<(circle|rect|polygon)/);
    expect(svg).toContain("currentColor");
    expect(svg).toContain('aria-hidden="true"');
  });
});
