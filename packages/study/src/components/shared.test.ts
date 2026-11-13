import { describe, expect, it } from "vitest";
import { slugify } from "./shared";

describe("slugify", () => {
  it("makes lower-case slugs without dashes at the ends", () => {
    expect(slugify("  Ohm's Law: V = IR  ")).toBe("ohm-s-law-v-ir");
    expect(slugify("Café — résumé")).toBe("cafe-resume");
    expect(slugify("---")).toBe("item");
  });

  it("stays fast on long runs of dashes", () => {
    const started = performance.now();
    expect(slugify(`${"-".repeat(100_000)}x${"-".repeat(100_000)}y`)).toBe(
      "x-y",
    );
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
