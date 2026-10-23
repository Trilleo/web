/**
 * The Daily cryptic group: today's clue, past answers, guesses (checked and scored by
 * the site), and each app's own players and leaderboards. Logic lives in lib/cryptic/.
 */
import type { CrypticPuzzle, Database } from "@trilleo/db";
import { dayOf, isDay } from "@trilleo/cryptic";
import {
  BOARDS,
  attemptOn,
  dayLeaderboard,
  deletePlayer,
  findPlayer,
  leaderboard,
  playerStats,
  recordGuess,
} from "../../cryptic/players";
import {
  CRYPTIC_LIMITS,
  pastPuzzles,
  publicPuzzle,
  puzzleNumber,
  puzzleOn,
  type PublicPuzzle,
} from "../../cryptic/puzzles";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

export const EXAMPLE_PUZZLE: PublicPuzzle = {
  number: 42,
  date: "2026-10-23",
  clue: "Silent arrangement to hear",
  enumeration: "(6)",
  letters: 6,
  setter: "Trilleo",
  opensAt: "2026-10-23T00:00:00.000Z",
  closesAt: "2026-10-24T00:00:00.000Z",
  revealed: false,
  answer: null,
  explanation: null,
};

export const EXAMPLE_REVEALED: PublicPuzzle = {
  ...EXAMPLE_PUZZLE,
  number: 41,
  date: "2026-10-22",
  opensAt: "2026-10-22T00:00:00.000Z",
  closesAt: "2026-10-23T00:00:00.000Z",
  revealed: true,
  answer: "LISTEN",
  explanation:
    "An anagram (“arrangement”) of SILENT; the definition is “hear”.",
};

export const puzzleSchema = t.object({
  number: t.integer({
    description:
      "The puzzle's number (#1 was the first day), to show as “Cryptic #42”.",
  }),
  date: t.date("The UTC day it's for."),
  clue: t.string({ description: "The clue, without the enumeration." }),
  enumeration: t.string({
    description:
      'Letters per word, to print after the clue: "(6)", "(4,3)" (two words), "(5-4)" (hyphenated).',
  }),
  letters: t.integer({
    description: "How many letters the answer has in all.",
  }),
  setter: t.nullable(t.string({ description: "Who set it, if credited." })),
  opensAt: t.dateTime(
    "When its day starts (00:00 UTC): from then it's today's.",
  ),
  closesAt: t.dateTime("When its day ends: then the answer is revealed."),
  revealed: t.boolean({
    description: "Whether its day is over (answer and explanation shown).",
  }),
  answer: t.nullable(
    t.string({
      description:
        'The answer in capitals, as written ("ICE CREAM"); null until revealed.',
    }),
  ),
  explanation: t.nullable(
    t.string({
      description:
        "How the clue works, in plain text (it may use simple Markdown: *italics*, **bold**); null until revealed, or if none was written.",
    }),
  ),
});

const dateParams = t.object({
  date: t.date("A UTC day, YYYY-MM-DD."),
});

const playerParams = t.object({
  id: t.string({
    min: 1,
    max: CRYPTIC_LIMITS.playerId,
    description: "The app's own ID for the player (a Discord user ID).",
  }),
});

const playerSchema = t.object({
  id: t.string({ description: "The app's own ID for the player." }),
  name: t.string({ description: "The name last sent for them." }),
});

const limitQuery = (fallback: number, max: number) =>
  t.optional(
    t.integer({
      min: 1,
      max,
      description: `How many to return (default ${String(fallback)}).`,
    }),
  );

function today(now: Date): string {
  return dayOf(now);
}

/** The puzzle for a day that has come, or the error to answer with. */
async function puzzleForDay(
  db: Database,
  date: string,
  now: Date,
): Promise<CrypticPuzzle & { day: string }> {
  if (!isDay(date))
    throw new ApiError(
      "invalid_input",
      "`date` must be a real day, YYYY-MM-DD.",
      {
        problems: [
          { path: "date", message: "`date` must be a real day, YYYY-MM-DD." },
        ],
      },
    );
  const puzzle = date <= today(now) ? await puzzleOn(db, date) : undefined;
  if (!puzzle?.day)
    throw new ApiError(
      "no_puzzle",
      date === today(now)
        ? "There's no cryptic today."
        : "There's no cryptic for that day.",
    );
  return { ...puzzle, day: puzzle.day };
}

async function show(
  db: Database,
  puzzle: CrypticPuzzle & { day: string },
  now: Date,
): Promise<PublicPuzzle> {
  return publicPuzzle(puzzle, await puzzleNumber(db, puzzle.day), today(now));
}

function callerApp(caller: { app: { id: number } } | null): number {
  if (!caller) throw new Error("Cryptic routes need a key.");
  return caller.app.id;
}

export const getCrypticToday = defineRoute({
  method: "GET",
  path: "/v1/cryptic/today",
  operationId: "getCrypticToday",
  group: "cryptic",
  summary: "Get today's clue",
  description:
    "Today's puzzle (the UTC day), without its answer. A new one starts at 00:00 UTC; ask once a day, a little after midnight, and keep it. If no puzzle was set for today the answer is `404 no_puzzle`: post nothing rather than an older clue.",
  auth: "key",
  scope: "cryptic:read",
  response: puzzleSchema,
  errors: ["no_puzzle"],
  example: { response: EXAMPLE_PUZZLE },
  handler: async ({ db, now }) =>
    show(db, await puzzleForDay(db, today(now), now), now),
});

export const getCrypticDay = defineRoute({
  method: "GET",
  path: "/v1/cryptic/days/{date}",
  operationId: "getCrypticDay",
  group: "cryptic",
  summary: "Get one day's puzzle",
  description:
    "The puzzle for a day: today's (as `GET /v1/cryptic/today`) or a past one, with its answer and explanation. Days to come, and days without a puzzle, are `404 no_puzzle`. Ask for yesterday's to post “yesterday's answer was …”.",
  auth: "key",
  scope: "cryptic:read",
  params: dateParams,
  response: puzzleSchema,
  errors: ["no_puzzle"],
  example: { params: { date: "2026-10-22" }, response: EXAMPLE_REVEALED },
  handler: async ({ db, params, now }) =>
    show(db, await puzzleForDay(db, params.date, now), now),
});

function encodeCursor(day: string): string {
  return Buffer.from(`before:${day}`).toString("base64url");
}

function decodeCursor(cursor: string): string {
  const text = Buffer.from(cursor, "base64url").toString();
  const day = text.startsWith("before:") ? text.slice("before:".length) : "";
  if (!isDay(day))
    throw new ApiError(
      "invalid_input",
      "That cursor isn't one this route gave.",
      {
        problems: [
          { path: "cursor", message: "That cursor isn't one this route gave." },
        ],
      },
    );
  return day;
}

export const listCrypticArchive = defineRoute({
  method: "GET",
  path: "/v1/cryptic/archive",
  operationId: "listCrypticArchive",
  group: "cryptic",
  summary: "List past puzzles",
  description:
    "Puzzles whose day is over, newest first, with their answers. Pages with `nextCursor` (see Conventions). Guessing at one of these is practice: see the guesses route.",
  auth: "key",
  scope: "cryptic:read",
  query: t.object({
    limit: limitQuery(20, CRYPTIC_LIMITS.archivePage),
    cursor: t.optional(
      t.string({ max: 100, description: "`nextCursor` from the page before." }),
    ),
  }),
  response: t.object({
    items: t.array(puzzleSchema),
    nextCursor: t.nullable(
      t.string({ description: "For the next page; null on the last." }),
    ),
  }),
  example: {
    query: { limit: 1 },
    response: {
      items: [EXAMPLE_REVEALED],
      nextCursor: "YmVmb3JlOjIwMjYtMTAtMjI",
    },
  },
  handler: async ({ db, query, now }) => {
    const limit = query.limit ?? 20;
    const before = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await pastPuzzles(db, today(now), limit + 1, before);
    const page = rows.slice(0, limit);
    const items = await Promise.all(
      page.map((puzzle) => show(db, { ...puzzle, day: puzzle.day ?? "" }, now)),
    );
    const last = page.at(-1);
    return {
      items,
      nextCursor:
        rows.length > limit && last?.day ? encodeCursor(last.day) : null,
    };
  },
});

export const postCrypticGuess = defineRoute({
  method: "POST",
  path: "/v1/cryptic/days/{date}/guesses",
  operationId: "postCrypticGuess",
  group: "cryptic",
  summary: "Send a player's guess",
  description: `Checks a guess for one of the app's players and keeps score. Players are the app's own: send its ID for them (a Discord user ID) and the name to show on leaderboards (the latest name sent wins). They're made on their first guess.

- **Today's puzzle:** the guess counts. Each guess with the right number of letters is a try, until the player solves it; after that, guesses are checked but change nothing (\`alreadySolved\`). Tries are unlimited.
- **A past puzzle:** practice. The guess is checked and nothing is kept (\`scored: false\`).
- **Only letters count:** case, spaces, hyphens, apostrophes and accents are ignored, so "ice-cream" matches ICE CREAM. A guess with the wrong number of letters is \`400 guess_wrong_length\` and isn't a try.

Each player may guess ${String(CRYPTIC_LIMITS.guessesPerMinute)} times a minute; more is \`429 rate_limited\` (on top of the key's own limit). The answer is never in this response: it's in the day's puzzle once the day is over.`,
  auth: "key",
  scope: "cryptic:play",
  params: dateParams,
  body: t.object({
    player: t.object({
      id: t.string({
        min: 1,
        max: CRYPTIC_LIMITS.playerId,
        description: "The app's own ID for the player (a Discord user ID).",
      }),
      name: t.string({
        min: 1,
        max: CRYPTIC_LIMITS.playerName,
        description: "The name to show for them.",
      }),
    }),
    guess: t.string({
      min: 1,
      max: CRYPTIC_LIMITS.guess,
      description: "What they guessed, as typed.",
    }),
  }),
  response: t.object({
    correct: t.boolean({ description: "Whether this guess is the answer." }),
    scored: t.boolean({
      description: "Whether it counted: today's puzzle, not already solved.",
    }),
    tries: t.nullable(
      t.integer({
        description:
          "Their tries at today's puzzle so far, this one included; null for practice.",
      }),
    ),
    solved: t.boolean({
      description:
        "Whether they've solved it (for practice: whether this guess did).",
    }),
    alreadySolved: t.boolean({
      description:
        "They'd solved today's puzzle before this guess, so it changed nothing.",
    }),
    rank: t.nullable(
      t.integer({
        description:
          "Once solved: their place among the app's solvers today (fewest tries, then soonest).",
      }),
    ),
  }),
  errors: ["no_puzzle", "guess_wrong_length"],
  example: {
    params: { date: "2026-10-23" },
    body: {
      player: { id: "123456789012345678", name: "Ada" },
      guess: "listen",
    },
    response: {
      correct: true,
      scored: true,
      tries: 2,
      solved: true,
      alreadySolved: false,
      rank: 3,
    },
  },
  handler: async ({ db, params, body, caller, limiter, now }) => {
    const appId = callerApp(caller);
    const puzzle = await puzzleForDay(db, params.date, now);
    // Per player, apart from the key's own bucket.
    const rate = limiter.take(
      `cryptic-guess:${String(appId)}:${body.player.id}`,
      CRYPTIC_LIMITS.guessesPerMinute,
      now.getTime(),
    );
    if (!rate.ok)
      throw new ApiError(
        "rate_limited",
        `Too many guesses from this player: try again in ${String(rate.reset)} s.`,
        { retryAfter: rate.reset },
      );
    const result = await recordGuess(db, {
      appId,
      player: {
        id: body.player.id,
        name: body.player.name.trim() || body.player.id,
      },
      puzzle,
      guess: body.guess,
      today: today(now),
      now,
    });
    if (result.kind === "length")
      throw new ApiError(
        "guess_wrong_length",
        `The answer has ${String(result.letters)} letters; that guess has ${String(result.got)}.`,
        { letters: result.letters, got: result.got },
      );
    return {
      correct: result.correct,
      scored: result.scored,
      tries: result.tries,
      solved: result.solved,
      alreadySolved: result.alreadySolved,
      rank: result.rank,
    };
  },
});

export const getCrypticDayLeaderboard = defineRoute({
  method: "GET",
  path: "/v1/cryptic/days/{date}/leaderboard",
  operationId: "getCrypticDayLeaderboard",
  group: "cryptic",
  summary: "Get one day's leaderboard",
  description:
    "The app's players who solved a day's puzzle, best first: fewest tries, then soonest. Works for today (as it stands) and past days. Other apps' players aren't included.",
  auth: "key",
  scope: "cryptic:read",
  params: dateParams,
  query: t.object({ limit: limitQuery(10, CRYPTIC_LIMITS.leaderboard) }),
  response: t.object({
    date: t.date(),
    number: t.integer({ description: "The puzzle's number." }),
    players: t.integer({
      description: "The app's players who guessed at it on its day.",
    }),
    solvers: t.integer({ description: "Of those, how many solved it." }),
    items: t.array(
      t.object({
        rank: t.integer(),
        player: playerSchema,
        tries: t.integer(),
        solvedAt: t.dateTime(),
        seconds: t.integer({ description: "From 00:00 UTC to the solve." }),
      }),
    ),
  }),
  errors: ["no_puzzle"],
  example: {
    params: { date: "2026-10-23" },
    query: { limit: 1 },
    response: {
      date: "2026-10-23",
      number: 42,
      players: 9,
      solvers: 6,
      items: [
        {
          rank: 1,
          player: { id: "123456789012345678", name: "Ada" },
          tries: 1,
          solvedAt: "2026-10-23T07:41:09.000Z",
          seconds: 27669,
        },
      ],
    },
  },
  handler: async ({ db, params, query, caller, now }) => {
    const puzzle = await puzzleForDay(db, params.date, now);
    const board = await dayLeaderboard(
      db,
      callerApp(caller),
      puzzle,
      query.limit ?? 10,
    );
    return {
      date: puzzle.day,
      number: await puzzleNumber(db, puzzle.day),
      ...board,
    };
  },
});

const statsFields = {
  solved: t.integer({ description: "Puzzles solved on their day." }),
  played: t.integer({ description: "Puzzles guessed at on their day." }),
  currentStreak: t.integer({
    description:
      "Puzzles solved in a row up to now. Days without a puzzle don't break it, and today's unsolved puzzle doesn't either until the day ends.",
  }),
  bestStreak: t.integer({ description: "The longest run ever." }),
  averageTries: t.nullable(
    t.number({
      description:
        "Tries per solved puzzle, to one decimal; null before the first.",
    }),
  ),
};

export const getCrypticLeaderboard = defineRoute({
  method: "GET",
  path: "/v1/cryptic/leaderboard",
  operationId: "getCrypticLeaderboard",
  group: "cryptic",
  summary: "Get the all-time leaderboard",
  description:
    "The app's players who've solved at least one puzzle. `streak`: by current streak, then best streak, then puzzles solved. `solved`: by puzzles solved, then fewer tries on average.",
  auth: "key",
  scope: "cryptic:read",
  query: t.object({
    board: t.optional(
      t.enum(BOARDS, {
        description: 'Which order: "streak" (default) or "solved".',
      }),
    ),
    limit: limitQuery(10, CRYPTIC_LIMITS.leaderboard),
  }),
  response: t.object({
    board: t.enum(BOARDS),
    items: t.array(
      t.object({ rank: t.integer(), player: playerSchema, ...statsFields }),
    ),
  }),
  example: {
    query: { board: "streak", limit: 1 },
    response: {
      board: "streak",
      items: [
        {
          rank: 1,
          player: { id: "123456789012345678", name: "Ada" },
          solved: 30,
          played: 31,
          currentStreak: 12,
          bestStreak: 19,
          averageTries: 1.8,
        },
      ],
    },
  },
  handler: async ({ db, query, caller, now }) => {
    const board = query.board ?? "streak";
    return {
      board,
      items: await leaderboard(
        db,
        callerApp(caller),
        board,
        query.limit ?? 10,
        today(now),
      ),
    };
  },
});

export const getCrypticPlayer = defineRoute({
  method: "GET",
  path: "/v1/cryptic/players/{id}",
  operationId: "getCrypticPlayer",
  group: "cryptic",
  summary: "Get a player's stats",
  description:
    "One of the app's players: totals, streaks, and how today is going. `404 not_found` until they've made a counted guess.",
  auth: "key",
  scope: "cryptic:read",
  params: playerParams,
  response: t.object({
    player: playerSchema,
    ...statsFields,
    today: t.nullable(
      t.object(
        {
          date: t.date(),
          tries: t.integer(),
          solved: t.boolean(),
        },
        {
          description:
            "Their go at today's puzzle; null if they haven't guessed (or there's none).",
        },
      ),
    ),
  }),
  errors: ["not_found"],
  example: {
    params: { id: "123456789012345678" },
    response: {
      player: { id: "123456789012345678", name: "Ada" },
      solved: 30,
      played: 31,
      currentStreak: 12,
      bestStreak: 19,
      averageTries: 1.8,
      today: { date: "2026-10-23", tries: 2, solved: true },
    },
  },
  handler: async ({ db, params, caller, now }) => {
    const player = await findPlayer(db, callerApp(caller), params.id);
    if (!player)
      throw new ApiError("not_found", "That player hasn't played yet.");
    const day = today(now);
    const stats = await playerStats(db, player, day);
    const puzzle = await puzzleOn(db, day);
    const attempt = puzzle ? await attemptOn(db, player, puzzle.id) : null;
    return { ...stats, today: attempt ? { date: day, ...attempt } : null };
  },
});

export const deleteCrypticPlayer = defineRoute({
  method: "DELETE",
  path: "/v1/cryptic/players/{id}",
  operationId: "deleteCrypticPlayer",
  group: "cryptic",
  summary: "Forget a player",
  description:
    "Deletes one of the app's players with all their guesses, streaks and places on leaderboards: for a player who asks to be forgotten. It can't be undone; a later guess starts them afresh.",
  auth: "key",
  scope: "cryptic:play",
  params: playerParams,
  response: t.object({ deleted: t.boolean({ description: "Always true." }) }),
  errors: ["not_found"],
  example: {
    params: { id: "123456789012345678" },
    response: { deleted: true },
  },
  handler: async ({ db, params, caller }) => {
    if (!(await deletePlayer(db, callerApp(caller), params.id)))
      throw new ApiError("not_found", "There's no such player.");
    return { deleted: true };
  },
});
