// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- the site compiles this package's sources, and these ambient types must come along (an import of a .d.ts can't)
/// <reference path="./vendor.d.ts" />
import { downloadBlob, formatBytes } from "@trilleo/tool-kit";
import {
  Button,
  CopyButton,
  FileDrop,
  MOTION,
  ToolSection,
  fieldClasses,
} from "@trilleo/ui";
import { MotionConfig, motion } from "motion/react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { detectViewer, type ViewerKind } from "./detect";
import "./preview.css";
import {
  LINK_PROBLEMS,
  MAX_PREVIEW_BYTES,
  MICROSOFT_VIEWER_EXTENSIONS,
  microsoftViewerUrl,
  parseLink,
  resolveLink,
  type ResolvedLink,
} from "./links";
import {
  forgetRecent,
  recentServerSnapshot,
  recentSnapshot,
  rememberLink,
  subscribeRecent,
} from "./recent";
import { PreviewError, fetchLink, type Route } from "./source";
import type { Fact, PreviewDoc, ViewerProps } from "./viewers/common";

type Viewer = ComponentType<ViewerProps>;

// Each viewer (and the libraries it needs) loads only when a file needs it.
const PdfViewer = lazy(() => import("./viewers/PdfViewer"));
const DocxViewer = lazy(() => import("./viewers/DocxViewer"));
const SheetViewer = lazy(() => import("./viewers/SheetViewer"));
const SlidesViewer = lazy(() => import("./viewers/SlidesViewer"));
const TextDocViewer = lazy(() => import("./viewers/TextDocViewer"));
const EpubViewer = lazy(() => import("./viewers/EpubViewer"));
const MarkupViewer = lazy(() => import("./viewers/MarkupViewer"));
const CodeViewer = lazy(() => import("./viewers/CodeViewer"));
const MediaViewer = lazy(() => import("./viewers/MediaViewer"));
const ArchiveViewer = lazy(() => import("./viewers/ArchiveViewer"));
const FallbackViewer = lazy(() => import("./viewers/FallbackViewer"));

export const VIEWERS: Readonly<Record<ViewerKind, Viewer>> = {
  pdf: PdfViewer,
  docx: DocxViewer,
  sheet: SheetViewer,
  pptx: SlidesViewer,
  odp: SlidesViewer,
  odt: TextDocViewer,
  rtf: TextDocViewer,
  epub: EpubViewer,
  markdown: MarkupViewer,
  html: MarkupViewer,
  json: CodeViewer,
  xml: CodeViewer,
  code: CodeViewer,
  image: MediaViewer,
  audio: MediaViewer,
  video: MediaViewer,
  font: MediaViewer,
  zip: ArchiveViewer,
  gzip: ArchiveViewer,
  "legacy-office": FallbackViewer,
  binary: FallbackViewer,
};

/** Where the document came from. */
type Source =
  | { kind: "file" }
  | { kind: "link"; link: ResolvedLink; route: Route; finalUrl: string };

type Status =
  | { kind: "idle" }
  | {
      kind: "loading";
      what: string;
      received: number;
      total: number | null;
      controller: AbortController;
    }
  | { kind: "error"; message: string };

/** Things appearing: a short rise, on the site's timing (@trilleo/ui MOTION). */
const rise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.base, ease: MOTION.easeOut },
} as const;

function Rows({ rows }: { rows: readonly Fact[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 md:grid-cols-[minmax(9rem,auto)_1fr]">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-subgrid border-b border-hair py-2 md:col-span-2"
        >
          <dt className="type-label text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function makeDoc(
  name: string,
  bytes: Uint8Array<ArrayBuffer>,
  finalUrl: string | null,
  hint: string | null,
): PreviewDoc {
  return {
    name,
    bytes,
    detection: detectViewer(bytes, name, hint),
    finalUrl,
  };
}

/** The page's own address with `?url=` set (or cleared), for sharing a preview. */
function addressFor(url: string | null): string {
  const next = new URL(window.location.href);
  if (url) next.searchParams.set("url", url);
  else next.searchParams.delete("url");
  return next.href;
}

function MicrosoftViewer({ url, name }: { url: string; name: string }) {
  const [step, setStep] = useState<"closed" | "asking" | "open">("closed");
  if (step === "open")
    return (
      <div className="flex flex-col gap-3">
        <iframe
          title={`${name} in Microsoft's viewer`}
          src={microsoftViewerUrl(url)}
          referrerPolicy="no-referrer"
          className="bg-white h-[80vh] w-full border border-hair"
        />
        <button
          type="button"
          className="w-fit type-label underline underline-offset-4"
          onClick={() => {
            setStep("closed");
          }}
        >
          Close Microsoft&rsquo;s viewer
        </button>
      </div>
    );
  if (step === "asking")
    return (
      <div
        role="group"
        aria-labelledby="microsoft-viewer-title"
        className="flex flex-col gap-3 border-l-2 border-accent pl-4"
      >
        <p id="microsoft-viewer-title" className="type-label">
          Open in Microsoft&rsquo;s viewer?
        </p>
        <p>
          This sends the link (not the file) to Microsoft, whose servers fetch
          the file and show it. Microsoft&rsquo;s own privacy terms apply. It
          only works for links anyone can open.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setStep("open");
            }}
          >
            Open it there
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setStep("closed");
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      <p>
        For a faithful layout of Office files, Microsoft&rsquo;s online viewer
        can show this link.
      </p>
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => {
          setStep("asking");
        }}
      >
        Microsoft&rsquo;s viewer…
      </Button>
    </div>
  );
}

export function PreviewApp() {
  const [input, setInput] = useState("");
  const [inputProblem, setInputProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [source, setSource] = useState<Source | null>(null);
  const [stack, setStack] = useState<PreviewDoc[]>([]);
  const [facts, setFacts] = useState<readonly Fact[]>([]);
  const recent = useSyncExternalStore(
    subscribeRecent,
    recentSnapshot,
    recentServerSnapshot,
  );
  const inputId = useId();
  const problemId = useId();
  const run = useRef(0);

  const doc = stack[stack.length - 1];
  const root = stack[0];

  const begin = (what: string) => {
    if (status.kind === "loading") status.controller.abort();
    const controller = new AbortController();
    const id = ++run.current;
    setStatus({ kind: "loading", what, received: 0, total: null, controller });
    return { controller, current: () => id === run.current };
  };

  const show = (next: PreviewDoc, from: Source) => {
    setSource(from);
    setFacts([]);
    setStack([next]);
    setStatus({ kind: "idle" });
  };

  const openLink = async (text: string) => {
    setInput(text);
    const parsed = parseLink(text);
    if (typeof parsed === "string") {
      setInputProblem(LINK_PROBLEMS[parsed]);
      return;
    }
    setInputProblem(null);
    const link = resolveLink(parsed);
    const { controller, current } = begin(link.original);
    try {
      const fetched = await fetchLink(link, {
        signal: controller.signal,
        onProgress: (received, total) => {
          if (current())
            setStatus({
              kind: "loading",
              what: link.original,
              received,
              total,
              controller,
            });
        },
      });
      if (!current()) return;
      const bytes = new Uint8Array(await fetched.file.arrayBuffer());
      show(
        makeDoc(
          fetched.file.name,
          bytes,
          fetched.finalUrl,
          fetched.contentType,
        ),
        {
          kind: "link",
          link,
          route: fetched.route,
          finalUrl: fetched.finalUrl,
        },
      );
      window.history.replaceState(null, "", addressFor(link.original));
      rememberLink({ url: link.original, name: fetched.file.name });
    } catch (error) {
      if (!current()) return;
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message:
          error instanceof PreviewError
            ? error.message
            : "This link couldn't be fetched. Check it opens in a browser tab.",
      });
    }
  };

  const openFile = async (file: File) => {
    if (file.size > MAX_PREVIEW_BYTES) {
      setStatus({
        kind: "error",
        message: `This file is bigger than ${formatBytes(MAX_PREVIEW_BYTES)}, the most this tool previews.`,
      });
      return;
    }
    const { current } = begin(file.name);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!current()) return;
      show(makeDoc(file.name, bytes, null, file.type || null), {
        kind: "file",
      });
      window.history.replaceState(null, "", addressFor(null));
    } catch {
      if (current())
        setStatus({ kind: "error", message: "This file couldn't be read." });
    }
  };

  // A shared preview: /tools/preview/?url=… opens at once.
  useEffect(() => {
    const shared = new URL(window.location.href).searchParams.get("url");
    if (!shared) return;
    // After this render: and only once, as development's strict mode runs effects twice.
    const timer = setTimeout(() => {
      void openLink(shared);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, with the address the page was opened at
  }, []);

  const onFacts = useCallback((next: readonly Fact[]) => {
    setFacts(next);
  }, []);

  const onOpen = useCallback((name: string, bytes: Uint8Array<ArrayBuffer>) => {
    setStack((current) => {
      const parent = current[current.length - 1];
      return [...current, makeDoc(name, bytes, parent?.finalUrl ?? null, null)];
    });
    setFacts([]);
  }, []);

  const Viewer = doc ? VIEWERS[doc.detection.kind] : null;
  const loading = status.kind === "loading" ? status : null;
  const percent = loading?.total
    ? Math.round((loading.received / loading.total) * 100)
    : null;
  const linkSource = source?.kind === "link" ? source : null;
  const officeLink =
    linkSource &&
    stack.length === 1 &&
    doc &&
    (MICROSOFT_VIEWER_EXTENSIONS as readonly string[]).includes(
      doc.detection.ext,
    );

  const about: Fact[] = doc
    ? [
        ["Name", doc.name],
        ["Type", doc.detection.label],
        ["Size", formatBytes(doc.bytes.length)],
        ...(linkSource && stack.length === 1
          ? ([
              [
                "From",
                linkSource.route === "browser"
                  ? "The link, fetched by this browser"
                  : "The link, fetched through this site's server (the site doesn't let browsers read it directly)",
              ],
              ...(linkSource.link.rewrittenFrom
                ? ([
                    [
                      "Link",
                      `${linkSource.link.rewrittenFrom}, opened as its file`,
                    ],
                  ] as const)
                : []),
            ] as const)
          : stack.length > 1
            ? ([["From", `Inside ${root?.name ?? "the archive"}`]] as const)
            : ([["From", "This device (not uploaded)"]] as const)),
        ...facts,
      ]
    : [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-10 md:gap-12">
        <div className="flex flex-col gap-6">
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void openLink(input);
            }}
          >
            <label htmlFor={inputId} className="type-label">
              Link to a document
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id={inputId}
                // Text, not type="url": "example.com/a.pdf" (no https://) is fine here.
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://example.com/report.pdf"
                className={`${fieldClasses} h-11 min-w-0 px-3 md:flex-1`}
                value={input}
                aria-invalid={inputProblem ? true : undefined}
                aria-describedby={inputProblem ? problemId : undefined}
                onChange={(event) => {
                  setInput(event.target.value);
                  setInputProblem(null);
                }}
              />
              <Button type="submit" disabled={Boolean(loading)}>
                Preview
              </Button>
            </div>
            {inputProblem && (
              <p id={problemId} role="alert" className="text-sm">
                {inputProblem}
              </p>
            )}
            <p className="text-sm text-muted">
              PDF, Word, Excel, PowerPoint, OpenDocument, EPUB, Markdown, CSV,
              code, pictures, audio, video and ZIP files, up to{" "}
              {formatBytes(MAX_PREVIEW_BYTES)}. Share pages from GitHub,
              Dropbox, Google Drive and OneDrive open as their file.
            </p>
          </form>

          <FileDrop
            title={
              doc ? "Or preview a file from this device" : "Or drop a file here"
            }
            hint="It's read in this browser and never uploaded. You can also paste one."
            acceptPaste
            onFiles={(files) => {
              const [first] = files;
              if (first) void openFile(first);
            }}
          />

          {!doc && !loading && recent.length > 0 && (
            <section
              aria-labelledby="recent-title"
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="recent-title" className="type-label">
                  Recent links
                </h2>
                <button
                  type="button"
                  className="type-label underline underline-offset-4"
                  onClick={() => {
                    forgetRecent();
                  }}
                >
                  Clear
                </button>
              </div>
              <ul className="flex flex-col border-t border-hair">
                {recent.map((item) => (
                  <li key={item.url} className="border-b border-hair">
                    <button
                      type="button"
                      className="flex w-full flex-col py-2 text-left hover:bg-chip md:flex-row md:gap-4"
                      onClick={() => {
                        void openLink(item.url);
                      }}
                    >
                      <span className="shrink-0">{item.name}</span>
                      <span className="min-w-0 truncate text-sm text-muted">
                        {item.url}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {loading && (
          <div className="flex flex-col gap-2" role="status">
            <p className="type-label break-all" id="preview-progress">
              Fetching {loading.what}…{" "}
              {loading.received > 0 &&
                `${formatBytes(loading.received)}${loading.total ? ` of ${formatBytes(loading.total)}` : ""}`}
            </p>
            <div
              role="progressbar"
              aria-labelledby="preview-progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? undefined}
              className="h-1 w-full overflow-hidden bg-chip"
            >
              <div
                className={`h-full bg-accent transition-[width] duration-(--tr-dur-fast) ease-swiss ${percent === null ? "w-1/4 motion-safe:animate-pulse" : ""}`}
                style={
                  percent === null
                    ? undefined
                    : { width: `${String(percent)}%` }
                }
              />
            </div>
            <button
              type="button"
              className="w-fit type-label underline underline-offset-4"
              onClick={() => {
                loading.controller.abort();
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {status.kind === "error" && (
          <p role="alert" className="border-l-2 border-accent pl-4">
            {status.message}
          </p>
        )}

        {doc && Viewer && (
          <motion.div
            key={`${String(stack.length)}-${doc.name}-${String(doc.bytes.length)}`}
            {...rise}
            className="flex flex-col gap-10 md:gap-12"
          >
            <ToolSection number="01" title="About this file">
              {stack.length > 1 && (
                <nav aria-label="Inside the archive" className="mb-4">
                  <ol className="flex flex-wrap items-center gap-x-2 type-label">
                    {stack.map((each, index) => (
                      <li
                        key={`${each.name}-${String(index)}`}
                        className="flex gap-2"
                      >
                        {index > 0 && <span aria-hidden="true">/</span>}
                        {index < stack.length - 1 ? (
                          <button
                            type="button"
                            className="underline underline-offset-4"
                            onClick={() => {
                              setStack(stack.slice(0, index + 1));
                              setFacts([]);
                            }}
                          >
                            {each.name}
                          </button>
                        ) : (
                          <span aria-current="page" className="break-all">
                            {each.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <Rows rows={about} />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    downloadBlob(new Blob([doc.bytes]), doc.name);
                  }}
                >
                  Download anyway
                </Button>
                {linkSource && (
                  <>
                    <a
                      href={linkSource.link.original}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="type-label underline underline-offset-4"
                    >
                      Open the original link
                    </a>
                    <CopyButton
                      value={addressFor(linkSource.link.original)}
                      label="Copy a link to this preview"
                    />
                  </>
                )}
              </div>
            </ToolSection>

            {linkSource && officeLink && (
              <ToolSection number="02" title="Microsoft's viewer">
                <MicrosoftViewer url={linkSource.link.url} name={doc.name} />
              </ToolSection>
            )}

            <ToolSection number={officeLink ? "03" : "02"} title="Preview">
              <Suspense fallback={<p role="status">Loading the viewer…</p>}>
                <Viewer doc={doc} onFacts={onFacts} onOpen={onOpen} />
              </Suspense>
            </ToolSection>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
