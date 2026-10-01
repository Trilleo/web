import { encode } from "uqr";

export type Correction = "L" | "M" | "Q" | "H";

export const CORRECTIONS: readonly { value: Correction; label: string }[] = [
  { value: "L", label: "L · 7%" },
  { value: "M", label: "M · 15%" },
  { value: "Q", label: "Q · 25%" },
  { value: "H", label: "H · 30%" },
];

export interface QrMatrix {
  version: number;
  /** Modules per side, without the margin. */
  size: number;
  /** true = dark. */
  modules: boolean[][];
}

/** Encodes text; throws when it's too much for any QR code at that correction level. */
export function makeQr(text: string, correction: Correction): QrMatrix {
  const result = encode(text, { ecc: correction, border: 0 });
  return { version: result.version, size: result.size, modules: result.data };
}

/**
 * One SVG path for all dark modules, offset by the margin. Runs of dark modules in
 * a row become one rectangle, which keeps the path short.
 */
export function modulesPath(
  modules: readonly (readonly boolean[])[],
  margin: number,
): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      parts.push(
        `M${String(start + margin)} ${String(y + margin)}h${String(x - start)}v1h${String(start - x)}z`,
      );
    }
  });
  return parts.join("");
}

export interface QrStyle {
  /** Quiet zone, in modules (the standard asks for 4). */
  margin: number;
  foreground: string;
  /** null: transparent. */
  background: string | null;
}

/** A standalone SVG file of the code. */
export function qrSvg(qr: QrMatrix, style: QrStyle): string {
  const side = qr.size + style.margin * 2;
  const background = style.background
    ? `<rect width="${String(side)}" height="${String(side)}" fill="${style.background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(side)} ${String(side)}" shape-rendering="crispEdges">${background}<path fill="${style.foreground}" d="${modulesPath(qr.modules, style.margin)}"/></svg>`;
}

/** Draws the code on a canvas, `scale` pixels per module (rounded to whole pixels). */
export function drawQr(
  canvas: HTMLCanvasElement,
  qr: QrMatrix,
  style: QrStyle,
  pixels: number,
): void {
  const side = qr.size + style.margin * 2;
  const scale = Math.max(1, Math.floor(pixels / side));
  canvas.width = side * scale;
  canvas.height = side * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (style.background) {
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = style.foreground;
  qr.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark)
        ctx.fillRect(
          (x + style.margin) * scale,
          (y + style.margin) * scale,
          scale,
          scale,
        );
    });
  });
}
