/**
 * Motion timing shared by CSS and JS. The CSS side lives in styles/theme.css
 * (--tr-dur-*, --tr-ease*); these mirror it for React tools animating with Motion,
 * so everything on the site moves at the same pace. Durations are in seconds.
 */

type Bezier = [number, number, number, number];

export const MOTION: {
  readonly ease: Bezier;
  readonly easeOut: Bezier;
  readonly easeIn: Bezier;
  readonly fast: number;
  readonly base: number;
  readonly slow: number;
  readonly stagger: number;
} = {
  ease: [0.2, 0, 0, 1],
  easeOut: [0.16, 1, 0.3, 1],
  easeIn: [0.7, 0, 0.84, 0],
  fast: 0.15,
  base: 0.26,
  slow: 0.45,
  stagger: 0.045,
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor asked for less motion (or the browser can't tell us). */
export function prefersReducedMotion(win: Window = window): boolean {
  if (typeof win.matchMedia !== "function") return false;
  return win.matchMedia(REDUCED_MOTION_QUERY).matches;
}
