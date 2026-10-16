/** `::: explore`: sliders on a formula's inputs, its results worked out as they move. */
import { useId, useMemo, useState } from "react";
import { formatNumber, formatQuantity } from "../units";
import { exploreResults, parseExplore } from "../widgets";
import type { WidgetProps } from "../types";
import { Slider } from "./Slider";

export function Explore({ id, title, source, label }: WidgetProps) {
  const parsed = useMemo(() => parseExplore(source), [source]);
  const sliderId = useId();
  const [values, setValues] = useState<Record<string, number>>(() =>
    parsed.ok
      ? Object.fromEntries(
          parsed.spec.sliders.map((slider) => [slider.name, slider.value]),
        )
      : {},
  );
  if (!parsed.ok)
    return <p className="wiki-error">{parsed.errors.join(" ")}</p>;
  const { spec } = parsed;
  const results = exploreResults(spec, values);

  return (
    <figure
      id={id}
      className="study-figure study-widget study-explore"
      aria-labelledby={`${id}-caption`}
    >
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
      <dl className="study-results" aria-live="polite">
        {spec.outputs.map((output) => {
          const value = results[output.name] ?? NaN;
          return (
            <div key={output.name} className="study-result">
              <dt>
                {output.label && (
                  <span className="study-result-label">{output.label}</span>
                )}
                <code>
                  {output.name} = {output.source}
                </code>
              </dt>
              <dd>
                {output.unit
                  ? formatQuantity(value, output.unit)
                  : formatNumber(value)}
              </dd>
            </div>
          );
        })}
      </dl>
      <figcaption id={`${id}-caption`}>
        <span className="study-box-kind">{label}</span> {title}
      </figcaption>
    </figure>
  );
}
