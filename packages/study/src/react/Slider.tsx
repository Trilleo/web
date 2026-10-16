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
        </label>
        <output htmlFor={id} className="study-slider-value">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={STEPS}
        step={1}
        value={Math.round(sliderPosition(spec, value) * STEPS)}
        aria-valuetext={`${spec.name} = ${shown}`}
        onChange={(event) => {
          onChange(
            sliderValue(spec, Number(event.currentTarget.value) / STEPS),
          );
        }}
      />
    </div>
  );
}
