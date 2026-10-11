/**
 * A wiki's recipes (@trilleo/wiki's `::: recipe`): recorded when the pages that write
 * them are saved (wiki_recipes), looked up by what they make for the materials
 * calculator (cached per wiki until a recipe changes), and listed on Item: pages
 * ("Made with", "Used in").
 */
import { wikiLinks, wikiPages, wikiRecipes, type Database } from "@trilleo/db";
import {
  ingredientTotals,
  itemKey,
  type RecipeData,
  type RecipeLookup,
} from "@trilleo/wiki";
import { and, arrayContains, asc, eq, inArray, isNull } from "drizzle-orm";
import { NAMESPACES, titleKey } from "./titles";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export type StoredRecipe = RecipeData & { html: string };

function isRecipe(value: unknown): value is StoredRecipe {
  return (
    typeof value === "object" &&
    value !== null &&
    "station" in value &&
    "slots" in value &&
    "output" in value &&
    "html" in value &&
    Array.isArray(value.slots)
  );
}

const cache = new Map<number, Promise<ReadonlyMap<string, RecipeData>>>();

/** Recipes by what they make (the first saved, when there are several). */
export async function recipeLookup(
  db: Db,
  wiki: { id: number },
): Promise<RecipeLookup> {
  let recipes = cache.get(wiki.id);
  if (!recipes) {
    recipes = db
      .select({ key: wikiRecipes.outputKey, data: wikiRecipes.data })
      .from(wikiRecipes)
      .where(eq(wikiRecipes.wikiId, wiki.id))
      .orderBy(asc(wikiRecipes.id))
      .then((rows) => {
        const map = new Map<string, RecipeData>();
        for (const row of rows)
          if (isRecipe(row.data) && !map.has(row.key))
            map.set(row.key, row.data);
        return map;
      });
    cache.set(wiki.id, recipes);
    recipes.catch(() => cache.delete(wiki.id));
  }
  const map = await recipes;
  return (key) => map.get(key) ?? null;
}

/** Pages showing an item link to its Item: page (or its own page, if generated). */
function itemPageKeys(name: string): string[] {
  const plain = name.trim();
  return [titleKey(`${NAMESPACES.item}:${plain}`), titleKey(plain)];
}

/**
 * Keeps wiki_recipes in step with a page's recipes. When they change, pages that
 * might show them (materials calculators link the items they follow) render again.
 */
export async function recordRecipes(
  db: Db,
  page: { id: number; wikiId: number },
  recipes: readonly StoredRecipe[],
): Promise<void> {
  const before = await db
    .select({ outputKey: wikiRecipes.outputKey, data: wikiRecipes.data })
    .from(wikiRecipes)
    .where(eq(wikiRecipes.pageId, page.id))
    .orderBy(asc(wikiRecipes.position));
  // The panels' HTML changes on every render (its ids); compare the recipes.
  const essence = (recipe: unknown) => {
    if (!isRecipe(recipe)) return null;
    return JSON.stringify({ ...recipe, html: undefined });
  };
  if (
    before.length === recipes.length &&
    before.every((row, i) => essence(row.data) === essence(recipes[i]))
  ) {
    // Same recipes: keep the newest panels without a fuss.
    if (recipes.length > 0) {
      await db.delete(wikiRecipes).where(eq(wikiRecipes.pageId, page.id));
      await insert(db, page, recipes);
    }
    return;
  }
  await db.delete(wikiRecipes).where(eq(wikiRecipes.pageId, page.id));
  if (recipes.length > 0) await insert(db, page, recipes);
  cache.delete(page.wikiId);
  const outputs = new Set<string>();
  for (const recipe of [...before.map((row) => row.data), ...recipes])
    if (isRecipe(recipe)) outputs.add(recipe.output.name);
  const keys = [...outputs].flatMap(itemPageKeys);
  if (keys.length === 0) return;
  const linking = db
    .select({ id: wikiLinks.pageId })
    .from(wikiLinks)
    .where(
      and(
        eq(wikiLinks.wikiId, page.wikiId),
        inArray(wikiLinks.targetKey, keys),
      ),
    );
  await db
    .update(wikiPages)
    .set({ renderVersion: 0 })
    .where(inArray(wikiPages.id, linking));
}

async function insert(
  db: Db,
  page: { id: number; wikiId: number },
  recipes: readonly StoredRecipe[],
): Promise<void> {
  await db.insert(wikiRecipes).values(
    recipes.map((recipe, position) => ({
      wikiId: page.wikiId,
      pageId: page.id,
      position,
      outputKey: itemKey(recipe.output.name),
      inputKeys: [...ingredientTotals(recipe).keys()],
      data: { ...recipe },
    })),
  );
}

export interface ItemRecipes {
  /** Recipes that make it, with the page each is written on. */
  makes: { recipe: StoredRecipe; page: string }[];
  /** Recipes it goes into. */
  uses: { recipe: StoredRecipe; page: string }[];
}

/** The recipes an Item: page lists. */
export async function recipesForItem(
  db: Database,
  wikiId: number,
  key: string,
): Promise<ItemRecipes> {
  const select = () =>
    db
      .select({ data: wikiRecipes.data, page: wikiPages.title })
      .from(wikiRecipes)
      .innerJoin(wikiPages, eq(wikiPages.id, wikiRecipes.pageId))
      .$dynamic();
  const live = isNull(wikiPages.deletedAt);
  const makes = await select()
    .where(
      and(eq(wikiRecipes.wikiId, wikiId), eq(wikiRecipes.outputKey, key), live),
    )
    .orderBy(asc(wikiRecipes.id))
    .limit(50);
  const uses = await select()
    .where(
      and(
        eq(wikiRecipes.wikiId, wikiId),
        arrayContains(wikiRecipes.inputKeys, [key]),
        live,
      ),
    )
    .orderBy(asc(wikiRecipes.id))
    .limit(100);
  const keep = (rows: { data: unknown; page: string }[]) =>
    rows.flatMap((row) =>
      isRecipe(row.data) ? [{ recipe: row.data, page: row.page }] : [],
    );
  return { makes: keep(makes), uses: keep(uses) };
}
