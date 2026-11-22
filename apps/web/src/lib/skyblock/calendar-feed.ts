/**
 * The event timer's calendar feed: /tools/skyblock/events/calendar.ics?events=&alarm=
 * (written by @trilleo/skyblock/events' `calendarIcs`). No account and no secret:
 * the link itself says which events (all when none are named) and the alarm, so
 * anyone can subscribe from any calendar app. It covers the next ICS_DAYS; apps fetch
 * it again every few hours. Perk events are in it while someone holds the perk.
 * Jacob's contests carry their crops when known; `crops=` keeps only contests with one
 * of those crops (and only once they're known).
 */
import {
  EVENTS,
  PERK_EVENTS,
  calendarIcs,
  contestCrops,
  cropName,
  eventsBetween,
  mayorEvents,
  type Election,
  type JacobCrop,
  type JacobSchedule,
  type Occurrence,
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
  /** Jacob's contests only with one of these crops; empty: every contest. */
  crops: JacobCrop[];
}

export const CONTEST = "jacobs-farming-contest";

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
  const crops = [
    ...new Set(
      params
        .getAll("crops")
        .flatMap((value) => value.split(","))
        .flatMap((name) => cropName(name) ?? []),
    ),
  ];
  return {
    events,
    alarm: (ICS_ALARMS as readonly number[]).includes(alarm) ? alarm : null,
    crops,
  };
}

/** The feed's address for a choice (absolute, for calendar apps). */
export function feedUrl(choice: FeedChoice, origin: string = SITE_URL): string {
  const url = new URL(ICS_PATH, origin);
  if (choice.events.length > 0)
    url.searchParams.set("events", choice.events.join(","));
  if (choice.alarm !== null)
    url.searchParams.set("alarm", String(choice.alarm));
  if (choice.crops.length > 0)
    url.searchParams.set("crops", choice.crops.join(","));
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

/** Whether a time passes the crop filter (only Jacob's contests are filtered). */
export function passesCrops(
  occurrence: Occurrence,
  crops: readonly JacobCrop[],
  jacob: JacobSchedule | null,
): boolean {
  if (occurrence.event.slug !== CONTEST || crops.length === 0) return true;
  const known = contestCrops(jacob, occurrence.start);
  return known?.some((crop) => crops.includes(crop)) ?? false;
}

export function feedIcs(
  choice: FeedChoice,
  election: Election | null,
  jacob: JacobSchedule | null,
  now: number,
): string {
  const events = feedEvents(choice, election);
  const times = eventsBetween(now, now + ICS_DAYS * 86_400_000, events).filter(
    (occurrence) => passesCrops(occurrence, choice.crops, jacob),
  );
  return calendarIcs(times, {
    extra: (occurrence) =>
      occurrence.event.slug === CONTEST
        ? (contestCrops(jacob, occurrence.start)?.join(", ") ?? null)
        : null,
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
