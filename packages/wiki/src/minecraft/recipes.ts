/**
 * Recipes: what a `::: recipe` block says (a station, its grid, ingredients by slot,
 * what it makes, how long it takes), and the raw-materials computation that follows
 * a wiki's recipes down to things nobody crafts. Pure: the server and the browser
 * (the calculator's script) share it.
 */
import { itemKey } from "./items";

export interface Ingredient {
  /** As written (may hold § codes); looked up by itemKey. */
  name: string;
  count: number;
}

export interface RecipeData {
  station: string;
  /** Grid columns and rows; 0×0 for a shapeless list. */
  columns: number;
  rows: number;
  /** Slot (from 0) → ingredient, for grids; in order, for lists. */
  slots: (Ingredient | null)[];
  output: Ingredient;
  /** "4h", "10 s": as written. */
  time: string | null;
}

/** Stations whose grid people know, when the block doesn't say. */
const STATION_GRIDS: Readonly<Record<string, readonly [number, number]>> = {
  "crafting table": [3, 3],
  crafting: [3, 3],
  "inventory crafting": [2, 2],
  furnace: [1, 1],
  "blast furnace": [1, 1],
  smoker: [1, 1],
  campfire: [1, 1],
  stonecutter: [1, 1],
  "smithing table": [3, 1],
  anvil: [2, 1],
};

const COUNT = /\s*[x×]\s*(\d{1,6})\s*$/i;
export const GRID_MAX = 6;

export function parseIngredient(text: string): Ingredient | null {
  const match = COUNT.exec(text);
  const name = (match ? text.slice(0, match.index) : text).trim();
  if (!name) return null;
  return { name, count: match?.[1] ? Number(match[1]) : 1 };
}

/** The block's argument: "Forge 2x1, 4h" → station, grid, time. */
export function parseRecipeHeader(argument: string): {
  station: string;
  columns: number | null;
  rows: number | null;
  time: string | null;
} {
  const [head = "", ...rest] = argument.split(",");
  const time = rest.join(",").trim() || null;
  const size = /\s+(\d{1,2})\s*[x×]\s*(\d{1,2})\s*$/i.exec(head);
  const station =
    (size ? head.slice(0, size.index) : head).trim() || "Crafting Table";
  if (size?.[1] && size[2])
    return { station, columns: Number(size[1]), rows: Number(size[2]), time };
  const known = STATION_GRIDS[station.toLowerCase()];
  return {
    station,
    columns: known ? known[0] : null,
    rows: known ? known[1] : null,
    time,
  };
}

/** A recipe block, or the problems that stop it being one. */
export function parseRecipe(
  argument: string,
  body: string,
): { recipe: RecipeData | null; problems: string[] } {
  const header = parseRecipeHeader(argument);
  const problems: string[] = [];
  let output: Ingredient | null = null;
  let time = header.time;
  const listed: Ingredient[] = [];
  const placed = new Map<number, Ingredient>();
  let columns = header.columns ?? 0;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const field = /^(makes|time)\s*:\s*(.+)$/i.exec(line);
    if (field?.[1] && field[2]) {
      if (field[1].toLowerCase() === "makes")
        output = parseIngredient(field[2]);
      else time = field[2].trim();
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet?.[1]) {
      const ingredient = parseIngredient(bullet[1]);
      if (ingredient) listed.push(ingredient);
      continue;
    }
    const row = /^row\s+(\d{1,2})\s*:\s*(.*)$/i.exec(line);
    if (row?.[1]) {
      if (!columns) {
        problems.push("Rows need a grid size: ::: recipe Station 3x3");
        continue;
      }
      const start = (Number(row[1]) - 1) * columns;
      (row[2] ?? "").split(",").forEach((cell, offset) => {
        const ingredient = parseIngredient(cell);
        if (ingredient && offset < columns)
          placed.set(start + offset, ingredient);
      });
      continue;
    }
    const slot = /^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*:\s*(.+)$/.exec(line);
    if (slot?.[1] && slot[3]) {
      const ingredient = parseIngredient(slot[3]);
      const from = Number(slot[1]);
      const to = slot[2] ? Number(slot[2]) : from;
      if (ingredient)
        for (let n = from; n <= Math.min(to, from + 36); n += 1)
          placed.set(n - 1, ingredient);
      continue;
    }
    problems.push(
      `“${line}” isn't a recipe line (\`5: Item\`, \`row 2: A, B\`, \`- Item x2\`, \`makes: Item\` or \`time: 10s\`).`,
    );
  }
  if (!output) problems.push("Say what it makes: `makes: Item x1`.");
  if (placed.size > 0 && listed.length > 0)
    problems.push("Use slots or a list (`- Item`), not both.");

  let rows = header.rows ?? 0;
  let slots: (Ingredient | null)[];
  if (placed.size > 0) {
    if (!columns) {
      // Slots without a known grid: one row, as wide as the last slot.
      columns = Math.max(...placed.keys()) + 1;
      rows = 1;
    }
    if (!rows) rows = Math.ceil((Math.max(...placed.keys()) + 1) / columns);
    if (columns > GRID_MAX || rows > GRID_MAX)
      problems.push(
        `Grids can be up to ${String(GRID_MAX)}×${String(GRID_MAX)}.`,
      );
    slots = Array.from(
      { length: columns * rows },
      (_, i) => placed.get(i) ?? null,
    );
    if (Math.max(...placed.keys()) >= columns * rows)
      problems.push(
        `A slot is outside the ${String(columns)}×${String(rows)} grid.`,
      );
  } else {
    columns = 0;
    rows = 0;
    slots = listed;
  }
  if (slots.every((slot) => slot === null))
    problems.push("Add what goes in: `1: Item`, `row 1: A, B` or `- Item x2`.");
  if (problems.length > 0 || !output) return { recipe: null, problems };
  return {
    recipe: { station: header.station, columns, rows, slots, output, time },
    problems,
  };
}

/** A recipe's ingredients added up: item key → (name, count per craft). */
export function ingredientTotals(recipe: RecipeData): Map<string, Ingredient> {
  const totals = new Map<string, Ingredient>();
  for (const slot of recipe.slots) {
    if (!slot) continue;
    const key = itemKey(slot.name);
    const before = totals.get(key);
    totals.set(key, {
      name: before?.name ?? slot.name,
      count: (before?.count ?? 0) + slot.count,
    });
  }
  return totals;
}

/** What the materials calculator needs: recipes by the key of what they make. */
export type RecipeBook = Readonly<Record<string, RecipeData>>;

export interface MaterialNode {
  key: string;
  name: string;
  /** How many are needed here (after what's already on hand). */
  count: number;
  /** Times its recipe is made (0 for a raw material). */
  crafts: number;
  /** What one craft gives. */
  makes: number;
  station: string | null;
  children: MaterialNode[];
  /** Its recipe leads back to itself further up. */
  loop?: boolean;
}

export interface MaterialsResult {
  tree: MaterialNode;
  /** Things nobody crafts (or a loop stopped), with totals: key → (name, count). */
  raw: Map<string, Ingredient>;
}

const DEPTH_MAX = 24;

/**
 * Everything it takes to make `count` of an item, following the book's recipes.
 * `have` (key → count) is used up as the tree is walked: what's on hand isn't made.
 */
export function computeMaterials(
  book: RecipeBook,
  name: string,
  count: number,
  have: ReadonlyMap<string, number> = new Map(),
): MaterialsResult {
  const left = new Map(have);
  const raw = new Map<string, Ingredient>();
  const walk = (
    itemName: string,
    needed: number,
    path: readonly string[],
  ): MaterialNode => {
    const key = itemKey(itemName);
    const onHand = left.get(key) ?? 0;
    const used = Math.min(onHand, needed);
    if (used > 0) left.set(key, onHand - used);
    const remaining = needed - used;
    const recipe = book[key];
    const loop = path.includes(key);
    if (!recipe || remaining === 0 || loop || path.length >= DEPTH_MAX) {
      if (remaining > 0) {
        const before = raw.get(key);
        raw.set(key, {
          name: before?.name ?? itemName,
          count: (before?.count ?? 0) + remaining,
        });
      }
      return {
        key,
        name: itemName,
        count: remaining,
        crafts: 0,
        makes: recipe?.output.count ?? 1,
        station: null,
        children: [],
        ...(loop ? { loop: true } : {}),
      };
    }
    const crafts = Math.ceil(remaining / recipe.output.count);
    const children = [...ingredientTotals(recipe).values()].map((ingredient) =>
      walk(ingredient.name, ingredient.count * crafts, [...path, key]),
    );
    return {
      key,
      name: itemName,
      count: remaining,
      crafts,
      makes: recipe.output.count,
      station: recipe.station,
      children,
    };
  };
  return { tree: walk(name, Math.max(0, Math.floor(count)), []), raw };
}

/** The recipes reachable from an item (what the calculator's script needs). */
export function bookFor(
  lookup: (key: string) => RecipeData | null,
  name: string,
): Record<string, RecipeData> {
  const book: Record<string, RecipeData> = {};
  const queue = [itemKey(name)];
  while (queue.length > 0 && Object.keys(book).length < 500) {
    const key = queue.shift() ?? "";
    if (Object.hasOwn(book, key)) continue;
    const recipe = lookup(key);
    if (!recipe) continue;
    book[key] = recipe;
    for (const ingredientKey of ingredientTotals(recipe).keys())
      queue.push(ingredientKey);
  }
  return book;
}

/** Recipes the component documentation uses for its examples (with DEMO_ITEMS). */
export const DEMO_RECIPES: readonly RecipeData[] = [
  {
    station: "Crafting Table",
    columns: 3,
    rows: 3,
    slots: [
      null,
      { name: "Enchanted Diamond", count: 1 },
      null,
      null,
      { name: "Enchanted Diamond", count: 1 },
      null,
      null,
      { name: "Stick", count: 1 },
      null,
    ],
    output: { name: "Aspect of the End", count: 1 },
    time: null,
  },
  {
    station: "Crafting Table",
    columns: 0,
    rows: 0,
    slots: [{ name: "Diamond", count: 160 }],
    output: { name: "Enchanted Diamond", count: 1 },
    time: null,
  },
];

export function demoRecipeLookup(key: string): RecipeData | null {
  return (
    DEMO_RECIPES.find((recipe) => itemKey(recipe.output.name) === key) ?? null
  );
}
