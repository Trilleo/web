/** Class names the wiki's pages share: quieter controls than the main site's. */
import { buttonClasses, type ButtonVariant } from "@trilleo/ui";

/** Buttons without the sliding fill: the wiki keeps motion low. */
export function wikiButton(
  variant: ButtonVariant = "primary",
  className?: string,
): string {
  return buttonClasses({ variant, hover: "plain", className });
}

export const wikiInput =
  "w-full border border-ink bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-accent";

export const wikiLabel = "type-label text-muted";

/** Tables of rows (histories, lists): mono headers, rules between rows. */
export const wikiTable =
  "w-full border-collapse text-sm [&_td]:border-t [&_td]:border-hair [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-mono [&_th]:text-xs [&_th]:font-normal [&_th]:tracking-[0.06em] [&_th]:text-muted [&_th]:uppercase";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** "11 Oct 2026, 14:05 UTC". */
export function formatWikiDate(date: Date): string {
  return `${dateFormat.format(date)} UTC`;
}

/** "+120", "−40", "0": a revision's size change in bytes. */
export function formatDelta(bytes: number, previous: number | null): string {
  const delta = bytes - (previous ?? 0);
  if (delta > 0) return `+${delta.toLocaleString("en-US")}`;
  if (delta < 0) return `−${Math.abs(delta).toLocaleString("en-US")}`;
  return "0";
}
