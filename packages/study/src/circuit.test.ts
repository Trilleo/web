import { describe, expect, test } from "vitest";
import { drawCircuit } from "./circuit/draw";
import { parseCircuit, parseValue } from "./circuit/parse";
import { loosePins, solveCircuit } from "./circuit/solve";

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

describe("devices and other parts", () => {
  test("place transistor and op-amp pins around their point", () => {
    const { circuit, errors } = parseCircuit(
      "Q1 npn 2,2 β=50\nQ2 pnp 8,4 left flip\nM1 nmos 2,8\nU1 opamp 10,10 plus-top",
    );
    expect(errors).toEqual([]);
    expect(circuit.devices.map((device) => device.pins)).toEqual([
      { b: { x: 2, y: 2 }, c: { x: 4, y: 0 }, e: { x: 4, y: 4 } },
      { b: { x: 8, y: 4 }, c: { x: 6, y: 6 }, e: { x: 6, y: 2 } },
      { g: { x: 2, y: 8 }, d: { x: 4, y: 6 }, s: { x: 4, y: 10 } },
      { plus: { x: 10, y: 9 }, minus: { x: 10, y: 11 }, out: { x: 14, y: 10 } },
    ]);
    expect(circuit.devices[0]?.text).toBe("β=50");
    expect(parseCircuit("Q1 npn 0,0").errors[0]).toMatch(/off the grid/);
    expect(parseCircuit("Q1 fet 2,2").errors[0]).toMatch(/npn, pnp/);
  });

  test("draw every kind of part, and describe them", () => {
    const { circuit, errors } = parseCircuit(
      "A1 0,4 0,0 u2\nD1 0,0 4,0 1N4007\nZ1 4,4 4,0 6V\nS1 4,4 6,4 closed\nR1 6,4 8,4 RL\nQ1 npn 10,2\nM1 pjfet 14,2\nU1 opamp 18,2",
    );
    expect(errors).toEqual([]);
    const svg = drawCircuit(circuit, { title: "All", id: "all" });
    expect(svg.match(/data-part=/g)).toHaveLength(8);
    expect(svg).toContain("D1, diode, 1N4007");
    expect(svg).toContain("Q1, NPN transistor");
    expect(svg).toContain("U1, op-amp");
  });

  test("controlled sources are diamonds, drawn but not simulated", () => {
    const { circuit, errors } = parseCircuit(
      "F1 4,4 4,0 gmUgs\nE1 0,4 0,0 μu1\nR1 0,0 4,0 1k\nW 0,4 4,4\nG 0,4",
    );
    expect(errors).toEqual([]);
    expect(circuit.elements.map((e) => [e.kind, e.valueText])).toEqual([
      ["F", "gmUgs"],
      ["E", "μu1"],
      ["R", "1 kΩ"],
    ]);
    const svg = drawCircuit(circuit, { title: "Dependent", id: "dep" });
    expect(svg).toContain("F1, controlled current source, gmUgs");
    expect(svg).toContain("E1, controlled voltage source, μu1");
    // Each is a four-cornered polygon (the diamond).
    expect(
      svg.match(
        /<polygon points="(?:[\d.]+,[\d.]+ ){3}[\d.]+,[\d.]+" class="sc-body"/g,
      )?.length,
    ).toBeGreaterThanOrEqual(3);
    const sim = solveCircuit(circuit);
    expect(sim.ok ? "" : sim.error).toMatch(/F1 \(controlled current source\)/);
  });

  test("transformers: four pins, a centre tap, mirrored with left", () => {
    const { circuit, errors } = parseCircuit(
      "T1 transformer 2,0 220V:u2\nT2 centre-tap 10,0\nT3 transformer 18,0 left",
    );
    expect(errors).toEqual([]);
    expect(circuit.devices.map((device) => device.pins)).toEqual([
      {
        p1: { x: 2, y: 0 },
        p2: { x: 2, y: 4 },
        s1: { x: 4, y: 0 },
        s2: { x: 4, y: 4 },
      },
      {
        p1: { x: 10, y: 0 },
        p2: { x: 10, y: 4 },
        s1: { x: 12, y: 0 },
        s2: { x: 12, y: 4 },
        ct: { x: 12, y: 2 },
      },
      {
        p1: { x: 18, y: 0 },
        p2: { x: 18, y: 4 },
        s1: { x: 16, y: 0 },
        s2: { x: 16, y: 4 },
      },
    ]);
    const svg = drawCircuit(circuit, { title: "Transformers", id: "t" });
    expect(svg).toContain("T1, transformer, 220V:u2");
    expect(svg).toContain("T2, centre-tapped transformer");
    expect(svg).toContain(">220V:u2</text>");
    // Mirrored coils sweep the other way.
    expect(svg).toMatch(/A12 12 0 0 1/);
    expect(svg).toMatch(/A12 12 0 0 0/);
    expect(parseCircuit("T1 transformer 1,0 left").errors[0]).toMatch(
      /off the grid/,
    );
    const loose = parseCircuit(
      "A1 0,4 0,0 u1\nW 0,0 2,0\nW 0,4 2,4\nT1 transformer 2,0\nR1 4,0 4,4 1k",
    ).circuit;
    expect(loosePins(loose)).toEqual([]);
    const short = parseCircuit(
      "A1 0,4 0,0 u1\nW 0,0 2,0\nW 0,4 2,4\nT1 transformer 2,0\nR1 5,0 5,4 RL",
    ).circuit;
    expect(loosePins(short)).toEqual([
      "T1 secondary (top)",
      "T1 secondary (bottom)",
    ]);
    const sim = solveCircuit(loose);
    expect(sim.ok ? "" : sim.error).toMatch(/can only be drawn/);
  });

  test("pins left unconnected on a wired-in device are reported", () => {
    const wired = parseCircuit(
      "U1 opamp 4,2\nR1 0,1 4,1 10k\nW 4,3 4,5\nG 4,5\nW 8,2 10,2",
    ).circuit;
    expect(loosePins(wired)).toEqual([]);
    const short = parseCircuit(
      "U1 opamp 4,2\nR1 0,1 4,1 10k\nW 4,3 4,5\nG 4,5\nW 9,2 10,2",
    ).circuit;
    expect(loosePins(short)).toEqual(["U1 output"]);
    expect(loosePins(parseCircuit("Q1 npn 2,2").circuit)).toEqual([]);
  });

  test("symbols as values: R/2 and 2C, and a name that repeats itself is drawn once", () => {
    const { circuit, errors } = parseCircuit(
      "R1 0,0 4,0 R1\nR2 4,0 8,0 R/2\nC1 8,0 8,4 2C",
    );
    expect(errors).toEqual([]);
    expect(circuit.elements.map((e) => e.valueText)).toEqual([
      "R1",
      "R/2",
      "2C",
    ]);
    const svg = drawCircuit(circuit, { title: "Symbols", id: "symbols" });
    expect(svg.match(/>R1</g)).toHaveLength(1);
    expect(svg).toContain(">R/2<");
    expect(parseCircuit("R1 0,0 4,0 1/2").errors).not.toEqual([]);
  });

  test("the simulator takes switches, and refuses what it can only draw", () => {
    const closed = parseCircuit(
      "V1 0,4 0,0 10V\nS1 0,0 4,0 closed\nR1 4,0 4,4 1k\nW 0,4 4,4\nG 0,4",
    );
    const solved = solveCircuit(closed.circuit);
    expect(
      solved.ok &&
        solved.solution.elements.find((e) => e.name === "R1")?.current,
    ).toBeCloseTo(0.01);
    const open = parseCircuit(
      "V1 0,4 0,0 10V\nS1 0,0 4,0 open\nR1 4,0 4,4 1k\nW 0,4 4,4\nG 0,4",
    );
    const off = solveCircuit(open.circuit);
    expect(
      off.ok && off.solution.elements.find((e) => e.name === "R1")?.current,
    ).toBeCloseTo(0);
    const diode = solveCircuit(
      parseCircuit("V1 0,4 0,0 5V\nD1 0,0 4,0\nR1 4,0 4,4 1k\nW 0,4 4,4")
        .circuit,
    );
    expect(diode.ok ? "" : diode.error).toMatch(/can only be drawn/);
    const labelled = solveCircuit(
      parseCircuit("V1 0,4 0,0 5V\nR1 0,0 4,0 RL\nW 4,0 4,4 0,4").circuit,
    );
    expect(labelled.ok ? "" : labelled.error).toMatch(/needs numbers/);
  });
});
