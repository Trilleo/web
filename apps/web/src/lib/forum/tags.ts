/**
 * Topics' tags (free, up to MAX_TAGS, normalized) and prefixes (each forum's own
 * list, which the admin keeps), and marking topics solved.
 */
import {
  forumPrefixes,
  forumTags,
  forumTopicTags,
  forumTopics,
  type Database,
  type ForumPrefix,
} from "@trilleo/db";
import {
  MAX_TAGS,
  PREFIX_MAX,
  isPrefixStyle,
  normalizeTag,
} from "@trilleo/forum";
import { asc, count, desc, eq, inArray, max } from "drizzle-orm";
import { characterCount, cleanLine } from "../profile/profile";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** Replaces a topic's tags (normalized, each once, at most MAX_TAGS). */
export async function setTopicTags(
  db: Db,
  topicId: number,
  tags: readonly string[],
): Promise<string[]> {
  const names = [
    ...new Set(tags.map(normalizeTag).filter((tag) => tag !== "")),
  ].slice(0, MAX_TAGS);
  await db.delete(forumTopicTags).where(eq(forumTopicTags.topicId, topicId));
  if (names.length === 0) return [];
  await db
    .insert(forumTags)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing({ target: forumTags.name });
  const rows = await db
    .select({ id: forumTags.id })
    .from(forumTags)
    .where(inArray(forumTags.name, names));
  await db
    .insert(forumTopicTags)
    .values(rows.map((row) => ({ topicId, tagId: row.id })))
    .onConflictDoNothing();
  return names;
}

/** Each topic's tags, by topic id. */
export async function tagsOf(
  db: Db,
  topicIds: readonly number[],
): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (topicIds.length === 0) return out;
  const rows = await db
    .select({ topicId: forumTopicTags.topicId, name: forumTags.name })
    .from(forumTopicTags)
    .innerJoin(forumTags, eq(forumTags.id, forumTopicTags.tagId))
    .where(inArray(forumTopicTags.topicId, [...topicIds]))
    .orderBy(asc(forumTags.name));
  for (const row of rows)
    out.set(row.topicId, [...(out.get(row.topicId) ?? []), row.name]);
  return out;
}

/** The most used tags, for suggestions. */
export async function popularTags(db: Database, limit = 30) {
  return db
    .select({ name: forumTags.name, topics: count(forumTopicTags.topicId) })
    .from(forumTags)
    .innerJoin(forumTopicTags, eq(forumTopicTags.tagId, forumTags.id))
    .groupBy(forumTags.name)
    .orderBy(desc(count(forumTopicTags.topicId)), asc(forumTags.name))
    .limit(limit);
}

export async function tagId(
  db: Database,
  name: string,
): Promise<number | null> {
  const [row] = await db
    .select({ id: forumTags.id })
    .from(forumTags)
    .where(eq(forumTags.name, normalizeTag(name)))
    .limit(1);
  return row?.id ?? null;
}

// ---------------------------------------------------------------------------
// Prefixes

export async function prefixesOf(
  db: Db,
  forumId: number,
): Promise<ForumPrefix[]> {
  return db
    .select()
    .from(forumPrefixes)
    .where(eq(forumPrefixes.forumId, forumId))
    .orderBy(asc(forumPrefixes.sort), asc(forumPrefixes.id));
}

export async function prefixesById(
  db: Db,
  ids: readonly number[],
): Promise<Map<number, ForumPrefix>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(forumPrefixes)
    .where(inArray(forumPrefixes.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, row]));
}

/** A prefix the forum offers (or null for none, or one from elsewhere). */
export async function validPrefix(
  db: Db,
  forumId: number,
  id: number | null,
): Promise<number | null> {
  if (id === null) return null;
  const [row] = await db
    .select({ forumId: forumPrefixes.forumId })
    .from(forumPrefixes)
    .where(eq(forumPrefixes.id, id))
    .limit(1);
  return row?.forumId === forumId ? id : null;
}

export async function addPrefix(
  db: Database,
  forumId: number,
  label: string,
  style: string,
): Promise<string | null> {
  const clean = cleanLine(label).replace(/^\[|\]$/g, "");
  if (!clean) return "Give it a label.";
  if (characterCount(clean) > PREFIX_MAX)
    return `Up to ${String(PREFIX_MAX)} characters.`;
  const [last] = await db
    .select({ sort: max(forumPrefixes.sort) })
    .from(forumPrefixes)
    .where(eq(forumPrefixes.forumId, forumId));
  await db.insert(forumPrefixes).values({
    forumId,
    label: clean,
    style: isPrefixStyle(style) ? style : "outline",
    sort: (last?.sort ?? -1) + 1,
  });
  return null;
}

export async function removePrefix(
  db: Database,
  forumId: number,
  id: number,
): Promise<void> {
  const [row] = await db
    .select({ forumId: forumPrefixes.forumId })
    .from(forumPrefixes)
    .where(eq(forumPrefixes.id, id))
    .limit(1);
  if (row?.forumId === forumId)
    await db.delete(forumPrefixes).where(eq(forumPrefixes.id, id));
}

/** Sets a topic's prefix and tags (a moderator, or the author while editing). */
export async function setTopicLabels(
  db: Db,
  topic: { id: number; forumId: number },
  labels: { prefixId: number | null; tags: readonly string[] },
): Promise<void> {
  await db
    .update(forumTopics)
    .set({ prefixId: await validPrefix(db, topic.forumId, labels.prefixId) })
    .where(eq(forumTopics.id, topic.id));
  await setTopicTags(db, topic.id, labels.tags);
}

/** Marks a topic solved, or not. */
export async function setSolved(
  db: Db,
  topicId: number,
  solved: boolean,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumTopics)
    .set({ solvedAt: solved ? now : null })
    .where(eq(forumTopics.id, topicId));
}
