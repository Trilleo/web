/**
 * The browser side of wiki components. Pages work without it: tabs are sections one
 * under another until this turns each `[data-tabs]` box into a tab list (arrow
 * keys, Home and End move between tabs, as the ARIA pattern describes).
 */

import {
  computeCalculator,
  materialsHtml,
  sumCosts,
  type CalculatorSpec,
  type CostsSpec,
  type ItemLinks,
} from "./calculators";
import { formatNumber, type Formula } from "./formula";
import { computeMaterials, type RecipeBook } from "./minecraft/recipes";

let boxes = 0;

export function enhanceTabs(root: ParentNode = document): void {
  for (const box of root.querySelectorAll<HTMLElement>(
    "[data-tabs]:not([data-tabs-ready])",
  )) {
    const sections = [
      ...box.querySelectorAll<HTMLElement>(":scope > [data-tab]"),
    ];
    if (sections.length === 0) continue;
    boxes += 1;
    const prefix = `wiki-tabs-${String(boxes)}`;
    const list = document.createElement("div");
    list.setAttribute("role", "tablist");
    list.className = "wiki-tablist";
    const buttons: HTMLButtonElement[] = [];

    const select = (index: number, focus: boolean) => {
      sections.forEach((section, i) => {
        const selected = i === index;
        section.hidden = !selected;
        const button = buttons[i];
        if (!button) return;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (selected && focus) button.focus();
      });
    };

    sections.forEach((section, index) => {
      const label = section.querySelector<HTMLElement>(
        ":scope > [data-tab-label]",
      );
      const panel = section.querySelector<HTMLElement>(
        ":scope > .wiki-tab-panel",
      );
      const id = `${prefix}-${String(index)}`;
      const button = document.createElement("button");
      button.type = "button";
      button.id = `${id}-tab`;
      button.className = "wiki-tab-button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `${id}-panel`);
      if (label) {
        button.append(
          ...[...label.childNodes].map((node) => node.cloneNode(true)),
        );
        label.hidden = true;
      }
      if (panel) {
        panel.id = `${id}-panel`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", button.id);
        panel.tabIndex = 0;
      }
      button.addEventListener("click", () => {
        select(index, false);
      });
      button.addEventListener("keydown", (event) => {
        const last = sections.length - 1;
        const next =
          event.key === "ArrowRight"
            ? index === last
              ? 0
              : index + 1
            : event.key === "ArrowLeft"
              ? index === 0
                ? last
                : index - 1
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? last
                  : null;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
      buttons.push(button);
      list.append(button);
    });

    box.prepend(list);
    box.dataset.tabsReady = "";
    select(0, false);
  }
}

/**
 * Inventories: one tab stop, then arrow keys (and Home/End) move between the slots
 * that hold items, along the grid.
 */
export function enhanceInventories(root: ParentNode = document): void {
  for (const grid of root.querySelectorAll<HTMLElement>(
    ".mc-slots:not([data-inventory-ready])",
  )) {
    const columns = Number(grid.dataset.cols ?? "9") || 9;
    const cells = [...grid.children] as HTMLElement[];
    const items = cells
      .map((cell, index) => ({
        index,
        link: cell.querySelector<HTMLAnchorElement>("[data-slot]"),
      }))
      .filter(
        (entry): entry is { index: number; link: HTMLAnchorElement } =>
          entry.link !== null,
      );
    if (items.length === 0) continue;
    grid.dataset.inventoryReady = "";
    items.forEach((entry, i) => {
      entry.link.tabIndex = i === 0 ? 0 : -1;
    });
    const focus = (target: { link: HTMLAnchorElement } | undefined) => {
      if (!target) return;
      for (const entry of items) entry.link.tabIndex = -1;
      target.link.tabIndex = 0;
      target.link.focus();
    };
    grid.addEventListener("keydown", (event) => {
      const current = items.findIndex(
        (entry) => entry.link === document.activeElement,
      );
      const here = items[current];
      if (!here) return;
      const row = Math.floor(here.index / columns);
      const column = here.index % columns;
      let next: { index: number; link: HTMLAnchorElement } | undefined;
      if (event.key === "ArrowRight") next = items[current + 1];
      else if (event.key === "ArrowLeft") next = items[current - 1];
      else if (event.key === "Home") next = items[0];
      else if (event.key === "End") next = items.at(-1);
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        // The nearest item in the next row (or the one after) that has any.
        const rows = Math.ceil(cells.length / columns);
        for (let r = row + step; r >= 0 && r < rows && !next; r += step) {
          next = items
            .filter((entry) => Math.floor(entry.index / columns) === r)
            .sort(
              (a, b) =>
                Math.abs((a.index % columns) - column) -
                Math.abs((b.index % columns) - column),
            )[0];
        }
      } else return;
      event.preventDefault();
      focus(next);
    });
  }
}

const SCRAMBLE =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#%&*+=";

/**
 * Obfuscated Minecraft text (§k) flickers through random characters, as in the
 * game: only while it's on screen, and never when the visitor asks for less motion.
 */
export function animateObfuscated(root: ParentNode = document): void {
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches)
    return;
  const spans = [...root.querySelectorAll<HTMLElement>(".mc-obfuscated")];
  if (spans.length === 0) return;
  const originals = new Map(spans.map((span) => [span, span.textContent]));
  const visible = new Set<HTMLElement>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const span = entry.target as HTMLElement;
      if (entry.isIntersecting) visible.add(span);
      else visible.delete(span);
    }
  });
  for (const span of spans) observer.observe(span);
  window.setInterval(() => {
    for (const span of visible) {
      const original = originals.get(span) ?? "";
      span.textContent = original.replace(
        /\S/g,
        (char) => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)] ?? char,
      );
    }
  }, 60);
}

/**
 * Item tooltips: CSS shows them on hover and focus. This pins the open one to the
 * viewport, so a table or inventory that scrolls can't clip it, and keeps it on
 * screen (above the item when there's no room below).
 */
export function placeTooltips(root: Document = document): void {
  const place = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const item = target.closest(".mc-item");
    const tooltip = item?.querySelector<HTMLElement>(":scope > .mc-tooltip");
    if (!item || !tooltip) return;
    const anchor = item.getBoundingClientRect();
    tooltip.style.position = "fixed";
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const gap = 6;
    const left = Math.max(
      8,
      Math.min(anchor.left, window.innerWidth - width - 8),
    );
    const below = anchor.bottom + gap;
    const top =
      below + height > window.innerHeight - 8
        ? Math.max(8, anchor.top - gap - height)
        : below;
    tooltip.style.left = `${String(left)}px`;
    tooltip.style.top = `${String(top)}px`;
  };
  root.addEventListener("pointerover", (event) => {
    place(event.target);
  });
  root.addEventListener("focusin", (event) => {
    place(event.target);
  });
}

function readJson(root: Element, selector: string): unknown {
  const script = root.querySelector(selector);
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent);
  } catch {
    return null;
  }
}

function numberOf(input: HTMLInputElement): number | null {
  const value = Number(input.value);
  return input.value.trim() === "" || !Number.isFinite(value) ? null : value;
}

/** `::: calculator`: results follow the inputs as readers type. */
export function enhanceCalculators(root: ParentNode = document): void {
  for (const box of root.querySelectorAll<HTMLElement>(
    "[data-calculator]:not([data-live])",
  )) {
    const spec = readJson(
      box,
      "[data-calculator-spec]",
    ) as CalculatorSpec | null;
    if (!spec) continue;
    box.dataset.live = "";
    const inputs = [...box.querySelectorAll<HTMLInputElement>("[data-input]")];
    const outputs = [
      ...box.querySelectorAll<HTMLOutputElement>("[data-result]"),
    ];
    const parsed = new Map<string, Formula>();
    const update = () => {
      const given = new Map<string, number>();
      for (const input of inputs) {
        const value = numberOf(input);
        if (input.dataset.input && value !== null)
          given.set(input.dataset.input, value);
      }
      const values = computeCalculator(spec, given, parsed);
      for (const output of outputs)
        output.textContent = formatNumber(
          values.get(output.dataset.result ?? "") ?? NaN,
        );
    };
    for (const input of inputs) {
      input.readOnly = false;
      input.addEventListener("input", update);
    }
  }
}

/** `::: costs`: totals between the levels readers pick. */
export function enhanceCosts(root: ParentNode = document): void {
  for (const box of root.querySelectorAll<HTMLElement>(
    "[data-costs]:not([data-live])",
  )) {
    const spec = readJson(box, "[data-costs-spec]") as CostsSpec | null;
    const from = box.querySelector<HTMLSelectElement>("[data-from]");
    const to = box.querySelector<HTMLSelectElement>("[data-to]");
    if (!spec || !from || !to) continue;
    box.dataset.live = "";
    const cells = [...box.querySelectorAll<HTMLElement>("[data-costs-total]")];
    const update = () => {
      const totals = sumCosts(spec, Number(from.value), Number(to.value));
      for (const cell of cells)
        cell.textContent = formatNumber(
          totals[Number(cell.dataset.costsTotal)] ?? 0,
        );
    };
    from.disabled = false;
    to.disabled = false;
    from.addEventListener("change", update);
    to.addEventListener("change", update);
  }
}

/** `::: materials`: the tree and totals follow the amount and what readers have. */
export function enhanceMaterials(root: ParentNode = document): void {
  for (const box of root.querySelectorAll<HTMLElement>(
    "[data-materials]:not([data-live])",
  )) {
    const data = readJson(box, "[data-materials-book]") as {
      name: string;
      book: RecipeBook;
      links: ItemLinks;
    } | null;
    const amount = box.querySelector<HTMLInputElement>("[data-amount]");
    const tree = box.querySelector<HTMLElement>("[data-materials-tree]");
    const totals = box.querySelector<HTMLElement>("[data-materials-totals]");
    if (!data || !amount || !tree || !totals) continue;
    box.dataset.live = "";
    const haves = [...box.querySelectorAll<HTMLInputElement>("[data-have]")];
    const update = () => {
      const have = new Map<string, number>();
      for (const input of haves) {
        const value = numberOf(input);
        if (input.dataset.have && value !== null && value > 0)
          have.set(input.dataset.have, Math.floor(value));
      }
      const count = Math.max(1, Math.floor(numberOf(amount) ?? 1));
      const shown = materialsHtml(
        computeMaterials(data.book, data.name, count, have),
        data.links,
      );
      // Built from escaped text only (materialsHtml), like the server's.
      tree.innerHTML = shown.tree;
      totals.innerHTML = shown.totals;
    };
    for (const input of [amount, ...haves]) {
      input.readOnly = false;
      input.addEventListener("input", update);
    }
  }
}
