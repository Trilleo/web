import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "preview",
  name: "Preview",
  description:
    "Read a document from a link or a file without downloading it: PDF, Word, Excel, PowerPoint, EPUB, Markdown, code and more.",
  status: "live",
  icon: "preview",
};
