/**
 * Builds' 3D previews: made by the creator's browser after a build is uploaded
 * (@trilleo/mc-files' compact form), checked here by decoding it, kept in
 * mc_previews, and served while their file is. The materials list comes from the
 * decoded blocks, so it's the server's count, not the browser's word.
 */
import {
  MAX_PREVIEW_BYTES,
  PreviewError,
  countBlocks,
  decodePreview,
} from "@trilleo/mc-files";
import { extensionOf } from "@trilleo/storage";
import {
  files,
  mcPreviews,
  mcReleaseFiles,
  mcReleases,
  type Database,
  type McPreview,
  type McProject,
  type StoredFile,
} from "@trilleo/db";
import { and, desc, eq } from "drizzle-orm";
import { PREVIEWABLE_EXTENSIONS } from "./catalog";
import { canEdit, fileUses, type Result, type Viewer } from "./store";

const fail = <T>(status: number, error: string): Result<T> => ({
  ok: false,
  status,
  error,
});

export function isPreviewable(name: string): boolean {
  return PREVIEWABLE_EXTENSIONS.includes(extensionOf(name));
}

/** Keeps a build file's preview, once. Only the file's owner (or the admin). */
export async function storePreview(
  db: Database,
  viewer: Viewer,
  fileId: string,
  bytes: Uint8Array,
  now = new Date(),
): Promise<Result<McPreview>> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!file) return fail(404, "There’s no such file.");
  if (!viewer.isAdmin && file.ownerId !== viewer.userId)
    return fail(404, "There’s no such file.");
  const use = (await fileUses(db, [fileId])).get(fileId);
  if (use?.type !== "build" || use.role === "gallery image")
    return fail(400, "Only builds’ files get a 3D preview.");
  if (!isPreviewable(file.name))
    return fail(415, "That kind of build can’t be previewed.");
  if (bytes.length === 0 || bytes.length > MAX_PREVIEW_BYTES)
    return fail(413, "That preview is too big.");
  let model;
  try {
    model = await decodePreview(bytes);
  } catch (error) {
    if (error instanceof PreviewError) return fail(400, error.message);
    throw error;
  }
  const materials = countBlocks(model);
  const blocks = materials.reduce((sum, entry) => sum + entry.count, 0);
  const [row] = await db
    .insert(mcPreviews)
    .values({
      fileId,
      data: bytes,
      width: model.size[0],
      height: model.size[1],
      length: model.size[2],
      blocks,
      materials,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return fail(409, "That file already has a preview.");
  return { ok: true, value: row };
}

/** A preview's bytes, if the viewer may see its file, and whether everyone may. */
export async function previewBytes(
  db: Database,
  fileId: string,
  viewer: Viewer,
): Promise<{ data: Uint8Array; isPublic: boolean } | null> {
  const [row] = await db
    .select({ data: mcPreviews.data, file: files })
    .from(mcPreviews)
    .innerJoin(files, eq(files.id, mcPreviews.fileId))
    .where(eq(mcPreviews.fileId, fileId))
    .limit(1);
  if (!row) return null;
  const mayManage =
    viewer.isAdmin ||
    (row.file.ownerId !== null && row.file.ownerId === viewer.userId);
  const isPublic = row.file.status === "published";
  return isPublic || mayManage ? { data: row.data, isPublic } : null;
}

export type PreviewInfo = Omit<McPreview, "data"> & {
  /** The release it belongs to. */
  version: string;
  file: Pick<StoredFile, "id" | "name">;
};

/**
 * The preview a page shows: a release's (its main file's first), or the project's
 * newest live release with one. Others see previews of published files only.
 */
export async function previewFor(
  db: Database,
  project: McProject,
  viewer: Viewer,
  releaseId?: number,
): Promise<PreviewInfo | null> {
  const all = canEdit(project, viewer);
  const rows = await db
    .select({
      fileId: mcPreviews.fileId,
      width: mcPreviews.width,
      height: mcPreviews.height,
      length: mcPreviews.length,
      blocks: mcPreviews.blocks,
      materials: mcPreviews.materials,
      createdAt: mcPreviews.createdAt,
      version: mcReleases.version,
      name: files.name,
      status: files.status,
    })
    .from(mcPreviews)
    .innerJoin(files, eq(files.id, mcPreviews.fileId))
    .innerJoin(mcReleaseFiles, eq(mcReleaseFiles.fileId, mcPreviews.fileId))
    .innerJoin(mcReleases, eq(mcReleases.id, mcReleaseFiles.releaseId))
    .where(
      and(
        eq(mcReleases.projectId, project.id),
        releaseId === undefined ? undefined : eq(mcReleases.id, releaseId),
        all ? undefined : eq(files.status, "published"),
      ),
    )
    .orderBy(
      desc(mcReleases.releasedAt),
      desc(mcReleases.id),
      desc(mcReleaseFiles.primary),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    fileId: row.fileId,
    width: row.width,
    height: row.height,
    length: row.length,
    blocks: row.blocks,
    materials: row.materials,
    createdAt: row.createdAt,
    version: row.version,
    file: { id: row.fileId, name: row.name },
  };
}

export function previewPath(fileId: string): string {
  return `/minecraft/preview/${fileId}.bin`;
}
