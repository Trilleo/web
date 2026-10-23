/**
 * Requests per minute, per key (or per visitor without one), as token buckets kept in
 * this server's memory: a bucket holds up to `limit` requests and refills at `limit`
 * per minute, so short bursts are fine and the long-run rate is the limit. One
 * server, so memory is enough; a restart only forgives everyone once. Buckets idle
 * for a minute are full again, so they're dropped (within two minutes): the privacy
 * page says visitors' hashed IPs stay in memory only that long.
 */

const WINDOW_MS = 60_000;

export interface RateDecision {
  ok: boolean;
  limit: number;
  /** Whole requests left right now. */
  remaining: number;
  /** Seconds until the bucket is full again (ok) or the next request fits (not ok). */
  reset: number;
}

interface Bucket {
  tokens: number;
  at: number;
}

export class RateLimiter {
  readonly #buckets = new Map<string, Bucket>();
  #swept = 0;

  /** Takes one request from `key`'s bucket, if there's room. */
  take(key: string, limit: number, now: number): RateDecision {
    if (now - this.#swept >= WINDOW_MS) this.#sweep(now);
    const rate = limit / WINDOW_MS;
    const bucket = this.#buckets.get(key);
    const tokens = bucket
      ? Math.min(limit, bucket.tokens + (now - bucket.at) * rate)
      : limit;
    if (tokens < 1) {
      this.#buckets.set(key, { tokens, at: now });
      return {
        ok: false,
        limit,
        remaining: 0,
        reset: Math.max(1, Math.ceil((1 - tokens) / rate / 1000)),
      };
    }
    const left = tokens - 1;
    this.#buckets.set(key, { tokens: left, at: now });
    return {
      ok: true,
      limit,
      remaining: Math.floor(left),
      reset: Math.ceil((limit - left) / rate / 1000),
    };
  }

  /** Forgets buckets that have refilled: they'd start full anyway. */
  #sweep(now: number): void {
    this.#swept = now;
    for (const [key, bucket] of this.#buckets)
      if (now - bucket.at >= WINDOW_MS) this.#buckets.delete(key);
  }

  /** How many buckets are held (for tests). */
  get size(): number {
    return this.#buckets.size;
  }
}
