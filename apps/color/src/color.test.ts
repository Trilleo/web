import { describe, expect, it } from "vitest";
import {
  STEPS,
  contrastRatio,
  cssVariables,
  formats,
  inGamut,
  palette,
  readColor,
  readableOn,
  verdict,
} from "./color";

const color = (text: string) => {
  const parsed = readColor(text);
  if (!parsed) throw new Error(`not a color: ${text}`);
  return parsed;
};

describe("readColor", () => {
  it("reads any CSS color", () => {
    for (const text of [
      "#e5470f",
      "e5470f".replace(/^/, "#"),
      "rgb(229 71 15)",
      "hsl(16 88% 48%)",
      "tomato",
      " oklch(60% 0.2 40) ",
    ]) {
      expect(readColor(text)).not.toBeNull();
    }
    expect(readColor("not a color")).toBeNull();
    expect(readColor("")).toBeNull();
  });

  it("gives greys a hue of 0", () => {
    expect(color("#808080").h).toBe(0);
  });
});

describe("formats", () => {
  it("writes the color in each format", () => {
    expect(formats(color("#e5470f"))).toEqual({
      hex: "#e5470f",
      rgb: "rgb(229, 71, 15)",
      hsl: "hsl(16 88% 48%)",
      oklch: expect.stringMatching(
        /^oklch\(\d+(\.\d)?% 0\.\d{1,3} \d+(\.\d)?\)$/,
      ) as string,
    });
  });

  it("round-trips exactly through HEX and RGB, and closely through the rounded ones", () => {
    const start = color("#3a7bd5");
    const { hex, rgb, hsl, oklch } = formats(start);
    expect(formats(color(hex)).hex).toBe("#3a7bd5");
    expect(formats(color(rgb)).hex).toBe("#3a7bd5");
    for (const rounded of [hsl, oklch]) {
      expect(contrastRatio(color(rounded), start)).toBeLessThan(1.05);
    }
  });

  it("brings out-of-gamut colors into sRGB", () => {
    const vivid = { mode: "oklch" as const, l: 0.7, c: 0.37, h: 150 };
    expect(inGamut(vivid).c).toBeLessThan(0.37);
    expect(formats(vivid).hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("contrast", () => {
  it("matches WCAG", () => {
    expect(contrastRatio(color("#000"), color("#fff"))).toBeCloseTo(21);
    expect(contrastRatio(color("#777"), color("#fff"))).toBeCloseTo(4.48, 2);
  });

  it("grades the ratio", () => {
    expect(verdict(4.48)).toEqual({
      normalAA: false,
      normalAAA: false,
      largeAA: true,
      largeAAA: false,
    });
    expect(verdict(7.1)).toEqual({
      normalAA: true,
      normalAAA: true,
      largeAA: true,
      largeAAA: true,
    });
  });

  it("picks black or white for labels", () => {
    expect(readableOn("#ffff00")).toBe("#000000");
    expect(readableOn("#1a1a40")).toBe("#ffffff");
  });
});

describe("palette", () => {
  it("runs from light to dark in eleven steps, keeping the hue", () => {
    const swatches = palette(color("#e5470f"));
    expect(swatches.map((swatch) => swatch.step)).toEqual([...STEPS]);
    const lightness = swatches.map((swatch) => color(swatch.hex).l);
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]).toBeLessThan(lightness[i - 1] ?? 1);
    }
    expect(
      Math.abs(
        (color(swatches[5]?.hex ?? "").h ?? 0) - (color("#e5470f").h ?? 0),
      ),
    ).toBeLessThan(8);
  });

  it("writes CSS variables with a clean name", () => {
    const css = cssVariables("  My Brand! ", palette(color("#3a7bd5")));
    expect(css.split("\n")).toHaveLength(11);
    expect(css).toMatch(/^--my-brand-50: #[0-9a-f]{6};$/m);
    expect(cssVariables("", palette(color("#000")))).toMatch(/^--color-50:/);
  });
});
