/**
 * Items: what an `::: item` block on an `Item:` page says about one (its name, rarity,
 * type, icon and lore), and how items are drawn: an icon (the wiki's picture, or a
 * swatch with the first letter) and a tooltip in the game's own style.
 */
import { escapeHtml, parseField } from "../syntax";
import { renderMcText, startsWithColor, stripMcCodes } from "./text";

/** Rarities as Minecraft servers label them, with their colours (`§` codes). */
export const RARITIES = {
  common: { label: "Common", color: "f" },
  uncommon: { label: "Uncommon", color: "a" },
  rare: { label: "Rare", color: "9" },
  epic: { label: "Epic", color: "5" },
  legendary: { label: "Legendary", color: "6" },
  mythic: { label: "Mythic", color: "d" },
  special: { label: "Special", color: "c" },
} as const;
export type Rarity = keyof typeof RARITIES;

export interface ItemData {
  /** How it's looked up: its name in lower case, without codes. */
  key: string;
  /** The page it's described on (an `Item:` page, or a generated one). */
  page: string;
  /** The display name, which may hold `§` codes. */
  name: string;
  rarity: Rarity | null;
  /** The tooltip's last line with the rarity: "SWORD", "ACCESSORY". */
  type: string | null;
  /** A published picture's address. */
  icon: string | null;
  lore: string[];
}

/** Finds items by name (or key). The wiki provides one as the "items" resource. */
export type ItemLookup = (name: string) => ItemData | null;

export const ITEM_FIELDS = ["name", "rarity", "type", "icon", "lore"] as const;

export function itemKey(name: string): string {
  return stripMcCodes(name)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en");
}

export function isRarity(value: string): value is Rarity {
  return Object.hasOwn(RARITIES, value);
}

/**
 * An `::: item` block's body: the item (named after the page unless `name:` says
 * otherwise), the rows that aren't item fields (shown in its infobox), and what's
 * wrong with it.
 */
export function parseItemBlock(
  body: string,
  page: string,
): {
  item: Omit<ItemData, "key" | "page">;
  rows: { key: string; value: string }[];
  problems: string[];
} {
  const item: Omit<ItemData, "key" | "page"> = {
    name: page,
    rarity: null,
    type: null,
    icon: null,
    lore: [],
  };
  const rows: { key: string; value: string }[] = [];
  const problems: string[] = [];
  for (const line of body.split("\n")) {
    if (line.trim() === "") continue;
    // "lore:" with nothing after it is a blank line in the lore, on purpose.
    if (/^\s*lore:\s*$/i.test(line)) {
      item.lore.push("");
      continue;
    }
    const field = parseField(line);
    if (!field) {
      problems.push(`“${line.trim()}” isn't a \`label: value\` line.`);
      continue;
    }
    const key = field.key.toLowerCase();
    if (key === "name") item.name = field.value;
    else if (key === "rarity") {
      const rarity = field.value.toLowerCase();
      if (isRarity(rarity)) item.rarity = rarity;
      else
        problems.push(
          `Rarity “${field.value}” isn't one of: ${Object.keys(RARITIES).join(", ")}.`,
        );
    } else if (key === "type") item.type = field.value.toUpperCase();
    else if (key === "icon") item.icon = field.value;
    else if (key === "lore") item.lore.push(field.value);
    else rows.push(field);
  }
  return { item, rows, problems };
}

/** The name as shown: its own colour, or its rarity's. */
export function itemNameHtml(item: Pick<ItemData, "name" | "rarity">): string {
  const color = item.rarity ? RARITIES[item.rarity].color : "f";
  return renderMcText(
    startsWithColor(item.name) ? item.name : `§${color}${item.name}`,
  );
}

/** The picture, or a swatch in the rarity's colour with the name's first letter. */
export function itemIconHtml(
  item: Pick<ItemData, "name" | "rarity" | "icon">,
  imageUrl: (url: string) => string | null,
  size: "small" | "large" = "small",
): string {
  const url = item.icon ? imageUrl(item.icon) : null;
  if (url)
    return `<img class="mc-icon" data-size="${size}" src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async">`;
  const letter = stripMcCodes(item.name).trim().charAt(0).toUpperCase() || "?";
  const color = item.rarity ? RARITIES[item.rarity].color : "7";
  return `<span class="mc-icon mc-swatch mc-c-${color}" data-size="${size}" aria-hidden="true">${escapeHtml(letter)}</span>`;
}

/** The tooltip's lines: name, lore, then rarity and type. */
export function itemTooltipLines(item: ItemData): string[] {
  const lines = [
    itemNameHtml(item),
    ...item.lore.map((line) =>
      line ? renderMcText(line.startsWith("§") ? line : `§7${line}`) : "&nbsp;",
    ),
  ];
  if (item.rarity || item.type) {
    const color = item.rarity ? RARITIES[item.rarity].color : "7";
    const label = [
      item.rarity ? RARITIES[item.rarity].label.toUpperCase() : "",
      item.type ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      ...(item.lore.length > 0 ? ["&nbsp;"] : []),
      renderMcText(`§${color}§l${label}`),
    );
  }
  return lines;
}

/** A tooltip: hidden until its item is hovered or focused, or always shown (`static`). */
export function itemTooltipHtml(
  item: ItemData,
  id: string | null,
  shown = false,
): string {
  const lines = itemTooltipLines(item)
    .map((line) => `<span class="mc-line">${line}</span>`)
    .join("");
  const idAttribute = id ? ` id="${escapeHtml(id)}"` : "";
  return shown
    ? `<span class="mc-tooltip" data-static>${lines}</span>`
    : `<span class="mc-tooltip" role="tooltip"${idAttribute}>${lines}</span>`;
}

/** Items the component documentation uses for its examples. */
export const DEMO_ITEMS: readonly ItemData[] = [
  {
    key: "aspect of the end",
    page: "Item:Aspect of the End",
    name: "Aspect of the End",
    rarity: "rare",
    type: "SWORD",
    icon: null,
    lore: [
      "§7Damage: §c+100",
      "§7Strength: §c+100",
      "",
      "§6Ability: Instant Transmission",
      "§7Teleport §a8 blocks§7 ahead.",
    ],
  },
  {
    key: "enchanted diamond",
    page: "Item:Enchanted Diamond",
    name: "Enchanted Diamond",
    rarity: "uncommon",
    type: null,
    icon: null,
    lore: ["§7A diamond, compressed."],
  },
];

export function demoLookup(name: string): ItemData | null {
  const key = itemKey(name);
  return DEMO_ITEMS.find((item) => item.key === key) ?? null;
}
