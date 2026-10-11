import {
  openDatabase,
  type DatabaseHandle,
  type User,
  type Wiki,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import {
  completeUpload,
  partUrls,
  startUpload,
  type StorageDeps,
} from "../storage/service";
import { attachWikiFile, listWikiFiles, wikiMemberUpload } from "./files";
import { createWiki, setMember } from "./store";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

let handle: DatabaseHandle;
let storage: LocalDriver;
let deps: StorageDeps;
let owner: User;
let member: User;
let stranger: User;
let wiki: Wiki;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/s" });
  owner = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "owner",
    name: null,
  });
  member = await upsertGitHubUser(handle.db, {
    id: 2,
    login: "member",
    name: null,
  });
  stranger = await upsertGitHubUser(handle.db, {
    id: 3,
    login: "stranger",
    name: null,
  });
  deps = {
    db: handle.db,
    storage,
    isAdminId: () => Promise.resolve(false),
    waivesReview: (file) => wikiMemberUpload(handle.db, file),
  };
  const created = await createWiki(handle.db, owner, {
    slug: "mc",
    name: "MC",
    code: "MC",
    description: "",
    kind: "minecraft",
    visibility: "public",
    homeTitle: "Main Page",
    nav: [],
  });
  if (!created.ok) throw new Error();
  wiki = created.wiki;
  await setMember(handle.db, wiki, owner, "member", "editor");
});
afterEach(async () => {
  await handle.close();
});

/** Uploads a picture to wiki-media, attaching it as the wiki's page would. */
async function upload(user: User, attach: boolean) {
  const requester = { user, isAdmin: false };
  const started = await startUpload(deps, requester, {
    purpose: "wiki-media",
    name: "icon.png",
    size: PNG.length,
  });
  if (!started.ok) throw new Error(started.error);
  const { file } = started.value;
  if (attach) {
    const attached = await attachWikiFile(handle.db, {
      wikiId: wiki.id,
      userId: user.id,
      fileId: file.id,
    });
    expect(attached).toEqual({ ok: true });
  }
  const urls = await partUrls(deps, requester, file.id, [1]);
  if (!urls.ok) throw new Error(urls.error);
  await storage.handle(
    new Request("http://x/", { method: "PUT", body: PNG }),
    (urls.value["1"] ?? "").replace(/^\/s\//, ""),
  );
  return { id: file.id, done: await completeUpload(deps, requester, file.id) };
}

describe("wiki pictures", () => {
  it("are published at once for the wiki's members", async () => {
    const { done } = await upload(member, true);
    expect(done).toMatchObject({ ok: true, value: { status: "published" } });
    const list = await listWikiFiles(handle.db, storage, wiki.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ uploader: "member", status: "published" });
    expect(list[0]?.publicUrl).toMatch(/^\/s\//);
  });

  it("wait for review when the uploader isn't a member, or didn't attach them", async () => {
    expect((await upload(member, false)).done).toMatchObject({
      ok: true,
      value: { status: "pending_review" },
    });
    expect((await upload(stranger, true)).done).toMatchObject({
      ok: true,
      value: { status: "pending_review" },
    });
  });

  it("can only be attached by their uploader", async () => {
    const started = await startUpload(
      deps,
      { user: member, isAdmin: false },
      { purpose: "wiki-media", name: "icon.png", size: PNG.length },
    );
    if (!started.ok) throw new Error();
    expect(
      await attachWikiFile(handle.db, {
        wikiId: wiki.id,
        userId: stranger.id,
        fileId: started.value.file.id,
      }),
    ).toMatchObject({ ok: false, status: 404 });
  });
});
