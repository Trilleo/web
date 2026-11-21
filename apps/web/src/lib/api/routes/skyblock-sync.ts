/**
 * The SkyBlock sync group: someone's profiles and shard collection, through their
 * personal token (scope "skyblock:sync"), for a mod that reads attribute levels and
 * the Hunting Box in game. The logic is lib/skyblock/game-sync.ts; profiles are found
 * by Hypixel's profile ID ({profileId}: a UUID, dashes optional).
 */
import {
  GAME_MODES,
  MAX_ATTRIBUTE_LEVEL,
  PROFILE_LIMITS,
  normalizeProfileUuid,
  type GameMode,
} from "@trilleo/skyblock";
import { COLLECTION_LIMITS } from "@trilleo/skyblock/calc";
import { PROFILES_PATH, COLLECTION_PATH } from "@trilleo/tool-skyblock/meta";
import { shardData } from "../../skyblock/data";
import {
  SYNC_LOG_LIMITS,
  activeId,
  profileCollection,
  profileView,
  recentSyncs,
  syncProfile,
  upsertProfile,
  type ProfileInfo,
} from "../../skyblock/game-sync";
import { listProfiles } from "../../skyblock/profiles";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const GAME_MODE_NAMES = Object.keys(GAME_MODES) as [GameMode, ...GameMode[]];
const uuidHint = "a UUID (dashes optional)";
const uuidPattern =
  /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/;

const profileParams = t.object({
  profileId: t.string({
    description:
      "Hypixel's ID for the SkyBlock profile (`profile_id` in Hypixel's API), dashes optional.",
    pattern: uuidPattern,
    patternHint: uuidHint,
  }),
});

const profileFields = {
  id: t.integer({ description: "The site's number for the profile." }),
  name: t.string({ description: 'Its name, e.g. "Apple".' }),
  hypixelProfileId: t.nullable(
    t.string({
      description:
        "Hypixel's profile ID, 32 lower-case hex digits; null for profiles made on the site and never synced.",
    }),
  ),
  minecraftUuid: t.nullable(
    t.string({ description: "The player's Minecraft UUID, 32 hex digits." }),
  ),
  gameMode: t.nullable(t.enum(GAME_MODE_NAMES)),
  active: t.boolean({
    description: "Whether it's the profile the site's pages show now.",
  }),
  createdAt: t.dateTime(),
  lastSyncedAt: t.nullable(t.dateTime("The last sync into it.")),
};
const profileSchema = t.object(profileFields);

const progressSchema = t.object({
  maxed: t.integer({ description: "Attributes at level 10." }),
  levels: t.integer({ description: "All attribute levels added up." }),
  leftToMax: t.integer({
    description: "Shards still to fuse to max every attribute.",
  }),
  shards: t.integer({ description: "Shards the site knows." }),
});

const changeSchema = t.object({
  id: t.string({ description: "Hypixel's shard ID." }),
  name: t.string({ description: "The shard's name." }),
  from: t.integer(),
  to: t.integer(),
});

const infoFields = {
  name: t.optional(
    t.string({
      min: 1,
      max: PROFILE_LIMITS.nameLength,
      description:
        'The profile\'s name in the game (`cute_name`, e.g. "Apple"). Renames it on the site; a name another of their profiles has gets a number.',
    }),
  ),
  minecraftUuid: t.optional(
    t.string({
      description: "The player's Minecraft UUID.",
      pattern: uuidPattern,
      patternHint: uuidHint,
    }),
  ),
  gameMode: t.optional(
    t.enum(GAME_MODE_NAMES, { description: "The profile's game mode." }),
  ),
};

function profileIdOf(raw: string): string {
  const id = normalizeProfileUuid(raw);
  if (!id)
    throw new ApiError("invalid_input", "`profileId` must be a UUID.", {
      problems: [{ path: "profileId", message: "Not a UUID." }],
    });
  return id;
}

/** Trimmed, or undefined if nothing's left. */
function nonEmpty(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

function infoOf(body: {
  name?: string | undefined;
  minecraftUuid?: string | undefined;
  gameMode?: GameMode | undefined;
}): ProfileInfo {
  return {
    name: nonEmpty(body.name?.replace(/\s+/g, " ")),
    minecraftUuid:
      body.minecraftUuid === undefined
        ? undefined
        : (normalizeProfileUuid(body.minecraftUuid) ?? undefined),
    gameMode: body.gameMode,
  };
}

function needUser<T>(user: T | null): T {
  if (!user) throw new Error("SkyBlock sync routes need a token.");
  return user;
}

const EXAMPLE_PROFILE = {
  id: 7,
  name: "Apple",
  hypixelProfileId: "1f2e3d4c5b6a79801a2b3c4d5e6f7a8b",
  minecraftUuid: "069a79f444e94726a5befca90e38aaf5",
  gameMode: "classic" as const,
  active: true,
  createdAt: "2026-11-21T08:00:00.000Z",
  lastSyncedAt: "2026-11-21T09:30:00.000Z",
};
const EXAMPLE_PROGRESS = {
  maxed: 12,
  levels: 412,
  leftToMax: 9810,
  shards: 325,
};
const EXAMPLE_ID = "1f2e3d4c-5b6a-7980-1a2b-3c4d5e6f7a8b";

export const listSkyblockProfiles = defineRoute({
  method: "GET",
  path: "/v1/skyblock/me/profiles",
  operationId: "listSkyblockProfiles",
  group: "skyblock-sync",
  summary: "List the account's profiles",
  description: `The account's SkyBlock profiles, oldest first (up to ${String(PROFILE_LIMITS.perUser)}). Profiles made on the site have no \`hypixelProfileId\` until a sync takes them over.`,
  auth: "user",
  scope: "skyblock:sync",
  cacheSeconds: 0,
  response: t.object({ items: t.array(profileSchema) }),
  example: { response: { items: [EXAMPLE_PROFILE] } },
  handler: async ({ db, user }) => {
    const profiles = await listProfiles(db, needUser(user).user.id);
    const active = activeId(profiles);
    return { items: profiles.map((profile) => profileView(profile, active)) };
  },
});

export const putSkyblockProfile = defineRoute({
  method: "PUT",
  path: "/v1/skyblock/me/profiles/{profileId}",
  operationId: "putSkyblockProfile",
  group: "skyblock-sync",
  summary: "Add or describe a profile",
  description:
    "Makes the profile if the account hasn't got it (taking over a profile made on the site with the same name, or the account's only profile if it was never synced), and updates its name, Minecraft UUID and game mode. A sync does the same, so this is only needed to set up a profile before its first sync. Never changes which profile the site shows.",
  auth: "user",
  scope: "skyblock:sync",
  cacheSeconds: 0,
  params: profileParams,
  body: t.object(infoFields),
  response: t.object({
    created: t.boolean({ description: "True when this request made it." }),
    profile: profileSchema,
  }),
  errors: ["profile_limit"],
  example: {
    params: { profileId: EXAMPLE_ID },
    body: { name: "Apple", gameMode: "classic" },
    response: { created: false, profile: EXAMPLE_PROFILE },
  },
  handler: async ({ db, user, params, body, now }) =>
    upsertProfile(
      db,
      needUser(user).user.id,
      profileIdOf(params.profileId),
      infoOf(body),
      now,
    ),
});

export const getSkyblockCollection = defineRoute({
  method: "GET",
  path: "/v1/skyblock/me/profiles/{profileId}/collection",
  operationId: "getSkyblockCollection",
  group: "skyblock-sync",
  summary: "Get a profile's collection",
  description:
    "The profile's attribute levels, held shards and the shards kept out of plans, as the site has them (changed by syncs and by hand on the site). Shards at level 0 or with none held aren't listed.",
  auth: "user",
  scope: "skyblock:sync",
  cacheSeconds: 0,
  params: profileParams,
  response: t.object({
    profile: profileSchema,
    levels: t.array(
      t.object({
        id: t.string({ description: "Hypixel's shard ID." }),
        level: t.integer({ min: 1, max: MAX_ATTRIBUTE_LEVEL }),
      }),
    ),
    held: t.array(
      t.object({
        id: t.string({ description: "Hypixel's shard ID." }),
        count: t.integer({ min: 1 }),
      }),
    ),
    keep: t.array(t.string(), {
      description:
        "Held shards the person keeps out of plans (set on the site).",
    }),
    updatedAt: t.nullable(t.dateTime("When it last changed.")),
    progress: progressSchema,
  }),
  example: {
    params: { profileId: EXAMPLE_ID },
    response: {
      profile: EXAMPLE_PROFILE,
      levels: [{ id: "SHARD_GROVE", level: 10 }],
      held: [{ id: "SHARD_TIAMAT", count: 3 }],
      keep: [],
      updatedAt: "2026-11-21T09:30:00.000Z",
      progress: EXAMPLE_PROGRESS,
    },
  },
  handler: async ({ db, user, params }) => {
    const userId = needUser(user).user.id;
    const data = await shardData(db, null);
    const found = await profileCollection(
      db,
      userId,
      profileIdOf(params.profileId),
      data.catalog,
    );
    const profiles = await listProfiles(db, userId);
    return {
      profile: profileView(found.profile, activeId(profiles)),
      levels: found.levels,
      held: found.held,
      keep: found.keep,
      updatedAt: found.updatedAt,
      progress: found.progress,
    };
  },
});

export const syncSkyblockProfile = defineRoute({
  method: "POST",
  path: "/v1/skyblock/me/profiles/{profileId}/sync",
  operationId: "syncSkyblockProfile",
  group: "skyblock-sync",
  summary: "Sync a profile from the game",
  description: `Sends what the game shows for one profile: attribute levels (from the Attribute menu) and held shards (the Hunting Box). The profile is made if needed, as with [Add or describe a profile](#putSkyblockProfile). The game wins: with \`mode\` "replace" (the default) each list sent replaces that part of the collection, so send every shard you read; "merge" only changes the shards listed, and 0 removes one. A list left out isn't touched, and neither are the shards the person keeps out of plans. IDs the site doesn't know are skipped and listed in \`unknownIds\`. Send a \`syncKey\` to make retrying safe. Each sync is logged (kept ${String(SYNC_LOG_LIMITS.days)} days) and shown on the site's collection page.`,
  auth: "user",
  scope: "skyblock:sync",
  cacheSeconds: 0,
  params: profileParams,
  body: t.object({
    ...infoFields,
    mode: t.optional(
      t.enum(["replace", "merge"] as const, {
        description: '"replace" (default) or "merge".',
      }),
    ),
    levels: t.optional(
      t.array(
        t.object({
          id: t.string({
            description: 'Hypixel\'s shard ID, e.g. "SHARD_GROVE".',
            max: 64,
          }),
          level: t.integer({
            min: 0,
            max: MAX_ATTRIBUTE_LEVEL,
            description: "The attribute's level, 0 to 10.",
          }),
        }),
        {
          max: COLLECTION_LIMITS.entries,
          description: "Attribute levels, one per shard.",
        },
      ),
    ),
    held: t.optional(
      t.array(
        t.object({
          id: t.string({ description: "Hypixel's shard ID.", max: 64 }),
          count: t.integer({
            min: 0,
            max: COLLECTION_LIMITS.held,
            description: "How many are in the Hunting Box.",
          }),
        }),
        {
          max: COLLECTION_LIMITS.entries,
          description: "Shards held (not yet fused), one per shard.",
        },
      ),
    ),
    capturedAt: t.optional(
      t.dateTime("When the game was read, if not just now."),
    ),
    syncKey: t.optional(
      t.string({
        min: 1,
        max: 64,
        description:
          "Your own ID for this sync (a UUID is fine). Sending the same one again for the profile answers the first sync's result with `duplicate: true` and changes nothing.",
      }),
    ),
    source: t.optional(
      t.string({
        min: 1,
        max: 60,
        description:
          "What sent it, as the site's log shows it (\"SkyBlock mod 1.2\"). Defaults to the token's name.",
      }),
    ),
  }),
  response: t.object({
    syncId: t.integer({ description: "The sync's number in the log." }),
    duplicate: t.boolean({
      description:
        "True when the `syncKey` was seen before and nothing was applied.",
    }),
    created: t.boolean({
      description: "True when this sync made the profile.",
    }),
    profile: profileSchema,
    changes: t.object({
      levels: t.array(changeSchema, { description: "Levels that changed." }),
      held: t.array(changeSchema, { description: "Held counts that changed." }),
    }),
    unknownIds: t.array(t.string(), {
      description:
        "Shard IDs sent that the site doesn't know; they were skipped.",
    }),
    progress: progressSchema,
  }),
  errors: ["profile_limit"],
  example: {
    params: { profileId: EXAMPLE_ID },
    body: {
      name: "Apple",
      gameMode: "classic",
      levels: [
        { id: "SHARD_GROVE", level: 10 },
        { id: "SHARD_TIAMAT", level: 3 },
      ],
      held: [{ id: "SHARD_TIAMAT", count: 3 }],
      syncKey: "7c0d5a52-3f0e-4c7e-9a43-2d1f6a3b9e10",
    },
    response: {
      syncId: 42,
      duplicate: false,
      created: false,
      profile: EXAMPLE_PROFILE,
      changes: {
        levels: [{ id: "SHARD_TIAMAT", name: "Tiamat", from: 2, to: 3 }],
        held: [{ id: "SHARD_TIAMAT", name: "Tiamat", from: 0, to: 3 }],
      },
      unknownIds: [],
      progress: EXAMPLE_PROGRESS,
    },
  },
  handler: async ({ db, user, params, body, now }) => {
    const caller = needUser(user);
    const data = await shardData(db, null);
    return syncProfile(
      db,
      {
        userId: caller.user.id,
        hypixelProfileId: profileIdOf(params.profileId),
        info: infoOf(body),
        levels: body.levels,
        held: body.held,
        mode: body.mode ?? "replace",
        source: nonEmpty(body.source) ?? caller.token.name,
        capturedAt:
          body.capturedAt === undefined ? undefined : new Date(body.capturedAt),
        syncKey: body.syncKey,
      },
      data.catalog,
      now,
    );
  },
});

export const listSkyblockSyncs = defineRoute({
  method: "GET",
  path: "/v1/skyblock/me/profiles/{profileId}/syncs",
  operationId: "listSkyblockSyncs",
  group: "skyblock-sync",
  summary: "List a profile's recent syncs",
  description:
    "The profile's latest syncs, newest first, with what each changed and the progress after it.",
  auth: "user",
  scope: "skyblock:sync",
  cacheSeconds: 0,
  params: profileParams,
  query: t.object({
    limit: t.optional(
      t.integer({ min: 1, max: 50, description: "How many (default 10)." }),
    ),
  }),
  response: t.object({
    items: t.array(
      t.object({
        id: t.integer(),
        at: t.dateTime(),
        source: t.string(),
        levels: t.array(changeSchema),
        held: t.array(changeSchema),
        unknownIds: t.array(t.string()),
        progress: progressSchema,
      }),
    ),
  }),
  example: {
    params: { profileId: EXAMPLE_ID },
    response: {
      items: [
        {
          id: 42,
          at: "2026-11-21T09:30:00.000Z",
          source: "SkyBlock mod",
          levels: [{ id: "SHARD_TIAMAT", name: "Tiamat", from: 2, to: 3 }],
          held: [],
          unknownIds: [],
          progress: EXAMPLE_PROGRESS,
        },
      ],
    },
  },
  handler: async ({ db, user, params, query }) => {
    const userId = needUser(user).user.id;
    const id = profileIdOf(params.profileId);
    const profile = (await listProfiles(db, userId)).find(
      (p) => p.hypixelProfileId === id,
    );
    if (!profile)
      throw new ApiError(
        "not_found",
        "No SkyBlock profile with that ID on this account: sync it first.",
      );
    const rows = await recentSyncs(db, profile.id, query.limit ?? 10);
    return {
      items: rows.map((row) => ({
        id: row.id,
        at: row.at.toISOString(),
        source: row.source,
        levels: row.levels,
        held: row.held,
        unknownIds: row.unknownIds,
        progress: row.progress,
      })),
    };
  },
});

/** Where people see what a sync did (for the docs). */
export const SYNC_PAGES = {
  profiles: PROFILES_PATH,
  collection: COLLECTION_PATH,
};
