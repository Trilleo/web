/** How long things may be, and how fast people may post (the admin is exempt). */
const MINUTE_MS = 60_000;

export const FORUM_LIMITS = {
  title: { min: 4, max: 120 },
  body: { max: 20_000 },
  /** Topics and replies together, per person. */
  burst: { count: 6, windowMs: 10 * MINUTE_MS },
  daily: { count: 60, windowMs: 24 * 60 * MINUTE_MS },
  /** Posts waiting for approval, per person. */
  pending: 3,
  /** Topics a forum page lists, and posts a topic page shows. */
  topicsPerPage: 25,
  postsPerPage: 20,
  name: { max: 60 },
  description: { max: 300 },
} as const;
