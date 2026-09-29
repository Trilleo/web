import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION, REDUCED_MOTION_QUERY, prefersReducedMotion } from "./motion";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prefersReducedMotion", () => {
  it("reads the reduced-motion media query", () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === REDUCED_MOTION_QUERY,
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(prefersReducedMotion(window)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it("is false when motion is fine or matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersReducedMotion(window)).toBe(false);
    expect(prefersReducedMotion({} as Window)).toBe(false);
  });
});

describe("MOTION", () => {
  it("keeps durations in the crisp range the CSS tokens use", () => {
    expect(MOTION.fast).toBeLessThan(MOTION.base);
    expect(MOTION.base).toBeLessThan(MOTION.slow);
    expect(MOTION.slow).toBeLessThanOrEqual(0.5);
  });
});
