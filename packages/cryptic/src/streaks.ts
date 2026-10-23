/**
 * Streaks count puzzles, not calendar days: a day without a puzzle doesn't break
 * one. Today's puzzle keeps a streak alive until the day ends, so a streak is
 * "current" if it reaches the latest puzzle solved or the one before today's.
 */

export interface Streaks {
  current: number;
  best: number;
}

/**
 * `days`: every puzzle day up to today, oldest first. `solved`: the days the player
 * solved. `today`: the current UTC day.
 */
export function streaks(
  days: readonly string[],
  solved: ReadonlySet<string>,
  today: string,
): Streaks {
  let best = 0;
  let run = 0;
  for (const day of days) {
    run = solved.has(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // Walk back from the newest puzzle; an unsolved one today doesn't end it yet.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i] ?? "";
    if (solved.has(day)) current++;
    else if (day === today && current === 0) continue;
    else break;
  }
  return { current, best };
}
