/**
 * Syncs from the game: a program (a mod reading someone's attribute levels and
 * Hunting Box) sends a profile's shards through the API with a personal token
 * (scope "skyblock:sync"; routes in lib/api/routes/skyblock-sync.ts). Profiles are
 * found by Hypixel's profile ID; the first sync from one makes it, or takes over a
 * profile made on the site that has no Hypixel ID yet (`findOrMake`). The sync is
 * applied by @trilleo/skyblock/calc's `applySync` (the game wins for what it sends;
 * "keep" stays) and written as that profile's collection; each one is logged in
 * sb_sync_log with what changed and the progress after it.
 */
import {
  sbProfiles,
  sbSyncLog,
  toolData,
  type Database,
  type SbProfile,
} from "@trilleo/db";
import {
  PROFILE_LIMITS,
  profileKeyPrefix,
  type GameMode,
  type Rarity,
} from "@trilleo/skyblock";
import {
  SAVED_KEYS,
  applySync,
  collectionProgress,
  isCollection,
  readCollection,
  type CollectionProgress,
  type SyncChange,
  type SyncMode,
} from "@trilleo/skyblock/calc";
import { meta } from "@trilleo/tool-skyblock/meta";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ApiError } from "../api/errors";
import { listProfiles } from "./profiles";

export const SYNC_LOG_LIMITS = {
  /** Syncs are kept this long. */
  days: 365,
  /** And at most this many per profile (the newest). */
  perProfile: 1000,
  /** How many the collection page lists. */
  recent: 5,
} as const;

/** What the sync needs to know about the site's shards. */
export interface SyncShards {
  shards: readonly { id: string; name: string; rarity: Rarity }[];
}

/** What a program may say about a profile (any sync or PUT). */
export interface ProfileInfo {
  name?: string | undefined;
  minecraftUuid?: string | undefined;
  gameMode?: GameMode | undefined;
}

export interface ProfileView {
  id: number;
  name: string;
  hypixelProfileId: string | null;
  minecraftUuid: string | null;
  gameMode: GameMode | null;
  /** The one the site's pages show. */
  active: boolean;
  createdAt: string;
  lastSyncedAt: string | null;
}

export function profileView(
  profile: SbProfile,
  activeId: number | null,
): ProfileView {
  return {
    id: profile.id,
    name: profile.name,
    hypixelProfileId: profile.hypixelProfileId,
    minecraftUuid: profile.minecraftUuid,
    gameMode: (profile.gameMode as GameMode | null) ?? null,
    active: profile.id === activeId,
    createdAt: profile.createdAt.toISOString(),
    lastSyncedAt: profile.lastSyncedAt?.toISOString() ?? null,
  };
}

/** The active profile's ID: the one picked last. */
export function activeId(profiles: readonly SbProfile[]): number | null {
  const sorted = [...profiles].sort(
    (a, b) => b.selectedAt.getTime() - a.selectedAt.getTime() || b.id - a.id,
  );
  return sorted[0]?.id ?? null;
}

/** `name`, or `name (2)`, `name (3)`… so it isn't one of `taken`. */
function freeName(name: string, taken: readonly string[]): string {
  const used = new Set(taken.map((n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const suffix = ` (${String(n)})`;
    const candidate =
      name.slice(0, PROFILE_LIMITS.nameLength - suffix.length) + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * The profile with this Hypixel ID, made if there's none. A new one takes over the
 * site-made profile with the same name and no Hypixel ID, or the account's only
 * profile if it has none (the untouched "Main"), so the first sync doesn't leave an
 * empty duplicate beside it. Locks the row for the rest of the transaction.
 */
async function findOrMake(
  tx: Tx,
  userId: string,
  hypixelProfileId: string,
  info: ProfileInfo,
  now: Date,
): Promise<{ profile: SbProfile; created: boolean }> {
  const lock = async (id: number) => {
    const [row] = await tx
      .select()
      .from(sbProfiles)
      .where(eq(sbProfiles.id, id))
      .for("update");
    if (!row) throw new Error("The profile went away.");
    return row;
  };
  const profiles = await tx
    .select()
    .from(sbProfiles)
    .where(eq(sbProfiles.userId, userId))
    .orderBy(asc(sbProfiles.createdAt), asc(sbProfiles.id));
  const existing = profiles.find(
    (p) => p.hypixelProfileId === hypixelProfileId,
  );
  if (existing) return { profile: await lock(existing.id), created: false };

  const unlinked = profiles.filter((p) => p.hypixelProfileId === null);
  const claim =
    unlinked.find((p) => p.name.toLowerCase() === info.name?.toLowerCase()) ??
    (profiles.length === 1 ? unlinked[0] : undefined);
  if (claim) {
    const [claimed] = await tx
      .update(sbProfiles)
      .set({ hypixelProfileId })
      .where(eq(sbProfiles.id, claim.id))
      .returning();
    if (!claimed) throw new Error("The profile went away.");
    return { profile: await lock(claimed.id), created: false };
  }

  if (profiles.length >= PROFILE_LIMITS.perUser)
    throw new ApiError(
      "profile_limit",
      `The account already has ${String(PROFILE_LIMITS.perUser)} SkyBlock profiles. Delete one on the site first.`,
      { limit: PROFILE_LIMITS.perUser },
    );
  const name = freeName(
    info.name ?? `Profile ${String(profiles.length + 1)}`,
    profiles.map((p) => p.name),
  );
  const [row] = await tx
    .insert(sbProfiles)
    .values({
      userId,
      name,
      // The first profile keeps the plain keys; others get theirs below.
      keyPrefix: profiles.length === 0 ? "" : `new-${randomUUID()}`,
      hypixelProfileId,
      createdAt: now,
      // Not picked: a sync never changes what the site's pages show.
      selectedAt: profiles.length === 0 ? now : new Date(0),
    })
    .returning();
  if (!row) throw new Error("The profile wasn't made.");
  if (profiles.length === 0) return { profile: row, created: true };
  const [named] = await tx
    .update(sbProfiles)
    .set({ keyPrefix: profileKeyPrefix(row.id) })
    .where(eq(sbProfiles.id, row.id))
    .returning();
  if (!named) throw new Error("The profile wasn't made.");
  return { profile: named, created: true };
}

/** Updates what the program said about the profile (name, UUID, mode), if anything. */
async function describe(
  tx: Tx,
  profile: SbProfile,
  info: ProfileInfo,
  extra: Partial<Pick<SbProfile, "lastSyncedAt">> = {},
): Promise<SbProfile> {
  const others = (
    await tx
      .select({ id: sbProfiles.id, name: sbProfiles.name })
      .from(sbProfiles)
      .where(eq(sbProfiles.userId, profile.userId))
  ).filter((p) => p.id !== profile.id);
  const change: Partial<SbProfile> = { ...extra };
  if (info.name !== undefined && info.name !== profile.name)
    change.name = freeName(
      info.name,
      others.map((p) => p.name),
    );
  if (info.minecraftUuid !== undefined)
    change.minecraftUuid = info.minecraftUuid;
  if (info.gameMode !== undefined) change.gameMode = info.gameMode;
  if (Object.keys(change).length === 0) return profile;
  const [updated] = await tx
    .update(sbProfiles)
    .set(change)
    .where(eq(sbProfiles.id, profile.id))
    .returning();
  return updated ?? profile;
}

/** PUT a profile: made (or taken over) if needed, its details updated. */
export async function upsertProfile(
  db: Database,
  userId: string,
  hypixelProfileId: string,
  info: ProfileInfo,
  now = new Date(),
): Promise<{ profile: ProfileView; created: boolean }> {
  const { profile, created } = await db.transaction(async (tx) => {
    const found = await findOrMake(tx, userId, hypixelProfileId, info, now);
    return {
      profile: await describe(tx, found.profile, info),
      created: found.created,
    };
  });
  const profiles = await listProfiles(db, userId);
  return { profile: profileView(profile, activeId(profiles)), created };
}

async function collectionOf(tx: Tx | Database, userId: string, prefix: string) {
  const [row] = await tx
    .select({ value: toolData.value, updatedAt: toolData.updatedAt })
    .from(toolData)
    .where(
      and(
        eq(toolData.userId, userId),
        eq(toolData.tool, meta.slug),
        eq(toolData.key, prefix + SAVED_KEYS.collection),
      ),
    );
  return {
    collection: readCollection(row?.value),
    updatedAt: row?.updatedAt ?? null,
  };
}

/** A profile's collection as the API answers it: lists, by ID. */
export async function profileCollection(
  db: Database,
  userId: string,
  hypixelProfileId: string,
  data: SyncShards,
) {
  const [profile] = await db
    .select()
    .from(sbProfiles)
    .where(
      and(
        eq(sbProfiles.userId, userId),
        eq(sbProfiles.hypixelProfileId, hypixelProfileId),
      ),
    );
  if (!profile)
    throw new ApiError(
      "not_found",
      "No SkyBlock profile with that ID on this account: sync it first.",
    );
  const { collection, updatedAt } = await collectionOf(
    db,
    userId,
    profile.keyPrefix,
  );
  const sorted = (record: Record<string, number>) => Object.keys(record).sort();
  return {
    profile,
    levels: sorted(collection.levels).map((id) => ({
      id,
      level: collection.levels[id] ?? 0,
    })),
    held: sorted(collection.held).map((id) => ({
      id,
      count: collection.held[id] ?? 0,
    })),
    keep: [...collection.keep].sort(),
    updatedAt: updatedAt?.toISOString() ?? null,
    progress: collectionProgress(data.shards, collection),
  };
}

export interface SyncRequest {
  userId: string;
  hypixelProfileId: string;
  info: ProfileInfo;
  levels?: readonly { id: string; level: number }[] | undefined;
  held?: readonly { id: string; count: number }[] | undefined;
  mode: SyncMode;
  source: string;
  capturedAt?: Date | undefined;
  syncKey?: string | undefined;
}

export interface NamedChange extends SyncChange {
  name: string;
}

export interface SyncAnswer {
  syncId: number;
  /** True when this syncKey was seen before: nothing was applied again. */
  duplicate: boolean;
  /** True when this sync made the profile. */
  created: boolean;
  profile: ProfileView;
  changes: { levels: NamedChange[]; held: NamedChange[] };
  unknownIds: string[];
  progress: CollectionProgress;
}

/** Applies one sync, logs it and answers what changed. */
export async function syncProfile(
  db: Database,
  request: SyncRequest,
  data: SyncShards,
  now = new Date(),
): Promise<SyncAnswer> {
  const byId = new Map(data.shards.map((shard) => [shard.id, shard]));
  const named = (changes: SyncChange[]): NamedChange[] =>
    changes.map((change) => ({
      ...change,
      name: byId.get(change.id)?.name ?? change.id,
    }));
  const { userId } = request;

  type Done =
    | { kind: "repeat"; answer: SyncAnswer }
    | { kind: "applied"; answer: SyncAnswer; profileId: number };
  const done = await db.transaction(async (tx): Promise<Done> => {
    const found = await findOrMake(
      tx,
      userId,
      request.hypixelProfileId,
      request.info,
      now,
    );
    if (request.syncKey !== undefined) {
      const [seen] = await tx
        .select({ answer: sbSyncLog.answer })
        .from(sbSyncLog)
        .where(
          and(
            eq(sbSyncLog.profileId, found.profile.id),
            eq(sbSyncLog.syncKey, request.syncKey),
          ),
        );
      if (seen) return { kind: "repeat", answer: seen.answer as SyncAnswer };
    }
    const { collection: before } = await collectionOf(
      tx,
      userId,
      found.profile.keyPrefix,
    );
    const result = applySync(
      before,
      { levels: request.levels, held: request.held, mode: request.mode },
      (id) => byId.has(id),
    );
    if (!isCollection(result.collection))
      throw new Error("A sync made a collection that isn't valid.");
    await tx
      .insert(toolData)
      .values({
        userId,
        tool: meta.slug,
        key: found.profile.keyPrefix + SAVED_KEYS.collection,
        value: result.collection,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [toolData.userId, toolData.tool, toolData.key],
        set: { value: result.collection, updatedAt: now },
      });
    const profile = await describe(tx, found.profile, request.info, {
      lastSyncedAt: now,
    });
    const progress = collectionProgress(data.shards, result.collection);
    const changes = { levels: named(result.levels), held: named(result.held) };
    const [logged] = await tx
      .insert(sbSyncLog)
      .values({
        profileId: profile.id,
        at: now,
        // Never in the future (a clock that's off), never before the log's reach.
        capturedAt: new Date(
          Math.min(
            now.getTime(),
            Math.max(
              request.capturedAt?.getTime() ?? now.getTime(),
              now.getTime() - SYNC_LOG_LIMITS.days * 86_400_000,
            ),
          ),
        ),
        source: request.source,
        mode: request.mode,
        syncKey: request.syncKey ?? null,
        changes: { ...changes, unknownIds: result.unknownIds },
        progress,
        answer: {},
      })
      .returning({ id: sbSyncLog.id });
    if (!logged) throw new Error("The sync wasn't logged.");
    const profiles = await tx
      .select()
      .from(sbProfiles)
      .where(eq(sbProfiles.userId, userId));
    const answer: SyncAnswer = {
      syncId: logged.id,
      duplicate: false,
      created: found.created,
      profile: profileView(profile, activeId(profiles)),
      changes,
      unknownIds: result.unknownIds,
      progress,
    };
    await tx
      .update(sbSyncLog)
      .set({ answer })
      .where(eq(sbSyncLog.id, logged.id));
    return { kind: "applied", answer, profileId: profile.id };
  });
  if (done.kind === "repeat") return { ...done.answer, duplicate: true };
  await purgeSyncLog(db, done.profileId, now);
  return done.answer;
}

/** Drops a profile's syncs past SYNC_LOG_LIMITS (days, then count). */
export async function purgeSyncLog(
  db: Database,
  profileId: number,
  now = new Date(),
): Promise<void> {
  const cutoff = new Date(now.getTime() - SYNC_LOG_LIMITS.days * 86_400_000);
  await db
    .delete(sbSyncLog)
    .where(and(eq(sbSyncLog.profileId, profileId), lt(sbSyncLog.at, cutoff)));
  const [oldestKept] = await db
    .select({ id: sbSyncLog.id })
    .from(sbSyncLog)
    .where(eq(sbSyncLog.profileId, profileId))
    .orderBy(desc(sbSyncLog.id))
    .offset(SYNC_LOG_LIMITS.perProfile - 1)
    .limit(1);
  if (oldestKept)
    await db
      .delete(sbSyncLog)
      .where(
        and(
          eq(sbSyncLog.profileId, profileId),
          lt(sbSyncLog.id, oldestKept.id),
        ),
      );
}

export interface SyncSummary {
  id: number;
  at: Date;
  source: string;
  levels: NamedChange[];
  held: NamedChange[];
  unknownIds: string[];
  progress: CollectionProgress;
}

/** A profile's latest syncs, newest first. */
export async function recentSyncs(
  db: Database,
  profileId: number,
  limit: number = SYNC_LOG_LIMITS.recent,
): Promise<SyncSummary[]> {
  const rows = await db
    .select()
    .from(sbSyncLog)
    .where(eq(sbSyncLog.profileId, profileId))
    .orderBy(desc(sbSyncLog.at), desc(sbSyncLog.id))
    .limit(limit);
  return rows.map((row) => {
    const changes = row.changes as {
      levels?: NamedChange[];
      held?: NamedChange[];
      unknownIds?: string[];
    };
    return {
      id: row.id,
      at: row.at,
      source: row.source,
      levels: changes.levels ?? [],
      held: changes.held ?? [],
      unknownIds: changes.unknownIds ?? [],
      progress: row.progress as CollectionProgress,
    };
  });
}

/** Every sync of the account's profiles, for the export (without the stored answers). */
export async function syncLogExport(db: Database, userId: string) {
  const rows = await db
    .select({
      profile: sbProfiles.name,
      at: sbSyncLog.at,
      capturedAt: sbSyncLog.capturedAt,
      source: sbSyncLog.source,
      mode: sbSyncLog.mode,
      changes: sbSyncLog.changes,
      progress: sbSyncLog.progress,
    })
    .from(sbSyncLog)
    .innerJoin(sbProfiles, eq(sbProfiles.id, sbSyncLog.profileId))
    .where(eq(sbProfiles.userId, userId))
    .orderBy(desc(sbSyncLog.at));
  return rows;
}

export interface ProgressPoint {
  /** The UTC day, "2026-11-21". */
  day: string;
  /** The last sync that day. */
  at: Date;
  progress: CollectionProgress;
}

/** One point per UTC day (that day's last sync), oldest first. Pure. */
export function dailyProgress(
  rows: readonly { at: Date; progress: CollectionProgress }[],
): ProgressPoint[] {
  const byDay = new Map<string, ProgressPoint>();
  for (const row of rows) {
    const day = row.at.toISOString().slice(0, 10);
    const seen = byDay.get(day);
    if (!seen || seen.at.getTime() <= row.at.getTime())
      byDay.set(day, { day, at: row.at, progress: row.progress });
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** A profile's progress over the kept log, a point a day, by when the game was read. */
export async function progressHistory(
  db: Database,
  profileId: number,
): Promise<ProgressPoint[]> {
  const rows = await db
    .select({ at: sbSyncLog.capturedAt, progress: sbSyncLog.progress })
    .from(sbSyncLog)
    .where(eq(sbSyncLog.profileId, profileId))
    .orderBy(asc(sbSyncLog.capturedAt));
  return dailyProgress(
    rows.map((row) => ({
      at: row.at,
      progress: row.progress as CollectionProgress,
    })),
  );
}
