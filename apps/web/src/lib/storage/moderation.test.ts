import { openDatabase, users, type DatabaseHandle } from "@trilleo/db";
import type { StoragePurpose, UploadRequest } from "@trilleo/storage";
import { LocalDriver } from "@trilleo/storage/server";
import { makeZip } from "@trilleo/storage/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { deleteAccountFiles, storageExport } from "./account";
import { appealFile, decideAppeal, openAppeals } from "./appeals";
import { runMaintenance } from "./maintenance";
import { activePurposes, findPurpose, STORAGE_PURPOSES } from "./purposes";
import { HIDDEN_BY_REPORTS, openReports, reportFile } from "./reports";
import { reviewCounts, reviewItems } from "./review";
import {
  actOnFile,
  completeUpload,
  partUrls,
  startUpload,
  type Requester,
  type StorageDeps,
} from "./service";
import { banUploader, setTrust, standingOf, unbanUploader } from "./standing";
import { getFile } from "./store";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);
const bytes = (text: string) => new TextEncoder().encode(text);
const DAY = 24 * 60 * 60 * 1000;

/** People's uploads: public ones wait for review until the uploader is trusted. */
const SHARED: StoragePurpose = {
  slug: "shared",
  label: "Shared",
  uploaders: "users",
  visibilities: ["public", "unlisted", "private"],
  defaultVisibility: "public",
  review: "untrusted",
};

let handle: DatabaseHandle;
let storage: LocalDriver;
let deps: StorageDeps;
let admin: Requester;
let alice: Requester;
let readers: [Requester, Requester, Requester, Requester];
let clock: Date;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/s" });
  clock = new Date("2026-10-05T12:00:00Z");
  const user = (id: number, login: string) =>
    upsertGitHubUser(handle.db, { id, login, name: null });
  const owner = await user(1, "owner");
  admin = { user: owner, isAdmin: true };
  alice = { user: await user(2, "alice"), isAdmin: false };
  const reader = async (i: number): Promise<Requester> => ({
    user: await user(10 + i, `reader${String(i)}`),
    isAdmin: false,
  });
  readers = [
    await reader(0),
    await reader(1),
    await reader(2),
    await reader(3),
  ];
  // Accounts are a month old (reports from new accounts don't hide files).
  await handle.db
    .update(users)
    .set({ createdAt: new Date(clock.getTime() - 30 * DAY) });
  deps = {
    db: handle.db,
    storage,
    isAdminId: (id) => Promise.resolve(id === owner.id),
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

async function upload(
  requester: Requester,
  name: string,
  data: Uint8Array,
  extra: Partial<UploadRequest> = {},
) {
  const started = await startUpload(deps, requester, {
    purpose: requester.isAdmin ? "site" : "shared",
    name,
    size: data.length,
    ...extra,
  });
  if (!started.ok) return started;
  const { file } = started.value;
  const urls = await partUrls(deps, requester, file.id, [1]);
  if (!urls.ok) throw new Error(urls.error);
  await storage.handle(
    new Request("http://x/", { method: "PUT", body: new Uint8Array(data) }),
    (urls.value["1"] ?? "").replace(/^\/s\//, ""),
  );
  return completeUpload(deps, requester, file.id);
}

async function uploaded(requester: Requester, name: string, data: Uint8Array) {
  const result = await upload(requester, name, data);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const isPublic = async (id: string) => {
  const row = await getFile(handle.db, id);
  const response = await storage.handle(
    new Request("http://x/"),
    storage.publicUrl(row?.key ?? "").replace(/^\/s\//, ""),
  );
  return response.status === 200;
};

describe("trust", () => {
  it("reviews newcomers, and trusts them after three approvals", async () => {
    for (let i = 0; i < 3; i++) {
      const file = await uploaded(alice, `pic${String(i)}.png`, PNG);
      expect(file.status).toBe("pending_review");
      await actOnFile(deps, admin, file.id, "approve");
    }
    expect(
      (await standingOf(handle.db, alice.user.id)).trustedAt,
    ).not.toBeNull();
    const fourth = await uploaded(alice, "pic3.png", PNG);
    expect(fourth.status).toBe("published");
    expect(await isPublic(fourth.id)).toBe(true);
    // It shows up as a spot check.
    expect((await reviewCounts(handle.db)).spot).toBe(1);
  });

  it("can be granted at once, or withheld", async () => {
    const file = await uploaded(alice, "pic.png", PNG);
    await actOnFile(deps, admin, file.id, "approve", null, { trust: true });
    expect((await uploaded(alice, "next.png", PNG)).status).toBe("published");

    await setTrust(handle.db, {
      userId: alice.user.id,
      mode: "untrusted",
      actorId: admin.user.id,
    });
    expect((await uploaded(alice, "later.png", PNG)).status).toBe(
      "pending_review",
    );
  });
});

describe("strikes", () => {
  it("strikes, blocks the bytes, and bans at three", async () => {
    const first = await uploaded(alice, "a.png", PNG);
    expect(
      await actOnFile(deps, admin, first.id, "reject", "Stolen art"),
    ).toMatchObject({
      ok: true,
    });
    expect((await standingOf(handle.db, alice.user.id)).activeStrikes).toBe(1);

    // The same bytes can't come back, under any name.
    expect(await upload(alice, "again.png", PNG)).toMatchObject({
      ok: true,
      value: {
        status: "rejected",
        statusReason: "This file was taken down from the site before.",
      },
    });

    for (const name of ["b.txt", "c.txt"]) {
      const file = await uploaded(alice, name, bytes(name));
      await actOnFile(deps, admin, file.id, "reject", "Spam");
    }
    const standing = await standingOf(handle.db, alice.user.id);
    expect(standing).toMatchObject({ activeStrikes: 3, banReason: "strikes" });
    expect(await upload(alice, "d.txt", bytes("d"))).toMatchObject({
      ok: false,
      status: 403,
    });

    // Strikes expire after 90 days, but the ban stays until it's lifted.
    clock = new Date(clock.getTime() + 91 * DAY);
    expect(
      (await standingOf(handle.db, alice.user.id, clock)).activeStrikes,
    ).toBe(0);
    await unbanUploader(handle.db, {
      userId: alice.user.id,
      clearStrikes: false,
      actorId: admin.user.id,
    });
    expect((await uploaded(alice, "e.txt", bytes("e"))).status).toBe(
      "pending_review",
    );
  });

  it("gives no strike for an honest mistake", async () => {
    const file = await uploaded(alice, "a.png", PNG);
    await actOnFile(deps, admin, file.id, "reject", "Wrong place", {
      strike: false,
    });
    expect((await standingOf(handle.db, alice.user.id)).activeStrikes).toBe(0);
    // Nor are the bytes blocked.
    expect((await uploaded(alice, "a.png", PNG)).status).toBe("pending_review");
  });

  it("lets the admin ban by hand", async () => {
    await banUploader(handle.db, {
      userId: alice.user.id,
      reason: "Abuse",
      actorId: admin.user.id,
    });
    expect(await upload(alice, "a.txt", bytes("a"))).toMatchObject({
      ok: false,
      status: 403,
    });
  });
});

describe("reports", () => {
  async function published() {
    const file = await uploaded(alice, "pic.png", PNG);
    await actOnFile(deps, admin, file.id, "approve");
    return file.id;
  }
  const report = (requester: Requester, fileId: string) =>
    reportFile(deps, requester, {
      fileId,
      reason: "copyright",
      details: "Mine",
    });

  it("hides a file once three established accounts report it", async () => {
    const id = await published();
    expect(await report(alice, id)).toMatchObject({ ok: false, status: 400 });
    expect(await report(readers[0], id)).toEqual({
      ok: true,
      value: "reported",
    });
    expect(await report(readers[0], id)).toEqual({
      ok: true,
      value: "already-reported",
    });
    await report(readers[1], id);
    expect(await isPublic(id)).toBe(true);
    await report(readers[2], id);

    const row = await getFile(handle.db, id);
    expect(row).toMatchObject({
      status: "pending_review",
      statusReason: HIDDEN_BY_REPORTS,
    });
    expect(await isPublic(id)).toBe(false);
    expect((await openReports(handle.db, [id])).get(id)).toHaveLength(3);

    // Putting it back up dismisses the reports.
    await actOnFile(deps, admin, id, "approve");
    expect(await isPublic(id)).toBe(true);
    expect((await openReports(handle.db, [id])).size).toBe(0);
  });

  it("doesn't let new accounts hide files", async () => {
    const id = await published();
    await handle.db
      .update(users)
      .set({ createdAt: clock })
      .where(eq(users.id, readers[2].user.id));
    for (const reader of readers.slice(0, 3)) await report(reader, id);
    expect((await getFile(handle.db, id))?.status).toBe("published");
    expect((await reviewCounts(handle.db)).reports).toBe(1);
  });

  it("never hides the admin's files", async () => {
    const file = await uploaded(admin, "logo.png", PNG);
    for (const reader of readers.slice(0, 3)) await report(reader, file.id);
    expect((await getFile(handle.db, file.id))?.status).toBe("published");
  });

  it("takedowns close the reports", async () => {
    const id = await published();
    await report(readers[0], id);
    await actOnFile(deps, admin, id, "remove", "Copyright");
    expect((await openReports(handle.db, [id])).size).toBe(0);
    expect((await standingOf(handle.db, alice.user.id)).activeStrikes).toBe(1);
  });
});

describe("appeals", () => {
  it("restores the file, clears the strike and lifts an automatic ban", async () => {
    const ids: string[] = [];
    for (const name of ["a.txt", "b.txt", "c.txt"]) {
      const file = await uploaded(alice, name, bytes(name));
      await actOnFile(deps, admin, file.id, "reject", "Spam");
      ids.push(file.id);
    }
    expect(
      (await standingOf(handle.db, alice.user.id)).bannedAt,
    ).not.toBeNull();
    const [first] = ids as [string];

    expect(
      await appealFile(deps, readers[0], { fileId: first, message: "x" }),
    ).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(
      await appealFile(deps, alice, { fileId: first, message: " " }),
    ).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      await appealFile(deps, alice, { fileId: first, message: "It's mine!" }),
    ).toEqual({
      ok: true,
      value: true,
    });
    expect(
      await appealFile(deps, alice, { fileId: first, message: "Again" }),
    ).toMatchObject({
      ok: false,
      status: 409,
    });

    // Waiting appeals keep the file's bytes past their retention.
    clock = new Date(clock.getTime() + 8 * DAY);
    await runMaintenance(deps);
    expect((await getFile(handle.db, first))?.purgedAt).toBeNull();

    const [appeal] = await openAppeals(handle.db);
    expect(
      (await reviewItems(handle.db, storage, "appeals"))[0]?.appeal?.message,
    ).toBe("It's mine!");
    expect(
      await decideAppeal(deps, admin, {
        appealId: appeal?.id ?? 0,
        accept: true,
        response: "Sorry",
      }),
    ).toEqual({ ok: true, value: true });
    expect((await getFile(handle.db, first))?.status).toBe("published");
    const standing = await standingOf(handle.db, alice.user.id);
    expect(standing).toMatchObject({ activeStrikes: 2, bannedAt: null });
  });

  it("can be denied", async () => {
    const file = await uploaded(alice, "a.txt", bytes("a"));
    await actOnFile(deps, admin, file.id, "reject", "Spam");
    await appealFile(deps, alice, { fileId: file.id, message: "Please" });
    const [appeal] = await openAppeals(handle.db);
    await decideAppeal(deps, admin, {
      appealId: appeal?.id ?? 0,
      accept: false,
      response: "No",
    });
    expect((await getFile(handle.db, file.id))?.status).toBe("rejected");
    expect(await openAppeals(handle.db)).toEqual([]);
  });
});

describe("review queue", () => {
  it("lists archives' contents and previews", async () => {
    const zip = makeZip([
      { name: "pack/" },
      { name: "pack/manifest.json", data: "{}" },
    ]);
    const archive = await uploaded(alice, "pack.mcpack", zip);
    expect((await getFile(handle.db, archive.id))?.details).toEqual({
      archive: {
        entries: [
          { name: "pack/", size: 0, directory: true },
          { name: "pack/manifest.json", size: 2, directory: false },
        ],
        total: 2,
        uncompressed: 2,
        truncated: false,
      },
    });
    await uploaded(alice, "notes.txt", bytes("<b>hello</b>"));
    await uploaded(alice, "pic.png", PNG);

    const items = await reviewItems(handle.db, storage, "waiting");
    expect(items.map((item) => item.file.name)).toEqual([
      "pack.mcpack",
      "notes.txt",
      "pic.png",
    ]);
    expect(items[1]?.textPreview).toBe("<b>hello</b>");
    expect(items[2]?.previewUrl).toMatch(/^\/s\//);
    expect(items[0]?.uploader).toMatchObject({
      login: "alice",
      counts: { pending_review: 3 },
    });
  });
});

describe("accounts and purposes", () => {
  it("exports and deletes an account's files", async () => {
    const file = await uploaded(alice, "a.txt", bytes("a"));
    const row = await getFile(handle.db, file.id);
    expect((await storageExport(handle.db, alice.user.id)).files).toMatchObject(
      [{ id: file.id, name: "a.txt" }],
    );
    await deleteAccountFiles(handle.db, storage, alice.user.id);
    expect(await getFile(handle.db, file.id)).toBeUndefined();
    expect(await storage.head(row?.key ?? "")).toBeNull();
  });

  it("keeps purposes that aren't live closed, unless switched on", () => {
    expect(findPurpose("shared")?.enabled).toBe(false);
    expect(
      findPurpose(
        "shared",
        activePurposes({ STORAGE_ENABLE_PURPOSES: "shared" }),
      )?.enabled,
    ).toBe(true);
  });

  it("refuses uploads to a closed purpose", async () => {
    deps.purposes = [{ ...SHARED, enabled: false }];
    expect(await upload(alice, "a.txt", bytes("a"))).toMatchObject({
      ok: false,
      status: 404,
    });
  });
});
