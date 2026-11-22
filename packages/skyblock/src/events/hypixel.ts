/**
 * Hypixel's keyless SkyBlock endpoints the event timer shows, read into checked,
 * camelCase shapes: the election (mayor, minister, the election that chose them and
 * the one running now), fire sales, Bingo and news. Each reader throws on an answer
 * it can't use, keeps only what it understands, and caps lists, so what the server
 * stores is always safe to show. Texts keep their § codes (text.ts draws them).
 */
import { SB_YEAR_MS, skyblockTime } from "./calendar";

export interface Perk {
  name: string;
  /** With § codes. */
  description: string;
  /** Whether a minister can hold it. */
  minister: boolean;
}

export interface Candidate {
  key: string;
  name: string;
  perks: Perk[];
  votes: number;
}

export interface ElectionRound {
  /** The SkyBlock year the booth opened. */
  year: number;
  /** Most votes first. */
  candidates: Candidate[];
}

export interface Election {
  mayor: { key: string; name: string; perks: Perk[] };
  minister: { key: string; name: string; perk: Perk } | null;
  /** The election the mayor won. */
  elected: ElectionRound;
  /** The election running now, while the booth is open. */
  running: ElectionRound | null;
}

export interface FireSale {
  itemId: string;
  /** From the ID: Hypixel's answer has no name. */
  name: string;
  start: number;
  end: number;
  /** How many are for sale, in all. */
  amount: number;
  /** In gems. */
  price: number;
}

export interface BingoGoal {
  id: string;
  name: string;
  /** With § codes. */
  lore: string;
  /** Community goals have tiers and the community's progress. */
  tiers: number[] | null;
  progress: number | null;
}

export interface Bingo {
  id: number;
  name: string;
  start: number;
  end: number;
  modifier: string;
  goals: BingoGoal[];
}

export interface NewsItem {
  title: string;
  /** As Hypixel writes it: "17th November 2026". */
  date: string;
  link: string;
}

/** Caps on what's kept, whatever Hypixel sends. */
export const FEED_LIMITS = {
  candidates: 10,
  perks: 8,
  fireSales: 20,
  goals: 60,
  news: 20,
  text: 600,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number = FEED_LIMITS.text): string | null =>
  typeof value === "string" && value.trim() !== ""
    ? value.trim().slice(0, max)
    : null;

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function answer(body: unknown, what: string): Record<string, unknown> {
  if (!isRecord(body) || body.success !== true)
    throw new Error(`Hypixel's ${what} didn't answer successfully.`);
  return body;
}

function readPerk(value: unknown, minister = false): Perk | null {
  if (!isRecord(value)) return null;
  const name = text(value.name, 80);
  if (!name) return null;
  return {
    name,
    description: text(value.description) ?? "",
    minister: value.minister === true || minister,
  };
}

const readPerks = (value: unknown): Perk[] =>
  list(value)
    .slice(0, FEED_LIMITS.perks)
    .flatMap((perk) => readPerk(perk) ?? []);

function readCandidate(value: unknown): Candidate | null {
  if (!isRecord(value)) return null;
  const key = text(value.key, 40);
  const name = text(value.name, 40);
  if (!key || !name) return null;
  return {
    key,
    name,
    perks: readPerks(value.perks),
    votes: Math.max(0, Math.round(number(value.votes) ?? 0)),
  };
}

function readRound(value: unknown): ElectionRound | null {
  if (!isRecord(value)) return null;
  const year = number(value.year);
  if (year === null || year < 1) return null;
  const candidates = list(value.candidates)
    .slice(0, FEED_LIMITS.candidates)
    .flatMap((candidate) => readCandidate(candidate) ?? [])
    .sort((a, b) => b.votes - a.votes);
  return candidates.length > 0 ? { year, candidates } : null;
}

/** /v2/resources/skyblock/election. */
export function readElection(body: unknown): Election {
  const root = answer(body, "election");
  const mayor = isRecord(root.mayor) ? root.mayor : null;
  const key = mayor ? text(mayor.key, 40) : null;
  const name = mayor ? text(mayor.name, 40) : null;
  const elected = mayor ? readRound(mayor.election) : null;
  if (!mayor || !key || !name || !elected)
    throw new Error("Hypixel's election has no mayor.");
  const ministerRow = isRecord(mayor.minister) ? mayor.minister : null;
  const ministerKey = ministerRow ? text(ministerRow.key, 40) : null;
  const ministerName = ministerRow ? text(ministerRow.name, 40) : null;
  const ministerPerk = ministerRow ? readPerk(ministerRow.perk, true) : null;
  return {
    mayor: { key, name, perks: readPerks(mayor.perks) },
    minister:
      ministerKey && ministerName && ministerPerk
        ? { key: ministerKey, name: ministerName, perk: ministerPerk }
        : null,
    elected,
    running: readRound(root.current),
  };
}

/** "GLOSSY_MINERAL_SLIMEY" → "Glossy Mineral Slimey". */
export function itemName(id: string): string {
  return id
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** /v2/skyblock/firesales. */
export function readFireSales(body: unknown): FireSale[] {
  const root = answer(body, "fire sales");
  return list(root.sales)
    .slice(0, FEED_LIMITS.fireSales)
    .flatMap((sale): FireSale[] => {
      if (!isRecord(sale)) return [];
      const itemId = text(sale.item_id, 80);
      const start = number(sale.start);
      const end = number(sale.end);
      if (!itemId || !/^[A-Z0-9_:]+$/.test(itemId)) return [];
      if (start === null || end === null || end <= start) return [];
      return [
        {
          itemId,
          name: itemName(itemId),
          start,
          end,
          amount: Math.max(0, Math.round(number(sale.amount) ?? 0)),
          price: Math.max(0, Math.round(number(sale.price) ?? 0)),
        },
      ];
    })
    .sort((a, b) => a.end - b.end);
}

/** /v2/resources/skyblock/bingo. */
export function readBingo(body: unknown): Bingo {
  const root = answer(body, "Bingo");
  const id = number(root.id);
  const name = text(root.name, 80);
  const start = number(root.start);
  const end = number(root.end);
  if (id === null || !name || start === null || end === null || end <= start)
    throw new Error("Hypixel's Bingo has no event.");
  return {
    id,
    name,
    start,
    end,
    modifier: text(root.modifier, 40) ?? "NORMAL",
    goals: list(root.goals)
      .slice(0, FEED_LIMITS.goals)
      .flatMap((goal): BingoGoal[] => {
        if (!isRecord(goal)) return [];
        const goalId = text(goal.id, 80);
        const goalName = text(goal.name, 80);
        if (!goalId || !goalName) return [];
        const tiers = list(goal.tiers).flatMap((tier) => number(tier) ?? []);
        return [
          {
            id: goalId,
            name: goalName,
            lore: text(goal.lore) ?? "",
            tiers: tiers.length > 0 ? tiers : null,
            progress: number(goal.progress),
          },
        ];
      }),
  };
}

/** Only links to Hypixel's own forum are kept. */
const NEWS_LINK = /^https:\/\/hypixel\.net\/[\w\-./?=&%#]*$/;

/** /v2/skyblock/news. */
export function readNews(body: unknown): NewsItem[] {
  const root = answer(body, "news");
  return list(root.items)
    .slice(0, FEED_LIMITS.news)
    .flatMap((item): NewsItem[] => {
      if (!isRecord(item)) return [];
      const title = text(item.title, 120);
      const link = text(item.link, 300);
      if (!title || !link || !NEWS_LINK.test(link)) return [];
      return [{ title, date: text(item.text, 40) ?? "", link }];
    });
}

/**
 * When a mayor elected in an election that opened in `year` serves: from the booth
 * closing (Late Spring 27th of the next year) for a SkyBlock year.
 */
export function mayorTerm(year: number): { from: number; to: number } {
  const from = skyblockTime(year + 1, 3, 27);
  return { from, to: from + SB_YEAR_MS };
}

/** Each candidate's share of the votes, 0–1. */
export function voteShares(round: ElectionRound): Map<string, number> {
  const total = round.candidates.reduce((sum, c) => sum + c.votes, 0);
  return new Map(
    round.candidates.map((c) => [c.key, total > 0 ? c.votes / total : 0]),
  );
}
