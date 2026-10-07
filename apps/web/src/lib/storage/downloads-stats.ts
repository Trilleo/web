/**
 * Download counts per file per UTC day (the file_downloads table), written by the
 * /d/<id> redirect and read by the file page's chart, the admin's lists and
 * someone's files page.
 */
import { fileDownloads, files, type Database } from "@trilleo/db";
import { and, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import { addDownload } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-05" for the UTC day `days` before `now` (0: today). */
export function utcDay(now: Date, days = 0): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

/** Counts one download: today's row and the file's total. */
export async function recordDownload(
  db: Database,
  fileId: string,
  now = new Date(),
): Promise<void> {
  await db
    .insert(fileDownloads)
    .values({ fileId, day: utcDay(now), count: 1 })
    .onConflictDoUpdate({
      target: [fileDownloads.fileId, fileDownloads.day],
      set: { count: sql`${fileDownloads.count} + 1` },
    });
  await addDownload(db, fileId);
}

export interface DayCount {
  day: string;
  count: number;
}

/**
 * The last `days` days for one file, some files, or every file (null), oldest
 * first, gaps as 0.
 */
export async function dailyDownloads(
  db: Database,
  fileId: string | readonly string[] | null,
  days = 30,
  now = new Date(),
): Promise<DayCount[]> {
  const zeros = () =>
    Array.from({ length: days }, (_, i) => ({
      day: utcDay(now, days - 1 - i),
      count: 0,
    }));
  if (Array.isArray(fileId) && fileId.length === 0) return zeros();
  const since = utcDay(now, days - 1);
  const rows = await db
    .select({
      day: fileDownloads.day,
      count: sum(fileDownloads.count).mapWith(Number),
    })
    .from(fileDownloads)
    .where(
      and(
        gte(fileDownloads.day, since),
        typeof fileId === "string"
          ? eq(fileDownloads.fileId, fileId)
          : fileId
            ? inArray(fileDownloads.fileId, [...fileId])
            : undefined,
      ),
    )
    .groupBy(fileDownloads.day);
  const byDay = new Map(rows.map((row) => [row.day, row.count]));
  return zeros().map(({ day }) => ({ day, count: byDay.get(day) ?? 0 }));
}

/** Downloads in the last `days` days, per file. */
export async function recentDownloads(
  db: Database,
  fileIds: readonly string[],
  days = 30,
  now = new Date(),
): Promise<Map<string, number>> {
  if (fileIds.length === 0) return new Map();
  const rows = await db
    .select({
      fileId: fileDownloads.fileId,
      count: sum(fileDownloads.count).mapWith(Number),
    })
    .from(fileDownloads)
    .where(
      and(
        inArray(fileDownloads.fileId, [...fileIds]),
        gte(fileDownloads.day, utcDay(now, days - 1)),
      ),
    )
    .groupBy(fileDownloads.fileId);
  return new Map(rows.map((row) => [row.fileId, row.count]));
}

/** The most downloaded files of the last `days` days. */
export async function topDownloads(
  db: Database,
  days = 30,
  limit = 5,
  now = new Date(),
) {
  const total = sum(fileDownloads.count).mapWith(Number);
  return db
    .select({ id: files.id, name: files.name, count: total })
    .from(fileDownloads)
    .innerJoin(files, eq(files.id, fileDownloads.fileId))
    .where(gte(fileDownloads.day, utcDay(now, days - 1)))
    .groupBy(files.id, files.name)
    .orderBy(desc(total))
    .limit(limit);
}
