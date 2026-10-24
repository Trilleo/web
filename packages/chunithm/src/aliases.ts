/**
 * Aliases: other names a song goes by (community nicknames, translations, short
 * forms), searched like its title. Pure rules: cleaning a name someone typed, and
 * reading the lists the admin imports in bulk.
 */
import { matchKey } from "./text";

export const ALIAS_LIMITS = {
  maxLength: 60,
  /** Aliases one song may have. */
  perSong: 40,
  /** Aliases one bulk import may add. */
  perImport: 5000,
};

export type AliasProblem = "empty" | "too-long" | "no-letters";

export const ALIAS_PROBLEMS: Record<AliasProblem, string> = {
  empty: "Type a name.",
  "too-long": `Keep it under ${String(ALIAS_LIMITS.maxLength)} characters.`,
  "no-letters": "A name needs letters or digits, not only punctuation.",
};

/**
 * A name as typed, tidied (spaces collapsed, controls dropped), with the key it's
 * matched by; or what's wrong with it.
 */
export function cleanAlias(
  text: string,
):
  | { ok: true; alias: string; key: string }
  | { ok: false; problem: AliasProblem } {
  const alias = text
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!alias) return { ok: false, problem: "empty" };
  if (alias.length > ALIAS_LIMITS.maxLength)
    return { ok: false, problem: "too-long" };
  const key = matchKey(alias);
  if (!key) return { ok: false, problem: "no-letters" };
  return { ok: true, alias, key };
}

export interface AliasImport {
  entries: { songId: number; alias: string }[];
  /** Lines or items that couldn't be read, in words. */
  problems: string[];
}

function songIdOf(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(n) && n > 0 && n < 1_000_000 ? n : null;
}

/**
 * A bulk list of aliases, in any of the shapes community lists come in:
 *
 * - JSON object: `{ "2710": ["神谕", "oracle"] }` (a single string works too);
 * - JSON array: `[{ "id": 2710, "aliases": ["神谕"] }]` (`songId`, `alias` too);
 * - lines: `2710<TAB>神谕<TAB>oracle` (tabs between names).
 */
export function parseAliasImport(text: string): AliasImport {
  const entries: AliasImport["entries"] = [];
  const problems: string[] = [];
  const add = (id: unknown, names: unknown, where: string) => {
    const songId = songIdOf(id);
    const list = Array.isArray(names) ? names : [names];
    if (songId === null) {
      problems.push(`${where}: no song ID.`);
      return;
    }
    for (const name of list)
      if (typeof name === "string" && name.trim())
        entries.push({ songId, alias: name });
      else problems.push(`${where}: a name that isn't text.`);
  };
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { entries, problems: ["That isn't valid JSON."] };
    }
    if (Array.isArray(data))
      data.forEach((item: unknown, index) => {
        const record =
          typeof item === "object" && item !== null
            ? (item as Record<string, unknown>)
            : {};
        add(
          record.id ?? record.songId,
          record.aliases ?? record.alias,
          `Item ${String(index + 1)}`,
        );
      });
    else
      for (const [id, names] of Object.entries(data as Record<string, unknown>))
        add(id, names, `"${id}"`);
  } else {
    trimmed.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return;
      const [id, ...names] = line.split("\t");
      if (names.length === 0)
        problems.push(
          `Line ${String(index + 1)}: no tab between the ID and a name.`,
        );
      else add(id, names, `Line ${String(index + 1)}`);
    });
  }
  return { entries: entries.slice(0, ALIAS_LIMITS.perImport), problems };
}
