/**
 * The fusion calculator's download: the current shard data without its texts
 * (@trilleo/skyblock/calc's Deck), as JSON, made once per version of the data and its
 * icons. Its `version` (and ETag) is a hash of the content, so the browser's copy is
 * checked cheaply and replaced the moment the data or an icon changes.
 */
import { createHash } from "node:crypto";
import { deckOf } from "@trilleo/skyblock/calc";
import type { ShardData } from "./data";

export interface DeckFile {
  version: string;
  body: string;
}

/** ShardData is remade whenever the data or its icons change, so it keys the cache. */
const made = new WeakMap<ShardData, DeckFile>();

export function deckFile(data: ShardData): DeckFile {
  const cached = made.get(data);
  if (cached) return cached;
  const deck = deckOf(
    data.catalog.dataset,
    "",
    data.commit,
    (id) => data.icons.get(id) ?? null,
  );
  const version = createHash("sha256")
    .update(JSON.stringify(deck))
    .digest("base64url")
    .slice(0, 16);
  const file = { version, body: JSON.stringify({ ...deck, version }) };
  made.set(data, file);
  return file;
}
