import { createHash } from "node:crypto";
import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import type { StoragePurpose, UploadRequest } from "@trilleo/storage";
import { LocalDriver } from "@trilleo/storage/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { runMaintenance } from "./maintenance";
import { STORAGE_PURPOSES } from "./purposes";
import {
  actOnFile,
  cancelUpload,
  changeVisibility,
  completeUpload,
  downloadUrl,
  partUrls,
  startUpload,
  toSummary,
  type Requester,
  type StorageDeps,
} from "./service";
import { fileEvents, getFile, usageOf } from "./store";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);
const bytes = (text: string) => new TextEncoder().encode(text);
const sha256 = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

/** Anyone signed in may upload, and their public files wait for review. */
const SHARED: StoragePurpose = {
  slug: "shared",
  label: "Shared",
  uploaders: "users",
  visibilities: ["public", "unlisted", "private"],
  defaultVisibility: "public",
  review: "always",
};

let handle: DatabaseHandle;
let storage: LocalDriver;
let deps: StorageDeps;
let admin: Requester;
let alice: Requester;
let bob: Requester;
let clock: Date;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/s" });
  clock = new Date("2026-10-05T12:00:00Z");
  const user = (id: number, login: string) =>
    upsertGitHubUser(handle.db, { id, login, name: null });
  const adminUser: User = await user(1, "owner");
  admin = { user: adminUser, isAdmin: true };
  alice = { user: await user(2, "alice"), isAdmin: false };
  bob = { user: await user(3, "bob"), isAdmin: false };
  deps = {
    db: handle.db,
    storage,
    isAdminId: (id) => Promise.resolve(id === adminUser.id),
    purposes: [
      ...STORAGE_PURPOSES.filter((p) => p.slug !== SHARED.slug),
      SHARED,
    ],
    now: () => clock,
  };
});
afterEach(async () => {
  await handle.close();
});

/** Starts an upload, sends its parts as the browser would, and completes it. */
async function upload(
  requester: Requester,
  name: string,
  data: Uint8Array,
  extra: Partial<UploadRequest> = {},
) {
  const started = await startUpload(deps, requester, {
    purpose: "site",
    name,
    size: data.length,
    ...extra,
  });
  if (!started.ok) throw new Error(started.error);
  const { file, plan } = started.value;
  const parts = Array.from({ length: plan.partCount }, (_, i) => i + 1);
  const urls = await partUrls(deps, requester, file.id, parts);
  if (!urls.ok) throw new Error(urls.error);
  for (const n of parts) {
    const url = urls.value[String(n)] ?? "";
    const start = (n - 1) * plan.partSize;
    const response = await storage.handle(
      new Request("http://x/", {
        method: "PUT",
        body: new Uint8Array(data.subarray(start, start + plan.partSize)),
      }),
      url.replace(/^\/s\//, ""),
    );
    expect(response.status).toBe(200);
  }
  return {
    id: file.id,
    result: await completeUpload(deps, requester, file.id),
  };
}

async function fetchPublic(id: string) {
  const row = await getFile(handle.db, id);
  if (!row) throw new Error("no row");
  return storage.handle(
    new Request("http://x/"),
    storage.publicUrl(row.key).replace(/^\/s\//, ""),
  );
}

describe("uploads", () => {
  it("publishes the admin's files at once, hashed and public", async () => {
    const { id, result } = await upload(admin, "logo.png", PNG);
    expect(result).toMatchObject({
      ok: true,
      value: { status: "published", sha256: sha256(PNG), label: "PNG image" },
    });
    const response = await fetchPublic(id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");

    const row = await getFile(handle.db, id);
    if (!row) throw new Error("no row");
    expect(toSummary(row, storage)).toMatchObject({
      pageUrl: `/files/${id}/`,
      publicUrl: storage.publicUrl(row.key),
    });
    expect((await fileEvents(handle.db, id)).map((e) => e.action)).toEqual([
      "processed",
      "complete",
      "upload",
    ]);
  });

  it("joins big files from several parts", async () => {
    const data = new Uint8Array(17 * 1024 * 1024 + 5).fill(7);
    data.set(bytes("PK\x03\x04"));
    const { id, result } = await upload(admin, "world.mcworld", data);
    expect(result).toMatchObject({
      ok: true,
      value: { status: "published", label: "Minecraft world", kind: "archive" },
    });
    expect((await getFile(handle.db, id))?.sha256).toBe(sha256(data));
  });

  it("keeps private files private", async () => {
    const { id } = await upload(admin, "notes.txt", bytes("secret"), {
      visibility: "private",
    });
    expect((await getFile(handle.db, id))?.status).toBe("published");
    expect((await fetchPublic(id)).status).toBe(404);
  });

  it("refuses what the rules don't allow", async () => {
    const start = (requester: Requester, request: Partial<UploadRequest>) =>
      startUpload(deps, requester, {
        purpose: "site",
        name: "a.txt",
        size: 10,
        ...request,
      });
    expect(await start(alice, {})).toMatchObject({ ok: false, status: 403 });
    expect(await start(admin, { purpose: "nope" })).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(await start(admin, { size: 0 })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await start(admin, { size: 2 * 1024 ** 3 })).toMatchObject({
      ok: false,
      status: 413,
    });
    expect(
      await start(alice, { purpose: "shared", size: 300 * 1024 ** 2 }),
    ).toMatchObject({
      ok: false,
      status: 413,
      error: "Files can be up to 210 MB here.",
    });
    expect(
      await start(alice, { purpose: "shared", name: "setup.exe" }),
    ).toMatchObject({
      ok: false,
      status: 415,
    });
    expect(
      await start(admin, { visibility: "secret" as "public" }),
    ).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("refuses files whose bytes don't match their name", async () => {
    const { id, result } = await upload(
      admin,
      "cat.png",
      bytes("<html><script>"),
    );
    expect(result).toMatchObject({
      ok: false,
      status: 422,
      error: "That file isn’t what its name says it is.",
    });
    const row = await getFile(handle.db, id);
    expect(row).toMatchObject({ status: "rejected" });
    expect(row?.purgedAt).not.toBeNull();
    expect(await storage.head(row?.key ?? "")).toBeNull();
  });

  it("won't complete until every part has arrived", async () => {
    const started = await startUpload(deps, admin, {
      purpose: "site",
      name: "a.txt",
      size: 10,
    });
    if (!started.ok) throw new Error(started.error);
    expect(
      await completeUpload(deps, admin, started.value.file.id),
    ).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("only gives part URLs for real parts of one's own upload", async () => {
    const started = await startUpload(deps, alice, {
      purpose: "shared",
      name: "a.txt",
      size: 10,
    });
    if (!started.ok) throw new Error(started.error);
    const id = started.value.file.id;
    expect(await partUrls(deps, alice, id, [2])).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await partUrls(deps, alice, id, "1")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await partUrls(deps, bob, id, [1])).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(await partUrls(deps, admin, id, [1])).toMatchObject({ ok: true });
  });

  it("cancels an upload", async () => {
    const started = await startUpload(deps, admin, {
      purpose: "site",
      name: "a.txt",
      size: 10,
    });
    if (!started.ok) throw new Error(started.error);
    const id = started.value.file.id;
    expect(await cancelUpload(deps, admin, id)).toMatchObject({
      ok: true,
      value: { status: "deleted" },
    });
    expect(await cancelUpload(deps, admin, id)).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});

describe("quotas", () => {
  it("counts what people keep, and the uploads they've started", async () => {
    const first = await startUpload(deps, alice, {
      purpose: "shared",
      name: "a.zip",
      size: 200 * 1024 ** 2,
    });
    expect(first.ok).toBe(true);
    expect((await usageOf(handle.db, alice.user.id)).bytes).toBe(
      200 * 1024 ** 2,
    );

    // 2 GiB each: ten 200 MiB uploads fill it.
    for (let i = 0; i < 9; i++) {
      await startUpload(deps, alice, {
        purpose: "shared",
        name: `b${String(i)}.zip`,
        size: 200 * 1024 ** 2,
      });
    }
    const refused = await startUpload(deps, alice, {
      purpose: "shared",
      name: "c.zip",
      size: 100 * 1024 ** 2,
    });
    expect(refused).toMatchObject({ ok: false, status: 413 });
    if (!refused.ok)
      expect(refused.error).toBe(
        "That’s more than your storage has room for (50.3 MB left of 2.15 GB).",
      );
  });
});

describe("moderation", () => {
  it("holds people's public uploads for review, then publishes them", async () => {
    const { id, result } = await upload(alice, "pic.png", PNG, {
      purpose: "shared",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { status: "pending_review" },
    });
    expect((await fetchPublic(id)).status).toBe(404);

    // Only the admin approves.
    expect(await actOnFile(deps, alice, id, "approve")).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(await actOnFile(deps, admin, id, "approve")).toMatchObject({
      ok: true,
      value: { status: "published" },
    });
    expect((await fetchPublic(id)).status).toBe(200);
  });

  it("doesn't review private files", async () => {
    const { result } = await upload(alice, "pic.png", PNG, {
      purpose: "shared",
      visibility: "private",
    });
    expect(result).toMatchObject({ ok: true, value: { status: "published" } });
  });

  it("takes files down with a reason, and can restore them", async () => {
    const { id } = await upload(admin, "pic.png", PNG);
    expect(await actOnFile(deps, admin, id, "remove")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      await actOnFile(deps, admin, id, "remove", "Copyright claim"),
    ).toMatchObject({
      ok: true,
      value: { status: "removed", statusReason: "Copyright claim" },
    });
    expect((await fetchPublic(id)).status).toBe(404);

    expect(await actOnFile(deps, admin, id, "restore")).toMatchObject({
      ok: true,
      value: { status: "published", statusReason: null },
    });
    expect((await fetchPublic(id)).status).toBe(200);
  });

  it("lets owners delete their files, but not removed ones", async () => {
    const first = await upload(alice, "a.png", PNG, { purpose: "shared" });
    expect(await actOnFile(deps, bob, first.id, "delete")).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(await actOnFile(deps, alice, first.id, "delete")).toMatchObject({
      ok: true,
      value: { status: "deleted" },
    });

    const second = await upload(alice, "b.png", PNG, { purpose: "shared" });
    await actOnFile(deps, admin, second.id, "remove", "Spam");
    expect(await actOnFile(deps, alice, second.id, "delete")).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("switches public access with the visibility", async () => {
    const { id } = await upload(admin, "pic.png", PNG);
    await changeVisibility(deps, admin, id, "private");
    expect((await fetchPublic(id)).status).toBe(404);
    await changeVisibility(deps, admin, id, "unlisted");
    expect((await fetchPublic(id)).status).toBe(200);
    expect((await fileEvents(handle.db, id))[0]).toMatchObject({
      action: "visibility",
      reason: "private → unlisted",
    });
  });
});

describe("downloadUrl", () => {
  it("gives public files' URL to anyone, private ones' signed link to managers", async () => {
    const pub = await upload(admin, "pic.png", PNG);
    const priv = await upload(alice, "doc.txt", bytes("hi"), {
      purpose: "shared",
      visibility: "private",
    });
    const pubRow = await getFile(handle.db, pub.id);
    const privRow = await getFile(handle.db, priv.id);
    if (!pubRow || !privRow) throw new Error("no rows");

    expect(await downloadUrl(storage, pubRow, null)).toEqual({
      url: storage.publicUrl(pubRow.key),
      public: true,
    });
    expect(await downloadUrl(storage, privRow, null)).toBeNull();
    expect(await downloadUrl(storage, privRow, bob)).toBeNull();
    const own = await downloadUrl(storage, privRow, alice);
    expect(own?.public).toBe(false);
    expect(await downloadUrl(storage, privRow, admin)).not.toBeNull();
  });
});

describe("maintenance", () => {
  it("abandons stale uploads and purges bytes after their retention", async () => {
    const stale = await startUpload(deps, admin, {
      purpose: "site",
      name: "a.txt",
      size: 10,
    });
    if (!stale.ok) throw new Error(stale.error);
    const { id } = await upload(admin, "pic.png", PNG);
    await actOnFile(deps, admin, id, "delete");

    clock = new Date(clock.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(await runMaintenance(deps)).toEqual({
      abandoned: 1,
      reprocessed: 0,
      purged: 0,
    });
    expect((await getFile(handle.db, stale.value.file.id))?.status).toBe(
      "deleted",
    );

    clock = new Date(clock.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(await runMaintenance(deps)).toMatchObject({ purged: 1 });
    const row = await getFile(handle.db, id);
    expect(row?.purgedAt).not.toBeNull();
    expect(await storage.head(row?.key ?? "")).toBeNull();
    // A purged file can't come back.
    expect(await actOnFile(deps, admin, id, "restore")).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});
