/**
 * `::: plot`: curves (lines, or bars at whole numbers for discrete distributions)
 * and shaded regions on axes with ticks, sliders for parameters, and a crosshair
 * that reads every curve's value at the pointer (or at the x a keyboard user
 * steps to with the arrow keys). Drawn as SVG; the server renders the first frame,
 * so the graph is there before (and without) JavaScript. Without a y range, the
 * axes fit the curves at the sliders' starting values and then stay put.
 */
import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { evaluate } from "../expression";
import { formatNumber } from "../units";
import { inRegion, parsePlot, ticks, type PlotSpec } from "../widgets";
import type { WidgetProps } from "../types";
import { Slider } from "./Slider";

const WIDTH = 640;
const HEIGHT = 360;
const MARGIN = { top: 14, right: 16, bottom: 40, left: 52 };
const SAMPLES = 360;
const MAX_BARS = 200;
/** Cells a region is sampled on (its edges are as fine as a cell). */
const REGION_COLUMNS = 240;
const REGION_ROWS = 150;

interface Sampled {
  name: string;
  source: string;
  kind: "line" | "bars";
  points: { x: number; y: number }[];
}

/** Where a curve is drawn: across the range, or at each whole number in it. */
function positions(spec: PlotSpec, kind: "line" | "bars"): number[] {
  const [low, high] = spec.x;
  if (kind === "bars") {
    const first = Math.ceil(low);
    const count = Math.min(MAX_BARS, Math.floor(high) - first + 1);
    return Array.from({ length: Math.max(0, count) }, (_, i) => first + i);
  }
  return Array.from(
    { length: SAMPLES + 1 },
    (_, i) => low + ((high - low) * i) / SAMPLES,
  );
}

function sample(spec: PlotSpec, scope: Record<string, number>): Sampled[] {
  return spec.curves.map((curve) => ({
    name: curve.name,
    source: curve.source,
    kind: curve.kind,
    points: positions(spec, curve.kind).map((x) => ({
      x,
      y: evaluate(curve.expression, { ...scope, [spec.variable]: x }),
    })),
  }));
}

/** The y range: as written, or fitted to what's finite (ignoring the wildest 1%). */
function yRange(spec: PlotSpec, curves: Sampled[]): [number, number] {
  if (spec.y) return spec.y;
  const values = curves
    .flatMap((curve) => curve.points.map((point) => point.y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  if (values.length === 0) return [-1, 1];
  const trim = Math.floor(values.length * 0.01);
  let low = values[trim] ?? 0;
  let high = values[values.length - 1 - trim] ?? 0;
  // Bars stand on zero.
  if (curves.some((curve) => curve.kind === "bars")) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (high - low < 1e-9) {
    low -= 1;
    high += 1;
  }
  const pad = (high - low) * 0.08;
  return [low - pad, high + pad];
}

export function Plot({ id, title, source, label }: WidgetProps) {
  const parsed = useMemo(() => parsePlot(source), [source]);
  const sliderId = useId();
  const [values, setValues] = useState<Record<string, number>>(() =>
    parsed.ok
      ? Object.fromEntries(
          parsed.spec.sliders.map((slider) => [slider.name, slider.value]),
        )
      : {},
  );
  const [cursor, setCursor] = useState<number | null>(null);

  const spec = parsed.ok ? parsed.spec : null;
  const curves = useMemo(
    () => (spec ? sample(spec, values) : []),
    [spec, values],
  );
  // Fitted once, to the starting values: moving a slider then visibly changes the curve.
  const fitted = useMemo(() => {
    if (!spec) return null;
    const start = Object.fromEntries(
      spec.sliders.map((slider) => [slider.name, slider.value]),
    );
    return yRange(spec, sample(spec, start));
  }, [spec]);
  // Each region as runs of cells along each row, so a few rectangles draw it.
  const regionCells = useMemo(() => {
    if (!spec || !fitted || spec.regions.length === 0) return [];
    const [left, right] = spec.x;
    const [bottom, top] = fitted;
    return spec.regions.map((region) => {
      const runs: { column: number; row: number; length: number }[] = [];
      for (let row = 0; row < REGION_ROWS; row += 1) {
        const y = top - ((row + 0.5) / REGION_ROWS) * (top - bottom);
        let start = -1;
        for (let column = 0; column <= REGION_COLUMNS; column += 1) {
          const x = left + ((column + 0.5) / REGION_COLUMNS) * (right - left);
          const inside =
            column < REGION_COLUMNS &&
            inRegion(region, { ...values, [spec.variable]: x, y });
          if (inside && start < 0) start = column;
          if (!inside && start >= 0) {
            runs.push({ column: start, row, length: column - start });
            start = -1;
          }
        }
      }
      return { name: region.name, runs };
    });
  }, [spec, fitted, values]);

  if (!spec || !fitted)
    return (
      <p className="wiki-error">{parsed.ok ? "" : parsed.errors.join(" ")}</p>
    );

  // Bars at the ends of the range would be cut in half: leave room for them.
  const pad = spec.curves.some((curve) => curve.kind === "bars") ? 0.6 : 0;
  const x0 = spec.x[0] - pad;
  const x1 = spec.x[1] + pad;
  const [y0, y1] = fitted;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const sx = (x: number) => MARGIN.left + ((x - x0) / (x1 - x0)) * plotWidth;
  const sy = (y: number) =>
    MARGIN.top + (1 - (y - y0) / (y1 - y0)) * plotHeight;

  const paths = curves.map((curve) => {
    if (curve.kind === "bars") return "";
    let d = "";
    let drawing = false;
    let previous: number | null = null;
    for (const point of curve.points) {
      const ok =
        Number.isFinite(point.y) &&
        point.y > y0 - (y1 - y0) * 4 &&
        point.y < y1 + (y1 - y0) * 4;
      // A jump across most of the range is an asymptote: lift the pen.
      const jump =
        previous !== null && Math.abs(point.y - previous) > (y1 - y0) * 1.5;
      if (!ok || jump) drawing = false;
      if (ok) {
        d += `${drawing ? "L" : "M"}${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)} `;
        drawing = true;
      }
      previous = ok ? point.y : null;
    }
    return d.trim();
  });

  // Bars: side by side when there are two sets, each set its own colour.
  const barSets = curves.filter((curve) => curve.kind === "bars");
  const unit = plotWidth / (x1 - x0);
  const barWidth = Math.min(28, unit * 0.7) / Math.max(1, barSets.length);
  const bars = barSets.flatMap((curve, set) =>
    curve.points
      .filter((point) => Number.isFinite(point.y))
      .map((point) => {
        const left =
          sx(point.x) - (barWidth * barSets.length) / 2 + barWidth * set;
        const top = sy(Math.max(point.y, 0));
        const bottom = sy(Math.min(point.y, 0));
        return {
          key: `${curve.name}-${String(point.x)}`,
          set,
          x: left,
          y: top,
          width: barWidth,
          height: Math.max(0, bottom - top),
        };
      }),
  );
  const regions = regionCells;
  const xTicks = ticks(x0, x1);
  const yTicks = ticks(y0, y1, 5);
  const readings =
    cursor === null
      ? null
      : spec.curves.map((curve) => {
          const at = curve.kind === "bars" ? Math.round(cursor) : cursor;
          return {
            name: curve.name,
            at,
            kind: curve.kind,
            y: evaluate(curve.expression, { ...values, [spec.variable]: at }),
          };
        });

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    const t = (x - MARGIN.left) / plotWidth;
    setCursor(t < 0 || t > 1 ? null : x0 + t * (x1 - x0));
  };
  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    const step = (x1 - x0) / 100;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const start = cursor ?? (x0 + x1) / 2;
      setCursor(
        Math.min(
          x1,
          Math.max(x0, start + (event.key === "ArrowRight" ? step : -step)),
        ),
      );
    } else if (event.key === "Escape") setCursor(null);
  };

  return (
    <figure
      id={id}
      className="study-figure study-widget"
      aria-labelledby={`${id}-caption`}
    >
      <div className="study-plot">
        <svg
          viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
          role="img"
          aria-label={`${title}: ${[
            ...spec.curves.map(
              (curve) =>
                `${curve.kind === "bars" ? "bars at whole numbers, " : ""}${curve.name}(${spec.variable}) = ${curve.source}`,
            ),
            ...spec.regions.map(
              (region) => `region ${region.name} shaded: ${region.source}`,
            ),
          ].join("; ")}. Use the arrow keys to read values.`}
          tabIndex={0}
          onPointerMove={move}
          onPointerLeave={() => {
            setCursor(null);
          }}
          onKeyDown={key}
        >
          <g className="plot-grid">
            {xTicks.map((tick) => (
              <line
                key={`x${String(tick)}`}
                x1={sx(tick)}
                x2={sx(tick)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
              />
            ))}
            {yTicks.map((tick) => (
              <line
                key={`y${String(tick)}`}
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={sy(tick)}
                y2={sy(tick)}
              />
            ))}
          </g>
          <g className="plot-axes">
            {y0 < 0 && y1 > 0 && (
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={sy(0)}
                y2={sy(0)}
              />
            )}
            {x0 < 0 && x1 > 0 && (
              <line
                x1={sx(0)}
                x2={sx(0)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
              />
            )}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={plotWidth}
              height={plotHeight}
            />
          </g>
          <g className="plot-labels">
            {xTicks.map((tick) => (
              <text
                key={`xl${String(tick)}`}
                x={sx(tick)}
                y={MARGIN.top + plotHeight + 16}
                textAnchor="middle"
              >
                {formatNumber(tick)}
              </text>
            ))}
            {yTicks.map((tick) => (
              <text
                key={`yl${String(tick)}`}
                x={MARGIN.left - 6}
                y={sy(tick) + 4}
                textAnchor="end"
              >
                {formatNumber(tick)}
              </text>
            ))}
            <text
              x={MARGIN.left + plotWidth}
              y={HEIGHT - 4}
              textAnchor="end"
              className="plot-axis-title"
            >
              {spec.xLabel}
            </text>
            {spec.yLabel && (
              <text
                x={MARGIN.left + 4}
                y={MARGIN.top + 12}
                className="plot-axis-title"
              >
                {spec.yLabel}
              </text>
            )}
          </g>
          <defs>
            <clipPath id={`${id}-clip`}>
              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={plotWidth}
                height={plotHeight}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-clip)`}>
            {regions.map((region, index) => (
              <g
                key={region.name}
                className={`plot-region plot-region-${String(index)}`}
              >
                {region.runs.map((run) => (
                  <rect
                    key={`${String(run.row)}-${String(run.column)}`}
                    x={sx(
                      spec.x[0] +
                        (run.column / REGION_COLUMNS) * (spec.x[1] - spec.x[0]),
                    )}
                    y={MARGIN.top + (run.row / REGION_ROWS) * plotHeight}
                    width={
                      (run.length / REGION_COLUMNS) *
                        (spec.x[1] - spec.x[0]) *
                        unit +
                      0.4
                    }
                    height={plotHeight / REGION_ROWS + 0.4}
                  />
                ))}
              </g>
            ))}
            {bars.map((bar) => (
              <rect
                key={bar.key}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                className={`plot-bar plot-bar-${String(bar.set)}`}
              />
            ))}
            {paths.map((d, index) =>
              d ? (
                <path
                  key={index}
                  d={d}
                  className={`plot-curve plot-curve-${String(index)}`}
                />
              ) : null,
            )}
          </g>
          {cursor !== null && (
            <g className="plot-cursor">
              <line
                x1={sx(cursor)}
                x2={sx(cursor)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotHeight}
              />
              {readings?.map((reading, index) =>
                Number.isFinite(reading.y) &&
                reading.y >= y0 &&
                reading.y <= y1 ? (
                  <circle
                    key={index}
                    cx={sx(reading.at)}
                    cy={sy(reading.y)}
                    r={3.5}
                    className={`plot-dot-${String(index)}`}
                  />
                ) : null,
              )}
            </g>
          )}
        </svg>
        <p className="study-plot-reading" aria-live="polite">
          {cursor === null
            ? "Point at the graph (or focus it and use the arrow keys) to read values."
            : `${spec.variable} = ${formatNumber(cursor)}: ${(readings ?? [])
                .map((reading) =>
                  reading.kind === "bars"
                    ? `${reading.name}(${formatNumber(reading.at)}) = ${formatNumber(reading.y)}`
                    : `${reading.name} = ${formatNumber(reading.y)}`,
                )
                .join(", ")}`}
        </p>
      </div>
      <ul className="study-legend">
        {spec.curves.map((curve, index) => (
          <li key={curve.name}>
            <span
              className={
                curve.kind === "bars"
                  ? `study-swatch study-swatch-block plot-bar-${String(
                      spec.curves
                        .filter((other) => other.kind === "bars")
                        .indexOf(curve),
                    )}`
                  : `study-swatch plot-curve-${String(index)}`
              }
              aria-hidden="true"
            />
            <code>
              {curve.name}({spec.variable}) = {curve.source}
            </code>
          </li>
        ))}
        {spec.regions.map((region, index) => (
          <li key={region.name}>
            <span
              className={`study-swatch study-swatch-block plot-region-${String(index)}`}
              aria-hidden="true"
            />
            <code>
              {region.name}: {region.source}
            </code>
          </li>
        ))}
      </ul>
      {spec.sliders.length > 0 && (
        <div className="study-sliders">
          {spec.sliders.map((slider) => (
            <Slider
              key={slider.name}
              id={`${sliderId}-${slider.name}`}
              spec={slider}
              value={values[slider.name] ?? slider.value}
              onChange={(value) => {
                setValues((current) => ({ ...current, [slider.name]: value }));
              }}
            />
          ))}
        </div>
      )}
      <figcaption id={`${id}-caption`}>
        <span className="study-box-kind">{label}</span> {title}
      </figcaption>
    </figure>
  );
}
