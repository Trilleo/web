/**
 * The daily cryptic's puzzles (cryptic_puzzles): written and scheduled by the admin
 * in /admin/cryptic/, one per UTC day. Once a puzzle's day has come it's live: its
 * answer, enumeration and day can't change (players' guesses were checked against
 * them) and it can't be deleted. Numbers (#1, #2, …) follow the days.
 */
import {
  crypticAttempts,
  crypticPuzzles,
  type CrypticPuzzle,
  type Database,
} from "@trilleo/db";
import {
  answerFits,
  dayEnd,
  dayOf,
  dayStart,
  enumerationOf,
  formatEnumeration,
  isDay,
  letterCount,
  parseEnumeration,
} from "@trilleo/cryptic";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
} from "drizzle-orm";

export const CRYPTIC_LIMITS = {
  clue: 300,
  answer: 60,
  explanation: 2000,
  setter: 80,
  /** /admin warns (and emails) when fewer days than this, from today, have a puzzle. */
  queueWarnDays: 3,
  /** Guesses per player per minute, on top of the key's own rate limit. */
  guessesPerMinute: 10,
  /** Longest leaderboard page. */
  leaderboard: 50,
  /** Longest archive page. */
  archivePage: 50,
  playerId: 100,
  playerName: 100,
  guess: 100,
} as const;

export interface PuzzleInput {
  clue: string;
  /** Empty: worked out from the answer as written. */
  enumeration: string;
  answer: string;
  explanation: string;
  setter: string;
  /** Empty: a draft, not scheduled. */
  day: string;
}

export interface PuzzleValues {
  clue: string;
  enumeration: string;
  answer: string;
  explanation: string;
  setter: string | null;
  day: string | null;
}

export type PuzzleProblem =
  | "clue"
  | "answer"
  | "enumeration"
  | "fit"
  | "explanation"
  | "setter"
  | "day"
  | "past"
  | "taken"
  | "live";

export const PUZZLE_PROBLEMS: Readonly<Record<PuzzleProblem, string>> = {
  clue: `Write the clue (up to ${String(CRYPTIC_LIMITS.clue)} characters), without the enumeration.`,
  answer: `Give the answer (letters, up to ${String(CRYPTIC_LIMITS.answer)} characters).`,
  enumeration:
    "The enumeration is word lengths like 6, 4,3 or 5-4 (or leave it empty to take it from the answer).",
  fit: "The answer doesn't fit the enumeration: check the word lengths and hyphens.",
  explanation: `Keep the explanation under ${String(CRYPTIC_LIMITS.explanation)} characters.`,
  setter: `Keep the setter's name under ${String(CRYPTIC_LIMITS.setter)} characters.`,
  day: "That isn't a date.",
  past: "Puzzles can't be scheduled for a day that's over.",
  taken: "Another puzzle is on that day.",
  live: "This puzzle is live or over: its answer, enumeration and day stay as they are.",
};

/** The form's values made safe, or what's wrong with them. */
export function checkPuzzleInput(
  input: PuzzleInput,
  today: string,
): { ok: true; value: PuzzleValues } | { ok: false; problem: PuzzleProblem } {
  const clue = input.clue.trim().replace(/\s+/g, " ");
  if (clue.length < 1 || clue.length > CRYPTIC_LIMITS.clue)
    return { ok: false, problem: "clue" };
  const answer = input.answer.trim().replace(/\s+/g, " ").toUpperCase();
  if (
    answer.length < 1 ||
    answer.length > CRYPTIC_LIMITS.answer ||
    !/[A-Z]/.test(answer)
  )
    return { ok: false, problem: "answer" };
  const enumeration = input.enumeration.trim()
    ? parseEnumeration(input.enumeration)
    : enumerationOf(answer);
  if (!enumeration) return { ok: false, problem: "enumeration" };
  if (!answerFits(answer, enumeration)) return { ok: false, problem: "fit" };
  const explanation = input.explanation.trim();
  if (explanation.length > CRYPTIC_LIMITS.explanation)
    return { ok: false, problem: "explanation" };
  const setter = input.setter.trim();
  if (setter.length > CRYPTIC_LIMITS.setter)
    return { ok: false, problem: "setter" };
  const day = input.day.trim();
  if (day && !isDay(day)) return { ok: false, problem: "day" };
  if (day && day < today) return { ok: false, problem: "past" };
  return {
    ok: true,
    value: {
      clue,
      answer,
      enumeration: formatEnumeration(enumeration).slice(1, -1),
      explanation,
      setter: setter || null,
      day: day || null,
    },
  };
}

/** Live: its day has come (today's, or over). */
export function isLive(puzzle: CrypticPuzzle, today: string): boolean {
  return puzzle.day !== null && puzzle.day <= today;
}

async function dayTaken(
  db: Database,
  day: string,
  except: number | null,
): Promise<boolean> {
  const [row] = await db
    .select({ id: crypticPuzzles.id })
    .from(crypticPuzzles)
    .where(eq(crypticPuzzles.day, day));
  return row !== undefined && row.id !== except;
}

export async function createPuzzle(
  db: Database,
  values: PuzzleValues,
  now = new Date(),
): Promise<
  { ok: true; puzzle: CrypticPuzzle } | { ok: false; problem: PuzzleProblem }
> {
  if (values.day && (await dayTaken(db, values.day, null)))
    return { ok: false, problem: "taken" };
  const [puzzle] = await db
    .insert(crypticPuzzles)
    .values({ ...values, createdAt: now, updatedAt: now })
    .returning();
  if (!puzzle) throw new Error("The puzzle wasn't saved.");
  return { ok: true, puzzle };
}

/**
 * Saves changes. A live puzzle keeps its answer, enumeration and day (asking to
 * change them is refused); its clue, explanation and setter can still be fixed.
 */
export async function updatePuzzle(
  db: Database,
  puzzle: CrypticPuzzle,
  values: PuzzleValues,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; problem: PuzzleProblem }> {
  if (isLive(puzzle, dayOf(now))) {
    if (
      values.answer !== puzzle.answer ||
      values.enumeration !== puzzle.enumeration ||
      values.day !== puzzle.day
    )
      return { ok: false, problem: "live" };
  } else if (values.day && (await dayTaken(db, values.day, puzzle.id))) {
    return { ok: false, problem: "taken" };
  }
  await db
    .update(crypticPuzzles)
    .set({ ...values, updatedAt: now })
    .where(eq(crypticPuzzles.id, puzzle.id));
  return { ok: true };
}

/** Deletes a puzzle that isn't live yet. */
export async function deletePuzzle(
  db: Database,
  puzzle: CrypticPuzzle,
  now = new Date(),
): Promise<boolean> {
  if (isLive(puzzle, dayOf(now))) return false;
  await db.delete(crypticPuzzles).where(eq(crypticPuzzles.id, puzzle.id));
  return true;
}

export async function getPuzzle(
  db: Database,
  id: number,
): Promise<CrypticPuzzle | undefined> {
  const [puzzle] = await db
    .select()
    .from(crypticPuzzles)
    .where(eq(crypticPuzzles.id, id));
  return puzzle;
}

export async function puzzleOn(
  db: Database,
  day: string,
): Promise<CrypticPuzzle | undefined> {
  const [puzzle] = await db
    .select()
    .from(crypticPuzzles)
    .where(eq(crypticPuzzles.day, day));
  return puzzle;
}

/** A scheduled puzzle's number: how many puzzle days there are up to its own. */
export async function puzzleNumber(db: Database, day: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(crypticPuzzles)
    .where(lte(crypticPuzzles.day, day));
  return row?.n ?? 0;
}

/** Every scheduled day's number (the admin's lists, which run ahead of today). */
export async function puzzleNumbers(
  db: Database,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ day: crypticPuzzles.day })
    .from(crypticPuzzles)
    .where(isNotNull(crypticPuzzles.day))
    .orderBy(asc(crypticPuzzles.day));
  return new Map(
    rows.flatMap((row, index) =>
      row.day ? [[row.day, index + 1] as const] : [],
    ),
  );
}

/** Every puzzle day up to `today`, oldest first (for numbers and streaks). */
export async function puzzleDays(
  db: Database,
  today: string,
): Promise<string[]> {
  const rows = await db
    .select({ day: crypticPuzzles.day })
    .from(crypticPuzzles)
    .where(lte(crypticPuzzles.day, today))
    .orderBy(asc(crypticPuzzles.day));
  return rows.flatMap((row) => (row.day ? [row.day] : []));
}

/** Past puzzles (before `today`), newest first, before `before` if given. */
export async function pastPuzzles(
  db: Database,
  today: string,
  limit: number,
  before: string | null,
): Promise<CrypticPuzzle[]> {
  return db
    .select()
    .from(crypticPuzzles)
    .where(
      and(
        lt(crypticPuzzles.day, before && before < today ? before : today),
        isNotNull(crypticPuzzles.day),
      ),
    )
    .orderBy(desc(crypticPuzzles.day))
    .limit(limit);
}

/** A puzzle as the API shows it: the answer and explanation only once its day is over. */
export interface PublicPuzzle {
  number: number;
  date: string;
  clue: string;
  enumeration: string;
  letters: number;
  setter: string | null;
  opensAt: string;
  closesAt: string;
  revealed: boolean;
  answer: string | null;
  explanation: string | null;
}

export function publicPuzzle(
  puzzle: CrypticPuzzle & { day: string },
  number: number,
  today: string,
): PublicPuzzle {
  const enumeration = parseEnumeration(puzzle.enumeration);
  const revealed = puzzle.day < today;
  return {
    number,
    date: puzzle.day,
    clue: puzzle.clue,
    enumeration: enumeration
      ? formatEnumeration(enumeration)
      : `(${puzzle.enumeration})`,
    letters: enumeration ? letterCount(enumeration) : 0,
    setter: puzzle.setter,
    opensAt: dayStart(puzzle.day).toISOString(),
    closesAt: dayEnd(puzzle.day).toISOString(),
    revealed,
    answer: revealed ? puzzle.answer : null,
    explanation: revealed ? puzzle.explanation || null : null,
  };
}

/** How many days in a row, from today, have a puzzle. */
export async function daysCovered(
  db: Database,
  today: string,
): Promise<number> {
  const rows = await db
    .select({ day: crypticPuzzles.day })
    .from(crypticPuzzles)
    .where(gte(crypticPuzzles.day, today))
    .orderBy(asc(crypticPuzzles.day));
  let covered = 0;
  let expected = dayStart(today).getTime();
  for (const { day } of rows) {
    if (!day || dayStart(day).getTime() !== expected) break;
    covered++;
    expected += 24 * 60 * 60 * 1000;
  }
  return covered;
}

export interface PuzzleStats {
  players: number;
  solvers: number;
  averageTries: number | null;
}

export interface AdminPuzzle {
  puzzle: CrypticPuzzle;
  stats: PuzzleStats;
}

/** Players, solvers and average tries per puzzle, across every app. */
async function statsFor(
  db: Database,
  ids: readonly number[],
): Promise<Map<number, PuzzleStats>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      puzzleId: crypticAttempts.puzzleId,
      players: count(),
      solvers: count(crypticAttempts.solvedAt),
      solvedTries:
        sql<number>`coalesce(sum(case when ${crypticAttempts.solvedAt} is not null then ${crypticAttempts.tries} end), 0)`.mapWith(
          Number,
        ),
    })
    .from(crypticAttempts)
    .where(inArray(crypticAttempts.puzzleId, [...ids]))
    .groupBy(crypticAttempts.puzzleId);
  return new Map(
    rows.map((row) => [
      row.puzzleId,
      {
        players: row.players,
        solvers: row.solvers,
        averageTries:
          row.solvers > 0
            ? Math.round((row.solvedTries / row.solvers) * 10) / 10
            : null,
      },
    ]),
  );
}

const NO_STATS: PuzzleStats = { players: 0, solvers: 0, averageTries: null };

export interface CrypticOverview {
  upcoming: CrypticPuzzle[];
  drafts: CrypticPuzzle[];
  past: AdminPuzzle[];
  today: AdminPuzzle | null;
  covered: number;
}

/** The admin's page: today's, the queue ahead, drafts, and recent days with numbers. */
export async function crypticOverview(
  db: Database,
  today: string,
  pastLimit = 30,
): Promise<CrypticOverview> {
  const upcoming = await db
    .select()
    .from(crypticPuzzles)
    .where(gte(crypticPuzzles.day, today))
    .orderBy(asc(crypticPuzzles.day));
  const drafts = await db
    .select()
    .from(crypticPuzzles)
    .where(isNull(crypticPuzzles.day))
    .orderBy(desc(crypticPuzzles.updatedAt));
  const past = await pastPuzzles(db, today, pastLimit, null);
  const current = upcoming[0]?.day === today ? upcoming[0] : undefined;
  const stats = await statsFor(db, [
    ...past.map((puzzle) => puzzle.id),
    ...(current ? [current.id] : []),
  ]);
  return {
    upcoming: upcoming.filter((puzzle) => puzzle !== current),
    drafts,
    past: past.map((puzzle) => ({
      puzzle,
      stats: stats.get(puzzle.id) ?? NO_STATS,
    })),
    today: current
      ? { puzzle: current, stats: stats.get(current.id) ?? NO_STATS }
      : null,
    covered: await daysCovered(db, today),
  };
}

export async function puzzleStats(
  db: Database,
  id: number,
): Promise<PuzzleStats> {
  return (await statsFor(db, [id])).get(id) ?? NO_STATS;
}

/** The editor's fields. */
export function puzzleInputFromForm(form: FormData): PuzzleInput {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    clue: text("clue"),
    enumeration: text("enumeration"),
    answer: text("answer"),
    explanation: text("explanation"),
    setter: text("setter"),
    day: text("day"),
  };
}
