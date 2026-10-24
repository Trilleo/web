/**
 * Finding songs by what people type: titles, artists, readings and aliases, in English,
 * Japanese or Chinese, with full-width or half-width letters, hiragana or katakana, or
 * Japanese typed as romaji. Runs in the browser over the catalog's index (`SongIndex`,
 * served by the site), so it needs nothing but the index.
 *
 * SEGA writes each song's reading as a sort key: katakana without dakuten or small
 * kana, ー and ヴ as ウ, Latin in capitals, nothing else ("ハッピー" → "ハツヒウ").
 * `foldKana` brings anything typed to that form, so it can be found in a reading.
 */
import type { Difficulty } from "./difficulties";
import { matchKey } from "./text";

/** One song as the browser gets it: enough to list, filter and search. */
export interface SongIndexEntry {
  id: number;
  title: string;
  artist: string;
  /** SEGA's reading (its sort key). */
  reading: string;
  genre: string;
  /** Version slug it came in. */
  version: string | null;
  inGame: boolean;
  /** Version slug it left the game in, if removed. */
  removedIn: string | null;
  jacket: string | null;
  bpm: string | null;
  addedOn: string | null;
  aliases: string[];
  charts: {
    difficulty: Difficulty;
    level: string;
    /** Tenths. */
    constant: number | null;
    worldsEndStars: number | null;
    /** Whether sdvx.in has a picture of it (and it isn't withdrawn). */
    viewable: boolean;
  }[];
}

export interface SongIndex {
  /** Versions, oldest first: slug and name. */
  versions: { slug: string; name: string }[];
  songs: SongIndexEntry[];
}

const SMALL_KANA: Record<string, string> = {
  ァ: "ア",
  ィ: "イ",
  ゥ: "ウ",
  ェ: "エ",
  ォ: "オ",
  ッ: "ツ",
  ャ: "ヤ",
  ュ: "ユ",
  ョ: "ヨ",
  ヮ: "ワ",
  ヵ: "カ",
  ヶ: "ケ",
};

/** Anything typed, in the form of SEGA's readings (see the top of this file). */
export function foldKana(text: string): string {
  return (
    text
      .normalize("NFKC")
      // Hiragana to katakana.
      .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
      // Dakuten and handakuten off (ヴ becomes ウ with them).
      .normalize("NFD")
      .replace(/[゙゚]/g, "")
      .normalize("NFC")
      .replace(/[ァィゥェォッャュョヮヵヶ]/g, (ch) => SMALL_KANA[ch] ?? ch)
      .replace(/ー/g, "ウ")
      .toUpperCase()
      .replace(/[^0-9A-Zァ-ヺ]/g, "")
  );
}

/** Romaji syllables, longest first when read (Hepburn, Kunrei and typing habits). */
// prettier-ignore
const ROMAJI: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", si: "し", shi: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", zi: "じ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", ti: "ち", chi: "ち", tu: "つ", tsu: "つ", te: "て", to: "と",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", hu: "ふ", fu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  la: "ら", li: "り", lu: "る", le: "れ", lo: "ろ",
  wa: "わ", wo: "を", we: "うぇ", wi: "うぃ",
  va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sya: "しゃ", syu: "しゅ", syo: "しょ", sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", je: "じぇ", zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ", cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ",
  tsa: "つぁ", thi: "てぃ", dhi: "でぃ", twu: "とぅ", dwu: "どぅ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  lya: "りゃ", lyu: "りゅ", lyo: "りょ",
  n: "ん", nn: "ん", "n'": "ん", "-": "ー",
};
const LONGEST = 3;

/**
 * Romaji to hiragana, or null if it isn't all romaji ("oracle" isn't: "c" alone has
 * no kana). A doubled consonant is a small tsu; "n" before a consonant is ん.
 */
export function romajiToKana(text: string): string | null {
  const input = text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  if (!/^[a-z'-]+$/.test(input)) return null;
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i] ?? "";
    const next = input[i + 1] ?? "";
    // っ: a doubled consonant (not n), or "tch".
    if (
      (ch === next && /[bcdfghjkmpqrstvwxyz]/.test(ch)) ||
      (ch === "t" && next === "c")
    ) {
      out += "っ";
      i++;
      continue;
    }
    // ん before a consonant (other than y) or at the end.
    if (ch === "n" && (next === "" || /[bcdfghjkmnpqrstvwxz]/.test(next))) {
      out += "ん";
      i += next === "n" && !/[aeiouy]/.test(input[i + 2] ?? "") ? 2 : 1;
      continue;
    }
    let matched = false;
    for (let length = LONGEST; length > 0; length--) {
      const piece = input.slice(i, i + length);
      const kana = ROMAJI[piece];
      if (kana) {
        out += kana;
        i += length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return out;
}

/** What a song is found by, computed once per song. */
export interface SongKeys {
  title: string;
  reading: string;
  artist: string;
  aliases: string[];
}

export function songKeys(song: SongIndexEntry): SongKeys {
  return {
    title: matchKey(song.title),
    reading: foldKana(song.reading),
    artist: matchKey(song.artist),
    aliases: song.aliases.map(matchKey),
  };
}

/** A query's forms: as typed (letters and digits) and as a reading. */
export function queryKeys(query: string): { plain: string; reading: string } {
  const plain = matchKey(query);
  const romaji = romajiToKana(query);
  const reading = foldKana(romaji ?? query);
  return { plain, reading };
}

/** How well a song fits a query; 0 when it doesn't. Higher is better. */
export function scoreSong(
  keys: SongKeys,
  query: { plain: string; reading: string },
): number {
  if (!query.plain && !query.reading) return 0;
  const rank = (haystack: string, needle: string, weight: number) => {
    if (!needle || !haystack) return 0;
    if (haystack === needle) return weight * 3;
    if (haystack.startsWith(needle)) return weight * 2;
    return haystack.includes(needle) ? weight : 0;
  };
  // Reading matches need a little length: one kana would match half the catalog.
  const reading = query.reading.length >= 2 ? query.reading : "";
  return Math.max(
    rank(keys.title, query.plain, 10),
    ...keys.aliases.map((alias) => rank(alias, query.plain, 9)),
    rank(keys.reading, reading, 8),
    rank(keys.artist, query.plain, 4),
  );
}

/** Songs that fit the query, best first (ties by title). */
export function searchSongs(
  songs: readonly { song: SongIndexEntry; keys: SongKeys }[],
  query: string,
): SongIndexEntry[] {
  const q = queryKeys(query);
  return songs
    .map((entry) => ({ entry, score: scoreSong(entry.keys, q) }))
    .filter((hit) => hit.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.song.title.localeCompare(b.entry.song.title, "ja"),
    )
    .map((hit) => hit.entry.song);
}
