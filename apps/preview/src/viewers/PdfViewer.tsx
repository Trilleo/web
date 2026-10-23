// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- the site compiles this package's sources, and these ambient types must come along (an import of a .d.ts can't)
/// <reference path="../vendor.d.ts" />
/**
 * PDFs through pdf.js: pages drawn as they scroll into view, with a text layer so
 * text can be selected (and found with the browser's own search), plus the
 * document's outline, a search across every page, zoom, and password prompts.
 * Scripts in PDFs never run (pdf.js doesn't run them, it has no eval).
 */
import { fieldClasses } from "@trilleo/ui";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { pdfAssetUrl } from "../pdf-assets";
import {
  Notice,
  Toolbar,
  count,
  plural,
  toolButton,
  type ViewerProps,
} from "./common";

type PdfJs = typeof import("pdfjs-dist");

let loading: Promise<PdfJs> | null = null;

/** pdf.js and its worker, loaded once. */
function loadPdfJs(): Promise<PdfJs> {
  loading ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return loading;
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

interface OutlineItem {
  title: string;
  page: number | null;
  items: OutlineItem[];
}

interface Hit {
  page: number;
  snippet: string;
}

/** Search results stop here. */
const MAX_HITS = 200;

async function pageOfDest(
  pdf: PDFDocumentProxy,
  dest: unknown,
): Promise<number | null> {
  try {
    const explicit: unknown =
      typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    if (!Array.isArray(explicit)) return null;
    const [ref] = explicit as unknown[];
    if (typeof ref === "number") return ref + 1;
    if (ref && typeof ref === "object")
      return (
        (await pdf.getPageIndex(
          ref as Parameters<PDFDocumentProxy["getPageIndex"]>[0],
        )) + 1
      );
  } catch {
    // A broken link in the outline: show it without a page.
  }
  return null;
}

async function readOutline(pdf: PDFDocumentProxy): Promise<OutlineItem[]> {
  const raw = (await pdf.getOutline()) as
    { title: string; dest: unknown; items: unknown[] }[] | null;
  if (!raw) return [];
  const convert = async (
    items: { title: string; dest: unknown; items: unknown[] }[],
    depth: number,
  ): Promise<OutlineItem[]> =>
    Promise.all(
      items.slice(0, 500).map(async (item) => ({
        title: item.title,
        page: await pageOfDest(pdf, item.dest),
        items:
          depth < 4
            ? await convert(
                item.items as {
                  title: string;
                  dest: unknown;
                  items: unknown[];
                }[],
                depth + 1,
              )
            : [],
      })),
    );
  return convert(raw, 0);
}

function Outline({
  items,
  onGo,
}: {
  items: OutlineItem[];
  onGo: (page: number) => void;
}) {
  return (
    <ul className="flex flex-col gap-1 pl-3 first:pl-0">
      {items.map((item, index) => (
        <li key={`${item.title}-${String(index)}`}>
          <button
            type="button"
            className="text-left hover:underline disabled:text-muted disabled:no-underline"
            disabled={item.page === null}
            onClick={() => {
              if (item.page !== null) onGo(item.page);
            }}
          >
            {item.title}
            {item.page !== null && (
              <span className="text-muted"> · {item.page}</span>
            )}
          </button>
          {item.items.length > 0 && <Outline items={item.items} onGo={onGo} />}
        </li>
      ))}
    </ul>
  );
}

function PdfPage({
  pdf,
  pdfjs,
  number,
  width,
  aspect,
}: {
  pdf: PDFDocumentProxy;
  pdfjs: PdfJs;
  number: number;
  width: number;
  aspect: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [page, setPage] = useState<PDFPageProxy | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!near) return;
    const controller = new AbortController();
    // A call, not a property: TypeScript would otherwise keep its first answer.
    const stale = () => controller.signal.aborted;
    void pdf.getPage(number).then((loaded) => {
      if (!stale()) setPage(loaded);
    });
    return () => {
      controller.abort();
    };
  }, [near, pdf, number]);

  useEffect(() => {
    if (!page || !canvas.current || !text.current) return;
    const base = page.getViewport({ scale: 1 });
    const scale = width / base.width;
    const viewport = page.getViewport({ scale });
    const ratio = window.devicePixelRatio || 1;
    const target = canvas.current;
    target.width = Math.floor(viewport.width * ratio);
    target.height = Math.floor(viewport.height * ratio);
    target.style.width = `${String(Math.floor(viewport.width))}px`;
    target.style.height = `${String(Math.floor(viewport.height))}px`;
    let task: RenderTask | null = page.render({
      canvas: target,
      viewport: page.getViewport({ scale: scale * ratio }),
    });
    task.promise.catch(() => {
      // Cancelled by a zoom or by leaving: nothing to show.
    });
    const layer = text.current;
    layer.replaceChildren();
    box.current?.style.setProperty("--total-scale-factor", String(scale));
    const textLayer = new pdfjs.TextLayer({
      textContentSource: page.streamTextContent(),
      container: layer,
      viewport,
    });
    textLayer.render().catch(() => {
      // Text is a bonus: the page still shows without it.
    });
    return () => {
      task?.cancel();
      task = null;
      textLayer.cancel();
    };
  }, [page, width, pdfjs]);

  return (
    <div
      ref={box}
      data-page={number}
      className="preview-pdf-page bg-white relative mx-auto shadow-[0_0_0_1px_var(--tr-hair)]"
      style={{
        width: `${String(Math.floor(width))}px`,
        height: page ? undefined : `${String(Math.floor(width * aspect))}px`,
      }}
      role="region"
      aria-label={`Page ${String(number)}`}
    >
      <canvas ref={canvas} className="block" aria-hidden="true" />
      <div ref={text} className="textLayer" />
    </div>
  );
}

export default function PdfViewer({ doc, onFacts }: ViewerProps) {
  const [pdfjs, setPdfjs] = useState<PdfJs | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [password, setPassword] = useState<{
    submit: (value: string) => void;
    wrong: boolean;
  } | null>(null);
  const [typed, setTyped] = useState("");
  const [aspect, setAspect] = useState(1.414);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const pageTexts = useRef(new Map<number, string>());
  const frame = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const passwordId = useId();

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // A call, not a property: TypeScript would otherwise keep its first answer.
    const stale = () => controller.signal.aborted;
    let destroy: (() => void) | null = null;
    pageTexts.current = new Map();
    void (async () => {
      try {
        const lib = await loadPdfJs();
        if (stale()) return;
        setPdfjs(lib);
        const task = lib.getDocument({
          // pdf.js hands the buffer to its worker: give it a copy.
          data: doc.bytes.slice(),
          enableXfa: false,
          cMapUrl: pdfAssetUrl(lib.version, "cmaps"),
          cMapPacked: true,
          standardFontDataUrl: pdfAssetUrl(lib.version, "standard_fonts"),
          wasmUrl: pdfAssetUrl(lib.version, "wasm"),
        });
        destroy = () => {
          void task.destroy();
        };
        task.onPassword = (update: (value: string) => void, reason: number) => {
          if (stale()) return;
          setPassword({
            submit: update,
            wrong: reason === lib.PasswordResponses.INCORRECT_PASSWORD,
          });
        };
        const loaded = await task.promise;
        if (stale()) return;
        setPassword(null);
        setPdf(loaded);
        const first = await loaded.getPage(1);
        const view = first.getViewport({ scale: 1 });
        setAspect(view.height / view.width);
        const { info } = (await loaded.getMetadata()) as {
          info: Record<string, unknown>;
        };
        const str = (key: string) =>
          typeof info[key] === "string" && info[key] ? info[key] : null;
        const facts: [string, string][] = [["Pages", count(loaded.numPages)]];
        const title = str("Title");
        const author = str("Author");
        const version = str("PDFFormatVersion");
        if (title) facts.push(["Title", title]);
        if (author) facts.push(["Author", author]);
        if (version) facts.push(["PDF version", version]);
        if (!stale()) onFacts(facts);
        const items = await readOutline(loaded);
        if (!stale()) setOutline(items);
      } catch (error) {
        if (stale()) return;
        setFailed(
          error instanceof Error && error.name === "InvalidPDFException"
            ? "This PDF is damaged and can't be read."
            : "This PDF couldn't be shown.",
        );
      }
    })();
    return () => {
      controller.abort();
      destroy?.();
    };
  }, [doc, onFacts]);

  const go = useCallback((page: number) => {
    frame.current
      ?.querySelector(`[data-page="${String(page)}"]`)
      ?.scrollIntoView({ block: "start" });
  }, []);

  const search = async () => {
    const needle = query.trim().toLowerCase();
    if (!pdf || !needle) {
      setHits(null);
      return;
    }
    setSearching(true);
    const found: Hit[] = [];
    for (let n = 1; n <= pdf.numPages && found.length < MAX_HITS; n++) {
      let text = pageTexts.current.get(n);
      if (text === undefined) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ");
        pageTexts.current.set(n, text);
      }
      const lower = text.toLowerCase();
      for (
        let at = lower.indexOf(needle);
        at !== -1 && found.length < MAX_HITS;
        at = lower.indexOf(needle, at + needle.length)
      ) {
        const start = Math.max(0, at - 40);
        found.push({
          page: n,
          snippet: `${start > 0 ? "…" : ""}${text.slice(start, at + needle.length + 40)}…`,
        });
      }
    }
    setHits(found);
    setSearching(false);
  };

  if (failed) return <Notice role="alert">{failed}</Notice>;

  const pageWidth = Math.max(200, width * zoom);

  return (
    <div className="flex flex-col gap-4">
      {password && (
        <form
          className="flex flex-col gap-2 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            password.submit(typed);
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor={passwordId} className="type-label">
              {password.wrong
                ? "That password is wrong. Try again"
                : "This PDF needs a password"}
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="off"
              className={`${fieldClasses} h-11 px-3`}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
            />
          </div>
          <button type="submit" className={`${toolButton} h-11`}>
            Open
          </button>
        </form>
      )}
      {pdf && (
        <Toolbar label="PDF controls">
          <button
            type="button"
            className={toolButton}
            aria-label="Zoom out"
            disabled={zoom <= ZOOMS[0]}
            onClick={() => {
              setZoom(
                (value) => [...ZOOMS].reverse().find((z) => z < value) ?? value,
              );
            }}
          >
            −
          </button>
          <span className="type-label tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className={toolButton}
            aria-label="Zoom in"
            disabled={zoom >= (ZOOMS[ZOOMS.length - 1] ?? 3)}
            onClick={() => {
              setZoom((value) => ZOOMS.find((z) => z > value) ?? value);
            }}
          >
            +
          </button>
          <button
            type="button"
            className={toolButton}
            disabled={zoom === 1}
            onClick={() => {
              setZoom(1);
            }}
          >
            Fit width
          </button>
          <form
            role="search"
            className="ml-auto flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <label htmlFor={searchId} className="sr-only">
              Search this PDF
            </label>
            <input
              id={searchId}
              type="search"
              placeholder="Search this PDF"
              className={`${fieldClasses} h-9 w-48 px-2`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            <button type="submit" className={toolButton}>
              Search
            </button>
          </form>
        </Toolbar>
      )}
      {searching && <p role="status">Searching…</p>}
      {hits && !searching && (
        <div className="flex flex-col gap-2" role="status">
          <p className="type-label">
            {hits.length === 0
              ? "No matches."
              : hits.length >= MAX_HITS
                ? `The first ${String(MAX_HITS)} matches`
                : plural(hits.length, "match", "matches")}
          </p>
          {hits.length > 0 && (
            <ol className="flex max-h-64 flex-col overflow-y-auto border-t border-hair">
              {hits.map((hit, index) => (
                <li key={`${String(hit.page)}-${String(index)}`}>
                  <button
                    type="button"
                    className="grid w-full grid-cols-[4rem_1fr] gap-2 border-b border-hair py-1.5 text-left text-sm hover:bg-chip"
                    onClick={() => {
                      go(hit.page);
                    }}
                  >
                    <span className="type-label text-muted">
                      Page {hit.page}
                    </span>
                    <span>{hit.snippet}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {outline.length > 0 && (
        <details className="border-y border-hair py-2">
          <summary className="cursor-pointer type-label">Contents</summary>
          <nav
            aria-label="PDF contents"
            className="mt-3 max-h-80 overflow-y-auto text-sm"
          >
            <Outline items={outline} onGo={go} />
          </nav>
        </details>
      )}
      <div
        ref={frame}
        className="flex flex-col gap-4 overflow-x-auto bg-fig p-2 md:p-4"
      >
        {!pdf && !password && <p role="status">Opening the PDF…</p>}
        {pdf &&
          pdfjs &&
          width > 0 &&
          Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPage
              key={index + 1}
              pdf={pdf}
              pdfjs={pdfjs}
              number={index + 1}
              width={pageWidth}
              aspect={aspect}
            />
          ))}
      </div>
    </div>
  );
}
