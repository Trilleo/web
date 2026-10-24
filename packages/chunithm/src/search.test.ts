import { describe, expect, it } from "vitest";
import {
  foldKana,
  queryKeys,
  romajiToKana,
  searchSongs,
  songKeys,
  type SongIndexEntry,
} from "./index";

const song = (
  id: number,
  title: string,
  reading: string,
  artist = "",
  aliases: string[] = [],
): SongIndexEntry => ({
  id,
  title,
  artist,
  reading,
  genre: "ORIGINAL",
  version: "mate",
  inGame: true,
  removedIn: null,
  jacket: null,
  bpm: null,
  addedOn: null,
  aliases,
  charts: [],
});

const SONGS = [
  song(
    3062,
    "コンクエスト・チャレンジ",
    "コンクエストチヤレンシ",
    "サツキ feat.ろん",
  ),
  song(
    1,
    "ハッピーラッキーチャッピー",
    "ハツヒウラツキウチヤツヒウ",
    "Someone",
  ),
  song(2710, "Oracle", "ORACLE", "DJ Noriken", ["神谕"]),
  song(3, "夜に駆ける", "ヨルニカケル", "YOASOBI"),
  song(4, "Oracle of Something", "ORACLEOFSOMETHING", "Other"),
].map((s) => ({ song: s, keys: songKeys(s) }));

const ids = (query: string) => searchSongs(SONGS, query).map((s) => s.id);

describe("folding to SEGA's readings", () => {
  it("writes anything the way SEGA's readings are written", () => {
    expect(foldKana("ハッピー")).toBe("ハツヒウ");
    expect(foldKana("ちゃれんじ")).toBe("チヤレンシ");
    expect(foldKana("ヴィ")).toBe("ウイ");
    expect(foldKana("Ｖｅｒ．")).toBe("VER");
    expect(foldKana("feat. ろん")).toBe("FEATロン");
  });

  it("reads romaji as kana, or gives up on what isn't", () => {
    expect(romajiToKana("konkuesuto")).toBe("こんくえすと");
    expect(romajiToKana("happi-")).toBe("はっぴー");
    expect(romajiToKana("chakkupi")).toBe("ちゃっくぴ");
    expect(romajiToKana("shinbun")).toBe("しんぶん");
    expect(romajiToKana("kon'ya")).toBe("こんや");
    expect(romajiToKana("matcha")).toBe("まっちゃ");
    expect(romajiToKana("oracle")).toBeNull();
    expect(romajiToKana("夜")).toBeNull();
  });

  it("keeps both forms of a query", () => {
    expect(queryKeys("Konkuesuto")).toEqual({
      plain: "konkuesuto",
      reading: "コンクエスト",
    });
  });
});

describe("searching", () => {
  it("finds titles in any script and width", () => {
    expect(ids("oracle")).toEqual([2710, 4]);
    expect(ids("ＯＲＡＣＬＥ")).toEqual([2710, 4]);
    expect(ids("夜に")).toEqual([3]);
  });

  it("finds Japanese titles by kana or romaji", () => {
    expect(ids("ちゃれんじ")).toEqual([3062]);
    expect(ids("こんくえすと")).toEqual([3062]);
    expect(ids("konkuesuto")).toEqual([3062]);
    expect(ids("happi-rakki-")).toEqual([1]);
    expect(ids("yorunikakeru")).toEqual([3]);
  });

  it("finds aliases (Chinese and otherwise) and artists", () => {
    expect(ids("神谕")).toEqual([2710]);
    expect(ids("noriken")).toEqual([2710]);
    expect(ids("yoasobi")).toEqual([3]);
  });

  it("puts exact and leading matches first", () => {
    const [first] = searchSongs(SONGS, "Oracle");
    expect(first?.id).toBe(2710);
  });

  it("finds nothing for nothing", () => {
    expect(ids("")).toEqual([]);
    expect(ids("・")).toEqual([]);
  });
});
