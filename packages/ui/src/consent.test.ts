import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  PREFERENCE_KEYS,
  analyticsAllowed,
  clearPreferences,
  countPreferences,
  parseConsent,
  preferenceStorage,
  preferencesAllowed,
  readConsent,
  saveConsent,
} from "./consent";
import { THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme } from "./theme";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Reflect.deleteProperty(navigator, "globalPrivacyControl");
});

describe("consent", () => {
  it("defaults to preferences on and analytics off", () => {
    expect(readConsent(window)).toBeNull();
    expect(preferencesAllowed(window)).toBe(true);
    expect(analyticsAllowed(window)).toBe(false);
    expect(preferenceStorage(window)).toBe(localStorage);
  });

  it("keeps a choice, versioned", () => {
    const saved = saveConsent(
      window,
      { analytics: true, preferences: false },
      new Date("2026-10-09T00:00:00Z"),
    );
    expect(saved).toEqual({
      v: CONSENT_VERSION,
      analytics: true,
      preferences: false,
      at: "2026-10-09T00:00:00.000Z",
    });
    expect(readConsent(window)).toEqual(saved);
    expect(analyticsAllowed(window)).toBe(true);
    expect(preferenceStorage(window)).toBe(sessionStorage);
  });

  it("asks again after a version change, and ignores junk", () => {
    expect(
      parseConsent(
        JSON.stringify({ v: 0, analytics: true, preferences: true, at: "x" }),
      ),
    ).toBeNull();
    expect(parseConsent("{not json")).toBeNull();
    expect(parseConsent(JSON.stringify({ v: CONSENT_VERSION }))).toBeNull();
  });

  it("never allows analytics with Global Privacy Control on", () => {
    saveConsent(window, { analytics: true, preferences: true });
    Object.defineProperty(navigator, "globalPrivacyControl", {
      value: true,
      configurable: true,
    });
    expect(analyticsAllowed(window)).toBe(false);
  });

  it("counts and clears only what preferences covers", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    localStorage.setItem("trilleo:tool:notes", "{}");
    localStorage.setItem("trilleo:game:skygrid", "{}");
    localStorage.setItem("something-else", "kept");
    saveConsent(window, { analytics: false, preferences: true });
    expect(countPreferences(window)).toBe(3);
    expect(clearPreferences(window)).toBe(3);
    expect(localStorage.getItem("something-else")).toBe("kept");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).not.toBeNull();
  });

  it("lists the theme's key (spelled out to avoid an import cycle)", () => {
    expect(PREFERENCE_KEYS).toContain(THEME_STORAGE_KEY);
  });

  it("makes the theme last only for the tab with preferences off", () => {
    saveConsent(window, { analytics: false, preferences: false });
    writeStoredTheme(window, "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme(window)).toBe("dark");
  });
});
