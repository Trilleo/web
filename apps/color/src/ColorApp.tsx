import {
  Button,
  CopyButton,
  Field,
  ToolSection,
  fieldClasses,
} from "@trilleo/ui";
import { MotionConfig } from "motion/react";
import type { Oklch } from "culori";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  contrastRatio,
  cssVariables,
  formats,
  knownColor,
  palette,
  readColor,
  readableOn,
  verdict,
} from "./color";

/** The site's accent: where the tool starts when the link carries no color. */
export const START_COLOR = "#e5470f";

const FORMAT_LABELS = [
  ["hex", "HEX"],
  ["rgb", "RGB"],
  ["hsl", "HSL"],
  ["oklch", "OKLCH"],
] as const;

function subscribeToHash(onChange: () => void): () => void {
  addEventListener("hashchange", onChange);
  return () => {
    removeEventListener("hashchange", onChange);
  };
}

/** The page address's fragment; empty while rendering on the server and hydrating. */
function useHash(): string {
  return useSyncExternalStore(
    subscribeToHash,
    () => location.hash,
    () => "",
  );
}

/** A color from a fragment (#ff8800, or #oklch(…)), if it holds one. */
function colorFromHash(hash: string): Oklch | null {
  const text = decodeURIComponent(hash.slice(1));
  return text ? (readColor(text) ?? readColor(`#${text}`)) : null;
}

/** A text field that edits a color: typing anything valid applies it. */
function ColorInput({
  label,
  value,
  onColor,
}: {
  label: string;
  value: string;
  onColor: (color: Oklch) => void;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  // Follow the color while not being typed in.
  const shown = focused ? text : value;
  const valid = readColor(shown) !== null;
  return (
    <Field
      label={label}
      {...(valid ? {} : { hint: "Not a color CSS understands." })}
    >
      {(props) => (
        <input
          {...props}
          value={shown}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!valid}
          onFocus={() => {
            setText(value);
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          onChange={(event) => {
            setFocused(true);
            setText(event.target.value);
            const color = readColor(event.target.value);
            if (color) onColor(color);
          }}
          className={`${fieldClasses} h-11 px-3 font-mono text-sm`}
        />
      )}
    </Field>
  );
}

function Badge({ pass, children }: { pass: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 type-label ${pass ? "border-ink bg-ink text-paper" : "border-hair text-muted line-through"}`}
    >
      {children}
      <span className="sr-only">{pass ? "passes" : "fails"}</span>
    </span>
  );
}

export function ColorApp() {
  // The link's color until someone edits it; their edit then wins, and goes into
  // the link (for sharing).
  const hash = useHash();
  const [edited, setColor] = useState<Oklch | null>(null);
  const color = edited ?? colorFromHash(hash) ?? knownColor(START_COLOR);
  const [background, setBackground] = useState<Oklch>(() =>
    knownColor("#ffffff"),
  );
  const [name, setName] = useState("brand");

  const values = formats(color);
  useEffect(() => {
    if (edited) history.replaceState(null, "", `#${values.hex.slice(1)}`);
  }, [edited, values.hex]);

  const backgroundHex = formats(background).hex;
  const ratio = contrastRatio(color, background);
  const passes = verdict(ratio);
  const swatches = palette(color);
  const css = cssVariables(name, swatches);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-10 md:gap-12">
        <ToolSection number="01" title="Color">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              {/* User colors are content, so they're inline styles rather than theme classes. */}
              <div
                className="aspect-square w-full border border-ink"
                style={{ backgroundColor: values.hex }}
                role="img"
                aria-label={`Swatch: ${values.hex}`}
              />
              <label className="inline-flex items-center gap-2 type-label">
                <input
                  type="color"
                  value={values.hex}
                  onChange={(event) => {
                    const picked = readColor(event.target.value);
                    if (picked) setColor(picked);
                  }}
                  className="h-9 w-12 cursor-pointer border border-ink bg-paper p-0.5"
                />
                Pick a color
              </label>
            </div>
            <div className="flex flex-col gap-6">
              <ColorInput
                label="Any CSS color"
                value={values.hex}
                onColor={setColor}
              />
              <ul
                className="flex flex-col border-t border-hair"
                aria-label="Formats"
              >
                {FORMAT_LABELS.map(([key, label]) => (
                  <li
                    key={key}
                    className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-hair py-2"
                  >
                    <span className="type-label text-muted">{label}</span>
                    <code className="font-mono text-sm break-all">
                      {values[key]}
                    </code>
                    <CopyButton value={values[key]} label={`Copy ${label}`} />
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Field
                  label={`Lightness: ${String(Math.round(color.l * 100))}%`}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="range"
                      min={0}
                      max={1}
                      step={0.005}
                      value={color.l}
                      onChange={(event) => {
                        setColor({ ...color, l: Number(event.target.value) });
                      }}
                      className="h-11 accent-accent"
                    />
                  )}
                </Field>
                <Field label={`Chroma: ${color.c.toFixed(3)}`}>
                  {(props) => (
                    <input
                      {...props}
                      type="range"
                      min={0}
                      max={0.37}
                      step={0.001}
                      value={color.c}
                      onChange={(event) => {
                        setColor({ ...color, c: Number(event.target.value) });
                      }}
                      className="h-11 accent-accent"
                    />
                  )}
                </Field>
                <Field label={`Hue: ${String(Math.round(color.h ?? 0))}°`}>
                  {(props) => (
                    <input
                      {...props}
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={color.h ?? 0}
                      onChange={(event) => {
                        setColor({ ...color, h: Number(event.target.value) });
                      }}
                      className="h-11 accent-accent"
                    />
                  )}
                </Field>
              </div>
              <p className="-mt-2 text-sm text-muted">
                OKLCH sliders move evenly to the eye. Colors outside what
                screens show are brought in by lowering chroma.
              </p>
            </div>
          </div>
        </ToolSection>

        <ToolSection number="02" title="Contrast">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <ColorInput
                label="Background"
                value={backgroundHex}
                onColor={setBackground}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setColor(background);
                    setBackground(color);
                  }}
                >
                  Swap colors
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                <p className="type-headline" aria-live="polite">
                  {ratio.toFixed(2)}:1
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge pass={passes.normalAA}>AA text</Badge>
                  <Badge pass={passes.normalAAA}>AAA text</Badge>
                  <Badge pass={passes.largeAA}>AA large</Badge>
                  <Badge pass={passes.largeAAA}>AAA large</Badge>
                </div>
                <p className="text-sm text-muted">
                  WCAG 2: body text needs 4.5:1 (AA) or 7:1 (AAA); large text
                  and interface parts need 3:1.
                </p>
              </div>
            </div>
            {/* A sample of the chosen pair, which may fail contrast on purpose:
                data-contrast-sample keeps it out of the site's axe checks. */}
            <figure
              className="flex flex-col justify-center gap-2 border border-ink p-6"
              style={{ backgroundColor: backgroundHex, color: values.hex }}
              aria-label={`Sample: ${values.hex} text on ${backgroundHex}`}
              data-contrast-sample
            >
              <p className="text-3xl font-semibold">Large heading</p>
              <p>Body text at reading size, to see how it holds up.</p>
              <p className="text-sm">Small print, the hardest case.</p>
            </figure>
          </div>
        </ToolSection>

        <ToolSection number="03" title="Palette">
          <div className="flex flex-col gap-6">
            <ul
              className="grid grid-cols-4 border border-ink md:grid-cols-6 xl:grid-cols-11"
              aria-label="Tints and shades"
            >
              {swatches.map((swatch) => (
                <li key={swatch.step}>
                  <button
                    type="button"
                    className="flex aspect-square w-full flex-col justify-end p-2 text-left font-mono text-xs focus-visible:outline-offset-[-4px]"
                    style={{
                      backgroundColor: swatch.hex,
                      color: readableOn(swatch.hex),
                    }}
                    aria-label={`Use ${String(swatch.step)}: ${swatch.hex}`}
                    onClick={() => {
                      const picked = readColor(swatch.hex);
                      if (picked) setColor(picked);
                    }}
                  >
                    <span>{swatch.step}</span>
                    <span>{swatch.hex}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start">
              <Field label="Variable name">
                {(props) => (
                  <input
                    {...props}
                    value={name}
                    spellCheck={false}
                    onChange={(event) => {
                      setName(event.target.value);
                    }}
                    className={`${fieldClasses} h-11 px-3 font-mono text-sm`}
                  />
                )}
              </Field>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="type-label">CSS variables</span>
                  <CopyButton value={css} label="Copy CSS variables" />
                </div>
                <pre className="overflow-x-auto border border-hair bg-fig p-3 font-mono text-xs leading-relaxed">
                  {css}
                </pre>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>
    </MotionConfig>
  );
}
