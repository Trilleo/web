/**
 * The event timer's calendar feed: /tools/skyblock/events/calendar.ics?events=&alarm=
 * (written by @trilleo/skyblock/events' `calendarIcs`). No account and no secret:
 * the link itself says which events (all when none are named) and the alarm, so
 * anyone can subscribe from any calendar app. It covers the next ICS_DAYS; apps fetch
 * it again every few hours. Perk events are in it while someone holds the perk.
 */
import {
  EVENTS,
  PERK_EVENTS,
  calendarIcs,
  eventsBetween,
  mayorEvents,
  type Election,
  type SkyBlockEvent,
} from "@trilleo/skyblock/events";
import { eventPath } from "@trilleo/tool-skyblock/meta";
import { SITE_URL } from "../site";

export const CALENDAR_PATH = "/tools/skyblock/events/calendar/";
export const ICS_PATH = "/tools/skyblock/events/calendar.ics";
/** How far ahead the feed reaches. */
export const ICS_DAYS = 14;
/** Alarms a feed may ask for, in minutes before the start. */
export const ICS_ALARMS = [0, 5, 15, 30, 60] as const;

export interface FeedChoice {
  /** Event slugs; empty: every event. */
  events: string[];
  alarm: number | null;
}

const KNOWN = new Set([...EVENTS, ...PERK_EVENTS].map((event) => event.slug));

/** The choice from a query string, keeping only known events and alarms. */
export function readFeedChoice(params: URLSearchParams): FeedChoice {
  const events = [
    ...new Set(
      params
        .getAll("events")
        .flatMap((value) => value.split(","))
        .map((slug) => slug.trim())
        .filter((slug) => KNOWN.has(slug)),
    ),
  ];
  const alarm = Number.parseInt(params.get("alarm") ?? "", 10);
  return {
    events,
    alarm: (ICS_ALARMS as readonly number[]).includes(alarm) ? alarm : null,
  };
}

/** The feed's address for a choice (absolute, for calendar apps). */
export function feedUrl(choice: FeedChoice, origin: string = SITE_URL): string {
  const url = new URL(ICS_PATH, origin);
  if (choice.events.length > 0)
    url.searchParams.set("events", choice.events.join(","));
  if (choice.alarm !== null)
    url.searchParams.set("alarm", String(choice.alarm));
  return url.href;
}

/** The same address for apps that subscribe from a webcal: link. */
export function webcalUrl(url: string): string {
  return url.replace(/^https?:/, "webcal:");
}

export function feedEvents(
  choice: FeedChoice,
  election: Election | null,
): SkyBlockEvent[] {
  const all = [...EVENTS, ...mayorEvents(election)];
  return choice.events.length === 0
    ? all
    : all.filter((event) => choice.events.includes(event.slug));
}

export function feedIcs(
  choice: FeedChoice,
  election: Election | null,
  now: number,
): string {
  const events = feedEvents(choice, election);
  return calendarIcs(eventsBetween(now, now + ICS_DAYS * 86_400_000, events), {
    name:
      events.length === 1 && events[0]
        ? `SkyBlock: ${events[0].name}`
        : "SkyBlock events",
    eventUrl: (slug) => new URL(eventPath(slug), SITE_URL).href,
    alarmMinutes: choice.alarm,
    now,
    domain: new URL(SITE_URL).hostname,
  });
}
