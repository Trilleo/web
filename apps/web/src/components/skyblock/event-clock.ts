/**
 * The event timer's live parts (pages/tools/skyblock/events/): the server writes
 * every time and countdown as of the request, in UTC; this ticks them each second,
 * writes times in the visitor's own zone, and reloads the page once something
 * starts or ends, so "Now" and "Next" move on. Without JavaScript the page is a
 * snapshot that still reads correctly.
 *
 * - `[data-sb-date]` / `[data-sb-clock]`: the SkyBlock date and the game's clock.
 * - `[data-countdown="<ms>"]`: time left until that moment.
 * - `time[data-local]`: rewritten in the visitor's zone.
 * - `[data-progress-start][data-progress-end]`: a bar's width, as a share done.
 * - `[data-boundary="<ms>"]`: a moment the page should reload after.
 */
import {
  formatCountdown,
  formatSkyblockClock,
  formatSkyblockDate,
  skyblockDate,
} from "@trilleo/skyblock/events";

/** A week ahead and further, times carry their date too. */
const DATE_AFTER_MS = 6 * 86_400_000;

export function localTime(ms: number, now: number): string {
  const options: Intl.DateTimeFormatOptions =
    Math.abs(ms - now) < DATE_AFTER_MS
      ? { weekday: "short", hour: "2-digit", minute: "2-digit" }
      : {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        };
  return new Date(ms).toLocaleString(undefined, options);
}

export function startEventClock(root: ParentNode = document): void {
  const all = <T extends Element>(selector: string) =>
    Array.from(root.querySelectorAll<T>(selector));
  for (const time of all<HTMLTimeElement>("time[data-local]")) {
    const ms = Date.parse(time.dateTime);
    if (!Number.isNaN(ms)) time.textContent = localTime(ms, Date.now());
  }
  const boundaries = all<HTMLElement>("[data-boundary]")
    .map((element) => Number(element.dataset.boundary))
    .filter((ms) => Number.isFinite(ms) && ms > Date.now());
  const reloadAt = boundaries.length > 0 ? Math.min(...boundaries) : Infinity;
  let reloading = false;

  const tick = () => {
    const now = Date.now();
    const date = skyblockDate(now);
    for (const element of all<HTMLElement>("[data-sb-date]")) {
      element.textContent = formatSkyblockDate(date);
    }
    for (const element of all<HTMLElement>("[data-sb-clock]")) {
      element.textContent = formatSkyblockClock(date);
    }
    for (const element of all<HTMLElement>("[data-countdown]")) {
      element.textContent = formatCountdown(
        Number(element.dataset.countdown) - now,
      );
    }
    for (const bar of all<HTMLElement>("[data-progress-start]")) {
      const start = Number(bar.dataset.progressStart);
      const end = Number(bar.dataset.progressEnd);
      const done = end > start ? (now - start) / (end - start) : 1;
      bar.style.width = `${String(Math.min(100, Math.max(0, done * 100)))}%`;
    }
    // A second's grace, so the server agrees the moment has passed. A hidden tab
    // waits until it's looked at again.
    if (
      !reloading &&
      now >= reloadAt + 1000 &&
      document.visibilityState === "visible"
    ) {
      reloading = true;
      window.location.reload();
    }
  };
  tick();
  window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
}
