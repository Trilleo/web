/**
 * Scrolls a `sticky-list` (theme.css) so `item` is visible inside it, without
 * moving the page (`scrollIntoView` would scroll every ancestor). Does nothing
 * when the item is already in view or the list doesn't scroll.
 *
 * `center` puts the item in the middle of the part on screen (on load, so
 * what's around the current lesson shows); otherwise the list moves just enough, with `margin` to spare.
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

  // Before the page scrolls, the list may run past the window's bottom: centre
  // in the part that shows.
  const shown = Math.max(
    itemBox.height,
    Math.min(list.clientHeight, window.innerHeight - listBox.top),
  );

  let next: number;
  if (center) next = top - (shown - itemBox.height) / 2;
  else if (top - margin < viewTop) next = top - margin;
  else if (bottom + margin > viewBottom)
    next = bottom + margin - list.clientHeight;
  else return;

  const max = list.scrollHeight - list.clientHeight;
  next = Math.max(0, Math.min(max, next));
  if (Math.abs(next - list.scrollTop) < 1) return;
  list.scrollTo({ top: next, behavior: smooth ? "smooth" : "instant" });
}
