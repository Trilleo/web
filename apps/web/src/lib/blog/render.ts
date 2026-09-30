/**
 * Renders a post's Markdown to HTML on the server, when it's saved (and for the editor's
 * preview). Astro's own renderer (Sätteri) is a native binary, which the self-contained
 * server bundle can't carry, so this is markdown-it + Shiki, set up to produce the same
 * HTML shape: GFM-style footnotes (which addSidenotes and .prose expect), slugged
 * heading ids, curly quotes, and code highlighted with the vesper theme.
 */
import GithubSlugger from "github-slugger";
import MarkdownIt, {
  type Env,
  type MarkdownIt as Markdown,
  type Token,
} from "markdown-it";
import footnote from "markdown-it-footnote";
import type { PostHeading } from "@trilleo/db";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import astro from "shiki/langs/astro.mjs";
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import diff from "shiki/langs/diff.mjs";
import docker from "shiki/langs/docker.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import ini from "shiki/langs/ini.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import markdownLang from "shiki/langs/markdown.mjs";
import python from "shiki/langs/python.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import toml from "shiki/langs/toml.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";
import vesper from "shiki/themes/vesper.mjs";

/**
 * Bump when the output changes (new syntax, different markup): posts rendered by an
 * older version are rendered again the next time they're read.
 */
export const RENDER_VERSION = 1;

export interface RenderedPost {
  html: string;
  /** h2 and h3 headings, in order, for the table of contents. */
  toc: PostHeading[];
}

const THEME = "vesper";

// A fixed set keeps the server bundle small; anything else renders as plain text.
let highlighter: Promise<HighlighterCore> | undefined;
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [vesper],
    langs: [
      astro,
      bash,
      css,
      diff,
      docker,
      go,
      html,
      ini,
      javascript,
      json,
      jsx,
      markdownLang,
      python,
      rust,
      sql,
      toml,
      tsx,
      typescript,
      yaml,
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A footnote's label as used in its ids: "Cache note" → "cache-note". */
function footnoteId(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .replace(/^-|-$/g, "") || "note"
  );
}

interface FootnoteMeta {
  id: number;
  subId?: number;
  label?: string;
}

function createMarkdown(shiki: HighlighterCore): Markdown {
  const md = new MarkdownIt({
    // Only the admin writes posts, so HTML is allowed (e.g. <figure>, <kbd>).
    html: true,
    linkify: true,
    typographer: true,
    quotes: "“”‘’",
    highlight(code, lang) {
      const name = lang.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const loaded = shiki.getLoadedLanguages();
      const language = loaded.includes(name) ? name : "text";
      return shiki
        .codeToHtml(code.replace(/\n$/, ""), { lang: language, theme: THEME })
        .replace(
          /^<pre class="shiki/,
          `<pre data-language="${escapeHtml(name || "plaintext")}" class="astro-code shiki`,
        );
    },
  });
  md.use(footnote);

  // The plugin keeps each note's label in env.footnotes.list; inline notes have none.
  const labelOf = (meta: FootnoteMeta, env: Env | undefined) => {
    const list = (
      env as { footnotes?: { list?: { label?: string }[] } } | undefined
    )?.footnotes?.list;
    return footnoteId(
      meta.label ?? list?.[meta.id]?.label ?? String(meta.id + 1),
    );
  };
  const metaOf = (tokens: Token[], idx: number) =>
    (tokens[idx]?.meta ?? { id: 0, subId: 0 }) as unknown as FootnoteMeta;

  // GFM's footnote markup (what Sätteri produced), instead of the plugin's own.
  md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => {
    const meta = metaOf(tokens, idx);
    const id = labelOf(meta, env);
    const refId =
      (meta.subId ?? 0) > 0
        ? `user-content-fnref-${id}-${String((meta.subId ?? 0) + 1)}`
        : `user-content-fnref-${id}`;
    return `<sup><a href="#user-content-fn-${id}" id="${refId}" data-footnote-ref aria-describedby="footnote-label">${String(meta.id + 1)}</a></sup>`;
  };
  md.renderer.rules.footnote_block_open = () =>
    '<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>\n<ol>\n';
  md.renderer.rules.footnote_block_close = () => "</ol>\n</section>\n";
  md.renderer.rules.footnote_open = (tokens, idx, _options, env) => {
    const meta = metaOf(tokens, idx);
    return `<li id="user-content-fn-${labelOf(meta, env)}">\n`;
  };
  md.renderer.rules.footnote_close = () => "</li>\n";
  md.renderer.rules.footnote_anchor = (tokens, idx, _options, env) => {
    const meta = metaOf(tokens, idx);
    const id = labelOf(meta, env);
    const subId = meta.subId ?? 0;
    const suffix = subId > 0 ? `-${String(subId + 1)}` : "";
    return ` <a href="#user-content-fnref-${id}${suffix}" data-footnote-backref="" aria-label="Back to reference ${String(meta.id + 1)}" class="data-footnote-backref">↩</a>`;
  };

  // Images load lazily: posts can be long and images are the heavy part.
  const renderImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    tokens[idx]?.attrSet("loading", "lazy");
    tokens[idx]?.attrSet("decoding", "async");
    return renderImage
      ? renderImage(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  return md;
}

let processor: Promise<Markdown> | undefined;

/** A post's HTML and table of contents. */
export async function renderPost(body: string): Promise<RenderedPost> {
  processor ??= getHighlighter().then(createMarkdown);
  const md = await processor;

  const env = {};
  const tokens = md.parse(body, env);

  // Heading ids, slugged the way GitHub (and Astro) do, unique within the post.
  const slugger = new GithubSlugger();
  const toc: PostHeading[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const inline = tokens[index + 1];
    const text =
      inline?.children
        ?.filter(
          (child) => child.type === "text" || child.type === "code_inline",
        )
        .map((child) => child.content)
        .join("") ?? "";
    const slug = slugger.slug(text);
    token.attrSet("id", slug);
    const depth = Number(token.tag.slice(1));
    if (depth === 2 || depth === 3) toc.push({ depth, slug, text });
  });

  return { html: md.renderer.render(tokens, md.options, env), toc };
}
