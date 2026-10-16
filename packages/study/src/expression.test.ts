import { describe, expect, test } from "vitest";
import { equivalent, evaluate, namesIn, parseExpression } from "./expression";

const value = (
  source: string,
  scope: Record<string, number> = {},
  variables = Object.keys(scope),
) => evaluate(parseExpression(source, { variables }), scope);

describe("parseExpression", () => {
  test("follows the usual precedence", () => {
    expect(value("1 + 2 * 3")).toBe(7);
    expect(value("2^3^2")).toBe(512);
    expect(value("-2^2")).toBe(-4);
    expect(value("(1 + 2) * 3")).toBe(9);
    expect(value("6 / 2 / 3")).toBe(1);
  });

  test("reads implied multiplication", () => {
    expect(value("2x", { x: 3 })).toBe(6);
    expect(value("2(x + 1)", { x: 3 })).toBe(8);
    expect(value("(x + 1)(x - 1)", { x: 3 })).toBe(8);
    expect(value("R C", { R: 2, C: 5 })).toBe(10);
    expect(value("xy", { x: 2, y: 5 })).toBe(10);
    expect(value("2pi")).toBeCloseTo(2 * Math.PI);
  });

  test("knows functions, constants and typographic signs", () => {
    expect(value("sin(pi/2)")).toBeCloseTo(1);
    expect(value("sin x^2", { x: 2 })).toBeCloseTo(Math.sin(4));
    expect(value("e^-1")).toBeCloseTo(1 / Math.E);
    expect(value("3 × 4 − 2 ÷ 2")).toBe(11);
    expect(value("sqrt(16) + abs(-2) + ln(e)")).toBe(7);
    expect(value("1.5e3")).toBe(1500);
  });

  test("refuses what it can't read", () => {
    expect(() => parseExpression("2 +")).toThrow();
    expect(() => parseExpression("(1 + 2")).toThrow(/missing/);
    expect(() => parseExpression("foo", { variables: ["x"] })).toThrow(/known/);
    expect(() => parseExpression("1 $ 2")).toThrow();
    expect(() => parseExpression("")).toThrow();
  });

  test("lists the names used", () => {
    expect(
      namesIn(
        parseExpression("a sin(b x) + pi", { variables: ["a", "b", "x"] }),
      ),
    ).toEqual(["a", "b", "x"]);
  });
});

describe("equivalent", () => {
  const same = (a: string, b: string, variables: string[]) =>
    equivalent(
      parseExpression(a, { variables }),
      parseExpression(b, { variables }),
      variables,
    );

  test("accepts the same function written differently", () => {
    expect(same("2(x+1)", "2x + 2", ["x"])).toBe(true);
    expect(same("u^2/R", "u u / R", ["u", "R"])).toBe(true);
    expect(same("sin(x)^2 + cos(x)^2", "1", ["x"])).toBe(true);
    expect(same("(a+b)^2", "a^2 + 2ab + b^2", ["a", "b"])).toBe(true);
  });

  test("refuses different ones", () => {
    expect(same("2x + 1", "2x + 2", ["x"])).toBe(false);
    expect(same("x^2", "x^3", ["x"])).toBe(false);
    expect(same("1/x", "x", ["x"])).toBe(false);
  });
});
