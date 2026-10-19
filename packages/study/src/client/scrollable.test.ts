// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { enhanceScrollableMath, updateScrollable } from "./scrollable";

/** A box whose widths jsdom (which does no layout) reports as given. */
function box(scrollWidth: () => number, clientWidth = 340): HTMLElement {
  const element = document.createElement("span");
  element.className = "katex-display";
  Object.defineProperty(element, "scrollWidth", { get: scrollWidth });
  Object.defineProperty(element, "clientWidth", { get: () => clientWidth });
  return element;
}

describe("scrollable equations", () => {
  test("an overflowing equation becomes a labelled tab stop", () => {
    const element = box(() => 600);
    updateScrollable(element);
    expect(element.getAttribute("tabindex")).toBe("0");
    expect(element.getAttribute("role")).toBe("group");
    expect(element.getAttribute("aria-label")).toBe("Equation");
  });

  test("one that fits is left alone, and loses the tab stop once it fits", () => {
    const fits = box(() => 300);
    updateScrollable(fits);
    expect(fits.hasAttribute("tabindex")).toBe(false);

    let width = 600;
    const resized = box(() => width);
    updateScrollable(resized);
    width = 300;
    updateScrollable(resized);
    expect(resized.hasAttribute("tabindex")).toBe(false);
    expect(resized.hasAttribute("role")).toBe(false);
    expect(resized.hasAttribute("aria-label")).toBe(false);
  });

  test("even a pixel of overflow scrolls, so it counts", () => {
    const element = box(() => 341);
    updateScrollable(element);
    expect(element.tabIndex).toBe(0);
  });

  test("a scroll box takes its label from data-scroll-label", () => {
    const element = box(() => 600);
    element.className = "study-scroll";
    element.dataset.scrollLabel = "Symbols";
    updateScrollable(element);
    expect(element.getAttribute("aria-label")).toBe("Symbols");
  });

  test("enhanceScrollableMath finds the equations under a root", () => {
    const root = document.createElement("div");
    const wide = box(() => 600);
    const narrow = box(() => 100);
    root.append(wide, narrow);
    enhanceScrollableMath(root);
    expect(wide.tabIndex).toBe(0);
    expect(narrow.hasAttribute("tabindex")).toBe(false);
  });
});
