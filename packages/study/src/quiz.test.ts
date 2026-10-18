import { describe, expect, test } from "vitest";
import { checkAnswer, checkData, parseQuiz } from "./quiz";

function only(body: string) {
  const { questions, errors } = parseQuiz(body);
  expect(errors).toEqual([]);
  const [question] = questions;
  if (!question) throw new Error("no question");
  return checkData(question);
}

describe("parseQuiz", () => {
  test("reads every kind of question", () => {
    const { questions, errors } = parseQuiz(`? First line
continues here
answer: 0.5 A
tolerance: 2%
> Because.
> Really.

? Pick some
- [x] A
- [ ] B
- [x] C

? Pick one
- [ ] A
- [x] B

? Expand
expression: 2x + 2

? Name it
text: farad | F`);
    expect(errors).toEqual([]);
    expect(questions.map((question) => question.kind)).toEqual([
      "number",
      "multiple",
      "choice",
      "expression",
      "text",
    ]);
    expect(questions[0]?.prompt).toBe("First line\ncontinues here");
    expect(questions[0]?.explanation).toBe("Because.\nReally.");
    expect(questions[0]?.tolerance).toEqual({ kind: "relative", amount: 0.02 });
    expect(questions[3]?.variables).toEqual(["x"]);
  });

  test("reports mistakes", () => {
    expect(parseQuiz("").errors).toHaveLength(1);
    expect(parseQuiz("? No answer").errors[0]).toMatch(/no answer/);
    expect(parseQuiz("? Q\n- [ ] A\n- [ ] B").errors[0]).toMatch(/ticked/);
    expect(parseQuiz("? Q\nanswer: lots").errors[0]).toMatch(/isn't a number/);
    expect(parseQuiz("? Q\nexpression: 2 +").errors[0]).toMatch(
      /can't be read/,
    );
    expect(parseQuiz("stray\n? Q\nanswer: 1").errors[0]).toMatch(
      /before the first/,
    );
  });
});

describe("checkAnswer", () => {
  test("numbers, with units and prefixes", () => {
    const data = only("? I?\nanswer: 0.5 A");
    expect(checkAnswer(data, "0.5 A").correct).toBe(true);
    expect(checkAnswer(data, "500 mA").correct).toBe(true);
    expect(checkAnswer(data, "0.504").correct).toBe(true);
    expect(checkAnswer(data, "0.52 A").correct).toBe(false);
    expect(checkAnswer(data, "0.5 V").message).toMatch(/in V/);
    expect(checkAnswer(data, "half").message).toMatch(/number/);
    expect(checkAnswer(data, "").message).toMatch(/first/);
  });

  test("unitless answers can be fractions, worked out or per cent", () => {
    const data = only("? P?\nanswer: 7/48");
    expect(checkAnswer(data, "7/48").correct).toBe(true);
    expect(checkAnswer(data, "0.1458").correct).toBe(true);
    expect(checkAnswer(data, "14.58%").correct).toBe(true);
    expect(checkAnswer(data, "1/6").correct).toBe(false);
    const counted = only("? P?\nanswer: C(8,4)^2/C(16,8)");
    expect(checkAnswer(counted, "0.3807").correct).toBe(true);
    const normal = only("? P?\nanswer: 0.9973\ntolerance: 0.0001");
    expect(checkAnswer(normal, "2Phi(3) - 1").correct).toBe(true);
    expect(parseQuiz("? P?\nanswer: 1/0").errors).toHaveLength(1);
  });

  test("a bare number reads in the answer's own prefix", () => {
    const data = only("? I?\nanswer: 4 mA");
    expect(checkAnswer(data, "4").correct).toBe(true);
    expect(checkAnswer(data, "0.004 A").correct).toBe(true);
  });

  test("choices", () => {
    const multiple = only("? Q\n- [x] A\n- [ ] B\n- [x] C");
    expect(checkAnswer(multiple, [0, 2]).correct).toBe(true);
    expect(checkAnswer(multiple, [2, 0]).correct).toBe(true);
    expect(checkAnswer(multiple, [0]).correct).toBe(false);
    expect(checkAnswer(multiple, []).message).toBeDefined();
  });

  test("logic answers, by their truth table", () => {
    const xor = only("? Q\nlogic: A ⊕ B");
    expect(checkAnswer(xor, "A'B + AB'").correct).toBe(true);
    expect(checkAnswer(xor, "(A + B)(AB)'").correct).toBe(true);
    expect(checkAnswer(xor, "A + B").correct).toBe(false);
    expect(checkAnswer(xor, "A +").message).toMatch(/can't be read/);
    // A variable the answer doesn't use must not matter.
    expect(checkAnswer(only("? Q\nlogic: A"), "A + AC").correct).toBe(true);
    expect(parseQuiz("? Q\nlogic: A +").errors[0]).toMatch(/can't be read/);
  });

  test("logic answers ignore don't-care rows", () => {
    const f = only(
      "? Q\nlogic: A C' + B' D + B C D'\nvariables: A, B, C, D\ndontcare: 0, 1, 2, 13, 14, 15",
    );
    expect(f.dontcare).toEqual([0, 1, 2, 13, 14, 15]);
    // The other minimal answer, and one that takes no don't-care as 1.
    expect(checkAnswer(f, "AC' + B'D + A'CD'").correct).toBe(true);
    expect(
      checkAnswer(f, "AB'C' + A'B'CD + A'BCD' + ABC'D' + AB'D").correct,
    ).toBe(true);
    // Wrong on a care row (m6 left out).
    expect(checkAnswer(f, "AC' + B'D").correct).toBe(false);
    // Variables count from the first: C' over A, B, C is 1 at m0, m2, m4, m6.
    const c = only(
      "? Q\nlogic: C'\nvariables: A, B, C\ndontcare: 0, 3, 5, 6, 7",
    );
    expect(checkAnswer(c, "A'BC' + AB'C'").correct).toBe(true);
    expect(checkAnswer(c, "A'").correct).toBe(false);
    // Without don't-cares the rows all count.
    expect(checkAnswer(only("? Q\nlogic: C'"), "A'BC' + AB'C'").correct).toBe(
      false,
    );
  });

  test("don't-cares are checked", () => {
    const error = (body: string) => parseQuiz(body).errors[0];
    expect(error("? Q\nlogic: A\ndontcare: 1")).toMatch(/needs variables/);
    expect(error("? Q\nlogic: A\nvariables: A, B\ndontcare: 4")).toMatch(
      /past the last minterm \(3\)/,
    );
    expect(error("? Q\nlogic: AC\nvariables: A, B\ndontcare: 1")).toMatch(
      /uses C/,
    );
    expect(error("? Q\nlogic: A\nvariables: A\ndontcare: x")).toMatch(
      /minterm numbers/,
    );
    expect(error("? Q\nanswer: 2\ndontcare: 1")).toMatch(/only goes with/);
  });

  test("expressions and words", () => {
    const expression = only("? Q\nexpression: u^2 / R\nvariables: u, R");
    expect(checkAnswer(expression, "u*u/R").correct).toBe(true);
    expect(checkAnswer(expression, "u/R").correct).toBe(false);
    expect(checkAnswer(expression, "u^^2").message).toMatch(/can't be read/);
    const text = only("? Q\ntext: reference direction | 参考方向");
    expect(checkAnswer(text, "  Reference  Direction. ").correct).toBe(true);
    expect(checkAnswer(text, "参考方向").correct).toBe(true);
    expect(checkAnswer(text, "direction").correct).toBe(false);
  });
});
