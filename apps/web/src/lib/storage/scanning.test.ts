import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import type { StoragePurpose } from "@trilleo/storage";
import {
  LocalDriver,
  type ScanResult,
  type Scanner,
} from "@trilleo/storage/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { resolveScanning } from "./config";
import {
  dailyDownloads,
  recentDownloads,
  recordDownload,
  topDownloads,
  utcDay,
} from "./downloads-stats";
import { runMaintenance } from "./maintenance";
import { STORAGE_PURPOSES } from "./purposes";
import {
  HELD_FOR_SCAN,
  completeUpload,
  partUrls,
  startUpload,
  storeThumbnail,
  toSummary,
  type Requester,
  type StorageDeps,
} from "./service";
import { setTrust, standingOf } from "./standing";
import { getFile, isBlockedHash } from "./store";

const bytes = (text: string) => new TextEncoder().encode(text);
const DAY = 24 * 60 * 60 * 1000;
/** A minimal WebP header: RIFF....WEBP. */
const WEBP = new Uint8Array([
  ...bytes("RIFF"),
  20,
  0,
  0,
  0,
  ...bytes("WEBPVP8 "),
  0,
  0,
  0,
  0,
]);

const SHARED: StoragePurpose = {
  slug: "shared",
  label: "Shared",
  uploaders: "users",
  visibilities: ["public", "unlisted", "private"],
  defaultVisibility: "public",
  review: "untrusted",
};

/** A scanner that "finds" EVIL in the bytes, or answers as told. */
class FakeScanner implements Scanner {
  mode: "scan" | "down" | "unscanned" = "scan";
  scanned = 0;
  start() {
    if (this.mode === "down") return Promise.resolve(null);
    let seen = "";
    return Promise.resolve({
      write: (chunk: Uint8Array) => {
        seen += new TextDecoder().decode(chunk);
        return Promise.resolve();
      },
      finish: (): Promise<ScanResult> => {
        this.scanned++;
        if (this.mode === "unscanned")
          return Promise.resolve({
            status: "unscanned",
            reason: "It’s too big to scan.",
          });
        return Promise.resolve(
          seen.includes("EVIL")
            ? { status: "infected", signature: "Test.Evil" }
            : { status: "clean" },
        );
      },
      abort: () => undefined,
    });
  }
}

let handle: DatabaseHandle;
let storage: LocalDriver;
let scanner: FakeScanner;
let deps: StorageDeps;
let admin: Requester;
let alice: Requester;
let clock: Date;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/s" });
  scanner = new FakeScanner();
  clock = new Date("2026-10-05T12:00:00Z");
  const owner = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "owner",
    name: null,
  });
  admin = { user: owner, isAdmin: true };
  alice = {
    user: await upsertGitHubUser(handle.db, {
      id: 2,
      login: "alice",
      name: null,
    }),
    isAdmin: false,
  };
  deps = {
    db: handle.db,
    storage,
    scanning: { scanner, required: true },
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

async function upload(requester: Requester, name: string, data: Uint8Array) {
  const started = await startUpload(deps, requester, {
    purpose: requester.isAdmin ? "site" : "shared",
    name,
    size: data.length,
  });
  if (!started.ok) throw new Error(started.error);
  const { file } = started.value;
  const urls = await partUrls(deps, requester, file.id, [1]);
  if (!urls.ok) throw new Error(urls.error);
  await storage.handle(
    new Request("http://x/", { method: "PUT", body: new Uint8Array(data) }),
    (urls.value["1"] ?? "").replace(/^\/s\//, ""),
  );
  const done = await completeUpload(deps, requester, file.id);
  if (!done.ok) throw new Error(done.error);
  return done.value;
}

async function trustAlice() {
  await setTrust(handle.db, {
    userId: alice.user.id,
    mode: "trusted",
    actorId: admin.user.id,
  });
}

describe("malware scanning", () => {
  it("records a clean scan and lets the trust rules decide", async () => {
    await trustAlice();
    const file = await upload(alice, "notes.txt", bytes("hello"));
    expect(file).toMatchObject({
      status: "published",
      scanStatus: "clean",
      heldForScan: false,
    });
  });

  it("refuses malware with a strike, and blocks the bytes", async () => {
    await trustAlice();
    const file = await upload(alice, "mod.jar", bytes("PK EVIL"));
    expect(file).toMatchObject({
      status: "rejected",
      scanStatus: "infected",
      scanDetail: "Test.Evil",
      statusReason: "Malware was found in it (Test.Evil).",
    });
    expect(
      (await standingOf(handle.db, alice.user.id, clock)).activeStrikes,
    ).toBe(1);
    expect(await isBlockedHash(handle.db, file.sha256 ?? "")).toBe(true);
  });

  it("only warns about the admin's own files", async () => {
    const file = await upload(admin, "tool.zip", bytes("PK EVIL"));
    expect(file).toMatchObject({ status: "published", scanStatus: "infected" });
  });

  it("holds files it couldn't scan, and publishes them after a clean rescan", async () => {
    await trustAlice();
    scanner.mode = "down";
    const file = await upload(alice, "notes.txt", bytes("hello"));
    expect(file).toMatchObject({
      status: "pending_review",
      scanStatus: "unscanned",
      scanDetail: "The malware scanner isn’t answering.",
      heldForScan: true,
      statusReason: HELD_FOR_SCAN,
    });

    // Too soon: maintenance waits half an hour before trying again.
    scanner.mode = "scan";
    expect((await runMaintenance(deps)).rescanned).toBe(0);
    clock = new Date(clock.getTime() + 31 * 60 * 1000);
    expect((await runMaintenance(deps)).rescanned).toBe(1);
    expect(await getFile(handle.db, file.id)).toMatchObject({
      status: "published",
      scanStatus: "clean",
      heldForScan: false,
      statusReason: null,
    });
  });

  it("keeps an untrusted upload in review after its rescan", async () => {
    scanner.mode = "unscanned";
    const file = await upload(alice, "notes.txt", bytes("hello"));
    expect(file).toMatchObject({
      status: "pending_review",
      heldForScan: false,
    });
    scanner.mode = "scan";
    clock = new Date(clock.getTime() + 31 * 60 * 1000);
    await runMaintenance(deps);
    expect(await getFile(handle.db, file.id)).toMatchObject({
      status: "pending_review",
      scanStatus: "clean",
    });
  });

  it("refuses a held file when the rescan finds malware", async () => {
    await trustAlice();
    scanner.mode = "down";
    const file = await upload(alice, "pack.zip", bytes("PK EVIL"));
    scanner.mode = "scan";
    clock = new Date(clock.getTime() + 31 * 60 * 1000);
    await runMaintenance(deps);
    expect(await getFile(handle.db, file.id)).toMatchObject({
      status: "rejected",
      scanStatus: "infected",
    });
  });

  it("holds everything when scanning is required but not set up", async () => {
    await trustAlice();
    deps.scanning = { scanner: null, required: true };
    const file = await upload(alice, "notes.txt", bytes("hello"));
    expect(file).toMatchObject({
      status: "pending_review",
      scanDetail: "Malware scanning isn’t set up.",
    });
    // Without a scanner nothing is retried.
    clock = new Date(clock.getTime() + DAY);
    expect((await runMaintenance(deps)).rescanned).toBe(0);
  });

  it("skips scanning when it's off", async () => {
    deps.scanning = { scanner: null, required: false };
    const file = await upload(admin, "notes.txt", bytes("hello"));
    expect(file).toMatchObject({ status: "published", scanStatus: null });
  });

  it("reads its settings from the environment", () => {
    const obs = { kind: "obs" } as Parameters<typeof resolveScanning>[1];
    const local = { kind: "local", root: null } as const;
    expect(
      resolveScanning({ CLAMAV_ADDRESS: "clamav:3310" }, obs).scanner,
    ).not.toBeNull();
    expect(resolveScanning({}, obs)).toEqual({ scanner: null, required: true });
    expect(resolveScanning({}, local)).toEqual({
      scanner: null,
      required: false,
    });
  });
});

describe("thumbnails", () => {
  it("stores one small WebP per file, public with the file", async () => {
    const file = await upload(
      admin,
      "pic.png",
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
      ]),
    );
    expect(
      await storeThumbnail(deps, admin, file.id, bytes("not webp")),
    ).toMatchObject({
      ok: false,
      status: 415,
    });
    expect(await storeThumbnail(deps, alice, file.id, WEBP)).toMatchObject({
      ok: false,
      status: 404,
    });
    const stored = await storeThumbnail(deps, admin, file.id, WEBP);
    expect(stored).toMatchObject({
      ok: true,
      value: { thumbnailKey: `t/${file.id}.webp` },
    });
    if (!stored.ok) return;
    const url = toSummary(stored.value, storage).thumbnailUrl;
    expect(url).toBe(storage.publicUrl(`t/${file.id}.webp`));
    const response = await storage.handle(
      new Request("http://x/"),
      (url ?? "").replace(/^\/s\//, ""),
    );
    expect(response.headers.get("Content-Type")).toBe("image/webp");

    // Only once, and only soon after the upload.
    expect(await storeThumbnail(deps, admin, file.id, WEBP)).toMatchObject({
      status: 409,
    });
  });

  it("refuses thumbnails long after the upload", async () => {
    const file = await upload(admin, "notes.txt", bytes("hi"));
    clock = new Date(clock.getTime() + 2 * 60 * 60 * 1000);
    expect(await storeThumbnail(deps, admin, file.id, WEBP)).toMatchObject({
      ok: false,
      status: 409,
    });
  });
});

describe("download stats", () => {
  it("counts per day, fills gaps, and ranks files", async () => {
    deps.scanning = { scanner: null, required: false };
    const a = await upload(admin, "a.txt", bytes("a"));
    const b = await upload(admin, "b.txt", bytes("b"));
    await recordDownload(handle.db, a.id, clock);
    await recordDownload(handle.db, a.id, clock);
    await recordDownload(handle.db, b.id, new Date(clock.getTime() - 2 * DAY));
    await recordDownload(handle.db, b.id, new Date(clock.getTime() - 40 * DAY));

    const days = await dailyDownloads(handle.db, a.id, 3, clock);
    expect(days).toEqual([
      { day: utcDay(clock, 2), count: 0 },
      { day: utcDay(clock, 1), count: 0 },
      { day: utcDay(clock), count: 2 },
    ]);
    expect((await dailyDownloads(handle.db, null, 3, clock))[0]?.count).toBe(1);
    expect(await recentDownloads(handle.db, [a.id, b.id], 30, clock)).toEqual(
      new Map([
        [a.id, 2],
        [b.id, 1],
      ]),
    );
    expect(await topDownloads(handle.db, 30, 5, clock)).toEqual([
      { id: a.id, name: "a.txt", count: 2 },
      { id: b.id, name: "b.txt", count: 1 },
    ]);
    expect((await getFile(handle.db, b.id))?.downloads).toBe(2);
  });
});
