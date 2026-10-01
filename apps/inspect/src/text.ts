export type TextEncodingName =
  "UTF-8" | "UTF-8 with BOM" | "UTF-16 LE" | "UTF-16 BE" | "ASCII";

export interface TextStats {
  encoding: TextEncodingName;
  lines: number;
  /** Characters (code points), not bytes. */
  characters: number;
  words: number;
  lineEndings: { crlf: number; lf: number; cr: number };
  longestLine: number;
}

/** Characters as Unicode counts them: an emoji outside the BMP is one, not two. */
function codePoints(text: string): number {
  return (
    text.length - (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0)
  );
}

export function encodingOf(bytes: Uint8Array): TextEncodingName {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return "UTF-8 with BOM";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "UTF-16 LE";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "UTF-16 BE";
  return bytes.every((byte) => byte < 0x80) ? "ASCII" : "UTF-8";
}

/** Counts for a text file's contents. */
export function textStats(bytes: Uint8Array): TextStats {
  const encoding = encodingOf(bytes);
  const label =
    encoding === "UTF-16 LE"
      ? "utf-16le"
      : encoding === "UTF-16 BE"
        ? "utf-16be"
        : "utf-8";
  const text = new TextDecoder(label).decode(bytes); // drops the BOM
  const lineEndings = { crlf: 0, lf: 0, cr: 0 };
  for (const match of text.matchAll(/\r\n|\n|\r/g)) {
    if (match[0] === "\r\n") lineEndings.crlf++;
    else if (match[0] === "\n") lineEndings.lf++;
    else lineEndings.cr++;
  }
  const lines = text.split(/\r\n|\n|\r/);
  // A final line ending doesn't start another line.
  if (lines.length > 1 && lines.at(-1) === "") lines.pop();
  return {
    encoding,
    lines: text.length === 0 ? 0 : lines.length,
    characters: codePoints(text),
    words: text.match(/\S+/g)?.length ?? 0,
    lineEndings,
    longestLine: lines.reduce(
      (longest, line) => Math.max(longest, codePoints(line)),
      0,
    ),
  };
}

/** "LF", "CRLF", "Mixed (CRLF, LF)" or "None". */
export function describeLineEndings(endings: TextStats["lineEndings"]): string {
  const used = (
    [
      ["CRLF", endings.crlf],
      ["LF", endings.lf],
      ["CR", endings.cr],
    ] as const
  ).filter(([, count]) => count > 0);
  if (used.length === 0) return "None";
  if (used.length === 1) return used[0]?.[0] ?? "None";
  return `Mixed (${used.map(([name]) => name).join(", ")})`;
}
