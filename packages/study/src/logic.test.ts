import { describe, expect, test } from "vitest";
import {
  assignments,
  evaluateLogic,
  grayCode,
  logicLatex,
  logicVariables,
  mintermsOf,
  parseLogic,
  setLatex,
} from "./logic";

const truth = (source: string, variables: string[]) =>
  mintermsOf(parseLogic(source), variables);

describe("parseLogic", () => {
  test("reads textbook notation", () => {
    expect(truth("AB' + A'B", ["A", "B"])).toEqual([1, 2]);
    expect(truth("A ⊕ B", ["A", "B"])).toEqual([1, 2]);
    expect(truth("A ⊙ B", ["A", "B"])).toEqual([0, 3]);
    expect(truth("(A + B)C", ["A", "B", "C"])).toEqual([3, 5, 7]);
    expect(truth("!(A·B)", ["A", "B"])).toEqual([0, 1, 2]);
    expect(truth("(AB)'", ["A", "B"])).toEqual([0, 1, 2]);
    expect(truth("A + 1", ["A"])).toEqual([0, 1]);
  });

  test("binds NOT, then AND, then XOR, then OR", () => {
    // A + B C = A + (BC); A ⊕ B C = A ⊕ (BC)
    expect(truth("A + BC", ["A", "B", "C"])).toEqual([3, 4, 5, 6, 7]);
    expect(truth("A ⊕ BC", ["A", "B", "C"])).toEqual([3, 4, 5, 6]);
  });

  test("names variables with digits", () => {
    expect(logicVariables(parseLogic("D0 D1' + I7"))).toEqual([
      "D0",
      "D1",
      "I7",
    ]);
  });

  test("refuses what it can't read", () => {
    expect(() => parseLogic("A +")).toThrow();
    expect(() => parseLogic("(A")).toThrow(/missing/);
    expect(() => parseLogic("A % B")).toThrow();
  });

  test("writes LaTeX with overbars", () => {
    expect(logicLatex(parseLogic("AB' + A'B"))).toBe(
      "A\\overline{B} + \\overline{A}B",
    );
    expect(logicLatex(parseLogic("(A + B)C"))).toBe("(A + B)C");
    expect(logicLatex(parseLogic("(AB)'"))).toBe("\\overline{AB}");
    expect(logicLatex(parseLogic("D0"))).toBe("D_{0}");
  });

  test("evaluates and enumerates", () => {
    expect(assignments(["A", "B"])).toEqual([
      { A: 0, B: 0 },
      { A: 0, B: 1 },
      { A: 1, B: 0 },
      { A: 1, B: 1 },
    ]);
    expect(evaluateLogic(parseLogic("A'"), { A: 0 })).toBe(1);
    expect(grayCode(2)).toEqual(["00", "01", "11", "10"]);
    expect(grayCode(3)).toEqual([
      "000",
      "001",
      "011",
      "010",
      "110",
      "111",
      "101",
      "100",
    ]);
  });
});

describe("set notation", () => {
  test("reads unions, intersections, differences, Ω and ∅", () => {
    expect(truth("A ∪ B", ["A", "B"])).toEqual(truth("A + B", ["A", "B"]));
    expect(truth("A ∩ B", ["A", "B"])).toEqual([3]);
    expect(truth("A − B", ["A", "B"])).toEqual([2]);
    expect(truth("A \\ B", ["A", "B"])).toEqual([2]);
    expect(truth("A - (BC)", ["A", "B", "C"])).toEqual([4, 5, 6]);
    expect(truth("Ω", ["A"])).toEqual([0, 1]);
    expect(truth("A ∩ ∅", ["A"])).toEqual([]);
  });

  test("writes set LaTeX", () => {
    expect(setLatex(parseLogic("A ∪ B'"))).toBe("A \\cup \\overline{B}");
    expect(setLatex(parseLogic("A - B"))).toBe("A - B");
    expect(setLatex(parseLogic("(A + B)C"))).toBe("(A \\cup B) \\cap C");
    expect(setLatex(parseLogic("AB + C"))).toBe("(A \\cap B) \\cup C");
  });
});
