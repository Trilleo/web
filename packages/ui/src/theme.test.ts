import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DARK_QUERY,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  applyTheme,
  bindThemeToggle,
  nextThemeChoice,
  readStoredTheme,
  resolveTheme,
  switchThemeWithWipe,
  themeInitScript,
  writeStoredTheme,
} from "./theme";

/** Stubs matchMedia with a controllable system preference. */
function mockSystem(initiallyDark: boolean) {
  let dark = initiallyDark;
  const listeners = new Set<() => void>();
  const query = {
    media: DARK_QUERY,
    get matches() {
      return dark;
    },
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query),
  );
  return {
    listenerCount: () => listeners.size,
    setDark(value: boolean) {
      dark = value;
      for (const listener of listeners) listener();
    },
  };
}

function addThemeColorMeta(): HTMLMetaElement {
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  document.head.append(meta);
  return meta;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme-switching");
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
  it("prefers a stored override", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to the system preference", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("ignores unknown stored values", () => {
    expect(resolveTheme("sepia", true)).toBe("dark");
  });
});

describe("nextThemeChoice (smart reset)", () => {
  it.each([
    { current: "light", systemDark: false, theme: "dark", stored: "dark" },
    { current: "dark", systemDark: false, theme: "light", stored: null },
    { current: "dark", systemDark: true, theme: "light", stored: "light" },
    { current: "light", systemDark: true, theme: "dark", stored: null },
  ] as const)(
    "flips $current (system dark: $systemDark) to $theme, storing $stored",
    ({ current, systemDark, theme, stored }) => {
      expect(nextThemeChoice(current, systemDark)).toEqual({ theme, stored });
    },
  );
});

describe("stored theme", () => {
  it("round-trips through localStorage and clears on null", () => {
    writeStoredTheme(window, "dark");
    expect(readStoredTheme(window)).toBe("dark");
    writeStoredTheme(window, null);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("treats unknown values as no override", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readStoredTheme(window)).toBeNull();
  });

  it("survives storage that throws", () => {
    const broken = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    } as unknown as Window;
    expect(readStoredTheme(broken)).toBeNull();
    expect(() => {
      writeStoredTheme(broken, "dark");
    }).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("sets data-theme and the browser theme color", () => {
    const meta = addThemeColorMeta();
    applyTheme(document, "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(meta.content).toBe(THEME_COLORS.dark);
  });
});

describe("themeInitScript", () => {
  function runInitScript() {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs our own constant; jsdom's <script> context can't see test stubs
    const run = new Function(themeInitScript) as () => void;
    run();
  }

  it.each([
    { stored: "dark", systemDark: false, expected: "dark" },
    { stored: "light", systemDark: true, expected: "light" },
    { stored: null, systemDark: true, expected: "dark" },
    { stored: null, systemDark: false, expected: "light" },
  ] as const)(
    "matches resolveTheme (stored: $stored, system dark: $systemDark)",
    ({ stored, systemDark, expected }) => {
      mockSystem(systemDark);
      if (stored) localStorage.setItem(THEME_STORAGE_KEY, stored);
      const meta = addThemeColorMeta();

      runInitScript();

      expect(resolveTheme(stored, systemDark)).toBe(expected);
      expect(document.documentElement.dataset.theme).toBe(expected);
      expect(meta.content).toBe(THEME_COLORS[expected]);
    },
  );
});

describe("bindThemeToggle", () => {
  function setup(systemDark: boolean) {
    const system = mockSystem(systemDark);
    applyTheme(document, resolveTheme(readStoredTheme(window), systemDark));
    const button = document.createElement("button");
    document.body.append(button);
    const cleanup = bindThemeToggle(button);
    return { button, system, cleanup };
  }

  it("flips the theme, reflects it in aria-pressed, and forgets a choice that matches the system", () => {
    const { button } = setup(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");

    button.click();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    button.click();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("follows system changes while there is no override", () => {
    const { button, system } = setup(false);
    system.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps an override when the system changes", () => {
    const { button, system } = setup(false);
    button.click(); // dark, stored as an override
    system.setDark(false);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("removes its listeners on cleanup", () => {
    const { button, system, cleanup } = setup(false);
    cleanup();
    expect(system.listenerCount()).toBe(0);
    button.click();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("switchThemeWithWipe", () => {
  /** Stubs document.startViewTransition; returns the mock. */
  function mockViewTransitions() {
    let finish: (() => void) | undefined;
    const start = vi.fn((update: () => void) => {
      update();
      return {
        ready: Promise.resolve(),
        finished: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: start,
    });
    return {
      start,
      finish: () => {
        finish?.();
      },
    };
  }

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("switches instantly without the View Transitions API", () => {
    const update = vi.fn();
    switchThemeWithWipe(document, document.body, update);
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.hasAttribute("data-theme-switching")).toBe(
      false,
    );
  });

  it("wipes from the button's center inside a view transition", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const vt = mockViewTransitions();
    const button = document.createElement("button");
    button.getBoundingClientRect = () =>
      ({ left: 100, top: 20, width: 40, height: 20 }) as DOMRect;
    const update = vi.fn();

    switchThemeWithWipe(document, button, update);

    const root = document.documentElement;
    expect(vt.start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(root.style.getPropertyValue("--tr-wipe-x")).toBe("120px");
    expect(root.style.getPropertyValue("--tr-wipe-y")).toBe("30px");
    expect(root.hasAttribute("data-theme-switching")).toBe(true);

    vt.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(root.hasAttribute("data-theme-switching")).toBe(false);
  });

  it("switches instantly when the visitor prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const vt = mockViewTransitions();
    const update = vi.fn();
    switchThemeWithWipe(document, document.body, update);
    expect(vt.start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });
});
