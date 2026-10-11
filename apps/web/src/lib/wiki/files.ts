/**
 * Pictures uploaded for a wiki (storage purpose "wiki-media"): item icons and
 * screenshots. A member's upload is attached to the wiki as it starts (like the
 * Minecraft gallery's), and a file attached to a wiki its uploader is a member of is
 * published once scanned, without the admin's review (StorageDeps' waivesReview).
 * Anyone else's upload to the purpose gets the usual review.
 */
import {
  files,
  users,
  wikiFiles,
  wikiMembers,
  type Database,
  type StoredFile,
} from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { and, desc, eq } from "drizzle-orm";
import { toSummary } from "../storage/service";

export const WIKI_MEDIA = "wiki-media";
/** Uploads that are still arriving can be attached. */
const ATTACHABLE: readonly StoredFile["status"][] = ["uploading", "processing"];

export type AttachResult =
  { ok: true } | { ok: false; status: number; error: string };

/** Ties a member's upload (just started) to their wiki. */
export async function attachWikiFile(
  db: Database,
  input: { wikiId: number; userId: string; fileId: string; now?: Date },
): Promise<AttachResult> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, input.fileId))
    .limit(1);
  if (file?.ownerId !== input.userId || file.purpose !== WIKI_MEDIA)
    return { ok: false, status: 404, error: "There’s no such upload." };
  if (!ATTACHABLE.includes(file.status))
    return {
      ok: false,
      status: 409,
      error: "That upload can’t be used any more.",
    };
  await db
    .insert(wikiFiles)
    .values({
      wikiId: input.wikiId,
      fileId: file.id,
      addedBy: input.userId,
      createdAt: input.now ?? new Date(),
    })
    .onConflictDoNothing();
  return { ok: true };
}

/** Whether the file is a member's picture for their wiki (so it skips review). */
export async function wikiMemberUpload(
  db: Database,
  file: Pick<StoredFile, "id" | "ownerId" | "purpose">,
): Promise<boolean> {
  if (file.purpose !== WIKI_MEDIA || !file.ownerId) return false;
  const [row] = await db
    .select({ wikiId: wikiFiles.wikiId })
    .from(wikiFiles)
    .innerJoin(
      wikiMembers,
      and(
        eq(wikiMembers.wikiId, wikiFiles.wikiId),
        eq(wikiMembers.userId, file.ownerId),
      ),
    )
    .where(eq(wikiFiles.fileId, file.id))
    .limit(1);
  return row !== undefined;
}

export interface WikiFileRow {
  id: string;
  name: string;
  status: StoredFile["status"];
  uploader: string | null;
  createdAt: Date;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  pageUrl: string;
}

/** The wiki's pictures, newest first. */
export async function listWikiFiles(
  db: Database,
  storage: StorageDriver | null,
  wikiId: number,
): Promise<WikiFileRow[]> {
  const rows = await db
    .select({ file: files, uploader: users.username })
    .from(wikiFiles)
    .innerJoin(files, eq(files.id, wikiFiles.fileId))
    .leftJoin(users, eq(users.id, files.ownerId))
    .where(eq(wikiFiles.wikiId, wikiId))
    .orderBy(desc(wikiFiles.createdAt));
  return rows.map(({ file, uploader }) => {
    const summary = storage ? toSummary(file, storage) : null;
    return {
      id: file.id,
      name: file.name,
      status: file.status,
      uploader,
      createdAt: file.createdAt,
      publicUrl: summary?.publicUrl ?? null,
      thumbnailUrl: summary?.thumbnailUrl ?? null,
      pageUrl: summary?.pageUrl ?? `/files/${file.id}/`,
    };
  });
}
