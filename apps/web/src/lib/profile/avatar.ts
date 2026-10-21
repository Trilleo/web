/**
 * Profile pictures. The browser crops a picture to a square and sends a small WebP
 * (AVATAR_SIZE, components/account/AvatarPicker's script); without JavaScript the
 * picture goes as it is. Either way the server checks the bytes themselves: PNG,
 * JPEG or WebP (never SVG, which can carry scripts), at most AVATAR_MAX_BYTES and
 * AVATAR_MAX_SIDE pixels a side, not animated. The admin isn't held to the size
 * limits (only to AVATAR_ADMIN_MAX_BYTES, so one upload can't swamp the server's
 * memory) and may keep a picture as it is, uncropped. One per account (avatars), served at
 * /avatars/<sha256> and cached forever, since a new picture has a new hash.
 */
import { createHash } from "node:crypto";
import { avatars, users, type Avatar, type Database } from "@trilleo/db";
import { eq } from "drizzle-orm";
import { sniffImageType } from "../blog/media";

export const AVATAR_MAX_BYTES = 1024 * 1024;
/** The admin's ceiling: past AVATAR_MAX_BYTES and AVATAR_MAX_SIDE, but not unbounded. */
export const AVATAR_ADMIN_MAX_BYTES = 10 * 1024 * 1024;
/** Pixels a side the browser makes (shown at up to 128 CSS pixels, so 2× sharp). */
export const AVATAR_SIZE = 256;
/** The largest picture accepted as it is (when the browser didn't resize it). */
export const AVATAR_MAX_SIDE = 2048;

const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AvatarType = (typeof TYPES)[number];

/** For the file input's `accept`. */
export const AVATAR_ACCEPT = TYPES.join(",");

const u16be = (bytes: Uint8Array, at: number) =>
  ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
const u16le = (bytes: Uint8Array, at: number) =>
  (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
const u24le = (bytes: Uint8Array, at: number) =>
  u16le(bytes, at) | ((bytes[at + 2] ?? 0) << 16);
const u32be = (bytes: Uint8Array, at: number) =>
  u16be(bytes, at) * 65_536 + u16be(bytes, at + 2);
const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

export interface ImageInfo {
  width: number;
  height: number;
  animated: boolean;
}

/** A PNG's, JPEG's or WebP's size from its header, or null if it can't be read. */
export function imageInfo(
  bytes: Uint8Array,
  type: AvatarType,
): ImageInfo | null {
  switch (type) {
    case "image/png": {
      if (ascii(bytes, 12, 16) !== "IHDR") return null;
      // An animated PNG has an acTL chunk before its first IDAT.
      const head = ascii(bytes, 0, Math.min(bytes.length, 4096));
      const idat = head.indexOf("IDAT");
      const actl = head.indexOf("acTL");
      return {
        width: u32be(bytes, 16),
        height: u32be(bytes, 20),
        animated: actl !== -1 && (idat === -1 || actl < idat),
      };
    }
    case "image/jpeg": {
      let at = 2;
      while (at + 9 < bytes.length) {
        if (bytes[at] !== 0xff) return null;
        const marker = bytes[at + 1] ?? 0;
        // Start-of-frame markers (C0–CF, except the DHT, JPG and DAC ones).
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return {
            height: u16be(bytes, at + 5),
            width: u16be(bytes, at + 7),
            animated: false,
          };
        }
        at += 2 + u16be(bytes, at + 2);
      }
      return null;
    }
    case "image/webp": {
      const chunk = ascii(bytes, 12, 16);
      if (chunk === "VP8 ") {
        return {
          width: u16le(bytes, 26) & 0x3fff,
          height: u16le(bytes, 28) & 0x3fff,
          animated: false,
        };
      }
      if (chunk === "VP8L") {
        const b1 = bytes[22] ?? 0;
        const b2 = bytes[23] ?? 0;
        const b3 = bytes[24] ?? 0;
        return {
          width: 1 + (((b2 & 0x3f) << 8) | b1),
          height: 1 + (((bytes[25] ?? 0) & 0x0f) << 10) + (b3 << 2) + (b2 >> 6),
          animated: false,
        };
      }
      if (chunk === "VP8X") {
        return {
          width: 1 + u24le(bytes, 24),
          height: 1 + u24le(bytes, 27),
          animated: ((bytes[20] ?? 0) & 0x02) !== 0,
        };
      }
      return null;
    }
  }
}

export type AvatarError =
  "empty" | "too-large" | "not-an-image" | "too-big" | "animated";

export const AVATAR_ERROR_MESSAGES: Readonly<Record<AvatarError, string>> = {
  empty: "Choose a picture first.",
  "too-large": `Pictures can be up to ${String(AVATAR_MAX_BYTES / 1024 / 1024)} MB.`,
  "not-an-image": "Only PNG, JPEG and WebP pictures can be used.",
  "too-big": `Pictures can be up to ${String(AVATAR_MAX_SIDE)} × ${String(AVATAR_MAX_SIDE)} pixels.`,
  animated: "Animated pictures can’t be used.",
};

/** The most bytes someone may upload as their picture. */
export function avatarMaxBytes(admin: boolean): number {
  return admin ? AVATAR_ADMIN_MAX_BYTES : AVATAR_MAX_BYTES;
}

/** Checks a picture's bytes (`admin`: past the size limits). */
export function checkAvatar(
  bytes: Uint8Array,
  admin = false,
): { ok: true; type: AvatarType } | { ok: false; error: AvatarError } {
  if (bytes.length === 0) return { ok: false, error: "empty" };
  if (bytes.length > avatarMaxBytes(admin))
    return { ok: false, error: "too-large" };
  const sniffed = sniffImageType(bytes);
  const type = TYPES.find((value) => value === sniffed);
  if (!type) return { ok: false, error: "not-an-image" };
  const info = imageInfo(bytes, type);
  if (!info || info.width < 1 || info.height < 1)
    return { ok: false, error: "not-an-image" };
  if (!admin && (info.width > AVATAR_MAX_SIDE || info.height > AVATAR_MAX_SIDE))
    return { ok: false, error: "too-big" };
  if (info.animated) return { ok: false, error: "animated" };
  return { ok: true, type };
}

export function avatarUrl(hash: string): string {
  return `/avatars/${hash}`;
}

/** Makes a picture someone's avatar (replacing any other). Returns its hash. */
export async function saveAvatar(
  db: Database,
  userId: string,
  bytes: Uint8Array,
  options: { admin?: boolean; now?: Date } = {},
): Promise<{ ok: true; hash: string } | { ok: false; error: AvatarError }> {
  const now = options.now ?? new Date();
  const checked = checkAvatar(bytes, options.admin);
  if (!checked.ok) return checked;
  const hash = createHash("sha256").update(bytes).digest("hex");
  const row = {
    hash,
    contentType: checked.type,
    data: bytes,
    size: bytes.length,
    createdAt: now,
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(avatars)
      .values({ userId, ...row })
      .onConflictDoUpdate({ target: avatars.userId, set: row });
    await tx
      .update(users)
      .set({ avatarHash: hash })
      .where(eq(users.id, userId));
  });
  return { ok: true, hash };
}

/** Takes someone's avatar away (they did, or the admin). Returns whether they had one. */
export async function removeAvatar(
  db: Database,
  userId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(avatars)
      .where(eq(avatars.userId, userId))
      .returning({ hash: avatars.hash });
    await tx
      .update(users)
      .set({ avatarHash: null })
      .where(eq(users.id, userId));
    return removed.length > 0;
  });
}

/** The picture at /avatars/<hash>, if it's still someone's (and they aren't blocked). */
export async function avatarByHash(
  db: Database,
  hash: string,
): Promise<Avatar | undefined> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return undefined;
  const [row] = await db
    .select({ avatar: avatars, blockedAt: users.blockedAt })
    .from(avatars)
    .innerJoin(users, eq(users.id, avatars.userId))
    .where(eq(avatars.hash, hash))
    .limit(1);
  return row?.blockedAt === null ? row.avatar : undefined;
}
