import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { createPost } from "../blog/store";
import { SITE_CARD } from "../seo";
import { resolveCard } from "./cards";

const now = new Date("2026-06-01T12:00:00Z");

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  await upsertGitHubUser(handle.db, { id: 1, login: "owner", name: "Owner" });
});
const database = () => Promise.resolve(handle.db);

afterEach(async () => {
  await handle.close();
});

async function post(slug: string, action: "save" | "publish") {
  const result = await createPost(
    handle.db,
    {
      title: `Title of ${slug}`,
      slug,
      description: "A post.",
      body: "Some text.",
      tags: ["Web"],
      publishedAt: null,
      commentMode: "open",
      revised: false,
      seoTitle: "",
      seoDescription: "",
    },
    action,
    now,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
}

describe("resolveCard", () => {
  it("draws the site's card", async () => {
    const resolved = await resolveCard(database, "site", now);
    expect(resolved?.card).toEqual(SITE_CARD);
    expect(resolved?.href).toMatch(/^\/og\/site\.png\?v=/);
  });

  it("draws tools that exist", async () => {
    const resolved = await resolveCard(database, "tools/notes", now);
    expect(resolved?.card.title).toBe("Notes");
    expect(await resolveCard(database, "tools/nope", now)).toBeUndefined();
  });

  it("draws public posts only", async () => {
    await post("live", "publish");
    await post("draft", "save");
    const resolved = await resolveCard(database, "posts/live", now);
    expect(resolved?.card).toMatchObject({
      section: "(01) Writing / 001",
      title: "Title of live",
    });
    expect(resolved?.href).toMatch(/^\/og\/posts\/live\.png\?v=/);
    expect(await resolveCard(database, "posts/draft", now)).toBeUndefined();
  });

  it("refuses anything else", async () => {
    for (const path of ["", "posts", "posts/a/b", "people/owner", "../site"]) {
      expect(await resolveCard(database, path, now)).toBeUndefined();
    }
  });
});
