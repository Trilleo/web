import { describe, expect, test } from "vitest";
import { drawCircuit } from "./circuit/draw";
import { parseCircuit, parseValue } from "./circuit/parse";
import { solveCircuit } from "./circuit/solve";

const DIVIDER = `V1 0,4 0,0 12V
R1 0,0 4,0 1k
R2 4,0 4,4 2k
W 0,4 4,4
G 0,4
label out 4,0`;

function solved(body: string, values?: Record<string, number>) {
  const { circuit, errors } = parseCircuit(body);
  expect(errors).toEqual([]);
  const result = solveCircuit(circuit, values);
  if (!result.ok) throw new Error(result.error);
  const reading = (name: string) =>
    result.solution.elements.find((element) => element.name === name);
  return { circuit, solution: result.solution, reading };
}

describe("parseCircuit", () => {
  test("reads values with or without units", () => {
    expect(parseValue("1k", "R")).toBe(1000);
    expect(parseValue("1kΩ", "R")).toBe(1000);
    expect(parseValue("10u", "C")).toBeCloseTo(1e-5);
    expect(parseValue("2mA", "I")).toBeCloseTo(0.002);
    expect(parseValue("5", "V")).toBe(5);
    expect(parseValue("5 A", "V")).toBeNull();
  });

  test("reports mistakes by line", () => {
    const { errors } = parseCircuit(
      "R1 0,0 1,1 1k\nX1 0,0 2,0\nR2 0,0 0,1 1k\nR3 0,0 4,0\nR4 0,0 4,0 -1k\nW 0,0 2,2",
    );
    expect(errors).toHaveLength(6);
    expect(errors[0]).toMatch(/^Line 1: R1 must run straight/);
  });
});

describe("solveCircuit", () => {
  test("a voltage divider", () => {
    const { solution, reading, circuit } = solved(DIVIDER);
    const out = solution.nodeAt(circuit.labels[0]?.at ?? { x: 0, y: 0 });
    expect(solution.voltages[out ?? -1]).toBeCloseTo(8);
    expect(reading("R1")?.current).toBeCloseTo(0.004);
    expect(reading("R2")?.voltage).toBeCloseTo(8);
    // The source supplies what the resistors absorb.
    expect(reading("V1")?.power).toBeCloseTo(-0.048);
    expect(
      (reading("R1")?.power ?? 0) + (reading("R2")?.power ?? 0),
    ).toBeCloseTo(0.048);
  });

  test("slider values replace the written ones", () => {
    const { reading } = solved(DIVIDER, { R2: 1000 });
    expect(reading("R2")?.voltage).toBeCloseTo(6);
  });

  test("a current divider joined at T-junctions", () => {
    const { reading } = solved(`I1 0,4 0,0 3mA
W 0,0 6,0
R1 3,0 3,4 1k
R2 6,0 6,4 2k
W 0,4 6,4
G 0,4`);
    expect(reading("R1")?.current).toBeCloseTo(0.002);
    expect(reading("R2")?.current).toBeCloseTo(0.001);
  });

  test("capacitors are open and inductors short at DC", () => {
    const { reading } = solved(`V1 0,4 0,0 10V
L1 0,0 4,0 1m
R1 4,0 4,4 100
C1 6,0 6,4 1u
W 4,0 6,0
W 0,4 6,4
G 0,4`);
    expect(reading("R1")?.current).toBeCloseTo(0.1);
    expect(reading("L1")?.current).toBeCloseTo(0.1);
    expect(reading("C1")?.current).toBe(0);
  });

  test("refuses voltage sources in a loop", () => {
    const { circuit } = parseCircuit(
      "V1 0,4 0,0 5V\nV2 2,4 2,0 3V\nW 0,0 2,0\nW 0,4 2,4",
    );
    expect(solveCircuit(circuit).ok).toBe(false);
  });
});

describe("drawCircuit", () => {
  test("draws every part, junctions and labels, accessibly", () => {
    const { circuit } = parseCircuit(DIVIDER);
    const svg = drawCircuit(circuit, { title: "A divider", id: "c1" });
    expect(svg).toMatch(/^<svg [^>]*role="img" aria-labelledby="c1-title"/);
    expect(svg).toContain(
      "A divider. V1, voltage source, 12 V; R1, resistor, 1 kΩ; R2, resistor, 2 kΩ.",
    );
    expect(svg.match(/data-part=/g)).toHaveLength(3);
    expect(svg).toContain(">out</text>");
    expect(svg).toContain('class="sc-ground"');
  });

  test("escapes what it's given", () => {
    const { circuit } = parseCircuit("R1 0,0 4,0 1k");
    expect(drawCircuit(circuit, { title: "<b>", id: "x" })).not.toContain(
      "<b>",
    );
  });
});
