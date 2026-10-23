/**
 * Text with line numbers, highlighted by Shiki in the blog's theme (vesper; code is
 * dark in both site themes). Shiki runs on its JavaScript regex engine (no
 * WebAssembly) and loads each language's grammar only when a file needs it. Very long
 * files are shown plain: highlighting them would freeze the page.
 */
import { CopyButton } from "@trilleo/ui";
import type { HighlighterCore } from "shiki/core";
import { useEffect, useState } from "react";
import { toolButton } from "./common";
import { LANGUAGES } from "./languages";

/** Longer text is shown without highlighting. */
export const HIGHLIGHT_LIMIT = 400_000;

let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, vesper] =
      await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
        import("shiki/themes/vesper.mjs"),
      ]);
    return createHighlighterCore({
      themes: [vesper.default],
      langs: [],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  })();
  return highlighter;
}

/** Highlighted HTML (Shiki escapes the text itself), or null for plain text. */
export async function highlight(
  code: string,
  language: string,
): Promise<string | null> {
  if (language === "text" || code.length > HIGHLIGHT_LIMIT) return null;
  const load = LANGUAGES[language];
  if (!load) return null;
  const core = await getHighlighter();
  if (!core.getLoadedLanguages().includes(language))
    await core.loadLanguage((await load()).default);
  return core.codeToHtml(code, { lang: language, theme: "vesper" });
}

export function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language: string;
  label: string;
}) {
  // What was highlighted, so a change of text never shows the old highlighting.
  const [done, setDone] = useState<{
    code: string;
    html: string | null;
  } | null>(null);
  const [wrap, setWrap] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    highlight(code, language)
      .then((result) => {
        if (!controller.signal.aborted) setDone({ code, html: result });
      })
      .catch(() => {
        // Highlighting is a bonus: plain text is still shown.
      });
    return () => {
      controller.abort();
    };
  }, [code, language]);
  const html = done?.code === code ? done.html : null;

  const lines = code.length > HIGHLIGHT_LIMIT ? [] : code.split("\n");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={toolButton}
          aria-pressed={wrap}
          onClick={() => {
            setWrap(!wrap);
          }}
        >
          Wrap lines
        </button>
        <CopyButton value={code} label={`Copy ${label}`} />
        {code.length > HIGHLIGHT_LIMIT && (
          <span className="text-sm text-muted">
            Too long to highlight, so it&rsquo;s shown plain.
          </span>
        )}
      </div>
      <div
        className={`preview-code max-h-[75vh] overflow-auto border border-code-line bg-code-bg text-code-fg ${wrap ? "preview-code-wrap" : ""}`}
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls, and a scrollable region must be reachable by keyboard
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        {html ? (
          // Shiki's output: the text escaped into spans, nothing from the file as markup.
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : code.length > HIGHLIGHT_LIMIT ? (
          <pre className="shiki preview-code-plain">
            <code>{code}</code>
          </pre>
        ) : (
          <pre className="shiki">
            <code>
              {lines.map((line, index) => (
                <span key={index} className="line">
                  {line}
                  {index < lines.length - 1 ? "\n" : ""}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
