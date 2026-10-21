/**
 * Post formatting: Markdown without HTML or images. Paragraphs keep their line
 * breaks; headings start at h3 (the topic's title and the posts sit above them);
 * lists, tables, quotes, code and ~~strike~~ work; links are web or site links only,
 * marked nofollow ugc; @username becomes a link to that person's profile when the
 * caller says the account exists. Posts are rendered when saved (html is stored),
 * and again when FORUM_RENDER_VERSION moves on.
 */
import MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";

/** Bump when the HTML for the same text changes: stored posts re-render when read. */
export const FORUM_RENDER_VERSION = 1;

/** Web links and links within this site; never javascript:, data:, mailto:, //host … */
export function isAllowedLink(url: string): boolean {
  const href = url.trim();
  if (/^https?:\/\//i.test(href)) return true;
  if (href.startsWith("#")) return true;
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

/** Usernames as accounts have them (lower-case, 3–30, single hyphens). */
const MENTION =
  /(^|[^\p{L}\p{N}_@/.-])@([a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,29})(?![\p{L}\p{N}_-])/giu;

/** At most this many mentions in a post become links. */
export const MAX_MENTIONS = 20;

/** The usernames a post mentions (lower-cased, each once), for the caller to look up. */
export function extractMentions(body: string): string[] {
  // Code doesn't mention anyone.
  const text = body
    .replace(/^(```|~~~)[^]*?^\1/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    if (match[2]) found.add(match[2].toLowerCase());
    if (found.size >= MAX_MENTIONS) break;
  }
  return [...found];
}

interface RenderEnv {
  mentions: ReadonlySet<string>;
  profileHref: (username: string) => string;
}

const md = new MarkdownIt("default", {
  html: false,
  linkify: true,
  breaks: true,
}).disable(["image"]);
md.linkify.set({ fuzzyEmail: false });
md.validateLink = isAllowedLink;

const renderLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token && !token.attrGet("data-mention"))
    token.attrSet("rel", "nofollow ugc noopener noreferrer");
  return renderLinkOpen
    ? renderLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

// "#" is h3, "##" h4 …: the page's own headings come first.
md.core.ruler.push("forum_headings", (state) => {
  for (const token of state.tokens) {
    if (token.type === "heading_open" || token.type === "heading_close") {
      const level = Math.min(6, Number(token.tag.slice(1)) + 2);
      token.tag = `h${String(level)}`;
    }
  }
});

// @username → a link to their profile, for accounts the caller found.
md.core.ruler.push("forum_mentions", (state) => {
  const env = state.env as Partial<RenderEnv>;
  const { mentions, profileHref } = env;
  if (!mentions || mentions.size === 0 || !profileHref) return;
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    const children: Token[] = [];
    let inLink = 0;
    for (const child of block.children) {
      if (child.type === "link_open") inLink += 1;
      if (child.type === "link_close") inLink -= 1;
      if (child.type !== "text" || inLink > 0) {
        children.push(child);
        continue;
      }
      let last = 0;
      for (const match of child.content.matchAll(MENTION)) {
        const name = match[2]?.toLowerCase();
        if (!name || !mentions.has(name)) continue;
        const start = match.index + (match[1]?.length ?? 0);
        if (start > last) {
          const text = new state.Token("text", "", 0);
          text.content = child.content.slice(last, start);
          children.push(text);
        }
        const open = new state.Token("link_open", "a", 1);
        open.attrs = [
          ["href", profileHref(name)],
          ["class", "mention"],
          ["data-mention", name],
        ];
        const text = new state.Token("text", "", 0);
        text.content = `@${name}`;
        children.push(open, text, new state.Token("link_close", "a", -1));
        last = start + 1 + (match[2]?.length ?? 0);
      }
      if (last === 0) {
        children.push(child);
      } else if (last < child.content.length) {
        const text = new state.Token("text", "", 0);
        text.content = child.content.slice(last);
        children.push(text);
      }
    }
    block.children = children;
  }
});

export interface RenderOptions {
  /** Usernames (lower-case) that are accounts someone may link to. */
  mentions?: ReadonlySet<string>;
  profileHref?: (username: string) => string;
}

/** A post's HTML. Safe to insert as-is: nothing typed becomes markup by itself. */
export function renderForumPost(body: string, options: RenderOptions = {}) {
  const env: RenderEnv = {
    mentions: options.mentions ?? new Set(),
    profileHref:
      options.profileHref ?? ((name) => `/people/${encodeURIComponent(name)}/`),
  };
  return md.render(body, { ...env });
}

/** Line endings made consistent, and no leading or trailing blank space. */
export function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

/** Titles: one line, single spaces. */
export function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

/**
 * The start of a reply that quotes a post: who wrote it (linking to the post) and
 * what they wrote, without the quotes it held itself, so quotes don't pile up.
 */
export function quoteFor(
  post: { id: number; body: string },
  author: string | null,
  postHref: string,
): string {
  const lines = post.body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"));
  while (lines[0]?.trim() === "") lines.shift();
  const who = author ? `@${author}` : "Someone";
  const quoted = lines.map((line) => (line ? `> ${line}` : ">")).join("\n");
  return `> **[${who} wrote](${postHref}):**\n${quoted}\n\n`;
}

/** Visible text from rendered HTML: search results and descriptions. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first `length` characters of some text, cut at a word, with an ellipsis. */
export function excerpt(text: string, length = 160): string {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(" ");
  return `${(space > length * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
