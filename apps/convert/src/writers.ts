/** Small image formats written by hand: BMP, and ICO (PNG images in an icon directory). */

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, row by row from the top, like ImageData. */
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * A 24-bit BMP. BMP rows run bottom-up, in BGR order, padded to 4 bytes. Alpha is
 * dropped: composite onto a background first.
 */
export function encodeBmp({ width, height, data }: Pixels): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const out = new Uint8Array(54 + imageSize);
  const view = new DataView(out.buffer);
  out.set([0x42, 0x4d]); // "BM"
  view.setUint32(2, out.length, true);
  view.setUint32(10, 54, true); // pixel data offset
  view.setUint32(14, 40, true); // BITMAPINFOHEADER
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true); // 72 dpi, in pixels per metre
  view.setInt32(42, 2835, true);
  for (let y = 0; y < height; y++) {
    const row = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = row + x * 3;
      out[to] = data[from + 2] ?? 0;
      out[to + 1] = data[from + 1] ?? 0;
      out[to + 2] = data[from] ?? 0;
    }
  }
  return out;
}

/** An ICO holding one PNG per size (supported since Windows Vista, and by every browser). */
export function encodeIco(
  images: readonly { size: number; png: Uint8Array }[],
): Uint8Array {
  const headerSize = 6 + 16 * images.length;
  const total = images.reduce(
    (sum, image) => sum + image.png.length,
    headerSize,
  );
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    // 256 is stored as 0.
    out[entry] = size >= 256 ? 0 : size;
    out[entry + 1] = size >= 256 ? 0 : size;
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}
