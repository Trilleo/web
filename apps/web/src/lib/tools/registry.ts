import type { ToolMeta } from "@trilleo/tool-kit";
import { meta as notes } from "@trilleo/tool-notes/meta";
import type { ToolListing } from "../listings";

/**
 * Every tool, in listing order: /tools, the home page, and the data API all read
 * this. See "Adding a new tool" in CLAUDE.md.
 */
export const TOOLS: readonly ToolMeta[] = [notes];

export function toolPath(slug: string): string {
  return `/tools/${slug}/`;
}

export function findTool(
  slug: string | undefined,
  tools: readonly ToolMeta[] = TOOLS,
): ToolMeta | undefined {
  return tools.find((tool) => tool.slug === slug);
}

/** Tools as the tool cards show them; planned ones aren't linked. */
export function toolListings(
  tools: readonly ToolMeta[] = TOOLS,
): ToolListing[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    status: tool.status,
    shape: tool.shape,
    href: tool.status === "planned" ? null : toolPath(tool.slug),
  }));
}
