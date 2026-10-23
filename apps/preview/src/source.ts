/**
 * Getting a link's bytes into the browser: straight from the site when it allows
 * that (CORS), otherwise through this site's server (/api/tools/preview/fetch), which
 * streams the file and keeps nothing. Either way the file stays in memory: nothing is
 * saved to the device.
 */
import {
  MAX_PREVIEW_BYTES,
  nameFromDisposition,
  nameFromUrl,
  type ResolvedLink,
} from "./links";
import { formatBytes } from "@trilleo/tool-kit";

/** The server's fallback. A POST, so the site's same-origin check covers it. */
export const FETCH_ENDPOINT = "/api/tools/preview/fetch";

/** A problem to show as it is. */
export class PreviewError extends Error {
  override name = "PreviewError";
}

export type Route = "browser" | "server";

export interface FetchedLink {
  file: File;
  route: Route;
  /** Where the file came from after redirects. */
  finalUrl: string;
  /** What the site said it was (a hint only: the bytes decide). */
  contentType: string | null;
}

export interface FetchOptions {
  signal?: AbortSignal;
  onProgress?: (received: number, total: number | null) => void;
  /** For tests. */
  fetch?: typeof fetch;
}

const tooBig = () =>
  new PreviewError(
    `This file is bigger than ${formatBytes(MAX_PREVIEW_BYTES)}, the most this tool previews.`,
  );

/** Reads a response's body, stopping (and refusing) past the size limit. */
async function readBody(
  response: Response,
  options: FetchOptions,
): Promise<Blob> {
  const length = Number(response.headers.get("Content-Length") ?? "");
  const total = Number.isFinite(length) && length > 0 ? length : null;
  if (total !== null && total > MAX_PREVIEW_BYTES) {
    void response.body?.cancel();
    throw tooBig();
  }
  if (!response.body) return response.blob();
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  options.onProgress?.(0, total);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_PREVIEW_BYTES) {
      void reader.cancel();
      throw tooBig();
    }
    chunks.push(value);
    options.onProgress?.(received, total);
  }
  return new Blob(chunks);
}

function fileName(
  finalUrl: string,
  disposition: string | null,
  fallback: string,
): string {
  return (
    nameFromDisposition(disposition) ??
    nameFromUrl(finalUrl) ??
    nameFromUrl(fallback) ??
    "document"
  );
}

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/** What the server's fallback says went wrong, as `{ error: { message } }`. */
async function serverProblem(response: Response): Promise<PreviewError> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    if (typeof body.error?.message === "string")
      return new PreviewError(body.error.message);
  } catch {
    // Not JSON: use the generic message below.
  }
  return new PreviewError(
    response.status === 429
      ? "Too many previews from here for now. Try again later."
      : "This link couldn't be fetched.",
  );
}

async function viaServer(
  link: ResolvedLink,
  options: FetchOptions,
): Promise<FetchedLink> {
  const run = options.fetch ?? fetch;
  const response = await run(FETCH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: link.url }),
    credentials: "same-origin",
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok) throw await serverProblem(response);
  const finalUrl = response.headers.get("X-Preview-Url") ?? link.url;
  const rawName = response.headers.get("X-Preview-Name");
  const name = rawName ? decodeURIComponent(rawName) : null;
  const blob = await readBody(response, options);
  return {
    file: new File([blob], name ?? fileName(finalUrl, null, link.original)),
    route: "server",
    finalUrl,
    contentType: response.headers.get("X-Preview-Type"),
  };
}

/**
 * Fetches a link's file: from the browser if the site allows it, otherwise through
 * the server. A site that answers the browser with an error (404, 403) isn't tried
 * again through the server: the answer would be the same.
 */
export async function fetchLink(
  link: ResolvedLink,
  options: FetchOptions = {},
): Promise<FetchedLink> {
  const run = options.fetch ?? fetch;
  let response: Response;
  try {
    response = await run(link.url, {
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    // CORS refusals, mixed content and unreachable hosts all land here, and the
    // browser can't tell them apart: let the server try.
    return viaServer(link, options);
  }
  if (!response.ok) {
    void response.body?.cancel();
    throw new PreviewError(
      response.status === 404 || response.status === 410
        ? "Nothing is at that link (the site says it's not found)."
        : response.status === 401 || response.status === 403
          ? "That site wants you signed in to see this file, so it can't be previewed here."
          : `The site answered with an error (${String(response.status)}).`,
    );
  }
  const finalUrl = response.url || link.url;
  const disposition = response.headers.get("Content-Disposition");
  const contentType = response.headers.get("Content-Type");
  const blob = await readBody(response, options);
  return {
    file: new File([blob], fileName(finalUrl, disposition, link.original), {
      type: contentType?.split(";")[0]?.trim() ?? "",
    }),
    route: "browser",
    finalUrl,
    contentType,
  };
}
