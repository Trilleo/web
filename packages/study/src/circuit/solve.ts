/**
 * DC analysis by modified nodal analysis: unknowns are the node voltages plus the
 * current through each voltage source (and inductor, a short circuit at DC);
 * capacitors are open. A tiny conductance from every node to ground keeps parts of a
 * circuit that float (behind a capacitor) solvable, at 0 V.
 *
 * Signs follow the passive convention: an element's voltage is V(first point) −
 * V(second point), its current flows from the first point to the second, and its
 * power is what it absorbs (negative: it supplies power).
 */
import {
  pointKey,
  simulationProblem,
  type Circuit,
  type CircuitElement,
  type Point,
} from "./parse";

export interface ElementResult {
  name: string;
  voltage: number;
  current: number;
  power: number;
}

export interface Solution {
  /** Node index of a grid point, or undefined if nothing is there. */
  nodeAt(point: Point): number | undefined;
  /** Voltage of each node; the ground node is 0. */
  voltages: number[];
  ground: number;
  elements: ElementResult[];
  /** Points that make up each node, for placing labels. */
  nodePoints: Point[][];
}

export type SolveResult =
  { ok: true; solution: Solution } | { ok: false; error: string };

const GMIN = 1e-12;

class UnionFind {
  private readonly parent = new Map<string, string>();

  add(key: string): void {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }

  find(key: string): string {
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root) ?? root;
    // Path compression.
    let node = key;
    while (node !== root) {
      const next = this.parent.get(node) ?? root;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }

  keys(): string[] {
    return [...this.parent.keys()];
  }
}

function onSegment(point: Point, a: Point, b: Point): boolean {
  if (a.x === b.x && point.x === a.x)
    return point.y > Math.min(a.y, b.y) && point.y < Math.max(a.y, b.y);
  if (a.y === b.y && point.y === a.y)
    return point.x > Math.min(a.x, b.x) && point.x < Math.max(a.x, b.x);
  return false;
}

/** Every point in the circuit, the wire segments, and which points are joined. */
export function connectivity(circuit: Circuit): {
  groups: UnionFind;
  segments: [Point, Point][];
  points: Point[];
} {
  const groups = new UnionFind();
  const points = new Map<string, Point>();
  const add = (point: Point) => {
    points.set(pointKey(point), point);
    groups.add(pointKey(point));
  };
  for (const element of circuit.elements) {
    add(element.from);
    add(element.to);
  }
  for (const point of circuit.grounds) add(point);
  for (const label of circuit.labels) add(label.at);
  for (const device of circuit.devices) Object.values(device.pins).forEach(add);
  const segments: [Point, Point][] = [];
  for (const wire of circuit.wires) {
    wire.forEach(add);
    for (let i = 1; i < wire.length; i += 1) {
      const a = wire[i - 1];
      const b = wire[i];
      if (!a || !b) continue;
      segments.push([a, b]);
      groups.union(pointKey(a), pointKey(b));
    }
  }
  // A point that lands on a wire (a T-junction) joins it.
  for (const point of points.values())
    for (const [a, b] of segments)
      if (onSegment(point, a, b)) groups.union(pointKey(point), pointKey(a));
  return { groups, segments, points: [...points.values()] };
}

/**
 * Transistor, op-amp and transformer pins that nothing reaches ("Q1 base"), on devices that are
 * otherwise wired in: a wire that stops one square short still parses and draws, so
 * the renderer reports these. A device with no pin wired is a symbol on show.
 */
export function loosePins(circuit: Circuit): string[] {
  const { groups, points } = connectivity(circuit);
  const uses = new Map<string, number>();
  const mark = (point: Point) => {
    const key = pointKey(point);
    uses.set(key, (uses.get(key) ?? 0) + 1);
  };
  for (const element of circuit.elements) {
    mark(element.from);
    mark(element.to);
  }
  circuit.grounds.forEach(mark);
  circuit.labels.forEach((label) => {
    mark(label.at);
  });
  circuit.wires.forEach((wire) => {
    wire.forEach(mark);
  });
  for (const device of circuit.devices)
    Object.values(device.pins).forEach(mark);
  const size = new Map<string, number>();
  for (const point of points) {
    const root = groups.find(pointKey(point));
    size.set(root, (size.get(root) ?? 0) + 1);
  }
  const PIN_NAMES: Readonly<Record<string, string>> = {
    b: "base",
    c: "collector",
    e: "emitter",
    g: "gate",
    d: "drain",
    s: "source",
    minus: "− input",
    plus: "+ input",
    out: "output",
    p1: "primary (top)",
    p2: "primary (bottom)",
    s1: "secondary (top)",
    s2: "secondary (bottom)",
    ct: "centre tap",
  };
  const isLoose = (point: Point) => {
    const key = pointKey(point);
    return (uses.get(key) ?? 0) < 2 && (size.get(groups.find(key)) ?? 0) < 2;
  };
  return circuit.devices.flatMap((device) => {
    const pins = Object.entries(device.pins);
    const loose = pins.filter(([, point]) => isLoose(point));
    if (loose.length === pins.length) return [];
    return loose.map(([pin]) => `${device.name} ${PIN_NAMES[pin] ?? pin}`);
  });
}

/** Solves A·x = b in place by Gaussian elimination with partial pivoting. */
function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1)
      if (
        Math.abs(matrix[row]?.[col] ?? 0) > Math.abs(matrix[pivot]?.[col] ?? 0)
      )
        pivot = row;
    const pivotRow = matrix[pivot];
    const pivotValue = pivotRow?.[col] ?? 0;
    if (!pivotRow || Math.abs(pivotValue) < 1e-18) return null;
    if (pivot !== col) {
      const swap = matrix[col] ?? [];
      matrix[col] = pivotRow;
      matrix[pivot] = swap;
      const swapRhs = rhs[col] ?? 0;
      rhs[col] = rhs[pivot] ?? 0;
      rhs[pivot] = swapRhs;
    }
    const top = matrix[col] ?? [];
    for (let row = col + 1; row < n; row += 1) {
      const current = matrix[row] ?? [];
      const factor = (current[col] ?? 0) / pivotValue;
      if (factor === 0) continue;
      for (let k = col; k < n; k += 1)
        current[k] = (current[k] ?? 0) - factor * (top[k] ?? 0);
      rhs[row] = (rhs[row] ?? 0) - factor * (rhs[col] ?? 0);
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    const current = matrix[row] ?? [];
    let sum = rhs[row] ?? 0;
    for (let k = row + 1; k < n; k += 1) sum -= (current[k] ?? 0) * (x[k] ?? 0);
    x[row] = sum / (current[row] ?? 1);
  }
  return x;
}

/**
 * Solves the circuit at DC. `values` overrides parts' values by name (the
 * simulator's sliders).
 */
export function solveCircuit(
  circuit: Circuit,
  values: Readonly<Record<string, number>> = {},
): SolveResult {
  const { groups, points } = connectivity(circuit);
  const nodeOfRoot = new Map<string, number>();
  const nodePoints: Point[][] = [];
  for (const point of points) {
    const root = groups.find(pointKey(point));
    let node = nodeOfRoot.get(root);
    if (node === undefined) {
      node = nodePoints.length;
      nodeOfRoot.set(root, node);
      nodePoints.push([]);
    }
    nodePoints[node]?.push(point);
  }
  const nodeAt = (point: Point): number | undefined => {
    const key = pointKey(point);
    return groups.keys().includes(key)
      ? nodeOfRoot.get(groups.find(key))
      : undefined;
  };
  const node = (point: Point): number => nodeAt(point) ?? 0;

  const problem = simulationProblem(circuit);
  if (problem) return { ok: false, error: problem };
  const firstSource = circuit.elements.find((element) => element.kind === "V");
  const groundPoint =
    circuit.grounds[0] ?? firstSource?.from ?? circuit.elements[0]?.from;
  const ground = groundPoint ? node(groundPoint) : 0;
  // Every ground symbol is the same node.
  for (const point of circuit.grounds.slice(1))
    if (node(point) !== ground)
      return {
        ok: false,
        error:
          "Ground symbols must all be on the same node (join them with a wire).",
      };

  const count = nodePoints.length;
  const index = (n: number): number => (n < ground ? n : n - 1); // ground has no row
  const value = (element: CircuitElement) =>
    values[element.name] ?? element.value;
  // A closed switch is a short circuit, like an inductor at DC.
  const branches = circuit.elements.filter(
    (element) =>
      element.kind === "V" ||
      element.kind === "L" ||
      (element.kind === "S" && element.value === 1),
  );
  const size = count - 1 + branches.length;
  if (size <= 0)
    return { ok: false, error: "The circuit has nothing to solve." };
  const matrix = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  );
  const rhs = new Array<number>(size).fill(0);
  const add = (row: number, col: number, amount: number) => {
    const target = matrix[row];
    if (target) target[col] = (target[col] ?? 0) + amount;
  };

  for (let n = 0; n < count; n += 1)
    if (n !== ground) add(index(n), index(n), GMIN);

  for (const element of circuit.elements) {
    const a = node(element.from);
    const b = node(element.to);
    if (element.kind === "R") {
      const g = 1 / value(element);
      if (a !== ground) add(index(a), index(a), g);
      if (b !== ground) add(index(b), index(b), g);
      if (a !== ground && b !== ground) {
        add(index(a), index(b), -g);
        add(index(b), index(a), -g);
      }
    } else if (element.kind === "I") {
      // Flows from the first point to the second through the source.
      const current = value(element);
      if (a !== ground) rhs[index(a)] = (rhs[index(a)] ?? 0) - current;
      if (b !== ground) rhs[index(b)] = (rhs[index(b)] ?? 0) + current;
    }
  }
  branches.forEach((element, k) => {
    const row = count - 1 + k;
    // + terminal is the second point: V(to) − V(from) = value (0 for an inductor).
    const plus = node(element.to);
    const minus = node(element.from);
    if (plus !== ground) {
      add(index(plus), row, 1);
      add(row, index(plus), 1);
    }
    if (minus !== ground) {
      add(index(minus), row, -1);
      add(row, index(minus), -1);
    }
    rhs[row] = element.kind === "V" ? value(element) : 0;
  });

  const x = solveLinear(matrix, rhs);
  if (!x || x.some((v) => !Number.isFinite(v)))
    return {
      ok: false,
      error:
        "The circuit has no single solution: look for voltage sources (or inductors) in a loop, or current sources in series with nothing else.",
    };

  const voltages = Array.from({ length: count }, (_, n) =>
    n === ground ? 0 : (x[index(n)] ?? 0),
  );
  const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const elements: ElementResult[] = circuit.elements.map((element) => {
    const voltage =
      (voltages[node(element.from)] ?? 0) - (voltages[node(element.to)] ?? 0);
    let current = 0;
    if (element.kind === "R") current = voltage / value(element);
    else if (element.kind === "I") current = value(element);
    else if (branches.includes(element))
      current = -(x[count - 1 + branches.indexOf(element)] ?? 0);
    return {
      name: element.name,
      voltage: clean(voltage),
      current: clean(current),
      power: clean(voltage * current),
    };
  });
  return {
    ok: true,
    solution: {
      nodeAt,
      voltages: voltages.map(clean),
      ground,
      elements,
      nodePoints,
    },
  };
}
