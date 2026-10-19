/**
 * `::: pv`: p–V diagrams for thermodynamics. States are points (`1: V 10, p 400`),
 * processes join them (`1 -> 2: isothermal`) and are drawn from their equations
 * (pV = const, pV^γ = const), so a curve can't be sketched wrong: a path whose end
 * states don't fit its process is an error. The work can be shaded under a path or
 * inside a cycle. Plain SVG: no JavaScript.
 */
import type { BlockComponent } from "@trilleo/wiki";
import { formatNumber } from "../units";
import { STUDY_SET, nextNumber } from "./shared";

const WIDTH = 360;
const HEIGHT = 250;
const LEFT = 46;
const RIGHT = WIDTH - 22;
const TOP = 20;
const BOTTOM = HEIGHT - 32;
const SAMPLES = 48;
/** How far end states may be from a process's equation (rounded slide values). */
const FIT = 0.03;

const PROCESSES = {
  line: "straight line",
  isobaric: "isobaric",
  isochoric: "isochoric",
  isothermal: "isothermal",
  adiabatic: "adiabatic",
} as const;
type Process = keyof typeof PROCESSES;

interface State {
  name: string;
  x: number;
  y: number;
}

interface Path {
  from: State;
  to: State;
  process: Process;
  dashed: boolean;
  points: [number, number][];
}

interface Axis {
  name: string;
  unit: string;
}

class PvError extends Error {}

function readAxis(text: string): Axis {
  const match =
    /^\s*([\p{L}][\p{L}\p{N}_]{0,3})\s*(?:\(([^()]{1,12})\))?\s*$/u.exec(text);
  if (!match?.[1])
    throw new PvError(
      `“${text.trim()}” isn't an axis (a name and a unit, like V (L)).`,
    );
  return { name: match[1], unit: match[2]?.trim() ?? "" };
}

function readNumber(text: string, what: string): number {
  const value = Number(text.trim().replace(/−/g, "-").replace(/×10\^/, "e"));
  if (!Number.isFinite(value) || value < 0)
    throw new PvError(
      `${what} needs a number of 0 or more, not “${text.trim()}”.`,
    );
  return value;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= FIT * Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

/** The points of a process from one state to the other, in data units. */
function trace(
  from: State,
  to: State,
  process: Process,
  gamma: number,
): [number, number][] {
  if (process === "line" || process === "isobaric" || process === "isochoric")
    return [
      [from.x, from.y],
      [to.x, to.y],
    ];
  const exponent = process === "isothermal" ? 1 : gamma;
  const constant = from.y * from.x ** exponent;
  const points: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const x = from.x + ((to.x - from.x) * i) / SAMPLES;
    points.push([x, constant / x ** exponent]);
  }
  // End exactly on the state as written (it may be rounded).
  points[points.length - 1] = [to.x, to.y];
  return points;
}

/** Why a process can't join two states, or null when it can. */
function misfit(
  from: State,
  to: State,
  process: Process,
  gamma: number,
  axes: [Axis, Axis],
): string | null {
  const label = `${from.name} -> ${to.name}`;
  const [x, y] = axes;
  if (process === "line") return null;
  if (process === "isobaric")
    return close(from.y, to.y)
      ? null
      : `${label} isn't isobaric: ${y.name} changes from ${formatNumber(from.y)} to ${formatNumber(to.y)}.`;
  if (process === "isochoric")
    return close(from.x, to.x)
      ? null
      : `${label} isn't isochoric: ${x.name} changes from ${formatNumber(from.x)} to ${formatNumber(to.x)}.`;
  if (from.x <= 0 || to.x <= 0)
    return `${label}: an ${process} process needs ${x.name} above 0.`;
  if (close(from.x, to.x))
    return `${label}: an ${process} process needs ${x.name} to change.`;
  const exponent = process === "isothermal" ? 1 : gamma;
  const a = from.y * from.x ** exponent;
  const b = to.y * to.x ** exponent;
  if (close(a, b)) return null;
  const product =
    process === "isothermal" ? `${y.name}${x.name}` : `${y.name}${x.name}^γ`;
  return `${label} isn't ${process}: ${product} is ${formatNumber(a)} at ${from.name} but ${formatNumber(b)} at ${to.name}.`;
}

/** Tick values: the states' coordinates, one per distinct value. */
function ticks(values: number[]): number[] {
  const sorted = [...values].filter((value) => value > 0).sort((a, b) => a - b);
  return sorted.filter(
    (value, i) => i === 0 || !close(value, sorted[i - 1] ?? NaN),
  );
}

function svgNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

const pv: BlockComponent = {
  kind: "block",
  name: "pv",
  set: STUDY_SET,
  summary:
    "p–V diagrams: states as points, processes (isobaric, isochoric, isothermal, adiabatic, straight) drawn from their equations, work shaded under a path or inside a cycle.",
  example: `::: pv A cycle of 1 mol of air
axes: V (L), p (kPa)
gamma: 1.4
1: V 10, p 300
2: V 20, p 300
3: V 40, p 113.7
1 -> 2: isobaric
2 -> 3: adiabatic
3 -> 1: line
shade: cycle
:::`,
  notes: [
    "States: `name: V value, p value` (names up to 3 letters or digits; values in the axes' units, which only label the axes).",
    "Processes: `1 -> 2: isothermal` — line, isobaric, isochoric, isothermal, adiabatic (pV^γ = const, `gamma:` sets γ, 1.4 if left out). Add `dashed` for a reference curve without an arrow. The end states must fit the process (within 3%).",
    "`shade: cycle` shades the area inside the processes (listed round one loop); `shade: 1 -> 2` the area under one process. At most 2 shade lines.",
    "`axes: V (L), p (kPa)` names the axes; other axes (`axes: S, T`) allow only straight lines. `ticks: none` hides the values on the axes.",
  ],
  render({ argument, body }, context) {
    try {
      let axes: [Axis, Axis] = [
        { name: "V", unit: "" },
        { name: "p", unit: "" },
      ];
      let gamma = 1.4;
      let showTicks = true;
      const states = new Map<string, State>();
      const pending: {
        from: string;
        to: string;
        process: Process;
        dashed: boolean;
      }[] = [];
      const shades: string[] = [];
      for (const raw of body.split("\n")) {
        const line = raw.trim();
        if (line === "" || line.startsWith("#")) continue;
        const field = /^(axes|gamma|γ|ticks|shade):\s*(.*)$/u.exec(line);
        if (field) {
          const value = field[2] ?? "";
          if (field[1] === "axes") {
            const parts = value.split(",");
            if (parts.length !== 2)
              throw new PvError("axes: takes two axes, like V (L), p (kPa).");
            axes = [readAxis(parts[0] ?? ""), readAxis(parts[1] ?? "")];
          } else if (field[1] === "ticks") {
            if (value !== "none" && value !== "values")
              throw new PvError("ticks: is none or values.");
            showTicks = value === "values";
          } else if (field[1] === "shade") {
            shades.push(value.trim());
          } else {
            gamma = readNumber(value, "gamma:");
            if (gamma <= 1)
              throw new PvError("gamma: is above 1 (5/3, 1.4, 1.33).");
          }
          continue;
        }
        const path =
          /^(\w{1,3})\s*->\s*(\w{1,3})\s*:\s*(\w+)(\s+dashed)?\s*$/u.exec(line);
        if (path) {
          const process = path[3] as Process;
          if (!(process in PROCESSES))
            throw new PvError(
              `“${path[3] ?? ""}” isn't a process (${Object.keys(PROCESSES).join(", ")}).`,
            );
          pending.push({
            from: path[1] ?? "",
            to: path[2] ?? "",
            process,
            dashed: Boolean(path[4]),
          });
          continue;
        }
        const state = /^(\w{1,3})\s*:\s*(.+)$/u.exec(line);
        if (state) {
          const name = state[1] ?? "";
          const coordinates = new Map<string, number>();
          for (const part of (state[2] ?? "").split(",")) {
            const pair = /^\s*([\p{L}][\p{L}\p{N}_]*)\s*=?\s*(\S+)\s*$/u.exec(
              part,
            );
            if (!pair?.[1] || !pair[2])
              throw new PvError(
                `“${line}”: write a state as ${name}: ${axes[0].name} 10, ${axes[1].name} 300.`,
              );
            coordinates.set(
              pair[1],
              readNumber(pair[2], `${name}'s ${pair[1]}`),
            );
          }
          const x = coordinates.get(axes[0].name);
          const y = coordinates.get(axes[1].name);
          if (x === undefined || y === undefined || coordinates.size !== 2)
            throw new PvError(
              `State ${name} needs ${axes[0].name} and ${axes[1].name} (and nothing else).`,
            );
          if (states.has(name))
            throw new PvError(`State ${name} is given twice.`);
          states.set(name, { name, x, y });
          continue;
        }
        throw new PvError(
          `“${line}” isn't part of a p–V diagram (a state 1: V 10, p 300; a process 1 -> 2: isothermal; shade:, axes:, gamma:, ticks:).`,
        );
      }
      if (states.size === 0)
        throw new PvError("Give at least one state: 1: V 10, p 300.");
      if (states.size > 12)
        throw new PvError("A p–V diagram has at most 12 states.");
      if (shades.length > 2)
        throw new PvError("A p–V diagram has at most 2 shade lines.");
      const pressureVolume = axes[0].name === "V" && axes[1].name === "p";
      const paths: Path[] = pending.map(({ from, to, process, dashed }) => {
        const start = states.get(from);
        const end = states.get(to);
        if (!start || !end)
          throw new PvError(`${from} -> ${to} uses a state that isn't given.`);
        if (!pressureVolume && process !== "line")
          throw new PvError(
            `${process} curves need axes V and p; on ${axes[0].name}–${axes[1].name} axes use line.`,
          );
        const problem = misfit(start, end, process, gamma, axes);
        if (problem) throw new PvError(problem);
        return {
          from: start,
          to: end,
          process,
          dashed,
          points: trace(start, end, process, gamma),
        };
      });

      // Scales: from 0, with room above the largest values.
      const all = paths
        .flatMap((path) => path.points)
        .concat([...states.values()].map((s): [number, number] => [s.x, s.y]));
      const maxX = Math.max(...all.map(([x]) => x)) * 1.12 || 1;
      const maxY = Math.max(...all.map(([, y]) => y)) * 1.15 || 1;
      const sx = (x: number) => LEFT + (x / maxX) * (RIGHT - LEFT);
      const sy = (y: number) => BOTTOM - (y / maxY) * (BOTTOM - TOP);
      const screen = (points: [number, number][]) =>
        points
          .map(([x, y]) => `${svgNumber(sx(x))},${svgNumber(sy(y))}`)
          .join(" ");

      const shaded: string[] = [];
      const shadeWords: string[] = [];
      shades.forEach((shade, index) => {
        if (shade === "cycle") {
          const solid = paths.filter((path) => !path.dashed);
          const loop =
            solid.length > 1 &&
            solid.every(
              (path, i) => path.to === (solid[i + 1] ?? solid[0])?.from,
            );
          if (!loop)
            throw new PvError(
              "shade: cycle needs the processes listed in order round one loop (1 -> 2, 2 -> 3, 3 -> 1).",
            );
          shaded.push(
            `<polygon class="pv-shade pv-shade-${String(index)}" points="${screen(solid.flatMap((path) => path.points))}"/>`,
          );
          shadeWords.push("The area inside the cycle is shaded");
          return;
        }
        const match = /^(\w{1,3})\s*->\s*(\w{1,3})$/u.exec(shade);
        const path =
          match &&
          paths.find(
            (p) =>
              (p.from.name === match[1] && p.to.name === match[2]) ||
              (p.from.name === match[2] && p.to.name === match[1]),
          );
        if (!path)
          throw new PvError(
            `shade: “${shade}” isn't cycle or one of the processes (1 -> 2).`,
          );
        const under: [number, number][] = [
          ...path.points,
          [path.to.x, 0],
          [path.from.x, 0],
        ];
        shaded.push(
          `<polygon class="pv-shade pv-shade-${String(index)}" points="${screen(under)}"/>`,
        );
        shadeWords.push(
          `The area under ${path.from.name} → ${path.to.name} is shaded`,
        );
      });

      const curves = paths.map((path) => {
        const line = `<polyline class="pv-path${path.dashed ? " pv-dashed" : ""}" points="${screen(path.points)}"/>`;
        if (path.dashed) return line;
        // An arrowhead halfway along, pointing the way the process goes.
        const pixels = path.points.map(([x, y]): [number, number] => [
          sx(x),
          sy(y),
        ]);
        const lengths = [0];
        for (let i = 1; i < pixels.length; i += 1) {
          const [ax, ay] = pixels[i - 1] ?? [0, 0];
          const [bx, by] = pixels[i] ?? [0, 0];
          lengths.push((lengths[i - 1] ?? 0) + Math.hypot(bx - ax, by - ay));
        }
        const half = (lengths[lengths.length - 1] ?? 0) / 2;
        const i = Math.max(
          1,
          lengths.findIndex((length) => length >= half),
        );
        const [ax, ay] = pixels[i - 1] ?? [0, 0];
        const [bx, by] = pixels[i] ?? [0, 0];
        const segment = (lengths[i] ?? 0) - (lengths[i - 1] ?? 0) || 1;
        const t = (half - (lengths[i - 1] ?? 0)) / segment;
        const mx = ax + (bx - ax) * t;
        const my = ay + (by - ay) * t;
        const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
        return `${line}<polygon class="pv-arrow" points="5,0 -4,-4 -4,4" transform="translate(${svgNumber(mx)} ${svgNumber(my)}) rotate(${svgNumber(angle)})"/>`;
      });

      // Guides and values on the axes for each state.
      const list = [...states.values()];
      const guides = showTicks
        ? list
            .map(
              (s) =>
                `<polyline class="pv-guide" points="${svgNumber(sx(0))},${svgNumber(sy(s.y))} ${svgNumber(sx(s.x))},${svgNumber(sy(s.y))} ${svgNumber(sx(s.x))},${svgNumber(sy(0))}"/>`,
            )
            .join("")
        : "";
      const tickText: string[] = [];
      if (showTicks) {
        let last = -Infinity;
        for (const x of ticks(list.map((s) => s.x))) {
          if (sx(x) - last < 26) continue;
          last = sx(x);
          tickText.push(
            `<text class="pv-tick" x="${svgNumber(sx(x))}" y="${String(BOTTOM + 15)}" text-anchor="middle">${formatNumber(x)}</text>`,
          );
        }
        last = Infinity;
        for (const y of ticks(list.map((s) => s.y))) {
          if (last - sy(y) < 12) continue;
          last = sy(y);
          tickText.push(
            `<text class="pv-tick" x="${String(LEFT - 5)}" y="${svgNumber(sy(y) + 4)}" text-anchor="end">${formatNumber(y)}</text>`,
          );
        }
      }

      // State labels sit away from the middle of the diagram.
      const cx = list.reduce((sum, s) => sum + sx(s.x), 0) / list.length;
      const cy = list.reduce((sum, s) => sum + sy(s.y), 0) / list.length;
      const points = list
        .map((s) => {
          const x = sx(s.x);
          const y = sy(s.y);
          const dx = x - cx;
          const dy = y - cy;
          const size = Math.hypot(dx, dy) || 1;
          const lx = list.length === 1 ? x + 8 : x + (dx / size) * 12;
          const ly = list.length === 1 ? y - 8 : y + (dy / size) * 12 + 5;
          const anchor =
            list.length === 1 || dx > 4 ? "start" : dx < -4 ? "end" : "middle";
          return `<circle class="pv-state" cx="${svgNumber(x)}" cy="${svgNumber(y)}" r="3"/><text class="pv-label" x="${svgNumber(lx)}" y="${svgNumber(ly)}" text-anchor="${anchor}">${context.escape(s.name)}</text>`;
        })
        .join("");

      const axisLabel = (axis: Axis) =>
        `<tspan class="pv-axis-name">${context.escape(axis.name)}</tspan>${axis.unit ? ` (${context.escape(axis.unit)})` : ""}`;
      const frame = `<polyline class="pv-axis" points="${String(LEFT)},${String(TOP - 8)} ${String(LEFT)},${String(BOTTOM)} ${String(RIGHT + 8)},${String(BOTTOM)}"/><polygon class="pv-axis-head" points="${String(LEFT)},${String(TOP - 14)} ${String(LEFT - 4)},${String(TOP - 5)} ${String(LEFT + 4)},${String(TOP - 5)}"/><polygon class="pv-axis-head" points="${String(RIGHT + 14)},${String(BOTTOM)} ${String(RIGHT + 5)},${String(BOTTOM - 4)} ${String(RIGHT + 5)},${String(BOTTOM + 4)}"/><text class="pv-axis-label" x="${String(LEFT + 8)}" y="${String(TOP - 6)}">${axisLabel(axes[1])}</text><text class="pv-axis-label" x="${String(RIGHT + 12)}" y="${String(BOTTOM + 26)}" text-anchor="end">${axisLabel(axes[0])}</text><text class="pv-tick" x="${String(LEFT - 6)}" y="${String(BOTTOM + 14)}" text-anchor="end">O</text>`;

      const described = [
        `${axes[1].name}–${axes[0].name} diagram.`,
        list
          .map(
            (s) =>
              `${s.name}: ${axes[0].name} ${formatNumber(s.x)}, ${axes[1].name} ${formatNumber(s.y)}`,
          )
          .join("; ") + ".",
        paths.length > 0
          ? paths
              .map(
                (p) =>
                  `${p.from.name} → ${p.to.name} ${PROCESSES[p.process]}${p.dashed ? " (dashed reference)" : ""}`,
              )
              .join("; ") + "."
          : "",
        shadeWords.length > 0 ? `${shadeWords.join("; ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const number = nextNumber(context, "figure");
      const title = argument.trim();
      return `<figure class="study-figure study-pv"><svg class="study-pv-svg" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" role="img" aria-label="${context.escape(described)}">${shaded.join("")}${guides}${frame}${tickText.join("")}${curves.join("")}${points}</svg><figcaption><span class="study-box-kind">Figure ${number}</span> ${title ? context.inline(title) : "p–V diagram"}</figcaption></figure>\n`;
    } catch (error) {
      if (error instanceof PvError) return context.error(error.message);
      throw error;
    }
  },
};

export const THERMO_COMPONENTS = [pv] as const;
