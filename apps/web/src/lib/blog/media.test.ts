import { media, openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MEDIA_MAX_BYTES,
  getMedia,
  parseMediaFile,
  saveMedia,
  sniffImageType,
} from "./media";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
]);
const bytes = (text: string) => new TextEncoder().encode(text);

describe("sniffImageType", () => {
  it("knows the accepted formats by their bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(sniffImageType(bytes("GIF89a..."))).toBe("image/gif");
    expect(sniffImageType(bytes("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(bytes("\0\0\0\x1cftypavif"))).toBe("image/avif");
  });

  it("refuses SVG and anything else", () => {
    expect(
      sniffImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
    expect(sniffImageType(bytes("<html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("parseMediaFile", () => {
  it("accepts <sha256>.<ext> only", () => {
    const id = "a".repeat(64);
    expect(parseMediaFile(`${id}.png`)).toEqual({ id, extension: "png" });
    expect(parseMediaFile(`${id}.png/..`)).toBeNull();
    expect(parseMediaFile("abc.png")).toBeNull();
  });
});

describe("saveMedia", () => {
  let handle: DatabaseHandle;
  beforeEach(async () => {
    handle = await openDatabase("memory://");
  });
  afterEach(async () => {
    await handle.close();
  });

  it("stores an image once under its hash", async () => {
    const first = await saveMedia(handle.db, {
      bytes: PNG,
      name: "a/b.png",
      uploadedBy: null,
    });
    const again = await saveMedia(handle.db, {
      bytes: PNG,
      name: "copy.png",
      uploadedBy: null,
    });
    expect(first.ok && first.url).toMatch(/^\/media\/[0-9a-f]{64}\.png$/);
    expect(again).toMatchObject({ ok: true, id: first.ok ? first.id : "" });
    expect(await handle.db.select().from(media)).toHaveLength(1);

    const stored = await getMedia(handle.db, first.ok ? first.id : "");
    expect(stored?.name).toBe("a_b.png");
    expect(Array.from(stored?.data ?? [])).toEqual(Array.from(PNG));
  });

  it("refuses empty, oversized and non-image files", async () => {
    const save = (data: Uint8Array) =>
      saveMedia(handle.db, { bytes: data, name: "x", uploadedBy: null });
    expect(await save(new Uint8Array())).toEqual({ ok: false, error: "empty" });
    expect(await save(new Uint8Array(MEDIA_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: "too-large",
    });
    expect(await save(bytes("<svg/>"))).toEqual({
      ok: false,
      error: "not-an-image",
    });
  });
});
