/** Color math for the Color tool: parsing, the four formats, contrast, and palettes. */
import {
  clampChroma,
  converter,
  formatHex,
  formatRgb,
  parse,
  wcagContrast,
  type Oklch,
} from "culori";

const toOklch = converter("oklch");
const toHsl = converter("hsl");

/** Any CSS color ("#e5470f", "rgb(…)", "tomato", "oklch(…)") as OKLCH, or null. */
export function readColor(text: string): Oklch | null {
  const parsed = parse(text.trim());
  if (!parsed) return null;
  const color = toOklch(parsed);
  // Greys have no hue; keep it a number so sliders and math stay simple.
  return { ...color, h: color.h ?? 0, alpha: undefined };
}

/** readColor for colors known to be valid (constants); throws otherwise. */
export function knownColor(text: string): Oklch {
  const color = readColor(text);
  if (!color) throw new Error(`Not a color: ${text}`);
  return color;
}

/** The nearest color sRGB screens can show (keeps lightness and hue, lowers chroma). */
export function inGamut(color: Oklch): Oklch {
  return clampChroma(color, "oklch");
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** "hsl(215 65% 53%)", rounded to whole numbers like most CSS is written. */
function hslString(color: Oklch): string {
  const { h = 0, s, l } = toHsl(color);
  return `hsl(${String(Math.round(h) % 360)} ${String(Math.round(s * 100))}% ${String(Math.round(l * 100))}%)`;
}

export interface Formats {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
}

/** The color in each format, ready to paste into CSS. */
export function formats(color: Oklch): Formats {
  const shown = inGamut(color);
  return {
    hex: formatHex(shown),
    rgb: formatRgb(shown),
    hsl: hslString(shown),
    oklch: `oklch(${String(round(color.l * 100, 1))}% ${String(round(color.c, 3))} ${String(round(color.h ?? 0, 1))})`,
  };
}

/** WCAG 2 contrast ratio between two colors (1–21). */
export function contrastRatio(a: Oklch, b: Oklch): number {
  return wcagContrast(inGamut(a), inGamut(b));
}

export interface ContrastVerdict {
  /** Body text: 4.5:1 for AA, 7:1 for AAA. */
  normalAA: boolean;
  normalAAA: boolean;
  /** Large text (24 px, or 18.66 px bold) and UI parts: 3:1 for AA, 4.5:1 for AAA. */
  largeAA: boolean;
  largeAAA: boolean;
}

export function verdict(ratio: number): ContrastVerdict {
  return {
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
  };
}

/** The steps of a palette, like Tailwind's 50–950. */
export const STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/** Lightness for each step, from almost white to almost black. */
const LIGHTNESS = [
  0.975, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.45, 0.37, 0.29, 0.21,
];

export interface Swatch {
  step: (typeof STEPS)[number];
  hex: string;
}

/**
 * Tints and shades of a color at even steps of lightness in OKLCH, which looks even
 * to the eye. Chroma eases off near white and black, then is fitted to sRGB.
 */
export function palette(color: Oklch): Swatch[] {
  return STEPS.map((step, i) => {
    const l = LIGHTNESS[i] ?? 0.5;
    const taper = 1 - Math.abs(l - 0.6) / 0.6;
    const c = color.c * Math.max(0.12, Math.min(1, taper * 1.6));
    return {
      step,
      hex: formatHex(inGamut({ mode: "oklch", l, c, h: color.h ?? 0 })),
    };
  });
}

/** A palette as CSS custom properties: "--brand-50: #fef4f0;" … */
export function cssVariables(
  name: string,
  swatches: readonly Swatch[],
): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "color";
  return swatches
    .map((swatch) => `--${slug}-${String(swatch.step)}: ${swatch.hex};`)
    .join("\n");
}

/** Black or white, whichever reads better on the color (for labels on swatches). */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  return wcagContrast(hex, "#000000") >= wcagContrast(hex, "#ffffff")
    ? "#000000"
    : "#ffffff";
}
