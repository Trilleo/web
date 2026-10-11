// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { enhanceTabs } from "./client";

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
