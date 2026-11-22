/**
 * Browser notifications for the event timer, for anyone (no account): the events
 * chosen on their pages and how long before, kept in this browser
 * (NOTIFY_KEY, a "preferences" key, so preferenceStorage applies the cookie choice).
 * They fire only while an event timer page is open: the page lists each event's
 * next times (`[data-notify-event][data-notify-start][data-notify-name]`), and a
 * check every few seconds shows one when its time is due (@trilleo/skyblock/events'
 * rules, the same as the emails'). Each fires once per page (kept in memory only, so
 * nothing else is stored; a reload within the grace may show one again).
 *
 * `[data-browser-notify]` blocks (hidden without JavaScript) hold the controls: a
 * lead select and a button that turns the event on or off.
 */
import { REMINDER_LIMITS, reminderSubject } from "@trilleo/skyblock/events";
import { preferenceStorage } from "@trilleo/ui/consent";

export const NOTIFY_KEY = "trilleo:tool:skyblock:notify";

type Choices = Record<string, number>;

export function readChoices(storage: Storage | null): Choices {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(NOTIFY_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && entry[1] >= 0 && entry[1] <= 1440,
      ),
    );
  } catch {
    return {};
  }
}

function writeChoices(storage: Storage | null, choices: Choices): void {
  try {
    if (Object.keys(choices).length === 0) storage?.removeItem(NOTIFY_KEY);
    else storage?.setItem(NOTIFY_KEY, JSON.stringify(choices));
  } catch {
    // Storage full or blocked: the choice lasts for this page only.
  }
}

/** The times due now: chosen, within the lead, not past the grace, not yet shown. */
export function dueNotices(
  times: readonly { slug: string; name: string; start: number }[],
  choices: Choices,
  fired: ReadonlySet<string>,
  now: number,
): { key: string; title: string }[] {
  return times.flatMap((time) => {
    const lead = choices[time.slug];
    if (lead === undefined) return [];
    const key = `${time.slug}-${String(time.start)}-${String(lead)}`;
    const due =
      time.start - lead * 60_000 <= now &&
      time.start > now - REMINDER_LIMITS.graceMs;
    return due && !fired.has(key)
      ? [{ key, title: reminderSubject(time.name, time.start, now) }]
      : [];
  });
}

export function startEventNotify(root: ParentNode = document): void {
  if (!("Notification" in window)) return;
  const storage = preferenceStorage(window);
  let choices = readChoices(storage);
  const fired = new Set<string>();

  for (const block of root.querySelectorAll<HTMLElement>(
    "[data-browser-notify]",
  )) {
    const slug = block.dataset.event ?? "";
    const select = block.querySelector<HTMLSelectElement>("select");
    const button = block.querySelector<HTMLButtonElement>("button");
    const status = block.querySelector<HTMLElement>("[data-notify-status]");
    if (!select || !button) continue;
    const show = () => {
      const on = choices[slug] !== undefined;
      button.textContent = on ? "Stop notifying" : "Notify me in this browser";
      button.setAttribute("aria-pressed", String(on));
      if (on) select.value = String(choices[slug]);
      if (status)
        status.textContent =
          Notification.permission === "denied"
            ? "This browser blocks notifications from this site."
            : "";
    };
    block.hidden = false;
    show();
    button.addEventListener("click", () => {
      void (async () => {
        if (choices[slug] !== undefined) {
          choices = Object.fromEntries(
            Object.entries(choices).filter(([key]) => key !== slug),
          );
        } else {
          const permission =
            Notification.permission === "default"
              ? await Notification.requestPermission()
              : Notification.permission;
          if (permission === "granted")
            choices = { ...choices, [slug]: Number(select.value) };
        }
        writeChoices(storage, choices);
        show();
      })();
    });
    select.addEventListener("change", () => {
      if (choices[slug] === undefined) return;
      choices = { ...choices, [slug]: Number(select.value) };
      writeChoices(storage, choices);
    });
  }

  const times = Array.from(
    root.querySelectorAll<HTMLElement>("[data-notify-event]"),
  ).map((element) => ({
    slug: element.dataset.notifyEvent ?? "",
    name: element.dataset.notifyName ?? "",
    start: Number(element.dataset.notifyStart),
  }));
  const check = () => {
    if (Notification.permission !== "granted") return;
    for (const notice of dueNotices(times, choices, fired, Date.now())) {
      fired.add(notice.key);
      new Notification(notice.title, { tag: notice.key });
    }
  };
  check();
  window.setInterval(check, 5000);
}
