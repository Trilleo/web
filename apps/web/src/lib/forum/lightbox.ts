/**
 * Opens a post's pictures full size (components/forum/Lightbox.astro): clicking a
 * link with data-lightbox shows it in the dialog, Previous/Next and the arrow keys
 * step through that post's pictures, Escape or Close shuts it and focus returns to
 * the link. Without JavaScript the links just open the picture.
 */
export function enhanceLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>(
    "[data-lightbox-dialog]",
  );
  const image = dialog?.querySelector<HTMLImageElement>(
    "[data-lightbox-image]",
  );
  const caption = dialog?.querySelector<HTMLElement>("[data-lightbox-caption]");
  if (!dialog || !image || !caption) return;
  let group: HTMLAnchorElement[] = [];
  let index = 0;
  let opener: HTMLAnchorElement | null = null;

  const show = () => {
    const link = group[index];
    if (!link) return;
    image.src = link.href;
    image.alt = link.dataset.caption ?? "";
    caption.textContent = `${link.dataset.caption ?? ""}${group.length > 1 ? ` (${String(index + 1)} of ${String(group.length)})` : ""}`;
  };
  const step = (by: number) => {
    if (group.length < 2) return;
    index = (index + by + group.length) % group.length;
    show();
  };

  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a[data-lightbox]",
    );
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    group = [
      ...document.querySelectorAll<HTMLAnchorElement>(
        `a[data-lightbox="${CSS.escape(link.dataset.lightbox ?? "")}"]`,
      ),
    ];
    index = Math.max(0, group.indexOf(link));
    opener = link;
    show();
    dialog.showModal();
  });
  dialog
    .querySelector("[data-lightbox-prev]")
    ?.addEventListener("click", () => {
      step(-1);
    });
  dialog
    .querySelector("[data-lightbox-next]")
    ?.addEventListener("click", () => {
      step(1);
    });
  dialog
    .querySelector("[data-lightbox-close]")
    ?.addEventListener("click", () => {
      dialog.close();
    });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
  // A click on the backdrop (the dialog itself, outside the figure) closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    opener?.focus();
  });
}
