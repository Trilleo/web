/**
 * Platform operations that reach into storage (removing files with their release,
 * image or project), plus project reports and the account export. Files are never
 * deleted outright here: they go through storage's own `delete` (or cancel), so the
 * usual undo window, purge and log apply.
 */
import {
  files,
  mcDependencies,
  mcGallery,
  mcProjectReports,
  mcProjects,
  mcReleaseFiles,
  mcReleases,
  users,
  type McProject,
  type McRelease,
  type StoredFile,
} from "@trilleo/db";
import {
  MAX_MESSAGE_LENGTH,
  REPORT_REASONS,
  REPORTS_PER_DAY,
  reporterCounts,
  type ReportReason,
} from "@trilleo/storage";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import {
  actOnFile,
  cancelUpload,
  type Requester,
  type StorageDeps,
} from "../storage/service";
import { PROJECT_REPORTS_TO_HIDE } from "./catalog";
import { isVisible, projectOwner, setHidden, type Result } from "./store";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";
import { syncProject } from "./sync";

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(status: number, error: string): Result<T> => ({
  ok: false,
  status,
  error,
});

/** Takes a file out of circulation: cancels it mid-upload, else deletes it. */
async function discard(
  deps: StorageDeps,
  requester: Requester,
  file: StoredFile,
): Promise<void> {
  if (file.status === "uploading") {
    await cancelUpload(deps, requester, file.id);
    return;
  }
  if (
    file.status === "processing" ||
    file.status === "pending_review" ||
    file.status === "published" ||
    file.status === "rejected"
  )
    await actOnFile(deps, requester, file.id, "delete");
}

/** Removes one file from a release (and storage). */
export async function removeReleaseFile(
  deps: StorageDeps,
  requester: Requester,
  project: McProject,
  release: McRelease,
  fileId: string,
): Promise<Result<null>> {
  const [row] = await deps.db
    .select({ file: files, primary: mcReleaseFiles.primary })
    .from(mcReleaseFiles)
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(
      and(
        eq(mcReleaseFiles.releaseId, release.id),
        eq(mcReleaseFiles.fileId, fileId),
      ),
    )
    .limit(1);
  if (!row) return fail(404, "That file isn’t in this release.");
  await deps.db.delete(mcReleaseFiles).where(eq(mcReleaseFiles.fileId, fileId));
  await discard(deps, requester, row.file);
  await syncProject(deps.db, project.id);
  return ok(null);
}

/** Deletes a release and its files. */
export async function deleteRelease(
  deps: StorageDeps,
  requester: Requester,
  project: McProject,
  release: McRelease,
): Promise<void> {
  const rows = await deps.db
    .select({ file: files })
    .from(mcReleaseFiles)
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(eq(mcReleaseFiles.releaseId, release.id));
  await deps.db.delete(mcReleases).where(eq(mcReleases.id, release.id));
  for (const { file } of rows) await discard(deps, requester, file);
  await syncProject(deps.db, project.id);
}

/** Removes an image from the gallery (and storage). */
export async function removeGalleryImage(
  deps: StorageDeps,
  requester: Requester,
  project: McProject,
  imageId: number,
): Promise<Result<null>> {
  const [row] = await deps.db
    .select({ file: files })
    .from(mcGallery)
    .innerJoin(files, eq(files.id, mcGallery.fileId))
    .where(and(eq(mcGallery.id, imageId), eq(mcGallery.projectId, project.id)))
    .limit(1);
  if (!row) return fail(404, "That image isn’t in this gallery.");
  await deps.db.delete(mcGallery).where(eq(mcGallery.id, imageId));
  if (project.coverFileId === row.file.id)
    await deps.db
      .update(mcProjects)
      .set({ coverFileId: null })
      .where(eq(mcProjects.id, project.id));
  await discard(deps, requester, row.file);
  return ok(null);
}

/** Deletes a project: its releases, gallery and every file in them. */
export async function deleteProject(
  deps: StorageDeps,
  requester: Requester,
  project: McProject,
): Promise<void> {
  const { db } = deps;
  const releaseFiles = await db
    .select({ file: files })
    .from(mcReleaseFiles)
    .innerJoin(mcReleases, eq(mcReleases.id, mcReleaseFiles.releaseId))
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(eq(mcReleases.projectId, project.id));
  const images = await db
    .select({ file: files })
    .from(mcGallery)
    .innerJoin(files, eq(files.id, mcGallery.fileId))
    .where(eq(mcGallery.projectId, project.id));
  // Dependencies on it keep their name and lose the link (set null).
  await db.delete(mcProjects).where(eq(mcProjects.id, project.id));
  for (const { file } of [...releaseFiles, ...images])
    await discard(deps, requester, file);
}

// --- Reports ------------------------------------------------------------------

export const HIDDEN_BY_PROJECT_REPORTS =
  "Several people reported this project. It’s hidden until it has been reviewed.";

/** Someone reports a project's page (its text or pictures). */
export async function reportProject(
  deps: Pick<StorageDeps, "db" | "isAdminId" | "now">,
  reporter: Requester,
  project: McProject,
  input: { reason: string; details: string },
): Promise<Result<"reported" | "already-reported">> {
  const { db } = deps;
  const now = deps.now?.() ?? new Date();
  const owner = await projectOwner(db, project);
  if (!owner || !isVisible(project, owner))
    return fail(404, "There’s no such project.");
  if (project.ownerId === reporter.user.id)
    return fail(400, "That’s your own project.");
  if (!REPORT_REASONS.includes(input.reason as ReportReason))
    return fail(400, "Choose what’s wrong with it.");
  const details = input.details.trim();
  if (details.length > MAX_MESSAGE_LENGTH)
    return fail(
      400,
      `Keep the details under ${String(MAX_MESSAGE_LENGTH)} characters.`,
    );

  const [existing] = await db
    .select({ id: mcProjectReports.id })
    .from(mcProjectReports)
    .where(
      and(
        eq(mcProjectReports.projectId, project.id),
        eq(mcProjectReports.reporterId, reporter.user.id),
        eq(mcProjectReports.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return ok("already-reported");

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(mcProjectReports)
    .where(
      and(
        eq(mcProjectReports.reporterId, reporter.user.id),
        gt(mcProjectReports.createdAt, dayAgo),
      ),
    );
  if (!reporter.isAdmin && (recent?.n ?? 0) >= REPORTS_PER_DAY)
    return fail(429, "You’ve sent a lot of reports today. Try again tomorrow.");

  await db.insert(mcProjectReports).values({
    projectId: project.id,
    reporterId: reporter.user.id,
    reason: input.reason,
    details,
    createdAt: now,
  });

  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "project-report",
        summary: `“${project.name}” was reported (${input.reason})`,
        path: "/admin/minecraft/?tab=reports",
      },
      now,
    ),
  );
  // Enough established reporters hide it until the admin looks (never the admin's).
  if ((await deps.isAdminId?.(project.ownerId)) !== true) {
    const reporters = await db
      .selectDistinct({ id: users.id, createdAt: users.createdAt })
      .from(mcProjectReports)
      .innerJoin(users, eq(users.id, mcProjectReports.reporterId))
      .where(
        and(
          eq(mcProjectReports.projectId, project.id),
          eq(mcProjectReports.status, "open"),
        ),
      );
    const counting = reporters.filter((row) =>
      reporterCounts(row.createdAt, now),
    ).length;
    if (counting >= PROJECT_REPORTS_TO_HIDE)
      await setHidden(db, project.id, HIDDEN_BY_PROJECT_REPORTS, now);
  }
  return ok("reported");
}

/** The admin settles a project's open reports: hide it, or dismiss them. */
export async function resolveProjectReports(
  deps: Pick<StorageDeps, "db" | "now">,
  project: McProject,
  outcome: "dismissed" | "actioned",
  reason: string | null,
): Promise<void> {
  const now = deps.now?.() ?? new Date();
  const why = reason?.trim();
  const takedown =
    why === undefined || why === "" ? "Taken down by the site owner." : why;
  await deps.db
    .update(mcProjectReports)
    .set({ status: outcome, resolvedAt: now })
    .where(
      and(
        eq(mcProjectReports.projectId, project.id),
        eq(mcProjectReports.status, "open"),
      ),
    );
  if (outcome === "actioned")
    await setHidden(deps.db, project.id, takedown, now);
  else if (project.hiddenReason === HIDDEN_BY_PROJECT_REPORTS)
    await setHidden(deps.db, project.id, null, now);
}

export interface ProjectReportView {
  id: number;
  reason: string;
  details: string;
  createdAt: Date;
  reporterLogin: string | null;
  project: { id: number; slug: string; type: McProject["type"]; name: string };
}

/** Open project reports, oldest first, for the review queue. */
export async function openProjectReports(
  deps: Pick<StorageDeps, "db">,
): Promise<ProjectReportView[]> {
  const rows = await deps.db
    .select({
      report: mcProjectReports,
      reporterLogin: users.username,
      project: {
        id: mcProjects.id,
        slug: mcProjects.slug,
        type: mcProjects.type,
        name: mcProjects.name,
      },
    })
    .from(mcProjectReports)
    .innerJoin(mcProjects, eq(mcProjects.id, mcProjectReports.projectId))
    .leftJoin(users, eq(users.id, mcProjectReports.reporterId))
    .where(eq(mcProjectReports.status, "open"))
    .orderBy(asc(mcProjectReports.createdAt));
  return rows.map((row) => ({
    id: row.report.id,
    reason: row.report.reason,
    details: row.report.details,
    createdAt: row.report.createdAt,
    reporterLogin: row.reporterLogin,
    project: row.project,
  }));
}

// --- Account ------------------------------------------------------------------

/** Everything the platform keeps about someone, for the account export. */
export async function minecraftExport(
  deps: Pick<StorageDeps, "db">,
  userId: string,
) {
  const { db } = deps;
  const projects = await db
    .select()
    .from(mcProjects)
    .where(eq(mcProjects.ownerId, userId))
    .orderBy(asc(mcProjects.createdAt));
  const ids = projects.map((project) => project.id);
  const releases = ids.length
    ? await db
        .select()
        .from(mcReleases)
        .where(inArray(mcReleases.projectId, ids))
        .orderBy(asc(mcReleases.createdAt))
    : [];
  const releaseIds = releases.map((release) => release.id);
  const [releaseFiles, dependencies, gallery] = await Promise.all([
    releaseIds.length
      ? db
          .select()
          .from(mcReleaseFiles)
          .where(inArray(mcReleaseFiles.releaseId, releaseIds))
      : [],
    releaseIds.length
      ? db
          .select()
          .from(mcDependencies)
          .where(inArray(mcDependencies.releaseId, releaseIds))
      : [],
    ids.length
      ? db
          .select()
          .from(mcGallery)
          .where(inArray(mcGallery.projectId, ids))
          .orderBy(asc(mcGallery.position))
      : [],
  ]);
  const reports = await db
    .select({
      projectId: mcProjectReports.projectId,
      reason: mcProjectReports.reason,
      details: mcProjectReports.details,
      status: mcProjectReports.status,
      createdAt: mcProjectReports.createdAt,
    })
    .from(mcProjectReports)
    .where(eq(mcProjectReports.reporterId, userId))
    .orderBy(desc(mcProjectReports.createdAt));
  return {
    projects: projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      type: project.type,
      edition: project.edition,
      name: project.name,
      summary: project.summary,
      description: project.description,
      tags: project.tags,
      license: project.license,
      licenseText: project.licenseText,
      links: project.links,
      state: project.state,
      hidden: project.hiddenAt !== null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      gallery: gallery
        .filter((image) => image.projectId === project.id)
        .map((image) => ({ fileId: image.fileId, caption: image.caption })),
      releases: releases
        .filter((release) => release.projectId === project.id)
        .map((release) => ({
          version: release.version,
          title: release.title,
          channel: release.channel,
          changelog: release.changelog,
          gameVersions: release.gameVersions,
          loaders: release.loaders,
          createdAt: release.createdAt,
          releasedAt: release.releasedAt,
          files: releaseFiles
            .filter((link) => link.releaseId === release.id)
            .map((link) => ({ fileId: link.fileId, main: link.primary })),
          dependencies: dependencies
            .filter((dep) => dep.releaseId === release.id)
            .map((dep) => ({
              kind: dep.kind,
              name: dep.name,
              url: dep.url,
              projectId: dep.projectId,
            })),
        })),
    })),
    reportsSent: reports,
  };
}
