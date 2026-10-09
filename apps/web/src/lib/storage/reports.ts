/**
 * People reporting public files, and the admin's inbox of them. Enough reports from
 * established accounts hide a file until the admin looks (the `flag` transition);
 * the admin's own files are never hidden this way.
 */
import { fileReports, files, users, type Database } from "@trilleo/db";
import {
  MAX_MESSAGE_LENGTH,
  REPORT_REASONS,
  REPORTS_PER_DAY,
  isServedPublicly,
  reporterCounts,
  reportsHide,
  type ReportReason,
} from "@trilleo/storage";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import {
  setAccess,
  type Requester,
  type Result,
  type StorageDeps,
} from "./service";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";
import { changeStatus, getFile } from "./store";

export const HIDDEN_BY_REPORTS =
  "Several people reported this file. It’s hidden until it has been reviewed.";

export type ReportOutcome = "reported" | "already-reported";

export async function reportFile(
  deps: StorageDeps,
  requester: Requester,
  input: { fileId: string; reason: string; details: string },
): Promise<Result<ReportOutcome>> {
  const { db } = deps;
  const now = deps.now?.() ?? new Date();
  const row = await getFile(db, input.fileId);
  if (!row || !isServedPublicly(row.status, row.visibility))
    return { ok: false, status: 404, error: "There’s no such file." };
  if (row.ownerId === requester.user.id)
    return { ok: false, status: 400, error: "That’s your own file." };
  if (!REPORT_REASONS.includes(input.reason as ReportReason))
    return { ok: false, status: 400, error: "Choose what’s wrong with it." };
  const details = input.details.trim();
  if (details.length > MAX_MESSAGE_LENGTH)
    return {
      ok: false,
      status: 400,
      error: `Keep the details under ${String(MAX_MESSAGE_LENGTH)} characters.`,
    };

  const [existing] = await db
    .select({ id: fileReports.id })
    .from(fileReports)
    .where(
      and(
        eq(fileReports.fileId, row.id),
        eq(fileReports.reporterId, requester.user.id),
        eq(fileReports.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, value: "already-reported" };

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(fileReports)
    .where(
      and(
        eq(fileReports.reporterId, requester.user.id),
        gt(fileReports.createdAt, dayAgo),
      ),
    );
  if (!requester.isAdmin && (recent?.n ?? 0) >= REPORTS_PER_DAY)
    return {
      ok: false,
      status: 429,
      error: "You’ve sent a lot of reports today. Try again tomorrow.",
    };

  await db.insert(fileReports).values({
    fileId: row.id,
    reporterId: requester.user.id,
    reason: input.reason,
    details,
    createdAt: now,
  });
  await hideIfReported(deps, row.id, now);
  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "file-report",
        summary: `“${row.name}” was reported (${input.reason})`,
        path: "/admin/files/review?tab=reports",
      },
      now,
    ),
  );
  return { ok: true, value: "reported" };
}

/** Hides a published file once enough established accounts have reported it. */
async function hideIfReported(
  deps: StorageDeps,
  fileId: string,
  now: Date,
): Promise<void> {
  const { db, storage } = deps;
  const row = await getFile(db, fileId);
  if (row?.status !== "published") return;
  if (row.ownerId && (await deps.isAdminId?.(row.ownerId)) === true) return;

  const reporters = await db
    .selectDistinct({ id: users.id, createdAt: users.createdAt })
    .from(fileReports)
    .innerJoin(users, eq(users.id, fileReports.reporterId))
    .where(and(eq(fileReports.fileId, fileId), eq(fileReports.status, "open")));
  const counting = reporters.filter((reporter) =>
    reporterCounts(reporter.createdAt, now),
  ).length;
  if (!reportsHide(counting)) return;

  const wasPublic = isServedPublicly(row.status, row.visibility);
  if (wasPublic) await setAccess(storage, row, false);
  const moved = await changeStatus(db, {
    id: fileId,
    from: "published",
    to: "pending_review",
    action: "flag",
    actorId: null,
    reason: HIDDEN_BY_REPORTS,
    now,
  });
  if (!moved && wasPublic) await setAccess(storage, row, true);
}

export interface ReportView {
  id: number;
  reason: string;
  details: string;
  createdAt: Date;
  reporterLogin: string | null;
}

/** Open reports per file, for the given files (or every file with open reports). */
export async function openReports(
  db: Database,
  fileIds?: readonly string[],
): Promise<Map<string, ReportView[]>> {
  if (fileIds?.length === 0) return new Map();
  const rows = await db
    .select({
      id: fileReports.id,
      fileId: fileReports.fileId,
      reason: fileReports.reason,
      details: fileReports.details,
      createdAt: fileReports.createdAt,
      reporterLogin: users.githubLogin,
    })
    .from(fileReports)
    .leftJoin(users, eq(users.id, fileReports.reporterId))
    .where(
      and(
        eq(fileReports.status, "open"),
        fileIds ? inArray(fileReports.fileId, [...fileIds]) : undefined,
      ),
    )
    .orderBy(asc(fileReports.createdAt));
  const byFile = new Map<string, ReportView[]>();
  for (const { fileId, ...report } of rows) {
    const list = byFile.get(fileId) ?? [];
    list.push(report);
    byFile.set(fileId, list);
  }
  return byFile;
}

/** Files with open reports, most reported first. */
export async function reportedFileIds(db: Database): Promise<string[]> {
  const rows = await db
    .select({ fileId: fileReports.fileId, n: count() })
    .from(fileReports)
    .innerJoin(files, eq(files.id, fileReports.fileId))
    .where(eq(fileReports.status, "open"))
    .groupBy(fileReports.fileId)
    .orderBy(desc(count()));
  return rows.map((row) => row.fileId);
}

/** Whether this person has an open report on the file (the file page says so). */
export async function hasOpenReport(
  db: Database,
  fileId: string,
  reporterId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: fileReports.id })
    .from(fileReports)
    .where(
      and(
        eq(fileReports.fileId, fileId),
        eq(fileReports.reporterId, reporterId),
        eq(fileReports.status, "open"),
      ),
    )
    .limit(1);
  return row !== undefined;
}
