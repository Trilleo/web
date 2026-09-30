/** Shapes of the post and tool lists. */
import type { ToolShape, ToolStatus } from "@trilleo/tool-kit";

export type { ToolShape, ToolStatus };

export interface PostListing {
  /** Stable post number, e.g. "002" (see numberPosts). */
  number: string;
  title: string;
  href: string;
  /** Publication date; drafts have none. */
  date: Date | null;
  draft: boolean;
  readingMinutes: number;
}

export interface ToolListing {
  name: string;
  description: string;
  /** Where the tool is served, e.g. "/tools/<name>". */
  path: string;
  status: ToolStatus;
  shape: ToolShape;
  /** Null until the tool is live. */
  href: string | null;
}

/** Games list like tools do: same card, same fields ("/games/<name>" paths). */
export type GameListing = ToolListing;

export const TOOL_STATUS_LABEL: Readonly<Record<ToolStatus, string>> = {
  planned: "Planned",
  "in-progress": "In progress",
  live: "Live",
};

/** Zero-padded 1-based position: 0 → "001". */
export function formatListingNumber(index: number, digits = 3): string {
  return String(index + 1).padStart(digits, "0");
}

/** "2026.09.28" (UTC, so builds don't depend on the machine's time zone); "—" when undated. */
export function formatPostDate(date: Date | null): string {
  if (!date) return "—";
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${String(date.getUTCFullYear())}.${month}.${day}`;
}
