/**
 * `::: plot`: curves on axes with ticks, sliders for parameters, and a crosshair
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
import { parsePlot, ticks, type PlotSpec } from "../widgets";
import type { WidgetProps } from "../types";
import { Slider } from "./Slider";

const WIDTH = 640;
const HEIGHT = 360;
const MARGIN = { top: 14, right: 16, bottom: 40, left: 52 };
const SAMPLES = 360;

interface Sampled {
  name: string;
  source: string;
  points: { x: number; y: number }[];
}

function sample(spec: PlotSpec, scope: Record<string, number>): Sampled[] {
  const [low, high] = spec.x;
  return spec.curves.map((curve) => ({
    name: curve.name,
    source: curve.source,
    points: Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const x = low + ((high - low) * i) / SAMPLES;
      return {
        x,
        y: evaluate(curve.expression, { ...scope, [spec.variable]: x }),
      };
    }),
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
  if (!spec || !fitted)
    return (
      <p className="wiki-error">{parsed.ok ? "" : parsed.errors.join(" ")}</p>
    );

  const [x0, x1] = spec.x;
  const [y0, y1] = fitted;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const sx = (x: number) => MARGIN.left + ((x - x0) / (x1 - x0)) * plotWidth;
  const sy = (y: number) =>
    MARGIN.top + (1 - (y - y0) / (y1 - y0)) * plotHeight;

  const paths = curves.map((curve) => {
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

  const xTicks = ticks(x0, x1);
  const yTicks = ticks(y0, y1, 5);
  const readings =
    cursor === null
      ? null
      : spec.curves.map((curve) => ({
          name: curve.name,
          y: evaluate(curve.expression, { ...values, [spec.variable]: cursor }),
        }));

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
          aria-label={`${title}: ${spec.curves.map((curve) => `${curve.name}(${spec.variable}) = ${curve.source}`).join("; ")}. Use the arrow keys to read values.`}
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
            {paths.map((d, index) => (
              <path
                key={index}
                d={d}
                className={`plot-curve plot-curve-${String(index)}`}
              />
            ))}
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
                    cx={sx(cursor)}
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
                .map(
                  (reading) => `${reading.name} = ${formatNumber(reading.y)}`,
                )
                .join(", ")}`}
        </p>
      </div>
      <ul className="study-legend">
        {spec.curves.map((curve, index) => (
          <li key={curve.name}>
            <span
              className={`study-swatch plot-curve-${String(index)}`}
              aria-hidden="true"
            />
            <code>
              {curve.name}({spec.variable}) = {curve.source}
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
