/**
 * The minecraft set: Minecraft text (`§` codes), items (defined on `Item:` pages, shown
 * with the game's tooltips) and inventories. Items come from the wiki through the
 * "items" resource (an ItemLookup); a page's own item goes back on the "item"
 * channel. Everything is drawn on the server; the tooltips need no JavaScript.
 */
import {
  RARITIES,
  itemIconHtml,
  itemKey,
  itemNameHtml,
  itemTooltipHtml,
  parseItemBlock,
  type ItemData,
  type ItemLookup,
} from "../minecraft/items";
import { renderMcText, stripMcCodes } from "../minecraft/text";
import {
  bookFor,
  computeMaterials,
  ingredientTotals,
  parseRecipe,
  type Ingredient,
  type RecipeData,
} from "../minecraft/recipes";
import { materialsHtml, scriptJson } from "../calculators";
import { parseField } from "../syntax";
import type { BlockComponent, InlineComponent, RenderContext } from "../types";

const MINECRAFT = "minecraft";
const ITEM_NAMESPACE = "Item:";
const COUNT = /\s*[x×]\s*(\d{1,4})\s*$/i;

function lookupItem(name: string, context: RenderContext): ItemData | null {
  const lookup = context.resource("items") as ItemLookup | undefined;
  return lookup?.(name) ?? null;
}

/** A reference to an item nobody has described: a link to the page that would. */
function unknownItem(name: string): ItemData {
  return {
    key: itemKey(name),
    page: `${ITEM_NAMESPACE}${stripMcCodes(name).trim()}`,
    name: stripMcCodes(name).trim(),
    rarity: null,
    type: null,
    icon: null,
    lore: [],
  };
}

/** "Wheat x64" → ["Wheat", 64]. */
function nameAndCount(text: string): [string, number | null] {
  const match = COUNT.exec(text);
  if (!match?.[1]) return [text.trim(), null];
  return [text.slice(0, match.index).trim(), Number(match[1])];
}

function rowsHtml(
  rows: readonly { key: string; value: string }[],
  context: RenderContext,
): string {
  if (rows.length === 0) return "";
  return `<dl>${rows
    .map(
      (row) =>
        `<div class="wiki-infobox-row"><dt>${context.inline(row.key)}</dt><dd>${context.inline(row.value)}</dd></div>`,
    )
    .join("")}</dl>`;
}

/** An item's infobox: picture, tooltip, and the page's own rows. */
function itemInfobox(
  item: ItemData,
  rows: readonly { key: string; value: string }[],
  context: RenderContext,
): string {
  const title = stripMcCodes(item.name);
  const placement = context.depth === 0 ? ' data-placement="page"' : "";
  return `<section class="wiki-infobox mc-infobox" aria-label="${context.escape(title)}"${placement}><p class="wiki-infobox-title">${context.escape(title)}</p><div class="mc-infobox-art">${itemIconHtml(item, (url) => context.imageUrl(url), "large")}${itemTooltipHtml(item, null, true)}</div>${rowsHtml(rows, context)}</section>\n`;
}

const mcInline: InlineComponent = {
  kind: "inline",
  name: "mc",
  set: MINECRAFT,
  summary:
    "Minecraft text with § colour and format codes, as the game shows it.",
  example: "The sign says {{mc §6§lWelcome §r§7to §bthe Hub}}.",
  notes: [
    "Colours: §0–§9 and §a–§f. Formats: §l bold, §o italic, §n underline, §m strikethrough, §k obfuscated, §r reset.",
    "A colour code ends the formats before it, as in the game. Plugins' & codes aren't read.",
  ],
  render(argument, context) {
    if (!argument) return context.escape("{{mc}}");
    return `<span class="mc-text">${renderMcText(argument)}</span>`;
  },
};

const mcBlock: BlockComponent = {
  kind: "block",
  name: "mc",
  set: MINECRAFT,
  summary:
    "Several lines of Minecraft text: chat, a sign, a server's message of the day.",
  example: `::: mc
§e[Server] §fWelcome back, §bSteve§f!
§7You have §a3 §7unread messages.
:::`,
  notes: ["One line of the game's text per line."],
  render({ body }, context) {
    const lines = body
      .split("\n")
      .map(
        (line) =>
          `<span class="mc-line">${line ? renderMcText(line) : "&nbsp;"}</span>`,
      )
      .join("");
    return (
      `<div class="mc-text mc-block">${lines}</div>\n` +
      (body.trim()
        ? ""
        : context.error("Write the text between the ::: lines."))
    );
  },
};

const itemDefinition: BlockComponent = {
  kind: "block",
  name: "item",
  set: MINECRAFT,
  summary:
    "Describes the item an Item: page is about: its name, rarity, type, icon and lore. Other pages show it with {{item}}, ::: item-infobox and ::: inventory.",
  example: `::: item
name: Aspect of the End
rarity: rare
type: sword
lore: §7Damage: §c+100
lore:
lore: §6Ability: Instant Transmission
lore: §7Teleport §a8 blocks§7 ahead.
Obtained from: [[Ender Dragon]]
:::`,
  notes: [
    "Goes on a page called Item:<name>; the page's title is how others find it.",
    `rarity: ${Object.keys(RARITIES).join(", ")}. type: the word after it on the tooltip (SWORD, BOW…).`,
    "icon: a published picture's address (upload it on the wiki's Files page).",
    "Each lore: line is a line of the tooltip (`lore:` alone is a blank one). Other `Label: value` lines are rows in the infobox.",
  ],
  render({ body }, context) {
    const onItemPage = context.pageTitle.startsWith(ITEM_NAMESPACE);
    const page = context.pageTitle;
    const fallback = onItemPage
      ? page.slice(ITEM_NAMESPACE.length)
      : page || "Item";
    const { item, rows, problems } = parseItemBlock(body, fallback);
    const data: ItemData = {
      ...item,
      key: itemKey(fallback),
      page,
    };
    if (onItemPage) context.emit("item", data);
    const notes = [
      ...problems.map((problem) => context.error(problem)),
      ...(onItemPage
        ? []
        : [
            context.error(
              "Items are described on pages called Item:<name>; other pages show them with ::: item-infobox <name>.",
            ),
          ]),
    ].join("");
    return notes + itemInfobox(data, rows, context);
  },
};

const itemInfoboxComponent: BlockComponent = {
  kind: "block",
  name: "item-infobox",
  set: MINECRAFT,
  summary:
    "An item's infobox on any page: its picture and tooltip, plus rows you add.",
  example: `::: item-infobox Enchanted Diamond
Sold by: [[Bazaar]]
:::`,
  notes: ["The item's name follows; rows below it are added to the box."],
  render({ argument, body }, context) {
    if (!argument)
      return context.error("Name the item: ::: item-infobox <name>");
    const item = lookupItem(argument, context);
    const rows = body
      .split("\n")
      .map((line) => parseField(line))
      .filter(
        (field): field is { key: string; value: string } => field !== null,
      );
    if (!item) {
      context.link(unknownItem(argument).page);
      return context.error(
        `There's no item called “${argument}” yet (its page would be ${unknownItem(argument).page}).`,
      );
    }
    context.link(item.page);
    return itemInfobox(item, rows, context);
  },
};

function itemReference(
  text: string,
  context: RenderContext,
  inSlot: boolean,
): string {
  const [name, count] = nameAndCount(text);
  const found = lookupItem(name, context);
  const item = found ?? unknownItem(name);
  context.link(item.page);
  const id = context.id("mc-tooltip");
  const plain = stripMcCodes(item.name);
  const label = count !== null ? `${plain}, ${String(count)}` : plain;
  const missing = found ? "" : " is-missing";
  const tooltip = itemTooltipHtml(item, id);
  if (inSlot) {
    const countHtml =
      count !== null && count > 1
        ? `<span class="mc-count" aria-hidden="true">${String(count)}</span>`
        : "";
    return `<span class="mc-slot mc-item"><a class="mc-slot-item${missing}" href="${context.escape(context.href(item.page))}" aria-label="${context.escape(label)}" aria-describedby="${id}" data-slot>${itemIconHtml(item, (url) => context.imageUrl(url))}${countHtml}</a>${tooltip}</span>`;
  }
  const countHtml =
    count !== null
      ? `<span class="mc-item-count"> ×${String(count)}</span>`
      : "";
  return `<span class="mc-item"><a class="mc-item-link${missing}" href="${context.escape(context.href(item.page))}" aria-describedby="${id}">${itemIconHtml(item, (url) => context.imageUrl(url))}<span class="mc-item-name">${itemNameHtml(item)}</span>${countHtml}</a>${tooltip}</span>`;
}

const itemInline: InlineComponent = {
  kind: "inline",
  name: "item",
  set: MINECRAFT,
  summary:
    "An item in the text: its icon and coloured name, with its tooltip on hover or focus.",
  example:
    "Craft an {{item Aspect of the End}} from {{item Enchanted Diamond x32}}.",
  notes: [
    "A count after the name: `x64`. An item nobody has described links to its Item: page, dashed.",
  ],
  render(argument, context) {
    if (!argument) return context.escape("{{item}}");
    return itemReference(argument, context, false);
  },
};

const ROWS = { min: 1, max: 12 } as const;

const inventory: BlockComponent = {
  kind: "block",
  name: "inventory",
  set: MINECRAFT,
  summary:
    "A chest, menu or crafting grid: slots with items and counts, each with its tooltip. Arrow keys move between items.",
  example: `::: inventory 2 Starter chest
1: Aspect of the End
2: Enchanted Diamond x32
row 2: , Enchanted Diamond x8, , Aspect of the End
:::`,
  notes: [
    "After the name: rows (and `x` columns; 9 when left out), then a title: `::: inventory 3x3 Crafting`.",
    "Slots count from 1, left to right, top to bottom: `5: Item x64`, or a range `1-9: Item`.",
    "`row 2: A, B, , C` fills a row; an empty cell leaves a slot empty.",
  ],
  render({ argument, body }, context) {
    const size = /^(\d{1,2})(?:\s*[x×]\s*(\d{1,2}))?(?:\s+(.*))?$/i.exec(
      argument.trim(),
    );
    const rows = size?.[1] ? Number(size[1]) : 3;
    const columns = size?.[2] ? Number(size[2]) : 9;
    const title = size ? (size[3] ?? "").trim() : argument.trim();
    if (
      rows < ROWS.min ||
      rows > ROWS.max ||
      columns < ROWS.min ||
      columns > ROWS.max
    )
      return context.error(`Inventories have 1–12 rows and 1–12 columns.`);
    const slots = new Array<string | null>(rows * columns).fill(null);
    const problems: string[] = [];
    const put = (index: number, text: string) => {
      if (index < 0 || index >= slots.length) {
        problems.push(
          `Slot ${String(index + 1)} is outside a ${String(rows)}×${String(columns)} grid.`,
        );
        return;
      }
      slots[index] = text;
    };
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const row = /^row\s+(\d{1,2})\s*:\s*(.*)$/i.exec(line);
      if (row?.[1]) {
        const start = (Number(row[1]) - 1) * columns;
        (row[2] ?? "").split(",").forEach((cell, offset) => {
          if (offset >= columns) {
            problems.push(
              `Row ${row[1] ?? ""} has more than ${String(columns)} cells.`,
            );
            return;
          }
          if (cell.trim()) put(start + offset, cell.trim());
        });
        continue;
      }
      const slot = /^(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*:\s*(.+)$/.exec(line);
      if (slot?.[1] && slot[3]) {
        const from = Number(slot[1]);
        const to = slot[2] ? Number(slot[2]) : from;
        for (let index = from; index <= Math.min(to, from + 200); index += 1)
          put(index - 1, slot[3].trim());
        continue;
      }
      problems.push(
        `“${line}” isn't a slot line (\`5: Item\`, \`1-9: Item\` or \`row 2: A, B\`).`,
      );
    }
    const cells = slots
      .map((text) =>
        text
          ? itemReference(text, context, true)
          : `<span class="mc-slot" aria-hidden="true"></span>`,
      )
      .join("");
    const label = title || "Inventory";
    const caption = title
      ? `<figcaption class="mc-inventory-title">${renderMcText(title)}</figcaption>`
      : "";
    return `${problems.map((problem) => context.error(problem)).join("")}<figure class="mc-inventory" data-inventory>${caption}<div class="mc-slots" data-cols="${String(columns)}" role="group" aria-label="${context.escape(stripMcCodes(label))}">${cells}</div></figure>\n`;
  },
};

const EMPTY_SLOT = `<span class="mc-slot" aria-hidden="true"></span>`;

function amountText(ingredient: Ingredient): string {
  return ingredient.count > 1
    ? `${ingredient.name} x${String(ingredient.count)}`
    : ingredient.name;
}

const recipe: BlockComponent = {
  kind: "block",
  name: "recipe",
  set: MINECRAFT,
  summary:
    "How something is made: a station's grid (or a list), what it makes, and how long it takes. Item: pages list the recipes that make and use them.",
  example: `::: recipe Crafting Table
row 1: , Enchanted Diamond
row 2: , Enchanted Diamond
row 3: , Stick
makes: Aspect of the End
:::

::: recipe Forge, 4h
- Enchanted Diamond x32
- Aspect of the End
makes: Enchanted Diamond x64
:::`,
  notes: [
    "After the name: the station, then its grid (`Forge 2x1`) and, after a comma, the time. Crafting Table, Furnace and other game stations know their grid.",
    "Ingredients by slot (`5: Item x2`, `1-3: Item`, `row 2: A, , B`) or, when the order doesn't matter, as a list (`- Item x2`).",
    "`makes: Item x4` says what comes out; `time: 10 s` also works.",
  ],
  render({ argument, body }, context) {
    const { recipe: parsed, problems } = parseRecipe(argument, body);
    if (!parsed)
      return problems.map((problem) => context.error(problem)).join("");
    const columns = parsed.columns || Math.min(parsed.slots.length, 9);
    const slots = parsed.slots
      .map((slot) =>
        slot ? itemReference(amountText(slot), context, true) : EMPTY_SLOT,
      )
      .join("");
    const output = itemReference(amountText(parsed.output), context, true);
    const time = parsed.time
      ? `<span class="mc-recipe-time">${context.escape(parsed.time)}</span>`
      : "";
    const html = `<figure class="mc-recipe" data-recipe><figcaption class="mc-recipe-title">${context.escape(parsed.station)}${time}</figcaption><div class="mc-recipe-body"><div class="mc-slots" data-cols="${String(columns)}" role="group" aria-label="Ingredients">${slots}</div><span class="mc-recipe-arrow" aria-hidden="true">→</span><div class="mc-recipe-output" role="group" aria-label="Makes">${output}</div></div></figure>\n`;
    context.emit("recipe", { ...parsed, html });
    return html;
  },
};

/** Recipes by the key of what they make: the "recipes" resource. */
export type RecipeLookup = (key: string) => RecipeData | null;

const materials: BlockComponent = {
  kind: "block",
  name: "materials",
  set: MINECRAFT,
  summary:
    "Everything it takes to make an item, following this wiki's recipes down to raw materials: a tree and totals. Readers change the amount and say what they already have.",
  example: "::: materials Aspect of the End x2 :::",
  notes: [
    "The item's name follows, with an amount (`x10`; 1 when left out).",
    "An item with several recipes uses the first one saved.",
  ],
  render({ argument }, context) {
    const [name, count] = nameAndCount(argument);
    if (!name)
      return context.error("Name the item: ::: materials <name> x10 :::");
    const lookup = context.resource("recipes") as RecipeLookup | undefined;
    const book = lookup ? bookFor(lookup, name) : {};
    if (!book[itemKey(name)])
      return context.error(`No recipe on this wiki makes “${name}” yet.`);
    const amount = Math.max(1, count ?? 1);
    const result = computeMaterials(book, name, amount);

    // Every item the tree can show, with its page.
    const names = new Map<string, string>();
    for (const entry of Object.values(book)) {
      names.set(itemKey(entry.output.name), entry.output.name);
      for (const [key, ingredient] of ingredientTotals(entry))
        if (!names.has(key)) names.set(key, ingredient.name);
    }
    const links: Record<string, { name: string; href: string }> = {};
    for (const [key, itemName] of names) {
      const item = lookupItem(itemName, context) ?? unknownItem(itemName);
      context.link(item.page);
      links[key] = {
        name: stripMcCodes(item.name),
        href: context.href(item.page),
      };
    }
    const shown = materialsHtml(result, links);
    const amountId = context.id("wiki-materials");
    const have = [...names.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "en"))
      .map(([key, itemName]) => {
        const id = context.id("wiki-materials");
        return `<div class="wiki-calculator-input"><label for="${id}">${context.escape(stripMcCodes(itemName))}</label><input id="${id}" type="number" min="0" step="1" inputmode="numeric" value="0" data-have="${context.escape(key)}" readonly></div>`;
      })
      .join("");
    const title = `Materials for ${stripMcCodes(name)}`;
    return `<section class="wiki-materials" data-materials aria-label="${context.escape(title)}"><p class="wiki-calculator-title">${context.escape(title)}</p><div class="wiki-calculator-inputs"><div class="wiki-calculator-input"><label for="${amountId}">How many</label><input id="${amountId}" type="number" min="1" step="1" inputmode="numeric" value="${String(amount)}" data-amount readonly></div></div><details class="wiki-materials-have"><summary>What you already have</summary><div class="wiki-calculator-inputs">${have}</div></details><div class="wiki-materials-parts"><div><p class="wiki-materials-label">Steps</p><div data-materials-tree aria-live="polite">${shown.tree}</div></div><div><p class="wiki-materials-label">Raw materials</p><div data-materials-totals aria-live="polite">${shown.totals}</div></div></div><script type="application/json" data-materials-book>${scriptJson({ name, book, links })}</script></section>\n`;
  },
};

export const MINECRAFT_COMPONENTS = [
  mcInline,
  mcBlock,
  itemDefinition,
  itemInfoboxComponent,
  itemInline,
  inventory,
  recipe,
  materials,
] as const;
