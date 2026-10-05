/**
 * Uploading from the browser: asks the site for an upload, sends the parts straight
 * to storage (several at once, each retried), then tells the site it's done. The
 * bytes never pass through the site's server.
 *
 *   const file = await uploadFile(input.files[0], { purpose: "site", onProgress });
 */
import {
  MAX_PART_URLS,
  type PartUrls,
  type StoredFileSummary,
  type UploadRequest,
  type UploadStarted,
} from "./api-types";
import { trimTrailingSlashes } from "./files";
import { partRange } from "./limits";
import { makeThumbnail } from "./thumbnail";
import type { FileVisibility } from "./moderation";

/** Sends one part's bytes to a signed URL, reporting bytes sent so far. */
export type PartTransport = (
  url: string,
  body: Blob,
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
) => Promise<void>;

export interface UploadOptions {
  purpose: string;
  visibility?: FileVisibility;
  onProgress?: (progress: { loaded: number; total: number }) => void;
  /** "finishing": every byte is sent and the site is checking the file. */
  onStage?: (stage: "uploading" | "finishing") => void;
  signal?: AbortSignal;
  /** The storage API's base path. */
  endpoint?: string;
  /** Parts in flight at once. */
  concurrency?: number;
  /** Tries per part before giving up. */
  attempts?: number;
  /** For tests. */
  fetch?: typeof fetch;
  putPart?: PartTransport;
  sleep?: (ms: number) => Promise<void>;
  /**
   * Makes the file's thumbnail (images and videos), sent once the upload is done.
   * False: none. Failing to make or send one never fails the upload.
   */
  thumbnail?: false | ((file: File) => Promise<Blob | null>);
}

/** The upload failed; `message` is meant for people. */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/** A part's PUT failed with this HTTP status (0: network error). Transports throw it. */
export class PartError extends Error {
  constructor(readonly status: number) {
    super(`Part upload failed (${String(status)})`);
  }
}

function abortError(): DOMException {
  return new DOMException("The upload was cancelled.", "AbortError");
}

/** The default transport: XMLHttpRequest, because fetch can't report upload progress. */
export const xhrPut: PartTransport = (url, body, onProgress, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new PartError(xhr.status));
    };
    xhr.onerror = () => {
      reject(new PartError(0));
    };
    xhr.onabort = () => {
      reject(abortError());
    };
    signal.addEventListener("abort", () => {
      xhr.abort();
    });
    xhr.send(body);
  });

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON: fall through.
  }
  return `Something went wrong (${String(response.status)}). Try again.`;
}

/** Uploads one file and returns it as the site now knows it. */
export async function uploadFile(
  file: File,
  options: UploadOptions,
): Promise<StoredFileSummary> {
  const endpoint = trimTrailingSlashes(options.endpoint ?? "/api/storage");
  const send = options.fetch ?? fetch;
  const put = options.putPart ?? xhrPut;
  const sleep =
    options.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const attempts = options.attempts ?? 4;
  const controller = new AbortController();
  const outer = options.signal;
  if (outer?.aborted) throw abortError();
  const onOuterAbort = () => {
    controller.abort();
  };
  outer?.addEventListener("abort", onOuterAbort);
  const { signal } = controller;

  const call = async (path: string, init: RequestInit = {}) => {
    const response = await send(`${endpoint}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
      signal,
    });
    if (!response.ok)
      throw new UploadError(await readError(response), response.status);
    return response;
  };

  const request: UploadRequest = {
    purpose: options.purpose,
    name: file.name,
    size: file.size,
    ...(options.visibility ? { visibility: options.visibility } : {}),
  };
  options.onStage?.("uploading");
  const started = (await (
    await call("/uploads", { method: "POST", body: JSON.stringify(request) })
  ).json()) as UploadStarted;
  const id = started.file.id;
  // Made while the parts go up; it's small and only needed at the end.
  const thumbnail =
    options.thumbnail === false
      ? Promise.resolve(null)
      : (options.thumbnail ?? makeThumbnail)(file).catch(() => null);
  const plan = { partSize: started.partSize, partCount: started.partCount };

  try {
    const loaded = new Map<number, number>();
    const report = () => {
      let sum = 0;
      for (const bytes of loaded.values()) sum += bytes;
      options.onProgress?.({ loaded: sum, total: file.size });
    };
    report();

    // Signed URLs, fetched in batches as the parts need them.
    const urls = new Map<number, { url: string; until: number }>();
    let pendingUrls: Promise<void> | null = null;
    const fetchUrls = async (from: number) => {
      const parts: number[] = [];
      for (
        let n = from;
        n <= plan.partCount && parts.length < MAX_PART_URLS;
        n++
      ) {
        if (!urls.has(n)) parts.push(n);
      }
      const body = (await (
        await call(`/uploads/${id}/parts`, {
          method: "POST",
          body: JSON.stringify({ parts }),
        })
      ).json()) as PartUrls;
      // Treat URLs as stale a minute early.
      const until = Date.now() + (body.expiresIn - 60) * 1000;
      for (const [n, url] of Object.entries(body.urls))
        urls.set(Number(n), { url, until });
    };
    const urlFor = async (n: number): Promise<string> => {
      for (;;) {
        const known = urls.get(n);
        if (known && known.until > Date.now()) return known.url;
        urls.delete(n);
        pendingUrls ??= fetchUrls(n).finally(() => {
          pendingUrls = null;
        });
        await pendingUrls;
      }
    };

    const sendPart = async (n: number) => {
      const { start, end } = partRange(plan, file.size, n);
      const body = file.slice(start, end);
      for (let attempt = 1; ; attempt++) {
        const url = await urlFor(n);
        try {
          await put(
            url,
            body,
            (bytes) => {
              loaded.set(n, bytes);
              report();
            },
            signal,
          );
          loaded.set(n, end - start);
          report();
          return;
        } catch (error) {
          if (signal.aborted) throw abortError();
          loaded.set(n, 0);
          report();
          // An expired or refused URL: get a new one next time.
          if (error instanceof PartError && error.status === 403)
            urls.delete(n);
          if (attempt >= attempts)
            throw new UploadError(
              "The upload kept failing. Check your connection and try again.",
              error instanceof PartError ? error.status : 0,
            );
          await sleep(500 * 2 ** (attempt - 1));
        }
      }
    };

    let next = 1;
    const worker = async () => {
      while (next <= plan.partCount) {
        const n = next++;
        await sendPart(n);
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(options.concurrency ?? 4, plan.partCount) },
        worker,
      ),
    );

    options.onStage?.("finishing");
    const done = (await (
      await call(`/uploads/${id}/complete`, { method: "POST" })
    ).json()) as { file: StoredFileSummary };
    const image = await thumbnail;
    if (!image) return done.file;
    try {
      const response = await send(`${endpoint}/uploads/${id}/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "image/webp" },
        body: image,
        signal,
      });
      if (!response.ok) return done.file;
      return ((await response.json()) as { file: StoredFileSummary }).file;
    } catch {
      return done.file;
    }
  } catch (error) {
    // Stop the other parts, and let the site throw away what arrived.
    controller.abort();
    void send(`${endpoint}/uploads/${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    throw error;
  } finally {
    outer?.removeEventListener("abort", onOuterAbort);
  }
}

/** Asks the site how a file is doing (e.g. while it's still processing). */
export async function fetchFile(
  id: string,
  options: {
    endpoint?: string;
    fetch?: typeof fetch;
    signal?: AbortSignal;
  } = {},
): Promise<StoredFileSummary> {
  const endpoint = trimTrailingSlashes(options.endpoint ?? "/api/storage");
  const response = await (options.fetch ?? fetch)(`${endpoint}/files/${id}`, {
    signal: options.signal,
  });
  if (!response.ok)
    throw new UploadError(await readError(response), response.status);
  return ((await response.json()) as { file: StoredFileSummary }).file;
}
