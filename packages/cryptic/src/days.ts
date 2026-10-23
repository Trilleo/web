/** Days: a puzzle belongs to one UTC day, "2026-10-23", which starts at 00:00 UTC. */

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `text` is a real calendar day written as YYYY-MM-DD. */
export function isDay(text: string): boolean {
  const match = DAY.exec(text);
  if (!match) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

/** The UTC day `now` falls on. */
export function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** When the day ends (the next one's start). */
export function dayEnd(day: string): Date {
  return new Date(dayStart(day).getTime() + DAY_MS);
}

export function addDays(day: string, days: number): string {
  return dayOf(new Date(dayStart(day).getTime() + days * DAY_MS));
}
