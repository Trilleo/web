/**
 * Shard icons as files: SkyShards' PNGs (Hypixel's renders of each shard, 180×191)
 * shrunk to ICON_SIDE and kept as WebP. The copies committed with the site live in
 * public/tools/skyblock/shard-icons/, named by Hypixel's ID ("SHARD_GROVE" →
 * grove.webp), and static-icons.json says which PNG each was made from (git blob SHA),
 * so the sync only copies icons SkyShards has added or changed. Free of the database
 * and storage, so scripts/skyblock-snapshot.ts uses it too.
 */
import { decodePng, isPng, shrinkTo } from "../chunithm/png";
import { encodeWebp } from "../chunithm/webp";

/** The longest side of a kept icon (pages show them at up to 96 CSS pixels). */
export const ICON_SIDE = 96;

/** Where the committed icons are served from. */
export const STATIC_ICON_PATH = "/tools/skyblock/shard-icons/";

/** Committed icons, by Hypixel's ID: the file and the PNG's git blob SHA. */
export type StaticIcons = Record<string, { file: string; sha: string }>;

/** "SHARD_SEA_ARCHER" → "sea_archer.webp". */
export function iconFileName(shardId: string): string {
  return `${shardId
    .replace(/^SHARD_/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")}.webp`;
}

/** A PNG icon as a WebP at most ICON_SIDE pixels on its longer side. */
export async function iconWebp(png: Uint8Array): Promise<Uint8Array> {
  if (!isPng(png)) throw new Error("not a PNG");
  return encodeWebp(shrinkTo(await decodePng(png), ICON_SIDE));
}
