import { formatQuantity, formatNumber } from "../units";
import {
  sliderPosition,
  sliderValue,
  type Slider as SliderSpec,
} from "../widgets";

const STEPS = 1000;

/** A labelled range input for a widget's parameter; reads out its value with the unit. */
export function Slider({
  spec,
  value,
  onChange,
  id,
}: {
  spec: SliderSpec;
  value: number;
  onChange: (value: number) => void;
  id: string;
}) {
  const shown = spec.unit
    ? formatQuantity(value, spec.unit)
    : formatNumber(value);
  return (
    <div className="study-slider">
      <div className="study-slider-label">
        <label htmlFor={id} className="study-slider-name">
          {spec.name}
          {spec.label && (
            <span className="study-slider-label-text">{spec.label}</span>
          )}
        </label>
        <output htmlFor={id} className="study-slider-value">
          {shown}
        </output>
      </div>
      {spec.step && !spec.log ? (
        // Whole steps (n = 1, 2, 3 …): the input's own values, so each arrow key is one step.
        <input
          id={id}
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          aria-valuetext={`${spec.label ?? spec.name} = ${shown}`}
          onChange={(event) => {
            onChange(Number(event.currentTarget.value));
          }}
        />
      ) : (
        <input
          id={id}
          type="range"
          min={0}
          max={STEPS}
          step={1}
          value={Math.round(sliderPosition(spec, value) * STEPS)}
          aria-valuetext={`${spec.label ?? spec.name} = ${shown}`}
          onChange={(event) => {
            onChange(
              sliderValue(spec, Number(event.currentTarget.value) / STEPS),
            );
          }}
        />
      )}
    </div>
  );
}
