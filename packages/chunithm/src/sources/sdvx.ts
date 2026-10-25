/**
 * sdvx.in (CHUNITHM譜面保管所): chart pictures, made by hand for each chart, with its
 * own IDs. Its viewer (/chunithm/_/viewer.php?id=<id>&diff=<diff>) reads JSON lists
 * and draws three WebP layers; this reads the same lists and names the same files.
 *
 * - Songs: /chunithm/_/json/songs<NN>.json, one per folder ("01" up; a folder that
 *   isn't there yet redirects), and songs_del.json for songs SEGA removed. A song's
 *   ID is five digits, its folder the first two; Ultima charts are in the song's row.
 * - World's End: songs_we.json, songs_wedel.json (removed), songs_wecourse.json and
 *   songs_weuso.json, with IDs of their own (three digits), one chart each.
 * - A level written with an underscore ("_3", "_狂5") is a chart sdvx.in hasn't drawn.
 *
 * A chart's "ref" here is "<id>/<diff>": "11061/mst", "11061/ult", "008/we". Its layers
 * are /chunithm/<folder>/bg/<id>bg.webp (lanes), obj/data<id><key>.webp (notes),
 * bg/<id>bar.webp (measure numbers) and obj/mrr<id><key>.webp (mirrored notes), where
 * World's End uses folder "end" and key "end". Missing files redirect to an HTML page.
 *
 * The site's older pages (/chunithm/<dir>/<id><kind>.htm, "11/11061mst") used another
 * numbering; `legacySdvxPathInfo` and `refFromLegacyPath` read those for moving data
 * kept from them (and otoge-db's links, which still use them).
 */
import { isLevel, type Difficulty } from "../difficulties";
import { htmlText } from "../text";
import { versionSlug } from "../versions";
import { SourceError, field, isRecord } from "./common";

/** Which of sdvx.in's lists a song is in. */
export type SdvxList =
  | "songs"
  | "removed"
  | "worldsend"
  | "worldsend-removed"
  | "worldsend-course"
  | "worldsend-uso";

/** The lists' files (folders' song lists are songs<NN>.json, `sdvxFolderList`). */
export const SDVX_LIST_FILES: readonly { list: SdvxList; file: string }[] = [
  { list: "removed", file: "songs_del.json" },
  { list: "worldsend", file: "songs_we.json" },
  { list: "worldsend-removed", file: "songs_wedel.json" },
  { list: "worldsend-course", file: "songs_wecourse.json" },
  { list: "worldsend-uso", file: "songs_weuso.json" },
];

/** Where the lists live on sdvx.in. */
export const SDVX_JSON_DIR = "/chunithm/_/json/";

/** A folder's song list ("01" → "songs01.json"). */
export function sdvxFolderList(folder: number): string {
  return `songs${String(folder).padStart(2, "0")}.json`;
}

/** Folders tried at most (sdvx.in's own list page tries 01–20). */
export const SDVX_MAX_FOLDERS = 40;

/** sdvx.in's difficulty keys. */
const KEYS: [Difficulty, string][] = [
  ["basic", "bsc"],
  ["advanced", "adv"],
  ["expert", "exp"],
  ["master", "mst"],
  ["ultima", "ult"],
];
const DIFFICULTY_OF = new Map(
  KEYS.map(([difficulty, key]) => [key, difficulty]),
);
const KEY_OF = new Map(KEYS);

const REF = /^(?:(\d{5})\/(bsc|adv|exp|mst|ult)|(\d{3})\/we)$/;

export function isSdvxRef(ref: string): boolean {
  return REF.test(ref);
}

export interface SdvxRefInfo {
  id: string;
  /** "mst", or "we". */
  diff: string;
  difficulty: Difficulty;
  /** The layers' folder: the ID's first two digits, or "end". */
  folder: string;
  /** The layers' file key: the diff, or "end". */
  fileKey: string;
}

/** A ref's parts, or null for something else. */
export function sdvxRefInfo(ref: string): SdvxRefInfo | null {
  const match = REF.exec(ref);
  if (!match) return null;
  const [, songId, key, weId] = match;
  if (weId)
    return {
      id: weId,
      diff: "we",
      difficulty: "worldsend",
      folder: "end",
      fileKey: "end",
    };
  const difficulty = key ? DIFFICULTY_OF.get(key) : undefined;
  if (!songId || !key || !difficulty) return null;
  return {
    id: songId,
    diff: key,
    difficulty,
    folder: songId.slice(0, 2),
    fileKey: key,
  };
}

/** The ref of a song's chart ("11061" + master → "11061/mst"). */
export function sdvxRef(id: string, difficulty: Difficulty): string {
  return difficulty === "worldsend"
    ? `${id}/we`
    : `${id}/${KEY_OF.get(difficulty) ?? ""}`;
}

/** The key of the song a ref belongs to ("11061/mst" → "11061", "008/we" → "we/008"). */
export function sdvxSongKey(ref: string): string | null {
  const info = sdvxRefInfo(ref);
  if (!info) return null;
  return info.difficulty === "worldsend" ? `we/${info.id}` : info.id;
}

/** The chart's page in sdvx.in's viewer (a site path). */
export function sdvxViewerPath(ref: string): string | null {
  const info = sdvxRefInfo(ref);
  return info ? `/chunithm/_/viewer.php?id=${info.id}&diff=${info.diff}` : null;
}

/** A chart picture's three layers on sdvx.in (site paths), and the mirrored notes. */
export interface SdvxImages {
  bg: string;
  obj: string;
  bar: string;
  mirror: string;
}

/** Where a chart's layers are, as sdvx.in's viewer names them. */
export function sdvxImages(ref: string): SdvxImages | null {
  const info = sdvxRefInfo(ref);
  if (!info) return null;
  const dir = `/chunithm/${info.folder}`;
  return {
    bg: `${dir}/bg/${info.id}bg.webp`,
    obj: `${dir}/obj/data${info.id}${info.fileKey}.webp`,
    bar: `${dir}/bg/${info.id}bar.webp`,
    mirror: `${dir}/obj/mrr${info.id}${info.fileKey}.webp`,
  };
}

/** A song's jacket on sdvx.in (a PNG, as a site path). */
export function sdvxJacketPath(ref: string): string | null {
  const info = sdvxRefInfo(ref);
  return info ? `/chunithm/${info.folder}/jacket/${info.id}.png` : null;
}

/**
 * Every place sdvx.in may keep a song's jacket, from its charts' refs: its own song's
 * first, then World's End ones.
 */
export function sdvxJacketSources(refs: string[]): string[] {
  const order = (ref: string) =>
    sdvxRefInfo(ref)?.difficulty === "worldsend" ? 1 : 0;
  return [
    ...new Set(
      [...refs]
        .sort((a, b) => order(a) - order(b))
        .flatMap((ref) => {
          const path = sdvxJacketPath(ref);
          return path ? [path] : [];
        }),
    ),
  ];
}

/** A chart's notes by kind, as sdvx.in counts them. */
export interface SdvxNoteTypes {
  tap: number | null;
  hold: number | null;
  slide: number | null;
  air: number | null;
  flick: number | null;
}

export interface SdvxChart {
  difficulty: Difficulty;
  ref: string;
  /** "14+", or a World's End chart's kanji. */
  level: string | null;
  worldsEndStars: number | null;
  designer: string | null;
  noteTypes: SdvxNoteTypes | null;
}

export interface SdvxSong {
  /** "11061", or "we/008" for a World's End entry: the key for a row. */
  key: string;
  id: string;
  list: SdvxList;
  title: string;
  artist: string;
  genre: string;
  bpm: string | null;
  /** Only charts sdvx.in has drawn. */
  charts: SdvxChart[];
  /** On a removed list: the version and day it left the game. */
  removed: { version: string | null; on: string | null } | null;
}

const isWorldsEndList = (list: SdvxList) => list.startsWith("worldsend");

const count = (value: string): number | null => {
  const n = Number(value);
  return value !== "" && Number.isInteger(n) && n >= 0 ? n : null;
};

function noteTypes(value: unknown): SdvxNoteTypes | null {
  if (!isRecord(value)) return null;
  const types: SdvxNoteTypes = {
    tap: count(field(value, "tap")),
    hold: count(field(value, "hold")),
    slide: count(field(value, "slide")),
    air: count(field(value, "air")),
    flick: count(field(value, "flick")),
  };
  return Object.values(types).some((n) => n !== null) ? types : null;
}

/** "_" (none) and "" are blank; sdvx.in writes a missing artist as "_". */
function text(row: Record<string, unknown>, key: string): string {
  const value = htmlText(field(row, key));
  return value === "_" ? "" : value;
}

/** "Mate 2026/07/02" → the version and day. */
function removal(value: string): SdvxSong["removed"] {
  const text = value.trim();
  if (!text) return { version: null, on: null };
  const date = /(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  const name = date ? text.slice(0, date.index).trim() : text;
  return {
    version: name ? versionSlug(name) || null : null,
    on: date
      ? `${date[1] ?? ""}-${(date[2] ?? "").padStart(2, "0")}-${(date[3] ?? "").padStart(2, "0")}`
      : null,
  };
}

/**
 * One of sdvx.in's lists, read. Rows without a title (sdvx.in keeps a blank one per
 * folder) are left out. Throws SourceError when it isn't a list at all.
 */
export function parseSdvxSongs(json: unknown, list: SdvxList): SdvxSong[] {
  if (!Array.isArray(json)) throw new SourceError("sdvx.in", "not a list");
  const worldsEnd = isWorldsEndList(list);
  const songs: SdvxSong[] = [];
  const seen = new Set<string>();
  for (const row of json) {
    if (!isRecord(row)) continue;
    const id = field(row, "id");
    const title = text(row, "title");
    if (!title || !(worldsEnd ? /^\d{3}$/ : /^\d{5}$/).test(id)) continue;
    const key = worldsEnd ? `we/${id}` : id;
    if (seen.has(key)) continue;
    seen.add(key);
    const charts: SdvxChart[] = [];
    const levels = row.levels;
    if (worldsEnd) {
      // "狂5": drawn; "_狂5": not yet.
      const level = typeof levels === "string" ? levels.trim() : "";
      const match = /^(\D+?)([1-5])$/u.exec(level);
      if (match?.[1] && !level.includes("_"))
        charts.push({
          difficulty: "worldsend",
          ref: sdvxRef(id, "worldsend"),
          level: match[1],
          worldsEndStars: Number(match[2]),
          designer: text(row, "designer") || null,
          noteTypes: noteTypes(row.notes),
        });
    } else if (isRecord(levels)) {
      const designers = isRecord(row.designer) ? row.designer : {};
      for (const [difficulty, key] of KEYS) {
        const level = field(levels, key);
        if (!isLevel(level)) continue;
        charts.push({
          difficulty,
          ref: sdvxRef(id, difficulty),
          level,
          worldsEndStars: null,
          designer: htmlText(field(designers, key)) || null,
          noteTypes: noteTypes(row[key]),
        });
      }
    }
    const removedText =
      list === "removed"
        ? field(row, "removed")
        : list === "worldsend-removed"
          ? field(row, "del")
          : null;
    songs.push({
      key,
      id,
      list,
      title,
      artist: text(row, "artist"),
      genre: text(row, "genre"),
      bpm: text(row, "bpm") || null,
      charts,
      removed: removedText === null ? null : removal(removedText),
    });
  }
  return songs;
}

// The older pages, for moving what was kept from them.

const LEGACY_PATH = /^(\d{2}|ult|end)\/(\d{5})(bsc|adv|exp|mst|ult|end\d*)$/;

/** An older chart page's ("11/11061mst") difficulty and entry ID, or null. */
export function legacySdvxPathInfo(
  path: string,
): { dir: string; entryId: string; difficulty: Difficulty } | null {
  const match = LEGACY_PATH.exec(path);
  if (!match) return null;
  const [, dir = "", entryId = "", kind = ""] = match;
  const difficulty = kind.startsWith("end")
    ? "worldsend"
    : DIFFICULTY_OF.get(kind);
  return difficulty ? { dir, entryId, difficulty } : null;
}

/**
 * The ref an older page's number would have now ("11/11061mst" → "11061/mst"). Only a
 * guess: the numbering moved for some songs, so callers check the title. World's End
 * numbers have nothing to do with the new ones: null.
 */
export function refFromLegacyPath(path: string): string | null {
  const info = legacySdvxPathInfo(path);
  if (!info || info.difficulty === "worldsend") return null;
  return sdvxRef(info.entryId, info.difficulty);
}
