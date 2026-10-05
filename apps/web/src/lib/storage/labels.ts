import type { FileStatus, FileVisibility } from "@trilleo/storage";

/** Statuses as people read them. */
export const STATUS_LABELS: Readonly<Record<FileStatus, string>> = {
  uploading: "Uploading",
  processing: "Processing",
  pending_review: "Waiting for review",
  published: "Published",
  rejected: "Refused",
  removed: "Taken down",
  deleted: "Deleted",
};

export const VISIBILITY_LABELS: Readonly<Record<FileVisibility, string>> = {
  public: "Public",
  unlisted: "Unlisted (anyone with the link)",
  private: "Private (you and the site owner)",
};
