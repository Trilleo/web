/**
 * Where Hypixel SkyBlock's shard data comes from: SkyShards' repository on GitHub
 * (github.com/Campionnn/SkyShards, MIT). A pass asks for the default branch's newest
 * commit, then its file tree (each file's git blob SHA), so files that haven't changed
 * since the version we keep are never downloaded; the files themselves come from
 * raw.githubusercontent.com at that commit, so they all belong together.
 *
 * Settings (all optional): SKYBLOCK_SYNC=off never fetches (e2e); SKYBLOCK_REPO
 * ("owner/name"), SKYBLOCK_GITHUB_API and SKYBLOCK_RAW_URL point elsewhere (tests).
 */
import { createHash } from "node:crypto";
import { SITE_URL } from "../site";

export const SOURCE_REPO = "Campionnn/SkyShards";
export const GITHUB_API = "https://api.github.com";
export const RAW_URL = "https://raw.githubusercontent.com";

/** The repository's data files, by what readSources calls them. */
export const DATA_FILES = {
  fusionData: "public/fusion-data.json",
  properties: "public/fusion-properties.json",
  descriptions: "src/desc.json",
  rates: "public/rates.json",
} as const;
export type DataFile = keyof typeof DATA_FILES;

/** Shard icons: public/shardIcons/<SkyShards key>.png. */
export const ICON_DIR = "public/shardIcons/";

export const SOURCE_LIMITS = {
  /** A whole download (GitHub can take 20 s for fusion-data.json from China). */
  timeoutMs: 120_000,
  /**
   * Tries per file: raw.githubusercontent.com now and then answers 503 or stalls, then
   * serves the same file at once. Waits double from retryDelayMs between them.
   */
  tries: 3,
  retryDelayMs: 3000,
  /** fusion-data.json is about 3 MB. */
  maxJsonBytes: 24 * 1024 * 1024,
  /** Icons are about 15 KB. */
  maxIconBytes: 2 * 1024 * 1024,
};

export const USER_AGENT = `trilleo.net SkyBlock shards (+${SITE_URL}/tools/skyblock/)`;

export interface SkyblockSource {
  repo: string;
  apiUrl: string;
  rawUrl: string;
}

export function skyblockSource(
  env: Record<string, string | undefined> = process.env,
): SkyblockSource | null {
  if (env.SKYBLOCK_SYNC === "off") return null;
  const setting = (value: string | undefined, fallback: string) =>
    value === undefined || value === "" ? fallback : value.replace(/\/+$/, "");
  return {
    repo: setting(env.SKYBLOCK_REPO, SOURCE_REPO),
    apiUrl: setting(env.SKYBLOCK_GITHUB_API, GITHUB_API),
    rawUrl: setting(env.SKYBLOCK_RAW_URL, RAW_URL),
  };
}

export class SourceError extends Error {
  constructor(
    readonly url: string,
    message: string,
    /** Worth asking again (no answer, a timeout, 5xx or 429). */
    readonly retry = false,
  ) {
    super(`${url}: ${message}`);
    this.name = "SourceError";
  }
}

export interface FetchOptions {
  accept?: string;
  /** Tries before giving up (SOURCE_LIMITS.tries). */
  tries?: number;
  /** Waits between tries (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The body as bytes, refused past `maxBytes` (it's read as it arrives). Failures
 * worth repeating are tried again (SOURCE_LIMITS.tries).
 */
export async function fetchBytes(
  fetcher: typeof fetch,
  url: string,
  maxBytes: number,
  options: FetchOptions = {},
): Promise<Uint8Array> {
  const tries = Math.max(1, options.tries ?? SOURCE_LIMITS.tries);
  const sleep = options.sleep ?? wait;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchOnce(fetcher, url, maxBytes, options.accept ?? "*/*");
    } catch (error) {
      if (!(error instanceof SourceError) || !error.retry || attempt >= tries)
        throw error;
      await sleep(SOURCE_LIMITS.retryDelayMs * 2 ** (attempt - 1));
    }
  }
}

async function fetchOnce(
  fetcher: typeof fetch,
  url: string,
  maxBytes: number,
  accept: string,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      redirect: "follow",
      signal: AbortSignal.timeout(SOURCE_LIMITS.timeoutMs),
    });
  } catch (error) {
    throw new SourceError(
      url,
      error instanceof Error ? error.message : String(error),
      true,
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    const status = response.status;
    throw new SourceError(
      url,
      `HTTP ${String(status)}`,
      status >= 500 || status === 429 || status === 408,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    let next: ReadableStreamReadResult<Uint8Array>;
    try {
      next = await reader.read();
    } catch (error) {
      // Cut off or timed out part-way: ask again.
      throw new SourceError(
        url,
        error instanceof Error ? error.message : String(error),
        true,
      );
    }
    const { done, value } = next;
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new SourceError(url, `more than ${String(maxBytes)} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

export async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  options: FetchOptions = {},
): Promise<unknown> {
  const bytes = await fetchBytes(fetcher, url, SOURCE_LIMITS.maxJsonBytes, {
    accept: "application/json",
    ...options,
  });
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SourceError(url, "not JSON");
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const GITHUB_JSON = "application/vnd.github+json";

/** The default branch's newest commit SHA. */
export async function latestCommit(
  fetcher: typeof fetch,
  source: SkyblockSource,
): Promise<string> {
  const url = `${source.apiUrl}/repos/${source.repo}/commits/HEAD`;
  const body = await fetchJson(fetcher, url, { accept: GITHUB_JSON });
  const sha = isRecord(body) ? body.sha : undefined;
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha))
    throw new SourceError(url, "no commit");
  return sha;
}

/** Every file at a commit, path → git blob SHA. */
export async function fileTree(
  fetcher: typeof fetch,
  source: SkyblockSource,
  commit: string,
): Promise<Map<string, string>> {
  const url = `${source.apiUrl}/repos/${source.repo}/git/trees/${commit}?recursive=1`;
  const body = await fetchJson(fetcher, url, { accept: GITHUB_JSON });
  if (!isRecord(body) || !Array.isArray(body.tree))
    throw new SourceError(url, "no file tree");
  if (body.truncated === true)
    throw new SourceError(url, "file tree cut short");
  const files = new Map<string, string>();
  for (const entry of body.tree) {
    if (
      isRecord(entry) &&
      entry.type === "blob" &&
      typeof entry.path === "string" &&
      typeof entry.sha === "string"
    )
      files.set(entry.path, entry.sha);
  }
  return files;
}

/** A file's address at a commit (raw.githubusercontent.com). */
export function rawFileUrl(
  source: SkyblockSource,
  commit: string,
  path: string,
): string {
  return `${source.rawUrl}/${source.repo}/${commit}/${path}`;
}

/** Git's blob SHA of some bytes ("blob <length>\0" + bytes, SHA-1), as the tree has it. */
export function gitBlobSha(bytes: Uint8Array): string {
  return createHash("sha1")
    .update(`blob ${String(bytes.byteLength)}\0`)
    .update(bytes)
    .digest("hex");
}
