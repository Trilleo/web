/**
 * Rich Text Format, as plain paragraphs: control words for paragraphs, line breaks,
 * tabs, hex and Unicode characters are honoured; font tables, styles, pictures and
 * other destinations are skipped. Enough to read a document, not to see its styling.
 */

/** Groups whose contents aren't text. */
const SKIP = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "header",
  "footer",
  "headerl",
  "headerr",
  "footerl",
  "footerr",
  "listtable",
  "listoverridetable",
  "rsidtbl",
  "generator",
  "xmlnstbl",
  "themedata",
  "colorschememapping",
  "datastore",
  "latentstyles",
]);

/** Windows-1252's 0x80–0x9F (the rest of the high half matches Latin-1). */
const CP1252: Readonly<Record<number, string>> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
};

export function rtfToParagraphs(source: string): string[] {
  const paragraphs: string[] = [];
  let current = "";
  // One entry per open group: whether its text is skipped, and \ucN (characters
  // to skip after a \u).
  const stack: { skip: boolean; uc: number }[] = [{ skip: false, uc: 1 }];
  let pendingSkip = 0;
  let i = 0;
  const top = () => stack[stack.length - 1] ?? { skip: false, uc: 1 };
  const emit = (text: string) => {
    if (pendingSkip > 0) {
      pendingSkip--;
      return;
    }
    if (!top().skip) current += text;
  };

  while (i < source.length) {
    const char = source[i] ?? "";
    if (char === "{") {
      stack.push({ ...top() });
      i++;
      // {\*\destination …} is optional and unknown: skip it.
      if (source.startsWith("\\*", i)) top().skip = true;
      continue;
    }
    if (char === "}") {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }
    if (char === "\\") {
      const next = source[i + 1] ?? "";
      if (next === "'") {
        const code = parseInt(source.slice(i + 2, i + 4), 16);
        if (Number.isFinite(code))
          emit(CP1252[code] ?? String.fromCharCode(code));
        i += 4;
        continue;
      }
      if (!/[a-z]/i.test(next)) {
        // Control symbols: \\ \{ \} and a few spacing ones.
        if (next === "~") emit(" ");
        else if (next === "-" || next === "*") {
          // Optional hyphen, or a destination marker handled above.
        } else if (next === "\n" || next === "\r") {
          paragraphs.push(current);
          current = "";
        } else emit(next);
        i += 2;
        continue;
      }
      const match = /^\\([a-z]+)(-?\d+)? ?/i.exec(source.slice(i, i + 40));
      if (!match) {
        i++;
        continue;
      }
      i += match[0].length;
      const word = match[1] ?? "";
      const param = match[2] === undefined ? null : Number(match[2]);
      if (SKIP.has(word)) {
        top().skip = true;
        continue;
      }
      switch (word) {
        case "par":
        case "sect":
        case "page":
          if (!top().skip) {
            paragraphs.push(current);
            current = "";
          }
          break;
        case "line":
          emit("\n");
          break;
        case "tab":
          emit("\t");
          break;
        case "cell":
          emit("\t");
          break;
        case "row":
          if (!top().skip) {
            paragraphs.push(current);
            current = "";
          }
          break;
        case "uc":
          top().uc = param ?? 1;
          break;
        case "u": {
          const code = param ?? 0;
          emit(String.fromCharCode(code < 0 ? code + 65_536 : code));
          pendingSkip = top().uc;
          break;
        }
        case "emdash":
          emit("—");
          break;
        case "endash":
          emit("–");
          break;
        case "bullet":
          emit("•");
          break;
        case "lquote":
          emit("‘");
          break;
        case "rquote":
          emit("’");
          break;
        case "ldblquote":
          emit("“");
          break;
        case "rdblquote":
          emit("”");
          break;
        default:
          break;
      }
      continue;
    }
    if (char === "\n" || char === "\r") {
      i++;
      continue;
    }
    emit(char);
    i++;
  }
  if (current) paragraphs.push(current);
  return paragraphs.map((p) => p.replace(/\s+$/u, ""));
}
