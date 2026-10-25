/**
 * Where the CHUNITHM catalog comes from, and fetching it politely: one request at a
 * time to sdvx.in, a timeout, a size cap, and a User-Agent that says who we are.
 *
 * Settings (all optional): CHUNITHM_SYNC=off never fetches (e2e); CHUNITHM_SEGA_URL,
 * CHUNITHM_OTOGE_URL (the folder holding music-ex.json) and CHUNITHM_SDVX_URL (the
 * origin) point elsewhere, and CHUNITHM_SDVX_DELAY_MS changes the wait between
 * sdvx.in requests: for e2e, which fetches from e2e/fake-chunithm.ts.
 */
import { SITE_URL } from "../site";

export const SEGA_MUSIC_URL =
  "https://chunithm.sega.jp/storage/json/music.json";
export const OTOGE_DATA_URL = "https://otoge-db.net/chunithm/data/";
export const SDVX_ORIGIN = "https://sdvx.in";

/** sdvx.in's list pages: every genre, Ultima, World's End, and removed songs. */
export const SDVX_LIST_PAGES = [
  "/chunithm/sort/pops.htm",
  "/chunithm/sort/niconico.htm",
  "/chunithm/sort/toho.htm",
  "/chunithm/sort/variety.htm",
  "/chunithm/sort/irodorimidori.htm",
  "/chunithm/sort/gekimai.htm",
  "/chunithm/sort/original.htm",
  "/chunithm/sort/ultima.htm",
  "/chunithm/end.htm",
  "/chunithm/del.htm",
] as const;

export const FETCH_LIMITS = {
  timeoutMs: 30_000,
  /** sdvx.in's pages and scripts are small: a request taking longer is stuck. */
  sdvxTimeoutMs: 15_000,
  /** otoge-db's music-ex.json is about 3 MB. */
  maxJsonBytes: 16 * 1024 * 1024,
  maxPageBytes: 2 * 1024 * 1024,
};

export const USER_AGENT = `trilleo.net CHUNITHM chart viewer (+${SITE_URL}/tools/chunithm/)`;

export interface ChunithmSources {
  segaUrl: string;
  otogeUrl: string;
  sdvxOrigin: string;
  /** The wait between requests to sdvx.in (CHUNITHM_SDVX_DELAY_MS; e2e sets 0). */
  delayMs?: number;
}

export function chunithmSources(
  env: Record<string, string | undefined> = process.env,
): ChunithmSources | null {
  if (env.CHUNITHM_SYNC === "off") return null;
  const setting = (value: string | undefined, fallback: string) =>
    value === undefined || value === "" ? fallback : value;
  return {
    segaUrl: setting(env.CHUNITHM_SEGA_URL, SEGA_MUSIC_URL),
    otogeUrl: setting(env.CHUNITHM_OTOGE_URL, OTOGE_DATA_URL),
    sdvxOrigin: setting(env.CHUNITHM_SDVX_URL, SDVX_ORIGIN),
    ...(env.CHUNITHM_SDVX_DELAY_MS
      ? { delayMs: Math.max(0, Number(env.CHUNITHM_SDVX_DELAY_MS) || 0) }
      : {}),
  };
}

/** A request that didn't give us the file (404 is `missing`: it isn't there). */
export class FetchError extends Error {
  constructor(
    readonly url: string,
    message: string,
    readonly missing = false,
  ) {
    super(`${url}: ${message}`);
    this.name = "FetchError";
  }
}

export async function fetchText(
  fetcher: typeof fetch,
  url: string,
  maxBytes: number,
  timeoutMs: number = FETCH_LIMITS.timeoutMs,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new FetchError(
      url,
      error instanceof Error ? error.message : "failed",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new FetchError(
      url,
      `HTTP ${String(response.status)}`,
      response.status === 404,
    );
  }
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > maxBytes) {
    await response.body?.cancel();
    throw new FetchError(url, "too large");
  }
  const bytes = await readBody(response, url);
  if (bytes.byteLength > maxBytes) throw new FetchError(url, "too large");
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * The response's body. A download that stalls or drops partway (the timeout runs
 * on, so a slow body is cut off) is a FetchError like no answer at all.
 */
export async function readBody(
  response: Response,
  url: string,
): Promise<Uint8Array> {
  try {
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    throw new FetchError(
      url,
      `the download broke off (${error instanceof Error ? error.message : "failed"})`,
    );
  }
}

export async function fetchJson(
  fetcher: typeof fetch,
  url: string,
): Promise<unknown> {
  const text = await fetchText(fetcher, url, FETCH_LIMITS.maxJsonBytes);
  try {
    return JSON.parse(text.replace(/^\uFEFF/, "")) as unknown;
  } catch {
    throw new FetchError(url, "not JSON");
  }
}

/** How long a download may take (`download`). */
export interface DownloadLimits {
  maxBytes: number;
  /** Give up on a connection that sends nothing for this long, and resume. */
  stallMs: number;
  /** Give up altogether after this long. */
  totalMs: number;
  /** Connections at most (the first, then resumes). */
  tries: number;
}

/** Big files from sdvx.in: the notes layers, up to about 15 MB. */
export const LAYER_DOWNLOAD: Omit<DownloadLimits, "maxBytes"> = {
  stallMs: 30_000,
  totalMs: 6 * 60_000,
  tries: 6,
};

/** Jackets: 200 KB to 2.5 MB. */
export const JACKET_DOWNLOAD: Omit<DownloadLimits, "maxBytes"> = {
  stallMs: 20_000,
  totalMs: 4 * 60_000,
  tries: 5,
};

/** How far a download has got, for a progress line (the bundling script's). */
export interface DownloadProgress {
  received: number;
  /** The whole file's size, when the server said. */
  total: number | null;
  /** Times it has had to resume (or start over) so far. */
  resumes: number;
}

export interface Downloaded {
  status: number;
  headers: Headers;
  /** Empty unless the status is 200. */
  bytes: Uint8Array;
}

/**
 * Downloads a file that may be big for the link from the server (mainland China to
 * Japan): no time limit on the whole body, only on silence (`stallMs`), and a body
 * that breaks off is resumed where it stopped with a Range request (If-Range keeps
 * the pieces from two versions of the file apart). Any answer but 200 comes back as
 * it is, without a body; redirects aren't followed (sdvx.in sends missing files to
 * an HTML page). Throws FetchError when it can't get the whole file. `onProgress`
 * hears of each connection and each piece received.
 */
export async function download(
  fetcher: typeof fetch,
  url: string,
  accept: string,
  limits: DownloadLimits,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<Downloaded> {
  const started = Date.now();
  const chunks: Uint8Array[] = [];
  let got = 0;
  let total: number | null = null;
  let tag: string | null = null;
  let first: Response | null = null;
  let lastError = "failed";
  for (let attempt = 0; attempt < limits.tries; attempt++) {
    const left = limits.totalMs - (Date.now() - started);
    if (left <= 0) {
      lastError = "took too long";
      break;
    }
    const stall = new AbortController();
    let timer = setTimeout(() => {
      stall.abort(new Error(`nothing for ${String(limits.stallMs / 1000)} s`));
    }, limits.stallMs);
    const awake = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stall.abort(
          new Error(`nothing for ${String(limits.stallMs / 1000)} s`),
        );
      }, limits.stallMs);
    };
    const resuming: boolean = got > 0 && tag !== null;
    try {
      const response: Response = await fetcher(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: accept,
          ...(resuming
            ? { Range: `bytes=${String(got)}-`, "If-Range": tag ?? "" }
            : {}),
        },
        redirect: "manual",
        signal: AbortSignal.any([stall.signal, AbortSignal.timeout(left)]),
      });
      awake();
      if (!first) {
        if (response.status !== 200) {
          await response.body?.cancel();
          return {
            status: response.status,
            headers: response.headers,
            bytes: new Uint8Array(0),
          };
        }
        first = response;
        tag =
          response.headers.get("etag") ?? response.headers.get("last-modified");
        const length = response.headers.get("content-length");
        total = length === null ? null : Number(length);
        if (total !== null && total > limits.maxBytes) {
          await response.body?.cancel();
          throw new FetchError(url, "too large");
        }
      } else if (response.status === 200) {
        // The whole file again: starting over, or it changed (If-Range), or the
        // server ignored the range.
        chunks.length = 0;
        got = 0;
        const length = response.headers.get("content-length");
        total = length === null ? null : Number(length);
      } else if (!(resuming && response.status === 206)) {
        await response.body?.cancel();
        lastError = `HTTP ${String(response.status)} when resuming`;
        continue;
      }
      if (!response.body) throw new Error("no body");
      onProgress?.({ received: got, total, resumes: attempt });
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        awake();
        chunks.push(value);
        got += value.byteLength;
        onProgress?.({ received: got, total, resumes: attempt });
        if (got > limits.maxBytes) {
          await reader.cancel();
          throw new FetchError(url, "too large");
        }
      }
      if (total === null || got >= total) {
        const bytes = new Uint8Array(got);
        let at = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, at);
          at += chunk.byteLength;
        }
        return {
          status: 200,
          headers: first.headers,
          bytes,
        };
      }
      lastError = "the connection closed early";
    } catch (error) {
      if (error instanceof FetchError) throw error;
      lastError = error instanceof Error ? error.message : "failed";
      // Without a tag a resume could join two versions of the file: start over.
      if (tag === null) {
        chunks.length = 0;
        got = 0;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FetchError(
    url,
    `the download broke off at ${formatSize(got)}${total === null ? "" : ` of ${formatSize(total)}`} (${lastError})`,
  );
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${String(Math.round(bytes / 1024))} KB`;
}
