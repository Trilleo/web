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
 *   slider w: 0.5 .. 6 = 3 | rad/s
 *   :::
 *
 *   ::: explore Power in a resistor
 *   slider V: 0 .. 12 = 5 | V
 *   slider R: 1 .. 1k = 100 | Ω | log
 *   I = V / R | A | Current
 *   P = V I | W | Power
 *   :::
 */
import { evaluate, parseExpression, type Expression } from "./expression";
import { parseQuantity } from "./units";

export interface Slider {
  name: string;
  min: number;
  max: number;
  value: number;
  unit: string;
  /** Moves on a log scale (values spanning decades: resistances, frequencies). */
  log: boolean;
}

export interface Curve {
  name: string;
  source: string;
  expression: Expression;
}

export interface PlotSpec {
  variable: string;
  x: [number, number];
  y: [number, number] | null;
  xLabel: string;
  yLabel: string;
  curves: Curve[];
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
  const [spec = "", unit = "", flag = ""] = rest
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
  const log = flag === "log";
  if (flag !== "" && !log)
    errors.push(`Slider ${name}: “${flag}” isn't an option (only “log”).`);
  if (log && limits[0] <= 0) {
    errors.push(`Slider ${name}: a log slider's range must be above 0.`);
    return null;
  }
  return { name, min: limits[0], max: limits[1], value, unit, log };
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

export function parsePlot(body: string): Parsed<PlotSpec> {
  const errors: string[] = [];
  const sliders: Slider[] = [];
  const curveLines: { name: string; variable: string; source: string }[] = [];
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
    const curve =
      /^([\p{L}_][\p{L}\p{N}_]*)\(\s*([\p{L}_][\p{L}\p{N}_]*)\s*\)\s*=\s*(.+)$/u.exec(
        line,
      );
    if (curve) {
      curveLines.push({
        name: curve[1] ?? "",
        variable: curve[2] ?? "",
        source: curve[3] ?? "",
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
      `“${line}” isn't part of a plot (a curve like f(x) = …, x:, y:, xlabel:, ylabel:, or slider).`,
    );
  }
  if (curveLines.length === 0)
    errors.push("The plot has no curves (like f(x) = x^2).");
  if (curveLines.length > 4) errors.push("A plot shows at most 4 curves.");
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
      ? [{ name: curve.name, source: curve.source, expression }]
      : [];
  });
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
  return slider.log
    ? slider.min * (slider.max / slider.min) ** t
    : slider.min + (slider.max - slider.min) * t;
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
