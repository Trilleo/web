/**
 * SEGA's own song list (chunithm.sega.jp/storage/json/music.json): every song in the
 * Japanese game right now, by SEGA's ID. It's the authority on what's in the game and
 * on official IDs; it has no constants or chart details.
 */
import { worldsEndStars, isLevel } from "../difficulties";
import { SourceError, field, isRecord } from "./common";

export interface SegaSong {
  id: number;
  title: string;
  /** Katakana, without dakuten or small kana ("コンクエストチヤレンシ"): SEGA's sort key. */
  reading: string;
  artist: string;
  /** SEGA's category name ("ORIGINAL", "東方Project"). */
  genre: string;
  /** The jacket's file name on SEGA's site. */
  image: string;
  levels: {
    basic: string | null;
    advanced: string | null;
    expert: string | null;
    master: string | null;
    ultima: string | null;
  };
  /** A World's End song's kanji and stars; null for other songs. */
  worldsEnd: { kanji: string; stars: number } | null;
}

/** Fewer songs than this means a broken download, not a smaller game. */
export const SEGA_MIN_SONGS = 500;

const level = (value: string): string | null => (isLevel(value) ? value : null);

export function parseSegaMusic(
  json: unknown,
  { minSongs = SEGA_MIN_SONGS }: { minSongs?: number } = {},
): SegaSong[] {
  if (!Array.isArray(json)) throw new SourceError("sega", "not a list");
  const songs: SegaSong[] = [];
  const seen = new Set<number>();
  for (const row of json) {
    if (!isRecord(row)) continue;
    const id = Number(field(row, "id"));
    const title = field(row, "title");
    if (!Number.isInteger(id) || id <= 0 || !title || seen.has(id)) continue;
    seen.add(id);
    const kanji = field(row, "we_kanji");
    const stars = worldsEndStars(field(row, "we_star"));
    songs.push({
      id,
      title,
      reading: field(row, "reading"),
      artist: field(row, "artist"),
      genre: field(row, "catname"),
      image: field(row, "image"),
      levels: {
        basic: level(field(row, "lev_bas")),
        advanced: level(field(row, "lev_adv")),
        expert: level(field(row, "lev_exp")),
        master: level(field(row, "lev_mas")),
        ultima: level(field(row, "lev_ult")),
      },
      worldsEnd: kanji && stars ? { kanji, stars } : null,
    });
  }
  if (songs.length < minSongs)
    throw new SourceError(
      "sega",
      `only ${String(songs.length)} songs (expected at least ${String(minSongs)})`,
    );
  return songs;
}
