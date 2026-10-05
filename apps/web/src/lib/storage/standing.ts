/**
 * Where an uploader stands: trusted or not, strikes, bans. The rules are
 * @trilleo/storage's policy.ts; this file keeps the facts in the database and logs
 * every change in storage_events (with the uploader as `subjectId`).
 */
import {
  files,
  uploadStrikes,
  users,
  type Database,
  type UploadStrike,
} from "@trilleo/db";
import {
  earnsTrust,
  isTrustedUploader,
  strikeExpiry,
  strikesBan,
  type UploadTrustMode,
  type UploaderRole,
  type UploaderStanding,
} from "@trilleo/storage";
import { and, count, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { logEvent } from "./store";

export interface Standing extends UploaderStanding {
  banReason: string | null;
}

export async function standingOf(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<Standing> {
  const [user] = await db
    .select({
      trust: users.uploadTrust,
      trustedAt: users.uploadTrustedAt,
      bannedAt: users.uploadBannedAt,
      banReason: users.uploadBanReason,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return {
    trust: user?.trust ?? "auto",
    trustedAt: user?.trustedAt ?? null,
    bannedAt: user?.bannedAt ?? null,
    banReason: user?.banReason ?? null,
    activeStrikes: await activeStrikeCount(db, userId, now),
  };
}

async function activeStrikeCount(
  db: Database,
  userId: string,
  now: Date,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(uploadStrikes)
    .where(
      and(
        eq(uploadStrikes.userId, userId),
        isNull(uploadStrikes.clearedAt),
        gt(uploadStrikes.expiresAt, now),
      ),
    );
  return row?.n ?? 0;
}

/** Every strike, newest first (the admin's and the uploader's view). */
export async function strikesOf(
  db: Database,
  userId: string,
): Promise<UploadStrike[]> {
  return db
    .select()
    .from(uploadStrikes)
    .where(eq(uploadStrikes.userId, userId))
    .orderBy(desc(uploadStrikes.createdAt));
}

/** The role an uploader's limits and review come from. */
export async function uploaderRole(
  db: Database,
  userId: string,
  isAdmin: boolean,
  now = new Date(),
): Promise<UploaderRole> {
  if (isAdmin) return "admin";
  return isTrustedUploader(await standingOf(db, userId, now))
    ? "trusted"
    : "user";
}

/**
 * A strike for a file refused or taken down for cause. Clears earned trust, and
 * bans uploading once the strikes add up. Returns whether that ban happened now.
 */
export async function addStrike(
  db: Database,
  input: {
    userId: string;
    fileId: string | null;
    reason: string;
    actorId: string | null;
    now?: Date;
  },
): Promise<{ banned: boolean }> {
  const now = input.now ?? new Date();
  await db.insert(uploadStrikes).values({
    userId: input.userId,
    fileId: input.fileId,
    reason: input.reason,
    createdAt: now,
    expiresAt: strikeExpiry(now),
  });
  await db
    .update(users)
    .set({ uploadTrustedAt: null })
    .where(eq(users.id, input.userId));
  await logEvent(db, {
    fileId: input.fileId,
    subjectId: input.userId,
    actorId: input.actorId,
    action: "strike",
    reason: input.reason,
    createdAt: now,
  });

  const standing = await standingOf(db, input.userId, now);
  if (standing.bannedAt || !strikesBan(standing.activeStrikes))
    return { banned: false };
  await db
    .update(users)
    .set({ uploadBannedAt: now, uploadBanReason: "strikes" })
    .where(eq(users.id, input.userId));
  await logEvent(db, {
    subjectId: input.userId,
    actorId: null,
    action: "ban",
    reason: `${String(standing.activeStrikes)} active strikes`,
    createdAt: now,
  });
  return { banned: true };
}

/**
 * Clears the strikes a file brought (its appeal was accepted). An automatic ban
 * lifts once the remaining strikes are under the limit.
 */
export async function clearFileStrikes(
  db: Database,
  input: { userId: string; fileId: string; actorId: string; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  const cleared = await db
    .update(uploadStrikes)
    .set({ clearedAt: now })
    .where(
      and(
        eq(uploadStrikes.fileId, input.fileId),
        isNull(uploadStrikes.clearedAt),
      ),
    )
    .returning({ id: uploadStrikes.id });
  if (cleared.length === 0) return;
  await logEvent(db, {
    fileId: input.fileId,
    subjectId: input.userId,
    actorId: input.actorId,
    action: "clear-strike",
    createdAt: now,
  });
  await liftAutomaticBan(db, input.userId, input.actorId, now);
}

async function liftAutomaticBan(
  db: Database,
  userId: string,
  actorId: string | null,
  now: Date,
): Promise<void> {
  const standing = await standingOf(db, userId, now);
  if (
    standing.bannedAt &&
    standing.banReason === "strikes" &&
    !strikesBan(standing.activeStrikes)
  ) {
    await db
      .update(users)
      .set({ uploadBannedAt: null, uploadBanReason: null })
      .where(eq(users.id, userId));
    await logEvent(db, {
      subjectId: userId,
      actorId,
      action: "unban",
      reason: "Strikes under the limit",
      createdAt: now,
    });
  }
}

/** Gives automatic trust if the uploader has just earned it. */
export async function grantTrustIfEarned(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const standing = await standingOf(db, userId, now);
  const [approved] = await db
    .select({ n: count() })
    .from(files)
    .where(
      and(
        eq(files.ownerId, userId),
        eq(files.status, "published"),
        isNotNull(files.reviewedAt),
      ),
    );
  if (!earnsTrust(standing, approved?.n ?? 0)) return false;
  await db
    .update(users)
    .set({ uploadTrustedAt: now })
    .where(eq(users.id, userId));
  await logEvent(db, {
    subjectId: userId,
    actorId: null,
    action: "trust",
    reason: "Earned by approved uploads",
    createdAt: now,
  });
  return true;
}

/** The admin sets someone's trust: by history (auto), always, or never. */
export async function setTrust(
  db: Database,
  input: { userId: string; mode: UploadTrustMode; actorId: string; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  await db
    .update(users)
    .set({ uploadTrust: input.mode })
    .where(eq(users.id, input.userId));
  await logEvent(db, {
    subjectId: input.userId,
    actorId: input.actorId,
    action: "trust",
    reason: `Set to ${input.mode}`,
    createdAt: now,
  });
  if (input.mode === "auto") await grantTrustIfEarned(db, input.userId, now);
}

export async function banUploader(
  db: Database,
  input: { userId: string; reason: string; actorId: string; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  await db
    .update(users)
    .set({ uploadBannedAt: now, uploadBanReason: input.reason })
    .where(eq(users.id, input.userId));
  await logEvent(db, {
    subjectId: input.userId,
    actorId: input.actorId,
    action: "ban",
    reason: input.reason,
    createdAt: now,
  });
}

/** Lifts a ban. Optionally clears every active strike too (a fresh start). */
export async function unbanUploader(
  db: Database,
  input: {
    userId: string;
    clearStrikes: boolean;
    actorId: string;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  if (input.clearStrikes) {
    await db
      .update(uploadStrikes)
      .set({ clearedAt: now })
      .where(
        and(
          eq(uploadStrikes.userId, input.userId),
          isNull(uploadStrikes.clearedAt),
        ),
      );
    await logEvent(db, {
      subjectId: input.userId,
      actorId: input.actorId,
      action: "clear-strike",
      reason: "All strikes cleared",
      createdAt: now,
    });
  }
  await db
    .update(users)
    .set({ uploadBannedAt: null, uploadBanReason: null })
    .where(eq(users.id, input.userId));
  await logEvent(db, {
    subjectId: input.userId,
    actorId: input.actorId,
    action: "unban",
    createdAt: now,
  });
}
