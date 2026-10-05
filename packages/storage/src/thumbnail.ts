/**
 * Thumbnails: small WebP previews for lists (the admin's files, the review queue,
 * someone's files page) and video posters. The browser makes them right after an
 * upload (it can decode what it can show; the server has no image codecs), and the
 * site stores one per file, checked to really be a small WebP.
 */
import { PUBLIC_CACHE, contentDisposition, type ServeHeaders } from "./files";

/** The longest side, in pixels. */
export const THUMBNAIL_MAX_SIDE = 480;
export const THUMBNAIL_MAX_BYTES = 200 * 1024;
/** Thumbnails are only taken this soon after the upload started. */
export const THUMBNAIL_WINDOW_MS = 60 * 60 * 1000;

/** Where a file's thumbnail is kept. */
export function thumbnailKey(fileId: string): string {
  return `t/${fileId}.webp`;
}

export const THUMBNAIL_HEADERS: ServeHeaders = {
  contentType: "image/webp",
  contentDisposition: contentDisposition("inline", "thumbnail.webp"),
  cacheControl: PUBLIC_CACHE,
};

/** Whether the bytes are a WebP image (RIFF....WEBP). */
export function isWebp(bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  return bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

/** What a thumbnail can be made from: browser-decodable images and videos. */
export function thumbnailSource(file: File): "image" | "video" | null {
  if (/^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(file.type)) return "image";
  if (/^video\/(mp4|webm|quicktime)$/.test(file.type)) return "video";
  return null;
}

function scaled(width: number, height: number) {
  const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encode(
  draw: (context: CanvasRenderingContext2D) => void,
  size: { width: number; height: number },
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  draw(context);
  for (const quality of [0.8, 0.6, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
    // Browsers that can't write WebP hand back a PNG instead: no thumbnail then.
    if (blob?.type !== "image/webp") return null;
    if (blob.size <= THUMBNAIL_MAX_BYTES) return blob;
  }
  return null;
}

function videoFrame(file: File, signal: AbortSignal): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(blob);
    };
    signal.addEventListener("abort", () => {
      done(null);
    });
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onerror = () => {
      done(null);
    };
    video.onloadedmetadata = () => {
      // A second in skips black lead-in frames; short clips use their middle.
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    };
    video.onseeked = () => {
      const size = scaled(video.videoWidth, video.videoHeight);
      encode((context) => {
        context.drawImage(video, 0, 0, size.width, size.height);
      }, size).then(done, () => {
        done(null);
      });
    };
    video.src = url;
  });
}

/**
 * A WebP thumbnail of an image or video, or null when the browser can't make one
 * (unsupported type, can't encode WebP, took too long).
 */
export async function makeThumbnail(
  file: File,
  timeoutMs = 15_000,
): Promise<Blob | null> {
  const source = thumbnailSource(file);
  if (!source || typeof document === "undefined") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    if (source === "video") return await videoFrame(file, controller.signal);
    const bitmap = await createImageBitmap(file);
    const size = scaled(bitmap.width, bitmap.height);
    try {
      return await encode((context) => {
        context.drawImage(bitmap, 0, 0, size.width, size.height);
      }, size);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
