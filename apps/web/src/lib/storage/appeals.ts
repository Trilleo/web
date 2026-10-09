/**
 * Appeals: an uploader asks the admin to reconsider a refused or taken-down file,
 * once per file, while its bytes are still kept (an open appeal also stops the
 * purge). Accepting restores the file, clears its strike and unblocks its bytes.
 */
import { fileAppeals, files, users, type Database } from "@trilleo/db";
import { MAX_MESSAGE_LENGTH } from "@trilleo/storage";
import { and, asc, eq } from "drizzle-orm";
import {
  actOnFile,
  type Requester,
  type Result,
  type StorageDeps,
} from "./service";
import { alertAdmin } from "../mail/alerts";
import { notifyAppealDecision, safely } from "../mail/notify";
import { clearFileStrikes } from "./standing";
import { getFile, logEvent, unblockFile } from "./store";

export async function appealFile(
  deps: StorageDeps,
  requester: Requester,
  input: { fileId: string; message: string },
): Promise<Result<true>> {
  const { db } = deps;
  const row = await getFile(db, input.fileId);
  if (row?.ownerId !== requester.user.id)
    return { ok: false, status: 404, error: "There’s no such file." };
  if (row.status !== "rejected" && row.status !== "removed")
    return {
      ok: false,
      status: 409,
      error: "Only refused or taken-down files can be appealed.",
    };
  if (row.purgedAt)
    return {
      ok: false,
      status: 409,
      error: "That file has already been deleted, so it can’t be appealed.",
    };
  const message = input.message.trim();
  if (!message)
    return { ok: false, status: 400, error: "Say why it should be allowed." };
  if (message.length > MAX_MESSAGE_LENGTH)
    return {
      ok: false,
      status: 400,
      error: `Keep it under ${String(MAX_MESSAGE_LENGTH)} characters.`,
    };

  const now = deps.now?.() ?? new Date();
  const inserted = await db
    .insert(fileAppeals)
    .values({
      fileId: row.id,
      userId: requester.user.id,
      message,
      createdAt: now,
    })
    .onConflictDoNothing({ target: fileAppeals.fileId })
    .returning({ id: fileAppeals.id });
  if (inserted.length === 0)
    return {
      ok: false,
      status: 409,
      error: "You’ve already appealed this file.",
    };
  await logEvent(db, {
    fileId: row.id,
    subjectId: requester.user.id,
    actorId: requester.user.id,
    action: "appeal",
    reason: message,
    createdAt: now,
  });
  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "appeal",
        summary: `@${requester.user.githubLogin} appealed “${row.name}”`,
        path: "/admin/files/review?tab=appeals",
      },
      now,
    ),
  );
  return { ok: true, value: true };
}

export async function decideAppeal(
  deps: StorageDeps,
  admin: Requester,
  input: { appealId: number; accept: boolean; response: string },
): Promise<Result<true>> {
  const { db } = deps;
  if (!admin.isAdmin)
    return {
      ok: false,
      status: 403,
      error: "Only the site owner can do that.",
    };
  const [appeal] = await db
    .select()
    .from(fileAppeals)
    .where(eq(fileAppeals.id, input.appealId))
    .limit(1);
  if (appeal?.status !== "open")
    return { ok: false, status: 404, error: "There’s no such open appeal." };

  const now = deps.now?.() ?? new Date();
  if (input.accept) {
    // The appeal’s own email says it’s restored: no second one about the file.
    const restored = await actOnFile(
      deps,
      admin,
      appeal.fileId,
      "restore",
      null,
      {
        notify: false,
      },
    );
    if (!restored.ok) return restored;
    await clearFileStrikes(db, {
      userId: appeal.userId,
      fileId: appeal.fileId,
      actorId: admin.user.id,
      now,
    });
    await unblockFile(db, appeal.fileId);
  }
  const response = input.response.trim();
  await db
    .update(fileAppeals)
    .set({
      status: input.accept ? "accepted" : "denied",
      response: response || null,
      decidedAt: now,
    })
    .where(eq(fileAppeals.id, appeal.id));
  await logEvent(db, {
    fileId: appeal.fileId,
    subjectId: appeal.userId,
    actorId: admin.user.id,
    action: input.accept ? "appeal-accepted" : "appeal-denied",
    reason: response || null,
    createdAt: now,
  });
  await safely("appeal", async () =>
    notifyAppealDecision(
      db,
      {
        userId: appeal.userId,
        file: await getFile(db, appeal.fileId),
        accepted: input.accept,
        response,
      },
      now,
    ),
  );
  return { ok: true, value: true };
}

export interface AppealView {
  id: number;
  fileId: string;
  message: string;
  createdAt: Date;
  userLogin: string | null;
}

/** Open appeals, oldest first. */
export async function openAppeals(db: Database): Promise<AppealView[]> {
  return db
    .select({
      id: fileAppeals.id,
      fileId: fileAppeals.fileId,
      message: fileAppeals.message,
      createdAt: fileAppeals.createdAt,
      userLogin: users.githubLogin,
    })
    .from(fileAppeals)
    .innerJoin(files, eq(files.id, fileAppeals.fileId))
    .leftJoin(users, eq(users.id, fileAppeals.userId))
    .where(eq(fileAppeals.status, "open"))
    .orderBy(asc(fileAppeals.createdAt));
}

/** Someone's appeals by file id (their files page shows each one's state). */
export async function appealsOf(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(fileAppeals)
    .where(and(eq(fileAppeals.userId, userId)));
  return new Map(rows.map((row) => [row.fileId, row]));
}
