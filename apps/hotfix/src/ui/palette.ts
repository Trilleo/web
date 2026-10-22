/** The colours the canvas draws with, resolved from the site's --tr-* tokens. */
export interface Palette {
  paper: string;
  ink: string;
  muted: string;
  hair: string;
  fig: string;
  accent: string;
}

const TOKENS: Readonly<Record<keyof Palette, string>> = {
  paper: "--tr-paper",
  ink: "--tr-ink",
  muted: "--tr-muted",
  hair: "--tr-hair",
  fig: "--tr-fig",
  accent: "--tr-accent",
};

/** Light-theme values, for when there's no stylesheet to read (tests, old browsers). */
export const FALLBACK_PALETTE: Palette = {
  paper: "#f2f2ee",
  ink: "#0e0e0e",
  muted: "#5c5c57",
  hair: "#cfcfc8",
  fig: "#e9e9e4",
  accent: "#e5470f",
};

/**
 * Reads the tokens as the page has them now. They're `light-dark()` values, which
 * only resolve on a real property, so each is read through an element's `color`.
 */
export function readPalette(within: HTMLElement): Palette {
  const probe = document.createElement("span");
  probe.hidden = true;
  within.append(probe);
  try {
    const entries = Object.entries(TOKENS).map(([name, token]) => {
      probe.style.color = `var(${token})`;
      const value = getComputedStyle(probe).color;
      return [name, value || FALLBACK_PALETTE[name as keyof Palette]];
    });
    return Object.fromEntries(entries) as Palette;
  } finally {
    probe.remove();
  }
}

export function paletteKey(palette: Palette): string {
  return Object.values(palette).join("|");
}
