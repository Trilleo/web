/**
 * Quizzes: how `::: quiz` bodies are written, and how answers are checked. Checking
 * is pure, so the browser (as people answer) and tests use the same code.
 *
 *   ? What current flows through 10 Ω with 5 V across it?
 *   answer: 0.5 A
 *   tolerance: 2%
 *   > $I = V/R = 5/10$ A.
 *
 *   ? Which of these are passive components?
 *   - [x] Resistor
 *   - [ ] Voltage source
 *   - [x] Capacitor
 *
 *   ? Expand $2(x+1)$.
 *   expression: 2x + 2
 *
 *   ? What is the SI unit of capacitance?
 *   text: farad | F
 *
 * `?` starts a question (its prompt may run on over the next lines), `- [x]`/`- [ ]`
 * are options (more than one right: tick all of them), `answer:` a number with its
 * unit (or, without one, worked out: `7/48`, `C(4,2)/C(10,2)`, `1 - Phi(1.5)`, `35%`),
 * `expression:` an algebraic answer (`variables: x, y` if not every name in it
 * is one), `text:` accepted words (`|` between alternatives), `>` the explanation.
 */
import { splitPin } from "./ids";
import {
  LogicError,
  assignments,
  evaluateLogic,
  logicVariables,
  parseLogic,
  type LogicExpression,
} from "./logic";
import {
  equivalent,
  evaluate,
  namesIn,
  parseExpression,
  ExpressionError,
  type Expression,
} from "./expression";
import {
  DEFAULT_TOLERANCE,
  parseQuantity,
  parseTolerance,
  withinTolerance,
  writtenFactor,
  type Tolerance,
  type Quantity,
} from "./units";

/**
 * A number answer: a quantity with its unit ("0.5 mA"), or a unitless value worked
 * out from an expression without variables ("7/48", "C(5,2)/C(10,3)", "35%").
 */
export function readNumber(text: string): Quantity | null {
  const trimmed = text.trim();
  const percent = trimmed.endsWith("%");
  const body = percent ? trimmed.slice(0, -1) : trimmed;
  let value: number;
  try {
    value = evaluate(parseExpression(body, { variables: [] }));
  } catch {
    // Not arithmetic: read it as a quantity with a unit.
    return percent ? null : parseQuantity(trimmed);
  }
  return Number.isFinite(value)
    ? { value: percent ? value / 100 : value, unit: "" }
    : null;
}

export type QuestionKind =
  "choice" | "multiple" | "number" | "expression" | "logic" | "text";

/** A question as written (Markdown sources), before rendering. */
export interface QuestionSource {
  prompt: string;
  /** A `{#name}` after the prompt: keeps the question's ID through rewording (ids.ts). */
  pin: string | null;
  kind: QuestionKind;
  options: { text: string; correct: boolean }[];
  /** number: the answer as written ("0.5 A"); expression: the expression; text: alternatives joined by " | ". */
  answer: string;
  tolerance: Tolerance;
  variables: string[];
  /** logic: minterm numbers (over `variables`, first most significant) whose value doesn't matter. */
  dontcare: number[];
  explanation: string;
}

export interface QuizParse {
  questions: QuestionSource[];
  errors: string[];
}

const FIELD =
  /^(answer|tolerance|expression|logic|variables|dontcare|text):\s*(.*)$/;
const OPTION = /^[-*]\s*\[( |x|X)\]\s*(.*)$/;

export function parseQuiz(body: string): QuizParse {
  const questions: QuestionSource[] = [];
  const errors: string[] = [];
  let current: (QuestionSource & { fields: Set<string> }) | null = null;
  let inPrompt = false;

  const finish = () => {
    if (!current) return;
    const number = questions.length + 1;
    const problem = checkQuestion(current);
    if (problem) errors.push(`Question ${String(number)}: ${problem}`);
    else {
      questions.push({
        prompt: current.prompt,
        pin: current.pin,
        kind: current.kind,
        options: current.options,
        answer: current.answer,
        tolerance: current.tolerance,
        variables: current.variables,
        dontcare: current.dontcare,
        explanation: current.explanation,
      });
    }
    current = null;
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("?")) {
      finish();
      const { text, pin } = splitPin(line.slice(1).trim());
      current = {
        prompt: text,
        pin,
        kind: "text",
        options: [],
        answer: "",
        tolerance: DEFAULT_TOLERANCE,
        variables: [],
        dontcare: [],
        explanation: "",
        fields: new Set(),
      };
      inPrompt = true;
      continue;
    }
    if (!current) {
      if (line !== "")
        errors.push(`“${line}” comes before the first “?” question.`);
      continue;
    }
    if (line === "") {
      if (inPrompt) current.prompt += "\n";
      continue;
    }
    const option = OPTION.exec(line);
    if (option) {
      inPrompt = false;
      current.options.push({
        text: option[2] ?? "",
        correct: option[1] !== " ",
      });
      continue;
    }
    if (line.startsWith(">")) {
      inPrompt = false;
      const text = line.slice(1).trim();
      current.explanation += current.explanation ? `\n${text}` : text;
      continue;
    }
    const field = FIELD.exec(line);
    if (field) {
      inPrompt = false;
      const [, key = "", value = ""] = field;
      current.fields.add(key);
      if (key === "answer") {
        current.kind = "number";
        current.answer = value.trim();
      } else if (key === "expression") {
        current.kind = "expression";
        current.answer = value.trim();
      } else if (key === "logic") {
        current.kind = "logic";
        current.answer = value.trim();
      } else if (key === "text") {
        current.kind = "text";
        current.answer = value.trim();
      } else if (key === "tolerance") {
        const tolerance = parseTolerance(value);
        if (tolerance) current.tolerance = tolerance;
        else
          errors.push(`“${value}” isn't a tolerance (try “2%” or “0.01 A”).`);
      } else if (key === "dontcare") {
        const numbers = value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (numbers.length === 0 || numbers.some((part) => !/^\d+$/.test(part)))
          errors.push(
            `“${value}” isn't a list of minterm numbers (try “dontcare: 3, 7”).`,
          );
        else
          current.dontcare = [...new Set(numbers.map(Number))].sort(
            (a, b) => a - b,
          );
      } else {
        current.variables = value
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
      }
      continue;
    }
    if (inPrompt) {
      current.prompt += `\n${raw}`;
      continue;
    }
    errors.push(
      `“${line}” isn't part of a question (start it with ?, -, >, or a field).`,
    );
  }
  finish();
  if (questions.length === 0 && errors.length === 0)
    errors.push("The quiz has no questions (start each with “?”).");
  return { questions, errors };
}

function checkQuestion(
  question: QuestionSource & { fields: Set<string> },
): string | null {
  question.prompt = question.prompt.trim();
  if (!question.prompt) return "it has no prompt.";
  const answers = ["answer", "expression", "logic", "text"].filter((key) =>
    question.fields.has(key),
  );
  if (question.options.length > 0) {
    if (answers.length > 0) return "it has options and an answer: pick one.";
    const right = question.options.filter((option) => option.correct).length;
    if (right === 0) return "no option is ticked as right ([x]).";
    if (question.options.length < 2)
      return "a choice needs at least two options.";
    question.kind = right > 1 ? "multiple" : "choice";
    return null;
  }
  if (answers.length === 0)
    return "it has no answer (answer:, expression:, logic:, text:, or options).";
  if (answers.length > 1) return "it has more than one kind of answer.";
  if (question.kind === "number") {
    const quantity = readNumber(question.answer);
    if (!quantity) return `“${question.answer}” isn't a number with a unit.`;
  }
  if (question.kind === "expression") {
    try {
      const variables =
        question.variables.length > 0
          ? question.variables
          : guessVariables(question.answer);
      const expression = parseExpression(question.answer, { variables });
      question.variables =
        variables.length > 0 ? variables : namesIn(expression);
    } catch (error) {
      return `the expression “${question.answer}” can't be read: ${error instanceof Error ? error.message : "it's invalid"}`;
    }
  }
  if (question.kind === "logic") {
    let expression: LogicExpression;
    try {
      expression = parseLogic(question.answer);
    } catch (error) {
      return `the logic expression “${question.answer}” can't be read: ${error instanceof Error ? error.message : "it's invalid"}`;
    }
    if (question.fields.has("dontcare")) {
      // Minterm numbers mean nothing without the variables' order, and a simplified
      // answer may leave a variable out.
      if (question.variables.length === 0)
        return "dontcare: needs variables: (in order, first most significant), like “variables: A, B, C”.";
      if (question.variables.some((name) => !/^[A-Za-z]\d*$/.test(name)))
        return "variables: for a logic answer are names like A, B, D0.";
      const missing = logicVariables(expression).filter(
        (name) => !question.variables.includes(name),
      );
      if (missing.length > 0)
        return `the answer uses ${missing.join(", ")}, which variables: doesn't list.`;
      const rows = 2 ** question.variables.length;
      const outside = question.dontcare.find((number) => number >= rows);
      if (outside !== undefined)
        return `don't-care ${String(outside)} is past the last minterm (${String(rows - 1)}).`;
    }
  } else if (question.fields.has("dontcare"))
    return "dontcare: only goes with a logic: answer.";
  if (
    question.kind === "text" &&
    !question.answer.split("|").some((part) => part.trim())
  )
    return "the text answer is empty.";
  return null;
}

/** Without `variables:`, every single letter (and Greek letter) name is one. */
function guessVariables(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/[\p{L}_][\p{L}\p{N}_]*/gu)) {
    const name = match[0];
    if (name.length === 1 && name !== "e" && name !== "π") names.add(name);
  }
  return [...names].sort();
}

export interface CheckResult {
  correct: boolean;
  /** Why an answer couldn't be read, or what's off about it (the unit). */
  message?: string;
}

/** A response: the chosen options' indexes, or what was typed. */
export type Response = readonly number[] | string;

/** What a quiz needs in the browser to check one question. */
export type CheckData = Pick<
  QuestionSource,
  "kind" | "answer" | "tolerance" | "variables" | "dontcare"
> & {
  /** Indexes of the right options. */
  correct: number[];
};

export function checkData(question: QuestionSource): CheckData {
  return {
    kind: question.kind,
    answer: question.answer,
    tolerance: question.tolerance,
    variables: question.variables,
    dontcare: question.dontcare,
    correct: question.options.flatMap((option, index) =>
      option.correct ? [index] : [],
    ),
  };
}

function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function checkAnswer(data: CheckData, response: Response): CheckResult {
  if (data.kind === "choice" || data.kind === "multiple") {
    const chosen =
      typeof response === "string" ? [] : [...new Set(response)].sort();
    if (chosen.length === 0)
      return { correct: false, message: "Choose an answer first." };
    const right = [...data.correct].sort();
    return {
      correct:
        chosen.length === right.length &&
        chosen.every((value, i) => value === right[i]),
    };
  }
  const typed = typeof response === "string" ? response.trim() : "";
  if (!typed) return { correct: false, message: "Type an answer first." };

  if (data.kind === "number") {
    const expected = readNumber(data.answer);
    const given = readNumber(typed);
    if (!expected) return { correct: false };
    if (!given)
      return {
        correct: false,
        message:
          "Write a number (a fraction such as 3/8 works too), with its unit if it has one.",
      };
    let value = given.value;
    if (given.unit === "" && expected.unit !== "") {
      // No unit typed: read it in the unit the answer is written in ("mA").
      value *= writtenFactor(data.answer);
    } else if (given.unit !== expected.unit) {
      return {
        correct: false,
        message: `That's in ${given.unit || "no unit"}; this answer is in ${expected.unit}.`,
      };
    }
    return { correct: withinTolerance(value, expected.value, data.tolerance) };
  }

  if (data.kind === "expression") {
    let expected: Expression;
    let given: Expression;
    try {
      expected = parseExpression(data.answer, { variables: data.variables });
    } catch {
      return { correct: false };
    }
    try {
      given = parseExpression(typed, { variables: data.variables });
    } catch (error) {
      return {
        correct: false,
        message:
          error instanceof ExpressionError
            ? `That can't be read: ${error.message}`
            : "That can't be read.",
      };
    }
    return { correct: equivalent(given, expected, data.variables) };
  }

  if (data.kind === "logic") {
    let given: LogicExpression;
    try {
      given = parseLogic(typed);
    } catch (error) {
      return {
        correct: false,
        message:
          error instanceof LogicError
            ? `That can't be read: ${error.message}`
            : "That can't be read.",
      };
    }
    const expected = parseLogic(data.answer);
    // The same truth table, over every variable either side uses, except on the
    // don't-care rows (numbered over the question's variables).
    const order = data.dontcare.length > 0 ? data.variables : [];
    const names = [
      ...new Set([
        ...order,
        ...logicVariables(expected),
        ...logicVariables(given),
      ]),
    ];
    const dontcare = new Set(data.dontcare);
    const minterm = (row: Record<string, 0 | 1>) =>
      order.reduce((number, name) => number * 2 + (row[name] ?? 0), 0);
    return {
      correct: assignments(names).every(
        (row) =>
          (order.length > 0 && dontcare.has(minterm(row))) ||
          evaluateLogic(given, row) === evaluateLogic(expected, row),
      ),
    };
  }

  const answer = normalizeText(typed);
  return {
    correct: data.answer
      .split("|")
      .map((part) => normalizeText(part))
      .some((part) => part !== "" && part === answer),
  };
}
