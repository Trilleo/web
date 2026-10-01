import {
  SNIFF_BYTES,
  detectFileType,
  downloadBlob,
  formatBytes,
  replaceExtension,
  type FileType,
} from "@trilleo/tool-kit";
import {
  Button,
  Choice,
  CloseIcon,
  Field,
  FileDrop,
  MOTION,
  ToolSection,
  fieldClasses,
} from "@trilleo/ui";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { AudioJob } from "./audio";
import {
  AUDIO_TARGETS,
  BITRATES,
  DEFAULT_AUDIO_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  ICO_SIZES,
  IMAGE_TARGETS,
  SAMPLE_RATES,
  audioTarget,
  imageTarget,
  trimProblem,
  uniqueNames,
  type AudioOptions,
  type AudioTarget,
  type ImageOptions,
  type ImageTarget,
} from "./targets";

type Kind = "image" | "audio";

interface Result {
  blob: Blob;
  name: string;
  url: string;
  dimensions?: string;
}

interface Item {
  id: string;
  file: File;
  type: FileType | null;
  kind: Kind | null;
  status: "waiting" | "working" | "done" | "failed";
  progress: number;
  result?: Result;
  error?: string;
}

/** Image formats the browser decodes (or we do) well enough to convert. */
const READABLE_IMAGES = new Set([
  "png",
  "jpg",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
  "cur",
  "tiff",
  "heic",
  "svg",
]);

function kindOf(type: FileType | null, file: File): Kind | null {
  if (type?.kind === "image")
    return READABLE_IMAGES.has(type.ext) ? "image" : null;
  if (type?.kind === "audio" || type?.kind === "video") return "audio";
  // Some formats (raw AAC frames, odd containers) don't sniff; trust the browser's type.
  if (!type && /^(audio|video)\//.test(file.type)) return "audio";
  return null;
}

const rise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    transition: { duration: MOTION.fast, ease: MOTION.easeIn },
  },
  transition: { duration: MOTION.base, ease: MOTION.easeOut },
} as const;

/** "" ⇄ null for optional number inputs. */
function numberOrNull(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function change(before: number, after: number): string {
  if (before === 0) return "";
  const percent = Math.round(((after - before) / before) * 100);
  if (percent === 0) return "same size";
  return percent < 0
    ? `${String(-percent)}% smaller`
    : `${String(percent)}% larger`;
}

export function ConvertApp() {
  const [items, setItems] = useState<Item[]>([]);
  const [imageOptions, setImageOptions] = useState<ImageOptions>(
    DEFAULT_IMAGE_OPTIONS,
  );
  const [audioOptions, setAudioOptions] = useState<AudioOptions>(
    DEFAULT_AUDIO_OPTIONS,
  );
  const [writableImages, setWritableImages] = useState<Set<ImageTarget> | null>(
    null,
  );
  const [writableAudio, setWritableAudio] = useState<Set<AudioTarget> | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const job = useRef<AudioJob | null>(null);
  const stopped = useRef(false);
  const nextId = useRef(0);

  const hasImages = items.some((item) => item.kind === "image");
  const hasAudio = items.some((item) => item.kind === "audio");
  const convertible = items.filter((item) => item.kind !== null);
  const done = items.filter((item) => item.result);
  const trimError = trimProblem(audioOptions.trimStart, audioOptions.trimEnd);

  // What this browser can write, checked once the first file of a kind arrives.
  useEffect(() => {
    if (!hasImages || writableImages) return;
    void import("./image").then(async ({ canvasWrites }) => {
      const webp = await canvasWrites("image/webp");
      const all = new Set(IMAGE_TARGETS.map((target) => target.id));
      if (!webp) all.delete("webp");
      setWritableImages(all);
      if (!webp)
        setImageOptions((options) =>
          options.target === "webp" ? { ...options, target: "avif" } : options,
        );
    });
  }, [hasImages, writableImages]);

  useEffect(() => {
    if (!hasAudio || writableAudio) return;
    void import("./audio").then(async ({ writableAudio: check }) => {
      setWritableAudio(await check());
    });
  }, [hasAudio, writableAudio]);

  // Result previews are object URLs: let them go with the page.
  const urls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const update = (id: string, patch: Partial<Item>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const add = async (files: File[]) => {
    const added = await Promise.all(
      files.map(async (file): Promise<Item> => {
        const type = detectFileType(
          new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()),
        );
        nextId.current += 1;
        return {
          id: String(nextId.current),
          file,
          type,
          kind: kindOf(type, file),
          status: "waiting",
          progress: 0,
        };
      }),
    );
    setItems((current) => [...current, ...added]);
  };

  const remove = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const convertOne = async (item: Item): Promise<Result> => {
    if (item.kind === "image") {
      const { convertImage } = await import("./image");
      const target = imageTarget(imageOptions.target);
      const result = await convertImage(item.file, item.type, imageOptions);
      const url = URL.createObjectURL(result.blob);
      urls.current.push(url);
      return {
        blob: result.blob,
        url,
        name: replaceExtension(item.file.name, target.ext),
        dimensions: `${String(result.width)} × ${String(result.height)} px`,
      };
    }
    const { convertAudio } = await import("./audio");
    const target = audioTarget(audioOptions.target);
    job.current = convertAudio(item.file, audioOptions, (progress) => {
      update(item.id, { progress });
    });
    const blob = await job.current.promise;
    job.current = null;
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return { blob, url, name: replaceExtension(item.file.name, target.ext) };
  };

  // Read through a function: TypeScript would otherwise assume it can't change
  // between the awaits in convertAll.
  const isStopped = () => stopped.current;

  const convertAll = async () => {
    setRunning(true);
    stopped.current = false;
    setItems((current) =>
      current.map((item) =>
        item.kind
          ? {
              ...item,
              status: "waiting",
              progress: 0,
              result: undefined,
              error: undefined,
            }
          : item,
      ),
    );
    for (const item of convertible) {
      if (isStopped()) break;
      update(item.id, { status: "working", progress: 0 });
      try {
        const result = await convertOne(item);
        update(item.id, { status: "done", progress: 1, result });
      } catch (error) {
        update(item.id, {
          status: "failed",
          error: isStopped()
            ? "Stopped."
            : error instanceof Error && error.name === "ConvertError"
              ? error.message
              : `Couldn't convert this file${error instanceof Error && error.message ? `: ${error.message}` : "."}`,
        });
      }
    }
    setRunning(false);
  };

  const stop = () => {
    stopped.current = true;
    job.current?.cancel();
  };

  const downloadAll = async () => {
    const { zipSync } = await import("fflate");
    const names = uniqueNames(done.map((item) => item.result?.name ?? "file"));
    const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
    for (const [index, item] of done.entries()) {
      if (!item.result) continue;
      // Media is already compressed: store it as is.
      entries[names[index] ?? `file-${String(index)}`] = [
        new Uint8Array(await item.result.blob.arrayBuffer()),
        { level: 0 },
      ];
    }
    downloadBlob(
      new Blob([zipSync(entries).slice()], { type: "application/zip" }),
      "converted.zip",
    );
  };

  const image = imageTarget(imageOptions.target);
  const audio = audioTarget(audioOptions.target);
  const setImage = (patch: Partial<ImageOptions>) => {
    setImageOptions((options) => ({ ...options, ...patch }));
  };
  const setAudio = (patch: Partial<AudioOptions>) => {
    setAudioOptions((options) => ({ ...options, ...patch }));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-10 md:gap-12">
        <ToolSection number="01" title="Files">
          <div className="flex flex-col gap-6">
            <FileDrop
              multiple
              acceptPaste
              accept="image/*,audio/*,video/*,.heic,.heif,.tif,.tiff,.flac,.opus,.m4a,.ico"
              title={
                items.length > 0
                  ? "Add more files"
                  : "Drop images or audio here"
              }
              hint="PNG, JPEG, WebP, AVIF, GIF, BMP, ICO, TIFF, HEIC and SVG; MP3, AAC, M4A, Ogg, Opus, FLAC and WAV, or the sound from a video. Nothing is uploaded."
              onFiles={(files) => void add(files)}
            />
            {items.length > 0 && (
              <ul
                className="flex flex-col border-t border-ink"
                aria-label="Files to convert"
              >
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout="position"
                      {...rise}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-hair py-2"
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate font-medium"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p
                          className={`type-label ${item.kind ? "text-muted" : "text-ink"}`}
                        >
                          {item.type?.label ?? "Unknown type"} ·{" "}
                          {formatBytes(item.file.size)}
                          {!item.kind && " · Can't convert this"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        disabled={running}
                        className="press p-2 hover:bg-chip disabled:opacity-40"
                        onClick={() => {
                          remove(item.id);
                        }}
                      >
                        <CloseIcon size={16} />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </ToolSection>

        {hasImages && (
          <ToolSection number="02" title="Images">
            <div className="flex flex-col gap-6">
              <Choice
                legend="Convert images to"
                value={imageOptions.target}
                options={IMAGE_TARGETS.map((target) => ({
                  value: target.id,
                  label: target.label,
                  disabled: writableImages
                    ? !writableImages.has(target.id)
                    : false,
                }))}
                onChange={(target) => {
                  setImage({ target });
                }}
              />
              {image.note && (
                <p className="-mt-3 text-sm text-muted">{image.note}</p>
              )}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {image.lossy && (
                  <Field label={`Quality: ${String(imageOptions.quality)}`}>
                    {(props) => (
                      <input
                        {...props}
                        type="range"
                        min={1}
                        max={100}
                        value={imageOptions.quality}
                        onChange={(event) => {
                          setImage({ quality: Number(event.target.value) });
                        }}
                        className="h-11 accent-accent"
                      />
                    )}
                  </Field>
                )}
                {image.id !== "ico" && (
                  <>
                    <Field
                      label="Max width (px)"
                      hint="Blank keeps the size. Never enlarges."
                    >
                      {(props) => (
                        <input
                          {...props}
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={imageOptions.maxWidth ?? ""}
                          onChange={(event) => {
                            setImage({
                              maxWidth: numberOrNull(event.target.value),
                            });
                          }}
                          className={`${fieldClasses} h-11 px-3`}
                        />
                      )}
                    </Field>
                    <Field label="Max height (px)">
                      {(props) => (
                        <input
                          {...props}
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={imageOptions.maxHeight ?? ""}
                          onChange={(event) => {
                            setImage({
                              maxHeight: numberOrNull(event.target.value),
                            });
                          }}
                          className={`${fieldClasses} h-11 px-3`}
                        />
                      )}
                    </Field>
                  </>
                )}
                {!image.alpha && (
                  <Field
                    label="Background"
                    hint={`${image.label} has no transparency; this fills it.`}
                  >
                    {(props) => (
                      <input
                        {...props}
                        type="color"
                        value={imageOptions.background}
                        onChange={(event) => {
                          setImage({ background: event.target.value });
                        }}
                        className="h-11 w-24 cursor-pointer border border-ink bg-paper p-1"
                      />
                    )}
                  </Field>
                )}
              </div>
              {image.id === "ico" && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 type-label">Icon sizes</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {ICO_SIZES.map((size) => (
                      <label
                        key={size}
                        className="inline-flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          checked={imageOptions.icoSizes.includes(size)}
                          onChange={(event) => {
                            setImage({
                              icoSizes: event.target.checked
                                ? [...imageOptions.icoSizes, size]
                                : imageOptions.icoSizes.filter(
                                    (each) => each !== size,
                                  ),
                            });
                          }}
                        />
                        {size}×{size}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <p className="text-sm text-muted">
                Converting removes metadata such as camera details and location.
              </p>
            </div>
          </ToolSection>
        )}

        {hasAudio && (
          <ToolSection number={hasImages ? "03" : "02"} title="Audio">
            <div className="flex flex-col gap-6">
              <Choice
                legend="Convert audio to"
                value={audioOptions.target}
                options={AUDIO_TARGETS.map((target) => ({
                  value: target.id,
                  label: target.label,
                  disabled: writableAudio
                    ? !writableAudio.has(target.id)
                    : false,
                }))}
                onChange={(target) => {
                  setAudio({ target });
                }}
              />
              {audio.note && (
                <p className="-mt-3 text-sm text-muted">{audio.note}</p>
              )}
              {writableAudio && writableAudio.size < AUDIO_TARGETS.length && (
                <p className="-mt-3 text-sm text-muted">
                  Faded formats need an encoder this browser doesn't have.
                </p>
              )}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {audio.lossy && (
                  <Field label="Bitrate">
                    {(props) => (
                      <select
                        {...props}
                        value={audioOptions.bitrate}
                        onChange={(event) => {
                          setAudio({ bitrate: Number(event.target.value) });
                        }}
                        className={`${fieldClasses} h-11 px-3`}
                      >
                        {BITRATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate} kb/s
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}
                {audio.id !== "ogg" && (
                  <Field label="Sample rate">
                    {(props) => (
                      <select
                        {...props}
                        value={audioOptions.sampleRate ?? ""}
                        onChange={(event) => {
                          setAudio({
                            sampleRate: numberOrNull(event.target.value),
                          });
                        }}
                        className={`${fieldClasses} h-11 px-3`}
                      >
                        <option value="">Keep</option>
                        {SAMPLE_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {String(rate / 1000)} kHz
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}
                <Field label="Channels">
                  {(props) => (
                    <select
                      {...props}
                      value={audioOptions.channels}
                      onChange={(event) => {
                        setAudio({
                          channels: event.target
                            .value as AudioOptions["channels"],
                        });
                      }}
                      className={`${fieldClasses} h-11 px-3`}
                    >
                      <option value="keep">Keep</option>
                      <option value="mono">Mono</option>
                      <option value="stereo">Stereo</option>
                    </select>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
                <Field label="Start at (s)" hint="Blank: from the start.">
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min={0}
                      step="any"
                      value={audioOptions.trimStart ?? ""}
                      onChange={(event) => {
                        setAudio({
                          trimStart: numberOrNull(event.target.value),
                        });
                      }}
                      className={`${fieldClasses} h-11 px-3`}
                    />
                  )}
                </Field>
                <Field label="End at (s)" hint="Blank: to the end.">
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min={0}
                      step="any"
                      value={audioOptions.trimEnd ?? ""}
                      onChange={(event) => {
                        setAudio({ trimEnd: numberOrNull(event.target.value) });
                      }}
                      className={`${fieldClasses} h-11 px-3`}
                    />
                  )}
                </Field>
              </div>
              {trimError && (
                <p role="alert" className="border-l-2 border-accent pl-4">
                  {trimError}
                </p>
              )}
            </div>
          </ToolSection>
        )}

        {convertible.length > 0 && (
          <ToolSection
            number={String(2 + Number(hasImages) + Number(hasAudio)).padStart(
              2,
              "0",
            )}
            title="Results"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-3">
                {running ? (
                  <Button variant="secondary" onClick={stop}>
                    Stop
                  </Button>
                ) : (
                  <Button
                    disabled={
                      Boolean(trimError && hasAudio) ||
                      (image.id === "ico" &&
                        hasImages &&
                        imageOptions.icoSizes.length === 0)
                    }
                    onClick={() => void convertAll()}
                  >
                    Convert{" "}
                    {convertible.length === 1
                      ? "1 file"
                      : `${String(convertible.length)} files`}
                  </Button>
                )}
                {done.length > 1 && !running && (
                  <Button
                    variant="secondary"
                    onClick={() => void downloadAll()}
                  >
                    Download all (.zip)
                  </Button>
                )}
              </div>
              <ul
                className="flex flex-col border-t border-ink"
                aria-label="Converted files"
              >
                {convertible.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 border-b border-hair py-3 md:flex-row md:items-center md:gap-5"
                  >
                    {item.result && item.kind === "image" && (
                      <img
                        src={item.result.url}
                        alt=""
                        className="size-16 shrink-0 border border-hair bg-fig object-contain"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate font-medium">
                        {item.result?.name ?? item.file.name}
                      </p>
                      <p className="type-label text-muted" role="status">
                        {item.status === "waiting" && "Ready"}
                        {item.status === "working" &&
                          (item.kind === "audio"
                            ? `Converting… ${String(Math.round(item.progress * 100))}%`
                            : "Converting…")}
                        {item.status === "failed" && (
                          <span className="text-ink">{item.error}</span>
                        )}
                        {item.result &&
                          `${formatBytes(item.file.size)} → ${formatBytes(item.result.blob.size)} · ${change(item.file.size, item.result.blob.size)}${item.result.dimensions ? ` · ${item.result.dimensions}` : ""}`}
                      </p>
                      {item.status === "working" && item.kind === "audio" && (
                        <div
                          className="h-1 w-full max-w-sm bg-chip"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full bg-accent"
                            style={{
                              width: `${String(Math.round(item.progress * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                      {item.result && item.kind === "audio" && (
                        // eslint-disable-next-line jsx-a11y-x/media-has-caption -- a preview of the visitor's own converted file: there's no caption track to offer
                        <audio
                          controls
                          src={item.result.url}
                          className="mt-1 h-10 w-full max-w-sm"
                        />
                      )}
                    </div>
                    {item.result && (
                      <Button
                        variant="secondary"
                        className="self-start md:self-center"
                        onClick={() => {
                          if (item.result)
                            downloadBlob(item.result.blob, item.result.name);
                        }}
                        aria-label={`Download ${item.result.name}`}
                      >
                        Download
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </ToolSection>
        )}
      </div>
    </MotionConfig>
  );
}
