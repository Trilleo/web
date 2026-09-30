/**
 * mulberry32: small, fast, and good enough for drops. The state lives in the save,
 * so replaying the same actions gives the same drops on the server.
 */
export function random(holder: { seed: number }): number {
  let t = (holder.seed = (holder.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Whole part always, fractional part as a chance: 2.3 → 2, or 3 three times in ten. */
export function roll(holder: { seed: number }, amount: number): number {
  const whole = Math.floor(amount);
  return whole + (random(holder) < amount - whole ? 1 : 0);
}
