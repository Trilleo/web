import {
  mailMessages,
  openDatabase,
  users,
  wikiMembers,
  type DatabaseHandle,
  type User,
  type Wiki,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { createWiki, findPage, movePage, savePage, setMember } from "./store";
import { titleKey } from "./titles";
import {
  DIGEST,
  WHOLE_WIKI,
  digestBlocks,
  listWatches,
  sendWikiDigests,
  unwatch,
  watch,
  watchedChanges,
  watching,
} from "./watch";

const start = new Date("2026-10-11T12:00:00Z");
const hours = (n: number) => new Date(start.getTime() + n * 3_600_000);
let handle: DatabaseHandle;
let ada: User;
let bob: User;
let wiki: Wiki;

async function withAddress(user: User): Promise<User> {
  const [updated] = await handle.db
    .update(users)
    .set({
      email: `${user.username}@example.com`,
      emailVerifiedAt: start,
      emailToken: `token-${user.username}-0123456789abcdef`,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw new Error("no user");
  return updated;
}

async function makeWiki(
  slug: string,
  visibility: Wiki["visibility"],
): Promise<Wiki> {
  const created = await createWiki(handle.db, ada, {
    slug,
    name: slug.toUpperCase(),
    code: slug.toUpperCase().slice(0, 3),
    description: "",
    kind: "game",
    visibility,
    homeTitle: "Main Page",
    nav: [],
    source: null,
  });
  if (!created.ok) throw new Error("no wiki");
  return created.wiki;
}

async function edit(
  title: string,
  body: string,
  by: User,
  at: Date,
  where: Wiki = wiki,
) {
  const page = await findPage(handle.db, where.id, titleKey(title));
  return savePage(handle.db, {
    wiki: where,
    actor: by,
    title,
    body,
    summary: `Edit at ${at.toISOString()}`,
    minor: false,
    baseRevisionId: page?.revisionId ?? null,
    canEditProtected: true,
    now: at,
  });
}

async function digests() {
  return handle.db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.kind, "wiki-digest"));
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  ada = await withAddress(
    await upsertGitHubUser(handle.db, { id: 1, login: "ada", name: null }),
  );
  bob = await withAddress(
    await upsertGitHubUser(handle.db, { id: 2, login: "bob", name: null }),
  );
  wiki = await makeWiki("sky", "public");
});
afterEach(async () => {
  await handle.close();
});

describe("watching", () => {
  it("watches pages people edit, and follows them when moved", async () => {
    await edit("Ores", "Iron.\n", ada, start);
    expect(
      await watching(handle.db, ada.id, wiki.id, titleKey("Ores")),
    ).toEqual({
      page: true,
      wiki: false,
    });
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    if (!page) throw new Error("no page");
    await movePage(handle.db, {
      wiki,
      actor: bob,
      page,
      to: "Metals",
      redirect: true,
      reason: "",
      now: hours(1),
    });
    expect((await listWatches(handle.db, ada.id)).map((w) => w.title)).toEqual([
      "Metals",
    ]);
    // The mover doesn't start watching the redirect left behind.
    expect(await listWatches(handle.db, bob.id)).toEqual([]);
  });

  it("watches and unwatches pages and whole wikis", async () => {
    await watch(handle.db, bob.id, wiki.id, WHOLE_WIKI, start);
    await watch(handle.db, bob.id, wiki.id, titleKey("Ores"), start);
    await watch(handle.db, bob.id, wiki.id, titleKey("Ores"), start);
    const rows = await listWatches(handle.db, bob.id);
    expect(rows.map((row) => row.title)).toEqual([null, "Ores"]);
    await unwatch(handle.db, bob.id, wiki.id, titleKey("Ores"));
    expect(
      await watching(handle.db, bob.id, wiki.id, titleKey("Ores")),
    ).toEqual({
      page: false,
      wiki: true,
    });
  });
});

describe("watchedChanges", () => {
  it("lists others' edits to watched pages, not one's own", async () => {
    await edit("Ores", "Iron.\n", ada, start);
    await edit("Ores", "Iron and gold.\n", bob, hours(1));
    await edit("Ores", "Iron, gold.\n", ada, hours(2));
    await edit("Mobs", "Zombies.\n", bob, hours(3));
    const changes = await watchedChanges(handle.db, ada);
    expect(changes.map((c) => [c.title, c.author])).toEqual([["Ores", "bob"]]);
    await watch(handle.db, ada.id, wiki.id, WHOLE_WIKI, start);
    expect((await watchedChanges(handle.db, ada)).map((c) => c.title)).toEqual([
      "Mobs",
      "Ores",
    ]);
    expect(
      await watchedChanges(handle.db, ada, { since: hours(2) }),
    ).toHaveLength(1);
  });

  it("leaves out private wikis the watcher no longer belongs to", async () => {
    const secret = await makeWiki("secret", "private");
    await setMember(handle.db, secret, ada, "ada", "editor", start);
    await watch(handle.db, ada.id, secret.id, WHOLE_WIKI, start);
    await edit("Plans", "Hush.\n", bob, hours(1), secret);
    // ada isn't the site's admin in tests (no ADMIN_EMAILS).
    expect(await watchedChanges(handle.db, ada)).toHaveLength(1);
    // Leaving the wiki: the watch stays, but the changes don't show.
    await handle.db.delete(wikiMembers);
    expect(await watchedChanges(handle.db, ada)).toHaveLength(0);
  });
});

describe("digests", () => {
  it("sends one a day at most, only when something changed", async () => {
    await watch(handle.db, ada.id, wiki.id, titleKey("Ores"), start);
    expect(await sendWikiDigests(handle.db, hours(1))).toBe(0);

    await edit("Ores", "Iron and gold.\n", bob, hours(2));
    await edit("Ores", "Iron, gold, tin.\n", bob, hours(3));
    expect(await sendWikiDigests(handle.db, hours(4))).toBe(1);
    const [mail] = await digests();
    expect(mail).toMatchObject({
      toAddress: "ada@example.com",
      subject: "A page you watch changed",
    });
    expect(mail?.textBody).toContain("Ores: 2 edits by @bob");
    expect(mail?.textBody).toContain(
      "https://wiki.trilleo.net/sky/-/history/Ores",
    );

    // Another change, but the last digest went out an hour ago.
    await edit("Ores", "Iron.\n", bob, hours(5));
    expect(await sendWikiDigests(handle.db, hours(6))).toBe(0);
    expect(
      await sendWikiDigests(
        handle.db,
        new Date(hours(4).getTime() + DIGEST.gapMs + 1),
      ),
    ).toBe(1);
    const all = await digests();
    expect(all).toHaveLength(2);
    expect(all[1]?.textBody).toContain("Ores: an edit by @bob");
  });

  it("respects the watchlist switch", async () => {
    await handle.db
      .update(users)
      .set({
        emailNotifications: { watchlist: false },
      })
      .where(eq(users.id, ada.id));
    await watch(handle.db, ada.id, wiki.id, titleKey("Ores"), start);
    await edit("Ores", "Gold.\n", bob, hours(1));
    expect(await sendWikiDigests(handle.db, hours(2))).toBe(0);
    expect(await digests()).toEqual([]);
  });

  it("groups pages by wiki", () => {
    const at = start;
    const { blocks, pages } = digestBlocks([
      {
        wiki: "sky",
        wikiName: "Sky",
        title: "A",
        revisionId: 3,
        summary: "",
        minor: false,
        createdAt: at,
        author: "bob",
      },
      {
        wiki: "sky",
        wikiName: "Sky",
        title: "A",
        revisionId: 2,
        summary: "",
        minor: false,
        createdAt: at,
        author: null,
      },
      {
        wiki: "sea",
        wikiName: "Sea",
        title: "B",
        revisionId: 1,
        summary: "",
        minor: false,
        createdAt: at,
        author: "cy",
      },
    ]);
    expect(pages).toBe(2);
    expect(blocks).toEqual([
      { type: "text", text: "Sky:" },
      {
        type: "list",
        items: [
          {
            text: "A: 2 edits by @bob, someone",
            href: "https://wiki.trilleo.net/sky/-/history/A",
          },
        ],
      },
      { type: "text", text: "Sea:" },
      {
        type: "list",
        items: [
          {
            text: "B: an edit by @cy",
            href: "https://wiki.trilleo.net/sea/-/history/B",
          },
        ],
      },
    ]);
  });
});
