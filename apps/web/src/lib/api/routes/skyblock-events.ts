/**
 * The SkyBlock group's event timer routes, public: the calendar and its events (worked
 * out from the SkyBlock clock, @trilleo/skyblock/events), and what the site last read
 * from Hypixel's own feeds (lib/skyblock/feeds.ts): the mayor and the running
 * election, recorded elections, fire sales and Bingo. Perk events count only while
 * someone in office holds the perk. Jacob's contest crops come from a third party's
 * feed and aren't served here.
 */
import {
  EVENTS,
  EVENT_CATEGORIES,
  currentOccurrence,
  eventBySlug,
  eventsBetween,
  mayorEvents,
  mayorTerm,
  monthName,
  nextOccurrence,
  scheduleInWords,
  skyblockDate,
  type Candidate,
  type EventCategory,
  type Occurrence,
  type Perk,
  type SkyBlockEvent,
} from "@trilleo/skyblock/events";
import { stripSectionCodes } from "@trilleo/skyblock";
import { eventPath } from "@trilleo/tool-skyblock/meta";
import { SITE_URL } from "../../site";
import {
  electionByYear,
  electionVotes,
  listElections,
  type ElectionRecord,
} from "../../skyblock/elections";
import { liveFeeds } from "../../skyblock/feeds";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const CATEGORIES = Object.keys(EVENT_CATEGORIES) as [
  EventCategory,
  ...EventCategory[],
];
const iso = (ms: number) => new Date(ms).toISOString();
const absolute = (path: string) => new URL(path, SITE_URL).href;
/** The most hours /v1/skyblock/events looks ahead. */
const MAX_HOURS = 14 * 24;

const span = (description: string) =>
  t.nullable(
    t.object(
      {
        start: t.dateTime("When it starts."),
        end: t.dateTime(
          "When it ends (the same as the start for a moment, like the Dark Auction).",
        ),
      },
      { description },
    ),
  );
const toSpan = (occurrence: Occurrence | null) =>
  occurrence
    ? { start: iso(occurrence.start), end: iso(occurrence.end) }
    : null;

const perkFields = t.object({
  name: t.string(),
  description: t.string({ description: "The perk's text, without § codes." }),
  descriptionRaw: t.string({
    description:
      "The same with Minecraft's § colour codes, as Hypixel sends it.",
  }),
  minister: t.boolean({ description: "Whether a minister can hold it." }),
});
const toPerk = (perk: Perk) => ({
  name: perk.name,
  description: stripSectionCodes(perk.description),
  descriptionRaw: perk.description,
  minister: perk.minister,
});
const candidateFields = t.object({
  key: t.string({
    description: 'Hypixel\'s key for the candidate, e.g. "fishing".',
  }),
  name: t.string(),
  votes: t.integer({ min: 0 }),
  perks: t.array(perkFields),
});
const toCandidate = (candidate: Candidate) => ({
  key: candidate.key,
  name: candidate.name,
  votes: candidate.votes,
  perks: candidate.perks.map(toPerk),
});

const EXAMPLE_PERK = {
  name: "Fishing Festival",
  description: "Start a special fishing event the first 3 days of each month!",
  descriptionRaw:
    "Start a special fishing event the first §b3 §7days of each month!",
  minister: true,
};

const eventFields = {
  slug: t.string({ description: "Its address on the site." }),
  name: t.string(),
  category: t.enum(CATEGORIES),
  where: t.string(),
  warp: t.nullable(
    t.string({ description: 'The command that goes there, e.g. "/hub".' }),
  ),
  summary: t.string(),
  schedule: t.string({
    description:
      'When it happens, in the game\'s words, e.g. "Autumn 29th to 31st".',
  }),
  perk: t.nullable(
    t.string({
      description: "The mayor's perk it needs; null for calendar events.",
    }),
  ),
  url: t.string({ format: "uri" }),
};
const toEvent = (event: SkyBlockEvent) => ({
  slug: event.slug,
  name: event.name,
  category: event.category,
  where: event.where,
  warp: event.warp,
  summary: event.summary,
  schedule: scheduleInWords(event),
  perk: event.perk ?? null,
  url: absolute(eventPath(event.slug)),
});

export const getSkyblockCalendar = defineRoute({
  method: "GET",
  path: "/v1/skyblock/calendar",
  operationId: "getSkyblockCalendar",
  group: "skyblock",
  summary: "Get the SkyBlock date and events",
  description:
    "The SkyBlock date and time now, and every event: what it is, when it happens, and whether it's on now and when it's next. Includes the events the current mayor's perks add.",
  auth: "public",
  cacheSeconds: 30,
  response: t.object({
    now: t.dateTime("When this was worked out."),
    date: t.object({
      year: t.integer({ min: 1 }),
      month: t.integer({ min: 1, max: 12 }),
      monthName: t.string({ description: 'E.g. "Late Winter".' }),
      day: t.integer({ min: 1, max: 31 }),
      hour: t.integer({ min: 0, max: 23 }),
      minute: t.integer({ min: 0, max: 59 }),
    }),
    events: t.array(
      t.object({
        ...eventFields,
        running: span("The time it's on now; null when it isn't."),
        next: span(
          "Its next start; null when it won't come again (a term ending).",
        ),
      }),
    ),
  }),
  example: {
    response: {
      now: "2026-11-22T14:00:00.000Z",
      date: {
        year: 527,
        month: 8,
        monthName: "Autumn",
        day: 12,
        hour: 6,
        minute: 0,
      },
      events: [
        {
          slug: "spooky-festival",
          name: "Spooky Festival",
          category: "festival" as const,
          where: "The Hub",
          warp: "/hub",
          summary:
            "Mobs drop candy for three days. Trade it with the Fear Mongerer in the Hub.",
          schedule: "Autumn 29th to 31st",
          perk: null,
          url: "https://www.trilleo.net/tools/skyblock/events/spooky-festival/",
          running: null,
          next: {
            start: "2026-11-22T19:35:00.000Z",
            end: "2026-11-22T20:35:00.000Z",
          },
        },
      ],
    },
  },
  handler: async ({ db }) => {
    const now = Date.now();
    const { election } = await liveFeeds(db, now);
    const date = skyblockDate(now);
    return {
      now: iso(now),
      date: { ...date, monthName: monthName(date.month) },
      events: [...EVENTS, ...mayorEvents(election)].map((event) => ({
        ...toEvent(event),
        running: toSpan(currentOccurrence(event, now)),
        next: toSpan(nextOccurrence(event, now)),
      })),
    };
  },
});

export const listSkyblockEvents = defineRoute({
  method: "GET",
  path: "/v1/skyblock/events",
  operationId: "listSkyblockEvents",
  group: "skyblock",
  summary: "List upcoming event times",
  description:
    "Every time an event is on or starts in the coming hours, in order of start: what the event timer's board and calendar feed show.",
  auth: "public",
  cacheSeconds: 60,
  query: t.object({
    hours: t.optional(
      t.integer({
        min: 1,
        max: MAX_HOURS,
        description: `How far ahead, in hours: 1 to ${String(MAX_HOURS)} (default 24).`,
      }),
    ),
    category: t.optional(
      t.enum(CATEGORIES, { description: "Only events of this kind." }),
    ),
  }),
  response: t.object({
    from: t.dateTime(),
    to: t.dateTime(),
    items: t.array(
      t.object({
        slug: t.string(),
        name: t.string(),
        category: t.enum(CATEGORIES),
        start: t.dateTime(),
        end: t.dateTime(),
      }),
    ),
  }),
  example: {
    query: { hours: 1 },
    response: {
      from: "2026-11-22T14:00:00.000Z",
      to: "2026-11-22T15:00:00.000Z",
      items: [
        {
          slug: "jacobs-farming-contest",
          name: "Jacob's Farming Contest",
          category: "farming" as const,
          start: "2026-11-22T14:15:00.000Z",
          end: "2026-11-22T14:35:00.000Z",
        },
      ],
    },
  },
  handler: async ({ db, query }) => {
    const now = Date.now();
    const to = now + (query.hours ?? 24) * 3_600_000;
    const { election } = await liveFeeds(db, now);
    const events = [...EVENTS, ...mayorEvents(election)].filter(
      (event) => !query.category || event.category === query.category,
    );
    return {
      from: iso(now),
      to: iso(to),
      items: eventsBetween(now, to, events).map((occurrence) => ({
        slug: occurrence.event.slug,
        name: occurrence.event.name,
        category: occurrence.event.category,
        start: iso(occurrence.start),
        end: iso(occurrence.end),
      })),
    };
  },
});

export const getSkyblockMayor = defineRoute({
  method: "GET",
  path: "/v1/skyblock/mayor",
  operationId: "getSkyblockMayor",
  group: "skyblock",
  summary: "Get the mayor and the running election",
  description:
    "The mayor, their perks and when their term ends, the minister, and the election running now (if the booth is open) with its votes, as the site last read them from Hypixel (every 5 minutes).",
  auth: "public",
  cacheSeconds: 60,
  response: t.object({
    fetchedAt: t.dateTime("When the site read this from Hypixel."),
    mayor: t.object({
      key: t.string(),
      name: t.string(),
      perks: t.array(perkFields),
      termEnds: t.dateTime("When the next mayor takes office."),
    }),
    minister: t.nullable(
      t.object({ key: t.string(), name: t.string(), perk: perkFields }),
    ),
    election: t.nullable(
      t.object({
        year: t.integer({
          min: 1,
          description: "The SkyBlock year its booth opened.",
        }),
        closes: t.nullable(t.dateTime("When the booth closes.")),
        candidates: t.array(candidateFields),
      }),
    ),
  }),
  errors: ["feed_unavailable"],
  example: {
    response: {
      fetchedAt: "2026-11-22T14:00:00.000Z",
      mayor: {
        key: "fishing",
        name: "Marina",
        perks: [EXAMPLE_PERK],
        termEnds: "2026-11-25T19:15:00.000Z",
      },
      minister: null,
      election: {
        year: 527,
        closes: "2026-11-25T19:15:00.000Z",
        candidates: [{ key: "pets", name: "Diana", votes: 161751, perks: [] }],
      },
    },
  },
  handler: async ({ db }) => {
    const now = Date.now();
    const live = await liveFeeds(db, now);
    const election = live.election;
    const fetchedAt = live.fetchedAt.election;
    if (!election || !fetchedAt)
      throw new ApiError(
        "feed_unavailable",
        "The site hasn't read Hypixel's election yet.",
      );
    const booth = eventBySlug("mayor-election");
    const running = election.running;
    return {
      fetchedAt: fetchedAt.toISOString(),
      mayor: {
        key: election.mayor.key,
        name: election.mayor.name,
        perks: election.mayor.perks.map(toPerk),
        termEnds: iso(mayorTerm(election.elected.year).to),
      },
      minister: election.minister
        ? {
            key: election.minister.key,
            name: election.minister.name,
            perk: toPerk(election.minister.perk),
          }
        : null,
      election: running
        ? {
            year: running.year,
            closes: booth
              ? (toSpan(currentOccurrence(booth, now))?.end ?? null)
              : null,
            candidates: running.candidates.map(toCandidate),
          }
        : null,
    };
  },
});

const electionSummary = t.object({
  year: t.integer({
    min: 1,
    description: "The SkyBlock year its booth opened.",
  }),
  closed: t.boolean({ description: "Whether the votes are final." }),
  mayor: t.nullable(
    t.string({ description: "The winner's key; null while open." }),
  ),
  minister: t.nullable(
    t.string({ description: "The minister's key, when known." }),
  ),
  totalVotes: t.integer({ min: 0 }),
  candidates: t.array(candidateFields),
});
const toSummary = (election: ElectionRecord) => ({
  year: election.year,
  closed: election.closed,
  mayor: election.mayor?.key ?? null,
  minister: election.minister?.key ?? null,
  totalVotes: election.totalVotes,
  candidates: election.candidates.map(toCandidate),
});
const EXAMPLE_ELECTION = {
  year: 526,
  closed: true,
  mayor: "slayer",
  minister: "economist",
  totalVotes: 1323251,
  candidates: [{ key: "slayer", name: "Aatrox", votes: 804446, perks: [] }],
};

export const listSkyblockElections = defineRoute({
  method: "GET",
  path: "/v1/skyblock/elections",
  operationId: "listSkyblockElections",
  group: "skyblock",
  summary: "List elections",
  description:
    "Every mayor election the site has recorded, newest first (the running one included). History starts when the site first read Hypixel's election.",
  auth: "public",
  cacheSeconds: 300,
  response: t.object({
    items: t.array(electionSummary),
    nextCursor: t.nullable(
      t.string({ description: "Always null: the list fits one page." }),
    ),
  }),
  example: { response: { items: [EXAMPLE_ELECTION], nextCursor: null } },
  handler: async ({ db }) => ({
    items: (await listElections(db)).map(toSummary),
    nextCursor: null,
  }),
});

export const getSkyblockElection = defineRoute({
  method: "GET",
  path: "/v1/skyblock/elections/{year}",
  operationId: "getSkyblockElection",
  group: "skyblock",
  summary: "Get an election",
  description:
    "One election: its candidates with their perks and votes, and the votes hour by hour for the hours the site saw it running.",
  auth: "public",
  cacheSeconds: 300,
  params: t.object({ year: t.integer({ min: 1 }) }),
  response: t.object({
    ...electionSummary.shape,
    hours: t.array(
      t.object({
        hour: t.dateTime("The hour's start (UTC); its last reading."),
        votes: t.array(
          t.object({ key: t.string(), votes: t.integer({ min: 0 }) }),
        ),
      }),
    ),
  }),
  errors: ["not_found"],
  example: {
    params: { year: 526 },
    response: {
      ...EXAMPLE_ELECTION,
      hours: [
        {
          hour: "2026-11-22T13:00:00.000Z",
          votes: [{ key: "slayer", votes: 804446 }],
        },
      ],
    },
  },
  handler: async ({ db, params }) => {
    const election = await electionByYear(db, params.year);
    if (!election)
      throw new ApiError(
        "not_found",
        "The site has no record of that election.",
      );
    const points = await electionVotes(db, params.year);
    return {
      ...toSummary(election),
      hours: points.map((point) => ({
        hour: point.hour.toISOString(),
        votes: Object.entries(point.votes).map(([key, votes]) => ({
          key,
          votes,
        })),
      })),
    };
  },
});

export const listSkyblockFireSales = defineRoute({
  method: "GET",
  path: "/v1/skyblock/firesales",
  operationId: "listSkyblockFireSales",
  group: "skyblock",
  summary: "List fire sales",
  description:
    "Fire sales on now or announced, ending soonest first, as the site last read them from Hypixel (every 5 minutes).",
  auth: "public",
  cacheSeconds: 60,
  response: t.object({
    fetchedAt: t.nullable(
      t.dateTime("When the site read them; null before the first read."),
    ),
    items: t.array(
      t.object({
        itemId: t.string({ description: "Hypixel's item ID." }),
        name: t.string({ description: "A name made from the ID." }),
        start: t.dateTime(),
        end: t.dateTime(),
        amount: t.integer({
          min: 0,
          description: "How many are for sale, in all.",
        }),
        price: t.integer({ min: 0, description: "In gems." }),
      }),
    ),
  }),
  example: {
    response: {
      fetchedAt: "2026-11-22T14:00:00.000Z",
      items: [
        {
          itemId: "GLOSSY_MINERAL_SLIMEY",
          name: "Glossy Mineral Slimey",
          start: "2026-11-21T17:00:00.000Z",
          end: "2026-11-25T17:00:00.000Z",
          amount: 4500,
          price: 950,
        },
      ],
    },
  },
  handler: async ({ db }) => {
    const live = await liveFeeds(db, Date.now());
    return {
      fetchedAt: live.fetchedAt.firesales?.toISOString() ?? null,
      items: live.fireSales.map((sale) => ({
        ...sale,
        start: iso(sale.start),
        end: iso(sale.end),
      })),
    };
  },
});

export const getSkyblockBingo = defineRoute({
  method: "GET",
  path: "/v1/skyblock/bingo",
  operationId: "getSkyblockBingo",
  group: "skyblock",
  summary: "Get the Bingo event",
  description:
    "The latest Bingo event Hypixel lists (on now, to come or just ended) and its goals, as the site last read it (every 30 minutes).",
  auth: "public",
  cacheSeconds: 300,
  response: t.object({
    fetchedAt: t.dateTime(),
    id: t.integer(),
    name: t.string(),
    start: t.dateTime(),
    end: t.dateTime(),
    modifier: t.string({ description: 'E.g. "NORMAL".' }),
    goals: t.array(
      t.object({
        id: t.string(),
        name: t.string(),
        description: t.string({ description: "Without § codes." }),
        tiers: t.nullable(
          t.array(t.number(), { description: "A community goal's tiers." }),
        ),
        progress: t.nullable(
          t.number({ description: "A community goal's progress." }),
        ),
      }),
    ),
  }),
  errors: ["feed_unavailable"],
  example: {
    response: {
      fetchedAt: "2026-11-22T14:00:00.000Z",
      id: 59,
      name: "November 2026",
      start: "2026-11-01T12:00:00.000Z",
      end: "2026-11-08T12:00:00.000Z",
      modifier: "NORMAL",
      goals: [
        {
          id: "break_block_ores",
          name: "Operation: Ore",
          description: "Break 10M Ore Blocks.",
          tiers: [2000000, 10000000],
          progress: 30339485,
        },
      ],
    },
  },
  handler: async ({ db }) => {
    const live = await liveFeeds(db, Date.now());
    const bingo = live.bingo;
    const fetchedAt = live.fetchedAt.bingo;
    if (!bingo || !fetchedAt)
      throw new ApiError(
        "feed_unavailable",
        "The site hasn't read Hypixel's Bingo yet.",
      );
    return {
      fetchedAt: fetchedAt.toISOString(),
      id: bingo.id,
      name: bingo.name,
      start: iso(bingo.start),
      end: iso(bingo.end),
      modifier: bingo.modifier,
      goals: bingo.goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        description: stripSectionCodes(goal.lore),
        tiers: goal.tiers,
        progress: goal.progress,
      })),
    };
  },
});
