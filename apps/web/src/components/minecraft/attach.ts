/**
 * The browser side of /api/minecraft/attach: tie an upload that has just started to
 * a release or the gallery. Used as uploadFile's `onStarted`, so a refusal (a full
 * gallery, a wrong file type) cancels the upload before any bytes are sent.
 */
import { UploadError } from "@trilleo/storage/client";

export interface AttachTarget {
  project: number;
  release?: number;
  primary?: boolean;
  caption?: string;
}

export async function attachUpload(
  target: AttachTarget,
  fileId: string,
): Promise<void> {
  const response = await fetch("/api/minecraft/attach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, file: fileId }),
  });
  if (response.ok) return;
  let message = `Something went wrong (${String(response.status)}). Try again.`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") message = body.error;
  } catch {
    // Not JSON: keep the general message.
  }
  throw new UploadError(message, response.status);
}
