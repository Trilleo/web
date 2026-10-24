/**
 * How much chart building may happen (lib/chunithm/build.ts), in a module of its own
 * so pages that quote the numbers (the privacy policy) don't load the builder.
 */
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const BUILD_LIMITS = {
  /** Builds started per hour, all together. */
  perHour: 60,
  /** Waiting builds; past this, asking for another is "busy". */
  maxQueued: 30,
  /** New builds one visitor may start in an hour. */
  perVisitorHourly: 20,
  /** A build "building" this long was cut off (a restart): it's tried again. */
  staleMs: 10 * MINUTE_MS,
  /** Waits before trying a failed build again, by failures in a row (the last repeats). */
  retryDelaysMs: [HOUR_MS, 6 * HOUR_MS, DAY_MS],
  /** sdvx.in's notes layers run to about 15 MB. */
  maxLayerBytes: 40 * 1024 * 1024,
  /** A ready chart is compared with sdvx.in again after this long. */
  checkAfterDays: 30,
};
