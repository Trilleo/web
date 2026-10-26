/**
 * Song aliases (@trilleo/chunithm's aliases.ts has the rules): the admin adds and
 * removes them, imports community lists in bulk, and decides the names people
 * suggest from chart pages. Suggestions wait in a queue (/admin/chunithm/aliases/),
 * each one alerting the admin ("chunithm-alias"); the person sees their own and
 * the decision on the song's chart pages. Search reads aliases through the index
 * (viewer.ts), which is rebuilt on its next read after any change here.
 */
import {
  ALIAS_LIMITS,
  ALIAS_PROBLEMS,
  cleanAlias,
  matchKey,
  parseAliasImport,
  type AliasProblem,
} from "@trilleo/chunithm";
import {
  chuniAliasSuggestions,
  chuniAliases,
  chuniSongs,
  users,
  type ChuniAlias,
  type ChuniAliasSuggestion,
  type Database,
} from "@trilleo/db";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { forgetIndex } from "./viewer";

export const SUGGESTION_LIMITS = {
  /** Suggestions one person may make a day. */
  perDay: 20,
  /** Suggestions of one person's waiting at once. */
  waiting: 30,
  noteMax: 300,
};

export type AliasError =
  | AliasProblem
  | "no-song"
  | "title"
  | "taken"
  | "waiting"
  | "full"
  | "too-many"
  | "decided";

export const ALIAS_ERRORS: Record<AliasError, string> = {
  ...ALIAS_PROBLEMS,
  "no-song": "There's no such song.",
  title: "That's the song's own title.",
  taken: "The song already goes by that name.",
  waiting: "That name has been suggested already and is waiting for a look.",
  full: `A song can have at most ${String(ALIAS_LIMITS.perSong)} names.`,
  "too-many":
    "You've suggested a lot of names lately. Please wait for those to be looked at.",
  decided: "That suggestion has been decided already.",
};

export type AliasResult<T = undefined> =
  { ok: true; value: T } | { ok: false; error: AliasError };

/** A song's aliases, oldest first. */
export async function songAliases(
  db: Database,
  songId: number,
): Promise<ChuniAlias[]> {
  return db
    .select()
    .from(chuniAliases)
    .where(eq(chuniAliases.songId, songId))
    .orderBy(asc(chuniAliases.createdAt), asc(chuniAliases.id));
}

/** Every song's aliases, for the search index. */
export async function aliasesBySong(
  db: Database,
): Promise<Map<number, string[]>> {
  const rows = await db
    .select({ songId: chuniAliases.songId, alias: chuniAliases.alias })
    .from(chuniAliases)
    .orderBy(asc(chuniAliases.id));
  const map = new Map<number, string[]>();
  for (const row of rows)
    map.set(row.songId, [...(map.get(row.songId) ?? []), row.alias]);
  return map;
}

/** Checks a name for a song: clean, not its title, not already one of its names. */
async function checkName(
  db: Database,
  songId: number,
  text: string,
): Promise<AliasResult<{ alias: string; key: string }>> {
  const cleaned = cleanAlias(text);
  if (!cleaned.ok) return { ok: false, error: cleaned.problem };
  const [song] = await db
    .select({ title: chuniSongs.title })
    .from(chuniSongs)
    .where(eq(chuniSongs.id, songId));
  if (!song) return { ok: false, error: "no-song" };
  if (matchKey(song.title) === cleaned.key)
    return { ok: false, error: "title" };
  const existing = await songAliases(db, songId);
  if (existing.some((alias) => alias.key === cleaned.key))
    return { ok: false, error: "taken" };
  if (existing.length >= ALIAS_LIMITS.perSong)
    return { ok: false, error: "full" };
  return { ok: true, value: { alias: cleaned.alias, key: cleaned.key } };
}

/** The admin adds a name (or a suggestion is approved). */
export async function addAlias(
  db: Database,
  songId: number,
  text: string,
  source: "admin" | "suggestion" | "import" = "admin",
  suggestedBy: string | null = null,
): Promise<AliasResult<ChuniAlias>> {
  const checked = await checkName(db, songId, text);
  if (!checked.ok) return checked;
  const [row] = await db
    .insert(chuniAliases)
    .values({ songId, ...checked.value, source, suggestedBy })
    .onConflictDoNothing()
    .returning();
  if (!row) return { ok: false, error: "taken" };
  forgetIndex();
  return { ok: true, value: row };
}

export async function removeAlias(db: Database, id: number): Promise<void> {
  await db.delete(chuniAliases).where(eq(chuniAliases.id, id));
  forgetIndex();
}

/** Someone signed in suggests a name for a song. */
export async function suggestAlias(
  db: Database,
  userId: string,
  songId: number,
  text: string,
  now = new Date(),
): Promise<AliasResult<ChuniAliasSuggestion>> {
  const checked = await checkName(db, songId, text);
  if (!checked.ok) return checked;
  const [waitingSame] = await db
    .select({ id: chuniAliasSuggestions.id })
    .from(chuniAliasSuggestions)
    .where(
      and(
        eq(chuniAliasSuggestions.songId, songId),
        eq(chuniAliasSuggestions.key, checked.value.key),
        eq(chuniAliasSuggestions.status, "pending"),
      ),
    );
  if (waitingSame) return { ok: false, error: "waiting" };
  const [today] = await db
    .select({ n: count() })
    .from(chuniAliasSuggestions)
    .where(
      and(
        eq(chuniAliasSuggestions.userId, userId),
        gt(
          chuniAliasSuggestions.createdAt,
          new Date(now.getTime() - 24 * 3600 * 1000),
        ),
      ),
    );
  const [waiting] = await db
    .select({ n: count() })
    .from(chuniAliasSuggestions)
    .where(
      and(
        eq(chuniAliasSuggestions.userId, userId),
        eq(chuniAliasSuggestions.status, "pending"),
      ),
    );
  if (
    (today?.n ?? 0) >= SUGGESTION_LIMITS.perDay ||
    (waiting?.n ?? 0) >= SUGGESTION_LIMITS.waiting
  )
    return { ok: false, error: "too-many" };
  const [row] = await db
    .insert(chuniAliasSuggestions)
    .values({ songId, userId, ...checked.value, createdAt: now })
    .returning();
  if (!row) throw new Error("couldn't save the suggestion");
  await alertAdmin(
    db,
    {
      kind: "chunithm-alias",
      summary: `“${checked.value.alias}” suggested for song #${String(songId)}`,
      path: "/admin/chunithm/aliases/",
    },
    now,
  );
  return { ok: true, value: row };
}

/**
 * The admin approves (adding the name, if it's still free) or declines a suggestion,
 * with an optional note the person sees.
 */
export async function decideSuggestion(
  db: Database,
  id: number,
  approve: boolean,
  note = "",
  now = new Date(),
): Promise<AliasResult> {
  const [suggestion] = await db
    .select()
    .from(chuniAliasSuggestions)
    .where(eq(chuniAliasSuggestions.id, id));
  if (suggestion?.status !== "pending") return { ok: false, error: "decided" };
  const text = note.trim().slice(0, SUGGESTION_LIMITS.noteMax) || null;
  if (approve) {
    const added = await addAlias(
      db,
      suggestion.songId,
      suggestion.alias,
      "suggestion",
      suggestion.userId,
    );
    // Added meanwhile (by the admin, or another suggestion): still approved.
    if (!added.ok && added.error !== "taken") return added;
  }
  await db
    .update(chuniAliasSuggestions)
    .set({
      status: approve ? "approved" : "declined",
      note: text,
      decidedAt: now,
    })
    .where(eq(chuniAliasSuggestions.id, id));
  return { ok: true, value: undefined };
}

export interface WaitingSuggestion {
  id: number;
  songId: number;
  title: string;
  alias: string;
  username: string;
  createdAt: Date;
  /** The song's names now, to compare with. */
  aliases: string[];
}

/** The queue, oldest first: all of it, or one song's (its chart pages show it to the admin). */
export async function waitingSuggestions(
  db: Database,
  songId?: number,
): Promise<WaitingSuggestion[]> {
  const rows = await db
    .select({
      id: chuniAliasSuggestions.id,
      songId: chuniAliasSuggestions.songId,
      title: chuniSongs.title,
      alias: chuniAliasSuggestions.alias,
      username: users.username,
      createdAt: chuniAliasSuggestions.createdAt,
    })
    .from(chuniAliasSuggestions)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniAliasSuggestions.songId))
    .innerJoin(users, eq(users.id, chuniAliasSuggestions.userId))
    .where(
      and(
        eq(chuniAliasSuggestions.status, "pending"),
        songId === undefined
          ? undefined
          : eq(chuniAliasSuggestions.songId, songId),
      ),
    )
    .orderBy(asc(chuniAliasSuggestions.createdAt))
    .limit(200);
  const names = await aliasesBySong(db);
  return rows.map((row) => ({ ...row, aliases: names.get(row.songId) ?? [] }));
}

/** Someone's suggestions for one song, newest first (shown on its chart pages). */
export async function suggestionsFor(
  db: Database,
  userId: string,
  songId: number,
): Promise<ChuniAliasSuggestion[]> {
  return db
    .select()
    .from(chuniAliasSuggestions)
    .where(
      and(
        eq(chuniAliasSuggestions.userId, userId),
        eq(chuniAliasSuggestions.songId, songId),
      ),
    )
    .orderBy(desc(chuniAliasSuggestions.createdAt))
    .limit(20);
}

export interface ImportReport {
  added: number;
  /** Already a name of the song, its title, or unusable. */
  skipped: number;
  unknownSongs: number[];
  problems: string[];
}

/** A pasted list of aliases (see parseAliasImport for the shapes it takes). */
export async function importAliases(
  db: Database,
  text: string,
): Promise<ImportReport> {
  const parsed = parseAliasImport(text);
  const report: ImportReport = {
    added: 0,
    skipped: 0,
    unknownSongs: [],
    problems: parsed.problems,
  };
  const ids = [...new Set(parsed.entries.map((entry) => entry.songId))];
  const known = new Set(
    ids.length === 0
      ? []
      : (
          await db
            .select({ id: chuniSongs.id })
            .from(chuniSongs)
            .where(inArray(chuniSongs.id, ids))
        ).map((row) => row.id),
  );
  report.unknownSongs = ids.filter((id) => !known.has(id));
  for (const entry of parsed.entries) {
    if (!known.has(entry.songId)) continue;
    const added = await addAlias(db, entry.songId, entry.alias, "import");
    if (added.ok) report.added++;
    else report.skipped++;
  }
  return report;
}

/** For the account export: every name someone suggested, and what became of it. */
export async function aliasExport(db: Database, userId: string) {
  return db
    .select({
      song: chuniAliasSuggestions.songId,
      alias: chuniAliasSuggestions.alias,
      status: chuniAliasSuggestions.status,
      note: chuniAliasSuggestions.note,
      createdAt: chuniAliasSuggestions.createdAt,
      decidedAt: chuniAliasSuggestions.decidedAt,
    })
    .from(chuniAliasSuggestions)
    .where(eq(chuniAliasSuggestions.userId, userId))
    .orderBy(asc(chuniAliasSuggestions.createdAt));
}
