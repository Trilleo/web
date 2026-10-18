/**
 * What `::: plot` and `::: explore` bodies say. Parsed on the server (to report
 * mistakes while building) and again in the browser by the widgets, from the same
 * text, so nothing but the source travels to the page.
 *
 *   ::: plot Damped oscillation
 *   x: 0 .. 10
 *   y: -1.2 .. 1.2              (optional: fitted to the curves)
 *   xlabel: t (s)
 *   ylabel: x (m)
 *   f(t) = e^(-k t) cos(w t)
 *   g(t) = e^(-k t)
 *   slider k: 0 .. 1 = 0.2
 *   slider w: 0.5 .. 6 = 3 | rad/s | angular frequency     (a label after the unit)
 *   :::
 *
 *   ::: plot Binomial and its Poisson approximation
 *   x: 0 .. 12
 *   bars P(k) = comb(n, k) p^k (1 - p)^(n - k)     (drawn at whole numbers)
 *   bars Q(k) = e^(-n p) (n p)^k / k!
 *   slider n: 1 .. 50 = 20 | | step 1
 *   :::
 *
 *   ::: plot Where 0 < y < x < 1
 *   x: 0 .. 1.2
 *   y: 0 .. 1.2
 *   region G: 0 < y < x < 1                       (shaded; conditions joined by ,)
 *   f(x) = x
 *   :::
 *
 *   ::: explore Power in a resistor
 *   slider V: 0 .. 12 = 5 | V
 *   slider R: 1 .. 1k = 100 | Ω | log
 *   I = V / R | A | Current
 *   P = V I | W | Power
 *   :::
 */
import {
  evaluate,
  parseExpression,
  type Expression,
  type Scope,
} from "./expression";
import { parseQuantity } from "./units";

export interface Slider {
  name: string;
  min: number;
  max: number;
  value: number;
  unit: string;
  /** Moves on a log scale (values spanning decades: resistances, frequencies). */
  log: boolean;
  /** Snaps to multiples of this (whole numbers for n in a binomial: 1). */
  step?: number | null;
  /** What it stands for, shown beside its name ("prior trust"). */
  label?: string;
}

export interface Curve {
  name: string;
  source: string;
  expression: Expression;
  /** A line through the range, or bars at the whole numbers in it. */
  kind: "line" | "bars";
}

export type Comparison = "<" | "<=" | ">" | ">=";

/** A chain like 0 < y < x < 1: terms with a comparison between each pair. */
export interface Condition {
  terms: Expression[];
  comparisons: Comparison[];
}

/** A shaded set of points: every condition holds (in the plot's x and y). */
export interface Region {
  name: string;
  source: string;
  conditions: Condition[];
}

export interface PlotSpec {
  variable: string;
  x: [number, number];
  y: [number, number] | null;
  xLabel: string;
  yLabel: string;
  curves: Curve[];
  regions: Region[];
  sliders: Slider[];
}

export interface Output {
  name: string;
  source: string;
  expression: Expression;
  unit: string;
  label: string;
}

export interface ExploreSpec {
  sliders: Slider[];
  outputs: Output[];
}

export type Parsed<T> = { ok: true; spec: T } | { ok: false; errors: string[] };

const NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u;

/** A number, which may be written as maths ("2pi", "-1/2") or with a prefix ("1k"). */
function number(text: string): number | null {
  const trimmed = text.trim();
  const quantity = /^[+\-−]?[\d.]+(?:e[+\-−]?\d+)?\s*[pnuµμmkMG]?$/.test(
    trimmed,
  )
    ? parseQuantity(`${trimmed}V`)
    : null;
  if (quantity) return quantity.value;
  try {
    const value = evaluate(parseExpression(trimmed));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function range(text: string): [number, number] | null {
  const [low, high] = text.split("..").map((part) => number(part));
  return low != null && high != null && high > low ? [low, high] : null;
}

/** `slider a: 0 .. 3 = 1 | unit | log` */
function parseSlider(rest: string, errors: string[]): Slider | null {
  const colon = rest.indexOf(":");
  const name = rest.slice(0, colon).trim();
  if (colon < 1 || !NAME.test(name)) {
    errors.push(`“slider ${rest}”: write it as “slider a: 0 .. 3 = 1”.`);
    return null;
  }
  const [spec = "", unit = "", ...extras] = rest
    .slice(colon + 1)
    .split("|")
    .map((part) => part.trim());
  const [span = "", start = ""] = spec.split("=").map((part) => part.trim());
  const limits = range(span);
  if (!limits) {
    errors.push(`Slider ${name}: its range should look like “0 .. 3”.`);
    return null;
  }
  const value = start === "" ? (limits[0] + limits[1]) / 2 : number(start);
  if (value === null || value < limits[0] || value > limits[1]) {
    errors.push(
      `Slider ${name}: its starting value should be inside its range.`,
    );
    return null;
  }
  // After the unit: “log”, “step 1”, and any other text is the slider's label.
  let log = false;
  let step: number | null = null;
  const labels: string[] = [];
  for (const extra of extras) {
    if (extra === "") continue;
    const stepMatch = /^step\s+(.+)$/.exec(extra);
    if (extra === "log") log = true;
    else if (stepMatch) {
      step = number(stepMatch[1] ?? "");
      if (!(step !== null && step > 0)) {
        errors.push(`Slider ${name}: a step is a number above 0 (“step 1”).`);
        return null;
      }
    } else labels.push(extra);
  }
  if (labels.length > 1)
    errors.push(
      `Slider ${name}: one label only (“${labels.join("”, “")}”); options are “log” and “step 1”.`,
    );
  if (log && limits[0] <= 0) {
    errors.push(`Slider ${name}: a log slider's range must be above 0.`);
    return null;
  }
  const label = labels[0];
  return {
    name,
    min: limits[0],
    max: limits[1],
    value,
    unit,
    log,
    step,
    ...(label ? { label } : {}),
  };
}

function compile(
  source: string,
  variables: string[],
  where: string,
  errors: string[],
): Expression | null {
  try {
    return parseExpression(source, { variables });
  } catch (error) {
    errors.push(
      `${where}: ${error instanceof Error ? error.message : "it can't be read"}`,
    );
    return null;
  }
}

const COMPARISON = /(<=|>=|≤|≥|<|>)/;

/** Splits on commas outside brackets (comb(n, k) keeps its comma). */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if ((char === "," || char === ";") && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part !== "");
}

function parseRegion(
  name: string,
  source: string,
  variables: string[],
  errors: string[],
): Region | null {
  const conditions: Condition[] = [];
  for (const part of splitTopLevel(source)) {
    const pieces = part.split(COMPARISON);
    if (pieces.length < 3) {
      errors.push(
        `Region ${name}: “${part}” needs a comparison (<, <=, >, >=).`,
      );
      return null;
    }
    const terms: Expression[] = [];
    const comparisons: Comparison[] = [];
    pieces.forEach((piece, index) => {
      if (index % 2 === 1) {
        comparisons.push(
          piece === "≤" ? "<=" : piece === "≥" ? ">=" : (piece as Comparison),
        );
        return;
      }
      const term = compile(piece.trim(), variables, `Region ${name}`, errors);
      if (term) terms.push(term);
    });
    if (terms.length !== comparisons.length + 1) return null;
    conditions.push({ terms, comparisons });
  }
  if (conditions.length === 0) {
    errors.push(`Region ${name} has no conditions (like 0 < y < x).`);
    return null;
  }
  return { name, source, conditions };
}

/** Whether a point is in a region (every condition holds). */
export function inRegion(region: Region, scope: Scope): boolean {
  return region.conditions.every((condition) =>
    condition.comparisons.every((comparison, index) => {
      const left = condition.terms[index];
      const right = condition.terms[index + 1];
      if (!left || !right) return false;
      const a = evaluate(left, scope);
      const b = evaluate(right, scope);
      if (comparison === "<") return a < b;
      if (comparison === "<=") return a <= b;
      if (comparison === ">") return a > b;
      return a >= b;
    }),
  );
}

export function parsePlot(body: string): Parsed<PlotSpec> {
  const errors: string[] = [];
  const sliders: Slider[] = [];
  const curveLines: {
    name: string;
    variable: string;
    source: string;
    kind: "line" | "bars";
  }[] = [];
  const regionLines: { name: string; source: string }[] = [];
  let x: [number, number] | null = null;
  let y: [number, number] | null = null;
  let xLabel = "";
  let yLabel = "";
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("slider ")) {
      const slider = parseSlider(line.slice(7), errors);
      if (slider) sliders.push(slider);
      continue;
    }
    const region = /^region(?:\s+([\p{L}_][\p{L}\p{N}_]*))?\s*:\s*(.+)$/u.exec(
      line,
    );
    if (region) {
      regionLines.push({
        name: region[1] ?? `R${String(regionLines.length + 1)}`,
        source: region[2] ?? "",
      });
      continue;
    }
    const curve =
      /^(bars\s+)?([\p{L}_][\p{L}\p{N}_]*)\(\s*([\p{L}_][\p{L}\p{N}_]*)\s*\)\s*=\s*(.+)$/u.exec(
        line,
      );
    if (curve) {
      curveLines.push({
        name: curve[2] ?? "",
        variable: curve[3] ?? "",
        source: curve[4] ?? "",
        kind: curve[1] ? "bars" : "line",
      });
      continue;
    }
    const field = /^(x|y|xlabel|ylabel):\s*(.*)$/.exec(line);
    if (field) {
      const [, key, value = ""] = field;
      if (key === "x" || key === "y") {
        const span = range(value);
        if (!span) errors.push(`“${line}”: a range looks like “-5 .. 5”.`);
        else if (key === "x") x = span;
        else y = span;
      } else if (key === "xlabel") xLabel = value;
      else yLabel = value;
      continue;
    }
    errors.push(
      `“${line}” isn't part of a plot (a curve like f(x) = …, bars p(k) = …, region: …, x:, y:, xlabel:, ylabel:, or slider).`,
    );
  }
  if (curveLines.length === 0 && regionLines.length === 0)
    errors.push("The plot has no curves (like f(x) = x^2) or regions.");
  if (curveLines.length > 4) errors.push("A plot shows at most 4 curves.");
  if (regionLines.length > 3) errors.push("A plot shades at most 3 regions.");
  if (curveLines.filter((curve) => curve.kind === "bars").length > 2)
    errors.push("A plot shows at most 2 sets of bars.");
  const variable = curveLines[0]?.variable ?? "x";
  if (curveLines.some((curve) => curve.variable !== variable))
    errors.push(`Every curve should use the same variable (${variable}).`);
  const names = [variable, ...sliders.map((slider) => slider.name)];
  const curves = curveLines.flatMap((curve) => {
    const expression = compile(
      curve.source,
      names,
      `${curve.name}(${curve.variable})`,
      errors,
    );
    return expression
      ? [
          {
            name: curve.name,
            source: curve.source,
            expression,
            kind: curve.kind,
          },
        ]
      : [];
  });
  if (regionLines.length > 0 && variable === "y")
    errors.push("A plot with regions uses x across and y up (not y as x).");
  const regions = regionLines.flatMap((line) => {
    const region = parseRegion(line.name, line.source, [...names, "y"], errors);
    return region ? [region] : [];
  });
  if (regionLines.length > 0 && y === null && curveLines.length === 0)
    errors.push("A plot of regions only needs a y range (y: 0 .. 1).");
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    spec: {
      variable,
      x: x ?? [-5, 5],
      y,
      xLabel: xLabel || variable,
      yLabel,
      curves,
      regions,
      sliders,
    },
  };
}

export function parseExplore(body: string): Parsed<ExploreSpec> {
  const errors: string[] = [];
  const sliders: Slider[] = [];
  const outputLines: {
    name: string;
    source: string;
    unit: string;
    label: string;
  }[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("slider ")) {
      const slider = parseSlider(line.slice(7), errors);
      if (slider) sliders.push(slider);
      continue;
    }
    const output =
      /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*([^|]+)(?:\|([^|]*))?(?:\|(.*))?$/u.exec(
        line,
      );
    if (output) {
      outputLines.push({
        name: output[1] ?? "",
        source: (output[2] ?? "").trim(),
        unit: (output[3] ?? "").trim(),
        label: (output[4] ?? "").trim(),
      });
      continue;
    }
    errors.push(
      `“${line}” isn't part of an explorer (a slider, or a result like P = V I | W | Power).`,
    );
  }
  if (sliders.length === 0) errors.push("The explorer has no sliders.");
  if (outputLines.length === 0)
    errors.push("The explorer has no results (like P = V I | W).");
  const known = sliders.map((slider) => slider.name);
  const outputs: Output[] = [];
  for (const line of outputLines) {
    const expression = compile(line.source, known, line.name, errors);
    if (expression) outputs.push({ ...line, expression });
    // Later results may use earlier ones.
    known.push(line.name);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, spec: { sliders, outputs } };
}

/** The explorer's results for a set of slider values. */
export function exploreResults(
  spec: ExploreSpec,
  values: Readonly<Record<string, number>>,
): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const slider of spec.sliders)
    scope[slider.name] = values[slider.name] ?? slider.value;
  for (const output of spec.outputs)
    scope[output.name] = evaluate(output.expression, scope);
  return scope;
}

/** Slider position (0–1) ↔ value, linear or logarithmic. */
export function sliderValue(slider: Slider, position: number): number {
  const t = Math.min(1, Math.max(0, position));
  const value = slider.log
    ? slider.min * (slider.max / slider.min) ** t
    : slider.min + (slider.max - slider.min) * t;
  if (!slider.step) return value;
  const snapped =
    slider.min + Math.round((value - slider.min) / slider.step) * slider.step;
  return Number(Math.min(slider.max, snapped).toPrecision(12));
}

export function sliderPosition(slider: Slider, value: number): number {
  const t = slider.log
    ? Math.log(value / slider.min) / Math.log(slider.max / slider.min)
    : (value - slider.min) / (slider.max - slider.min);
  return Math.min(1, Math.max(0, t));
}

/** "Nice" tick values covering [low, high]: steps of 1, 2 or 5 × 10ⁿ. */
export function ticks(low: number, high: number, target = 6): number[] {
  const span = high - low;
  if (!(span > 0)) return [low];
  const rough = span / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? power * 10;
  const values: number[] = [];
  for (let v = Math.ceil(low / step) * step; v <= high + step * 1e-9; v += step)
    values.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
  return values;
}
