import MarkdownIt from "markdown-it";

/**
 * A note's preview. Full Markdown (headings, lists, tables…) since notes are the
 * writer's own, but no raw HTML, no images (nothing loads from other sites), and only
 * web or on-site links.
 */
const md = new MarkdownIt("default", {
  html: false,
  linkify: true,
  breaks: true,
}).disable("image");
md.linkify.set({ fuzzyEmail: false });
md.validateLink = (url) => {
  const href = url.trim();
  return (
    /^https?:\/\//i.test(href) ||
    (href.startsWith("/") && !href.startsWith("//")) ||
    href.startsWith("#")
  );
};

const renderLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet("rel", "noopener noreferrer");
  tokens[idx]?.attrSet("target", "_blank");
  return renderLinkOpen
    ? renderLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

export function renderNote(body: string): string {
  return md.render(body);
}
