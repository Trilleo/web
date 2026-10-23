/**
 * Links previewed lately, kept in this browser (preferenceStore: localStorage, or
 * the tab's sessionStorage when "preferences" are off in the cookie settings).
 */
import { preferenceStore } from "@trilleo/tool-kit";

export const RECENT_KEY = "trilleo:tool:preview:recent";
export const MAX_RECENT = 8;

export interface RecentLink {
  url: string;
  name: string;
  /** ISO time it was last opened. */
  at: string;
}

function isRecent(value: unknown): value is RecentLink {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.url === "string" &&
    typeof record.name === "string" &&
    typeof record.at === "string"
  );
}

export function readRecent(
  store: Storage | null = preferenceStore(),
): RecentLink[] {
  try {
    const raw: unknown = JSON.parse(store?.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isRecent).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function write(store: Storage | null, links: RecentLink[]): void {
  try {
    if (links.length === 0) store?.removeItem(RECENT_KEY);
    else store?.setItem(RECENT_KEY, JSON.stringify(links));
  } catch {
    // Full or blocked storage: the list just isn't kept.
  }
}

/** Puts a link first (once), keeping the newest MAX_RECENT. */
export function rememberLink(
  link: Omit<RecentLink, "at">,
  now: Date = new Date(),
  store: Storage | null = preferenceStore(),
): RecentLink[] {
  const next = [
    { ...link, at: now.toISOString() },
    ...readRecent(store).filter((each) => each.url !== link.url),
  ].slice(0, MAX_RECENT);
  write(store, next);
  changed();
  return next;
}

export function forgetRecent(store: Storage | null = preferenceStore()): void {
  write(store, []);
  changed();
}

// A tiny store over the list, for useSyncExternalStore: the page reads it after
// hydration (the server has no browser storage) and again after each change.
const listeners = new Set<() => void>();
let snapshot: RecentLink[] | null = null;
const EMPTY: RecentLink[] = [];

function changed(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function subscribeRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recentSnapshot(): RecentLink[] {
  snapshot ??= readRecent();
  return snapshot;
}

export function recentServerSnapshot(): RecentLink[] {
  return EMPTY;
}
