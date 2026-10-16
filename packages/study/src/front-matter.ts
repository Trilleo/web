/**
 * Front matter: `key: value` lines between `---` lines at the top of a file, and
 * lists as indented `- item` lines under a `key:` with nothing after it. Read by
 * hand; it's all study content needs (no YAML parser in the server bundle).
 */

export type FrontMatter = Record<string, string | string[]>;

export function parseFrontMatter(text: string): {
  data: FrontMatter;
  body: string;
} {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: normalized };
  const after = normalized.indexOf("\n", end + 4);
  const body = after === -1 ? "" : normalized.slice(after + 1);
  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (const line of normalized.slice(4, end).split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey !== null) {
      const list = data[listKey];
      if (Array.isArray(list)) list.push(unquote(item[1] ?? ""));
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body };
}

function unquote(value: string): string {
  const trimmed = value.trim();
  for (const quote of ['"', "'"])
    if (
      trimmed.length >= 2 &&
      trimmed.startsWith(quote) &&
      trimmed.endsWith(quote)
    )
      return trimmed.slice(1, -1);
  return trimmed;
}
