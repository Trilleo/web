/**
 * `::: menu`: a plugin's chest GUI, as players see it. Each slot is written where it
 * stands (its material, name and lore), so a menu needs no Item: pages; buttons can
 * link to the page about what they open, so readers click through the menus as in
 * the game. Icons are the wiki's own pixel sprites (minecraft/icons.ts).
 */
import { materialIconHtml, materialKey } from "../minecraft/icons";
import { renderMcText, startsWithColor, stripMcCodes } from "../minecraft/text";
import type { BlockComponent, RenderContext } from "../types";

const MAX_ROWS = 6;
const COLUMNS = 9;
const SLOT_LINE =
  /^(\d{1,2}(?:\s*-\s*\d{1,2})?(?:\s*,\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*)\s*:\s*(.+)$/;
const MATERIAL = /^[a-z0-9_:-]+$/i;

/** What one slot shows. */
export interface MenuSlot {
  material: string;
  count: number | null;
  glow: boolean;
  /** The display name, with § codes; null shows the material's own name. */
  name: string | null;
  /** Lore lines: text with § codes, "" for a blank line, null for a divider rule. */
  lore: (string | null)[];
  /** The page it opens ("Town menu", "Town menu#Bank"). */
  target: string | null;
}

/** "lime_stained_glass_pane" → "Lime Stained Glass Pane". */
export function materialName(material: string): string {
  return materialKey(material)
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** One slot's text: `material [xN] [glow] | name | lore… [-> Page]`. */
export function parseSlot(text: string): MenuSlot | string {
  let rest = text.trim();
  let target: string | null = null;
  const arrow = rest.lastIndexOf("->");
  if (arrow >= 0) {
    target = rest.slice(arrow + 2).trim() || null;
    rest = rest.slice(0, arrow).trimEnd();
  }
  const [head = "", ...parts] = rest.split("|");
  // The material's words, then `x3` and `glow` in either order.
  const words = head.trim().split(/\s+/);
  let count: number | null = null;
  let glow = false;
  for (
    let last = words.at(-1);
    last !== undefined && words.length > 1;
    last = words.at(-1)
  ) {
    const stack = /^[x×](\d{1,2})$/i.exec(last);
    if (stack?.[1] && count === null) count = Number(stack[1]);
    else if (/^glow$/i.test(last) && !glow) glow = true;
    else break;
    words.pop();
  }
  if (!words.every((word) => MATERIAL.test(word)))
    return `“${head.trim()}” isn't a material (\`bell\`, \`lime_dye x3 glow\`).`;
  const [name, ...lore] = parts.map((part) => part.trim());
  return {
    material: materialKey(words.join(" ")),
    count,
    glow,
    // An empty name ("bell | | lore") shows the material's own.
    name: name !== undefined && name !== "" ? name : null,
    lore: lore.map((line) => (line === "--" ? null : line)),
    target,
  };
}

/** "4", "10-16", "1, 3, 5-7" → slot indexes (0-based, as plugins number them). */
function slotIndexes(list: string): number[] {
  const indexes: number[] = [];
  for (const part of list.split(",")) {
    const [from = 0, to] = part.split("-").map((value) => Number(value.trim()));
    const last = to ?? from;
    for (let index = from; index <= Math.min(last, from + 54); index += 1)
      indexes.push(index);
  }
  return indexes;
}

function tooltipHtml(slot: MenuSlot, id: string): string {
  const name = slot.name ?? materialName(slot.material);
  const lines = [
    renderMcText(startsWithColor(name) ? name : `§f${name}`),
    ...slot.lore.map((line) => {
      if (line === null) return null;
      if (line === "") return "&nbsp;";
      return renderMcText(line.startsWith("§") ? line : `§7${line}`);
    }),
  ]
    .map((line) =>
      line === null
        ? `<span class="mc-line mc-rule" aria-hidden="true"></span>`
        : `<span class="mc-line">${line}</span>`,
    )
    .join("");
  return `<span class="mc-tooltip" role="tooltip" id="${id}">${lines}</span>`;
}

function slotHtml(slot: MenuSlot, context: RenderContext): string {
  const id = context.id("mc-tooltip");
  const label = stripMcCodes(slot.name ?? materialName(slot.material)).trim();
  const count =
    slot.count !== null && slot.count > 1
      ? `<span class="mc-count" aria-hidden="true">${String(slot.count)}</span>`
      : "";
  const icon = materialIconHtml(slot.material) + count;
  const glow = slot.glow ? " is-glowing" : "";
  const describe = `aria-label="${context.escape(label || materialName(slot.material))}" aria-describedby="${id}" data-slot`;
  let button: string;
  if (slot.target) {
    context.link(slot.target);
    button = `<a class="mc-slot-item${glow}" href="${context.escape(context.href(slot.target))}" ${describe}>${icon}</a>`;
  } else {
    button = `<span class="mc-slot-item${glow}" role="img" tabindex="0" ${describe}>${icon}</span>`;
  }
  return `<span class="mc-slot mc-item">${button}${tooltipHtml(slot, id)}</span>`;
}

export const menu: BlockComponent = {
  kind: "block",
  name: "menu",
  set: "minecraft",
  summary:
    "A plugin's chest menu: each slot's material, name and lore written in place, with the game's tooltips. Buttons can link to the page about what they open.",
  example: `::: menu 3 Town Menu
fill: black_stained_glass_pane
11: bell | §6Riverside | | §7Mayor: §fSteve | §7Residents: §f12 | -- | §eClick to open! -> Main Page
13: gold_ingot x3 | §6Town Bank | | §7Balance: §6$1,250 | -- | §eClick to deposit! | §bRight-click to withdraw!
15: lime_dye glow | §aPvP | | §7Status: §aENABLED | -- | §eClick to disable!
22: arrow | §aGo Back | §7To TownyMenu
:::`,
  notes: [
    "After the name: rows (1–6, nine slots each), then the title (§ codes work): `::: menu 6 §8TownyMenu`.",
    "Slots count from 0 at the top left, as plugins number them: `4: …`, a range `10-16: …`, or a list `1, 7: …`.",
    "A slot is `material | name | lore | lore…`. The material is its Minecraft id (`bell`, `lime_stained_glass_pane`), then `x3` for a stack and `glow` for the enchanted shine.",
    "In the lore, an empty part is a blank line and `--` a divider rule. Text without a colour code is grey; a name without one is white.",
    "End a slot with `-> Page` (or `-> Page#Section`) to make it a link.",
    "`fill: black_stained_glass_pane` puts that material in every slot left empty, without a tooltip.",
  ],
  render({ argument, body }, context) {
    const size = /^(\d{1,2})(?:\s+(.*))?$/.exec(argument.trim());
    const rows = size?.[1] ? Number(size[1]) : 3;
    const title = (size ? (size[2] ?? "") : argument).trim();
    if (rows < 1 || rows > MAX_ROWS)
      return context.error(`Menus have 1–${String(MAX_ROWS)} rows.`);
    const slots = new Array<MenuSlot | null>(rows * COLUMNS).fill(null);
    let fill: string | null = null;
    const problems: string[] = [];
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const filler = /^fill\s*:\s*(.+)$/i.exec(line);
      if (filler?.[1]) {
        fill = materialKey(filler[1]);
        continue;
      }
      const match = SLOT_LINE.exec(line);
      if (!match?.[1] || !match[2]) {
        problems.push(
          `“${line}” isn't a slot line (\`4: bell | Name | Lore\`) or \`fill: material\`.`,
        );
        continue;
      }
      const slot = parseSlot(match[2]);
      if (typeof slot === "string") {
        problems.push(slot);
        continue;
      }
      for (const index of slotIndexes(match[1])) {
        if (index >= slots.length) {
          problems.push(
            `Slot ${String(index)} is outside a ${String(rows)}-row menu (slots 0–${String(slots.length - 1)}).`,
          );
          continue;
        }
        slots[index] = slot;
      }
    }
    const fillHtml = fill
      ? `<span class="mc-slot mc-filler" aria-hidden="true">${materialIconHtml(fill)}</span>`
      : `<span class="mc-slot" aria-hidden="true"></span>`;
    const cells = slots
      .map((slot) => (slot ? slotHtml(slot, context) : fillHtml))
      .join("");
    const label = stripMcCodes(title).trim() || "Menu";
    const caption = title
      ? `<figcaption class="mc-inventory-title">${renderMcText(title)}</figcaption>`
      : "";
    return `${problems.map((problem) => context.error(problem)).join("")}<figure class="mc-inventory mc-menu" data-inventory>${caption}<div class="mc-slots" data-cols="${String(COLUMNS)}" role="group" aria-label="${context.escape(label)}">${cells}</div></figure>\n`;
  },
};

export const MENU_COMPONENTS = [menu] as const;
