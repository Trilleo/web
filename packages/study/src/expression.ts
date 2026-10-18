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
 *
 * Probability adds `n!`, `comb(n, k)` (also `C(n, k)` when C isn't a variable),
 * `perm(n, k)`, `gamma(x)`, `erf(x)` and `Phi(x)` (`Φ`), the standard normal
 * distribution function.
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

/** Lanczos' approximation (g = 7), good to about 15 digits. */
const LANCZOS = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531,
  -176.6150291621406, 12.507343278686905, -0.13857109526572012,
  9.984369578019572e-6, 1.5056327351493116e-7,
];

export function gamma(x: number): number {
  if (Number.isInteger(x) && x <= 0) return NaN;
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  if (Number.isInteger(x) && x <= 171) {
    let product = 1;
    for (let k = 2; k < x; k += 1) product *= k;
    return product;
  }
  const z = x - 1;
  let sum = LANCZOS[0] ?? 1;
  for (let k = 1; k < LANCZOS.length; k += 1)
    sum += (LANCZOS[k] ?? 0) / (z + k);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * sum;
}

export function factorial(n: number): number {
  return gamma(n + 1);
}

/** Binomial coefficient; 0 outside 0 ≤ k ≤ n, as counting expects. */
export function comb(n: number, k: number): number {
  if (Number.isInteger(n) && Number.isInteger(k)) {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let i = 1; i <= Math.min(k, n - k); i += 1)
      result = (result * (n - Math.min(k, n - k) + i)) / i;
    return Math.round(result);
  }
  return gamma(n + 1) / (gamma(k + 1) * gamma(n - k + 1));
}

/** Arrangements of k out of n (A or P in Chinese textbooks). */
export function perm(n: number, k: number): number {
  if (Number.isInteger(n) && Number.isInteger(k) && (k < 0 || k > n)) return 0;
  return gamma(n + 1) / gamma(n - k + 1);
}

/** The error function, by W. J. Cody's rational approximations (about 1e-15). */
export function erf(x: number): number {
  if (x < 0) return -erf(-x);
  if (x < 0.5) {
    const t = x * x;
    const top =
      (((0.18577770618460315 * t + 3.1611237438705655) * t +
        113.86415415105016) *
        t +
        377.485237685302) *
        t +
      3209.3775891384694;
    const bottom =
      (((t + 23.601290952344122) * t + 244.02463793444417) * t +
        1282.6165260773723) *
        t +
      2844.236833439171;
    return (x * top) / bottom;
  }
  return 1 - erfc(x);
}

function erfc(x: number): number {
  if (x < 4) {
    const p = [
      0.5641884969886701, 8.883149794388377, 66.11919063714163,
      298.6351381974001, 881.952221241769, 1712.0476126340707,
      2051.0783778260716, 1230.3393547979972, 2.1531153547440383e-8,
    ];
    const q = [
      15.744926110709835, 117.6939508913125, 537.1811018620099,
      1621.3895745666903, 3290.7992357334597, 4362.619090143247,
      3439.3676741437216, 1230.3393548037495,
    ];
    let top = (p[8] ?? 0) * x;
    let bottom = x;
    for (let i = 0; i < 7; i += 1) {
      top = (top + (p[i] ?? 0)) * x;
      bottom = (bottom + (q[i] ?? 0)) * x;
    }
    return (Math.exp(-x * x) * (top + (p[7] ?? 0))) / (bottom + (q[7] ?? 0));
  }
  const p = [
    0.30532663496123236, 0.36034489994980445, 0.12578172611122926,
    0.016083785148742275, 0.0006587491615298378, 0.016315387137302097,
  ];
  const q = [
    2.568520192289822, 1.8729528499234673, 0.5279051029514285,
    0.06051834131244132, 0.0023352049762686918,
  ];
  const z = 1 / (x * x);
  let top = (p[5] ?? 0) * z;
  let bottom = z;
  for (let i = 0; i < 4; i += 1) {
    top = (top + (p[i] ?? 0)) * z;
    bottom = (bottom + (q[i] ?? 0)) * z;
  }
  const r = (z * (top + (p[4] ?? 0))) / (bottom + (q[4] ?? 0));
  return (Math.exp(-x * x) / x) * (1 / Math.sqrt(Math.PI) - r);
}

/** The standard normal distribution function Φ. */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

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
  gamma,
  fact: factorial,
  comb,
  binom: comb,
  C: comb,
  perm,
  A: perm,
  erf,
  Phi: normalCdf,
  Φ: normalCdf,
};

const BRACKETED_ONLY: ReadonlySet<string> = new Set(["C", "A"]);

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
    if ("+-*/^(),!".includes(op)) {
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
    let base = this.atom();
    while (this.isOp("!")) {
      this.index += 1;
      base = { type: "call", fn: "fact", args: [base] };
    }
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
    // C and A are textbook names for comb and perm, but only as C(n, k): alone they
    // stay ordinary names (a capacitance, an amplitude).
    if (name in FUNCTIONS && (!BRACKETED_ONLY.has(name) || this.isOp("(")))
      return this.call(name);
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
