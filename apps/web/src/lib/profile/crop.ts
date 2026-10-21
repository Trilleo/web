/**
 * The picture cropper's arithmetic (the profile page's script), kept pure so it can
 * be tested: which square of the picture shows, and the WebP it becomes.
 */

export interface CropRect {
  /** The square's top-left corner and side, in the picture's pixels. */
  x: number;
  y: number;
  side: number;
  /** Its centre as a fraction of the picture, after keeping it inside. */
  centreX: number;
  centreY: number;
}

/**
 * The square that shows at `zoom` (1: the shorter side fills it) around `centre`
 * (fractions of the picture), moved back inside the picture if it would leave it.
 */
export function coverRect(
  image: { width: number; height: number },
  zoom: number,
  centre: { x: number; y: number },
): CropRect {
  const side = Math.min(image.width, image.height) / Math.max(1, zoom);
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, 0), Math.max(0, max));
  const x = clamp(centre.x * image.width - side / 2, image.width - side);
  const y = clamp(centre.y * image.height - side / 2, image.height - side);
  return {
    x,
    y,
    side,
    centreX: (x + side / 2) / image.width,
    centreY: (y + side / 2) / image.height,
  };
}

/** The canvas as a WebP, or a PNG where the browser can't write WebP (older Safari). */
export async function cropToSquare(canvas: HTMLCanvasElement): Promise<Blob> {
  const encode = (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
  const webp = await encode("image/webp", 0.9);
  if (webp?.type === "image/webp") return webp;
  const png = await encode("image/png");
  if (!png) throw new Error("The picture couldn’t be made.");
  return png;
}
