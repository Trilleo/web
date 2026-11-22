/**
 * The event timer's calendar feed as iCalendar (RFC 5545): each time an event starts
 * in a window, written out (calendar apps handle sub-daily repeats unevenly, so no
 * RRULEs), with stable UIDs so a refetch updates rather than duplicates, and an
 * optional alarm. Lines end in CRLF and fold at 75 octets.
 */
import { formatSkyblockDate, skyblockDate } from "./calendar";
import type { Occurrence } from "./events";

export interface IcsOptions {
  /** The calendar's name, as apps show it. */
  name: string;
  /** Each event's page, for its URL. */
  eventUrl: (slug: string) => string;
  /** Minutes before the start for an alarm; null: none. */
  alarmMinutes: number | null;
  /** When the feed was written (DTSTAMP). */
  now: number;
  /** The domain UIDs end in. */
  domain: string;
  /** Extra words for a time, shown after its name (Jacob's contest crops). */
  extra?: (occurrence: Occurrence) => string | null;
}

/** How long apps should wait before fetching again. */
export const ICS_REFRESH_HOURS = 6;

export function icsDate(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a line at 75 octets, never inside a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // The first line holds 75 octets; the rest start with a space, so 74.
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function calendarIcs(
  occurrences: readonly Occurrence[],
  options: IcsOptions,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.domain}//SkyBlock event timer//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(options.name)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${String(ICS_REFRESH_HOURS)}H`,
    `X-PUBLISHED-TTL:PT${String(ICS_REFRESH_HOURS)}H`,
  ];
  for (const occurrence of occurrences) {
    const { event, start, end } = occurrence;
    const date = formatSkyblockDate(skyblockDate(start));
    const extra = options.extra?.(occurrence) ?? null;
    const description = [
      event.summary,
      `SkyBlock date: ${date}.`,
      event.warp ? `Warp: ${event.warp}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.slug}-${String(start)}@${options.domain}`,
      `DTSTAMP:${icsDate(options.now)}`,
      `DTSTART:${icsDate(start)}`,
      // A moment-long event (the Dark Auction) gets a minute, which apps can show.
      `DTEND:${icsDate(end > start ? end : start + 60_000)}`,
      `SUMMARY:${icsText(extra ? `${event.name}: ${extra}` : event.name)}`,
      `DESCRIPTION:${icsText(description)}`,
      `LOCATION:${icsText(event.where)}`,
      `URL:${options.eventUrl(event.slug)}`,
      "TRANSP:TRANSPARENT",
    );
    if (options.alarmMinutes !== null) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsText(event.name)}`,
        `TRIGGER:-PT${String(options.alarmMinutes)}M`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
