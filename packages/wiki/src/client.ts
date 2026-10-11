/**
 * The browser side of wiki components. Pages work without it: tabs are sections one
 * under another until this turns each `[data-tabs]` box into a tab list (arrow
 * keys, Home and End move between tabs, as the ARIA pattern describes).
 */

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
