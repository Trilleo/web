import { describe, expect, it } from "vitest";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "../seo";
import { renderCard, renderCardSvg, titleSize } from "./render";

const card = {
  section: "(01) Writing / 007",
  title: "A home for small tools",
  meta: "2026.09.28 · 4 min read · Tools",
};

describe("renderCard", () => {
  it("draws a 1200×630 PNG", async () => {
    const png = await renderCard(card);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    // The PNG signature, then the IHDR chunk's width and height.
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(view.getUint32(16)).toBe(OG_IMAGE_WIDTH);
    expect(view.getUint32(20)).toBe(OG_IMAGE_HEIGHT);
  });

  it("draws the text as shapes, not as text left to the viewer's fonts", async () => {
    const svg = await renderCardSvg(card);
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toContain("<text");
  });
});

describe("titleSize", () => {
  it("shrinks as titles get longer", () => {
    const sizes = [5, 30, 60, 100].map((n) => titleSize("x".repeat(n)));
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(new Set(sizes).size).toBe(4);
  });
});
