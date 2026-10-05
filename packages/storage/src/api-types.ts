/**
 * The storage API's request and response shapes, shared by the site's routes and
 * the browser client:
 *
 *   POST   /api/storage/uploads                 UploadRequest → UploadStarted (201)
 *   POST   /api/storage/uploads/<id>/parts      { parts: number[] } → PartUrls
 *   POST   /api/storage/uploads/<id>/complete   → { file: StoredFileSummary }
 *   POST   /api/storage/uploads/<id>/thumbnail  (image/webp body) → { file }
 *   DELETE /api/storage/uploads/<id>            → 204 (cancels an unfinished upload)
 *   GET    /api/storage/files/<id>              → { file: StoredFileSummary }
 *
 * Errors are { error: "<message for people>" }.
 */
import type { StoredKind } from "./files";
import type { FileStatus, FileVisibility } from "./moderation";

export interface UploadRequest {
  purpose: string;
  name: string;
  size: number;
  visibility?: FileVisibility;
}

export interface UploadStarted {
  file: StoredFileSummary;
  partSize: number;
  partCount: number;
}

/** Signed URLs by part number; they expire after `expiresIn` seconds. */
export interface PartUrls {
  urls: Record<string, string>;
  expiresIn: number;
}

/** Part URLs handed out per request (the client asks again for more). */
export const MAX_PART_URLS = 50;

export interface StoredFileSummary {
  id: string;
  name: string;
  size: number;
  kind: StoredKind;
  label: string;
  status: FileStatus;
  visibility: FileVisibility;
  /** Why it was rejected or removed (shown to its owner). */
  statusReason: string | null;
  /** The file's page on the site. */
  pageUrl: string;
  /** Where anyone can download it; null until it's served publicly. */
  publicUrl: string | null;
  /** Its thumbnail, when it has one that's served publicly. */
  thumbnailUrl: string | null;
}
