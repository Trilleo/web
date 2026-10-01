/**
 * Format-specific details, read in the browser: image size and EXIF, audio and
 * video tracks, archive listings, PDF and text facts, program headers. Heavy
 * libraries load only for the files that need them.
 */
import { formatBytes, type FileType } from "@trilleo/tool-kit";
import { readExecutable } from "./executable";
import { formatDuration, formatNumber } from "./format";
import { readPdf, type PdfInfoKey } from "./pdf";
import { describeLineEndings, textStats } from "./text";
import { listZip, type ZipListing } from "./zip";

export type DetailRow = readonly [label: string, value: string];

export interface DetailGroup {
  title: string;
  rows: DetailRow[];
  /** Everything else, shown folded away (e.g. all EXIF tags). */
  more?: DetailRow[];
}

export interface Details {
  groups: DetailGroup[];
  zip?: ZipListing;
}

/** Text and PDFs are read whole up to this size; larger ones get no counts. */
export const MAX_WHOLE_READ = 64 * 1024 * 1024;

const ZIP_BASED = new Set([
  "zip",
  "docx",
  "xlsx",
  "pptx",
  "epub",
  "odt",
  "ods",
  "jar",
  "apk",
]);

function rows(
  entries: [string, string | number | null | undefined][],
): DetailRow[] {
  return entries
    .filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== null && entry[1] !== undefined && entry[1] !== "",
    )
    .map(
      ([label, value]) =>
        [
          label,
          typeof value === "number" ? formatNumber(value) : value,
        ] as const,
    );
}

/** Pixel size, from the browser's own decoder (null when it can't decode it, e.g. HEIC in Chrome). */
async function imageSize(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // SVGs can't become bitmaps directly; an <img> reads them.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : null;
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function tagValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date)
    return value
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, " UTC");
  if (value instanceof Uint8Array)
    return `${formatBytes(value.length)} of binary data`;
  if (Array.isArray(value))
    return value.map((item) => tagValue(item)).join(", ");
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "boolean")
    return String(value);
  return null;
}

function exposure(seconds: unknown): string | null {
  if (typeof seconds !== "number" || seconds <= 0) return null;
  return seconds >= 1
    ? `${formatNumber(seconds)} s`
    : `1/${String(Math.round(1 / seconds))} s`;
}

async function imageDetails(file: File): Promise<DetailGroup[]> {
  const [size, tags] = await Promise.all([
    imageSize(file),
    import("exifr")
      .then(({ parse }) =>
        parse(file, {
          tiff: true,
          exif: true,
          gps: true,
          icc: true,
          iptc: true,
          xmp: true,
          jfif: true,
          ihdr: true,
        }),
      )
      .then((result: unknown) =>
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : {},
      )
      .catch((): Record<string, unknown> => ({})),
  ]);
  const tag = (name: string) => tagValue(tags[name]);
  const megapixels = size ? (size.width * size.height) / 1e6 : null;
  const groups: DetailGroup[] = [
    {
      title: "Image",
      rows: rows([
        [
          "Dimensions",
          size ? `${String(size.width)} × ${String(size.height)} px` : null,
        ],
        [
          "Megapixels",
          megapixels !== null && megapixels >= 0.01
            ? `${megapixels.toFixed(megapixels < 1 ? 2 : 1)} MP`
            : null,
        ],
        ["Orientation", tag("Orientation")],
        ["Bit depth", tag("BitDepth")],
        ["Color type", tag("ColorType")],
        ["Color space", tag("ColorSpace")],
        ["Color profile", tag("ProfileDescription")],
        [
          "Resolution",
          tags.XResolution ? `${String(tag("XResolution"))} dpi` : null,
        ],
      ]),
    },
  ];

  const camera = rows([
    ["Camera", [tag("Make"), tag("Model")].filter(Boolean).join(" ") || null],
    ["Lens", tag("LensModel")],
    ["Taken", tag("DateTimeOriginal") ?? tag("CreateDate")],
    ["Exposure", exposure(tags.ExposureTime)],
    [
      "Aperture",
      typeof tags.FNumber === "number"
        ? `f/${formatNumber(tags.FNumber)}`
        : null,
    ],
    ["ISO", tag("ISO")],
    [
      "Focal length",
      typeof tags.FocalLength === "number"
        ? `${formatNumber(tags.FocalLength)} mm`
        : null,
    ],
    ["Flash", tag("Flash")],
    ["Software", tag("Software")],
  ]);
  if (camera.length > 0) groups.push({ title: "Camera", rows: camera });

  if (typeof tags.latitude === "number" && typeof tags.longitude === "number") {
    groups.push({
      title: "Location",
      rows: rows([
        ["Latitude", tags.latitude.toFixed(6)],
        ["Longitude", tags.longitude.toFixed(6)],
        [
          "Altitude",
          typeof tags.GPSAltitude === "number"
            ? `${formatNumber(tags.GPSAltitude)} m`
            : null,
        ],
      ]),
    });
  }

  const all = Object.entries(tags)
    .map(([name, value]) => [name, tagValue(value)] as const)
    .filter(
      (entry): entry is readonly [string, string] =>
        entry[1] !== null && entry[1].length < 500,
    );
  if (all.length > 0)
    groups.push({
      title: "Metadata",
      rows: [["Tags found", formatNumber(all.length)]],
      more: all,
    });
  return groups;
}

async function mediaDetails(
  file: File,
  type: FileType,
): Promise<DetailGroup[]> {
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });
  try {
    if (!(await input.canRead())) return await audioFallback(file, type);
    const [format, mime, duration, tracks, tags] = await Promise.all([
      input.getFormat(),
      input.getMimeType().catch(() => null),
      input.computeDuration().catch(() => null),
      input.getTracks(),
      input
        .getMetadataTags()
        .catch((): Awaited<ReturnType<typeof input.getMetadataTags>> => ({})),
    ]);
    const groups: DetailGroup[] = [
      {
        title: "Container",
        rows: rows([
          ["Format", format.name],
          ["MIME type", mime],
          ["Duration", duration !== null ? formatDuration(duration) : null],
          [
            "Overall bitrate",
            duration
              ? `${formatNumber(Math.round((file.size * 8) / duration / 1000))} kb/s`
              : null,
          ],
          ["Tracks", tracks.length],
        ]),
      },
    ];

    for (const [index, track] of tracks.entries()) {
      const [codec, codecString, bitrate, language] = await Promise.all([
        track.getCodec().catch(() => null),
        track.getCodecParameterString().catch(() => null),
        track.computePacketStats(200).catch(() => null),
        track.getLanguageCode().catch(() => "und"),
      ]);
      const common: [string, string | number | null][] = [
        ["Codec", codec ?? "Unknown"],
        ["Codec string", codecString],
        [
          "Bitrate",
          bitrate?.averageBitrate
            ? `${formatNumber(Math.round(bitrate.averageBitrate / 1000))} kb/s`
            : null,
        ],
        ["Language", language === "und" ? null : language],
      ];
      if (track.isVideoTrack()) {
        const [width, height, rotation, hdr] = await Promise.all([
          track.getDisplayWidth(),
          track.getDisplayHeight(),
          track.getRotation(),
          track.hasHighDynamicRange().catch(() => false),
        ]);
        groups.push({
          title: `Track ${String(index + 1)}: video`,
          rows: rows([
            ...common,
            ["Dimensions", `${String(width)} × ${String(height)} px`],
            [
              "Frame rate",
              bitrate?.averagePacketRate
                ? `${bitrate.averagePacketRate.toFixed(2)} fps`
                : null,
            ],
            ["Rotation", rotation ? `${String(rotation)}°` : null],
            ["HDR", hdr ? "Yes" : "No"],
          ]),
        });
      } else if (track.isAudioTrack()) {
        const [sampleRate, channels] = await Promise.all([
          track.getSampleRate(),
          track.getNumberOfChannels(),
        ]);
        groups.push({
          title: `Track ${String(index + 1)}: audio`,
          rows: rows([
            ...common,
            ["Sample rate", `${formatNumber(sampleRate)} Hz`],
            [
              "Channels",
              channels === 1
                ? "1 (mono)"
                : channels === 2
                  ? "2 (stereo)"
                  : channels,
            ],
          ]),
        });
      } else {
        groups.push({
          title: `Track ${String(index + 1)}: ${track.type}`,
          rows: rows(common),
        });
      }
    }

    const tagRows = rows([
      ["Title", tags.title],
      ["Artist", tags.artist],
      ["Album", tags.album],
      ["Album artist", tags.albumArtist],
      [
        "Track",
        tags.trackNumber
          ? `${String(tags.trackNumber)}${tags.tracksTotal ? ` of ${String(tags.tracksTotal)}` : ""}`
          : null,
      ],
      ["Genre", tags.genre],
      ["Date", tags.date ? tags.date.toISOString().slice(0, 10) : null],
      ["Comment", tags.comment],
      [
        "Cover art",
        tags.images?.length
          ? `${String(tags.images.length)} image${tags.images.length === 1 ? "" : "s"}`
          : null,
      ],
    ]);
    if (tagRows.length > 0) groups.push({ title: "Tags", rows: tagRows });
    return groups;
  } finally {
    input.dispose();
  }
}

/** For audio Mediabunny can't open (AIFF, WMA…): whatever the browser's decoder says. */
async function audioFallback(
  file: File,
  type: FileType,
): Promise<DetailGroup[]> {
  if (type.kind !== "audio" || file.size > MAX_WHOLE_READ) return [];
  const context = new OfflineAudioContext(1, 1, 44100);
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    return [
      {
        title: "Audio",
        rows: rows([
          ["Duration", formatDuration(audio.duration)],
          ["Sample rate", `${formatNumber(audio.sampleRate)} Hz`],
          ["Channels", audio.numberOfChannels],
        ]),
      },
    ];
  } catch {
    return [];
  }
}

async function pdfDetails(file: File): Promise<DetailGroup[]> {
  if (file.size > MAX_WHOLE_READ) return [];
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const pdf = readPdf(text);
  if (!pdf) return [];
  const labels: Record<PdfInfoKey, string> = {
    Title: "Title",
    Author: "Author",
    Subject: "Subject",
    Keywords: "Keywords",
    Creator: "Created with",
    Producer: "Produced by",
    CreationDate: "Created",
    ModDate: "Modified",
  };
  return [
    {
      title: "PDF",
      rows: rows([
        ["Version", pdf.version],
        ["Pages", pdf.pages],
        ["Encrypted", pdf.encrypted ? "Yes" : "No"],
        ["Fast web view", pdf.linearized ? "Yes" : "No"],
        ...Object.entries(pdf.info).map(
          ([key, value]) =>
            [labels[key as PdfInfoKey], value] as [string, string],
        ),
      ]),
    },
  ];
}

async function textDetails(file: File): Promise<DetailGroup[]> {
  if (file.size > MAX_WHOLE_READ) return [];
  const stats = textStats(new Uint8Array(await file.arrayBuffer()));
  return [
    {
      title: "Text",
      rows: rows([
        ["Encoding", stats.encoding],
        ["Line endings", describeLineEndings(stats.lineEndings)],
        ["Lines", stats.lines],
        ["Words", stats.words],
        ["Characters", stats.characters],
        ["Longest line", `${formatNumber(stats.longestLine)} characters`],
      ]),
    },
  ];
}

async function executableDetails(file: File): Promise<DetailGroup[]> {
  const info = readExecutable(
    new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer()),
  );
  if (!info) return [];
  return [
    {
      title: "Program",
      rows: rows([
        ["Format", info.format],
        ["Architecture", info.architecture],
        ["Word size", info.bits ? `${String(info.bits)}-bit` : null],
        [
          "Byte order",
          info.endian === "little" ? "Little-endian" : "Big-endian",
        ],
        ["Kind", info.kind],
        ["Linked", info.built ? info.built.toISOString().slice(0, 10) : null],
      ]),
    },
  ];
}

/** Everything the tool can say about the file beyond its bytes and hashes. */
export async function loadDetails(
  file: File,
  type: FileType | null,
): Promise<Details> {
  if (!type) return { groups: [] };
  if (ZIP_BASED.has(type.ext)) {
    const zip = await listZip(file);
    return { groups: [], ...(zip ? { zip } : {}) };
  }
  switch (type.kind) {
    case "image":
      return { groups: await imageDetails(file) };
    case "audio":
    case "video":
      return { groups: await mediaDetails(file, type) };
    case "executable":
      return { groups: await executableDetails(file) };
    case "text":
      return {
        groups:
          type.ext === "svg"
            ? await imageDetails(file)
            : await textDetails(file),
      };
    case "document":
      return { groups: type.ext === "pdf" ? await pdfDetails(file) : [] };
    default:
      return { groups: [] };
  }
}
