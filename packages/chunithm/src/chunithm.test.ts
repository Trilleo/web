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
  parseSdvxList,
  parseSdvxScript,
  sdvxJacketSources,
  parseSegaMusic,
  sdvxLogoSlug,
  sdvxJacket,
  sdvxPathInfo,
  sdvxScriptOf,
  sdvxScriptUrl,
  SourceError,
  versionSlug,
  worldsEndStars,
  type CatalogInput,
  type SdvxEntry,
} from "./index";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

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
    expect(sdvxLogoSlug("")).toBe("chunithm");
    expect(sdvxLogoSlug("AIRPLUS")).toBe("air-plus");
    expect(sdvxLogoSlug("PARADISELOST")).toBe("paradise-lost");
    expect(sdvxLogoSlug("VERSEPLUS")).toBe("x-verse");
    expect(sdvxLogoSlug("VERSEPLUSX")).toBe("x-verse-x");
    expect(sdvxLogoSlug("MATE")).toBe("mate");
    // One we don't know yet still gets a slug.
    expect(sdvxLogoSlug("MOON")).toBe("moon");
    expect(sdvxLogoSlug("MOONPLUS")).toBe("moon-plus");
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
    expect(song?.charts[0]?.sdvxPath).toBeNull();
    expect(song?.charts[3]).toEqual({
      difficulty: "master",
      level: "14+",
      constant: 147,
      notes: 2630,
      designer: "ミニミライト",
      sdvxPath: "11/11061mst",
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
        sdvxPath: "end/01066end2",
      },
    ]);
  });
});

describe("sdvx.in", () => {
  it("knows chart pages", () => {
    expect(sdvxPathInfo("11/11061mst")).toEqual({
      dir: "11",
      entryId: "11061",
      difficulty: "master",
    });
    expect(sdvxPathInfo("end/01066end2")?.difficulty).toBe("worldsend");
    expect(sdvxPathInfo("ult/11006ult")?.difficulty).toBe("ultima");
    expect(sdvxPathInfo("../etc/passwd")).toBeNull();
    expect(sdvxScriptUrl("11/11061sort")).toBe("/chunithm/11/js/11061sort.js");
  });

  it("reads a World's End script with only its chart's own title", () => {
    expect(parseSdvxScript(fixture("02045end2.txt"), "end/02045end2")).toEqual({
      title: "Oshama Scramble! (Cranky Remix) JAEPO 2017",
      artist: "Cranky",
      bpm: "190",
      jacket: "/chunithm/02/jacket/02045.png",
      charts: [
        {
          difficulty: "worldsend",
          path: "end/02045end2",
          level: "？",
          worldsEndStars: 3,
          designer: "JAEPO 2017",
          chain: 2852,
        },
      ],
    });
  });

  it("reads a genre page's entries and their versions", () => {
    const entries = parseSdvxList(fixture("pops.htm"));
    expect(entries.map((entry) => entry.script)).toEqual([
      "11/11002sort",
      "11/11037sort",
      "11/11049sort",
      "10/10180sort",
      "10/10225sort",
    ]);
    expect(entries[0]).toEqual({
      script: "11/11002sort",
      entryId: "11002",
      kind: "song",
      listTitle: "Bling-Bang-Bang-Born",
      version: "mate",
      removed: null,
    });
    expect(entries[3]?.version).toBe("x-verse-x");
  });

  it("reads the removed-songs page", () => {
    const entries = parseSdvxList(fixture("del.htm"));
    expect(entries[0]?.removed).toEqual({ version: "mate", on: "2026-07-02" });
    expect(entries.at(-1)?.removed).toEqual({
      version: "x-verse-x",
      on: "2025-12-11",
    });
  });

  it("reads a song's script without running it", () => {
    expect(parseSdvxScript(fixture("11061sort.txt"), "11/11061sort")).toEqual({
      title: "コンクエスト・チャレンジ",
      artist: "サツキ feat.ろん",
      bpm: "210",
      jacket: null,
      charts: [
        {
          difficulty: "expert",
          path: "11/11061exp",
          level: "11",
          worldsEndStars: null,
          designer: "みぞれヤナギ",
          chain: 1741,
        },
        {
          difficulty: "master",
          path: "11/11061mst",
          level: "14+",
          worldsEndStars: null,
          designer: "ミニミライト",
          chain: 2630,
        },
      ],
    });
  });

  it("reads Ultima and World's End scripts", () => {
    expect(
      parseSdvxScript(fixture("11006ult.txt"), "ult/11006ult")?.charts,
    ).toEqual([
      {
        difficulty: "ultima",
        path: "ult/11006ult",
        level: "14",
        worldsEndStars: null,
        designer: "ミニミライト",
        chain: 1875,
      },
    ]);
    const we = parseSdvxScript(fixture("01066end2.txt"), "end/01066end2");
    expect(we?.title).toBe("Teriqma");
    expect(we?.charts).toEqual([
      {
        difficulty: "worldsend",
        path: "end/01066end2",
        level: "割",
        worldsEndStars: 3,
        designer: "階段割qma",
        chain: 2248,
      },
    ]);
  });

  it("reads older World's End pages, which spell the kanji in romaji", () => {
    const text = [
      'var TITLE01045="<div class=f1>Aragami</div>";',
      'var LV01045W="<a href=/chunithm/end/01045end.htm><img src=/chunithm/chfiles/chlv/hika3.png></a>";',
      'var LV01045W2="<a href=/chunithm/end/01045end2.htm><img src=/chunithm/chfiles/chlv/star_zzz2.png></a>";',
    ].join("\n");
    expect(
      parseSdvxScript(text, "end/01045end")?.charts.map((c) => [
        c.level,
        c.worldsEndStars,
      ]),
    ).toEqual([["光", 3]]);
    // A spelling we don't know keeps its stars and leaves the kanji out.
    expect(
      parseSdvxScript(text, "end/01045end2")?.charts.map((c) => [
        c.level,
        c.worldsEndStars,
      ]),
    ).toEqual([[null, 2]]);
  });

  it("lists where a song's jacket may be, its own pages first", () => {
    expect(
      sdvxJacketSources(
        ["ult/00001ult", "01/00001mst", "01/00001exp", "end/00001end"],
        new Map([
          ["ult/00001ult", { jacket: "/chunithm/01/jacket/00001-alt.png" }],
        ]),
      ),
    ).toEqual([
      "/chunithm/01/jacket/00001.png",
      "/chunithm/01/jacket/00001-alt.png",
    ]);
    expect(sdvxJacketSources([], new Map())).toEqual([]);
  });

  it("finds the script behind a chart page", () => {
    expect(sdvxScriptOf("11/11061mst")).toBe("11/11061sort");
    expect(sdvxScriptOf("ult/11006ult")).toBe("ult/11006ult");
    expect(sdvxScriptOf("end/01066end2")).toBe("end/01066end2");
    expect(sdvxScriptOf("nope")).toBeNull();
  });

  it("finds a song's jacket", () => {
    const text =
      'var TITLE11061="<div class=f1>X</div>";\nvar JK11061="<img src=/chunithm/11/jacket/11061.png width=100px height=100px>";';
    expect(parseSdvxScript(text, "11/11061sort")?.jacket).toBe(
      "/chunithm/11/jacket/11061.png",
    );
    expect(sdvxJacket(null, "11/11061sort")).toBe(
      "/chunithm/11/jacket/11061.png",
    );
    expect(
      sdvxJacket({ jacket: "/chunithm/01/jacket/01066.png" }, "end/01066end2"),
    ).toBe("/chunithm/01/jacket/01066.png");
    expect(sdvxJacket(null, "end/01066end2")).toBeNull();
  });

  it("returns null for something that isn't a script", () => {
    expect(parseSdvxScript("<html>", "11/11061sort")).toBeNull();
    expect(parseSdvxScript(fixture("11061sort.txt"), "11/nope")).toBeNull();
  });
});

describe("the catalog", () => {
  const sdvxSong = (
    script: string,
    title: string,
    artist: string,
    charts: { path: string; level: string; stars?: number }[],
    entry: Partial<SdvxEntry["entry"]> = {},
  ): SdvxEntry => ({
    entry: {
      script,
      entryId: script.slice(-9, -4),
      kind: script.startsWith("end") ? "worldsend" : "song",
      listTitle: title,
      version: null,
      removed: null,
      ...entry,
    },
    details: {
      title,
      artist,
      bpm: "150",
      jacket: null,
      charts: charts.map(({ path, level, stars }) => ({
        difficulty: sdvxPathInfo(path)?.difficulty ?? "master",
        path,
        level,
        worldsEndStars: stars ?? null,
        designer: "Designer",
        chain: 1000,
      })),
    },
  });

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
    overrides: [],
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
    expect(master).toMatchObject({
      level: "14+",
      constant: 147,
      notes: 2630,
      sdvxPath: "11/11061mst",
      linkedBy: "otoge-db",
    });
    expect(
      catalog.charts.filter((c) => c.songId === 3062).map((c) => c.difficulty),
    ).toEqual(["basic", "advanced", "expert", "master"]);
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

  it("links sdvx.in pages otoge-db doesn't, by title and artist", () => {
    const input = base();
    input.sdvx = [
      sdvxSong("01/01001sort", "SAME", "two", [
        { path: "01/01001mst", level: "14+" },
      ]),
      sdvxSong("01/01002sort", "Same", "Three", [
        { path: "01/01002mst", level: "14+" },
      ]),
      sdvxSong("01/01003sort", "Nothing like it", "x", [
        { path: "01/01003exp", level: "11" },
      ]),
      sdvxSong("end/01066end2", "Teriqma", "owl", [
        { path: "end/01066end2", level: "割", stars: 3 },
      ]),
    ];
    const catalog = buildCatalog(input);
    const chart = (id: number, difficulty: string) =>
      catalog.charts.find(
        (c) => c.songId === id && c.difficulty === difficulty,
      );
    expect(chart(101, "master")).toMatchObject({
      sdvxPath: "01/01001mst",
      linkedBy: "title",
      chain: 1000,
      designer: "Designer",
    });
    expect(chart(8317, "worldsend")).toMatchObject({
      sdvxPath: "end/01066end2",
      linkedBy: "title",
    });
    expect(
      catalog.unmatched.map(({ path, reason, candidates }) => ({
        path,
        reason,
        candidates,
      })),
    ).toEqual([
      { path: "01/01002mst", reason: "ambiguous", candidates: [100, 101] },
      { path: "01/01003exp", reason: "no-song", candidates: [] },
    ]);
  });

  it("never links one page to two charts, or two pages to one chart", () => {
    const input = base();
    input.sdvx = [
      // Already otoge-db's page for 3062: a title match elsewhere can't take it.
      sdvxSong("11/11061sort", "Same", "One", [
        { path: "11/11061mst", level: "14+" },
      ]),
      sdvxSong("01/01001sort", "Same", "Two", [
        { path: "01/01001mst", level: "14+" },
      ]),
      sdvxSong("01/01009sort", "Same", "Two", [
        { path: "01/01009mst", level: "14+" },
      ]),
    ];
    const catalog = buildCatalog(input);
    const linked = catalog.charts.filter((c) => c.sdvxPath === "11/11061mst");
    expect(linked.map((c) => c.songId)).toEqual([3062]);
    expect(
      catalog.charts.find((c) => c.songId === 101 && c.difficulty === "master")
        ?.sdvxPath,
    ).toBe("01/01001mst");
    expect(catalog.unmatched).toMatchObject([
      { path: "01/01009mst", reason: "taken", candidates: [101] },
    ]);
  });

  it("lets the admin link or ignore a page, over everything else", () => {
    const input = base();
    input.sdvx = [
      sdvxSong("01/01002sort", "Same", "Three", [
        { path: "01/01002mst", level: "14+" },
      ]),
    ];
    input.overrides = [
      { path: "01/01002mst", songId: 100, difficulty: "master" },
      { path: "11/11061mst", songId: null, difficulty: null },
    ];
    const catalog = buildCatalog(input);
    const chart = (id: number, difficulty: string) =>
      catalog.charts.find(
        (c) => c.songId === id && c.difficulty === difficulty,
      );
    expect(chart(100, "master")).toMatchObject({
      sdvxPath: "01/01002mst",
      linkedBy: "admin",
    });
    expect(chart(3062, "master")).toMatchObject({
      sdvxPath: null,
      linkedBy: null,
    });
    expect(catalog.unmatched).toEqual([]);
  });

  it("takes removal days and versions from sdvx.in's removed-songs page", () => {
    const input = base();
    input.otogeDeleted = [];
    input.otoge = [];
    input.sega = input.sega.filter((s) => s.id !== 3062);
    input.otogeDeleted = parseOtogeMusic([otogeRow({ deleted_date: "" })], {
      minSongs: 0,
    });
    input.sdvx = [
      sdvxSong(
        "11/11061sort",
        "コンクエスト・チャレンジ",
        "サツキ feat.ろん",
        [{ path: "11/11061mst", level: "14+" }],
        { removed: { version: "x-verse-x", on: "2025-12-11" } },
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
