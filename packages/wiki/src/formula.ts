/**
 * Formulas for `::: calculator`: arithmetic only. Numbers, names (the calculator's
 * inputs and earlier results), + − × ÷ % ^, brackets, and a fixed list of functions.
 * Parsed into a tree once; evaluated on the server (the defaults) and in the browser
 * (as readers type). Nothing a reader or editor types is ever run as code.
 */

export type Formula =
  | { type: "number"; value: number }
  | { type: "name"; name: string }
  | { type: "unary"; op: "-"; arg: Formula }
  | {
      type: "binary";
      op: "+" | "-" | "*" | "/" | "%" | "^";
      left: Formula;
      right: Formula;
    }
  | { type: "call"; fn: FunctionName; args: Formula[] };

const FUNCTIONS = {
  min: (...xs: number[]) => Math.min(...xs),
  max: (...xs: number[]) => Math.max(...xs),
  abs: (x = NaN) => Math.abs(x),
  sqrt: (x = NaN) => Math.sqrt(x),
  floor: (x = NaN) => Math.floor(x),
  ceil: (x = NaN) => Math.ceil(x),
  round: (x = NaN, digits = 0) => {
    const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)));
    return Math.round(x * factor) / factor;
  },
  clamp: (x = NaN, low = -Infinity, high = Infinity) =>
    Math.min(high, Math.max(low, x)),
} as const;
export type FunctionName = keyof typeof FUNCTIONS;
export const FUNCTION_NAMES = Object.keys(FUNCTIONS) as FunctionName[];

export class FormulaError extends Error {}

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i] ?? "";
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    const number = /^(\d+(?:\.\d+)?|\.\d+)/.exec(source.slice(i));
    if (number?.[1]) {
      tokens.push({ kind: "number", value: Number(number[1]) });
      i += number[1].length;
      continue;
    }
    const name = /^[a-z_][a-z0-9_]*/i.exec(source.slice(i));
    if (name?.[0]) {
      tokens.push({ kind: "name", value: name[0].toLowerCase() });
      i += name[0].length;
      continue;
    }
    const op = { "×": "*", "÷": "/", "−": "-" }[char] ?? char;
    if ("+-*/%^(),".includes(op)) {
      tokens.push({ kind: "op", value: op });
      i += 1;
      continue;
    }
    throw new FormulaError(`“${char}” can't be in a formula.`);
  }
  return tokens;
}

/** A formula's tree, or a FormulaError saying what's wrong. */
export function parseFormula(source: string): Formula {
  if (source.length > 500) throw new FormulaError("That formula is too long.");
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const takeOp = (value: string) => {
    const token = peek();
    if (token?.kind === "op" && token.value === value) {
      position += 1;
      return true;
    }
    return false;
  };

  const expression = (): Formula => {
    let left = term();
    for (;;) {
      if (takeOp("+")) left = { type: "binary", op: "+", left, right: term() };
      else if (takeOp("-"))
        left = { type: "binary", op: "-", left, right: term() };
      else return left;
    }
  };
  const term = (): Formula => {
    let left = power();
    for (;;) {
      if (takeOp("*")) left = { type: "binary", op: "*", left, right: power() };
      else if (takeOp("/"))
        left = { type: "binary", op: "/", left, right: power() };
      else if (takeOp("%"))
        left = { type: "binary", op: "%", left, right: power() };
      else return left;
    }
  };
  const power = (): Formula => {
    const base = unary();
    return takeOp("^")
      ? { type: "binary", op: "^", left: base, right: power() }
      : base;
  };
  const unary = (): Formula => {
    if (takeOp("-")) return { type: "unary", op: "-", arg: unary() };
    if (takeOp("+")) return unary();
    return primary();
  };
  const primary = (): Formula => {
    const token = peek();
    if (!token) throw new FormulaError("The formula ends too soon.");
    position += 1;
    if (token.kind === "number") return { type: "number", value: token.value };
    if (token.kind === "name") {
      if (takeOp("(")) {
        if (!Object.hasOwn(FUNCTIONS, token.value))
          throw new FormulaError(
            `There's no function “${token.value}” (there are ${FUNCTION_NAMES.join(", ")}).`,
          );
        const args: Formula[] = [];
        if (!takeOp(")")) {
          do args.push(expression());
          while (takeOp(","));
          if (!takeOp(")")) throw new FormulaError("A “)” is missing.");
        }
        return { type: "call", fn: token.value as FunctionName, args };
      }
      return { type: "name", name: token.value };
    }
    if (token.value === "(") {
      const inner = expression();
      if (!takeOp(")")) throw new FormulaError("A “)” is missing.");
      return inner;
    }
    throw new FormulaError(`“${token.value}” is out of place.`);
  };

  const tree = expression();
  if (position < tokens.length)
    throw new FormulaError("There's more after the formula ends.");
  return tree;
}

/** The names a formula uses. */
export function formulaNames(
  formula: Formula,
  into = new Set<string>(),
): Set<string> {
  if (formula.type === "name") into.add(formula.name);
  else if (formula.type === "unary") formulaNames(formula.arg, into);
  else if (formula.type === "binary") {
    formulaNames(formula.left, into);
    formulaNames(formula.right, into);
  } else if (formula.type === "call")
    for (const arg of formula.args) formulaNames(arg, into);
  return into;
}

/** Its value with these names; NaN when it can't be worked out (÷ 0, unknown name). */
export function evaluateFormula(
  formula: Formula,
  values: ReadonlyMap<string, number>,
): number {
  switch (formula.type) {
    case "number":
      return formula.value;
    case "name":
      return values.get(formula.name) ?? NaN;
    case "unary":
      return -evaluateFormula(formula.arg, values);
    case "binary": {
      const a = evaluateFormula(formula.left, values);
      const b = evaluateFormula(formula.right, values);
      switch (formula.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b === 0 ? NaN : a / b;
        case "%":
          return b === 0 ? NaN : a % b;
        case "^":
          return a ** b;
      }
      return NaN;
    }
    case "call":
      return FUNCTIONS[formula.fn](
        ...formula.args.map((arg) => evaluateFormula(arg, values)),
      );
  }
}

/** A result as shown: up to two decimals, thousands separated; "—" if it can't be worked out. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
