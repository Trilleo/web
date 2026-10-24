import type { SongIndex, SongIndexEntry } from "@trilleo/chunithm";
import { describe, expect, it } from "vitest";
import {
  NO_FILTERS,
  browse,
  genres,
  levelValue,
  newest,
  searchable,
} from "./browse";

const song = (
  id: number,
  title: string,
  over: Partial<SongIndexEntry> = {},
): SongIndexEntry => ({
  id,
  title,
  artist: "Someone",
  reading: title.toUpperCase(),
  genre: "ORIGINAL",
  version: "mate",
  inGame: true,
  removedIn: null,
  jacket: null,
  bpm: null,
  addedOn: "2026-07-02",
  aliases: [],
  charts: [
    {
      difficulty: "expert",
      level: "12",
      constant: 120,
      worldsEndStars: null,
      viewable: true,
    },
    {
      difficulty: "master",
      level: "14+",
      constant: 147,
      worldsEndStars: null,
      viewable: true,
    },
  ],
  ...over,
});

const index: SongIndex = {
  versions: [
    { slug: "x-verse-x", name: "X-VERSE-X" },
    { slug: "mate", name: "Mate" },
  ],
  songs: [
    song(1, "Alpha"),
    song(2, "Bravo", {
      genre: "VARIETY",
      version: "x-verse-x",
      addedOn: "2025-12-11",
      charts: [
        {
          difficulty: "master",
          level: "13",
          constant: 131,
          worldsEndStars: null,
          viewable: true,
        },
      ],
    }),
    song(3, "Charlie", { inGame: false, removedIn: "mate" }),
    song(4, "Delta", { addedOn: "2026-10-08" }),
  ],
};
const songs = searchable(index);
const ids = (filters: Partial<typeof NO_FILTERS>) =>
  browse(songs, { ...NO_FILTERS, ...filters }).map((item) => item.song.id);

describe("browsing the catalog", () => {
  it("reads levels", () => {
    expect(levelValue("14+")).toBe(14.5);
    expect(levelValue("7")).toBe(7);
    expect(levelValue("狂")).toBeNull();
  });

  it("lists songs in the game by title, removed ones on request", () => {
    expect(ids({})).toEqual([1, 2, 4]);
    expect(ids({ status: "removed" })).toEqual([3]);
    expect(ids({ status: "all" })).toEqual([1, 2, 3, 4]);
  });

  it("filters charts by difficulty, level and constant", () => {
    expect(ids({ levelMin: 14.5 })).toEqual([1, 4]);
    expect(ids({ constantMin: 125, constantMax: 135 })).toEqual([2]);
    const [first] = browse(songs, { ...NO_FILTERS, difficulty: "expert" });
    expect(first?.charts.map((c) => c.difficulty)).toEqual(["expert"]);
  });

  it("filters songs by genre and version, and sorts", () => {
    expect(ids({ genre: "VARIETY" })).toEqual([2]);
    expect(ids({ version: "x-verse-x" })).toEqual([2]);
    expect(ids({ sort: "newest" })).toEqual([4, 1, 2]);
    expect(ids({ sort: "constant" })).toEqual([1, 4, 2]);
    expect(ids({ query: "bra" })).toEqual([2]);
  });

  it("knows the genres and what's new", () => {
    expect(genres(index)).toEqual(["ORIGINAL", "VARIETY"]);
    expect(newest(index).map((s) => s.id)).toEqual([4, 1]);
  });
});
