import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "convert",
  name: "Converter",
  description:
    "Convert images and audio between formats, resize, compress and trim, in batches. Files stay in your browser.",
  status: "in-progress",
  icon: "convert",
};
