import { useId, type ReactNode } from "react";

export interface ChoiceProps<T extends string | number> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}

/** A row of mutually exclusive options, as radio buttons styled like the site's toggles. */
export function Choice<T extends string | number>({
  legend,
  value,
  options,
  onChange,
}: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 type-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={`relative press cursor-pointer border border-ink px-3 py-2 type-label has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${checked ? "bg-ink text-paper" : "hover:bg-chip"}`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                disabled={option.disabled}
                onChange={() => {
                  onChange(option.value);
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A labelled control; the hint is linked as its description, not part of its name. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      {children({ id, ...(hint ? { "aria-describedby": hintId } : {}) })}
      {hint && (
        <span id={hintId} className="text-sm text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}
