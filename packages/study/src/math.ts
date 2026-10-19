/**
 * Maths in Markdown, rendered by KaTeX when the page is built (no JavaScript in the
 * browser): `$…$` inline, `$$…$$` on lines of its own for display. mhchem's `\ce{}`
 * and `\pu{}` work for chemistry.
 *
 * Like Pandoc, an inline `$` opens only when the next character isn't a space and
 * closes only after a non-space, not followed by a digit, so "$5 and $10" stays
 * text. `\$` is a dollar sign.
 */
import katex from "katex";
import "katex/contrib/mhchem";
import type {
  MarkdownIt as Markdown,
  StateBlock,
  StateInline,
} from "markdown-it";

export interface MathEnv {
  /** Formulas KaTeX couldn't read, with its message. */
  mathErrors?: string[];
}

/** Shorthands every lesson can use. */
export const MACROS: Readonly<Record<string, string>> = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\C": "\\mathbb{C}",
  "\\d": "\\mathrm{d}",
  "\\j": "\\mathrm{j}",
  "\\unit": "\\,\\mathrm{#1}",
  "\\phasor": "\\dot{#1}",
};

/**
 * Inline maths only wraps after relations and operators, so a long list such as
 * $R=\{\langle a,b\rangle, \langle b,c\rangle, …\}$ ran off a phone's screen. A
 * break is allowed after each comma outside braces (and not after `\,`).
 */
export function breakableTex(tex: string): string {
  let depth = 0;
  let out = "";
  for (let i = 0; i < tex.length; i += 1) {
    const char = tex[i] ?? "";
    if (char === "\\") {
      // A command or an escaped character (\{, \,) is copied whole.
      out += char + (tex[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") depth = Math.max(0, depth - 1);
    out += char;
    if (char === "," && depth === 0) out += "\\allowbreak ";
  }
  return out;
}

export function renderMath(
  tex: string,
  display: boolean,
  env?: MathEnv,
): string {
  try {
    return katex.renderToString(display ? tex : breakableTex(tex), {
      displayMode: display,
      throwOnError: true,
      output: "htmlAndMathml",
      strict: "ignore",
      trust: false,
      macros: { ...MACROS },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "it can't be read";
    env?.mathErrors?.push(`${tex}: ${message}`);
    const escaped = tex
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<code class="study-math-error" title="${message.replace(/"/g, "&quot;").replace(/</g, "&lt;")}">${escaped}</code>`;
  }
}

function inlineMath(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;
  // `$$…$$` inside a line: display style, but in the flow of text.
  const double = src.charCodeAt(pos + 1) === 0x24;
  const open = double ? 2 : 1;
  const first = src[pos + open];
  if (first === undefined || /\s/.test(first)) return false;
  let end = pos + open;
  for (;;) {
    end = src.indexOf(double ? "$$" : "$", end);
    if (end === -1) return false;
    if (src[end - 1] === "\\") {
      end += 1;
      continue;
    }
    const before = src[end - 1] ?? "";
    const after = src[end + open] ?? "";
    if (/\s/.test(before) || (!double && /\d/.test(after))) {
      end += 1;
      continue;
    }
    break;
  }
  const content = src.slice(pos + open, end);
  if (content.trim() === "") return false;
  if (!silent) {
    const token = state.push(
      double ? "math_display_inline" : "math_inline",
      "math",
      0,
    );
    token.content = content;
  }
  state.pos = end + open;
  return true;
}

function blockMath(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
  const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
  const firstLine = state.src.slice(start, state.eMarks[startLine]).trim();
  if (!firstLine.startsWith("$$")) return false;
  let content: string;
  let next = startLine;
  if (firstLine.length > 4 && firstLine.endsWith("$$")) {
    content = firstLine.slice(2, -2);
  } else {
    if (firstLine !== "$$" && firstLine.slice(2).includes("$$")) return false;
    const lines = [firstLine.slice(2)];
    let closed = false;
    for (next = startLine + 1; next < endLine; next += 1) {
      const line = state.src
        .slice(
          (state.bMarks[next] ?? 0) + (state.tShift[next] ?? 0),
          state.eMarks[next],
        )
        .trimEnd();
      if (line.endsWith("$$")) {
        lines.push(line.slice(0, -2));
        closed = true;
        break;
      }
      lines.push(line);
    }
    if (!closed) return false;
    content = lines.join("\n");
  }
  if (silent) return true;
  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.map = [startLine, next + 1];
  state.line = next + 1;
  return true;
}

export function mathPlugin(md: Markdown): void {
  md.inline.ruler.after("escape", "math_inline", inlineMath);
  md.block.ruler.before("fence", "math_block", blockMath, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.renderer.rules.math_inline = (tokens, idx, _options, env) =>
    renderMath(tokens[idx]?.content ?? "", false, env as MathEnv);
  md.renderer.rules.math_display_inline = (tokens, idx, _options, env) =>
    renderMath(tokens[idx]?.content ?? "", true, env as MathEnv);
  md.renderer.rules.math_block = (tokens, idx, _options, env) =>
    `<div class="study-math">${renderMath(tokens[idx]?.content ?? "", true, env as MathEnv)}</div>\n`;
}
