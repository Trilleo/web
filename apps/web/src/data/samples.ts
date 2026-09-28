/**
 * SAMPLE CONTENT: placeholder tools so the home page can be built before real tools
 * exist. Phase 7 replaces sampleTools with the real tool registry. (Posts are real
 * content now: src/content/writing/.)
 */
import type { ToolListing } from "../lib/listings";

const placeholderTool = {
  name: "[Tool name]",
  description: "[One line on what the tool does and who it’s for.]",
  path: "/tools/[name]",
  href: null,
} as const;

export const sampleTools: readonly ToolListing[] = [
  { ...placeholderTool, status: "in-progress", shape: "circle" },
  { ...placeholderTool, status: "in-progress", shape: "quarter" },
  { ...placeholderTool, status: "planned", shape: "triangle" },
];
