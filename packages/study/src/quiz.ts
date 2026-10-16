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
 * unit, `expression:` an algebraic answer (`variables: x, y` if not every name in it
 * is one), `text:` accepted words (`|` between alternatives), `>` the explanation.
 */
import {
  equivalent,
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
} from "./units";

export type QuestionKind =
  "choice" | "multiple" | "number" | "expression" | "text";

/** A question as written (Markdown sources), before rendering. */
export interface QuestionSource {
  prompt: string;
  kind: QuestionKind;
  options: { text: string; correct: boolean }[];
  /** number: the answer as written ("0.5 A"); expression: the expression; text: alternatives joined by " | ". */
  answer: string;
  tolerance: Tolerance;
  variables: string[];
  explanation: string;
}

export interface QuizParse {
  questions: QuestionSource[];
  errors: string[];
}

const FIELD = /^(answer|tolerance|expression|variables|text):\s*(.*)$/;
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
        kind: current.kind,
        options: current.options,
        answer: current.answer,
        tolerance: current.tolerance,
        variables: current.variables,
        explanation: current.explanation,
      });
    }
    current = null;
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("?")) {
      finish();
      current = {
        prompt: line.slice(1).trim(),
        kind: "text",
        options: [],
        answer: "",
        tolerance: DEFAULT_TOLERANCE,
        variables: [],
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
      } else if (key === "text") {
        current.kind = "text";
        current.answer = value.trim();
      } else if (key === "tolerance") {
        const tolerance = parseTolerance(value);
        if (tolerance) current.tolerance = tolerance;
        else
          errors.push(`“${value}” isn't a tolerance (try “2%” or “0.01 A”).`);
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
  const answers = ["answer", "expression", "text"].filter((key) =>
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
    return "it has no answer (answer:, expression:, text:, or options).";
  if (answers.length > 1) return "it has more than one kind of answer.";
  if (question.kind === "number") {
    const quantity = parseQuantity(question.answer);
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
  "kind" | "answer" | "tolerance" | "variables"
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
    const expected = parseQuantity(data.answer);
    const given = parseQuantity(typed);
    if (!expected) return { correct: false };
    if (!given)
      return {
        correct: false,
        message: "Write a number, with its unit if it has one.",
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

  const answer = normalizeText(typed);
  return {
    correct: data.answer
      .split("|")
      .map((part) => normalizeText(part))
      .some((part) => part !== "" && part === answer),
  };
}
