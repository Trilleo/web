import { describe, expect, it, vi } from "vitest";
import { keepInView } from "./sticky-list";

/** A list 100px tall scrolled to `scrollTop`, holding 1000px, and an item at `itemTop` (20px tall). */
function setup(scrollTop: number, itemTop: number, scrollHeight = 1000) {
  const list = document.createElement("ol");
  const item = document.createElement("li");
  list.append(item);
  Object.defineProperty(list, "clientHeight", { value: 100 });
  Object.defineProperty(list, "scrollHeight", { value: scrollHeight });
  Object.defineProperty(list, "scrollTop", {
    value: scrollTop,
    writable: true,
  });
  list.getBoundingClientRect = () => ({ top: 50 }) as DOMRect;
  item.getBoundingClientRect = () =>
    ({ top: 50 + itemTop - scrollTop, height: 20 }) as DOMRect;
  const scrollTo = vi.fn();
  list.scrollTo = scrollTo as typeof list.scrollTo;
  return { list, item, scrollTo };
}

describe("keepInView", () => {
  it("leaves an item that's already visible", () => {
    const { list, item, scrollTo } = setup(0, 40);
    keepInView(list, item);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls down just enough for an item below", () => {
    const { list, item, scrollTo } = setup(0, 300);
    keepInView(list, item, { margin: 10 });
    expect(scrollTo).toHaveBeenCalledWith({ top: 230, behavior: "instant" });
  });

  it("scrolls up for an item above", () => {
    const { list, item, scrollTo } = setup(500, 300);
    keepInView(list, item, { margin: 10, smooth: true });
    expect(scrollTo).toHaveBeenCalledWith({ top: 290, behavior: "smooth" });
  });

  it("centres the item when asked, within the list's range", () => {
    const { list, item, scrollTo } = setup(0, 500);
    keepInView(list, item, { center: true });
    expect(scrollTo).toHaveBeenCalledWith({ top: 460, behavior: "instant" });

    const near = setup(0, 980);
    keepInView(near.list, near.item, { center: true });
    expect(near.scrollTo).toHaveBeenCalledWith({
      top: 900,
      behavior: "instant",
    });
  });

  it("does nothing when the list doesn't scroll", () => {
    const { list, item, scrollTo } = setup(0, 300, 100);
    keepInView(list, item);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
