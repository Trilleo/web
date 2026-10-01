import type { ToolMeta } from "@trilleo/tool-kit";
import { meta as color } from "@trilleo/tool-color/meta";
import { meta as convert } from "@trilleo/tool-convert/meta";
import { meta as inspect } from "@trilleo/tool-inspect/meta";
import { meta as notes } from "@trilleo/tool-notes/meta";
import { meta as qr } from "@trilleo/tool-qr/meta";
import type { ToolListing } from "../listings";

/**
 * Every tool, in listing order: /tools, the home page, and the data API all read
 * this. See "Adding a new tool" in CLAUDE.md.
 */
export const TOOLS: readonly ToolMeta[] = [notes, convert, inspect, qr, color];

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
    icon: tool.icon,
    href: tool.status === "planned" ? null : toolPath(tool.slug),
  }));
}
