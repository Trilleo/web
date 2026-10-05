/**
 * Where the bytes live. The site talks to storage only through this interface:
 * Huawei OBS in production (obs.ts), a folder or memory in dev and tests (local.ts).
 * Keys are always `objectKey()`s: ASCII, no escaping needed.
 */
import type { ServeHeaders } from "./files";

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface ObjectInfo {
  size: number;
  contentType: string | null;
}

export interface StorageDriver {
  readonly kind: "obs" | "local";

  /** Starts a multipart upload of a private object. Returns its upload id. */
  startUpload(key: string, headers: ServeHeaders): Promise<string>;
  /** A URL the browser can PUT part `partNumber` to, valid for `expiresIn` seconds. */
  partUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number,
  ): Promise<string>;
  /** The parts received so far, by part number. */
  listParts(key: string, uploadId: string): Promise<UploadedPart[]>;
  /** Joins the parts into the object. */
  finishUpload(
    key: string,
    uploadId: string,
    parts: readonly UploadedPart[],
  ): Promise<void>;
  /** Throws the parts away (fine to call on an upload that's already gone). */
  abortUpload(key: string, uploadId: string): Promise<void>;

  /** Stores a small private object in one request (thumbnails). */
  put(key: string, bytes: Uint8Array, headers: ServeHeaders): Promise<void>;

  head(key: string): Promise<ObjectInfo | null>;
  /** The object's bytes, or the range [start, end) of them. */
  read(
    key: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>>;
  /** Makes the object readable by anyone (on the files domain), or private again. */
  setPublic(key: string, isPublic: boolean): Promise<void>;
  /** Deletes the object (fine to call on one that's already gone). */
  remove(key: string): Promise<void>;

  /** Where anyone downloads a public object. May be site-relative (local driver). */
  publicUrl(key: string): string;
  /**
   * A short-lived URL for a private object, saved as `filename` when given.
   * May be site-relative (local driver).
   */
  signedUrl(
    key: string,
    expiresIn: number,
    options?: { filename?: string },
  ): Promise<string>;
}

/** Storage answered with an error. `status` is the HTTP status (0: no answer). */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/** Reads a stream's first `limit` bytes (or all of it, if shorter). */
export async function readBytes(
  stream: ReadableStream<Uint8Array>,
  limit = Infinity,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = stream.getReader();
  try {
    while (length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(Math.min(length, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, bytes.length - offset);
    bytes.set(chunk.subarray(0, take), offset);
    offset += take;
    if (offset >= bytes.length) break;
  }
  return bytes;
}
