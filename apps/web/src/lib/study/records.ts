/**
 * Signed-in people's study records: their events (study_events) and settings
 * (study_settings). What the rows mean is packages/study's progress.ts; this only
 * stores and reads them. Deleting the account deletes them (foreign keys).
 */
import {
  studyEvents,
  studySettings,
  type Database,
  type StudyEventRow,
} from "@trilleo/db";
import {
  DEFAULT_SETTINGS,
  STUDY_LIMITS,
  parseSettings,
  type StudyEvent,
  type StudySettings,
} from "@trilleo/study";
import { asc, count, eq } from "drizzle-orm";

function toEvent(row: StudyEventRow): StudyEvent {
  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    item: row.item,
    at: row.at.toISOString(),
    data: row.data,
  } as StudyEvent;
}

/** Everything someone recorded, oldest first. */
export async function listStudyEvents(
  db: Database,
  userId: string,
): Promise<StudyEvent[]> {
  const rows = await db
    .select()
    .from(studyEvents)
    .where(eq(studyEvents.userId, userId))
    .orderBy(asc(studyEvents.at), asc(studyEvents.id));
  return rows.map(toEvent);
}

export type SaveResult =
  { ok: true; saved: number } | { ok: false; error: "too-many" };

/**
 * Adds events (already checked with parseEvent). Ones already there (same ID) are
 * skipped, so a browser can send again whatever it isn't sure arrived.
 */
export async function saveStudyEvents(
  db: Database,
  userId: string,
  events: readonly StudyEvent[],
): Promise<SaveResult> {
  if (events.length === 0) return { ok: true, saved: 0 };
  const [row] = await db
    .select({ total: count() })
    .from(studyEvents)
    .where(eq(studyEvents.userId, userId));
  if ((row?.total ?? 0) + events.length > STUDY_LIMITS.perPerson)
    return { ok: false, error: "too-many" };
  const inserted = await db
    .insert(studyEvents)
    .values(
      events.map((event) => ({
        userId,
        id: event.id,
        kind: event.kind,
        subject: event.subject,
        item: event.item,
        data: event.data,
        at: new Date(event.at),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: studyEvents.id });
  return { ok: true, saved: inserted.length };
}

/** Someone's settings; null if they never changed them. */
export async function getStudySettings(
  db: Database,
  userId: string,
): Promise<StudySettings | null> {
  const [row] = await db
    .select()
    .from(studySettings)
    .where(eq(studySettings.userId, userId));
  return row ? parseSettings(row.settings) : null;
}

export async function putStudySettings(
  db: Database,
  userId: string,
  settings: StudySettings,
): Promise<void> {
  await db
    .insert(studySettings)
    .values({ userId, settings })
    .onConflictDoUpdate({
      target: studySettings.userId,
      set: { settings, updatedAt: new Date() },
    });
}

/** For the account export: the settings in force and every event. */
export async function studyExport(db: Database, userId: string) {
  return {
    settings: (await getStudySettings(db, userId)) ?? DEFAULT_SETTINGS,
    events: await listStudyEvents(db, userId),
  };
}
