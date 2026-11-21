import {
  openDatabase,
  toolData,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { PROFILE_LIMITS } from "@trilleo/skyblock";
import { SAVED_KEYS, readSettings } from "@trilleo/skyblock/calc";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listToolData, putToolData } from "../tools/store";
import { meta } from "@trilleo/tool-skyblock/meta";
import {
  createProfile,
  deleteProfile,
  profileState,
  profilesExport,
  renameProfile,
  selectProfile,
} from "./profiles";

const T0 = new Date("2026-11-21T08:00:00.000Z");
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

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

const collection = (level: number) => ({
  levels: { SHARD_GROVE: level },
  held: {},
  keep: [],
});

async function save(key: string, value: unknown) {
  const saved = await putToolData(handle.db, {
    userId,
    tool: meta,
    key,
    value,
  });
  if (!saved.ok) throw new Error(saved.error);
}

describe("SkyBlock profiles", () => {
  it("starts with Main on the plain keys, so earlier data is its data", async () => {
    await save(SAVED_KEYS.collection, collection(3));
    const { profiles, active } = await profileState(handle.db, userId, T0);
    expect(profiles).toHaveLength(1);
    expect(active.name).toBe("Main");
    expect(active.keyPrefix).toBe("");
    // Asking again doesn't make another.
    expect(
      (await profileState(handle.db, userId, later(1))).profiles,
    ).toHaveLength(1);
  });

  it("makes profiles with their own prefix, picks them, and copies the setup if asked", async () => {
    const { active: main } = await profileState(handle.db, userId, T0);
    await save(SAVED_KEYS.settings, readSettings(undefined));
    await save(SAVED_KEYS.collection, collection(3));

    const made = await createProfile(
      handle.db,
      userId,
      { name: " Apple ", copySetupFrom: main.id },
      later(1),
    );
    if (!made.ok) throw new Error(made.problem);
    expect(made.profile.name).toBe("Apple");
    expect(made.profile.keyPrefix).toBe(`p${String(made.profile.id)}-`);
    expect((await profileState(handle.db, userId, later(2))).active.id).toBe(
      made.profile.id,
    );
    const keys = (await listToolData(handle.db, userId, meta.slug)).map(
      (item) => item.key,
    );
    // The setup came along; the collection didn't.
    expect(keys).toContain(`${made.profile.keyPrefix}${SAVED_KEYS.settings}`);
    expect(keys).not.toContain(
      `${made.profile.keyPrefix}${SAVED_KEYS.collection}`,
    );

    expect(await selectProfile(handle.db, userId, main.id, later(3))).toBe(
      true,
    );
    expect((await profileState(handle.db, userId, later(4))).active.id).toBe(
      main.id,
    );
  });

  it("refuses bad and repeated names, and more than the limit", async () => {
    await profileState(handle.db, userId, T0);
    const problem = async (name: string) => {
      const made = await createProfile(handle.db, userId, { name }, T0);
      return made.ok ? "ok" : made.problem;
    };
    expect(await problem(" ")).toBe("name");
    expect(await problem("main")).toBe("taken");
    for (let i = 1; i < PROFILE_LIMITS.perUser; i++)
      expect(await problem(`Profile ${String(i)}`)).toBe("ok");
    expect(await problem("One more")).toBe("limit");
  });

  it("renames, and deletes a profile with its data but never the last one", async () => {
    const { active: main } = await profileState(handle.db, userId, T0);
    const made = await createProfile(
      handle.db,
      userId,
      { name: "Banana" },
      later(1),
    );
    if (!made.ok) throw new Error(made.problem);
    await save(
      `${made.profile.keyPrefix}${SAVED_KEYS.collection}`,
      collection(5),
    );
    await save(SAVED_KEYS.collection, collection(2));

    expect(
      await renameProfile(handle.db, userId, made.profile.id, "Main"),
    ).toEqual({
      ok: false,
      problem: "taken",
    });
    expect(
      await renameProfile(handle.db, userId, made.profile.id, "Kiwi"),
    ).toEqual({
      ok: true,
    });

    expect(await deleteProfile(handle.db, userId, made.profile.id)).toEqual({
      ok: true,
      name: "Kiwi",
    });
    const left = await handle.db.select({ key: toolData.key }).from(toolData);
    expect(left.map((row) => row.key)).toEqual([SAVED_KEYS.collection]);
    expect((await profileState(handle.db, userId, later(2))).active.id).toBe(
      main.id,
    );
    expect(await deleteProfile(handle.db, userId, main.id)).toEqual({
      ok: false,
      problem: "last",
    });
    expect(await profilesExport(handle.db, userId)).toMatchObject([
      { name: "Main" },
    ]);
  });
});
