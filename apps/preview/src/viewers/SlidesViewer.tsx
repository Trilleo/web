/**
 * Presentations: PowerPoint (.pptx) slides laid out roughly where their text boxes,
 * pictures and tables sit (formats/pptx.ts), and OpenDocument (.odp) slides as their
 * text and pictures. Speaker notes open under each slide.
 */
import { useEffect, useMemo, type CSSProperties } from "react";
import { unzipDocument } from "../formats/archive";
import { parseOdp, type OdpSlide } from "../formats/odf";
import { parsePptx, type Presentation, type SlideItem } from "../formats/pptx";
import { dataUrl, imageMime, type Files } from "../formats/xml";
import { Notice, count, type ViewerProps } from "./common";

function useImages(files: Files | null, paths: readonly string[]) {
  return useMemo(() => {
    const map = new Map<string, string>();
    if (!files) return map;
    for (const path of paths) {
      if (map.has(path) || !imageMime(path)) continue;
      const url = dataUrl(files, path);
      if (url) map.set(path, url);
    }
    return map;
  }, [files, paths]);
}

function itemStyle(item: SlideItem): CSSProperties {
  return {
    left: `${String(item.x * 100)}%`,
    top: `${String(item.y * 100)}%`,
    width: `${String(item.w * 100)}%`,
    height: `${String(item.h * 100)}%`,
  };
}

function PptxSlides({
  deck,
  images,
}: {
  deck: Presentation;
  images: Map<string, string>;
}) {
  // Font sizes are points on a slide this many points wide; cqw scales them with it.
  const pt = (size: number) => `${String((size / deck.width) * 100)}cqw`;
  return (
    <ol className="flex flex-col gap-8">
      {deck.slides.map((slide) => (
        <li key={slide.number} className="flex flex-col gap-2">
          <p className="type-label text-muted">
            Slide {slide.number}
            {slide.hidden && " · hidden in the show"}
          </p>
          <div
            className="preview-slide relative w-full overflow-hidden text-[#111] shadow-[0_0_0_1px_var(--tr-hair)]"
            style={{
              aspectRatio: `${String(deck.width)} / ${String(deck.height)}`,
              background: slide.background ?? "#fff",
            }}
            role="group"
            aria-label={`Slide ${String(slide.number)}`}
          >
            {slide.items.map((item, index) => {
              const key = `${item.kind}-${String(index)}`;
              if (item.kind === "image") {
                const src = images.get(item.path);
                return src ? (
                  <img
                    key={key}
                    src={src}
                    alt={item.alt}
                    className="absolute object-contain"
                    style={itemStyle(item)}
                  />
                ) : (
                  <div
                    key={key}
                    className="absolute flex items-center justify-center border border-dashed border-[#999] text-[#666]"
                    style={{ ...itemStyle(item), fontSize: pt(12) }}
                  >
                    Picture
                  </div>
                );
              }
              if (item.kind === "table")
                return (
                  <table
                    key={key}
                    className="absolute border-collapse"
                    style={{
                      ...itemStyle(item),
                      height: "auto",
                      fontSize: pt(14),
                    }}
                  >
                    <tbody>
                      {item.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className="border border-[#bbb] px-[0.4em] py-[0.2em] align-top whitespace-pre-wrap"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              return (
                <div
                  key={key}
                  className="absolute flex flex-col overflow-hidden"
                  style={{
                    ...itemStyle(item),
                    background: item.fill ?? undefined,
                    justifyContent:
                      item.anchor === "middle"
                        ? "center"
                        : item.anchor === "bottom"
                          ? "flex-end"
                          : "flex-start",
                    fontSize: pt(item.defaultSize),
                    lineHeight: 1.15,
                  }}
                >
                  {item.paragraphs.map((paragraph, p) => (
                    <p
                      key={p}
                      style={{
                        textAlign: paragraph.align,
                        paddingLeft: `${String(paragraph.level * 1.2 + (paragraph.bullet ? 1 : 0))}em`,
                        textIndent: paragraph.bullet ? "-0.8em" : undefined,
                        minHeight: "1em",
                      }}
                    >
                      {paragraph.bullet && (
                        <span aria-hidden="true">•&nbsp;</span>
                      )}
                      {paragraph.runs.map((run, r) =>
                        run.text === "\n" ? (
                          <br key={r} />
                        ) : (
                          <span
                            key={r}
                            style={{
                              fontWeight: run.bold ? 700 : undefined,
                              fontStyle: run.italic ? "italic" : undefined,
                              textDecoration: run.underline
                                ? "underline"
                                : undefined,
                              fontSize: run.size ? pt(run.size) : undefined,
                              color: run.color ?? undefined,
                            }}
                          >
                            {run.text}
                          </span>
                        ),
                      )}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
          {slide.notes && (
            <details>
              <summary className="cursor-pointer type-label">Notes</summary>
              <p className="mt-2 whitespace-pre-wrap">{slide.notes}</p>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

function OdpSlides({
  slides,
  images,
}: {
  slides: OdpSlide[];
  images: Map<string, string>;
}) {
  return (
    <ol className="flex flex-col gap-6">
      {slides.map((slide) => (
        <li
          key={slide.number}
          className="flex flex-col gap-3 border-t border-ink pt-3"
        >
          <p className="type-label text-muted">
            Slide {slide.number}
            {slide.name && !/^page\d+$/i.test(slide.name) && ` · ${slide.name}`}
          </p>
          {slide.paragraphs.map((text, index) => (
            <p
              key={index}
              className={index === 0 ? "type-card" : "whitespace-pre-wrap"}
            >
              {text}
            </p>
          ))}
          {slide.images.map((path) => {
            const src = images.get(path);
            return src ? (
              <img key={path} src={src} alt="" className="max-h-96 w-fit" />
            ) : null;
          })}
          {slide.notes && (
            <details>
              <summary className="cursor-pointer type-label">Notes</summary>
              <p className="mt-2 whitespace-pre-wrap">{slide.notes}</p>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

interface Read {
  files: Files;
  deck: Presentation | null;
  odp: OdpSlide[] | null;
}

function read(bytes: Uint8Array, isOdp: boolean): Read | null {
  try {
    const files = unzipDocument(bytes);
    return isOdp
      ? { files, deck: null, odp: parseOdp(files) }
      : { files, deck: parsePptx(files), odp: null };
  } catch {
    return null;
  }
}

export default function SlidesViewer({ doc, onFacts }: ViewerProps) {
  const isOdp = doc.detection.kind === "odp";
  const parsed = useMemo(() => read(doc.bytes, isOdp), [doc, isOdp]);
  const deck = parsed?.deck ?? null;
  const odp = parsed?.odp ?? null;

  useEffect(() => {
    if (deck)
      onFacts([
        ["Slides", count(deck.slides.length)],
        [
          "Slide size",
          `${String(Math.round(deck.width))} × ${String(Math.round(deck.height))} pt`,
        ],
      ]);
    else if (odp) onFacts([["Slides", count(odp.length)]]);
  }, [deck, odp, onFacts]);

  const paths = useMemo(
    () =>
      deck
        ? deck.slides.flatMap((slide) =>
            slide.items.flatMap((item) =>
              item.kind === "image" ? [item.path] : [],
            ),
          )
        : (odp ?? []).flatMap((slide) => slide.images),
    [deck, odp],
  );
  const images = useImages(parsed?.files ?? null, paths);

  if (!parsed)
    return (
      <Notice role="alert">
        This presentation couldn&rsquo;t be read. It may be damaged.
      </Notice>
    );
  return (
    <div className="flex flex-col gap-4">
      {deck && (
        <Notice>
          A rough layout: text, pictures and tables where the slides put them,
          without the theme&rsquo;s fonts, shapes, charts or animations.
        </Notice>
      )}
      {deck && <PptxSlides deck={deck} images={images} />}
      {odp && <OdpSlides slides={odp} images={images} />}
    </div>
  );
}
