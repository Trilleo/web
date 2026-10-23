import { describe, expect, it } from "vitest";
import { BIOMES, PIXELS_PER_METRE } from "../core";
import { SCENE_FADE_METRES, sceneLayers } from "./draw";

const at = (metres: number) => sceneLayers(metres * PIXELS_PER_METRE);

describe("scenery between biomes", () => {
  it("shows one biome away from the boundaries", () => {
    expect(at(10)).toEqual([{ biome: "terminal", alpha: 1 }]);
    expect(at(1000 + SCENE_FADE_METRES)).toEqual([
      { biome: "server-room", alpha: 1 },
    ]);
  });

  it("crossfades into the next biome, gently at both ends", () => {
    const from = BIOMES[1]?.fromMetres ?? 0;
    const start = at(from);
    expect(start).toEqual([
      { biome: "terminal", alpha: 1 },
      { biome: "server-room", alpha: 0 },
    ]);
    const middle = at(from + SCENE_FADE_METRES / 2);
    expect(middle[1]?.alpha).toBeCloseTo(0.5);
    const early = at(from + SCENE_FADE_METRES / 10);
    // Eased: a tenth of the way in, well under a tenth faded in.
    expect(early[1]?.alpha).toBeLessThan(0.1);
    for (const metres of [from, from + 10, from + 45, from + 80]) {
      const sum = at(metres).reduce((total, layer) => total + layer.alpha, 0);
      expect(sum).toBeCloseTo(1);
    }
  });
});
