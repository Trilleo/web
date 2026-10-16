/**
 * Maths expressions as people type them: `2(x+1)`, `V^2/R`, `a sin(b x)`, `e^-t/τ`.
 * Parsed by hand into a tree (never run as code), then evaluated: by the plotter and
 * the explorer (as sliders move), and by quizzes, which decide whether an answer is
 * the same expression as the expected one by evaluating both at random points.
 *
 * Multiplication can be implied (`2x`, `2(x+1)`, `(a+b)(a-b)`, `R C`), `^` binds
 * tighter than a leading minus (`-x^2` is −(x²)) and groups to the right. A name
 * that isn't a variable, constant or function, but is made of variables (`xy`),
 * means their product.
 */

export type Expression =
  | { type: "number"; value: number }
  | { type: "name"; name: string }
  | { type: "negate"; arg: Expression }
  | {
      type: "binary";
      op: "+" | "-" | "*" | "/" | "^";
      left: Expression;
      right: Expression;
    }
  | { type: "call"; fn: string; args: Expression[] };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  lg: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  atan2: Math.atan2,
};

export const FUNCTION_NAMES: readonly string[] = Object.keys(FUNCTIONS);

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
};

export class ExpressionError extends Error {}

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string };

/** Typographic signs people paste: × · ÷ − and superscript-free forms. */
const OPERATOR_ALIASES: Record<string, string> = {
  "×": "*",
  "·": "*",
  "⋅": "*",
  "÷": "/",
  "−": "-",
  "–": "-",
  "**": "^",
};

const NAME_START = /[\p{L}_]/u;
const NAME_PART = /[\p{L}\p{N}_]/u;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i] ?? "";
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(
      source.slice(i),
    );
    if (number) {
      // "2e" followed by nothing numeric is 2·e, not a broken exponent.
      tokens.push({ kind: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    if (NAME_START.test(char)) {
      let end = i + 1;
      while (end < source.length && NAME_PART.test(source[end] ?? "")) end += 1;
      tokens.push({ kind: "name", value: source.slice(i, end) });
      i = end;
      continue;
    }
    if (source.startsWith("**", i)) {
      tokens.push({ kind: "op", value: "^" });
      i += 2;
      continue;
    }
    const op = OPERATOR_ALIASES[char] ?? char;
    if ("+-*/^(),".includes(op)) {
      tokens.push({ kind: "op", value: op });
      i += 1;
      continue;
    }
    throw new ExpressionError(`“${char}” can't be used here.`);
  }
  return tokens;
}

export interface ParseOptions {
  /** Names that are variables (anything else must be a constant or function). */
  variables?: readonly string[];
}

class Parser {
  private index = 0;
  private readonly variables: ReadonlySet<string>;

  constructor(
    private readonly tokens: Token[],
    variables: readonly string[] | undefined,
  ) {
    this.variables = new Set(variables ?? []);
  }

  parse(): Expression {
    if (this.tokens.length === 0) throw new ExpressionError("It's empty.");
    const expression = this.sum();
    const extra = this.peek();
    if (extra)
      throw new ExpressionError(
        `Unexpected “${String(extra.value)}” after the expression.`,
      );
    return expression;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private isOp(value: string): boolean {
    const token = this.peek();
    return token?.kind === "op" && token.value === value;
  }

  private sum(): Expression {
    let left = this.product();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.isOp("+") ? "+" : "-";
      this.index += 1;
      left = { type: "binary", op, left, right: this.product() };
    }
    return left;
  }

  /** Whether the next token can start a factor written straight after another. */
  private startsImplicitFactor(): boolean {
    const token = this.peek();
    if (!token) return false;
    return token.kind !== "op" || token.value === "(";
  }

  private product(): Expression {
    let left = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = this.isOp("*") ? "*" : "/";
        this.index += 1;
        left = { type: "binary", op, left, right: this.unary() };
      } else if (this.startsImplicitFactor()) {
        left = { type: "binary", op: "*", left, right: this.power() };
      } else {
        return left;
      }
    }
  }

  private unary(): Expression {
    if (this.isOp("-")) {
      this.index += 1;
      return { type: "negate", arg: this.unary() };
    }
    if (this.isOp("+")) {
      this.index += 1;
      return this.unary();
    }
    return this.power();
  }

  private power(): Expression {
    const base = this.atom();
    if (!this.isOp("^")) return base;
    this.index += 1;
    // Right-associative, and the exponent may carry its own sign: e^-x.
    return { type: "binary", op: "^", left: base, right: this.unary() };
  }

  private atom(): Expression {
    const token = this.peek();
    if (!token) throw new ExpressionError("It ends too soon.");
    this.index += 1;
    if (token.kind === "number") return { type: "number", value: token.value };
    if (token.kind === "op") {
      if (token.value === "(") {
        const inner = this.sum();
        if (!this.isOp(")")) throw new ExpressionError("A “)” is missing.");
        this.index += 1;
        return inner;
      }
      throw new ExpressionError(`Unexpected “${token.value}”.`);
    }
    return this.named(token.value);
  }

  private named(name: string): Expression {
    if (this.variables.has(name)) return { type: "name", name };
    if (name in FUNCTIONS) return this.call(name);
    if (name in CONSTANTS) return { type: "name", name };
    // `xy` written for x·y, when every letter is a variable (or constant).
    const letters = name.match(/./gu) ?? [];
    if (
      letters.length > 1 &&
      letters.every(
        (letter) => this.variables.has(letter) || letter in CONSTANTS,
      )
    ) {
      return letters
        .map((letter): Expression => ({ type: "name", name: letter }))
        .reduce((left, right) => ({ type: "binary", op: "*", left, right }));
    }
    throw new ExpressionError(`“${name}” isn't a known name.`);
  }

  private call(fn: string): Expression {
    // `sin x` and `sin(x)` both work; without brackets the argument is one factor.
    if (!this.isOp("(")) return { type: "call", fn, args: [this.power()] };
    this.index += 1;
    const args: Expression[] = [];
    if (!this.isOp(")")) {
      for (;;) {
        args.push(this.sum());
        if (!this.isOp(",")) break;
        this.index += 1;
      }
    }
    if (!this.isOp(")")) throw new ExpressionError(`“${fn}(” isn't closed.`);
    this.index += 1;
    const expression: Expression = { type: "call", fn, args };
    // sin(x)^2
    if (this.isOp("^")) {
      this.index += 1;
      return { type: "binary", op: "^", left: expression, right: this.unary() };
    }
    return expression;
  }
}

export function parseExpression(
  source: string,
  options: ParseOptions = {},
): Expression {
  return new Parser(tokenize(source), options.variables).parse();
}

export type Scope = Readonly<Record<string, number>>;

export function evaluate(expression: Expression, scope: Scope = {}): number {
  switch (expression.type) {
    case "number":
      return expression.value;
    case "name":
      return scope[expression.name] ?? CONSTANTS[expression.name] ?? NaN;
    case "negate":
      return -evaluate(expression.arg, scope);
    case "binary": {
      const left = evaluate(expression.left, scope);
      const right = evaluate(expression.right, scope);
      switch (expression.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          return left ** right;
      }
      break;
    }
    case "call": {
      const fn = FUNCTIONS[expression.fn];
      if (!fn) return NaN;
      return fn(...expression.args.map((arg) => evaluate(arg, scope)));
    }
  }
  return NaN;
}

/** The variable names an expression uses (constants aren't variables). */
export function namesIn(expression: Expression): string[] {
  const names = new Set<string>();
  const walk = (node: Expression) => {
    if (node.type === "name" && !(node.name in CONSTANTS)) names.add(node.name);
    else if (node.type === "negate") walk(node.arg);
    else if (node.type === "binary") {
      walk(node.left);
      walk(node.right);
    } else if (node.type === "call") node.args.forEach(walk);
  };
  walk(expression);
  return [...names].sort();
}

/** A small seeded generator, so the same check always samples the same points. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function close(a: number, b: number, tolerance: number): boolean {
  if (a === b) return true;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tolerance * scale;
}

/**
 * Whether two expressions are the same function of `variables`: equal (to a
 * relative 1e-6) at a set of random points where both are defined. Points between
 * 0.5 and 3 in size, of either sign, avoid most poles and keep powers tame.
 */
export function equivalent(
  a: Expression,
  b: Expression,
  variables: readonly string[],
  samples = 16,
): boolean {
  const next = random(0x5eed);
  let compared = 0;
  for (
    let attempt = 0;
    attempt < samples * 4 && compared < samples;
    attempt += 1
  ) {
    const scope: Record<string, number> = {};
    for (const name of variables) {
      const size = 0.5 + next() * 2.5;
      scope[name] = next() < 0.5 ? -size : size;
    }
    const left = evaluate(a, scope);
    const right = evaluate(b, scope);
    const leftOk = Number.isFinite(left);
    const rightOk = Number.isFinite(right);
    if (!leftOk && !rightOk) continue;
    if (leftOk !== rightOk) return false;
    if (!close(left, right, 1e-6)) return false;
    compared += 1;
  }
  return compared >= Math.min(4, samples);
}
