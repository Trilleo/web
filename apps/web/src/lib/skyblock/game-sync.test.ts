import {
  openDatabase,
  sbSyncLog,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { PROFILE_LIMITS } from "@trilleo/skyblock";
import { SAVED_KEYS } from "@trilleo/skyblock/calc";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { listToolData, putToolData } from "../tools/store";
import { meta } from "@trilleo/tool-skyblock/meta";
import {
  SYNC_LOG_LIMITS,
  profileCollection,
  purgeSyncLog,
  recentSyncs,
  syncProfile,
  upsertProfile,
  type SyncRequest,
  type SyncShards,
} from "./game-sync";
import { createProfile, profileState } from "./profiles";

const T0 = new Date("2026-11-21T08:00:00.000Z");
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const APPLE = "1f2e3d4c5b6a79801a2b3c4d5e6f7a8b";
const BANANA = "aaaaaaaabbbbccccddddeeeeeeeeeeee";
const data: SyncShards = {
  shards: [
    { id: "SHARD_GROVE", name: "Grove", rarity: "common" },
    { id: "SHARD_TIAMAT", name: "Tiamat", rarity: "legendary" },
  ],
};

let handle: DatabaseHandle;
let userId: string;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  const [user] = await handle.db
    .insert(users)
    .values({ username: "player", email: "player@example.com" })
    .returning({ id: users.id });
  userId = user?.id ?? "";
});
afterEach(async () => {
  await handle.close();
});

const sync = (over: Partial<SyncRequest> = {}, now = T0) =>
  syncProfile(
    handle.db,
    {
      userId,
      hypixelProfileId: APPLE,
      info: { name: "Apple" },
      levels: [
        { id: "SHARD_GROVE", level: 4 },
        { id: "SHARD_NEW", level: 1 },
      ],
      held: [{ id: "SHARD_TIAMAT", count: 3 }],
      mode: "replace",
      source: "SkyBlock mod",
      ...over,
    },
    data,
    now,
  );

describe("syncs from the game", () => {
  it("takes over the untouched Main on the first sync, keeping its plain keys", async () => {
    const { active: main } = await profileState(handle.db, userId, T0);
    const saved = await putToolData(handle.db, {
      userId,
      tool: meta,
      key: SAVED_KEYS.collection,
      value: { levels: { SHARD_GROVE: 2 }, held: {}, keep: ["SHARD_GROVE"] },
    });
    expect(saved.ok).toBe(true);

    const answer = await sync({}, later(1));
    expect(answer.created).toBe(false);
    expect(answer.profile).toMatchObject({
      id: main.id,
      name: "Apple",
      hypixelProfileId: APPLE,
      active: true,
      lastSyncedAt: later(1).toISOString(),
    });
    expect(answer.changes.levels).toEqual([
      { id: "SHARD_GROVE", name: "Grove", from: 2, to: 4 },
    ]);
    expect(answer.changes.held).toEqual([
      { id: "SHARD_TIAMAT", name: "Tiamat", from: 0, to: 3 },
    ]);
    expect(answer.unknownIds).toEqual(["SHARD_NEW"]);
    expect(answer.progress).toMatchObject({ maxed: 0, levels: 4, shards: 2 });

    const stored = await listToolData(handle.db, userId, meta.slug);
    expect(stored).toMatchObject([
      {
        key: SAVED_KEYS.collection,
        value: {
          levels: { SHARD_GROVE: 4 },
          held: { SHARD_TIAMAT: 3 },
          keep: ["SHARD_GROVE"],
        },
      },
    ]);
  });

  it("makes a new profile for another Hypixel profile, without switching to it", async () => {
    await profileState(handle.db, userId, T0);
    await sync({}, later(1));
    const answer = await sync(
      {
        hypixelProfileId: BANANA,
        info: { name: "Apple", gameMode: "ironman" },
      },
      later(2),
    );
    expect(answer.created).toBe(true);
    // The name was taken, so it got a number.
    expect(answer.profile).toMatchObject({
      name: "Apple (2)",
      gameMode: "ironman",
      active: false,
    });
    const state = await profileState(handle.db, userId, later(3));
    expect(state.profiles).toHaveLength(2);
    expect(state.active.hypixelProfileId).toBe(APPLE);
    const banana = await profileCollection(handle.db, userId, BANANA, data);
    expect(banana.levels).toEqual([{ id: "SHARD_GROVE", level: 4 }]);
    expect(banana.profile.keyPrefix).toBe(`p${String(banana.profile.id)}-`);
  });

  it("claims a site-made profile with the same name", async () => {
    await profileState(handle.db, userId, T0);
    const made = await createProfile(handle.db, userId, { name: "Banana" }, T0);
    if (!made.ok) throw new Error(made.problem);
    const answer = await sync(
      { hypixelProfileId: BANANA, info: { name: "banana" } },
      later(1),
    );
    expect(answer.profile.id).toBe(made.profile.id);
    expect(answer.created).toBe(false);
  });

  it("answers a repeated syncKey again without applying it twice", async () => {
    const first = await sync({ syncKey: "abc" }, later(1));
    const again = await sync(
      { syncKey: "abc", levels: [{ id: "SHARD_GROVE", level: 9 }] },
      later(2),
    );
    expect(again).toEqual({ ...first, duplicate: true });
    const collection = await profileCollection(handle.db, userId, APPLE, data);
    expect(collection.levels).toEqual([{ id: "SHARD_GROVE", level: 4 }]);
  });

  it("merges when asked, and logs each sync", async () => {
    await sync({}, later(1));
    const merged = await sync(
      {
        mode: "merge",
        levels: [{ id: "SHARD_TIAMAT", level: 10 }],
        held: undefined,
      },
      later(2),
    );
    expect(merged.progress.maxed).toBe(1);
    const collection = await profileCollection(handle.db, userId, APPLE, data);
    expect(collection.levels).toEqual([
      { id: "SHARD_GROVE", level: 4 },
      { id: "SHARD_TIAMAT", level: 10 },
    ]);
    expect(collection.held).toEqual([{ id: "SHARD_TIAMAT", count: 3 }]);
    const recent = await recentSyncs(handle.db, merged.profile.id);
    expect(recent.map((row) => row.levels.length)).toEqual([1, 1]);
    expect(recent[0]?.source).toBe("SkyBlock mod");
  });

  it("refuses a new profile past the limit", async () => {
    await profileState(handle.db, userId, T0);
    for (let i = 1; i < PROFILE_LIMITS.perUser; i++)
      await createProfile(handle.db, userId, { name: `P${String(i)}` }, T0);
    await expect(
      sync({ info: { name: "One more" } }, later(1)),
    ).rejects.toSatisfy(
      (error) => error instanceof ApiError && error.code === "profile_limit",
    );
  });

  it("puts a profile's details without syncing", async () => {
    const put = await upsertProfile(
      handle.db,
      userId,
      APPLE,
      { name: "Apple", minecraftUuid: "0".repeat(32), gameMode: "classic" },
      T0,
    );
    expect(put.created).toBe(true);
    expect(put.profile).toMatchObject({
      name: "Apple",
      minecraftUuid: "0".repeat(32),
      lastSyncedAt: null,
      active: true,
    });
  });

  it("keeps the log within its limits", async () => {
    const first = await sync({}, T0);
    await sync({ syncKey: "b" }, later(1));
    await purgeSyncLog(
      handle.db,
      first.profile.id,
      new Date(T0.getTime() + (SYNC_LOG_LIMITS.days * 86_400_000 + 30_000)),
    );
    const left = await handle.db.select().from(sbSyncLog);
    expect(left.map((row) => row.syncKey)).toEqual(["b"]);
  });
});
