import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "inspect",
  name: "File info",
  description:
    "What a file really is: its type from the bytes, hashes (MD5 to BLAKE3), and technical details. Nothing leaves your browser.",
  status: "in-progress",
  icon: "inspect",
};
