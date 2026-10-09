/**
 * Cookie and storage consent: what a visitor allowed, kept in this browser. Two
 * optional categories on top of the necessary ones (signing in, and this choice):
 *
 *   preferences  things kept in this browser so the site remembers them: light/dark
 *                mode, tool data and game saves while signed out. On by default;
 *                off, they last for the tab only (sessionStorage).
 *   analytics    Cloudflare Web Analytics (cookieless page counts). Off until
 *                allowed, and never with Global Privacy Control on.
 *
 * Browser-only and dependency-free: the theme, tools and games read it. Storage can
 * throw (private modes, blocked site data); every read and write here copes.
 */
export const CONSENT_STORAGE_KEY = "trilleo:consent";
/** Bump when the categories change, so everyone is asked again. */
export const CONSENT_VERSION = 1;
/** Fired on window after a choice is saved; `detail` is the Consent. */
export const CONSENT_EVENT = "trilleo:consent";

export interface ConsentChoice {
  analytics: boolean;
  preferences: boolean;
}

export interface Consent extends ConsentChoice {
  v: number;
  /** When it was chosen (ISO). */
  at: string;
}

/**
 * What's in the browser's own storage that "preferences" covers: these keys (the
 * theme's, THEME_STORAGE_KEY; theme.ts imports this module, so it's spelled out and
 * consent.test.ts checks it), and everything under these prefixes.
 */
export const PREFERENCE_KEYS = ["trilleo-theme"] as const;
export const PREFERENCE_PREFIXES = ["trilleo:tool:", "trilleo:game:"] as const;

type Win = Pick<Window, "localStorage" | "sessionStorage" | "navigator">;

function local(win: Win): Storage | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

function session(win: Win): Storage | null {
  try {
    return win.sessionStorage;
  } catch {
    return null;
  }
}

/** A stored choice, or null if there's none (or it's from an older version). */
export function parseConsent(raw: string | null): Consent | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    if (
      record.v !== CONSENT_VERSION ||
      typeof record.analytics !== "boolean" ||
      typeof record.preferences !== "boolean" ||
      typeof record.at !== "string"
    )
      return null;
    return {
      v: CONSENT_VERSION,
      analytics: record.analytics,
      preferences: record.preferences,
      at: record.at,
    };
  } catch {
    return null;
  }
}

export function readConsent(win: Win): Consent | null {
  try {
    return parseConsent(local(win)?.getItem(CONSENT_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Saves a choice (the record itself is necessary: it's how the site remembers it). */
export function saveConsent(
  win: Win,
  choice: ConsentChoice,
  now = new Date(),
): Consent {
  const consent: Consent = {
    v: CONSENT_VERSION,
    analytics: choice.analytics,
    preferences: choice.preferences,
    at: now.toISOString(),
  };
  try {
    local(win)?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
  return consent;
}

/** The browser's Global Privacy Control signal ("don't sell or share"). */
export function gpcEnabled(win: Win): boolean {
  return (
    (win.navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

export function analyticsAllowed(win: Win): boolean {
  return !gpcEnabled(win) && readConsent(win)?.analytics === true;
}

export function preferencesAllowed(win: Win): boolean {
  return readConsent(win)?.preferences ?? true;
}

/**
 * Where to keep things the site remembers: localStorage, or sessionStorage (this
 * tab only) when "preferences" is off. Null when neither is available.
 */
export function preferenceStorage(win: Win): Storage | null {
  return preferencesAllowed(win) ? local(win) : session(win);
}

function preferenceKeys(store: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (
      key !== null &&
      ((PREFERENCE_KEYS as readonly string[]).includes(key) ||
        PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix)))
    )
      keys.push(key);
  }
  return keys;
}

/** How many remembered things this browser keeps (for the settings' warning). */
export function countPreferences(win: Win): number {
  const store = local(win);
  try {
    return store ? preferenceKeys(store).length : 0;
  } catch {
    return 0;
  }
}

/** Deletes what "preferences" covers from localStorage. Returns how many. */
export function clearPreferences(win: Win): number {
  const store = local(win);
  if (!store) return 0;
  try {
    const keys = preferenceKeys(store);
    for (const key of keys) store.removeItem(key);
    return keys.length;
  } catch {
    return 0;
  }
}
