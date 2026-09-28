/**
 * Light/dark theme handling shared by every app.
 *
 * The page follows the system setting until the visitor flips the toggle. Flipping away
 * from the system choice is remembered; flipping back to match it forgets the override,
 * so the page follows the system again ("smart reset").
 */

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

/** Reads the stored override. Storage can throw (private mode, blocked cookies). */
export function readStoredTheme(win: Window): Theme | null {
  try {
    const value = win.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(win: Window, value: Theme | null): void {
  try {
    if (value === null) win.localStorage.removeItem(THEME_STORAGE_KEY);
    else win.localStorage.setItem(THEME_STORAGE_KEY, value);
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
export const themeInitScript = `(function(){var s=null;try{s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var t=s==="light"||s==="dark"?s:matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches?"dark":"light";var d=document;d.documentElement.dataset.theme=t;var c=t==="dark"?${JSON.stringify(
  THEME_COLORS.dark,
)}:${JSON.stringify(THEME_COLORS.light)};d.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c})})();`;

/**
 * Wires a toggle button: flips the theme on click, keeps `aria-pressed` (pressed = dark)
 * in sync, and follows system changes while no override is stored. Returns a cleanup.
 */
export function bindThemeToggle(
  button: HTMLButtonElement,
  win: Window = window,
): () => void {
  const doc = win.document;
  const system = win.matchMedia(DARK_QUERY);
  const current = (): Theme =>
    doc.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const sync = (): void => {
    button.setAttribute("aria-pressed", String(current() === "dark"));
  };

  const onClick = (): void => {
    const { theme, stored } = nextThemeChoice(current(), system.matches);
    applyTheme(doc, theme);
    writeStoredTheme(win, stored);
    sync();
  };
  const onSystemChange = (): void => {
    if (readStoredTheme(win) !== null) return;
    applyTheme(doc, resolveTheme(null, system.matches));
    sync();
  };

  sync();
  button.addEventListener("click", onClick);
  system.addEventListener("change", onSystemChange);
  return () => {
    button.removeEventListener("click", onClick);
    system.removeEventListener("change", onSystemChange);
  };
}
