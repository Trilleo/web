/**
 * A wiki's items, for the minecraft components: the ones its Item: pages describe
 * (wiki_items, kept when those pages are saved) and the ones its source generates
 * (Skygrid's). Loaded once per wiki and kept in memory until an item changes here;
 * pages that show an item are rendered again when it changes (their links say so).
 */
import { wikiItems, wikiLinks, wikiPages, type Database } from "@trilleo/db";
import { itemKey, type ItemData, type ItemLookup } from "@trilleo/wiki";
import { and, eq, inArray } from "drizzle-orm";
import type { WikiRef } from "./store";
import { sourceFor } from "./sources";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const cache = new Map<number, Promise<ReadonlyMap<string, ItemData>>>();

/** Items generated from the wiki's source, by key. */
export function generatedItems(
  wiki: Pick<WikiRef, "source">,
): ReadonlyMap<string, ItemData> {
  const source = sourceFor(wiki.source);
  return new Map((source?.items?.() ?? []).map((item) => [item.key, item]));
}

function isItemData(value: unknown): value is ItemData {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    "name" in value &&
    "page" in value &&
    "lore" in value &&
    Array.isArray(value.lore)
  );
}

async function load(
  db: Db,
  wiki: Pick<WikiRef, "id" | "source">,
): Promise<ReadonlyMap<string, ItemData>> {
  const items = new Map(generatedItems(wiki));
  const rows = await db
    .select({ key: wikiItems.key, data: wikiItems.data })
    .from(wikiItems)
    .where(eq(wikiItems.wikiId, wiki.id));
  // Written items win over generated ones of the same name.
  for (const row of rows)
    if (isItemData(row.data)) items.set(row.key, row.data);
  return items;
}

/** Finds the wiki's items by name. */
export async function itemLookup(
  db: Db,
  wiki: Pick<WikiRef, "id" | "source">,
): Promise<ItemLookup> {
  let items = cache.get(wiki.id);
  if (!items) {
    items = load(db, wiki);
    cache.set(wiki.id, items);
    items.catch(() => cache.delete(wiki.id));
  }
  const map = await items;
  return (name) => map.get(itemKey(name)) ?? null;
}

/** All of the wiki's items, by name. */
export async function allItems(
  db: Db,
  wiki: Pick<WikiRef, "id" | "source">,
): Promise<ItemData[]> {
  await itemLookup(db, wiki);
  const map = (await cache.get(wiki.id)) ?? new Map<string, ItemData>();
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, "en"));
}

export function forgetItems(wikiId: number): void {
  cache.delete(wikiId);
}

/**
 * Keeps wiki_items in step with a page: its item (an Item: page that describes one)
 * or none. When the item changes, the pages that show it are marked to render again.
 */
export async function recordItem(
  db: Db,
  page: { id: number; wikiId: number; key: string },
  item: ItemData | null,
  now = new Date(),
): Promise<void> {
  const [before] = await db
    .select({ key: wikiItems.key, data: wikiItems.data })
    .from(wikiItems)
    .where(eq(wikiItems.pageId, page.id))
    .limit(1);
  if (!item && !before) return;
  if (item && before && JSON.stringify(before.data) === JSON.stringify(item))
    return;
  await db.delete(wikiItems).where(eq(wikiItems.pageId, page.id));
  if (item) {
    // Another page with the same item name gives way to this one.
    await db
      .delete(wikiItems)
      .where(
        and(eq(wikiItems.wikiId, page.wikiId), eq(wikiItems.key, item.key)),
      );
    await db.insert(wikiItems).values({
      wikiId: page.wikiId,
      key: item.key,
      pageId: page.id,
      data: { ...item },
      updatedAt: now,
    });
  }
  forgetItems(page.wikiId);
  // Pages showing it link to its page: render them again when they're next read.
  const linking = db
    .select({ id: wikiLinks.pageId })
    .from(wikiLinks)
    .where(
      and(eq(wikiLinks.wikiId, page.wikiId), eq(wikiLinks.targetKey, page.key)),
    );
  await db
    .update(wikiPages)
    .set({ renderVersion: 0 })
    .where(inArray(wikiPages.id, linking));
}

/** The key an Item: page's item is found by. */
export function itemKeyOfPage(title: string): string {
  return itemKey(title.slice(title.indexOf(":") + 1));
}
