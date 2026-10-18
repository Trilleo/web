/**
 * `::: logic`: switch each input on or off and watch the outputs, beside the whole
 * truth table (the current row marked). Expressions
 * are evaluated with logic.ts, never run as code; the server renders them as maths.
 */
import { useMemo, useState } from "react";
import { assignments, evaluateLogic, parseLogic } from "../logic";
import type { LogicProps } from "../types";

function html(content: string) {
  return { __html: content };
}

export function LogicLab({ id, title, label, inputs, outputs }: LogicProps) {
  const compiled = useMemo(
    () =>
      outputs.map((output) => ({
        ...output,
        expression: parseLogic(output.source),
      })),
    [outputs],
  );
  const rows = useMemo(() => assignments(inputs), [inputs]);
  const [values, setValues] = useState<Record<string, 0 | 1>>(() =>
    Object.fromEntries(inputs.map((name) => [name, 0 as const])),
  );
  const currentIndex = inputs.reduce(
    (index, name) => index * 2 + (values[name] ?? 0),
    0,
  );

  return (
    <figure
      id={id}
      className="study-figure study-widget study-logic"
      aria-labelledby={`${id}-caption`}
    >
      <div className="study-logic-panel">
        <div className="study-logic-inputs" role="group" aria-label="Inputs">
          {inputs.map((name) => {
            const on = values[name] === 1;
            return (
              <button
                key={name}
                type="button"
                className="study-logic-switch"
                aria-pressed={on}
                onClick={() => {
                  setValues((current) => ({ ...current, [name]: on ? 0 : 1 }));
                }}
              >
                <span className="study-logic-name">{name}</span>
                <span className="study-logic-bit">{on ? 1 : 0}</span>
              </button>
            );
          })}
        </div>
        <ul className="study-logic-outputs" aria-live="polite">
          {compiled.map((output) => {
            const value = evaluateLogic(output.expression, values);
            return (
              <li key={output.name} data-on={value === 1 ? "" : undefined}>
                <span className="study-logic-lamp" aria-hidden="true" />
                <span dangerouslySetInnerHTML={html(output.html)} />
                <strong className="study-logic-bit">
                  <span className="sr-only">{output.name} is </span>
                  {value}
                </strong>
              </li>
            );
          })}
        </ul>
      </div>
      <div
        className="study-table"
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls sideways on phones, and keyboards need to reach it (axe's scrollable-region-focusable)
        tabIndex={0}
        role="group"
        aria-label={`Truth table for ${title}`}
      >
        <table className="study-truth">
          <thead>
            <tr>
              {inputs.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
              {compiled.map((output) => (
                <th key={output.name} scope="col" className="study-truth-out">
                  {output.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                aria-current={index === currentIndex ? "true" : undefined}
              >
                {inputs.map((name) => (
                  <td key={name}>{row[name]}</td>
                ))}
                {compiled.map((output) => (
                  <td key={output.name} className="study-truth-out">
                    {evaluateLogic(output.expression, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption id={`${id}-caption`}>
        <span className="study-box-kind">{label}</span> {title}
        <span className="study-figure-note">
          Press the inputs to switch them; the marked row is where you are.
        </span>
      </figcaption>
    </figure>
  );
}
