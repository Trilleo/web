import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCatalog,
  constantRows,
  formatConstant,
  htmlText,
  isLevel,
  matchKey,
  otogeFinalFile,
  parseConstant,
  parseOtogeMusic,
  parseSdvxSongs,
  parseSegaMusic,
  legacySdvxPathInfo,
  refFromLegacyPath,
  sdvxFolderList,
  sdvxImages,
  sdvxJacketPath,
  sdvxJacketSources,
  sdvxRef,
  sdvxRefInfo,
  sdvxSongKey,
  sdvxViewerPath,
  SourceError,
  versionSlug,
  worldsEndStars,
  type CatalogInput,
  type SdvxChart,
  type SdvxSong,
} from "./index";

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
  );

describe("difficulties and constants", () => {
  it("reads constants as tenths", () => {
    expect(parseConstant("14.7")).toBe(147);
    expect(parseConstant("13")).toBe(130);
    expect(parseConstant(" 1.0 ")).toBe(10);
    expect(parseConstant("")).toBeNull();
    expect(parseConstant("14.75")).toBeNull();
    expect(parseConstant("16.0")).toBeNull();
    expect(formatConstant(147)).toBe("14.7");
    expect(formatConstant(130)).toBe("13.0");
  });

  it("knows levels", () => {
    expect(isLevel("14+")).toBe(true);
    expect(isLevel("1")).toBe(true);
    expect(isLevel("15")).toBe(true);
    expect(isLevel("16")).toBe(false);
    expect(isLevel("")).toBe(false);
  });

  it("turns SEGA's World's End numbers into stars", () => {
    expect(worldsEndStars("1")).toBe(1);
    expect(worldsEndStars("5")).toBe(3);
    expect(worldsEndStars("9")).toBe(5);
    expect(worldsEndStars("4")).toBeNull();
    expect(worldsEndStars("")).toBeNull();
  });
});

describe("versions", () => {
  it("gives every source's names one slug", () => {
    expect(versionSlug("AIR+")).toBe("air-plus");
    expect(versionSlug("LUMINOUS PLUS")).toBe("luminous-plus");
    expect(versionSlug("X-VERSE-X")).toBe("x-verse-x");
    expect(versionSlug("Mate")).toBe("mate");
    expect(versionSlug("無印")).toBe("chunithm");
    expect(versionSlug("PARADISE×")).toBe("paradise-lost");
    // One we don't know yet still gets a slug.
    expect(versionSlug("MOON PLUS")).toBe("moon-plus");
  });

  it("names otoge-db's final files", () => {
    expect(otogeFinalFile("x-verse-x")).toBe("music-ex-xversex-final.json");
    expect(otogeFinalFile("luminous-plus")).toBe(
      "music-ex-luminousplus-final.json",
    );
  });
});

describe("text", () => {
  it("matches titles across ways of writing them", () => {
    expect(matchKey("愛スクリ～ム！")).toBe(matchKey("愛スクリ~ム!"));
    expect(matchKey("ＡＢＣ\u3000Ｄｅｆ")).toBe("abcdef");
    expect(matchKey("Parad'ox")).toBe("paradox");
  });

  it("reads text out of HTML", () => {
    expect(htmlText("<div class=f1>A &amp; B&#x21;</div>")).toBe("A & B!");
  });
});

const segaRow = (over: Record<string, string> = {}) => ({
  id: "3062",
  catname: "ORIGINAL",
  title: "コンクエスト・チャレンジ",
  reading: "コンクエストチヤレンシ",
  artist: "サツキ feat.ろん",
  lev_bas: "4",
  lev_adv: "8+",
  lev_exp: "11",
  lev_mas: "14+",
  lev_ult: "",
  we_kanji: "",
  we_star: "",
  image: "1ae2db00c32c728b.jpg",
  ...over,
});

const otogeRow = (over: Record<string, string> = {}) => ({
  ...segaRow(),
  bpm: "210",
  lev_exp_i: "11.3",
  lev_exp_notes: "1741",
  lev_exp_designer: "",
  lev_exp_chart_link: "11/11061exp",
  lev_mas_i: "14.7",
  lev_mas_notes: "2630",
  lev_mas_designer: "ミニミライト",
  lev_mas_chart_link: "11/11061mst",
  version: "Mate",
  date_added: "20261008",
  ...over,
});

describe("SEGA's list", () => {
  it("reads songs and World's End songs", () => {
    const songs = parseSegaMusic(
      [
        segaRow(),
        segaRow({
          id: "8317",
          title: "Teriqma",
          lev_bas: "",
          lev_adv: "",
          lev_exp: "",
          lev_mas: "",
          we_kanji: "割",
          we_star: "5",
        }),
        { id: "x", title: "broken" },
        segaRow(), // a repeat
      ],
      { minSongs: 1 },
    );
    expect(songs).toHaveLength(2);
    expect(songs[0]).toMatchObject({
      id: 3062,
      genre: "ORIGINAL",
      levels: { basic: "4", master: "14+", ultima: null },
      worldsEnd: null,
    });
    expect(songs[1]?.worldsEnd).toEqual({ kanji: "割", stars: 3 });
  });

  it("refuses a list that's too short or not a list", () => {
    expect(() => parseSegaMusic([segaRow()])).toThrow(SourceError);
    expect(() => parseSegaMusic({})).toThrow(SourceError);
  });
});

describe("otoge-db", () => {
  it("reads constants, notes, designers and sdvx.in links", () => {
    const [song] = parseOtogeMusic(
      [otogeRow({ deleted_date: "20240620", lev_bas_chart_link: "junk" })],
      { minSongs: 1 },
    );
    expect(song).toMatchObject({
      id: 3062,
      bpm: "210",
      version: "Mate",
      addedOn: "2026-10-08",
      deletedOn: "2024-06-20",
    });
    expect(song?.charts.map((chart) => chart.difficulty)).toEqual([
      "basic",
      "advanced",
      "expert",
      "master",
    ]);
    expect(song?.charts[0]?.sdvxLink).toBeNull();
    expect(song?.charts[3]).toEqual({
      difficulty: "master",
      level: "14+",
      constant: 147,
      notes: 2630,
      designer: "ミニミライト",
      sdvxLink: "11/11061mst",
    });
    expect(constantRows(song ? [song] : [])).toEqual([
      { songId: 3062, difficulty: "expert", constant: 113 },
      { songId: 3062, difficulty: "master", constant: 147 },
    ]);
  });

  it("reads a World's End chart", () => {
    const [song] = parseOtogeMusic(
      [
        otogeRow({
          id: "8317",
          lev_bas: "",
          lev_adv: "",
          lev_exp: "",
          lev_mas: "",
          we_kanji: "割",
          we_star: "5",
          lev_we_chart_link: "end/01066end2",
          lev_we_designer: "階段割qma",
        }),
      ],
      { minSongs: 1 },
    );
    expect(song?.charts).toEqual([
      {
        difficulty: "worldsend",
        level: "割",
        constant: null,
        notes: null,
        designer: "階段割qma",
        sdvxLink: "end/01066end2",
      },
    ]);
  });
});

describe("sdvx.in", () => {
  it("knows its charts' refs", () => {
    expect(sdvxRefInfo("11061/mst")).toEqual({
      id: "11061",
      diff: "mst",
      difficulty: "master",
      folder: "11",
      fileKey: "mst",
    });
    expect(sdvxRefInfo("008/we")).toEqual({
      id: "008",
      diff: "we",
      difficulty: "worldsend",
      folder: "end",
      fileKey: "end",
    });
    expect(sdvxRefInfo("11/11061mst")).toBeNull();
    expect(sdvxRefInfo("../etc/passwd")).toBeNull();
    expect(sdvxRef("01183", "ultima")).toBe("01183/ult");
    expect(sdvxRef("008", "worldsend")).toBe("008/we");
    expect(sdvxSongKey("11061/mst")).toBe("11061");
    expect(sdvxSongKey("008/we")).toBe("we/008");
    expect(sdvxFolderList(3)).toBe("songs03.json");
  });

  it("names a chart's layers, jacket and viewer page as its viewer does", () => {
    expect(sdvxImages("11061/mst")).toEqual({
      bg: "/chunithm/11/bg/11061bg.webp",
      obj: "/chunithm/11/obj/data11061mst.webp",
      bar: "/chunithm/11/bg/11061bar.webp",
      mirror: "/chunithm/11/obj/mrr11061mst.webp",
    });
    expect(sdvxImages("008/we")).toEqual({
      bg: "/chunithm/end/bg/008bg.webp",
      obj: "/chunithm/end/obj/data008end.webp",
      bar: "/chunithm/end/bg/008bar.webp",
      mirror: "/chunithm/end/obj/mrr008end.webp",
    });
    expect(sdvxImages("x")).toBeNull();
    expect(sdvxJacketPath("11061/ult")).toBe("/chunithm/11/jacket/11061.png");
    expect(sdvxJacketPath("008/we")).toBe("/chunithm/end/jacket/008.png");
    expect(sdvxViewerPath("11061/mst")).toBe(
      "/chunithm/_/viewer.php?id=11061&diff=mst",
    );
    expect(sdvxViewerPath("008/we")).toBe(
      "/chunithm/_/viewer.php?id=008&diff=we",
    );
  });

  it("lists where a song's jacket may be, its own first", () => {
    expect(
      sdvxJacketSources(["008/we", "11061/mst", "11061/exp", "11061/ult"]),
    ).toEqual([
      "/chunithm/11/jacket/11061.png",
      "/chunithm/end/jacket/008.png",
    ]);
  });

  it("reads a folder's songs: only drawn charts, blank rows left out", () => {
    const songs = parseSdvxSongs(fixture("songs11.json"), "songs");
    expect(songs.map((song) => song.key)).toEqual(["11062", "11006"]);
    expect(songs[0]).toEqual({
      key: "11062",
      id: "11062",
      list: "songs",
      title: "コンクエスト・チャレンジ",
      artist: "サツキ feat.ろん",
      genre: "ORIGINAL",
      bpm: "210",
      removed: null,
      charts: [
        {
          difficulty: "expert",
          ref: "11062/exp",
          level: "11",
          worldsEndStars: null,
          designer: null,
          noteTypes: {
            tap: 901,
            hold: 120,
            slide: 350,
            air: 370,
            flick: null,
          },
        },
        {
          difficulty: "master",
          ref: "11062/mst",
          level: "14+",
          worldsEndStars: null,
          designer: "ミニミライト",
          noteTypes: {
            tap: 1302,
            hold: 210,
            slide: 402,
            air: 600,
            flick: 116,
          },
        },
      ],
    });
    // "_" for no artist; entities decoded; Ultima in the song's own row.
    expect(songs[1]).toMatchObject({
      artist: "",
      genre: "POPS & ANIME",
    });
    expect(songs[1]?.charts.map((chart) => chart.ref)).toEqual([
      "11006/exp",
      "11006/mst",
      "11006/ult",
    ]);
    expect(songs[1]?.charts[0]?.noteTypes).toBeNull();
  });

  it("reads World's End songs: kanji and stars, undrawn ones without a chart", () => {
    const songs = parseSdvxSongs(fixture("songs_we.json"), "worldsend");
    expect(songs.map((song) => song.key)).toEqual(["we/008", "we/312"]);
    expect(songs[0]?.charts).toEqual([
      {
        difficulty: "worldsend",
        ref: "008/we",
        level: "？",
        worldsEndStars: 3,
        designer: "JAEPO 2017",
        noteTypes: { tap: 1600, hold: 100, slide: 300, air: 800, flick: 52 },
      },
    ]);
    expect(songs[1]?.charts).toEqual([]);
  });

  it("reads removed songs' version and day", () => {
    const [song] = parseSdvxSongs(fixture("songs_del.json"), "removed");
    expect(song?.removed).toEqual({ version: "x-verse-x", on: "2025-12-11" });
    expect(
      parseSdvxSongs(
        [{ id: "01001", title: "x", levels: {}, removed: "" }],
        "removed",
      )[0]?.removed,
    ).toEqual({ version: null, on: null });
    expect(() => parseSdvxSongs({}, "songs")).toThrow(SourceError);
  });

  it("reads the older site's pages, for moving what was kept from them", () => {
    expect(legacySdvxPathInfo("11/11061mst")).toEqual({
      dir: "11",
      entryId: "11061",
      difficulty: "master",
    });
    expect(legacySdvxPathInfo("end/01066end2")?.difficulty).toBe("worldsend");
    expect(refFromLegacyPath("11/11061mst")).toBe("11061/mst");
    expect(refFromLegacyPath("ult/11006ult")).toBe("11006/ult");
    expect(refFromLegacyPath("end/01066end2")).toBeNull();
    expect(refFromLegacyPath("nope")).toBeNull();
  });
});

describe("the catalog", () => {
  const sdvxSong = (
    id: string,
    title: string,
    artist: string,
    charts: {
      difficulty: SdvxChart["difficulty"];
      level: string;
      stars?: number;
    }[],
    removed: SdvxSong["removed"] = null,
  ): SdvxSong => {
    const worldsEnd = id.length === 3;
    return {
      key: worldsEnd ? `we/${id}` : id,
      id,
      list: worldsEnd ? "worldsend" : removed ? "removed" : "songs",
      title,
      artist,
      genre: "",
      bpm: "150",
      removed,
      charts: charts.map(({ difficulty, level, stars }) => ({
        difficulty,
        ref: sdvxRef(id, difficulty),
        level,
        worldsEndStars: stars ?? null,
        designer: "Designer",
        noteTypes: { tap: 1, hold: 2, slide: 3, air: 4, flick: 5 },
      })),
    };
  };

  const base = (): CatalogInput => ({
    sega: parseSegaMusic(
      [
        segaRow(),
        segaRow({ id: "100", title: "Same", artist: "One" }),
        segaRow({ id: "101", title: "Same", artist: "Two" }),
        segaRow({
          id: "8317",
          title: "Teriqma",
          lev_bas: "",
          lev_adv: "",
          lev_exp: "",
          lev_mas: "",
          we_kanji: "割",
          we_star: "5",
        }),
      ],
      { minSongs: 1 },
    ),
    otoge: parseOtogeMusic([otogeRow()], { minSongs: 1 }),
    otogeDeleted: parseOtogeMusic(
      [
        otogeRow({
          id: "2107",
          title: "FLARE",
          version: "NEW",
          date_added: "20220203",
          deleted_date: "20240620",
          lev_exp_chart_link: "",
          lev_mas_chart_link: "",
        }),
      ],
      { minSongs: 0 },
    ),
    sdvx: [],
    placements: [],
  });

  it("joins SEGA's songs with otoge-db's details", () => {
    const catalog = buildCatalog(base());
    const song = catalog.songs.find((s) => s.id === 3062);
    expect(song).toMatchObject({
      bpm: "210",
      version: "mate",
      addedOn: "2026-10-08",
      inGame: true,
    });
    const master = catalog.charts.find(
      (c) => c.songId === 3062 && c.difficulty === "master",
    );
    // otoge-db links it, but sdvx.in doesn't list that chart: no link.
    expect(master).toMatchObject({
      level: "14+",
      constant: 147,
      notes: 2630,
      sdvxRef: null,
      linkedBy: null,
    });
    expect(
      catalog.charts.filter((c) => c.songId === 3062).map((c) => c.difficulty),
    ).toEqual(["basic", "advanced", "expert", "master"]);
  });

  it("takes otoge-db's older links when the chart there is the same song", () => {
    const input = base();
    input.sdvx = [
      // What otoge-db's "11/11061mst" now is: another song (the numbers moved).
      sdvxSong("11061", "ハイボルテージガール", "someone", [
        { difficulty: "expert", level: "12" },
        { difficulty: "master", level: "14" },
      ]),
      sdvxSong("11062", "コンクエスト・チャレンジ", "サツキ feat.ろん", [
        { difficulty: "master", level: "14+" },
      ]),
    ];
    const catalog = buildCatalog(input);
    const chart = (difficulty: string) =>
      catalog.charts.find(
        (c) => c.songId === 3062 && c.difficulty === difficulty,
      );
    // Not otoge-db's (another song there), but found by its title.
    expect(chart("master")).toMatchObject({
      sdvxRef: "11062/mst",
      linkedBy: "title",
      noteTypes: { tap: 1, hold: 2, slide: 3, air: 4, flick: 5 },
    });
    expect(chart("expert")).toMatchObject({ sdvxRef: null });
    expect(catalog.unmatched.map((row) => row.ref)).toEqual([
      "11061/exp",
      "11061/mst",
    ]);

    input.sdvx = [
      sdvxSong("11061", "Conquest Challenge", "サツキ feat.ろん", [
        { difficulty: "master", level: "14+" },
      ]),
    ];
    // Another spelling, same artist and level: otoge-db's link stands.
    expect(
      buildCatalog(input).charts.find(
        (c) => c.songId === 3062 && c.difficulty === "master",
      ),
    ).toMatchObject({ sdvxRef: "11061/mst", linkedBy: "otoge-db" });
  });

  it("keeps removed songs, out of the game", () => {
    const catalog = buildCatalog(base());
    expect(catalog.songs.find((s) => s.id === 2107)).toMatchObject({
      inGame: false,
      removedOn: "2024-06-20",
      version: "new",
    });
  });

  it("orders versions, known ones first, and finds the current one", () => {
    const input = base();
    input.otoge = parseOtogeMusic(
      [
        otogeRow(),
        otogeRow({ id: "4000", version: "MOON", date_added: "20270701" }),
      ],
      { minSongs: 1 },
    );
    input.sega.push(
      ...parseSegaMusic([segaRow({ id: "4000", title: "New one" })], {
        minSongs: 1,
      }),
    );
    const catalog = buildCatalog(input);
    expect(catalog.versions.map((v) => v.slug)).toEqual([
      "new",
      "mate",
      "moon",
    ]);
    expect(catalog.versions[2]).toMatchObject({
      name: "MOON",
      startedOn: "2027-07-01",
      order: 2,
    });
    expect(catalog.currentVersion).toBe("moon");
  });

  it("dates a version by its launch, not an early event song", () => {
    const input = base();
    input.otoge = parseOtogeMusic(
      [
        otogeRow({ id: "1", version: "NEW+", date_added: "20210401" }),
        ...["2", "3", "4"].map((id) =>
          otogeRow({ id, version: "NEW+", date_added: "20220414" }),
        ),
        ...["5", "6", "7", "8"].map((id) =>
          otogeRow({ id, version: "NEW+", date_added: "20220630" }),
        ),
      ],
      { minSongs: 1 },
    );
    const catalog = buildCatalog(input);
    expect(catalog.versions.find((v) => v.slug === "new-plus")?.startedOn).toBe(
      "2022-04-14",
    );
  });

  it("links sdvx.in's charts otoge-db doesn't, by title and artist", () => {
    const input = base();
    input.sdvx = [
      sdvxSong("01001", "SAME", "two", [
        { difficulty: "master", level: "14+" },
      ]),
      sdvxSong("01002", "Same", "Three", [
        { difficulty: "master", level: "14+" },
      ]),
      sdvxSong("01003", "Nothing like it", "x", [
        { difficulty: "expert", level: "11" },
      ]),
      sdvxSong("066", "Teriqma", "owl", [
        { difficulty: "worldsend", level: "割", stars: 3 },
      ]),
    ];
    const catalog = buildCatalog(input);
    const chart = (id: number, difficulty: string) =>
      catalog.charts.find(
        (c) => c.songId === id && c.difficulty === difficulty,
      );
    expect(chart(101, "master")).toMatchObject({
      sdvxRef: "01001/mst",
      linkedBy: "title",
      designer: "Designer",
    });
    expect(chart(8317, "worldsend")).toMatchObject({
      sdvxRef: "066/we",
      linkedBy: "title",
    });
    expect(
      catalog.unmatched.map(({ ref, reason, candidates }) => ({
        ref,
        reason,
        candidates,
      })),
    ).toEqual([
      { ref: "01002/mst", reason: "ambiguous", candidates: [100, 101] },
      { ref: "01003/exp", reason: "no-song", candidates: [] },
    ]);
  });

  it("tells songs of one title and artist apart by level", () => {
    const input = base();
    input.sega.push(
      ...parseSegaMusic(
        [segaRow({ id: "102", title: "Same", artist: "Two", lev_mas: "13" })],
        { minSongs: 1 },
      ),
    );
    input.sdvx = [
      sdvxSong("01001", "Same", "Two", [{ difficulty: "master", level: "13" }]),
    ];
    expect(
      buildCatalog(input).charts.find((c) => c.sdvxRef === "01001/mst")?.songId,
    ).toBe(102);
  });

  it("never links one chart of sdvx.in's to two of ours, or two to one", () => {
    const input = base();
    input.sdvx = [
      sdvxSong("01001", "Same", "Two", [
        { difficulty: "master", level: "14+" },
      ]),
      sdvxSong("01009", "Same", "Two", [
        { difficulty: "master", level: "14+" },
      ]),
    ];
    const catalog = buildCatalog(input);
    expect(
      catalog.charts.find((c) => c.songId === 101 && c.difficulty === "master")
        ?.sdvxRef,
    ).toBe("01001/mst");
    expect(catalog.unmatched).toMatchObject([
      { ref: "01009/mst", reason: "taken", candidates: [101] },
    ]);
  });

  it("lets the admin link or ignore a chart, over everything else", () => {
    const input = base();
    input.sdvx = [
      sdvxSong("01002", "Same", "Three", [
        { difficulty: "master", level: "14+" },
      ]),
      sdvxSong("11061", "コンクエスト・チャレンジ", "サツキ feat.ろん", [
        { difficulty: "master", level: "14+" },
      ]),
    ];
    input.placements = [
      { ref: "01002/mst", songId: 100, difficulty: "master" },
      { ref: "11061/mst", songId: null, difficulty: null },
    ];
    const catalog = buildCatalog(input);
    const chart = (id: number, difficulty: string) =>
      catalog.charts.find(
        (c) => c.songId === id && c.difficulty === difficulty,
      );
    expect(chart(100, "master")).toMatchObject({
      sdvxRef: "01002/mst",
      linkedBy: "admin",
    });
    expect(chart(3062, "master")).toMatchObject({
      sdvxRef: null,
      linkedBy: null,
    });
    expect(catalog.unmatched).toEqual([]);
  });

  it("takes removal days and versions from sdvx.in's removed songs", () => {
    const input = base();
    input.otoge = [];
    input.sega = input.sega.filter((s) => s.id !== 3062);
    input.otogeDeleted = parseOtogeMusic([otogeRow({ deleted_date: "" })], {
      minSongs: 0,
    });
    input.sdvx = [
      sdvxSong(
        "11061",
        "コンクエスト・チャレンジ",
        "サツキ feat.ろん",
        [{ difficulty: "master", level: "14+" }],
        { version: "x-verse-x", on: "2025-12-11" },
      ),
    ];
    const catalog = buildCatalog(input);
    expect(catalog.songs.find((s) => s.id === 3062)).toMatchObject({
      inGame: false,
      removedOn: "2025-12-11",
      removedIn: "x-verse-x",
    });
  });
});
