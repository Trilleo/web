import { describe, expect, it } from "vitest";
import { encodeBmp, encodeIco } from "./writers";

describe("encodeBmp", () => {
  it("writes a bottom-up 24-bit BGR bitmap with padded rows", () => {
    // 2×2: red, green / blue, white (RGBA, top row first).
    const data = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const bmp = encodeBmp({ width: 2, height: 2, data });
    const view = new DataView(bmp.buffer);
    expect(String.fromCharCode(bmp[0] ?? 0, bmp[1] ?? 0)).toBe("BM");
    // Rows of 6 bytes pad to 8.
    expect(bmp.length).toBe(54 + 8 * 2);
    expect(view.getUint32(2, true)).toBe(bmp.length);
    expect(view.getInt32(18, true)).toBe(2);
    expect(view.getUint16(28, true)).toBe(24);
    // The first stored row is the bottom one: blue, white (as BGR).
    expect([...bmp.subarray(54, 60)]).toEqual([255, 0, 0, 255, 255, 255]);
    // Then the top row: red, green.
    expect([...bmp.subarray(62, 68)]).toEqual([0, 0, 255, 0, 255, 0]);
  });
});

describe("encodeIco", () => {
  it("writes a directory pointing at each PNG", () => {
    const small = new Uint8Array([1, 2, 3]);
    const large = new Uint8Array([4, 5, 6, 7]);
    const ico = encodeIco([
      { size: 16, png: small },
      { size: 256, png: large },
    ]);
    const view = new DataView(ico.buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
    // Entry 1: 16×16, 3 bytes at offset 38 (6 + 2 × 16).
    expect([ico[6], ico[7]]).toEqual([16, 16]);
    expect(view.getUint32(6 + 8, true)).toBe(3);
    expect(view.getUint32(6 + 12, true)).toBe(38);
    // Entry 2: 256 is stored as 0.
    expect([ico[22], ico[23]]).toEqual([0, 0]);
    expect(view.getUint32(22 + 12, true)).toBe(41);
    expect([...ico.subarray(38)]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
