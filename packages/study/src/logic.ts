/**
 * Boolean expressions as logic courses write them: `AB' + A'B`, `(A + B)C`, `A ⊕ B`.
 * Parsed by hand (never run as code) for the logic lab, Karnaugh maps and gate
 * tables, and evaluated, turned into LaTeX, or into a map's cells.
 *
 * Variables are one letter, optionally followed by digits (A, B, D0, I7), so `AB` is
 * A·B. NOT is a trailing `'` or a leading `!`, `~`, `¬`; AND is writing terms side by
 * side, or `·`, `*`, `&`; OR is `+`, `|`, `∨`; XOR `⊕` or `^`; XNOR `⊙`; `0` and `1`
 * are constants. NOT binds tightest, then AND, then XOR/XNOR, then OR.
 */

export type LogicExpression =
  | { type: "const"; value: 0 | 1 }
  | { type: "var"; name: string }
  | { type: "not"; arg: LogicExpression }
  | {
      type: "and" | "or" | "xor" | "xnor";
      left: LogicExpression;
      right: LogicExpression;
    };

export class LogicError extends Error {}

type Token =
  | { kind: "var"; name: string }
  | { kind: "const"; value: 0 | 1 }
  | { kind: "op"; value: string };

const OPS: Readonly<Record<string, string>> = {
  "'": "'",
  "’": "'",
  "!": "!",
  "~": "!",
  "¬": "!",
  "·": "&",
  "*": "&",
  "&": "&",
  "∧": "&",
  "+": "|",
  "|": "|",
  "∨": "|",
  "^": "^",
  "⊕": "^",
  "⊙": "=",
  "(": "(",
  ")": ")",
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i] ?? "";
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === "0" || char === "1") {
      tokens.push({ kind: "const", value: char === "1" ? 1 : 0 });
      i += 1;
      continue;
    }
    const name = /^[A-Za-z]\d*/.exec(source.slice(i));
    if (name) {
      tokens.push({ kind: "var", name: name[0] });
      i += name[0].length;
      continue;
    }
    const op = OPS[char];
    if (!op)
      throw new LogicError(`“${char}” can't be used in a logic expression.`);
    tokens.push({ kind: "op", value: op });
    i += 1;
  }
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): LogicExpression {
    if (this.tokens.length === 0) throw new LogicError("It's empty.");
    const expression = this.or();
    if (this.index < this.tokens.length)
      throw new LogicError(
        "Something is left over at the end (a missing operator or bracket?).",
      );
    return expression;
  }

  private isOp(value: string): boolean {
    const token = this.tokens[this.index];
    return token?.kind === "op" && token.value === value;
  }

  private or(): LogicExpression {
    let left = this.xor();
    while (this.isOp("|")) {
      this.index += 1;
      left = { type: "or", left, right: this.xor() };
    }
    return left;
  }

  private xor(): LogicExpression {
    let left = this.and();
    while (this.isOp("^") || this.isOp("=")) {
      const type = this.isOp("^") ? "xor" : "xnor";
      this.index += 1;
      left = { type, left, right: this.and() };
    }
    return left;
  }

  private startsFactor(): boolean {
    const token = this.tokens[this.index];
    if (!token) return false;
    return token.kind !== "op" || token.value === "(" || token.value === "!";
  }

  private and(): LogicExpression {
    let left = this.not();
    for (;;) {
      if (this.isOp("&")) {
        this.index += 1;
        left = { type: "and", left, right: this.not() };
      } else if (this.startsFactor()) {
        left = { type: "and", left, right: this.not() };
      } else return left;
    }
  }

  private not(): LogicExpression {
    if (this.isOp("!")) {
      this.index += 1;
      return { type: "not", arg: this.not() };
    }
    let atom = this.atom();
    while (this.isOp("'")) {
      this.index += 1;
      atom = { type: "not", arg: atom };
    }
    return atom;
  }

  private atom(): LogicExpression {
    const token = this.tokens[this.index];
    if (!token) throw new LogicError("It ends too soon.");
    this.index += 1;
    if (token.kind === "var") return { type: "var", name: token.name };
    if (token.kind === "const") return { type: "const", value: token.value };
    if (token.value === "(") {
      const inner = this.or();
      if (!this.isOp(")")) throw new LogicError("A “)” is missing.");
      this.index += 1;
      return inner;
    }
    throw new LogicError(
      `Unexpected “${token.value === "&" ? "·" : token.value}”.`,
    );
  }
}

export function parseLogic(source: string): LogicExpression {
  return new Parser(tokenize(source)).parse();
}

export type LogicScope = Readonly<Record<string, 0 | 1>>;

export function evaluateLogic(
  expression: LogicExpression,
  scope: LogicScope,
): 0 | 1 {
  switch (expression.type) {
    case "const":
      return expression.value;
    case "var":
      return scope[expression.name] ?? 0;
    case "not":
      return evaluateLogic(expression.arg, scope) === 1 ? 0 : 1;
    default: {
      const a = evaluateLogic(expression.left, scope);
      const b = evaluateLogic(expression.right, scope);
      if (expression.type === "and") return a && b ? 1 : 0;
      if (expression.type === "or") return a || b ? 1 : 0;
      if (expression.type === "xor") return a !== b ? 1 : 0;
      return a === b ? 1 : 0;
    }
  }
}

/** Its variables, in alphabetical (then numeric) order. */
export function logicVariables(expression: LogicExpression): string[] {
  const names = new Set<string>();
  const walk = (node: LogicExpression) => {
    if (node.type === "var") names.add(node.name);
    else if (node.type === "not") walk(node.arg);
    else if (node.type !== "const") {
      walk(node.left);
      walk(node.right);
    }
  };
  walk(expression);
  return [...names].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

const PRECEDENCE = { or: 1, xor: 2, xnor: 2, and: 3 } as const;

function variableLatex(name: string): string {
  const match = /^([A-Za-z])(\d*)$/.exec(name);
  return match?.[2] ? `${match[1] ?? ""}_{${match[2]}}` : name;
}

/** LaTeX, as textbooks write it: overbars for NOT, side by side for AND. */
export function logicLatex(expression: LogicExpression, parent = 0): string {
  switch (expression.type) {
    case "const":
      return String(expression.value);
    case "var":
      return variableLatex(expression.name);
    case "not":
      return `\\overline{${logicLatex(expression.arg)}}`;
    default: {
      const own = PRECEDENCE[expression.type];
      const op =
        expression.type === "and"
          ? ""
          : expression.type === "or"
            ? " + "
            : expression.type === "xor"
              ? " \\oplus "
              : " \\odot ";
      const text = `${logicLatex(expression.left, own)}${op}${logicLatex(expression.right, own + (expression.type === "and" ? 0 : 0.5))}`;
      return own < parent ? `(${text})` : text;
    }
  }
}

/** Every assignment of `variables`, first variable most significant (minterm order). */
export function assignments(
  variables: readonly string[],
): Record<string, 0 | 1>[] {
  const rows: Record<string, 0 | 1>[] = [];
  for (let index = 0; index < 2 ** variables.length; index += 1) {
    const row: Record<string, 0 | 1> = {};
    variables.forEach((name, position) => {
      row[name] = (index >> (variables.length - 1 - position)) & 1 ? 1 : 0;
    });
    rows.push(row);
  }
  return rows;
}

/** The minterm numbers where an expression is 1. */
export function mintermsOf(
  expression: LogicExpression,
  variables: readonly string[],
): number[] {
  return assignments(variables).flatMap((row, index) =>
    evaluateLogic(expression, row) ? [index] : [],
  );
}

/** Gray-code order of n bits: 00, 01, 11, 10 for n = 2. */
export function grayCode(bits: number): string[] {
  if (bits === 0) return [""];
  const shorter = grayCode(bits - 1);
  return [
    ...shorter.map((code) => `0${code}`),
    ...[...shorter].reverse().map((code) => `1${code}`),
  ];
}
