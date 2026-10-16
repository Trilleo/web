// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { CURSOR_OFFSET, enhanceTabs, placeTooltips } from "./client";

beforeEach(() => {
  document.body.innerHTML = `<div class="wiki-tabs" data-tabs>
    <section class="wiki-tab" data-tab><p class="wiki-tab-label" data-tab-label><em>Java</em></p><div class="wiki-tab-panel"><p>A</p></div></section>
    <section class="wiki-tab" data-tab><p class="wiki-tab-label" data-tab-label>Bedrock</p><div class="wiki-tab-panel"><p>B</p></div></section>
    <section class="wiki-tab" data-tab><p class="wiki-tab-label" data-tab-label>Education</p><div class="wiki-tab-panel"><p>C</p></div></section>
  </div>`;
});

const tabs = () => [
  ...document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
];
const sections = () => [
  ...document.querySelectorAll<HTMLElement>("[data-tab]"),
];

describe("enhanceTabs", () => {
  it("turns sections into a tab list, first one shown", () => {
    enhanceTabs(document);
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabs().map((tab) => tab.textContent)).toEqual([
      "Java",
      "Bedrock",
      "Education",
    ]);
    expect(tabs()[0]?.querySelector("em")).not.toBeNull();
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(sections().map((section) => section.hidden)).toEqual([
      false,
      true,
      true,
    ]);
    const panel = document.getElementById(
      tabs()[1]?.getAttribute("aria-controls") ?? "",
    );
    expect(panel?.getAttribute("role")).toBe("tabpanel");
  });

  it("switches by click and by arrow keys, and only enhances once", () => {
    enhanceTabs(document);
    enhanceTabs(document);
    expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    tabs()[1]?.click();
    expect(sections().map((section) => section.hidden)).toEqual([
      true,
      false,
      true,
    ]);
    tabs()[1]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(document.activeElement).toBe(tabs()[2]);
    tabs()[2]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(tabs()[0]?.getAttribute("aria-selected")).toBe("true");
    tabs()[0]?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
    expect(tabs()[2]?.tabIndex).toBe(0);
  });
});

describe("enhanceInventories", () => {
  it("makes one tab stop and moves along the grid with arrow keys", async () => {
    const { enhanceInventories } = await import("./client");
    // A 2×3 grid: items in slots 1, 3 and 5 (0-based 0, 2, 4).
    const slot = (n: number) =>
      `<span class="mc-slot mc-item"><a data-slot href="#${String(n)}">${String(n)}</a></span>`;
    const empty = `<span class="mc-slot" aria-hidden="true"></span>`;
    document.body.innerHTML = `<div class="mc-slots" data-cols="3">${slot(0)}${empty}${slot(2)}${empty}${slot(4)}${empty}</div>`;
    enhanceInventories(document);
    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>("[data-slot]"),
    ];
    expect(links.map((link) => link.tabIndex)).toEqual([0, -1, -1]);
    const press = (key: string) =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    links[0]?.focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(links[1]);
    press("ArrowDown");
    expect(document.activeElement).toBe(links[2]);
    // Equally near items above: the first one.
    press("ArrowUp");
    expect(document.activeElement?.getAttribute("href")).toBe("#0");
    press("Home");
    expect(document.activeElement).toBe(links[0]);
    expect(links.map((link) => link.tabIndex)).toEqual([0, -1, -1]);
  });
});

describe("live calculators", () => {
  const type = (input: HTMLInputElement | null, value: string) => {
    if (!input) throw new Error("no input");
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  it("::: calculator works results out as readers type", async () => {
    const { enhanceCalculators } = await import("./client");
    const { render } = await import("./test-render");
    document.body.innerHTML = render(
      "::: calculator\ninput a: A = 2\nresult b: B = a * 10\n:::",
    ).html;
    enhanceCalculators(document);
    const input = document.querySelector<HTMLInputElement>("[data-input]");
    expect(input?.readOnly).toBe(false);
    type(input, "7");
    expect(document.querySelector("output")?.textContent).toBe("70");
    type(input, "");
    expect(document.querySelector("output")?.textContent).toBe("20");
  });

  it("::: costs adds up between the picked levels", async () => {
    const { enhanceCosts } = await import("./client");
    const { render } = await import("./test-render");
    document.body.innerHTML = render(
      "::: costs\ncolumns: Coins\nI: 1\nII: 10\nIII: 100\n:::",
    ).html;
    enhanceCosts(document);
    const from = document.querySelector<HTMLSelectElement>("[data-from]");
    if (!from) throw new Error();
    expect(from.disabled).toBe(false);
    from.value = "0";
    from.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-costs-total]")?.textContent).toBe(
      "110",
    );
  });

  it("::: materials follows the amount and what's on hand", async () => {
    const { enhanceMaterials } = await import("./client");
    const { render } = await import("./test-render");
    document.body.innerHTML = render(
      "::: materials Enchanted Diamond :::",
    ).html;
    enhanceMaterials(document);
    const totals = () =>
      document.querySelector("[data-materials-totals]")?.textContent;
    expect(totals()).toContain("160 × Diamond");
    type(document.querySelector("[data-amount]"), "3");
    expect(totals()).toContain("480 × Diamond");
    type(document.querySelector('[data-have="diamond"]'), "80");
    expect(totals()).toContain("400 × Diamond");
  });
});

describe("placeTooltips", () => {
  placeTooltips(document);

  /** A slot with a 200×80 tooltip (jsdom lays nothing out), its box at 100,100–136,136. */
  function slot(): { link: HTMLElement; tooltip: HTMLElement } {
    document.body.innerHTML = `<span class="mc-slot mc-item"><a data-slot href="#">x</a><span class="mc-tooltip" role="tooltip">Tip</span></span>`;
    const link = document.querySelector<HTMLElement>("[data-slot]");
    const tooltip = document.querySelector<HTMLElement>(".mc-tooltip");
    if (!link || !tooltip) throw new Error("no slot");
    Object.defineProperty(tooltip, "offsetWidth", { value: 200 });
    Object.defineProperty(tooltip, "offsetHeight", { value: 80 });
    const item = tooltip.parentElement;
    if (item)
      item.getBoundingClientRect = () =>
        DOMRect.fromRect({ x: 100, y: 100, width: 36, height: 36 });
    return { link, tooltip };
  }

  function point(
    target: Element,
    type: string,
    x: number,
    y: number,
    pointerType = "mouse",
  ): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, "pointerType", { value: pointerType });
    target.dispatchEvent(event);
  }

  it("follows a mouse, right of the cursor and a little above", () => {
    const { link, tooltip } = slot();
    point(link, "pointerover", 110, 300);
    expect([
      tooltip.style.position,
      tooltip.style.left,
      tooltip.style.top,
    ]).toEqual([
      "fixed",
      `${String(110 + CURSOR_OFFSET.x)}px`,
      `${String(300 + CURSOR_OFFSET.y)}px`,
    ]);
    point(link, "pointermove", 130, 310);
    expect(tooltip.style.left).toBe(`${String(130 + CURSOR_OFFSET.x)}px`);
    expect(tooltip.style.top).toBe(`${String(310 + CURSOR_OFFSET.y)}px`);
  });

  it("flips to the cursor's left near the right edge, and stays on screen", () => {
    const { link, tooltip } = slot();
    point(link, "pointermove", window.innerWidth - 50, window.innerHeight - 5);
    expect(tooltip.style.left).toBe(
      `${String(window.innerWidth - 50 - CURSOR_OFFSET.x - 200)}px`,
    );
    expect(tooltip.style.top).toBe(`${String(window.innerHeight - 8 - 80)}px`);
  });

  it("sits under the item for keyboard focus and touch", () => {
    const { link, tooltip } = slot();
    link.focus();
    expect([tooltip.style.left, tooltip.style.top]).toEqual(["100px", "142px"]);
    tooltip.style.top = "";
    point(link, "pointerover", 300, 300, "touch");
    expect(tooltip.style.top).toBe("142px");
  });
});
