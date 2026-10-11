/**
 * A wiki's generated pages (sources/), rendered once per server and kept in memory:
 * they only change when the code does, which means a new release.
 */
import type { Wiki } from "@trilleo/db";
import { itemKey } from "@trilleo/wiki";
import { generatedItems } from "./items";
import { renderWikiPage, type RenderedWikiPage } from "./render";
import { sourceFor, type WikiSource } from "./sources";
import { titleKey } from "./titles";

export interface GeneratedWikiPage {
  key: string;
  title: string;
  rendered: RenderedWikiPage;
}

export interface GeneratedSet {
  source: WikiSource;
  pages: ReadonlyMap<string, GeneratedWikiPage>;
}

const cache = new Map<string, Promise<GeneratedSet>>();

async function build(
  source: WikiSource,
  wiki: Pick<Wiki, "slug" | "source" | "componentSets">,
): Promise<GeneratedSet> {
  const pages = new Map<string, GeneratedWikiPage>();
  // Generated pages show generated items (written Item: pages don't change them).
  const items = generatedItems(wiki);
  const componentSets = [
    ...new Set([...wiki.componentSets, ...(source.componentSets ?? [])]),
  ];
  for (const page of source.pages()) {
    const key = titleKey(page.title);
    if (pages.has(key))
      throw new Error(`${source.id}: two generated pages titled ${page.title}`);
    pages.set(key, {
      key,
      title: page.title,
      rendered: await renderWikiPage(page.body, {
        slug: wiki.slug,
        title: page.title,
        componentSets,
        items: (name) => items.get(itemKey(name)) ?? null,
      }),
    });
  }
  return { source, pages };
}

/** The wiki's generated pages by key, or null if it has no source. */
export function generatedPages(
  wiki: Pick<Wiki, "slug" | "source" | "componentSets">,
): Promise<GeneratedSet> | null {
  const source = sourceFor(wiki.source);
  if (!source) return null;
  // Switching a component set on or off renders them again.
  const id = `${source.id}:${wiki.slug}:${[...wiki.componentSets].sort().join(",")}`;
  let set = cache.get(id);
  if (!set) {
    set = build(source, wiki);
    cache.set(id, set);
    set.catch(() => cache.delete(id));
  }
  return set;
}

/** One generated page, if the wiki has it. */
export async function generatedPage(
  wiki: Pick<Wiki, "slug" | "source" | "componentSets">,
  key: string,
): Promise<GeneratedWikiPage | null> {
  const set = await generatedPages(wiki);
  return set?.pages.get(key) ?? null;
}
