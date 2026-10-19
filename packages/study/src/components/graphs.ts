/**
 * Graph theory and orders in plain SVG (no JavaScript):
 * - `::: graph`: vertices and edges (undirected `a -- b`, directed `a -> b`, loops,
 *   parallel edges, weights), laid out on a circle, in rows (bipartite graphs, relation
 *   diagrams from A to B) or at given points, with a highlighted walk and an optional
 *   list of degrees worked out from the edges.
 * - `::: hasse`: Hasse diagrams of a partial order given as divisibility, subsets of a
 *   set, or pairs `a < b`; the order is checked (no cycles), its covering pairs are
 *   worked out and drawn level by level, so a diagram can't be drawn wrong.
 */
import type { BlockComponent, RenderContext } from "@trilleo/wiki";
import { STUDY_SET, nextNumber } from "./shared";

const WIDTH = 360;
const HEIGHT = 260;
const PAD = 30;
const RADIUS = 12;
const NAME = /^[\p{L}\p{N}_'′₀-₉]{1,6}$/u;

class GraphError extends Error {}

/** `label s1: {a}` shows an element or vertex under another text (sets, ∅). */
function readLabel(line: string): [string, string] | null {
  const match = /^label\s+(\S+)\s*:\s*(.+)$/u.exec(line);
  if (!match?.[1] || !match[2]) return null;
  const text = match[2].trim();
  if (text.length > 12)
    throw new GraphError(
      `label ${match[1]}: “${text}” is longer than 12 characters.`,
    );
  return [match[1], text];
}

function num(value: number): string {
  return String(Math.round(value * 10) / 10);
}

interface Edge {
  from: string;
  to: string;
  directed: boolean;
  label: string;
  /** Index among the edges joining the same two vertices (for curving them apart). */
  bundle: number;
  bundleSize: number;
}

interface Point {
  x: number;
  y: number;
}

/** Positions on a circle, the first vertex at the top, going clockwise. */
function circleLayout(names: readonly string[]): Map<string, Point> {
  const result = new Map<string, Point>();
  const r = Math.min(WIDTH, HEIGHT) / 2 - PAD - 8;
  names.forEach((name, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / names.length;
    result.set(name, {
      x: WIDTH / 2 + (names.length === 1 ? 0 : r * Math.cos(angle)),
      y: HEIGHT / 2 + (names.length === 1 ? 0 : r * Math.sin(angle)),
    });
  });
  return result;
}

/** Rows from top to bottom, each spread evenly across the width. */
function rowsLayout(rows: readonly (readonly string[])[]): Map<string, Point> {
  const result = new Map<string, Point>();
  rows.forEach((row, r) => {
    const y =
      rows.length === 1
        ? HEIGHT / 2
        : PAD + 6 + ((HEIGHT - 2 * PAD - 12) * r) / (rows.length - 1);
    row.forEach((name, i) => {
      const x = PAD + 10 + ((WIDTH - 2 * PAD - 20) * (i + 0.5)) / row.length;
      result.set(name, { x, y });
    });
  });
  return result;
}

/** Where a line from a vertex towards another leaves the vertex's circle. */
function rim(from: Point, to: Point, gap = RADIUS): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * gap, y: from.y + (dy / length) * gap };
}

function arrowHead(tip: Point, angle: number): string {
  const back = 9;
  const half = 4;
  const ax = tip.x - back * Math.cos(angle);
  const ay = tip.y - back * Math.sin(angle);
  const px = -Math.sin(angle) * half;
  const py = Math.cos(angle) * half;
  return `<polygon class="graph-arrow" points="${num(tip.x)},${num(tip.y)} ${num(ax + px)},${num(ay + py)} ${num(ax - px)},${num(ay - py)}"/>`;
}

function drawEdge(
  edge: Edge,
  points: Map<string, Point>,
  centre: Point,
  highlighted: boolean,
  escape: (text: string) => string,
): string {
  const a = points.get(edge.from);
  const b = points.get(edge.to);
  if (!a || !b) return "";
  const cls = `graph-edge${highlighted ? " graph-edge-on" : ""}`;
  if (edge.from === edge.to) {
    // A loop: a small circle outside the vertex, away from the middle.
    const dx = a.x - centre.x;
    const dy = a.y - centre.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = length < 1 ? 0 : dx / length;
    const uy = length < 1 ? -1 : dy / length;
    const size = 11 + 6 * edge.bundle;
    const cx = a.x + ux * (RADIUS + size - 4);
    const cy = a.y + uy * (RADIUS + size - 4);
    let out = `<circle class="${cls}" cx="${num(cx)}" cy="${num(cy)}" r="${num(size)}"/>`;
    if (edge.directed) {
      // An arrowhead at the far side of the loop, pointing round it.
      const angle = Math.atan2(uy, ux);
      const tip = { x: cx + ux * size, y: cy + uy * size };
      out += arrowHead(tip, angle + Math.PI / 2);
    }
    if (edge.label)
      out += `<text class="graph-weight" x="${num(cx + ux * (size + 9))}" y="${num(cy + uy * (size + 9) + 4)}" text-anchor="middle">${escape(edge.label)}</text>`;
    return out;
  }
  // Parallel edges bow out to either side of the straight line.
  const offset = (edge.bundle - (edge.bundleSize - 1) / 2) * 22;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  // Normal pointing the same way for a→b and b→a, so their bows don't overlap.
  const flip = edge.from < edge.to ? 1 : -1;
  const nx = (-dy / length) * flip;
  const ny = (dx / length) * flip;
  const control = { x: mx + nx * offset * 2, y: my + ny * offset * 2 };
  const start = rim(a, offset === 0 ? b : control);
  const end = rim(
    b,
    offset === 0 ? a : control,
    edge.directed ? RADIUS + 1 : RADIUS,
  );
  let out =
    offset === 0
      ? `<line class="${cls}" x1="${num(start.x)}" y1="${num(start.y)}" x2="${num(end.x)}" y2="${num(end.y)}"/>`
      : `<path class="${cls}" d="M${num(start.x)} ${num(start.y)} Q${num(control.x)} ${num(control.y)} ${num(end.x)} ${num(end.y)}"/>`;
  if (edge.directed) {
    const from = offset === 0 ? start : control;
    out += arrowHead(end, Math.atan2(end.y - from.y, end.x - from.x));
  }
  if (edge.label) {
    // The label sits beside the edge's middle, on its outer side.
    const lx = mx + nx * (offset + (offset >= 0 ? 10 : -10));
    const ly = my + ny * (offset + (offset >= 0 ? 10 : -10));
    out += `<text class="graph-weight" x="${num(lx)}" y="${num(ly + 4)}" text-anchor="middle">${escape(edge.label)}</text>`;
  }
  return out;
}

function drawVertices(
  points: Map<string, Point>,
  on: ReadonlySet<string>,
  escape: (text: string) => string,
  labels?: ReadonlyMap<string, string>,
): string {
  return [...points]
    .map(([name, p]) => {
      const text = labels?.get(name) ?? name;
      const wide = text.length > 2;
      const shape = wide
        ? `<rect class="graph-vertex${on.has(name) ? " graph-vertex-on" : ""}" x="${num(p.x - text.length * 4 - 5)}" y="${num(p.y - RADIUS)}" width="${num(text.length * 8 + 10)}" height="${String(RADIUS * 2)}" rx="${String(RADIUS)}"/>`
        : `<circle class="graph-vertex${on.has(name) ? " graph-vertex-on" : ""}" cx="${num(p.x)}" cy="${num(p.y)}" r="${String(RADIUS)}"/>`;
      return `${shape}<text class="graph-label" x="${num(p.x)}" y="${num(p.y + 5)}" text-anchor="middle">${escape(text)}</text>`;
    })
    .join("");
}

function figure(
  context: RenderContext,
  kind: string,
  title: string,
  label: string,
  svg: string,
  note: string,
): string {
  const number = nextNumber(context, "figure");
  return `<figure class="study-figure study-graph"><svg class="study-graph-svg" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" role="img" aria-label="${context.escape(label)}">${svg}</svg>${note}<figcaption><span class="study-box-kind">Figure ${number}</span> ${title ? context.inline(title) : kind}</figcaption></figure>\n`;
}

const graph: BlockComponent = {
  kind: "block",
  name: "graph",
  set: STUDY_SET,
  summary:
    "Graphs and relation diagrams: edges a -- b or a -> b (loops, parallel edges, weights), laid out on a circle, in rows or at points, with a highlighted walk and degrees.",
  example: `::: graph A walk in a simple graph
a -- b, b -- c, c -- d, d -- a, a -- c
highlight: a b c d
show: degrees
:::`,
  notes: [
    "Edges, several to a line: `a -- b` (undirected), `a -> b` (directed), `a -- a` (a loop), a repeated edge is a parallel edge, `a -- b: 5` gives it a weight or label. Vertex names: up to 6 letters or digits.",
    "`vertices: a b c d e` lists the vertices in order (isolated ones too); otherwise they come from the edges.",
    "Layouts: on a circle by default; `row: a b c` lines put vertices in rows from top to bottom (two rows draw a bipartite graph or a relation from A to B); `at a: 40, 120` places one at a point (0–360 across, 0–260 down).",
    "`label m1: −1` shows a vertex under another text (sets like {a,b}, ∅, negative numbers; up to 12 characters). `highlight: a b c d` marks a walk (its vertices and the edges between consecutive ones); `show: degrees` lists each vertex's degree (in- and out-degree for directed graphs), worked out from the edges.",
  ],
  render({ argument, body }, context) {
    try {
      const order: string[] = [];
      const addVertex = (name: string) => {
        if (!NAME.test(name))
          throw new GraphError(
            `“${name}” isn't a vertex name (up to 6 letters or digits).`,
          );
        if (!order.includes(name)) order.push(name);
      };
      const raw: {
        from: string;
        to: string;
        directed: boolean;
        label: string;
      }[] = [];
      const rows: string[][] = [];
      const fixed = new Map<string, Point>();
      let highlight: string[] = [];
      let showDegrees = false;
      const shown = new Map<string, string>();
      for (const line of body.split("\n").map((l) => l.trim())) {
        if (line === "" || line.startsWith("#")) continue;
        const named = readLabel(line);
        if (named) {
          shown.set(named[0], named[1]);
          continue;
        }
        const field = /^(vertices|row|highlight|show):\s*(.*)$/u.exec(line);
        if (field) {
          const words = (field[2] ?? "").split(/[\s,]+/u).filter(Boolean);
          if (field[1] === "vertices") words.forEach(addVertex);
          else if (field[1] === "row") {
            words.forEach(addVertex);
            rows.push(words);
          } else if (field[1] === "highlight") highlight = words;
          else if (words.join(" ") === "degrees") showDegrees = true;
          else throw new GraphError("show: takes degrees.");
          continue;
        }
        const at = /^at\s+(\S+)\s*:\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$/u.exec(line);
        if (at) {
          addVertex(at[1] ?? "");
          fixed.set(at[1] ?? "", { x: Number(at[2]), y: Number(at[3]) });
          continue;
        }
        for (const part of line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)) {
          const edge = /^(\S+)\s*(--|->|<-)\s*(\S+?)(?:\s*:\s*(.+))?$/u.exec(
            part,
          );
          if (!edge)
            throw new GraphError(
              `“${part}” isn't an edge (a -- b, a -> b, a -- b: 5) or a field (vertices:, row:, at a: x, y, highlight:, show:).`,
            );
          const [, left = "", op, right = "", label = ""] = edge;
          addVertex(left);
          addVertex(right);
          raw.push(
            op === "<-"
              ? { from: right, to: left, directed: true, label: label.trim() }
              : {
                  from: left,
                  to: right,
                  directed: op === "->",
                  label: label.trim(),
                },
          );
        }
      }
      if (order.length === 0)
        throw new GraphError("Give some edges: a -- b, b -- c.");
      if (order.length > 16)
        throw new GraphError("A graph has at most 16 vertices.");
      if (raw.length > 40)
        throw new GraphError("A graph has at most 40 edges.");
      if (rows.length > 0 && fixed.size > 0)
        throw new GraphError("Use either row: lines or at: points, not both.");
      const unplaced = order.filter(
        (name) =>
          (rows.length > 0 && !rows.some((row) => row.includes(name))) ||
          (fixed.size > 0 && !fixed.has(name)),
      );
      if (unplaced.length > 0)
        throw new GraphError(
          `${unplaced.join(", ")} has no place: give every vertex a row (or a point).`,
        );
      for (const p of fixed.values())
        if (p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT)
          throw new GraphError(
            "Points go from 0 to 360 across and 0 to 260 down.",
          );
      const strays = [...shown.keys()].filter((name) => !order.includes(name));
      if (strays.length > 0)
        throw new GraphError(`label ${strays.join(", ")}: isn't a vertex.`);
      const missing = highlight.filter((name) => !order.includes(name));
      if (missing.length > 0)
        throw new GraphError(
          `highlight: ${missing.join(", ")} isn't a vertex.`,
        );

      // Group parallel edges (either direction) so they can bow apart.
      const key = (e: { from: string; to: string }) =>
        [e.from, e.to].sort().join("\u0000");
      const groups = new Map<string, number>();
      for (const e of raw) groups.set(key(e), (groups.get(key(e)) ?? 0) + 1);
      const seen = new Map<string, number>();
      const edges: Edge[] = raw.map((e) => {
        const k = key(e);
        const index = seen.get(k) ?? 0;
        seen.set(k, index + 1);
        const size = groups.get(k) ?? 1;
        // A loop's bundle index grows its circle; others centre the bundle.
        return { ...e, bundle: index, bundleSize: e.from === e.to ? 1 : size };
      });

      const points =
        fixed.size > 0
          ? fixed
          : rows.length > 0
            ? rowsLayout(rows)
            : circleLayout(order);
      const centre = { x: WIDTH / 2, y: HEIGHT / 2 };
      const walk = new Set<string>();
      for (let i = 1; i < highlight.length; i += 1)
        walk.add(`${highlight[i - 1] ?? ""}\u0000${highlight[i] ?? ""}`);
      const used = new Set<number>();
      const lines = edges.map((edge, index) => {
        const forward = walk.has(`${edge.from}\u0000${edge.to}`);
        const backward =
          !edge.directed && walk.has(`${edge.to}\u0000${edge.from}`);
        // Each step of the walk marks one edge, so a walk can use parallel edges.
        const on = (forward || backward) && !used.has(index);
        if (on) {
          used.add(index);
          walk.delete(
            forward
              ? `${edge.from}\u0000${edge.to}`
              : `${edge.to}\u0000${edge.from}`,
          );
        }
        return drawEdge(edge, points, centre, on, (t) => context.escape(t));
      });
      const svg =
        lines.join("") +
        drawVertices(
          points,
          new Set(highlight),
          (t) => context.escape(t),
          shown,
        );

      const directed = edges.some((e) => e.directed);
      const degree = (name: string) => {
        let out = 0;
        let into = 0;
        let total = 0;
        for (const e of edges) {
          if (e.from === name) out += 1;
          if (e.to === name) into += 1;
          if (e.from === name) total += 1;
          if (e.to === name) total += 1;
        }
        return { out, into, total };
      };
      const degreeText = order
        .map((name) => {
          const d = degree(name);
          return directed && edges.every((e) => e.directed)
            ? `${name}: ${String(d.out)} out, ${String(d.into)} in`
            : `${name}: ${String(d.total)}`;
        })
        .join("; ");
      const note = showDegrees
        ? `<p class="study-figure-note">Degrees — ${context.escape(degreeText)}</p>`
        : "";
      const said = (name: string) => shown.get(name) ?? name;
      const describe = (e: Edge) =>
        `${said(e.from)} ${e.directed ? "→" : "–"} ${said(e.to)}${e.label ? ` (${e.label})` : ""}`;
      const label = [
        `${directed ? "Directed graph" : "Graph"} with vertices ${order.map(said).join(", ")}.`,
        edges.length > 0
          ? `Edges: ${edges.map(describe).join(", ")}.`
          : "No edges.",
        highlight.length > 1
          ? `Highlighted walk: ${highlight.map(said).join(" ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      return figure(context, "Graph", argument.trim(), label, svg, note);
    } catch (error) {
      if (error instanceof GraphError) return context.error(error.message);
      throw error;
    }
  },
};

/** The order as pairs (a, b) with a ≤ b, a ≠ b, from one of the ways of giving it. */
function readOrder(lines: readonly string[]): {
  elements: string[];
  less: Set<string>;
  labels: Map<string, string>;
} {
  const elements: string[] = [];
  const labels = new Map<string, string>();
  const less = new Set<string>();
  const pair = (a: string, b: string) => `${a}\u0000${b}`;
  const add = (name: string) => {
    if (!NAME.test(name))
      throw new GraphError(
        `“${name}” isn't an element name (up to 6 letters or digits).`,
      );
    if (!elements.includes(name)) elements.push(name);
  };
  let given = 0;
  for (const line of lines) {
    const field = /^(divides|subsets|order|elements):\s*(.*)$/u.exec(line);
    if (!field) {
      if (/^(highlight|mark):/u.test(line) || readLabel(line)) continue;
      throw new GraphError(
        `“${line}” isn't part of a Hasse diagram (divides: 1 2 3 6, subsets: a b c, order: a < b, b < c, elements:, highlight:).`,
      );
    }
    const value = field[2] ?? "";
    if (field[1] === "elements") {
      value
        .split(/[\s,]+/u)
        .filter(Boolean)
        .forEach(add);
      continue;
    }
    given += 1;
    if (field[1] === "divides") {
      const numbers = value.split(/[\s,]+/u).filter(Boolean);
      for (const n of numbers) {
        if (!/^[1-9]\d{0,5}$/u.test(n))
          throw new GraphError(
            `divides: takes positive whole numbers, not “${n}”.`,
          );
        add(n);
      }
      for (const a of numbers)
        for (const b of numbers)
          if (a !== b && Number(b) % Number(a) === 0) less.add(pair(a, b));
    } else if (field[1] === "subsets") {
      const base = value.split(/[\s,]+/u).filter(Boolean);
      if (base.length > 4)
        throw new GraphError("subsets: takes at most 4 elements (16 subsets).");
      const names: string[] = [];
      for (let mask = 0; mask < 1 << base.length; mask += 1) {
        const members = base.filter((_, i) => mask & (1 << i));
        const name = `s${String(mask)}`;
        names.push(name);
        elements.push(name);
        labels.set(name, members.length === 0 ? "∅" : `{${members.join(",")}}`);
      }
      for (let a = 0; a < names.length; a += 1)
        for (let b = 0; b < names.length; b += 1)
          if (a !== b && (a & b) === a)
            less.add(pair(names[a] ?? "", names[b] ?? ""));
    } else {
      for (const part of value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)) {
        const chain = part.split(/\s*[<≺]\s*/u);
        if (chain.length < 2)
          throw new GraphError(
            `“${part}” isn't a comparison (a < b, or a chain a < b < c).`,
          );
        chain.forEach(add);
        for (let i = 1; i < chain.length; i += 1)
          less.add(pair(chain[i - 1] ?? "", chain[i] ?? ""));
      }
    }
  }
  if (given !== 1)
    throw new GraphError("Give the order once: divides:, subsets: or order:.");
  // Close it transitively, and refuse cycles (a < b < a isn't a partial order).
  let grew = true;
  while (grew) {
    grew = false;
    for (const ab of [...less]) {
      const [a = "", b = ""] = ab.split("\u0000");
      for (const c of elements) {
        if (less.has(pair(b, c)) && !less.has(pair(a, c))) {
          if (a === c)
            throw new GraphError(
              `${a} < ${b} < ${a} goes round in a circle: that isn't a partial order.`,
            );
          less.add(pair(a, c));
          grew = true;
        }
      }
    }
  }
  return { elements, less, labels };
}

const hasse: BlockComponent = {
  kind: "block",
  name: "hasse",
  set: STUDY_SET,
  summary:
    "Hasse diagrams: the partial order as divisibility, the subsets of a set, or comparisons a < b; covering pairs and levels are worked out.",
  example: `::: hasse Divisibility on the divisors of 12
divides: 1 2 3 4 6 12
:::`,
  notes: [
    "Give the order one way: `divides: 1 2 3 4 6 12` (a ≼ b when a divides b), `subsets: a b c` (the power set under ⊆, up to 4 elements) or `order: a < b, b < c, a < d` (any comparisons or chains; the rest follow by transitivity, and a cycle is an error).",
    "`elements: e` adds elements that aren't compared with anything.",
    "`label s: {a}` shows an element under another text (up to 12 characters). `highlight: 2 6` marks elements (a subset whose bounds a question asks for, or the maximal elements).",
  ],
  render({ argument, body }, context) {
    try {
      const lines = body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "" && !l.startsWith("#"));
      const { elements, less, labels } = readOrder(lines);
      for (const line of lines) {
        const named = readLabel(line);
        if (!named) continue;
        if (!elements.includes(named[0]))
          throw new GraphError(`label ${named[0]}: isn't an element.`);
        labels.set(named[0], named[1]);
      }
      if (elements.length === 0)
        throw new GraphError("The order has no elements.");
      if (elements.length > 16)
        throw new GraphError("A Hasse diagram has at most 16 elements.");
      const pair = (a: string, b: string) => `${a}\u0000${b}`;
      // b covers a: a < b with nothing strictly between.
      const covers: [string, string][] = [];
      for (const ab of less) {
        const [a = "", b = ""] = ab.split("\u0000");
        if (!elements.some((c) => less.has(pair(a, c)) && less.has(pair(c, b))))
          covers.push([a, b]);
      }
      // Level: the length of the longest chain below an element.
      const level = new Map<string, number>();
      const depth = (x: string): number => {
        const known = level.get(x);
        if (known !== undefined) return known;
        const below = covers
          .filter(([, b]) => b === x)
          .map(([a]) => depth(a) + 1);
        const value = Math.max(0, ...below);
        level.set(x, value);
        return value;
      };
      elements.forEach(depth);
      const top = Math.max(...elements.map((x) => level.get(x) ?? 0));
      const rows: string[][] = Array.from({ length: top + 1 }, () => []);
      for (const x of elements) rows[level.get(x) ?? 0]?.push(x);
      // Fewer crossings: order each level by where its lower neighbours sit.
      const position = new Map<string, number>();
      rows.forEach((row, r) => {
        if (r > 0) {
          const weight = (x: string) => {
            const below = covers
              .filter(([, b]) => b === x)
              .map(([a]) => position.get(a) ?? 0.5);
            return below.length
              ? below.reduce((s, v) => s + v, 0) / below.length
              : 0.5;
          };
          row.sort((a, b) => weight(a) - weight(b));
        }
        row.forEach((x, i) => position.set(x, (i + 0.5) / row.length));
      });
      // Bottom level at the bottom.
      const points = rowsLayout([...rows].reverse());
      const highlightLine = lines.find((l) => /^(highlight|mark):/u.test(l));
      const words = highlightLine
        ? highlightLine
            .replace(/^(highlight|mark):/u, "")
            .split(/[\s,]+/u)
            .filter(Boolean)
        : [];
      const byLabel = new Map([...labels].map(([k, v]) => [v, k]));
      const marked = new Set(words.map((w) => byLabel.get(w) ?? w));
      const unknown = [...marked].filter((w) => !elements.includes(w));
      if (unknown.length > 0)
        throw new GraphError(
          `highlight: ${unknown.join(", ")} isn't an element.`,
        );
      const svg =
        covers
          .map(([a, b]) => {
            const p = points.get(a);
            const q = points.get(b);
            if (!p || !q) return "";
            const s = rim(p, q);
            const e = rim(q, p);
            return `<line class="graph-edge" x1="${num(s.x)}" y1="${num(s.y)}" x2="${num(e.x)}" y2="${num(e.y)}"/>`;
          })
          .join("") +
        drawVertices(points, marked, (t) => context.escape(t), labels);
      const name = (x: string) => labels.get(x) ?? x;
      const label = `Hasse diagram of ${elements.map(name).join(", ")}. Covering pairs (lower before higher): ${
        covers.length > 0
          ? covers.map(([a, b]) => `${name(a)} below ${name(b)}`).join(", ")
          : "none"
      }.${marked.size > 0 ? ` Marked: ${[...marked].map(name).join(", ")}.` : ""}`;
      return figure(context, "Hasse diagram", argument.trim(), label, svg, "");
    } catch (error) {
      if (error instanceof GraphError) return context.error(error.message);
      throw error;
    }
  },
};

export const GRAPH_COMPONENTS = [graph, hasse] as const;
