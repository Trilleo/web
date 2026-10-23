/**
 * Pictures, sound, video and fonts, with the browser's own players. TIFF and HEIC
 * (which most browsers can't show) are decoded with File convert's decoders and
 * drawn on a canvas. Fonts are loaded from their bytes (FontFace) and set in a
 * sample you can type into.
 */
import { decodeImage } from "@trilleo/tool-convert/decode";
import { fieldClasses } from "@trilleo/ui";
import { useEffect, useId, useRef, useState } from "react";
import {
  Notice,
  Toolbar,
  toolButton,
  useBlobSource,
  type ViewerProps,
} from "./common";

function ImageView({ doc, onFacts }: ViewerProps) {
  const { detection } = doc;
  const needsDecoder = detection.ext === "tiff" || detection.ext === "heic";
  const image = useBlobSource<HTMLImageElement>(
    needsDecoder ? null : doc.bytes,
    detection.type?.mime ?? "",
  );
  const canvasHolder = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(false);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (size)
      onFacts([["Dimensions", `${String(size[0])} × ${String(size[1])} px`]]);
  }, [size, onFacts]);

  useEffect(() => {
    if (!needsDecoder) return;
    const controller = new AbortController();
    const file = new File([doc.bytes], doc.name, {
      type: detection.type?.mime ?? "",
    });
    decodeImage(file, detection.type)
      .then((decoded) => {
        if (controller.signal.aborted || !canvasHolder.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = decoded.width;
        canvas.height = decoded.height;
        canvas.getContext("2d")?.drawImage(decoded, 0, 0);
        canvas.className = "preview-image";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", doc.name);
        canvasHolder.current.replaceChildren(canvas);
        setSize([decoded.width, decoded.height]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
    };
  }, [doc, detection.type, needsDecoder]);

  if (failed)
    return (
      <Notice role="alert">This browser can&rsquo;t show this picture.</Notice>
    );
  return (
    <div className="flex flex-col gap-3">
      <Toolbar label="Picture size">
        <button
          type="button"
          className={toolButton}
          aria-pressed={!actual}
          onClick={() => {
            setActual(false);
          }}
        >
          Fit
        </button>
        <button
          type="button"
          className={toolButton}
          aria-pressed={actual}
          onClick={() => {
            setActual(true);
          }}
        >
          Actual size
        </button>
      </Toolbar>
      <div
        className={`preview-checker flex justify-center overflow-auto border border-hair p-2 ${actual ? "preview-actual" : ""}`}
      >
        {needsDecoder ? (
          <div
            ref={canvasHolder}
            role="status"
            aria-label="Decoding the picture"
          />
        ) : (
          <img
            ref={image}
            alt={doc.name}
            className="preview-image"
            onLoad={(event) => {
              const image = event.currentTarget;
              setSize([image.naturalWidth, image.naturalHeight]);
            }}
            onError={() => {
              setFailed(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

function PlayerView({ doc, onFacts }: ViewerProps) {
  const isVideo = doc.detection.kind === "video";
  const video = useBlobSource<HTMLVideoElement>(
    isVideo ? doc.bytes : null,
    doc.detection.type?.mime ?? "",
  );
  const audio = useBlobSource<HTMLAudioElement>(
    isVideo ? null : doc.bytes,
    doc.detection.type?.mime ?? "",
  );
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <Notice role="alert">
        This browser can&rsquo;t play this {isVideo ? "video" : "recording"}.
        Try another browser, or File convert to change its format.
      </Notice>
    );
  const onLoaded = (event: { currentTarget: HTMLMediaElement }) => {
    const media = event.currentTarget;
    const minutes = Math.floor(media.duration / 60);
    const seconds = Math.round(media.duration % 60);
    const facts: [string, string][] = [];
    if (Number.isFinite(media.duration))
      facts.push([
        "Length",
        `${String(minutes)}:${String(seconds).padStart(2, "0")}`,
      ]);
    if (media instanceof HTMLVideoElement && media.videoWidth)
      facts.push([
        "Dimensions",
        `${String(media.videoWidth)} × ${String(media.videoHeight)} px`,
      ]);
    onFacts(facts);
  };
  return isVideo ? (
    // Captions would have to come with the file; a preview has none to add.
    // eslint-disable-next-line jsx-a11y-x/media-has-caption -- someone else's video, shown as it is
    <video
      ref={video}
      controls
      playsInline
      preload="metadata"
      className="max-h-[75vh] w-full bg-ink"
      aria-label={doc.name}
      onLoadedMetadata={onLoaded}
      onError={() => {
        setFailed(true);
      }}
    />
  ) : (
    // eslint-disable-next-line jsx-a11y-x/media-has-caption -- someone else's recording, shown as it is
    <audio
      ref={audio}
      controls
      preload="metadata"
      className="w-full"
      aria-label={doc.name}
      onLoadedMetadata={onLoaded}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

const SAMPLE = "The quick brown fox jumps over the lazy dog. 0123456789";
const SIZES = [14, 20, 32, 48, 72] as const;

function FontView({ doc }: ViewerProps) {
  const [family, setFamily] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const sampleId = useId();

  useEffect(() => {
    const controller = new AbortController();
    const name = `preview-font-${Math.random().toString(36).slice(2)}`;
    // From the bytes, not a URL: nothing is fetched (and font-src doesn't apply).
    const face = new FontFace(name, doc.bytes.slice().buffer);
    face
      .load()
      .then((loaded) => {
        if (controller.signal.aborted) return;
        document.fonts.add(loaded);
        setFamily(name);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      document.fonts.delete(face);
    };
  }, [doc]);

  if (failed)
    return (
      <Notice role="alert">This browser can&rsquo;t load this font.</Notice>
    );
  if (!family) return <p role="status">Loading the font…</p>;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={sampleId} className="type-label">
          Sample text
        </label>
        <input
          id={sampleId}
          className={`${fieldClasses} h-11 px-3`}
          value={sample}
          onChange={(event) => {
            setSample(event.target.value);
          }}
        />
      </div>
      <ul className="flex flex-col gap-4">
        {SIZES.map((size) => (
          <li
            key={size}
            className="flex flex-col gap-1 border-t border-hair pt-2"
          >
            <span className="type-label text-muted">{size} px</span>
            <span
              className="break-words"
              style={{
                fontFamily: `"${family}"`,
                fontSize: `${String(size)}px`,
                lineHeight: 1.2,
              }}
            >
              {sample || SAMPLE}
            </span>
          </li>
        ))}
        <li className="flex flex-col gap-1 border-t border-hair pt-2">
          <span className="type-label text-muted">Characters</span>
          <span
            style={{ fontFamily: `"${family}"`, fontSize: "28px" }}
            className="break-all"
          >
            ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz !?&amp;@#%()[]
          </span>
        </li>
      </ul>
    </div>
  );
}

export default function MediaViewer(props: ViewerProps) {
  switch (props.doc.detection.kind) {
    case "image":
      return <ImageView {...props} />;
    case "font":
      return <FontView {...props} />;
    default:
      return <PlayerView {...props} />;
  }
}
