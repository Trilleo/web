import MarkdownIt from "markdown-it";
import { isAllowedLink } from "../comments/render";

/**
 * Formatting for project descriptions and changelogs: comment Markdown (links, code,
 * emphasis, quotes) plus headings, lists, tables and strikethrough. Raw HTML stays
 * text. Images are allowed only from the project's own published gallery (it's
 * reviewed like any upload), so a description can't pull in pictures from elsewhere.
 * Rendered when saved; bump MC_RENDER_VERSION when the output changes.
 */
export const MC_RENDER_VERSION = 1;

/** What rendering passes to the rules (markdown-it's env is an open record). */
type RenderEnv = Record<string, unknown> & { images?: ReadonlySet<string> };

const md = new MarkdownIt("zero", {
  html: false,
  linkify: true,
  breaks: false,
}).enable([
  "linkify",
  "newline",
  "escape",
  "entity",
  "backticks",
  "emphasis",
  "strikethrough",
  "link",
  "autolink",
  "image",
  "fence",
  "code",
  "blockquote",
  "heading",
  "lheading",
  "list",
  "table",
  "hr",
]);

md.linkify.set({ fuzzyEmail: false });
md.validateLink = isAllowedLink;

const rules = md.renderer.rules;

const renderLinkOpen = rules.link_open;
rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet("rel", "nofollow ugc noopener noreferrer");
  return renderLinkOpen
    ? renderLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

// The page has the project's name as its h1: headings start at h2 and stop at h4.
const level = (tag: string) =>
  `h${String(Math.min(4, Math.max(2, Number(tag.slice(1)) + 1)))}`;
rules.heading_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
  if (token) token.tag = level(token.tag);
  return self.renderToken(tokens, idx, options);
};
rules.heading_close = rules.heading_open;

// Gallery images only; anything else shows as its alt text.
rules.image = (tokens, idx, _options, env?: RenderEnv) => {
  const token = tokens[idx];
  if (!token) return "";
  const src = String(token.attrGet("src") ?? "");
  const alt = md.utils.escapeHtml(token.content);
  if (!env?.images?.has(src)) return alt;
  return `<img src="${md.utils.escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async">`;
};

// Tables can be wide: let them scroll inside the text column.
rules.table_open = () => '<div class="table-scroll"><table>\n';
rules.table_close = () => "</table></div>\n";

/**
 * A description's or changelog's HTML, safe to insert as-is. `images` are the full
 * URLs of the project's published gallery images.
 */
export function renderMarkdown(
  source: string,
  images: ReadonlySet<string> = new Set(),
): string {
  const env: RenderEnv = { images };
  return md.render(source, env);
}

/** Plain text from Markdown, for meta descriptions and search snippets. */
export function plainText(source: string, max = 300): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[`*_>~|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
