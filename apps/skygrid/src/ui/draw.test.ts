import { describe, expect, it } from "vitest";
import { ISLAND_MAPS, MONO_GLYPHS, newGame } from "../core";
import { OVERLAY_GLYPHS, camera, drawWorld } from "./draw";

const T0 = 1_800_000_000_000;

describe("drawWorld", () => {
  it("puts you on the map, marked", () => {
    const state = newGame(1, T0);
    const drawing = drawWorld(state, null, T0);
    expect(drawing.chars[state.pos.y]?.[state.pos.x]).toBe("@");
    expect(drawing.tones[state.pos.y]?.[state.pos.x]).toBe("mark");
  });

  it("draws sign letters as signs, not as the trees they spell", () => {
    const hub = {
      ...newGame(1, T0),
      pos: { island: "hub" as const, x: 8, y: 5 },
    };
    const drawing = drawWorld(hub, null, T0);
    const row = drawing.chars[5]?.join("") ?? "";
    const t = row.indexOf("[FOREST]") + 6; // the T
    expect(drawing.chars[5]?.[t]).toBe("T");
    expect(drawing.tones[5]?.[t]).toBe("ink");
  });

  it("only adds characters Geist Mono has", () => {
    for (const glyph of OVERLAY_GLYPHS) expect(glyph).toMatch(MONO_GLYPHS);
  });
});

describe("camera", () => {
  const size = { width: ISLAND_MAPS.hub.width, height: ISLAND_MAPS.hub.height };

  it("shows everything when it fits", () => {
    expect(camera(size, { cols: 200, rows: 100 }, { x: 5, y: 5 })).toEqual({
      x: 0,
      y: 0,
      cols: size.width,
      rows: size.height,
    });
  });

  it("follows you, but not past the edges", () => {
    expect(camera(size, { cols: 20, rows: 8 }, { x: 30, y: 6 })).toMatchObject({
      x: 20,
      y: 2,
    });
    expect(camera(size, { cols: 20, rows: 8 }, { x: 0, y: 0 })).toMatchObject({
      x: 0,
      y: 0,
    });
  });
});
