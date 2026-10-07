/**
 * Keeps projects in step with their files. A release is live while its main file is
 * published; a project can be seen by others only while it has a live release
 * (`lastReleasedAt` set). Storage calls `syncFile` whenever a Minecraft file changes
 * status (approved, refused, taken down, deleted…), so nothing here polls.
 */
import {
  files,
  mcGallery,
  mcProjects,
  mcReleaseFiles,
  mcReleases,
  type Database,
  type StoredFile,
} from "@trilleo/db";
import { and, eq, max, min } from "drizzle-orm";
import { getStorage } from "../storage/config";
import { MC_RENDER_VERSION, renderMarkdown } from "./render";

/** Whether a file's purpose belongs to the platform. */
export function isMinecraftPurpose(purpose: string): boolean {
  return purpose === "minecraft" || purpose === "minecraft-media";
}

/** After a Minecraft file changed status. */
export async function syncFile(
  db: Database,
  file: Pick<StoredFile, "id" | "purpose">,
  now = new Date(),
): Promise<void> {
  if (file.purpose === "minecraft") {
    const [link] = await db
      .select({ releaseId: mcReleaseFiles.releaseId })
      .from(mcReleaseFiles)
      .where(eq(mcReleaseFiles.fileId, file.id))
      .limit(1);
    if (link) await syncRelease(db, link.releaseId, now);
  } else if (file.purpose === "minecraft-media") {
    const [image] = await db
      .select({ projectId: mcGallery.projectId })
      .from(mcGallery)
      .where(eq(mcGallery.fileId, file.id))
      .limit(1);
    if (image) await rerenderProject(db, image.projectId);
  }
}

/** Dates a release's first going live, then brings its project up to date. */
export async function syncRelease(
  db: Database,
  releaseId: number,
  now = new Date(),
): Promise<void> {
  const [row] = await db
    .select({
      projectId: mcReleases.projectId,
      releasedAt: mcReleases.releasedAt,
      status: files.status,
    })
    .from(mcReleases)
    .leftJoin(
      mcReleaseFiles,
      and(
        eq(mcReleaseFiles.releaseId, mcReleases.id),
        eq(mcReleaseFiles.primary, true),
      ),
    )
    .leftJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(eq(mcReleases.id, releaseId))
    .limit(1);
  if (!row) return;
  if (row.status === "published" && !row.releasedAt) {
    await db
      .update(mcReleases)
      .set({ releasedAt: now })
      .where(eq(mcReleases.id, releaseId));
  }
  await syncProject(db, row.projectId);
}

/** Sets a project's release dates from its live releases. */
export async function syncProject(
  db: Database,
  projectId: number,
): Promise<void> {
  const [live] = await db
    .select({
      first: min(mcReleases.releasedAt),
      last: max(mcReleases.releasedAt),
    })
    .from(mcReleases)
    .innerJoin(
      mcReleaseFiles,
      and(
        eq(mcReleaseFiles.releaseId, mcReleases.id),
        eq(mcReleaseFiles.primary, true),
      ),
    )
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(
      and(eq(mcReleases.projectId, projectId), eq(files.status, "published")),
    );
  const [project] = await db
    .select({ firstReleasedAt: mcProjects.firstReleasedAt })
    .from(mcProjects)
    .where(eq(mcProjects.id, projectId))
    .limit(1);
  if (!project) return;
  const last = live?.last ?? null;
  const first = project.firstReleasedAt ?? live?.first ?? null;
  await db
    .update(mcProjects)
    .set({ firstReleasedAt: first, lastReleasedAt: last })
    .where(eq(mcProjects.id, projectId));
}

/** The full URLs of a project's published gallery images (what descriptions may show). */
export async function galleryUrls(
  db: Database,
  projectId: number,
): Promise<Set<string>> {
  const storage = getStorage();
  if (!storage) return new Set();
  const rows = await db
    .select({ key: files.key })
    .from(mcGallery)
    .innerJoin(files, eq(files.id, mcGallery.fileId))
    .where(
      and(eq(mcGallery.projectId, projectId), eq(files.status, "published")),
    );
  return new Set(rows.map((row) => storage.publicUrl(row.key)));
}

/** Renders a project's description again (its gallery changed). */
export async function rerenderProject(
  db: Database,
  projectId: number,
): Promise<void> {
  const [project] = await db
    .select({ description: mcProjects.description })
    .from(mcProjects)
    .where(eq(mcProjects.id, projectId))
    .limit(1);
  if (!project) return;
  const images = await galleryUrls(db, projectId);
  await db
    .update(mcProjects)
    .set({
      descriptionHtml: renderMarkdown(project.description, images),
      renderVersion: MC_RENDER_VERSION,
    })
    .where(eq(mcProjects.id, projectId));
}
