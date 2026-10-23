/**
 * The API's numbers, in one place: the docs quote them from here, so changing one
 * changes what the docs say.
 */
export const API_LIMITS = {
  /** Requests per minute for requests without a key, per visitor (IP). */
  anonymousPerMinute: 60,
  /** A new app's requests per minute per key. */
  defaultPerMinute: 120,
  /** The most the control panel lets an app have. */
  maxPerMinute: 6000,
  /** Largest JSON body, in bytes. */
  bodyBytes: 64 * 1024,
  /** Keys an app can have that aren't revoked. */
  keysPerApp: 20,
  /** Failed requests are listed in the panel for this long. */
  errorLogDays: 14,
  /** Daily request counts are kept this long. */
  usageDays: 400,
  /** `last_used_at` is written at most this often. */
  lastUsedEveryMs: 60_000,
} as const;
