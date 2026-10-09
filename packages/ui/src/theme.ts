/**
 * Light/dark theme handling shared by every app.
 *
 * The page follows the system setting until the visitor flips the toggle. Flipping away
 * from the system choice is remembered; flipping back to match it forgets the override,
 * so the page follows the system again ("smart reset").
 */

import { prefersReducedMotion } from "./motion";
import { preferenceStorage } from "./consent";
import { scriptLiteral } from "./script";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "trilleo-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Browser UI color (`<meta name="theme-color">`) per theme; matches the paper token. */
export const THEME_COLORS: Readonly<Record<Theme, string>> = {
  light: "#f2f2ee",
  dark: "#0f0f0e",
};

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** A stored override wins; otherwise the system preference decides. */
export function resolveTheme(
  stored: string | null,
  systemDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return systemDark ? "dark" : "light";
}

/**
 * Flips `current`. `stored` is what to persist: the new theme, or `null` when it matches
 * the system preference and the override should be forgotten.
 */
export function nextThemeChoice(
  current: Theme,
  systemDark: boolean,
): { theme: Theme; stored: Theme | null } {
  const theme: Theme = current === "dark" ? "light" : "dark";
  const system: Theme = systemDark ? "dark" : "light";
  return { theme, stored: theme === system ? null : theme };
}

/**
 * Reads the stored override: localStorage, or this tab's sessionStorage when the
 * visitor turned "preferences" off (consent.ts). Storage can throw (private mode,
 * blocked cookies).
 */
export function readStoredTheme(win: Window): Theme | null {
  for (const read of [
    () => win.localStorage.getItem(THEME_STORAGE_KEY),
    () => win.sessionStorage.getItem(THEME_STORAGE_KEY),
  ]) {
    try {
      const value = read();
      if (isTheme(value)) return value;
    } catch {
      // That storage is unavailable; try the other.
    }
  }
  return null;
}

export function writeStoredTheme(win: Window, value: Theme | null): void {
  const store = preferenceStorage(win);
  try {
    if (value === null) store?.removeItem(THEME_STORAGE_KEY);
    else store?.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Storage unavailable: the choice lasts for this page view only.
  }
}

export function applyTheme(doc: Document, theme: Theme): void {
  doc.documentElement.dataset.theme = theme;
  for (const meta of doc.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    meta.content = THEME_COLORS[theme];
  }
}

/**
 * Inline `<head>` script that applies the theme before first paint, so dark-mode visitors
 * never see a light flash. Mirrors resolveTheme() + applyTheme(); theme.test.ts keeps
 * them in step. It must stay dependency-free: it runs before any bundle loads.
 */
export const themeInitScript = `(function(){var s=null,k=${scriptLiteral(
  THEME_STORAGE_KEY,
)};try{s=localStorage.getItem(k)}catch(e){}if(s!=="light"&&s!=="dark")try{s=sessionStorage.getItem(k)}catch(e){}var t=s==="light"||s==="dark"?s:matchMedia(${scriptLiteral(
  DARK_QUERY,
)}).matches?"dark":"light";var d=document;d.documentElement.dataset.theme=t;var c=t==="dark"?${scriptLiteral(
  THEME_COLORS.dark,
)}:${scriptLiteral(THEME_COLORS.light)};d.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c})})();`;

/**
 * Runs `update` (which applies a theme) so the new theme sweeps across the page behind
 * a straight diagonal edge, from the top-right corner to the bottom-left
 * (styles/theme.css). Falls back to an instant switch without the View Transitions
 * API or when the visitor prefers reduced motion.
 */
export function switchThemeWithWipe(doc: Document, update: () => void): void {
  const win = doc.defaultView;
  if (
    !win ||
    typeof doc.startViewTransition !== "function" ||
    prefersReducedMotion(win)
  ) {
    update();
    return;
  }

  const root = doc.documentElement;
  root.setAttribute("data-theme-switching", "");

  const done = (): void => {
    root.removeAttribute("data-theme-switching");
  };
  const transition = doc.startViewTransition(update);
  // A quick second click skips this transition, which rejects `ready`; the theme
  // still switches, so that's fine.
  transition.ready.catch(done);
  transition.finished.then(done, done);
}

/**
 * Wires a toggle button: flips the theme on click (with a sweep, see
 * switchThemeWithWipe) and follows system changes while no override is stored. The
 * button's label ("Dark mode" / "Light mode") follows <html data-theme> in CSS, so
 * it's right from first paint. Returns a cleanup.
 */
export function bindThemeToggle(
  button: HTMLButtonElement,
  win: Window = window,
): () => void {
  const doc = win.document;
  const system = win.matchMedia(DARK_QUERY);
  const current = (): Theme =>
    doc.documentElement.dataset.theme === "dark" ? "dark" : "light";

  const onClick = (): void => {
    const { theme, stored } = nextThemeChoice(current(), system.matches);
    writeStoredTheme(win, stored);
    switchThemeWithWipe(doc, () => {
      applyTheme(doc, theme);
    });
  };
  const onSystemChange = (): void => {
    if (readStoredTheme(win) !== null) return;
    applyTheme(doc, resolveTheme(null, system.matches));
  };

  button.addEventListener("click", onClick);
  system.addEventListener("change", onSystemChange);
  return () => {
    button.removeEventListener("click", onClick);
    system.removeEventListener("change", onSystemChange);
  };
}
