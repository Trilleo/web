/**
 * otoge-db (otoge-db.net, github.com/zvuc/otoge-db): a community dataset on top of
 * SEGA's list, with chart constants, note counts, notes designers, the version a song
 * came in, the date, and links to each chart's page on sdvx.in's older site.
 * music-ex.json is the game now; music-ex-deleted.json the removed songs (with the day
 * they went);
 * music-ex-<version>-final.json the constants as they stood when a version ended.
 */
import {
  parseConstant,
  isLevel,
  worldsEndStars,
  type Difficulty,
} from "../difficulties";
import { SourceError, compactDay, field, isRecord } from "./common";
import { legacySdvxPathInfo } from "./sdvx";

export interface OtogeChart {
  difficulty: Difficulty;
  /** "14+"; for World's End, its kanji. */
  level: string;
  /** Tenths (147 = 14.7), when known. */
  constant: number | null;
  notes: number | null;
  designer: string | null;
  /**
   * The chart's page on sdvx.in's older site, "11/11061mst" (see sdvx.ts's
   * `refFromLegacyPath`): otoge-db hasn't moved to the new viewer's refs.
   */
  sdvxLink: string | null;
}

export interface OtogeSong {
  id: number;
  title: string;
  reading: string;
  artist: string;
  genre: string;
  image: string;
  bpm: string | null;
  /** The version it came in, as otoge-db names it ("X-VERSE-X", "無印"). */
  version: string | null;
  addedOn: string | null;
  /** For removed songs: the day they left the game. */
  deletedOn: string | null;
  worldsEnd: { kanji: string; stars: number } | null;
  charts: OtogeChart[];
}

const KEYS: [Difficulty, string][] = [
  ["basic", "bas"],
  ["advanced", "adv"],
  ["expert", "exp"],
  ["master", "mas"],
  ["ultima", "ult"],
  ["worldsend", "we"],
];

/** Below this, music-ex.json is broken (the deleted list is allowed to be short). */
export const OTOGE_MIN_SONGS = 500;

const count = (value: string): number | null => {
  const n = Number(value);
  return value !== "" && Number.isInteger(n) && n > 0 ? n : null;
};

export function parseOtogeMusic(
  json: unknown,
  { minSongs = OTOGE_MIN_SONGS }: { minSongs?: number } = {},
): OtogeSong[] {
  if (!Array.isArray(json)) throw new SourceError("otoge-db", "not a list");
  const songs: OtogeSong[] = [];
  const seen = new Set<number>();
  for (const row of json) {
    if (!isRecord(row)) continue;
    const id = Number(field(row, "id"));
    const title = field(row, "title");
    if (!Number.isInteger(id) || id <= 0 || !title || seen.has(id)) continue;
    seen.add(id);
    const kanji = field(row, "we_kanji");
    const stars = worldsEndStars(field(row, "we_star"));
    const worldsEnd = kanji && stars ? { kanji, stars } : null;
    const charts: OtogeChart[] = [];
    for (const [difficulty, key] of KEYS) {
      const level =
        difficulty === "worldsend"
          ? (worldsEnd?.kanji ?? "")
          : field(row, `lev_${key}`);
      if (!level || (difficulty !== "worldsend" && !isLevel(level))) continue;
      const link = field(row, `lev_${key}_chart_link`);
      charts.push({
        difficulty,
        level,
        constant: parseConstant(field(row, `lev_${key}_i`)),
        notes: count(field(row, `lev_${key}_notes`)),
        designer: field(row, `lev_${key}_designer`) || null,
        sdvxLink: legacySdvxPathInfo(link) ? link : null,
      });
    }
    songs.push({
      id,
      title,
      reading: field(row, "reading"),
      artist: field(row, "artist"),
      genre: field(row, "catname"),
      image: field(row, "image"),
      bpm: field(row, "bpm") || null,
      version: field(row, "version") || null,
      addedOn: compactDay(field(row, "date_added")),
      deletedOn: compactDay(field(row, "deleted_date")),
      worldsEnd,
      charts,
    });
  }
  if (songs.length < minSongs)
    throw new SourceError(
      "otoge-db",
      `only ${String(songs.length)} songs (expected at least ${String(minSongs)})`,
    );
  return songs;
}
