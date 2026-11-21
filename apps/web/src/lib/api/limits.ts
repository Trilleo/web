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

/** Personal tokens and device links (user-tokens.ts, device.ts); the docs quote them. */
export const USER_TOKEN_LIMITS = {
  /** Tokens an account can have that aren't revoked. */
  perUser: 20,
  /** Requests per minute per token. */
  perMinute: 60,
  /** Longest name, in characters (a token's, or a program's on a device link). */
  nameLength: 60,
  /** Expiry choices for a token made by hand, in days (null: never). */
  expiryDays: [30, 90, 365, null] as readonly (number | null)[],
} as const;

export const DEVICE_LIMITS = {
  /** How long a device link waits to be approved. */
  codeMinutes: 10,
  /** Seconds a program waits between polls; polling faster answers `slow_down`. */
  intervalSeconds: 5,
  /** Device links started per minute per visitor (IP). */
  startsPerMinute: 5,
  /** Device links waiting at once, site-wide. */
  maxWaiting: 1000,
  /** Wrong codes someone can type on /link/ in an hour before it stops looking. */
  wrongCodesPerHour: 10,
} as const;
