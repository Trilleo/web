/**
 * `::: circuit-sim`: the circuit drawn with every node's voltage on it, a slider per
 * part, and a table of each part's voltage, current and power, solved again (DC)
 * whenever a slider moves.
 */
import { useId, useMemo, useState } from "react";
import { drawCircuit } from "../circuit/draw";
import {
  ELEMENT_NAMES,
  ELEMENT_UNITS,
  VALUED_KINDS,
  parseCircuit,
  type CircuitElement,
  type Point,
} from "../circuit/parse";
import { solveCircuit } from "../circuit/solve";
import { formatQuantity } from "../units";
import type { Slider as SliderSpec } from "../widgets";
import type { WidgetProps } from "../types";
import { Slider } from "./Slider";

/** A part's slider: its written range, or a decade either side (sources: 0 to double). */
export function partSlider(element: CircuitElement): SliderSpec {
  const unit = ELEMENT_UNITS[element.kind];
  if (element.range)
    return {
      name: element.name,
      min: element.range[0],
      max: element.range[1],
      value: Math.min(
        element.range[1],
        Math.max(element.range[0], element.value),
      ),
      unit,
      log: element.range[0] > 0 && element.range[1] / element.range[0] >= 100,
    };
  if (element.kind === "V" || element.kind === "I") {
    const size = Math.abs(element.value) || (element.kind === "V" ? 10 : 0.01);
    return element.value < 0
      ? {
          name: element.name,
          min: -2 * size,
          max: 0,
          value: element.value,
          unit,
          log: false,
        }
      : {
          name: element.name,
          min: 0,
          max: 2 * size,
          value: element.value,
          unit,
          log: false,
        };
  }
  return {
    name: element.name,
    min: element.value / 10,
    max: element.value * 10,
    value: element.value,
    unit,
    log: true,
  };
}

export function CircuitLab({ id, title, source, label }: WidgetProps) {
  const parsed = useMemo(() => parseCircuit(source), [source]);
  const sliderId = useId();
  const sliders = useMemo(
    () =>
      parsed.circuit.elements
        .filter((element) => VALUED_KINDS.includes(element.kind))
        .map(partSlider),
    [parsed],
  );
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(sliders.map((slider) => [slider.name, slider.value])),
  );
  if (parsed.errors.length > 0)
    return <p className="wiki-error">{parsed.errors.join(" ")}</p>;

  const { circuit } = parsed;
  const result = solveCircuit(circuit, values);
  const notes: { at: Point; text: string }[] = [];
  if (result.ok) {
    const { solution } = result;
    solution.nodePoints.forEach((points, node) => {
      if (node === solution.ground) return;
      // A labelled point if there is one, else the top-left point of the node.
      const labelled = circuit.labels.find(
        (entry) => solution.nodeAt(entry.at) === node,
      )?.at;
      const at =
        labelled ?? [...points].sort((a, b) => a.y - b.y || a.x - b.x)[0];
      if (at)
        notes.push({
          at,
          text: formatQuantity(solution.voltages[node] ?? 0, "V"),
        });
    });
  }
  const svg = drawCircuit(circuit, { title, id: `${id}-art`, notes, values });

  return (
    <figure
      id={id}
      className="study-figure study-widget study-lab"
      aria-labelledby={`${id}-caption`}
    >
      <div
        className="study-figure-art"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="study-sliders">
        {sliders.map((slider) => (
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
      {result.ok ? (
        <div
          className="study-table"
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls sideways on phones, and keyboards need to reach it (axe's scrollable-region-focusable)
          tabIndex={0}
          role="group"
          aria-label={`Readings for ${title}`}
        >
          <table className="study-readings">
            <caption className="sr-only">Readings for {title}</caption>
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col">Voltage</th>
                <th scope="col">Current</th>
                <th scope="col">Power</th>
              </tr>
            </thead>
            <tbody aria-live="polite">
              {result.solution.elements.map((reading) => {
                const element = circuit.elements.find(
                  (entry) => entry.name === reading.name,
                );
                // Sources read the way they're rated: + over −, current out of +.
                const source = element?.kind === "V" || element?.kind === "I";
                const voltage = source ? -reading.voltage : reading.voltage;
                const { current } = reading;
                return (
                  <tr key={reading.name}>
                    <th scope="row">
                      {reading.name}{" "}
                      <span className="study-muted">
                        {element ? ELEMENT_NAMES[element.kind] : ""}
                      </span>
                    </th>
                    <td>{formatQuantity(voltage, "V")}</td>
                    <td>{formatQuantity(current, "A")}</td>
                    <td>
                      {reading.power < 0
                        ? `supplies ${formatQuantity(-reading.power, "W")}`
                        : formatQuantity(reading.power, "W")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="wiki-error" role="status">
          {result.error}
        </p>
      )}
      <figcaption id={`${id}-caption`}>
        <span className="study-box-kind">{label}</span> {title}
        <span className="study-figure-note">
          Node voltages are measured from ground. A part's voltage is from its
          first point to its second and its current flows the same way; a source
          shows its own voltage (+ over −) and the current it drives out of +.
        </span>
      </figcaption>
    </figure>
  );
}
