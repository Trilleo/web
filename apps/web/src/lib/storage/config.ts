/**
 * Which storage the server uses, from its environment:
 *   OBS_BUCKET (+ OBS_REGION, OBS_ACCESS_KEY_ID, OBS_SECRET_ACCESS_KEY, FILES_URL)
 *                       → Huawei OBS (production; see deploy/storage.md)
 *   STORAGE_URL         → the local driver: `memory://`, or a folder
 *   neither, in dev     → the local driver in apps/web/.data/storage
 *   neither, otherwise  → no storage: uploads say it isn't set up (the site still runs)
 */
import {
  LocalDriver,
  ObsDriver,
  type StorageDriver,
} from "@trilleo/storage/server";

/** `pnpm dev` keeps uploads here (gitignored); delete the folder to reset. */
export const DEV_STORAGE_DIR = "./.data/storage";
/** Where the local driver's URLs are served (src/pages/api/storage/local/[...path].ts). */
export const LOCAL_STORAGE_BASE = "/api/storage/local";
export const DEFAULT_FILES_URL = "https://files.trilleo.net";

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

export type StorageConfig =
  | {
      kind: "obs";
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      filesUrl: string;
    }
  | { kind: "local"; root: string | null }
  | { kind: "none"; problem?: string };

export function resolveStorageConfig(
  env: Record<string, string | undefined>,
  isDev: boolean,
): StorageConfig {
  const bucket = env.OBS_BUCKET?.trim();
  if (bucket) {
    const region = env.OBS_REGION?.trim();
    const accessKeyId = env.OBS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = env.OBS_SECRET_ACCESS_KEY?.trim();
    if (!region || !accessKeyId || !secretAccessKey) {
      return {
        kind: "none",
        problem:
          "OBS_BUCKET is set, but OBS_REGION, OBS_ACCESS_KEY_ID or OBS_SECRET_ACCESS_KEY is missing.",
      };
    }
    return {
      kind: "obs",
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      filesUrl: nonEmpty(env.FILES_URL) ?? DEFAULT_FILES_URL,
    };
  }
  const url = env.STORAGE_URL?.trim();
  if (url) return { kind: "local", root: url === "memory://" ? null : url };
  if (isDev) return { kind: "local", root: DEV_STORAGE_DIR };
  return { kind: "none" };
}

export function createDriver(config: StorageConfig): StorageDriver | null {
  switch (config.kind) {
    case "obs":
      return new ObsDriver({
        bucket: config.bucket,
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        publicUrl: config.filesUrl,
      });
    case "local":
      return new LocalDriver({
        root: config.root,
        baseUrl: LOCAL_STORAGE_BASE,
      });
    case "none":
      return null;
  }
}

let driver: StorageDriver | null | undefined;
let warned = false;

/** The server's storage, or null when none is set up. */
export function getStorage(): StorageDriver | null {
  if (driver === undefined) {
    const config = resolveStorageConfig(process.env, import.meta.env.DEV);
    if (config.kind === "none" && config.problem && !warned) {
      warned = true;
      console.warn(`File storage is off: ${config.problem}`);
    }
    driver = createDriver(config);
  }
  return driver;
}

/** For tests: use this driver (or go back to the environment's with undefined). */
export function setStorageForTests(next: StorageDriver | null | undefined) {
  driver = next;
}
