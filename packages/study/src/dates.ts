/**
 * Counting days to exams, in China's time zone (where the classes are). Kept apart
 * from the rest so the browser can import it alone (the exam countdowns).
 */

const BEIJING = 8 * 3600_000;

/** Whole days from `now` to `date` (YYYY-MM-DD): 0 on the day, negative once it's past. */
export function daysUntil(date: string, now: Date): number {
  const exam = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(
    `${new Date(now.getTime() + BEIJING).toISOString().slice(0, 10)}T00:00:00Z`,
  );
  return Math.round((exam - today) / 86_400_000);
}

/** "today", "tomorrow", "in 12 days", "past". */
export function daysLabel(days: number): string {
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${String(days)} days`;
}
