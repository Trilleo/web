/**
 * Reactions without a page load: the reaction forms post to /forum/engage asking
 * for JSON, and the post's buttons take the new counts. Without JavaScript the
 * forms post and come back to the page.
 */
interface Summary {
  key: string;
  label: string;
  count: number;
  mine: boolean;
  people: string[];
}

function apply(bar: HTMLElement, summaries: readonly Summary[]): void {
  const byKey = new Map(summaries.map((summary) => [summary.key, summary]));
  for (const form of bar.querySelectorAll<HTMLFormElement>(
    ":scope > form[data-reaction]",
  )) {
    const key = form.dataset.reaction ?? "";
    const summary = byKey.get(key);
    const count = summary?.count ?? 0;
    form.hidden = count === 0;
    const button = form.querySelector("button");
    const counter = form.querySelector("[data-count]");
    if (counter) counter.textContent = String(count);
    if (button) {
      button.setAttribute("aria-pressed", summary?.mine ? "true" : "false");
      const label = button.getAttribute("aria-label")?.split(":")[0] ?? key;
      const people = summary?.people.join(", ") ?? "";
      const name = `${label}: ${String(count)}${people ? ` (${people})` : ""}`;
      button.setAttribute("aria-label", name);
      button.title = name;
    }
  }
}

export function enhanceReactions(): void {
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.reaction) return;
    const bar = form.closest<HTMLElement>("[data-reactions]");
    if (!bar) return;
    event.preventDefault();
    void fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const result = (await response.json()) as { reactions?: Summary[] };
        apply(bar, result.reactions ?? []);
        bar.querySelector("details[open]")?.removeAttribute("open");
      })
      .catch(() => {
        form.submit();
      });
  });
}
