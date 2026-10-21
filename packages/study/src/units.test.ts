import { describe, expect, test } from "vitest";
import {
  formatNumber,
  formatQuantity,
  isUnit,
  parseQuantity,
  parseTolerance,
  withinTolerance,
  writtenFactor,
} from "./units";

describe("parseQuantity", () => {
  test("reads prefixes and units", () => {
    expect(parseQuantity("4.7 kΩ")).toEqual({ value: 4700, unit: "Ω" });
    expect(parseQuantity("4700 ohm")).toEqual({ value: 4700, unit: "Ω" });
    expect(parseQuantity("0.5mA")?.value).toBeCloseTo(5e-4);
    expect(parseQuantity("2.2 uF")?.value).toBeCloseTo(2.2e-6);
    expect(parseQuantity("2.2 µF")?.unit).toBe("F");
    expect(parseQuantity("1.5 km/s")).toEqual({ value: 1500, unit: "m/s" });
    expect(parseQuantity("3 m")).toEqual({ value: 3, unit: "m" });
    expect(parseQuantity("3 mm")?.value).toBeCloseTo(0.003);
    expect(parseQuantity("−3e-3 V")?.value).toBeCloseTo(-0.003);
    expect(parseQuantity("2 × 10^3 Hz")).toEqual({ value: 2000, unit: "Hz" });
    expect(parseQuantity("1,5 V")?.value).toBe(1.5);
    expect(parseQuantity("12")).toEqual({ value: 12, unit: "" });
    expect(parseQuantity("V")).toBeNull();
  });

  test("knows the written unit's prefix", () => {
    expect(writtenFactor("0.5 mA")).toBe(1e-3);
    expect(writtenFactor("-3e-3 V")).toBe(1);
  });
});

describe("tolerances", () => {
  test("relative and absolute", () => {
    const relative = parseTolerance("2%");
    const absolute = parseTolerance("0.01 A");
    expect(relative).toEqual({ kind: "relative", amount: 0.02 });
    expect(absolute).toEqual({ kind: "absolute", amount: 0.01 });
    expect(
      withinTolerance(1.019, 1, relative ?? { kind: "relative", amount: 0 }),
    ).toBe(true);
    expect(
      withinTolerance(1.021, 1, relative ?? { kind: "relative", amount: 0 }),
    ).toBe(false);
    expect(
      withinTolerance(0.509, 0.5, absolute ?? { kind: "absolute", amount: 0 }),
    ).toBe(true);
    expect(parseTolerance("lots")).toBeNull();
  });
});

describe("formatQuantity", () => {
  test("picks a prefix", () => {
    expect(formatQuantity(0.0025, "A")).toBe("2.5 mA");
    expect(formatQuantity(4700, "Ω")).toBe("4.7 kΩ");
    expect(formatQuantity(-12, "V")).toBe("−12 V");
    expect(formatQuantity(0, "W")).toBe("0 W");
    expect(formatQuantity(123456, "Hz")).toBe("123 kHz");
    expect(formatQuantity(0.5, "")).toBe("0.5");
    expect(formatQuantity(45, "%")).toBe("45%");
  });

  test("formats plain numbers", () => {
    expect(formatNumber(123456)).toBe("123000");
    expect(formatNumber(0.000012)).toBe("1.2×10^−5");
    expect(formatNumber(-2.5)).toBe("−2.5");
  });
});

describe("isUnit", () => {
  test("knows units with their powers", () => {
    expect(isUnit("m²")).toBe(true);
    expect(isUnit("m^-3")).toBe(true);
    expect(isUnit("J/(mol·K)")).toBe(true);
    expect(isUnit("x²")).toBe(false);
    expect(isUnit("")).toBe(false);
  });

  test("stays quick on long runs of superscripts", () => {
    const started = performance.now();
    expect(isUnit(`m${"²".repeat(50_000)}x`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
