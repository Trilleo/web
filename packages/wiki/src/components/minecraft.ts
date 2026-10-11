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

export const MINECRAFT_COMPONENTS = [
  mcInline,
  mcBlock,
  itemDefinition,
  itemInfoboxComponent,
  itemInline,
  inventory,
] as const;
