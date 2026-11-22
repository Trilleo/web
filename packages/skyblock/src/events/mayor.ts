/**
 * Events a mayor's (or minister's) perk adds to the calendar, for as long as they're
 * in office. Only perks whose times Hypixel states are here: Fishing Festival's text
 * says "the first 3 days of each month"; Mythological Ritual runs the whole term.
 * Other perks are shown as Hypixel writes them, without times.
 */
import { SB_DAY_MS } from "./calendar";
import type { SkyBlockEvent } from "./events";
import { mayorTerm, type Election } from "./hypixel";

/** Perk name → the event it adds (without `during`, which the term sets). */
export const PERK_EVENTS: readonly SkyBlockEvent[] = [
  {
    slug: "fishing-festival",
    name: "Fishing Festival",
    category: "mayor",
    perk: "Fishing Festival",
    schedule: { kind: "monthly", days: [1], lengthMs: 3 * SB_DAY_MS },
    where: "Any water",
    warp: null,
    summary: "A special fishing event, the first three days of each month.",
  },
  {
    slug: "mythological-ritual",
    name: "Mythological Ritual",
    category: "mayor",
    perk: "Mythological Ritual",
    // The term starts on Late Spring 27th and lasts a year.
    schedule: {
      kind: "yearly",
      starts: [{ month: 3, day: 27 }],
      lengthDays: 372,
    },
    where: "The Hub",
    warp: "/hub",
    summary: "Diana's mythological creatures: dig up burrows all term.",
  },
];

export function perkEventBySlug(slug: string): SkyBlockEvent | undefined {
  return PERK_EVENTS.find((event) => event.slug === slug);
}

/** Who holds a perk now: the mayor, the minister, or nobody. */
export function perkHolder(
  election: Election,
  perk: string,
): { name: string; role: "mayor" | "minister" } | null {
  if (election.mayor.perks.some((p) => p.name === perk))
    return { name: election.mayor.name, role: "mayor" };
  if (election.minister?.perk.name === perk)
    return { name: election.minister.name, role: "minister" };
  return null;
}

/** The perk events on this term's calendar, limited to the term. */
export function mayorEvents(election: Election | null): SkyBlockEvent[] {
  if (!election) return [];
  const during = mayorTerm(election.elected.year);
  return PERK_EVENTS.flatMap((event) =>
    event.perk && perkHolder(election, event.perk)
      ? [{ ...event, during }]
      : [],
  );
}
