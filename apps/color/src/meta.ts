import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "color",
  name: "Color",
  description:
    "Convert colors between HEX, RGB, HSL and OKLCH, check contrast against WCAG, and build a palette of tints and shades.",
  status: "in-progress",
  icon: "color",
};
