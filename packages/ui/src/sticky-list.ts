/** The gap kept below a `sticky-list`, as theme.css keeps above it (1.5rem). */
const GAP_REM = 1.5;

/**
 * Keeps a `sticky-list` (theme.css) ending inside the window. The CSS caps it at
 * the screen's height, which is right once it's stuck; before that (the page
 * scrolled less than the header's height) it starts lower and its end would sit
 * below the fold. This sets its max-height to the room left under its top,
 * again as the page scrolls or the window resizes. Returns a cleanup.
 */
export function fitToWindow(list: HTMLElement): () => void {
  let frame = 0;
  const fit = () => {
    frame = 0;
    const gap =
      GAP_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const top = Math.max(list.getBoundingClientRect().top, gap);
    list.style.maxHeight = `${String(Math.max(0, window.innerHeight - top - gap))}px`;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(fit);
  };
  fit();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

/**
 * Scrolls a `sticky-list` (theme.css) so `item` is visible inside it, without
 * moving the page (`scrollIntoView` would scroll every ancestor). Does nothing
 * when the item is already in view or the list doesn't scroll.
 *
 * `center` puts the item in the middle (on load, so what's around the current
 * lesson shows); otherwise the list moves just enough, with `margin` to spare.
 */
export function keepInView(
  list: HTMLElement,
  item: HTMLElement,
  { center = false, smooth = false, margin = 24 } = {},
): void {
  if (list.scrollHeight <= list.clientHeight) return;
  const listBox = list.getBoundingClientRect();
  const itemBox = item.getBoundingClientRect();
  const top = itemBox.top - listBox.top + list.scrollTop;
  const bottom = top + itemBox.height;
  const viewTop = list.scrollTop;
  const viewBottom = viewTop + list.clientHeight;

  let next: number;
  if (center) next = top - (list.clientHeight - itemBox.height) / 2;
  else if (top - margin < viewTop) next = top - margin;
  else if (bottom + margin > viewBottom)
    next = bottom + margin - list.clientHeight;
  else return;

  const max = list.scrollHeight - list.clientHeight;
  next = Math.max(0, Math.min(max, next));
  if (Math.abs(next - list.scrollTop) < 1) return;
  list.scrollTo({ top: next, behavior: smooth ? "smooth" : "instant" });
}
