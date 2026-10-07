/**
 * What the admin's review queue (/admin/files/review) shows: files waiting for
 * review, reported files, appeals, and spot checks of trusted uploaders' files,
 * each with what's needed to decide (preview, contents, reports, the uploader's
 * standing).
 */
import { files, users, type Database, type StoredFile } from "@trilleo/db";
import { isInlineType, type FileStatus } from "@trilleo/storage";
import { readBytes, type StorageDriver } from "@trilleo/storage/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { authConfig } from "../auth/config";
import { openAppeals, type AppealView } from "./appeals";
import { openReports, reportedFileIds, type ReportView } from "./reports";
import { standingOf, type Standing } from "./standing";
import { thumbnailUrlFor } from "./service";
import type { FileListItem } from "./store";
import { fileUses, type FileUse } from "../minecraft/store";

export const REVIEW_TABS = ["waiting", "reports", "appeals", "spot"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

export interface UploaderSummary {
  id: string;
  login: string;
  standing: Standing;
  /** Their files by status. */
  counts: Partial<Record<FileStatus, number>>;
}

export interface ReviewItem {
  file: FileListItem;
  reports: ReportView[];
  appeal: AppealView | null;
  uploader: UploaderSummary | null;
  /** A short-lived URL to show it in the page (images, audio, video). */
  previewUrl: string | null;
  /** The start of a text file, shown as text. */
  textPreview: string | null;
  /** The thumbnail the uploader's browser made (compare it with the file). */
  thumbnailUrl: string | null;
  /** The Minecraft project it's part of, if any. */
  use: FileUse | null;
}

const PAGE = 30;
const TEXT_PREVIEW_BYTES = 4096;

async function withOwners(
  db: Database,
  rows: StoredFile[],
): Promise<FileListItem[]> {
  const ownerIds = [
    ...new Set(rows.map((row) => row.ownerId).filter((id) => id !== null)),
  ];
  const owners = ownerIds.length
    ? await db
        .select({ id: users.id, login: users.githubLogin })
        .from(users)
        .where(inArray(users.id, ownerIds))
    : [];
  const logins = new Map(owners.map((owner) => [owner.id, owner.login]));
  return rows.map((row) => ({
    ...row,
    ownerLogin: row.ownerId ? (logins.get(row.ownerId) ?? null) : null,
  }));
}

async function filesByIds(db: Database, ids: readonly string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(files)
    .where(inArray(files.id, [...ids]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row) => row !== undefined);
}

/** How many items wait in each tab (for the tab labels and the files page). */
export async function reviewCounts(
  db: Database,
): Promise<Record<ReviewTab, number>> {
  const [waiting] = await db
    .select({ n: count() })
    .from(files)
    .where(eq(files.status, "pending_review"));
  return {
    waiting: waiting?.n ?? 0,
    reports: (await reportedFileIds(db)).length,
    appeals: (await openAppeals(db)).length,
    spot: (await spotCheckRows(db)).length,
  };
}

/** Published files by people other than the admin that nobody has looked at. */
async function spotCheckRows(db: Database): Promise<StoredFile[]> {
  const rows = await db
    .select({ file: files, githubId: users.githubId })
    .from(files)
    .innerJoin(users, eq(users.id, files.ownerId))
    .where(and(eq(files.status, "published"), isNull(files.reviewedAt)))
    .orderBy(desc(files.publishedAt));
  const adminIds = authConfig()?.adminIds;
  return rows
    .filter((row) => !adminIds?.has(row.githubId))
    .map((row) => row.file);
}

export async function uploaderSummaries(
  db: Database,
  ownerIds: readonly string[],
  now = new Date(),
): Promise<Map<string, UploaderSummary>> {
  const unique = [...new Set(ownerIds)];
  if (unique.length === 0) return new Map();
  const people = await db
    .select({ id: users.id, login: users.githubLogin })
    .from(users)
    .where(inArray(users.id, unique));
  const counts = await db
    .select({ ownerId: files.ownerId, status: files.status, n: count() })
    .from(files)
    .where(and(inArray(files.ownerId, unique), isNotNull(files.ownerId)))
    .groupBy(files.ownerId, files.status);
  const result = new Map<string, UploaderSummary>();
  for (const person of people) {
    result.set(person.id, {
      id: person.id,
      login: person.login,
      standing: await standingOf(db, person.id, now),
      counts: Object.fromEntries(
        counts
          .filter((row) => row.ownerId === person.id)
          .map((row) => [row.status, row.n]),
      ),
    });
  }
  return result;
}

async function previews(
  storage: StorageDriver,
  row: StoredFile,
): Promise<Pick<ReviewItem, "previewUrl" | "textPreview">> {
  if (row.purgedAt) return { previewUrl: null, textPreview: null };
  if (
    isInlineType(row.contentType) &&
    ["image", "audio", "video"].includes(row.kind)
  ) {
    return {
      previewUrl: await storage.signedUrl(row.key, 15 * 60),
      textPreview: null,
    };
  }
  if (row.kind === "text") {
    try {
      const bytes = await readBytes(
        await storage.read(row.key, {
          start: 0,
          end: Math.min(row.size, TEXT_PREVIEW_BYTES),
        }),
      );
      return {
        previewUrl: null,
        textPreview: new TextDecoder().decode(bytes),
      };
    } catch {
      return { previewUrl: null, textPreview: null };
    }
  }
  return { previewUrl: null, textPreview: null };
}

/** One tab's items, ready to show. */
export async function reviewItems(
  db: Database,
  storage: StorageDriver,
  tab: ReviewTab,
  now = new Date(),
): Promise<ReviewItem[]> {
  let rows: StoredFile[];
  const appeals = new Map<string, AppealView>();
  if (tab === "waiting") {
    rows = await db
      .select()
      .from(files)
      .where(eq(files.status, "pending_review"))
      .orderBy(asc(files.statusChangedAt))
      .limit(PAGE);
  } else if (tab === "reports") {
    rows = await filesByIds(db, (await reportedFileIds(db)).slice(0, PAGE));
  } else if (tab === "appeals") {
    const open = (await openAppeals(db)).slice(0, PAGE);
    for (const appeal of open) appeals.set(appeal.fileId, appeal);
    rows = await filesByIds(
      db,
      open.map((appeal) => appeal.fileId),
    );
  } else {
    rows = (await spotCheckRows(db)).slice(0, PAGE);
  }

  const listed = await withOwners(db, rows);
  const reports = await openReports(
    db,
    listed.map((row) => row.id),
  );
  const uses = await fileUses(
    db,
    listed.map((row) => row.id),
  );
  const uploaders = await uploaderSummaries(
    db,
    listed.map((row) => row.ownerId).filter((id) => id !== null),
    now,
  );
  return Promise.all(
    listed.map(async (file) => ({
      file,
      reports: reports.get(file.id) ?? [],
      appeal: appeals.get(file.id) ?? null,
      uploader: file.ownerId ? (uploaders.get(file.ownerId) ?? null) : null,
      ...(await previews(storage, file)),
      thumbnailUrl: await thumbnailUrlFor(storage, file),
      use: uses.get(file.id) ?? null,
    })),
  );
}
