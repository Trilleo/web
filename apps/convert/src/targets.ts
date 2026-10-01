/** What the converter can write, and the settings conversions take. */

export type ImageTarget =
  "png" | "jpeg" | "webp" | "avif" | "gif" | "bmp" | "ico" | "tiff";

export type AudioTarget = "mp3" | "wav" | "flac" | "ogg" | "m4a";

export interface TargetInfo<T extends string> {
  id: T;
  label: string;
  ext: string;
  mime: string;
  /** Has a quality (images) or bitrate (audio) setting. */
  lossy: boolean;
  /** Images only: keeps transparency. Without it, a background color fills in. */
  alpha?: boolean;
  /** A short note shown under the picker. */
  note?: string;
}

export const IMAGE_TARGETS: readonly TargetInfo<ImageTarget>[] = [
  {
    id: "png",
    label: "PNG",
    ext: "png",
    mime: "image/png",
    lossy: false,
    alpha: true,
  },
  {
    id: "jpeg",
    label: "JPEG",
    ext: "jpg",
    mime: "image/jpeg",
    lossy: true,
    alpha: false,
  },
  {
    id: "webp",
    label: "WebP",
    ext: "webp",
    mime: "image/webp",
    lossy: true,
    alpha: true,
  },
  {
    id: "avif",
    label: "AVIF",
    ext: "avif",
    mime: "image/avif",
    lossy: true,
    alpha: true,
    note: "Small files, slow to encode.",
  },
  {
    id: "gif",
    label: "GIF",
    ext: "gif",
    mime: "image/gif",
    lossy: false,
    alpha: true,
    note: "256 colors; animations keep only the first frame.",
  },
  {
    id: "bmp",
    label: "BMP",
    ext: "bmp",
    mime: "image/bmp",
    lossy: false,
    alpha: false,
  },
  {
    id: "ico",
    label: "ICO",
    ext: "ico",
    mime: "image/x-icon",
    lossy: false,
    alpha: true,
    note: "Square icons at the sizes you pick.",
  },
  {
    id: "tiff",
    label: "TIFF",
    ext: "tiff",
    mime: "image/tiff",
    lossy: false,
    alpha: true,
  },
];

export const AUDIO_TARGETS: readonly TargetInfo<AudioTarget>[] = [
  { id: "mp3", label: "MP3", ext: "mp3", mime: "audio/mpeg", lossy: true },
  { id: "m4a", label: "M4A (AAC)", ext: "m4a", mime: "audio/mp4", lossy: true },
  {
    id: "ogg",
    label: "Ogg (Opus)",
    ext: "ogg",
    mime: "audio/ogg",
    lossy: true,
  },
  {
    id: "flac",
    label: "FLAC",
    ext: "flac",
    mime: "audio/flac",
    lossy: false,
    note: "Lossless and smaller than WAV.",
  },
  {
    id: "wav",
    label: "WAV",
    ext: "wav",
    mime: "audio/wav",
    lossy: false,
    note: "Uncompressed 16-bit PCM.",
  },
];

export function imageTarget(id: ImageTarget): TargetInfo<ImageTarget> {
  const target = IMAGE_TARGETS.find((info) => info.id === id);
  if (!target) throw new Error(`Unknown image format: ${id}`);
  return target;
}

export function audioTarget(id: AudioTarget): TargetInfo<AudioTarget> {
  const target = AUDIO_TARGETS.find((info) => info.id === id);
  if (!target) throw new Error(`Unknown audio format: ${id}`);
  return target;
}

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256] as const;

export interface ImageOptions {
  target: ImageTarget;
  /** 1–100, for lossy targets. */
  quality: number;
  /** Fit inside these, keeping the aspect ratio; null keeps the size. Never enlarges. */
  maxWidth: number | null;
  maxHeight: number | null;
  /** Fills transparent areas for targets without alpha, as #rrggbb. */
  background: string;
  /** ICO only. */
  icoSizes: number[];
}

export interface AudioOptions {
  target: AudioTarget;
  /** kb/s, for lossy targets. */
  bitrate: number;
  /** Hz; null keeps the source's. */
  sampleRate: number | null;
  channels: "keep" | "mono" | "stereo";
  /** Seconds into the source; null for the start / the end. */
  trimStart: number | null;
  trimEnd: number | null;
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  target: "webp",
  quality: 82,
  maxWidth: null,
  maxHeight: null,
  background: "#ffffff",
  icoSizes: [16, 32, 48, 256],
};

export const DEFAULT_AUDIO_OPTIONS: AudioOptions = {
  target: "mp3",
  bitrate: 192,
  sampleRate: null,
  channels: "keep",
  trimStart: null,
  trimEnd: null,
};

export const BITRATES = [64, 96, 128, 160, 192, 256, 320] as const;
export const SAMPLE_RATES = [22050, 32000, 44100, 48000] as const;

/** The size an image ends up at: inside the limits, same aspect ratio, never larger. */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number | null,
  maxHeight: number | null,
): { width: number; height: number } {
  const scale = Math.min(
    1,
    maxWidth ? maxWidth / width : 1,
    maxHeight ? maxHeight / height : 1,
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Problems with a trim range, in words; null when it's fine. */
export function trimProblem(
  start: number | null,
  end: number | null,
): string | null {
  if (start !== null && start < 0) return "Start can't be negative.";
  if (end !== null && end <= 0) return "End must be after 0 seconds.";
  if (start !== null && end !== null && end <= start)
    return "End must be after the start.";
  return null;
}

/**
 * Names for a ZIP of results, made unique: "a.png", "a (2).png", … (ZIPs can hold
 * duplicates, but unzipping them overwrites files).
 */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase());
      return name;
    }
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let n = 2; ; n++) {
      const candidate = `${base} (${String(n)})${ext}`;
      if (!used.has(candidate.toLowerCase())) {
        used.add(candidate.toLowerCase());
        return candidate;
      }
    }
  });
}
