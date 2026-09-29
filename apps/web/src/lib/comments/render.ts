import MarkdownIt from "markdown-it";

/**
 * Comment formatting: a small, safe part of Markdown. Paragraphs and line breaks,
 * links (bare URLs too), `inline code`, fenced code blocks, *emphasis*, **strong**
 * and > quotes. Everything else (HTML, images, headings, lists, tables) shows as the
 * text that was typed. Comments are stored as typed and rendered for every view.
 */
const md = new MarkdownIt("zero", {
  html: false,
  linkify: true,
  breaks: true,
}).enable([
  "linkify",
  "newline",
  "escape",
  "entity",
  "backticks",
  "emphasis",
  "link",
  "autolink",
  "fence",
  "blockquote",
]);

// Bare email addresses stay text: no mailto: links.
md.linkify.set({ fuzzyEmail: false });

/** Web links and links within this site; never javascript:, data:, mailto:, //host … */
export function isAllowedLink(url: string): boolean {
  const href = url.trim();
  if (/^https?:\/\//i.test(href)) return true;
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}
md.validateLink = isAllowedLink;

// Commenters' links carry no endorsement and get no access to this page.
const renderLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet("rel", "nofollow ugc noopener noreferrer");
  return renderLinkOpen
    ? renderLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

/** A comment's HTML. Safe to insert as-is: nothing typed becomes markup by itself. */
export function renderComment(body: string): string {
  return md.render(body);
}
