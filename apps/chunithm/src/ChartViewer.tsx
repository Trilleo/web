import type { Difficulty } from "@trilleo/chunithm";
import {
  preferenceStore,
  useToolItems,
  useToolStorage,
  type StoredItem,
} from "@trilleo/tool-kit";
import { Button, Choice } from "@trilleo/ui";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  UNAVAILABLE,
  fetchPicture,
  type PictureState,
  type Variant,
} from "./api";
import {
  ZOOMS,
  columnOf,
  crisp,
  measureAt,
  measureStart,
  placeTiles,
  sheetColumns,
  tilesIn,
  type PlacedTile,
  type Zoom,
} from "./layout";
import {
  FAVOURITES_MAX,
  RECENT_MAX,
  chartOfKey,
  meta,
  savedKey,
  type SavedChart,
} from "./meta";

/** How often to ask again while a chart is being joined. */
export const POLL_MS = 3000;
/** Where the layout and size chosen are remembered (a "preferences" key). */
const VIEW_KEY = "trilleo:tool:chunithm:view";
const SHEET_GAP = 12;

type Mode = "strip" | "sheet";

interface ViewPrefs {
  mode: Mode;
  zoom: Zoom;
}

const PREFS_EVENT = "trilleo:chunithm-view";

function readPrefs(raw: string | null): Partial<ViewPrefs> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    return {
      ...(record.mode === "strip" || record.mode === "sheet"
        ? { mode: record.mode }
        : {}),
      ...(ZOOMS.includes(record.zoom as Zoom)
        ? { zoom: record.zoom as Zoom }
        : {}),
    };
  } catch {
    return {};
  }
}

function writePrefs(prefs: ViewPrefs): void {
  try {
    preferenceStore()?.setItem(VIEW_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked or full: the choice lasts until the page is left.
  }
  dispatchEvent(new Event(PREFS_EVENT));
}

function subscribePrefs(onChange: () => void): () => void {
  addEventListener(PREFS_EVENT, onChange);
  addEventListener("storage", onChange);
  return () => {
    removeEventListener(PREFS_EVENT, onChange);
    removeEventListener("storage", onChange);
  };
}

/** The saved layout and size (as text: a stable snapshot); null on the server. */
function usePrefsText(): string | null {
  return useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        return preferenceStore()?.getItem(VIEW_KEY) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
}

function subscribeWidth(onChange: () => void): () => void {
  const query = matchMedia("(min-width: 768px)");
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

/** Whether there's room for a sheet (md and up); false on the server. */
function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWidth,
    () => matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

export interface ChartViewerProps {
  songId: number;
  difficulty: Difficulty;
  /** "Oracle, Master": for the viewer's label. */
  label: string;
  /** What the server knew when it drew the page (it never starts a build). */
  initial: PictureState | null;
  hasMirror: boolean;
  signedIn: boolean;
  signInHref: string;
  /** The account's saved charts, when signed in. */
  initialSaved?: StoredItem<SavedChart>[];
}

/**
 * A chart's picture: asks for it (starting the build the first time), then shows it
 * from measure 1 at the bottom, as one strip or as a sheet of columns.
 */
export function ChartViewer({
  songId,
  difficulty,
  label,
  initial,
  hasMirror,
  signedIn,
  signInHref,
  initialSaved,
}: ChartViewerProps) {
  const [variant, setVariant] = useState<Variant>("normal");
  const [states, setStates] = useState<Partial<Record<Variant, PictureState>>>(
    initial ? { normal: initial } : {},
  );
  // The layout and size chosen before; a sheet by default where there's room.
  const prefsText = usePrefsText();
  const wide = useWide();
  const prefs = readPrefs(prefsText);
  // Until the page has hydrated (no preferences read yet), a strip at 1×.
  const mode: Mode =
    prefsText === null ? "strip" : (prefs.mode ?? (wide ? "sheet" : "strip"));
  const zoom: Zoom = prefs.zoom ?? 1;
  const setMode = (next: Mode) => {
    writePrefs({ mode: next, zoom });
  };
  const setZoom = (next: Zoom) => {
    writePrefs({ mode, zoom: next });
  };
  const state = states[variant];

  // Ask (and ask again) until the picture is there or can't be.
  useEffect(() => {
    if (state && state.status !== "queued" && state.status !== "building")
      return;
    const controller = new AbortController();
    const ask = () => {
      fetchPicture(songId, difficulty, variant, controller.signal).then(
        (next) => {
          setStates((all) => ({ ...all, [variant]: next }));
        },
        () => {
          if (!controller.signal.aborted)
            setStates((all) => ({
              ...all,
              [variant]: { status: "unavailable", reason: "storage" },
            }));
        },
      );
    };
    const timer = window.setTimeout(ask, state ? POLL_MS : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [state, songId, difficulty, variant]);

  // Favourites and recent views.
  const storage = useToolStorage<SavedChart>(meta.slug, signedIn);
  const saved = useToolItems(storage, initialSaved);
  const favouriteKey = savedKey("favourite", songId, difficulty);
  const isFavourite = saved.items.some((item) => item.key === favouriteKey);
  const favourites = saved.items.filter(
    (item) => chartOfKey(item.key)?.kind === "favourite",
  ).length;
  const recorded = useRef(false);
  const { save, remove, items, loading } = saved;
  useEffect(() => {
    if (recorded.current || loading || state?.status !== "ready") return;
    recorded.current = true;
    save(savedKey("recent", songId, difficulty), {
      kind: "recent",
      at: new Date().toISOString(),
    });
    const recent = items
      .filter((item) => item.value.kind === "recent")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const old of recent.slice(RECENT_MAX - 1))
      if (old.key !== savedKey("recent", songId, difficulty))
        void remove(old.key);
  }, [loading, state, items, save, remove, songId, difficulty]);

  const toggleFavourite = () => {
    if (isFavourite) void remove(favouriteKey);
    else save(favouriteKey, { kind: "favourite" });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="chart-viewer">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Choice
          legend="Layout"
          value={mode}
          options={[
            { value: "sheet", label: "Sheet" },
            { value: "strip", label: "Strip" },
          ]}
          onChange={setMode}
        />
        <Choice
          legend="Size"
          value={zoom}
          options={ZOOMS.map((z) => ({ value: z, label: `${String(z)}×` }))}
          onChange={setZoom}
        />
        {hasMirror && (
          <Choice
            legend="Notes"
            value={variant}
            options={[
              { value: "normal", label: "As played" },
              { value: "mirror", label: "Mirrored" },
            ]}
            onChange={setVariant}
          />
        )}
        <div className="flex flex-col gap-2">
          <span className="type-label">Favourite</span>
          <button
            type="button"
            aria-pressed={isFavourite}
            disabled={!isFavourite && favourites >= FAVOURITES_MAX}
            onClick={toggleFavourite}
            className={`press border border-ink px-3 py-2 type-label disabled:opacity-40 ${isFavourite ? "bg-ink text-paper" : "hover:bg-chip"}`}
          >
            {isFavourite ? "★ Saved" : "☆ Save"}
          </button>
        </div>
      </div>
      {!signedIn && saved.items.length > 0 && (
        <p className="text-sm text-muted">
          Favourites and recent charts are kept in this browser.{" "}
          <a href={signInHref} className="underline">
            Sign in
          </a>{" "}
          to keep them in your account.
        </p>
      )}

      {state?.status === "ready" ? (
        <Picture
          key={variant}
          label={`${label}${variant === "mirror" ? " (mirrored)" : ""}`}
          manifest={state.manifest}
          mode={mode}
          zoom={zoom}
        />
      ) : (
        <Waiting state={state ?? null} />
      )}
    </div>
  );
}

function Waiting({ state }: { state: PictureState | null }) {
  let text: string;
  if (!state || state.status === "queued" || state.status === "building")
    text =
      "Joining the chart from sdvx.in’s pictures. The first time takes a few seconds…";
  else if (state.status === "failed")
    text = `This chart couldn’t be drawn: ${state.error}${state.retryAt ? ` It will be tried again after ${new Date(state.retryAt).toLocaleString()}.` : ""}`;
  else if (state.status === "unavailable") text = UNAVAILABLE[state.reason];
  else text = "";
  return (
    <p
      role="status"
      className="border border-hair p-6 text-muted"
      data-testid="chart-status"
    >
      {text}
    </p>
  );
}

function subscribeResize(onChange: () => void): () => void {
  addEventListener("resize", onChange);
  return () => {
    removeEventListener("resize", onChange);
  };
}

/** Screen pixels per CSS pixel (it changes with browser zoom); 1 on the server. */
function useDevicePixelRatio(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.devicePixelRatio || 1,
    () => 1,
  );
}

interface PictureProps {
  label: string;
  manifest: Extract<PictureState, { status: "ready" }>["manifest"];
  mode: Mode;
  zoom: Zoom;
}

/** The chart drawn from its tiles, with a measure counter and a jump. */
function Picture({ label, manifest, mode, zoom }: PictureProps) {
  const tiles = useMemo(() => placeTiles(manifest), [manifest]);
  const box = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState(640);
  const [measure, setMeasure] = useState(1);
  const [target, setTarget] = useState("1");
  const inputId = useId();
  const total = manifest.measures.length;
  const width = manifest.width * zoom;

  const sharp = crisp(zoom, useDevicePixelRatio());

  // The box's height decides the sheet's columns.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    // The observer reports the first size too.
    const observer = new ResizeObserver(() => {
      setBoxHeight(element.clientHeight);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const columns = useMemo(
    () => sheetColumns(manifest.height, (boxHeight - 24) / zoom),
    [manifest.height, boxHeight, zoom],
  );

  /** Shows strip position p near the bottom of the box (strip) or its column (sheet). */
  const show = useCallback(
    (p: number) => {
      const element = box.current;
      if (!element) return;
      if (mode === "strip") {
        const y = (manifest.height - p) * zoom;
        element.scrollTop = Math.max(0, y - element.clientHeight + 48 * zoom);
      } else {
        element.scrollLeft = columnOf(columns, p) * (width + SHEET_GAP);
      }
    },
    [mode, manifest.height, zoom, columns, width],
  );

  // Start at measure 1 (and stay on the same measure when the layout changes).
  const kept = useRef(manifest.measures[0] ?? 0);
  useLayoutEffect(() => {
    show(kept.current);
  }, [show]);

  // Measure 1 is at the bottom of the box: bring it on screen when the picture first
  // appears, unless the reader has already scrolled the page.
  useEffect(() => {
    const element = box.current;
    if (!element || window.scrollY > 0) return;
    if (element.getBoundingClientRect().bottom > window.innerHeight)
      element.scrollIntoView({ block: "end" });
  }, []);

  const onScroll = () => {
    const element = box.current;
    if (!element) return;
    let p: number;
    if (mode === "strip")
      p =
        manifest.height -
        (element.scrollTop + element.clientHeight - 48 * zoom) / zoom;
    else {
      const index = Math.round(element.scrollLeft / (width + SHEET_GAP));
      p = columns[Math.min(columns.length - 1, index)]?.from ?? 0;
    }
    kept.current = Math.max(0, p);
    setMeasure(Math.max(1, measureAt(manifest.measures, kept.current)));
  };

  const jump = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const n = Number(target);
    if (!Number.isFinite(n)) return;
    kept.current = measureStart(manifest.measures, n);
    show(kept.current);
    onScroll();
  };

  const tileStyle = sharp ? { imageRendering: "pixelated" as const } : {};
  const image = (tile: PlacedTile, top: number) => (
    <img
      key={tile.url}
      src={tile.url}
      alt=""
      width={width}
      height={(tile.to - tile.from) * zoom}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="absolute left-0 block max-w-none"
      style={{ top, ...tileStyle }}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {manifest.plainLanes ? (
        <p className="text-sm text-muted" data-testid="chart-plain-lanes">
          sdvx.in hasn’t drawn lanes or measure numbers for this chart, so its
          notes are shown on plain lanes, without measure lines.
        </p>
      ) : (
        <form
          onSubmit={jump}
          className="flex flex-wrap items-center gap-3 type-label"
        >
          <span aria-live="polite" data-testid="chart-measure">
            Measure {measure} of {total}
          </span>
          <label htmlFor={inputId} className="sr-only">
            Go to measure
          </label>
          <input
            id={inputId}
            type="number"
            min={1}
            max={total}
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
            }}
            className="h-9 w-20 border border-ink bg-paper px-2 text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
          />
          <Button type="submit" variant="secondary">
            Go to measure
          </Button>
        </form>
      )}
      <div
        ref={box}
        onScroll={onScroll}
        // A scrolling box must take focus, or keyboards can't scroll it (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- the box scrolls, so it must be reachable by keyboard
        tabIndex={0}
        role="region"
        aria-label={`${label}: the chart, measure 1 at the bottom`}
        data-testid="chart-picture"
        data-mode={mode}
        // svh, not dvh: on phones dvh follows the address bar as it slides in and out,
        // so the box would resize mid-scroll.
        className={`h-[calc(100svh-10rem)] min-h-96 border border-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent ${mode === "strip" ? "overflow-x-auto overflow-y-auto" : "overflow-x-auto overflow-y-hidden"}`}
      >
        {mode === "strip" ? (
          <div
            className="relative mx-auto"
            style={{ width, height: manifest.height * zoom }}
          >
            {tiles.map((tile) =>
              image(tile, (manifest.height - tile.to) * zoom),
            )}
          </div>
        ) : (
          <div
            className="flex h-full items-end p-3"
            style={{ gap: SHEET_GAP, width: "max-content" }}
          >
            {columns.map((column) => (
              <div
                key={column.from}
                className="relative shrink-0 overflow-hidden"
                style={{ width, height: (column.to - column.from) * zoom }}
              >
                {tilesIn(tiles, column.from, column.to).map((tile) =>
                  image(tile, (column.to - tile.to) * zoom),
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
