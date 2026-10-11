/** Renders components the way a wiki would, for tests (never bundled). */
import MarkdownIt from "markdown-it";
import { demoLookup } from "./minecraft/items";
import { componentPlugin, type ComponentEnv } from "./plugin";
import { COMPONENTS } from "./registry";

const md = new MarkdownIt({ html: false, linkify: true });
md.validateLink = (url) =>
  url.startsWith("https://files.trilleo.net/") || url.startsWith("/");
componentPlugin(md, COMPONENTS);

export const linked: string[] = [];

export function render(
  source: string,
  sets = ["core", "minecraft"],
  pageTitle = "Wheat",
): { html: string; env: ComponentEnv } {
  const env: ComponentEnv = {
    components: {
      sets: new Set(sets),
      pageTitle,
      categories: [],
      depth: 0,
      host: {
        href: (title) => `/sky/${title.replace(/ /g, "_")}`,
        link: (title) => {
          linked.push(title);
        },
        imageUrl: (url) =>
          url.startsWith("https://files.trilleo.net/") ? url : null,
        resources: { items: demoLookup },
      },
    },
  };
  return { html: md.render(source, env), env };
}
