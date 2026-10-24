/**
 * sdvx.in (CHUNITHM譜面保管所): chart pictures, made by hand for each chart, with its
 * own IDs. Its pages are written by scripts (document.write), so they're read here as
 * text and never run.
 *
 * - The genre pages (/chunithm/sort/<genre>.htm), /chunithm/ultima.htm (sort/), the
 *   World's End page (/chunithm/end.htm) and the removed-songs page (/chunithm/del.htm)
 *   list "entries": one script each, in version sections (a logo function call,
 *   CHUNITHM<NAME>LG()), each followed by <!--title--> on genre pages.
 * - An entry's script (/chunithm/<dir>/js/<id>sort.js, …ult.js, …end.js, …end2.js)
 *   holds the song's title, artist and BPM and, per chart, its page, level, notes
 *   designer and CHAIN (combo) count.
 * - A chart's page is /chunithm/<dir>/<id><kind>.htm: its "path" here is
 *   "<dir>/<id><kind>" ("11/11061mst", "ult/11006ult", "end/01066end2").
 *
 * <dir> is a two-digit folder per few versions, or "ult" / "end".
 */
import type { Difficulty } from "../difficulties";
import { htmlText } from "../text";
import { sdvxLogoSlug, versionSlug } from "../versions";

export type SdvxEntryKind = "song" | "ultima" | "worldsend";

const PATH = /^(\d{2}|ult|end)\/(\d{5})(bsc|adv|exp|mst|ult|end\d*)$/;
const KIND_DIFFICULTY: Record<string, Difficulty> = {
  bsc: "basic",
  adv: "advanced",
  exp: "expert",
  mst: "master",
  ult: "ultima",
};

export function isSdvxPath(path: string): boolean {
  return PATH.test(path);
}

/** A chart page's difficulty and entry ID, or null for something else. */
export function sdvxPathInfo(
  path: string,
): { dir: string; entryId: string; difficulty: Difficulty } | null {
  const match = PATH.exec(path);
  if (!match) return null;
  const [, dir = "", entryId = "", kind = ""] = match;
  const difficulty = kind.startsWith("end")
    ? "worldsend"
    : KIND_DIFFICULTY[kind];
  return difficulty ? { dir, entryId, difficulty } : null;
}

export interface SdvxListEntry {
  /** "11/11061sort", "ult/11006ult", "end/01066end2": the key for an entry. */
  script: string;
  entryId: string;
  kind: SdvxEntryKind;
  /** The title in the page's comment, where there is one. */
  listTitle: string | null;
  /** The version section it's listed under, as a slug. */
  version: string | null;
  /** On the removed-songs page: the version and day it left the game. */
  removed: { version: string | null; on: string } | null;
}

/** Where an entry's script lives on sdvx.in. */
export function sdvxScriptUrl(script: string): string {
  const [dir = "", file = ""] = script.split("/");
  return `/chunithm/${dir}/js/${file}.js`;
}

const TOKENS =
  /CHUNITHM([A-Z]*)LG\(\)|<div class=adv1>([^<]*?)\s*(\d{4})\/(\d{2})\/(\d{2})\s*配信停止|src="\/chunithm\/(\d{2}|ult|end)\/js\/(\d{5})(sort|ult|end\d*)\.js"([^\n]*)/g;

/** The entries a list page links, in order, with their version sections. */
export function parseSdvxList(html: string): SdvxListEntry[] {
  const entries: SdvxListEntry[] = [];
  const seen = new Set<string>();
  let version: string | null = null;
  let removed: SdvxListEntry["removed"] = null;
  for (const match of html.matchAll(TOKENS)) {
    const [, logo, gone, year, month, day, dir, id, kind, rest] = match;
    if (logo !== undefined) {
      version = sdvxLogoSlug(logo);
      continue;
    }
    if (year !== undefined) {
      removed = {
        version: versionSlug(gone ?? "") || null,
        on: `${year}-${month ?? ""}-${day ?? ""}`,
      };
      continue;
    }
    if (!dir || !id || !kind) continue;
    const script = `${dir}/${id}${kind}`;
    if (seen.has(script)) continue;
    seen.add(script);
    const comment = /<!--(.*?)-->/.exec(rest ?? "")?.[1]?.trim();
    entries.push({
      script,
      entryId: id,
      kind: kind === "sort" ? "song" : kind === "ult" ? "ultima" : "worldsend",
      listTitle: comment === undefined || comment === "" ? null : comment,
      version,
      removed,
    });
  }
  return entries;
}

export interface SdvxChart {
  difficulty: Difficulty;
  path: string;
  /** "14+", or a World's End chart's kanji. */
  level: string | null;
  worldsEndStars: number | null;
  designer: string | null;
  /** sdvx.in's CHAIN: the chart's full combo count. */
  chain: number | null;
}

export interface SdvxEntryDetails {
  title: string;
  artist: string;
  bpm: string | null;
  charts: SdvxChart[];
}

/** The World's End kanji older sdvx.in pages spell in romaji (only the sure ones). */
const WORLDS_END_ROMAJI: Record<string, string> = {
  kyou: "狂",
  wari: "割",
  kura: "蔵",
  sake: "避",
  ryou: "両",
  hika: "光",
};

/** The script an sdvx.in chart page's details come from ("11/11061mst" → "11/11061sort"). */
export function sdvxScriptOf(path: string): string | null {
  const info = sdvxPathInfo(path);
  if (!info) return null;
  if (info.dir === "end" || info.dir === "ult") return path;
  return `${info.dir}/${info.entryId}sort`;
}

const VARIABLE = /^var ([A-Z0-9]+)="((?:[^"\\\n]|\\.)*)";?\s*$/gm;

/** What an entry's script says, read as text. Null when it isn't one. */
export function parseSdvxScript(
  text: string,
  script: string,
): SdvxEntryDetails | null {
  const [, file = ""] = script.split("/");
  const match = /^(\d{5})(sort|ult|end(\d*))$/.exec(file);
  if (!match) return null;
  const [, id = "", kind = "", endIndex = ""] = match;
  const vars = new Map<string, string>();
  for (const [, name = "", value = ""] of text
    .replace(/^\uFEFF/, "")
    .matchAll(VARIABLE))
    vars.set(name, value.replace(/\\(.)/g, "$1"));

  const title = htmlText(vars.get(`TITLE${id}`) ?? "");
  if (!title) return null;
  const artist = htmlText(vars.get(`ARTIST${id}`) ?? "").replace(
    /^\s*\/\s*/,
    "",
  );
  const bpm =
    htmlText(vars.get(`BPM${id}`) ?? "").replace(/^BPM\s*/, "") || null;

  const suffixes =
    kind === "sort"
      ? ["B", "A", "E", "M"]
      : kind === "ult"
        ? ["U"]
        : [`W${endIndex}`];
  const charts: SdvxChart[] = [];
  for (const suffix of suffixes) {
    const chart = readChart(vars, `${id}${suffix}`);
    if (chart) charts.push(chart);
  }
  return { title, artist, bpm, charts };
}

function readChart(vars: Map<string, string>, key: string): SdvxChart | null {
  const lv = vars.get(`LV${key}`) ?? "";
  // Charts sdvx.in hasn't drawn have a broken "<href=…>" instead of a link.
  const link = /<a href=\/chunithm\/([^ >]+)\.htm>/.exec(lv)?.[1] ?? "";
  const info = sdvxPathInfo(link);
  if (!info) return null;
  const image = /chlv\/([^ >/]+)\.png/.exec(lv)?.[1] ?? "";
  const numbered = /^(?:bsc|adv|exp|mst|ult)_?(\d{1,2}\+?)$/.exec(image);
  // World's End: "new狂3" now; older pages "star_wari2", "hika3" (romaji).
  const worldsEnd =
    /^new(.+?)([1-5])$/u.exec(image) ??
    /^(?:[a-z]+_)?([a-z]+)([1-5])$/.exec(image);
  const kanji = worldsEnd?.[1]
    ? (WORLDS_END_ROMAJI[worldsEnd[1]] ??
      (/^[a-z]+$/.test(worldsEnd[1]) ? null : worldsEnd[1]))
    : null;
  const designer =
    htmlText(vars.get(`CR${key}`) ?? "").replace(
      /^NOTES DESIGNER\s*\/\s*/,
      "",
    ) || null;
  const chain = Number(
    htmlText(vars.get(`CH${key}`) ?? "").replace(/^CHAIN\s*/, ""),
  );
  return {
    difficulty: info.difficulty,
    path: link,
    level: numbered?.[1] ?? kanji,
    worldsEndStars: worldsEnd ? Number(worldsEnd[2]) : null,
    designer,
    chain: Number.isInteger(chain) && chain > 0 ? chain : null,
  };
}

/** A chart picture's three layers on sdvx.in (site paths), and the mirrored notes. */
export interface SdvxImages {
  bg: string;
  obj: string;
  bar: string;
  /** The notes drawn mirrored, where sdvx.in has them. */
  mirror: string | null;
}

const DIFFICULTY_SUFFIX: Record<Difficulty, string> = {
  basic: "B",
  advanced: "A",
  expert: "E",
  master: "M",
  ultima: "U",
  worldsend: "W",
};

/**
 * The script that draws a chart page: `<dir>/js/<id>data.js` for a song's charts,
 * the entry's own script for Ultima and World's End.
 */
export function sdvxImageScript(path: string): string | null {
  const info = sdvxPathInfo(path);
  if (!info) return null;
  if (info.dir === "end" || info.dir === "ult") return sdvxScriptUrl(path);
  return `/chunithm/${info.dir}/js/${info.entryId}data.js`;
}

const IMAGE = /src=(\/chunithm\/[A-Za-z0-9_/]+\.png)/g;

/** The layers a chart page draws (its PNG… and MRR… functions), read as text. */
export function parseSdvxImages(text: string, path: string): SdvxImages | null {
  const info = sdvxPathInfo(path);
  if (!info) return null;
  const endIndex = /end(\d*)$/.exec(path)?.[1] ?? "";
  const name = `${info.entryId}${DIFFICULTY_SUFFIX[info.difficulty]}${info.difficulty === "worldsend" ? endIndex : ""}`;
  const body = (fn: string) => {
    const start = text.indexOf(`function ${fn}${name}(){`);
    if (start === -1) return null;
    const end = text.indexOf("\n", start);
    return text.slice(start, end === -1 ? undefined : end);
  };
  const layers = (fn: string) => {
    const code = body(fn);
    if (!code) return null;
    const found = [...code.matchAll(IMAGE)].map((match) => match[1] ?? "");
    const bar = found.find((src) => /\/bg\/[^/]*bar\.png$/.test(src));
    const bg = found.find((src) => src.includes("/bg/") && src !== bar);
    const obj = found.find((src) => src.includes("/obj/"));
    return bg && obj && bar ? { bg, obj, bar } : null;
  };
  const normal = layers("PNG");
  if (!normal) return null;
  return { ...normal, mirror: layers("MRR")?.obj ?? null };
}
