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
