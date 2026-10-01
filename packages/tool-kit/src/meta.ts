export type ToolStatus = "planned" | "in-progress" | "live";

/** The pictogram on a tool or game card (see apps/web/src/components/ToolIcon.astro). */
export type ToolIcon =
  "notes" | "convert" | "inspect" | "qr" | "color" | "island";

/** What the site needs to know about a tool: how to list it, and its data rules. */
export interface ToolMeta {
  /** Its URL (/tools/<slug>/) and its name in the data API. Lowercase, dashes. */
  slug: string;
  name: string;
  /** One line: what it does and who it's for. */
  description: string;
  status: ToolStatus;
  icon: ToolIcon;
  /**
   * For tools that save to accounts: whether a value may be saved. The server runs
   * it on every save, so it's the real check (the browser can't be trusted).
   */
  isValidValue?: (value: unknown) => boolean;
}

/** One saved thing (e.g. a note), as tools and the data API exchange it. */
export interface StoredItem<T> {
  key: string;
  value: T;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

/** Keys: letters, digits, `-` and `_`, up to 100 characters (UUIDs fit). */
export const KEY_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/** The largest value the data API accepts, as UTF-8 JSON. */
export const MAX_VALUE_BYTES = 200 * 1024;

/** Most keys one person can keep in one tool. */
export const MAX_KEYS_PER_TOOL = 500;

/** Where a tool's page sends someone to sign in, and back. */
export function signInHref(returnTo: string): string {
  return `/auth/github?next=${encodeURIComponent(returnTo)}`;
}
