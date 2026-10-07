/**
 * Minecraft versions a release can name. Java Edition's come from Mojang's version
 * manifest (releases only), fetched by the server and kept in memory; when Mojang
 * can't be reached, the list below stands in. Bedrock has no manifest, so its
 * version lines are kept here by hand.
 *
 * MINECRAFT_VERSION_MANIFEST overrides the manifest's URL; "off" never fetches (tests,
 * e2e).
 */

export const MOJANG_MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

/** Refetched this often. */
const FRESH_MS = 6 * 60 * 60 * 1000;
/** After a failed fetch, wait this long before trying again. */
const RETRY_MS = 10 * 60 * 1000;
/** The first fetch can hold a request up this long; later ones run in the background. */
const TIMEOUT_MS = 4000;

/**
 * Java Edition releases, newest first: the fallback when the manifest can't be read.
 * Add new releases here now and then (the manifest keeps the live list current).
 */
export const FALLBACK_JAVA_VERSIONS: readonly string[] = [
  "26.3",
  "26.2",
  "26.1",
  "1.21.11",
  "1.21.10",
  "1.21.9",
  "1.21.8",
  "1.21.7",
  "1.21.6",
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.2",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.5",
  "1.20.4",
  "1.20.3",
  "1.20.2",
  "1.20.1",
  "1.20",
  "1.19.4",
  "1.19.3",
  "1.19.2",
  "1.19.1",
  "1.19",
  "1.18.2",
  "1.18.1",
  "1.18",
  "1.17.1",
  "1.17",
  "1.16.5",
  "1.16.4",
  "1.16.3",
  "1.16.2",
  "1.16.1",
  "1.16",
  "1.15.2",
  "1.15.1",
  "1.15",
  "1.14.4",
  "1.14.3",
  "1.14.2",
  "1.14.1",
  "1.14",
  "1.13.2",
  "1.13.1",
  "1.13",
  "1.12.2",
  "1.12.1",
  "1.12",
  "1.11.2",
  "1.11.1",
  "1.11",
  "1.10.2",
  "1.10.1",
  "1.10",
  "1.9.4",
  "1.9.3",
  "1.9.2",
  "1.9.1",
  "1.9",
  "1.8.9",
  "1.8.8",
  "1.8",
  "1.7.10",
];

/** Bedrock Edition's version lines (its patch numbers change too often to list). */
export const BEDROCK_VERSIONS: readonly string[] = [
  "26.x",
  "1.21.x",
  "1.20.x",
  "1.19.x",
  "1.18.x",
  "1.17.x",
  "1.16.x",
];

/** A Java version id as releases name them: "1.21.4", "1.21", "26.1". */
const JAVA_VERSION = /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/;

/** The release ids from a version manifest, newest first; null if it isn't one. */
export function parseManifest(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const versions = (body as { versions?: unknown }).versions;
  if (!Array.isArray(versions)) return null;
  const releases: { id: string; time: number }[] = [];
  for (const entry of versions as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, type, releaseTime } = entry as Record<string, unknown>;
    if (type !== "release" || typeof id !== "string") continue;
    if (!JAVA_VERSION.test(id)) continue;
    const time = typeof releaseTime === "string" ? Date.parse(releaseTime) : 0;
    releases.push({ id, time: Number.isNaN(time) ? 0 : time });
  }
  if (releases.length === 0) return null;
  releases.sort((a, b) => b.time - a.time);
  return releases.map((release) => release.id);
}

/** The manifest's releases, plus any fallback ones it lacks, newest first. */
export function mergeVersions(
  live: readonly string[],
  fallback: readonly string[] = FALLBACK_JAVA_VERSIONS,
): string[] {
  const seen = new Set(live);
  const merged = [...live];
  for (const id of fallback) {
    if (!seen.has(id)) merged.push(id);
  }
  return merged.sort(compareVersions);
}

/** Newest first: "1.21.10" before "1.21.9", "1.21" after "1.21.1". */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(pa.length, pb.length); index++) {
    const diff = (pb[index] ?? -1) - (pa[index] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** "1.21.4" → "1.21", "26.1.2" → "26.1": the line a version belongs to. */
export function versionLine(id: string): string {
  return id.split(".").slice(0, 2).join(".");
}

/** Versions grouped by line, newest first: for the release form's checkboxes. */
export function groupByLine(
  versions: readonly string[],
): { line: string; versions: string[] }[] {
  const groups: { line: string; versions: string[] }[] = [];
  for (const id of versions) {
    const line = versionLine(id);
    const last = groups.at(-1);
    if (last?.line === line) last.versions.push(id);
    else groups.push({ line, versions: [id] });
  }
  return groups;
}

export interface VersionSource {
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: () => number;
}

interface Cache {
  versions: string[];
  /** When the manifest was last read (null: never, so the fallback). */
  fetchedAt: number | null;
  /** When the last fetch failed (null: it hasn't). */
  failedAt: number | null;
  pending: Promise<void> | null;
}

/** Keeps Java Edition's version list fresh. One per server (see `javaVersions`). */
export class JavaVersionList {
  private cache: Cache = {
    versions: [...FALLBACK_JAVA_VERSIONS],
    fetchedAt: null,
    failedAt: null,
    pending: null,
  };

  constructor(private readonly source: VersionSource = {}) {}

  private get url(): string | null {
    const env = this.source.env ?? process.env;
    const configured = env.MINECRAFT_VERSION_MANIFEST?.trim();
    if (configured === "off") return null;
    if (!configured) return MOJANG_MANIFEST_URL;
    return configured;
  }

  private now(): number {
    return this.source.now?.() ?? Date.now();
  }

  private refresh(): Promise<void> {
    const url = this.url;
    if (!url) return Promise.resolve();
    this.cache.pending ??= (async () => {
      try {
        const response = await (this.source.fetch ?? fetch)(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS * 2),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
        const live = parseManifest(await response.json());
        if (!live) throw new Error("Not a version manifest");
        this.cache.versions = mergeVersions(live);
        this.cache.fetchedAt = this.now();
      } catch (error) {
        this.cache.failedAt = this.now();
        console.warn("Couldn’t read Minecraft’s version manifest:", error);
      } finally {
        this.cache.pending = null;
      }
    })();
    return this.cache.pending;
  }

  /**
   * Releases, newest first. The first call waits briefly for the manifest; later
   * calls answer at once and refresh in the background when the list is old.
   */
  async versions(): Promise<readonly string[]> {
    const now = this.now();
    const { fetchedAt, failedAt } = this.cache;
    const stale = fetchedAt === null || now - fetchedAt > FRESH_MS;
    const mayTry = failedAt === null || now - failedAt > RETRY_MS;
    if (stale && mayTry && this.url) {
      const job = this.refresh();
      if (fetchedAt === null) {
        // Never read yet: wait a little, then go with what there is.
        await Promise.race([
          job,
          new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS)),
        ]);
      }
    }
    return this.cache.versions;
  }

  /** Where the list came from, for the admin. */
  status(): { source: "mojang" | "fallback"; fetchedAt: Date | null } {
    return this.cache.fetchedAt !== null
      ? { source: "mojang", fetchedAt: new Date(this.cache.fetchedAt) }
      : { source: "fallback", fetchedAt: null };
  }
}

let shared: JavaVersionList | null = null;

/** The server's Java version list. */
export function javaVersions(): JavaVersionList {
  shared ??= new JavaVersionList();
  return shared;
}

/** The versions a project's releases can name, by edition. */
export async function versionsFor(
  edition: "java" | "bedrock" | "both",
  list: JavaVersionList = javaVersions(),
): Promise<{ java: readonly string[]; bedrock: readonly string[] }> {
  return {
    java: edition === "bedrock" ? [] : await list.versions(),
    bedrock: edition === "java" ? [] : BEDROCK_VERSIONS,
  };
}
