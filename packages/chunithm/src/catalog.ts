/**
 * Putting the sources together into one catalog, by SEGA's IDs:
 *
 * - Songs: SEGA's list is what's in the game (titles, levels, jackets). Songs only
 *   otoge-db knows (removed ones, mostly) are kept too, marked as not in the game, so
 *   their charts can still be viewed.
 * - Chart details: constants, note counts, designers and the version a song came in
 *   from otoge-db; sdvx.in fills designers it lacks and adds CHAIN counts.
 * - Links to sdvx.in pages, strongest first: the admin's own (which can also say "this
 *   page is nothing of ours"), otoge-db's chart links, then the same title (and artist,
 *   when titles repeat; for World's End also the kanji and stars). Each page goes to
 *   one chart and each chart has one page. What can't be placed is `unmatched`, for
 *   the admin.
 *
 * Pure: the site fetches the sources and writes the result (apps/web/src/lib/chunithm/).
 */
import { DIFFICULTIES, type Difficulty } from "./difficulties";
import type { OtogeSong } from "./sources/otoge";
import type { SdvxEntryDetails, SdvxListEntry } from "./sources/sdvx";
import { sdvxPathInfo } from "./sources/sdvx";
import type { SegaSong } from "./sources/sega";
import { matchKey } from "./text";
import { knownVersionIndex, versionName, versionSlug } from "./versions";

export type LinkSource = "admin" | "otoge-db" | "title";

export interface CatalogSong {
  id: number;
  title: string;
  reading: string;
  artist: string;
  genre: string;
  image: string;
  bpm: string | null;
  /** The version it came in (a slug). */
  version: string | null;
  addedOn: string | null;
  /** In SEGA's list right now. */
  inGame: boolean;
  removedOn: string | null;
  removedIn: string | null;
}

export interface CatalogChart {
  songId: number;
  difficulty: Difficulty;
  level: string;
  worldsEndStars: number | null;
  /** Tenths, for the current version. */
  constant: number | null;
  notes: number | null;
  designer: string | null;
  chain: number | null;
  sdvxPath: string | null;
  linkedBy: LinkSource | null;
}

export interface CatalogVersion {
  slug: string;
  name: string;
  startedOn: string | null;
  /** 0 for the first; the highest is the game now. */
  order: number;
}

export interface UnmatchedChart {
  path: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  level: string | null;
  /**
   * no-song: nothing with that title; ambiguous: several songs fit; taken: the chart
   * it fits already has another page; no-chart: the song has no such difficulty.
   */
  reason: "no-song" | "ambiguous" | "taken" | "no-chart";
  candidates: number[];
}

export interface SdvxOverride {
  path: string;
  /** null: the page isn't any chart of ours (ignored). */
  songId: number | null;
  difficulty: Difficulty | null;
}

export interface SdvxEntry {
  entry: SdvxListEntry;
  /** Null until its script has been read. */
  details: SdvxEntryDetails | null;
}

export interface CatalogInput {
  sega: SegaSong[];
  otoge: OtogeSong[];
  otogeDeleted: OtogeSong[];
  sdvx: SdvxEntry[];
  overrides: SdvxOverride[];
}

export interface Catalog {
  songs: CatalogSong[];
  charts: CatalogChart[];
  versions: CatalogVersion[];
  /** The game now: the last version. */
  currentVersion: string | null;
  unmatched: UnmatchedChart[];
}

const chartKey = (songId: number, difficulty: Difficulty) =>
  `${String(songId)}:${difficulty}`;

/** Songs on one day that mark a version's launch (rather than an early event song). */
const LAUNCH_SONGS = 3;

const LINK_RANK: Record<LinkSource, number> = {
  admin: 3,
  "otoge-db": 2,
  title: 1,
};

export function buildCatalog(input: CatalogInput): Catalog {
  const otogeById = new Map<number, OtogeSong>();
  for (const song of [...input.otogeDeleted, ...input.otoge])
    otogeById.set(song.id, song);
  const deletedOn = new Map(
    input.otogeDeleted.map((song) => [song.id, song.deletedOn]),
  );
  const versionNames = new Map<string, string>();
  const slugOf = (name: string | null): string | null => {
    if (!name) return null;
    const slug = versionSlug(name);
    if (!slug) return null;
    if (!versionNames.has(slug)) versionNames.set(slug, name);
    return slug;
  };

  // Songs and their charts.
  const songs = new Map<number, CatalogSong>();
  const charts = new Map<string, CatalogChart>();
  const addChart = (chart: Omit<CatalogChart, "linkedBy" | "chain">) => {
    charts.set(chartKey(chart.songId, chart.difficulty), {
      ...chart,
      chain: null,
      linkedBy: chart.sdvxPath ? "otoge-db" : null,
    });
  };
  for (const sega of input.sega) {
    const otoge = otogeById.get(sega.id);
    songs.set(sega.id, {
      id: sega.id,
      title: sega.title,
      reading: sega.reading,
      artist: sega.artist,
      genre: sega.genre,
      image: sega.image,
      bpm: otoge?.bpm ?? null,
      version: slugOf(otoge?.version ?? null),
      addedOn: otoge?.addedOn ?? null,
      inGame: true,
      removedOn: null,
      removedIn: null,
    });
    const details = new Map(
      (otoge?.charts ?? []).map((chart) => [chart.difficulty, chart]),
    );
    for (const difficulty of DIFFICULTIES) {
      const level =
        difficulty === "worldsend"
          ? (sega.worldsEnd?.kanji ?? null)
          : sega.levels[difficulty];
      if (!level) continue;
      const extra = details.get(difficulty);
      addChart({
        songId: sega.id,
        difficulty,
        level,
        worldsEndStars:
          difficulty === "worldsend" ? (sega.worldsEnd?.stars ?? null) : null,
        constant: extra?.constant ?? null,
        notes: extra?.notes ?? null,
        designer: extra?.designer ?? null,
        sdvxPath: extra?.sdvxPath ?? null,
      });
    }
  }
  for (const otoge of otogeById.values()) {
    if (songs.has(otoge.id)) continue;
    songs.set(otoge.id, {
      id: otoge.id,
      title: otoge.title,
      reading: otoge.reading,
      artist: otoge.artist,
      genre: otoge.genre,
      image: otoge.image,
      bpm: otoge.bpm,
      version: slugOf(otoge.version),
      addedOn: otoge.addedOn,
      inGame: false,
      removedOn: deletedOn.get(otoge.id) ?? otoge.deletedOn,
      removedIn: null,
    });
    for (const chart of otoge.charts)
      addChart({
        songId: otoge.id,
        difficulty: chart.difficulty,
        level: chart.level,
        worldsEndStars:
          chart.difficulty === "worldsend"
            ? (otoge.worldsEnd?.stars ?? null)
            : null,
        constant: chart.constant,
        notes: chart.notes,
        designer: chart.designer,
        sdvxPath: chart.sdvxPath,
      });
  }

  // sdvx.in pages: who links where.
  const sdvxCharts = new Map<
    string,
    { entry: SdvxListEntry; details: SdvxEntryDetails; index: number }
  >();
  for (const { entry, details } of input.sdvx) {
    if (!details) continue;
    details.charts.forEach((chart, index) => {
      sdvxCharts.set(chart.path, { entry, details, index });
    });
  }
  const byPath = new Map<string, string>();
  const unlink = (key: string) => {
    const chart = charts.get(key);
    if (!chart?.sdvxPath) return;
    byPath.delete(chart.sdvxPath);
    chart.sdvxPath = null;
    chart.linkedBy = null;
  };
  /** Links a page to a chart if it outranks what either already has. */
  const link = (path: string, key: string, source: LinkSource): boolean => {
    const chart = charts.get(key);
    if (!chart) return false;
    const holder = byPath.get(path);
    const holderSource = holder ? charts.get(holder)?.linkedBy : null;
    if (holder && holder !== key && holderSource) {
      if (LINK_RANK[holderSource] >= LINK_RANK[source]) return false;
      unlink(holder);
    }
    if (chart.sdvxPath && chart.sdvxPath !== path) {
      if (chart.linkedBy && LINK_RANK[chart.linkedBy] >= LINK_RANK[source])
        return false;
      unlink(key);
    }
    chart.sdvxPath = path;
    chart.linkedBy = source;
    byPath.set(path, key);
    return true;
  };
  // otoge-db's links, as given (checked: the page's difficulty must be the chart's).
  for (const [key, chart] of charts) {
    const path = chart.sdvxPath;
    chart.sdvxPath = null;
    chart.linkedBy = null;
    if (path && sdvxPathInfo(path)?.difficulty === chart.difficulty)
      link(path, key, "otoge-db");
  }
  const ignored = new Set<string>();
  for (const override of input.overrides) {
    if (override.songId === null || override.difficulty === null) {
      ignored.add(override.path);
      const holder = byPath.get(override.path);
      if (holder) unlink(holder);
      continue;
    }
    link(
      override.path,
      chartKey(override.songId, override.difficulty),
      "admin",
    );
  }

  // The rest by title.
  const byTitle = new Map<string, CatalogSong[]>();
  for (const song of songs.values()) {
    const key = matchKey(song.title);
    byTitle.set(key, [...(byTitle.get(key) ?? []), song]);
  }
  const unmatched: UnmatchedChart[] = [];
  for (const [path, { details, index }] of sdvxCharts) {
    if (byPath.has(path) || ignored.has(path)) continue;
    const chart = details.charts[index];
    if (!chart) continue;
    const isWorldsEnd = chart.difficulty === "worldsend";
    let candidates = (byTitle.get(matchKey(details.title)) ?? []).filter(
      (song) => charts.has(chartKey(song.id, "worldsend")) === isWorldsEnd,
    );
    if (isWorldsEnd && candidates.length > 1) {
      const fitting = candidates.filter((song) => {
        const we = charts.get(chartKey(song.id, "worldsend"));
        return (
          (!chart.level || we?.level === chart.level) &&
          (!chart.worldsEndStars || we?.worldsEndStars === chart.worldsEndStars)
        );
      });
      if (fitting.length > 0) candidates = fitting;
    }
    if (candidates.length > 1) {
      const artist = matchKey(details.artist);
      const sameArtist = candidates.filter(
        (song) => matchKey(song.artist) === artist,
      );
      if (sameArtist.length > 0) candidates = sameArtist;
    }
    const miss = (reason: UnmatchedChart["reason"]) => {
      unmatched.push({
        path,
        title: details.title,
        artist: details.artist,
        difficulty: chart.difficulty,
        level: chart.level,
        reason,
        candidates: candidates.map((song) => song.id),
      });
    };
    const [song] = candidates;
    if (!song) miss("no-song");
    else if (candidates.length > 1) miss("ambiguous");
    else if (!charts.has(chartKey(song.id, chart.difficulty))) miss("no-chart");
    else if (!link(path, chartKey(song.id, chart.difficulty), "title"))
      miss("taken");
  }

  // What linked pages add: designers otoge-db lacks, CHAIN, versions and removals.
  const removals = new Map<number, { version: string | null; on: string }>();
  for (const chart of charts.values()) {
    if (!chart.sdvxPath) continue;
    const found = sdvxCharts.get(chart.sdvxPath);
    const page = found?.details.charts[found.index];
    if (!found || !page) continue;
    chart.designer ??= page.designer;
    chart.chain = page.chain;
    const song = songs.get(chart.songId);
    if (song && !song.version && found.entry.version)
      song.version = found.entry.version;
    if (found.entry.removed) removals.set(chart.songId, found.entry.removed);
  }
  for (const [id, removal] of removals) {
    const song = songs.get(id);
    if (!song || song.inGame) continue;
    song.removedOn ??= removal.on;
    song.removedIn = removal.version;
    if (removal.version && !versionNames.has(removal.version))
      versionNames.set(removal.version, removal.version);
  }
  for (const { entry } of input.sdvx)
    if (entry.version && !versionNames.has(entry.version))
      versionNames.set(entry.version, entry.version);

  const versions = orderVersions(versionNames, [...songs.values()], input.sdvx);
  return {
    songs: [...songs.values()].sort((a, b) => a.id - b.id),
    charts: [...charts.values()].sort(
      (a, b) =>
        a.songId - b.songId ||
        DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
    ),
    versions,
    currentVersion: versions.at(-1)?.slug ?? null,
    unmatched: unmatched.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/**
 * Known versions in the game's order; others after them, by the day their first songs
 * came (or, failing that, the day sdvx.in says songs were removed when they began).
 */
function orderVersions(
  names: Map<string, string>,
  songs: CatalogSong[],
  sdvx: SdvxEntry[],
): CatalogVersion[] {
  // A version starts on the first day several of its songs came (one or two may come
  // early, as events); failing that, the day most of them came.
  const days = new Map<string, Map<string, number>>();
  for (const song of songs) {
    if (!song.version || !song.addedOn) continue;
    const counts = days.get(song.version) ?? new Map<string, number>();
    counts.set(song.addedOn, (counts.get(song.addedOn) ?? 0) + 1);
    days.set(song.version, counts);
  }
  const started = new Map<string, string>();
  for (const [slug, counts] of days) {
    const byDay = [...counts].sort(([a], [b]) => a.localeCompare(b));
    const launch =
      byDay.find(([, n]) => n >= LAUNCH_SONGS) ??
      [...byDay].sort(([, x], [, y]) => y - x)[0];
    if (launch) started.set(slug, launch[0]);
  }
  // sdvx.in's removals happen as a version starts: a date for versions without songs.
  for (const { entry } of sdvx) {
    const removal = entry.removed;
    if (!removal?.version || started.has(removal.version)) continue;
    started.set(removal.version, removal.on);
  }
  const list = [...names].map(([slug, name]) => ({
    slug,
    name: versionName(slug, name),
    startedOn: started.get(slug) ?? null,
    known: knownVersionIndex(slug),
  }));
  list.sort((a, b) => {
    if (a.known !== null && b.known !== null) return a.known - b.known;
    if (a.known !== null) return -1;
    if (b.known !== null) return 1;
    return (a.startedOn ?? "9999").localeCompare(b.startedOn ?? "9999");
  });
  return list.map(({ slug, name, startedOn }, order) => ({
    slug,
    name,
    startedOn,
    order,
  }));
}

/** A version's constants from one otoge-db file: (song, difficulty) → tenths. */
export function constantRows(
  songs: OtogeSong[],
): { songId: number; difficulty: Difficulty; constant: number }[] {
  return songs.flatMap((song) =>
    song.charts.flatMap((chart) =>
      chart.constant === null
        ? []
        : [
            {
              songId: song.id,
              difficulty: chart.difficulty,
              constant: chart.constant,
            },
          ],
    ),
  );
}
