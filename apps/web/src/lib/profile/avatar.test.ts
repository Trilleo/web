import {
  openDatabase,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import {
  AVATAR_ADMIN_MAX_BYTES,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_SIDE,
  avatarByHash,
  avatarUrl,
  checkAvatar,
  imageInfo,
  removeAvatar,
  saveAvatar,
} from "./avatar";
import { coverRect } from "./crop";

/** A PNG's signature and IHDR (enough for the checks), padded to `size` bytes. */
function png(width: number, height: number, size = 64, extra = ""): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set(new TextEncoder().encode(extra), 33);
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, an APP0 segment (length 16), then SOF0 with the size.
  const bytes = new Uint8Array(40);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 0);
  bytes.set(
    [
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      height >> 8,
      height & 0xff,
      width >> 8,
      width & 0xff,
    ],
    20,
  );
  return bytes;
}

function webpX(width: number, height: number, animated = false): Uint8Array {
  const bytes = new Uint8Array(40);
  const text = (value: string, at: number) => {
    bytes.set(new TextEncoder().encode(value), at);
  };
  text("RIFF", 0);
  text("WEBP", 8);
  text("VP8X", 12);
  bytes[20] = animated ? 0x02 : 0;
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, w >> 16], 24);
  bytes.set([h & 0xff, (h >> 8) & 0xff, h >> 16], 27);
  return bytes;
}

describe("checking pictures", () => {
  it("reads sizes from PNG, JPEG and WebP headers", () => {
    expect(imageInfo(png(300, 200), "image/png")).toEqual({
      width: 300,
      height: 200,
      animated: false,
    });
    expect(imageInfo(jpeg(640, 480), "image/jpeg")).toEqual({
      width: 640,
      height: 480,
      animated: false,
    });
    expect(imageInfo(webpX(256, 256, true), "image/webp")).toEqual({
      width: 256,
      height: 256,
      animated: true,
    });
  });

  it("accepts small still pictures and refuses the rest", () => {
    expect(checkAvatar(png(256, 256))).toEqual({ ok: true, type: "image/png" });
    expect(checkAvatar(new Uint8Array())).toEqual({
      ok: false,
      error: "empty",
    });
    expect(checkAvatar(new TextEncoder().encode("<svg></svg>"))).toEqual({
      ok: false,
      error: "not-an-image",
    });
    expect(checkAvatar(png(AVATAR_MAX_SIDE + 1, 10))).toEqual({
      ok: false,
      error: "too-big",
    });
    expect(checkAvatar(png(10, 10, AVATAR_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: "too-large",
    });
    expect(checkAvatar(webpX(10, 10, true))).toEqual({
      ok: false,
      error: "animated",
    });
    expect(checkAvatar(png(10, 10, 64, "acTL"))).toEqual({
      ok: false,
      error: "animated",
    });
  });

  it("lets the admin past the size limits, up to a ceiling", () => {
    expect(checkAvatar(png(10, 10, AVATAR_MAX_BYTES + 1), true).ok).toBe(true);
    expect(checkAvatar(png(AVATAR_MAX_SIDE * 2, 10), true).ok).toBe(true);
    expect(checkAvatar(png(10, 10, AVATAR_ADMIN_MAX_BYTES + 1), true)).toEqual({
      ok: false,
      error: "too-large",
    });
    expect(checkAvatar(webpX(10, 10, true), true)).toEqual({
      ok: false,
      error: "animated",
    });
  });
});

describe("cropping", () => {
  it("keeps the square inside the picture", () => {
    const wide = { width: 400, height: 200 };
    expect(coverRect(wide, 1, { x: 0.5, y: 0.5 })).toMatchObject({
      x: 100,
      y: 0,
      side: 200,
    });
    expect(coverRect(wide, 2, { x: 0, y: 0 })).toMatchObject({
      x: 0,
      y: 0,
      side: 100,
    });
    expect(coverRect(wide, 1, { x: 2, y: 2 })).toMatchObject({ x: 200, y: 0 });
  });
});

describe("storing avatars", () => {
  let handle: DatabaseHandle;
  let alice: User;
  beforeEach(async () => {
    handle = await openDatabase("memory://");
    alice = await upsertGitHubUser(handle.db, {
      id: 2,
      login: "alice",
      name: null,
    });
  });
  afterEach(async () => {
    await handle.close();
  });

  const hashOf = async () =>
    (await handle.db.select().from(users).where(eq(users.id, alice.id)))[0]
      ?.avatarHash ?? null;

  it("saves, replaces and removes someone's picture", async () => {
    const first = await saveAvatar(handle.db, alice.id, png(64, 64));
    if (!first.ok) throw new Error("refused");
    expect(await hashOf()).toBe(first.hash);
    expect(avatarUrl(first.hash)).toBe(`/avatars/${first.hash}`);
    expect((await avatarByHash(handle.db, first.hash))?.contentType).toBe(
      "image/png",
    );

    const second = await saveAvatar(handle.db, alice.id, png(32, 32));
    if (!second.ok) throw new Error("refused");
    expect(await avatarByHash(handle.db, first.hash)).toBeUndefined();
    expect(await hashOf()).toBe(second.hash);

    expect(await removeAvatar(handle.db, alice.id)).toBe(true);
    expect(await hashOf()).toBeNull();
    expect(await avatarByHash(handle.db, second.hash)).toBeUndefined();
  });

  it("stops serving a blocked account's picture, and refuses bad hashes", async () => {
    const saved = await saveAvatar(handle.db, alice.id, png(64, 64));
    if (!saved.ok) throw new Error("refused");
    await handle.db
      .update(users)
      .set({ blockedAt: new Date() })
      .where(eq(users.id, alice.id));
    expect(await avatarByHash(handle.db, saved.hash)).toBeUndefined();
    expect(await avatarByHash(handle.db, "../etc")).toBeUndefined();
  });

  it("goes with the account", async () => {
    const saved = await saveAvatar(handle.db, alice.id, png(64, 64));
    if (!saved.ok) throw new Error("refused");
    await handle.db.delete(users).where(eq(users.id, alice.id));
    expect(await avatarByHash(handle.db, saved.hash)).toBeUndefined();
  });
});
