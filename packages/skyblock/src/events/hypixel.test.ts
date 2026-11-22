import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { skyblockTime } from "./calendar";
import { currentOccurrence, nextOccurrences, scheduleInWords } from "./events";
import {
  itemName,
  mayorTerm,
  readBingo,
  readElection,
  readFireSales,
  readNews,
  voteShares,
  type Election,
} from "./hypixel";
import { mayorEvents, perkEventBySlug, perkHolder } from "./mayor";

/** Hypixel's answers as fetched on 22 November 2026 (Bingo cut to four goals). */
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  );
}

describe("Hypixel's answers", () => {
  it("reads the election: mayor, minister, the last election and the running one", () => {
    const election = readElection(fixture("election"));
    expect(election.mayor.name).toBe("Aatrox");
    expect(election.mayor.perks.map((p) => p.name)).toEqual([
      "SLASHED Pricing",
      "Pathfinder",
    ]);
    expect(election.minister).toMatchObject({
      name: "Diaz",
      perk: { name: "Stock Exchange", minister: true },
    });
    expect(election.elected.year).toBe(526);
    expect(election.elected.candidates[0]?.name).toBe("Aatrox");
    expect(election.running?.year).toBe(527);
    const votes = election.running?.candidates.map((c) => c.votes) ?? [];
    expect(votes).toEqual([...votes].sort((a, b) => b - a));
    const shares = voteShares(election.elected);
    const total = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it("refuses answers it can't use", () => {
    expect(() => readElection({ success: false })).toThrow();
    expect(() => readElection({ success: true, mayor: {} })).toThrow();
    expect(() => readBingo({ success: true })).toThrow();
    expect(() => readNews(null)).toThrow();
  });

  it("reads fire sales, naming items from their IDs", () => {
    expect(readFireSales(fixture("firesales"))).toEqual([
      {
        itemId: "GLOSSY_MINERAL_SLIMEY",
        name: "Glossy Mineral Slimey",
        start: 1795280400000,
        end: 1795626000000,
        amount: 4500,
        price: 950,
      },
    ]);
    expect(
      readFireSales({
        success: true,
        sales: [
          { item_id: "<script>", start: 1, end: 2 },
          { item_id: "PET_SKIN", start: 5, end: 4 },
        ],
      }),
    ).toEqual([]);
    expect(itemName("PET_SKIN_ENDERMAN")).toBe("Pet Skin Enderman");
  });

  it("reads Bingo and its goals", () => {
    const bingo = readBingo(fixture("bingo"));
    expect(bingo.name).toBe("November 2026");
    expect(bingo.end).toBeGreaterThan(bingo.start);
    expect(bingo.goals).toHaveLength(4);
    expect(bingo.goals[0]).toMatchObject({
      name: "Operation: Ore",
      tiers: [2000000, 4000000, 6000000, 8000000, 10000000],
    });
  });

  it("reads news, keeping only links to Hypixel's forum", () => {
    const news = readNews(fixture("news"));
    expect(news[0]).toEqual({
      title: "SkyBlock v0.27.3",
      date: "17th November 2026",
      link: "https://hypixel.net/threads/6169127/",
    });
    expect(
      readNews({
        success: true,
        items: [
          { title: "Bad", link: "javascript:alert(1)" },
          { title: "Elsewhere", link: "https://example.com/" },
        ],
      }),
    ).toEqual([]);
  });
});

describe("the mayor's perks", () => {
  const base = readElection(fixture("election"));
  const withPerk = (perk: string, role: "mayor" | "minister"): Election =>
    role === "mayor"
      ? {
          ...base,
          mayor: {
            ...base.mayor,
            perks: [{ name: perk, description: "", minister: false }],
          },
        }
      : {
          ...base,
          minister: {
            key: "fishing",
            name: "Marina",
            perk: { name: perk, description: "", minister: true },
          },
        };

  it("serves a term from Late Spring 27th for a year", () => {
    expect(mayorTerm(526)).toEqual({
      from: skyblockTime(527, 3, 27),
      to: skyblockTime(528, 3, 27),
    });
  });

  it("adds no events for perks without times", () => {
    expect(mayorEvents(base)).toEqual([]);
    expect(mayorEvents(null)).toEqual([]);
  });

  it("puts a Fishing Festival on the first three days of each month of the term", () => {
    const election = withPerk("Fishing Festival", "minister");
    expect(perkHolder(election, "Fishing Festival")).toEqual({
      name: "Marina",
      role: "minister",
    });
    const [festival] = mayorEvents(election);
    expect(festival?.slug).toBe("fishing-festival");
    if (!festival) return;
    const term = mayorTerm(526);
    expect(currentOccurrence(festival, skyblockTime(527, 5, 2))?.start).toBe(
      skyblockTime(527, 5, 1),
    );
    expect(currentOccurrence(festival, skyblockTime(527, 5, 4))).toBeNull();
    // Nothing before the term, nothing after it.
    expect(currentOccurrence(festival, skyblockTime(527, 3, 2))).toBeNull();
    const all = nextOccurrences(festival, term.from, 100);
    expect(all).toHaveLength(12);
    expect(all.every((o) => o.start >= term.from && o.start < term.to)).toBe(
      true,
    );
    expect(nextOccurrences(festival, term.to, 3)).toEqual([]);
    expect(scheduleInWords(festival)).toBe("The 1st to 3rd of every month");
  });

  it("runs the Mythological Ritual for the whole term", () => {
    const [ritual] = mayorEvents(withPerk("Mythological Ritual", "mayor"));
    expect(ritual).toBeDefined();
    if (!ritual) return;
    const on = currentOccurrence(ritual, skyblockTime(527, 9, 1));
    expect(on?.start).toBe(mayorTerm(526).from);
    expect(on?.end).toBe(mayorTerm(526).to);
    expect(scheduleInWords(ritual)).toBe("All term");
    expect(perkEventBySlug("mythological-ritual")?.perk).toBe(
      "Mythological Ritual",
    );
  });
});
