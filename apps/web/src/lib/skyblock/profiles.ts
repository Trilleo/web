/**
 * Someone's SkyBlock profiles (sb_profiles): one set of the tool's data per profile
 * in the game. The first profile ("Main", made the first time it's needed) keeps the
 * tool's plain keys, so data from before profiles is its data; others keep theirs
 * under "p<id>-" (@trilleo/skyblock's profiles.ts, read through tool-kit's
 * scopedStorage). Pages show the profile picked most recently. Managed on
 * /tools/skyblock/profiles/; syncs from the game (the API) will make and fill them.
 */
import {
  sbProfiles,
  toolData,
  type Database,
  type SbProfile,
} from "@trilleo/db";
import {
  MAIN_PROFILE_NAME,
  PROFILE_LIMITS,
  cleanProfileName,
  profileKeyPrefix,
} from "@trilleo/skyblock";
import { SAVED_KEYS } from "@trilleo/skyblock/calc";
import { scopeItems, type StoredItem } from "@trilleo/tool-kit";
import { meta } from "@trilleo/tool-skyblock/meta";
import { listToolData } from "../tools/store";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface ProfileState {
  /** Oldest first, as the switcher lists them. */
  profiles: SbProfile[];
  /** The one the pages show. */
  active: SbProfile;
}

/** The account's profiles, oldest first. */
export async function listProfiles(
  db: Database,
  userId: string,
): Promise<SbProfile[]> {
  return db
    .select()
    .from(sbProfiles)
    .where(eq(sbProfiles.userId, userId))
    .orderBy(asc(sbProfiles.createdAt), asc(sbProfiles.id));
}

/**
 * The account's profiles and the active one, making "Main" (on the plain keys) if it
 * has none yet.
 */
export async function profileState(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<ProfileState> {
  let profiles = await listProfiles(db, userId);
  if (profiles.length === 0) {
    await db
      .insert(sbProfiles)
      .values({
        userId,
        name: MAIN_PROFILE_NAME,
        keyPrefix: "",
        createdAt: now,
        selectedAt: now,
      })
      .onConflictDoNothing();
    profiles = await listProfiles(db, userId);
  }
  const active = [...profiles].sort(
    (a, b) => b.selectedAt.getTime() - a.selectedAt.getTime() || b.id - a.id,
  )[0];
  if (!active) throw new Error("No SkyBlock profile after making one.");
  return { profiles, active };
}

export type ProfileProblem = "name" | "limit" | "taken" | "missing" | "last";

/**
 * Makes a profile and picks it. `copySetupFrom` copies another profile's calculator
 * setup (fortune, pets, prices), which is mostly the same across profiles.
 */
export async function createProfile(
  db: Database,
  userId: string,
  input: { name: string; copySetupFrom?: number | null },
  now = new Date(),
): Promise<
  { ok: true; profile: SbProfile } | { ok: false; problem: ProfileProblem }
> {
  const name = cleanProfileName(input.name);
  if (name === null) return { ok: false, problem: "name" };
  const { profiles } = await profileState(db, userId, now);
  if (profiles.length >= PROFILE_LIMITS.perUser)
    return { ok: false, problem: "limit" };
  if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    return { ok: false, problem: "taken" };
  const profile = await db.transaction(async (tx) => {
    // The prefix needs the ID, so it's set right after the insert (a placeholder
    // first: "" belongs to the first profile, and prefixes are unique per account).
    const [row] = await tx
      .insert(sbProfiles)
      .values({
        userId,
        name,
        keyPrefix: `new-${randomUUID()}`,
        createdAt: now,
        selectedAt: now,
      })
      .returning();
    if (!row) throw new Error("The profile wasn't made.");
    const [named] = await tx
      .update(sbProfiles)
      .set({ keyPrefix: profileKeyPrefix(row.id) })
      .where(eq(sbProfiles.id, row.id))
      .returning();
    if (!named) throw new Error("The profile wasn't made.");
    return named;
  });
  const source = profiles.find((p) => p.id === input.copySetupFrom);
  if (source)
    await copySetup(db, userId, source.keyPrefix, profile.keyPrefix, now);
  return { ok: true, profile };
}

async function copySetup(
  db: Database,
  userId: string,
  from: string,
  to: string,
  now: Date,
): Promise<void> {
  const [row] = await db
    .select({ value: toolData.value })
    .from(toolData)
    .where(
      and(
        eq(toolData.userId, userId),
        eq(toolData.tool, meta.slug),
        eq(toolData.key, from + SAVED_KEYS.settings),
      ),
    );
  if (!row) return;
  await db
    .insert(toolData)
    .values({
      userId,
      tool: meta.slug,
      key: to + SAVED_KEYS.settings,
      value: row.value,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

/** Picks a profile for the pages to show. */
export async function selectProfile(
  db: Database,
  userId: string,
  id: number,
  now = new Date(),
): Promise<boolean> {
  const rows = await db
    .update(sbProfiles)
    .set({ selectedAt: now })
    .where(and(eq(sbProfiles.id, id), eq(sbProfiles.userId, userId)))
    .returning({ id: sbProfiles.id });
  return rows.length > 0;
}

export async function renameProfile(
  db: Database,
  userId: string,
  id: number,
  newName: string,
): Promise<{ ok: true } | { ok: false; problem: ProfileProblem }> {
  const name = cleanProfileName(newName);
  if (name === null) return { ok: false, problem: "name" };
  const profiles = await listProfiles(db, userId);
  if (!profiles.some((p) => p.id === id))
    return { ok: false, problem: "missing" };
  if (
    profiles.some(
      (p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase(),
    )
  )
    return { ok: false, problem: "taken" };
  await db
    .update(sbProfiles)
    .set({ name })
    .where(and(eq(sbProfiles.id, id), eq(sbProfiles.userId, userId)));
  return { ok: true };
}

/**
 * Deletes a profile and its tool data. The account always keeps one; deleting the
 * active one makes the most recently picked other one active.
 */
export async function deleteProfile(
  db: Database,
  userId: string,
  id: number,
): Promise<
  { ok: true; name: string } | { ok: false; problem: ProfileProblem }
> {
  const profiles = await listProfiles(db, userId);
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return { ok: false, problem: "missing" };
  if (profiles.length <= 1) return { ok: false, problem: "last" };
  await db.transaction(async (tx) => {
    await tx.delete(toolData).where(
      and(
        eq(toolData.userId, userId),
        eq(toolData.tool, meta.slug),
        inArray(
          toolData.key,
          Object.values(SAVED_KEYS).map((key) => profile.keyPrefix + key),
        ),
      ),
    );
    await tx.delete(sbProfiles).where(eq(sbProfiles.id, id));
  });
  return { ok: true, name: profile.name };
}

/** How many profiles the account has (for /account pages and limits). */
export async function profileCount(
  db: Database,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(sbProfiles)
    .where(eq(sbProfiles.userId, userId));
  return row?.n ?? 0;
}

/** The profiles for the account export, newest first. */
export async function profilesExport(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(sbProfiles)
    .where(eq(sbProfiles.userId, userId))
    .orderBy(desc(sbProfiles.createdAt));
  return rows.map((row) => ({
    name: row.name,
    keyPrefix: row.keyPrefix,
    hypixelProfileId: row.hypixelProfileId,
    minecraftUuid: row.minecraftUuid,
    gameMode: row.gameMode,
    createdAt: row.createdAt,
    lastSyncedAt: row.lastSyncedAt,
  }));
}

/**
 * What a SkyBlock page needs for the person viewing it: their profiles (null when
 * signed out: browsers keep one set of data) and their saved data, scoped to the
 * active profile as the components expect.
 */
export async function pageData(
  db: Database,
  user: { id: string } | null,
): Promise<{
  profiles: ProfileState | null;
  initialSaved: StoredItem<unknown>[] | undefined;
  prefix: string;
}> {
  if (!user) return { profiles: null, initialSaved: undefined, prefix: "" };
  const profiles = await profileState(db, user.id);
  const prefix = profiles.active.keyPrefix;
  return {
    profiles,
    initialSaved: scopeItems(
      await listToolData(db, user.id, meta.slug),
      prefix,
    ),
    prefix,
  };
}
