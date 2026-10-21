/**
 * Reactions, reputation (points, ranks, badges), tags and prefixes, and what people
 * are told about: the fixed lists and the arithmetic, pure so they're tested alone.
 */

// ---------------------------------------------------------------------------
// Reactions

/** One reaction per person per post; picking another replaces it. */
export const REACTIONS = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "laugh", emoji: "😂", label: "Funny" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "thinking", emoji: "🤔", label: "Thinking" },
  { key: "eyes", emoji: "👀", label: "Looking" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];

export function isReaction(value: string): value is ReactionKey {
  return REACTIONS.some((reaction) => reaction.key === value);
}

// ---------------------------------------------------------------------------
// Reputation

/** What earns points. Changing these re-scores everyone the next time they're counted. */
export const POINTS = {
  /** Each published post (topics included). */
  post: 1,
  /** Each reaction someone else gave to one of their published posts. */
  reactionReceived: 2,
  /** Each of their answers accepted in a Q&A topic. */
  acceptedAnswer: 15,
} as const;

/** What someone has done in the forum, as counted from the rows. */
export interface ForumStats {
  posts: number;
  topics: number;
  reactionsReceived: number;
  acceptedAnswers: number;
}

export function pointsFor(stats: ForumStats): number {
  return (
    stats.posts * POINTS.post +
    stats.reactionsReceived * POINTS.reactionReceived +
    stats.acceptedAnswers * POINTS.acceptedAnswer
  );
}

export interface Rank {
  name: string;
  minPoints: number;
}

/** The ranks the migration starts with; the admin edits them at /admin/forum/ranks/. */
export const DEFAULT_RANKS: readonly Rank[] = [
  { name: "Newcomer", minPoints: 0 },
  { name: "Regular", minPoints: 25 },
  { name: "Contributor", minPoints: 100 },
  { name: "Expert", minPoints: 400 },
  { name: "Legend", minPoints: 1000 },
];

/** The highest rank someone's points reach (null when there are no ranks). */
export function rankFor(points: number, ranks: readonly Rank[]): Rank | null {
  let best: Rank | null = null;
  for (const rank of ranks)
    if (points >= rank.minPoints && (!best || rank.minPoints >= best.minPoints))
      best = rank;
  return best;
}

const YEAR_MS = 365 * 24 * 60 * 60_000;

/** Badges, earned once and kept. */
export const BADGES = [
  {
    key: "first-post",
    name: "First post",
    description: "Wrote their first post.",
    earned: (stats: ForumStats) => stats.posts >= 1,
  },
  {
    key: "conversation-starter",
    name: "Conversation starter",
    description: "Started 10 topics.",
    earned: (stats: ForumStats) => stats.topics >= 10,
  },
  {
    key: "prolific",
    name: "Prolific",
    description: "Wrote 100 posts.",
    earned: (stats: ForumStats) => stats.posts >= 100,
  },
  {
    key: "helpful",
    name: "Helpful",
    description: "Had an answer accepted.",
    earned: (stats: ForumStats) => stats.acceptedAnswers >= 1,
  },
  {
    key: "well-liked",
    name: "Well liked",
    description: "Received 50 reactions.",
    earned: (stats: ForumStats) => stats.reactionsReceived >= 50,
  },
  {
    key: "one-year",
    name: "One year here",
    description: "Has had an account for a year, and posted.",
    earned: (stats: ForumStats, joinedAt: Date, now: Date) =>
      stats.posts >= 1 && now.getTime() - joinedAt.getTime() >= YEAR_MS,
  },
] as const;

export type BadgeKey = (typeof BADGES)[number]["key"];

export function badgeInfo(key: string) {
  return BADGES.find((badge) => badge.key === key);
}

/** The badges these stats have earned. */
export function earnedBadges(
  stats: ForumStats,
  joinedAt: Date,
  now: Date,
): BadgeKey[] {
  return BADGES.filter((badge) => badge.earned(stats, joinedAt, now)).map(
    (badge) => badge.key,
  );
}

// ---------------------------------------------------------------------------
// Tags and prefixes

export const MAX_TAGS = 5;
export const TAG_MAX = 30;

/** A tag as stored: lower-case letters, digits and single hyphens. "" if nothing's left. */
export function normalizeTag(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TAG_MAX)
    .replace(/-+$/, "");
}

/** Tags typed as "a, b c" (commas or spaces): normalized, each once, at most MAX_TAGS. */
export function parseTags(value: string): string[] {
  const out: string[] = [];
  for (const part of value.split(/[,\s]+/)) {
    const tag = normalizeTag(part);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** How a prefix is drawn: on the accent, in ink, or outlined. */
export const PREFIX_STYLES = ["accent", "ink", "outline"] as const;
export type PrefixStyle = (typeof PREFIX_STYLES)[number];

export function isPrefixStyle(value: string): value is PrefixStyle {
  return (PREFIX_STYLES as readonly string[]).includes(value);
}

export const PREFIX_MAX = 20;

// ---------------------------------------------------------------------------
// Notifications

export const NOTIFICATION_KINDS = {
  reply: "replied in a topic you watch",
  topic: "started a topic in a forum you watch",
  mention: "mentioned you",
  quote: "quoted you",
  reaction: "reacted to your post",
  accepted: "accepted your answer",
  message: "sent you a message",
  "poll-closed": "’s poll closed",
} as const;

export type NotificationKind = keyof typeof NOTIFICATION_KINDS;

/** Kinds that may be emailed (reactions never are). */
export const EMAILED_KINDS: ReadonlySet<NotificationKind> = new Set([
  "reply",
  "topic",
  "mention",
  "quote",
  "accepted",
  "message",
]);

export const EMAIL_FREQUENCIES = {
  instant: "As it happens",
  daily: "A daily digest",
  weekly: "A weekly digest",
  off: "Never",
} as const;

export type EmailFrequency = keyof typeof EMAIL_FREQUENCIES;

export function isEmailFrequency(value: string): value is EmailFrequency {
  return Object.hasOwn(EMAIL_FREQUENCIES, value);
}

export const DIGEST_GAP_MS = {
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
} as const;

export const SIGNATURE_MAX = 200;

/** Post ids a post quotes (the links `quoteFor` writes). */
export function quotedPostIds(body: string): number[] {
  const ids = new Set<number>();
  for (const match of body.matchAll(
    /^>\s*\*\*\[[^\]]*\]\(\/forum\/post\/(\d{1,10})\/\)/gm,
  ))
    if (match[1]) ids.add(Number(match[1]));
  return [...ids];
}
