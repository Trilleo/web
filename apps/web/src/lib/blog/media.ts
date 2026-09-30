/**
 * Images uploaded in the post editor. The type comes from the file's own bytes (never
 * the browser's claim), only raster formats are accepted (an SVG can carry scripts),
 * and each file is stored once under the SHA-256 of its bytes.
 */
import { createHash } from "node:crypto";
import { media, type Database, type Media } from "@trilleo/db";
import { eq } from "drizzle-orm";

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

export type MediaType = keyof typeof EXTENSIONS;

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** The image type the bytes really are, or null if it isn't one we accept. */
export function sniffImageType(bytes: Uint8Array): MediaType | null {
  const starts = (...values: number[]) =>
    values.every((value, i) => bytes[i] === value);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")
    return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return "image/webp";
  if (
    ascii(bytes, 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(ascii(bytes, 8, 12))
  )
    return "image/avif";
  return null;
}

export function mediaUrl(item: Pick<Media, "id" | "contentType">): string {
  const extensions: Readonly<Record<string, string | undefined>> = EXTENSIONS;
  const extension = extensions[item.contentType] ?? "bin";
  return `/media/${item.id}.${extension}`;
}

/** "abc….png" → the id, if the extension matches what's stored (checked on read). */
export function parseMediaFile(
  file: string,
): { id: string; extension: string } | null {
  const match = /^([0-9a-f]{64})\.([a-z]{3,4})$/.exec(file);
  return match?.[1] && match[2] ? { id: match[1], extension: match[2] } : null;
}

export type UploadError = "empty" | "too-large" | "not-an-image";

export type UploadResult =
  | { ok: true; url: string; id: string; name: string }
  | { ok: false; error: UploadError };

export const UPLOAD_ERROR_MESSAGES: Readonly<Record<UploadError, string>> = {
  empty: "That file is empty.",
  "too-large": `Images can be up to ${String(MEDIA_MAX_BYTES / 1024 / 1024)} MB.`,
  "not-an-image": "Only PNG, JPEG, GIF, WebP and AVIF images can be uploaded.",
};

/** Stores an image (once, however often it's uploaded) and returns its URL. */
export async function saveMedia(
  db: Database,
  input: {
    bytes: Uint8Array;
    name: string;
    uploadedBy: string | null;
    now?: Date;
  },
): Promise<UploadResult> {
  const { bytes } = input;
  if (bytes.length === 0) return { ok: false, error: "empty" };
  if (bytes.length > MEDIA_MAX_BYTES) return { ok: false, error: "too-large" };
  const contentType = sniffImageType(bytes);
  if (!contentType) return { ok: false, error: "not-an-image" };

  const id = createHash("sha256").update(bytes).digest("hex");
  const name = input.name.replace(/[\\/]/g, "_").slice(0, 200) || "image";
  await db
    .insert(media)
    .values({
      id,
      contentType,
      data: bytes,
      size: bytes.length,
      name,
      uploadedBy: input.uploadedBy,
      createdAt: input.now ?? new Date(),
    })
    .onConflictDoNothing({ target: media.id });
  return { ok: true, id, name, url: mediaUrl({ id, contentType }) };
}

export async function getMedia(
  db: Database,
  id: string,
): Promise<Media | undefined> {
  const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return item;
}
