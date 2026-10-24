/**
 * Browsing the catalog in the browser: search (@trilleo/chunithm's searchSongs), then
 * filters on songs (genre, version, in the game or not) and on charts (difficulty,
 * level, constant). A song is listed with the charts that fit; with no chart filter,
 * all of them.
 */
import {
  searchSongs,
  songKeys,
  type Difficulty,
  type SongIndex,
  type SongIndexEntry,
  type SongKeys,
} from "@trilleo/chunithm";

export type SongStatus = "in-game" | "removed" | "all";
export type Sort = "relevance" | "title" | "newest" | "constant";

export interface Filters {
  query: string;
  difficulty: Difficulty | "any";
  /** Levels as numbers, "14+" being 14.5. */
  levelMin: number | null;
  levelMax: number | null;
  /** Constants in tenths. */
  constantMin: number | null;
  constantMax: number | null;
  genre: string;
  version: string;
  status: SongStatus;
  sort: Sort;
}

export const NO_FILTERS: Filters = {
  query: "",
  difficulty: "any",
  levelMin: null,
  levelMax: null,
  constantMin: null,
  constantMax: null,
  genre: "",
  version: "",
  status: "in-game",
  sort: "relevance",
};

/** "14+" → 14.5, "13" → 13; World's End kanji → null. */
export function levelValue(level: string): number | null {
  const match = /^(\d{1,2})(\+?)$/.exec(level);
  if (!match) return null;
  return Number(match[1]) + (match[2] ? 0.5 : 0);
}

export interface Listed {
  song: SongIndexEntry;
  charts: SongIndexEntry["charts"];
}

export interface Searchable {
  song: SongIndexEntry;
  keys: SongKeys;
}

export function searchable(index: SongIndex): Searchable[] {
  return index.songs.map((song) => ({ song, keys: songKeys(song) }));
}

/** Genres in the catalog, most songs first. */
export function genres(index: SongIndex): string[] {
  const counts = new Map<string, number>();
  for (const song of index.songs)
    if (song.genre) counts.set(song.genre, (counts.get(song.genre) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
}

function chartFilterOn(filters: Filters): boolean {
  return (
    filters.difficulty !== "any" ||
    filters.levelMin !== null ||
    filters.levelMax !== null ||
    filters.constantMin !== null ||
    filters.constantMax !== null
  );
}

export function browse(
  songs: readonly Searchable[],
  filters: Filters,
): Listed[] {
  const query = filters.query.trim();
  const found = query ? searchSongs(songs, query) : songs.map((s) => s.song);
  const charted = chartFilterOn(filters);
  const listed: Listed[] = [];
  for (const song of found) {
    if (filters.status === "in-game" && !song.inGame) continue;
    if (filters.status === "removed" && song.inGame) continue;
    if (filters.genre && song.genre !== filters.genre) continue;
    if (filters.version && song.version !== filters.version) continue;
    const charts = song.charts.filter((chart) => {
      if (
        filters.difficulty !== "any" &&
        chart.difficulty !== filters.difficulty
      )
        return false;
      const level = levelValue(chart.level);
      if (
        filters.levelMin !== null &&
        (level === null || level < filters.levelMin)
      )
        return false;
      if (
        filters.levelMax !== null &&
        (level === null || level > filters.levelMax)
      )
        return false;
      if (
        filters.constantMin !== null &&
        (chart.constant === null || chart.constant < filters.constantMin)
      )
        return false;
      if (
        filters.constantMax !== null &&
        (chart.constant === null || chart.constant > filters.constantMax)
      )
        return false;
      return true;
    });
    if (charted && charts.length === 0) continue;
    listed.push({ song, charts: charted ? charts : song.charts });
  }
  const sort = filters.sort === "relevance" && !query ? "title" : filters.sort;
  const top = (item: Listed) =>
    Math.max(-1, ...item.charts.map((chart) => chart.constant ?? -1));
  if (sort === "title")
    listed.sort((a, b) => a.song.title.localeCompare(b.song.title, "ja"));
  else if (sort === "newest")
    listed.sort(
      (a, b) =>
        (b.song.addedOn ?? "").localeCompare(a.song.addedOn ?? "") ||
        b.song.id - a.song.id,
    );
  else if (sort === "constant") listed.sort((a, b) => top(b) - top(a));
  return listed;
}

/** Songs that came in the current version, newest first. */
export function newest(index: SongIndex, limit = 12): SongIndexEntry[] {
  const current = index.versions.at(-1)?.slug;
  if (!current) return [];
  return index.songs
    .filter((song) => song.version === current && song.inGame)
    .sort(
      (a, b) => (b.addedOn ?? "").localeCompare(a.addedOn ?? "") || b.id - a.id,
    )
    .slice(0, limit);
}
