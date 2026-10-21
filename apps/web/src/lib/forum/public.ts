/**
 * The forum section's public face: its number and words, and how times read in it.
 * Pure, so share cards, the home page and tests can use it.
 */
export const FORUM_NUMBER = "07";
export const FORUM_LABEL = `(${FORUM_NUMBER}) Forum`;
export const FORUM_DESCRIPTION =
  "Questions, ideas and conversation: about the site, its tools and games, Minecraft, studying, or anything else.";

import { formatPostDate } from "../listings";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date as the site writes it. */
export function formatWhen(date: Date, now = new Date()): string {
  const ago = now.getTime() - date.getTime();
  if (ago < MINUTE) return "just now";
  if (ago < HOUR) return `${String(Math.floor(ago / MINUTE))} min ago`;
  if (ago < DAY) return `${String(Math.floor(ago / HOUR))} h ago`;
  if (ago < 7 * DAY) {
    const days = Math.floor(ago / DAY);
    return `${String(days)} ${days === 1 ? "day" : "days"} ago`;
  }
  return formatPostDate(date);
}

const numberFormat = new Intl.NumberFormat("en");

/** "1 reply", "1,204 replies". */
export function counted(n: number, one: string, many = `${one}s`): string {
  return `${numberFormat.format(n)} ${n === 1 ? one : many}`;
}

/** The pages to link in a pager: first, last, and two either side of this one. */
export function pagerPages(page: number, pages: number): (number | "gap")[] {
  const shown = new Set([1, pages]);
  for (let n = page - 2; n <= page + 2; n++)
    if (n >= 1 && n <= pages) shown.add(n);
  const sorted = [...shown].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const n of sorted) {
    const previous = out.at(-1);
    if (typeof previous === "number" && n - previous > 1) out.push("gap");
    out.push(n);
  }
  return out;
}

/** ?page=N from a URL: a positive whole number, or 1. */
export function pageParam(url: URL): number {
  const value = Number(url.searchParams.get("page") ?? "1");
  return Number.isInteger(value) && value >= 1 && value <= 100_000 ? value : 1;
}
