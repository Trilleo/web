/**
 * mulberry32, as Skygrid uses it: the state lives in the run, so replaying the same
 * inputs from the same seed builds the same course.
 */
export function random(holder: { seed: number }): number {
  let t = (holder.seed = (holder.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** One of `items`, chosen by weight. */
export function pick<T>(
  holder: { seed: number },
  items: readonly (readonly [T, number])[],
): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random(holder) * total;
  for (const [item, weight] of items) {
    roll -= weight;
    if (roll < 0) return item;
  }
  const last = items.at(-1);
  if (!last) throw new Error("pick() needs at least one item");
  return last[0];
}
