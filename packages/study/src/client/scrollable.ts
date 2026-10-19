/**
 * Display equations wider than the column scroll sideways (study.css). A scrolling
 * box must be reachable by keyboard to be scrolled, but making every equation a tab
 * stop would bury the page in them, so only the ones that overflow right now get
 * `tabindex="0"`, re-checked whenever their width changes (rotating a phone).
 */

export const SCROLLABLE_MATH = ".katex-display";

/** Makes `box` focusable (labelled "Equation") while it overflows, and not otherwise. */
export function updateScrollable(box: HTMLElement): void {
  const overflows = box.scrollWidth > box.clientWidth;
  if (overflows === box.hasAttribute("tabindex")) return;
  if (overflows) {
    box.tabIndex = 0;
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Equation");
  } else {
    box.removeAttribute("tabindex");
    box.removeAttribute("role");
    box.removeAttribute("aria-label");
  }
}

/** Watches every display equation under `root`. */
export function enhanceScrollableMath(root: ParentNode = document): void {
  const boxes = [...root.querySelectorAll<HTMLElement>(SCROLLABLE_MATH)];
  if (boxes.length === 0) return;
  for (const box of boxes) updateScrollable(box);
  if (typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) updateScrollable(entry.target as HTMLElement);
  });
  for (const box of boxes) observer.observe(box);
}
