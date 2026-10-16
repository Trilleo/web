/**
 * Lessons' Markdown to HTML, when the site is built. Markdown with HTML off, maths
 * (math.ts), the study components (`::: define`, `::: quiz`, …), and headings
 * numbered like a textbook's: in lesson 2.3, `##` sections are 2.3.1, 2.3.2, and
 * `###` ones 2.3.1.1. Widgets come back as islands, with a placeholder
 * (`<study-island data-id>`) where the page mounts each one.
 */
import MarkdownIt, { type Env, type MarkdownIt as Markdown } from "markdown-it";
import {
  componentPlugin,
  type ComponentEnv,
  type ComponentHost,
  type ComponentState,
} from "@trilleo/wiki";
import {
  STUDY_COMPONENTS,
  STUDY_SET,
  slugify,
  type StudyResources,
} from "./components/blocks";
import { mathPlugin, type MathEnv } from "./math";
import type {
  CardEntry,
  FormulaEntry,
  GlossaryEntry,
  Heading,
  Island,
  RenderedLesson,
} from "./types";

export interface RendererOptions {
  /** Highlights a fenced code block (the site's Shiki); plain text without it. */
  highlight?: (code: string, lang: string) => string;
  /** A figure's address from its path in the lesson ("figures/bridge.webp"), or null if there's no such file. */
  figure?: (path: string) => string | null;
}

export interface LessonInput {
  /** The lesson's number, "2.3". */
  number: string;
  title: string;
  body: string;
}

/** Placeholders the renderer leaves for widgets. */
export const ISLAND_PATTERN =
  /<study-island data-id="([^"]+)"><\/study-island>\n?/g;

function createMarkdown(options: RendererOptions): Markdown {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    quotes: "“”‘’",
    ...(options.highlight && { highlight: options.highlight }),
  });
  md.use(mathPlugin);
  componentPlugin(md, STUDY_COMPONENTS);

  // Figures: paths inside the subject's figures/ folder become their built address.
  const renderImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, renderOptions, env, self) => {
    const token = tokens[idx];
    const src = String(token?.attrGet("src") ?? "");
    if (token && !/^https?:\/\//.test(src)) {
      const url = options.figure?.(src) ?? null;
      if (url === null) {
        // Reported with the components' errors (render() collects .wiki-error).
        return `<span class="wiki-error" role="note">Missing picture: ${md.utils.escapeHtml(src)}</span>`;
      }
      token.attrSet("src", url);
    }
    token?.attrSet("loading", "lazy");
    token?.attrSet("decoding", "async");
    return renderImage
      ? renderImage(tokens, idx, renderOptions, env, self)
      : self.renderToken(tokens, idx, renderOptions);
  };

  // Section numbers lead the heading's text (set by render() below).
  md.renderer.rules.heading_open = (all, idx, renderOptions, _env, self) => {
    const token = all[idx];
    const sectionNumber = String(token?.attrGet("data-number") ?? "");
    if (!token || !sectionNumber)
      return self.renderToken(all, idx, renderOptions);
    token.attrs = (token.attrs ?? []).filter(
      ([name]) => name !== "data-number",
    );
    return `${self.renderToken(all, idx, renderOptions)}<span class="study-secnum">${sectionNumber}</span> `;
  };

  // Tables scroll sideways inside the text column instead of widening the page.
  // They can take keyboard focus, for when they scroll.
  md.renderer.rules.table_open = () =>
    '<div class="study-table" tabindex="0" role="group" aria-label="Table"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";
  return md;
}

export interface LessonRenderer {
  render(lesson: LessonInput): RenderedLesson;
}

export function createRenderer(options: RendererOptions = {}): LessonRenderer {
  const md = createMarkdown(options);
  return {
    render({ number, title, body }) {
      const resources: StudyResources = { number, counters: new Map() };
      const host: ComponentHost = {
        href: (target) => target,
        link: () => undefined,
        imageUrl: () => null,
        resources: { study: resources },
      };
      const state: ComponentState = {
        sets: new Set([STUDY_SET]),
        pageTitle: title,
        categories: [],
        depth: 0,
        host,
      };
      const mathErrors: string[] = [];
      const env: ComponentEnv & MathEnv = { components: state, mathErrors };
      const tokens = md.parse(body, env as Env);

      // Numbered, slugged headings (top level only: components' own text isn't numbered).
      const toc: Heading[] = [];
      const used = new Set<string>();
      let section = 0;
      let subsection = 0;
      tokens.forEach((token, index) => {
        if (token.type !== "heading_open") return;
        const level = Number(token.tag.slice(1));
        const inline = tokens[index + 1];
        const text =
          inline?.children
            ?.map((child) => child.content)
            .join("")
            .trim() ?? "";
        if (level === 1 || level === 2) {
          // "#" is a section too: the lesson's title is the page's h1.
          token.tag = "h2";
          const close = tokens
            .slice(index)
            .find((t) => t.type === "heading_close");
          if (close) close.tag = "h2";
          section += 1;
          subsection = 0;
        } else if (level === 3) {
          subsection += 1;
        }
        const depth = level <= 2 ? 2 : level === 3 ? 3 : null;
        const sectionNumber =
          depth === 2
            ? `${number}.${String(section)}`
            : depth === 3
              ? `${number}.${String(section)}.${String(subsection)}`
              : "";
        let slug = slugify(text);
        while (used.has(slug)) slug = `${slug}-${String(used.size)}`;
        used.add(slug);
        token.attrSet("id", slug);
        if (depth && inline) {
          token.attrSet("data-number", sectionNumber);
          toc.push({ depth, slug, text, number: sectionNumber });
        }
      });
      const html = md.renderer.render(tokens, md.options, env as Env);
      const emitted = state.emitted ?? new Map<string, unknown[]>();
      const componentErrors = [
        ...html.matchAll(
          /class="wiki-error"[^>]*>(?:<span[^>]*>[^<]*<\/span>)?\s*([^<]*)</g,
        ),
      ].map((match) => (match[1] ?? "").trim());
      return {
        html,
        toc,
        glossary: (emitted.get("glossary") ?? []) as GlossaryEntry[],
        formulas: (emitted.get("formula") ?? []) as FormulaEntry[],
        cards: (emitted.get("card") ?? []) as CardEntry[],
        islands: (emitted.get("island") ?? []) as Island[],
        questions: resources.counters.get("questions") ?? 0,
        errors: [...mathErrors, ...componentErrors],
      };
    },
  };
}

/** HTML split at island placeholders: text, then { island }, text, … */
export function splitIslands(
  html: string,
  islands: readonly Island[],
): ({ kind: "html"; html: string } | { kind: "island"; island: Island })[] {
  const byId = new Map(islands.map((entry) => [entry.id, entry]));
  const parts: (
    { kind: "html"; html: string } | { kind: "island"; island: Island }
  )[] = [];
  let last = 0;
  for (const match of html.matchAll(ISLAND_PATTERN)) {
    parts.push({ kind: "html", html: html.slice(last, match.index) });
    const found = byId.get(match[1] ?? "");
    if (found) parts.push({ kind: "island", island: found });
    last = match.index + match[0].length;
  }
  parts.push({ kind: "html", html: html.slice(last) });
  return parts.filter((part) => part.kind === "island" || part.html !== "");
}

/** Subject-wide glossary: one entry per term (a definition wins over a mention). */
export function mergeGlossary(
  entries: readonly (GlossaryEntry & {
    lesson: string;
    lessonTitle: string;
    lessonNumber: string;
  })[],
): (GlossaryEntry & {
  lesson: string;
  lessonTitle: string;
  lessonNumber: string;
})[] {
  const byTerm = new Map<
    string,
    GlossaryEntry & {
      lesson: string;
      lessonTitle: string;
      lessonNumber: string;
    }
  >();
  for (const entry of entries) {
    const key = entry.term.toLowerCase();
    const known = byTerm.get(key);
    if (!known || (!known.definition && entry.definition))
      byTerm.set(key, { ...entry, zh: entry.zh ?? known?.zh ?? null });
    else if (!known.zh && entry.zh) known.zh = entry.zh;
  }
  return [...byTerm.values()].sort((a, b) =>
    a.term.localeCompare(b.term, "en"),
  );
}
