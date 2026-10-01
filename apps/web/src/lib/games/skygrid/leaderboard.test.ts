import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import { newGame } from "@trilleo/game-skygrid/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../../auth/sessions";
import { blockUser } from "../../comments/store";
import { updateProfile } from "../../profile/store";
import { findIsland, islandHref, leaderboard } from "./leaderboard";
import { startSkygridSave } from "./store";

let handle: DatabaseHandle;
let ada: User;
let bob: User;
let cy: User;

async function islander(
  id: number,
  login: string,
  skills: Record<string, number>,
  coins = 0,
) {
  const user = await upsertGitHubUser(handle.db, { id, login, name: null });
  const game = newGame(id, 0);
  await startSkygridSave(handle.db, user.id, {
    ...game,
    coins,
    skills: { ...game.skills, ...skills },
  });
  return user;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  ada = await islander(1, "ada", { farming: 500, mining: 100 }, 40);
  bob = await islander(2, "bob", { farming: 50, combat: 900 }, 900);
  cy = await islander(3, "cy", { mining: 10 });
  await upsertGitHubUser(handle.db, { id: 4, login: "nobody", name: null });
});
afterEach(async () => {
  await handle.close();
});

describe("leaderboard", () => {
  it("ranks total XP, each skill, and coins", async () => {
    expect(
      (await leaderboard(handle.db, "total")).map((row) => [
        row.login,
        row.value,
      ]),
    ).toEqual([
      ["bob", 950],
      ["ada", 600],
      ["cy", 10],
    ]);
    expect(
      (await leaderboard(handle.db, "farming")).map((row) => row.login),
    ).toEqual(["ada", "bob"]);
    expect((await leaderboard(handle.db, "coins"))[0]).toMatchObject({
      rank: 1,
      login: "bob",
    });
  });

  it("hides private profiles' names and leaves blocked players out", async () => {
    await updateProfile(handle.db, ada.id, {
      displayName: null,
      pronouns: null,
      location: null,
      status: null,
      bio: null,
      links: [],
      profilePublic: false,
      commentName: "display",
    });
    await blockUser(handle.db, cy.id);
    const rows = await leaderboard(handle.db, "total");
    expect(rows).toEqual([
      { rank: 1, name: "bob", login: "bob", value: 950 },
      { rank: 2, name: null, login: null, value: 600 },
    ]);
  });
});

describe("findIsland", () => {
  it("shows public islands, and private ones only to their owner", async () => {
    expect((await findIsland(handle.db, "BOB", null))?.user.id).toBe(bob.id);
    expect(await findIsland(handle.db, "nobody", null)).toBeNull();
    await updateProfile(handle.db, bob.id, {
      displayName: null,
      pronouns: null,
      location: null,
      status: null,
      bio: null,
      links: [],
      profilePublic: false,
      commentName: "display",
    });
    expect(await findIsland(handle.db, "bob", ada.id)).toBeNull();
    expect(
      (await findIsland(handle.db, "bob", bob.id))?.state.skills.combat,
    ).toBe(900);
    expect(islandHref("bob")).toBe("/games/skygrid/visit/bob/");
  });
});
