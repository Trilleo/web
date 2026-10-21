/**
 * Files attached to posts (storage purpose "forum"): images shown in the post and
 * opened in a lightbox, other files listed to download. An upload is attached to
 * its uploader as it starts (no post yet: `attachUpload`), and posting links it to
 * the post (`linkAttachments`, at most ATTACHMENT_LIMITS.perPost). Files from
 * members the forum trusts (users.trusted_at) are published once scanned
 * (`forumTrustedUpload`, StorageDeps' waivesReview); others wait for review. Until a
 * file is public only its uploader and moderators see it, marked as waiting.
 */
import {
  files,
  forumAttachments,
  users,
  type Database,
  type StoredFile,
} from "@trilleo/db";
import { ATTACHMENT_LIMITS, isImageName } from "@trilleo/forum";
import { isServedPublicly } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { toSummary } from "../storage/service";

export const FORUM_FILES = "forum";
const ATTACHABLE: readonly StoredFile["status"][] = ["uploading", "processing"];

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** Ties an upload that has just started to its uploader, for their next post. */
export async function attachUpload(
  db: Database,
  input: { userId: string; fileId: string; now?: Date },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, input.fileId))
    .limit(1);
  if (file?.ownerId !== input.userId || file.purpose !== FORUM_FILES)
    return { ok: false, status: 404, error: "There’s no such upload." };
  if (!ATTACHABLE.includes(file.status))
    return {
      ok: false,
      status: 409,
      error: "That upload can’t be used any more.",
    };
  await db
    .insert(forumAttachments)
    .values({
      fileId: file.id,
      userId: input.userId,
      createdAt: input.now ?? new Date(),
    })
    .onConflictDoNothing();
  return { ok: true };
}

/**
 * Links someone's unposted uploads to a post, up to the per-post limit (counting
 * what it already has). Returns how many were linked.
 */
export async function linkAttachments(
  db: Db,
  input: { userId: string; postId: number; fileIds: readonly string[] },
): Promise<number> {
  const ids = [...new Set(input.fileIds)].filter((id) =>
    /^[A-Za-z0-9_-]{8,64}$/.test(id),
  );
  if (ids.length === 0) return 0;
  const existing = await db
    .select({ fileId: forumAttachments.fileId })
    .from(forumAttachments)
    .where(eq(forumAttachments.postId, input.postId));
  const room = Math.max(0, ATTACHMENT_LIMITS.perPost - existing.length);
  const linkable = ids.slice(0, room);
  if (linkable.length === 0) return 0;
  const linked = await db
    .update(forumAttachments)
    .set({ postId: input.postId })
    .where(
      and(
        inArray(forumAttachments.fileId, linkable),
        eq(forumAttachments.userId, input.userId),
        isNull(forumAttachments.postId),
      ),
    )
    .returning({ fileId: forumAttachments.fileId });
  for (const [sort, fileId] of linkable.entries())
    await db
      .update(forumAttachments)
      .set({ sort: existing.length + sort })
      .where(eq(forumAttachments.fileId, fileId));
  return linked.length;
}

/** Takes files off a post (the author editing, or a moderator). */
export async function unlinkAttachments(
  db: Db,
  postId: number,
  fileIds: readonly string[],
): Promise<void> {
  if (fileIds.length === 0) return;
  await db
    .delete(forumAttachments)
    .where(
      and(
        eq(forumAttachments.postId, postId),
        inArray(forumAttachments.fileId, [...fileIds]),
      ),
    );
}

export interface AttachmentView {
  id: string;
  name: string;
  size: number;
  image: boolean;
  /** Where the file is served (public files only). */
  url: string | null;
  thumbnailUrl: string | null;
  /** Its page (for the uploader and moderators while it waits). */
  pageUrl: string;
  status: StoredFile["status"];
  /** Not public yet: only its uploader and moderators see it. */
  waiting: boolean;
}

/**
 * Each post's attachments as a viewer sees them: public files for everyone; files
 * still being checked or waiting for review for their uploader and moderators;
 * refused or removed files for nobody.
 */
export async function attachmentsFor(
  db: Database,
  storage: StorageDriver | null,
  postIds: readonly number[],
  viewer: { id: string | null; mod: boolean },
): Promise<Map<number, AttachmentView[]>> {
  const out = new Map<number, AttachmentView[]>();
  if (postIds.length === 0) return out;
  const rows = await db
    .select({ attachment: forumAttachments, file: files })
    .from(forumAttachments)
    .innerJoin(files, eq(files.id, forumAttachments.fileId))
    .where(inArray(forumAttachments.postId, [...postIds]))
    .orderBy(asc(forumAttachments.sort), asc(forumAttachments.createdAt));
  for (const { attachment, file } of rows) {
    if (attachment.postId === null) continue;
    const isPublic = isServedPublicly(file.status, file.visibility);
    const waiting = ["uploading", "processing", "pending_review"].includes(
      file.status,
    );
    if (
      !isPublic &&
      !(waiting && (viewer.mod || viewer.id === attachment.userId))
    )
      continue;
    const summary = storage ? toSummary(file, storage) : null;
    const view: AttachmentView = {
      id: file.id,
      name: file.name,
      size: file.size,
      image: isImageName(file.name),
      url: summary?.publicUrl ?? null,
      thumbnailUrl: summary?.thumbnailUrl ?? null,
      pageUrl: summary?.pageUrl ?? `/files/${file.id}/`,
      status: file.status,
      waiting: !isPublic,
    };
    out.set(attachment.postId, [...(out.get(attachment.postId) ?? []), view]);
  }
  return out;
}

/** A forum upload from someone the forum trusts skips the review queue (still scanned). */
export async function forumTrustedUpload(
  db: Database,
  file: Pick<StoredFile, "ownerId" | "purpose">,
): Promise<boolean> {
  if (file.purpose !== FORUM_FILES || !file.ownerId) return false;
  const [owner] = await db
    .select({ trustedAt: users.trustedAt, blockedAt: users.blockedAt })
    .from(users)
    .where(eq(users.id, file.ownerId))
    .limit(1);
  return owner?.trustedAt != null && owner.blockedAt === null;
}

export async function attachmentsExport(db: Database, userId: string) {
  return db
    .select({
      file: files.name,
      postId: forumAttachments.postId,
      at: forumAttachments.createdAt,
    })
    .from(forumAttachments)
    .innerJoin(files, eq(files.id, forumAttachments.fileId))
    .where(eq(forumAttachments.userId, userId));
}
