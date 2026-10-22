import { Button, MOTION, REDUCED_MOTION_QUERY } from "@trilleo/ui";
import { preferenceStorage } from "@trilleo/ui/consent";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  CRASH_LINES,
  FPS,
  POWERS,
  TOKEN_POINTS,
  VIEW_H,
  VIEW_W,
  biomeById,
  metres,
  score,
  type BiomeId,
  type Input,
  type RunEvent,
} from "./core";
import { SpriteBook, age, drawScene, newEffects, react } from "./ui/draw";
import { FALLBACK_PALETTE, readPalette } from "./ui/palette";
import { afterRun, loadRecords, saveRecords, type Records } from "./ui/records";
import { Runner, type Status } from "./ui/runner";

/** localStorage, or this tab's sessionStorage with "preferences" off (consent.ts). */
function safeStorage(): Storage | null {
  return typeof window === "undefined" ? null : preferenceStorage(window);
}

function noSubscription(): () => void {
  return () => {
    // Nothing changes after hydration.
  };
}

/** False on the server and while hydrating, true afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (changed) => {
      const query = window.matchMedia(REDUCED_MOTION_QUERY);
      query.addEventListener("change", changed);
      return () => {
        query.removeEventListener("change", changed);
      };
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

const KEYS: Readonly<Record<string, "jump" | "down">> = {
  Space: "jump",
  ArrowUp: "jump",
  KeyW: "jump",
  ArrowDown: "down",
  KeyS: "down",
};

/** Smaller on phones, where the field is only a few lines tall. */
const RUN_BUTTON = "max-md:h-9 max-md:px-3";

/** Writes text only when it changed, so the HUD doesn't relayout every frame. */
function show(element: HTMLElement | null, text: string): void {
  if (element && element.textContent !== text) element.textContent = text;
}

const pad = (value: number) => String(value).padStart(5, "0");

/** One line for screen readers, from what a step did. */
function announcement(event: RunEvent): string | null {
  switch (event.type) {
    case "biome": {
      const biome = biomeById(event.biome);
      return `${biome.name}. ${biome.line}`;
    }
    case "power":
      return `${POWERS[event.kind].name}: ${POWERS[event.kind].summary}`;
    case "shield-break":
      return "Shield used up.";
    default:
      return null;
  }
}

export interface HotfixAppProps {
  /** For tests: the seed of every run. */
  seed?: number;
}

/**
 * Hotfix: a runner drawn in pixels. Records stay in this browser for now. It starts
 * once it's running in the browser.
 */
export function HotfixApp({ seed }: HotfixAppProps) {
  const hydrated = useHydrated();
  return (
    <MotionConfig reducedMotion="user">
      <div className="border-y border-ink bg-fig px-page py-6 md:py-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
          {hydrated ? (
            <Game seed={seed} />
          ) : (
            <div
              className="grid place-items-center border border-ink bg-paper"
              style={{ aspectRatio: `${String(VIEW_W)} / ${String(VIEW_H)}` }}
            >
              <p className="type-label text-muted">Booting the robot…</p>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

function Game({ seed }: { seed: number | undefined }) {
  const reduced = useReducedMotion();
  const runner = useMemo(
    () => new Runner(seed === undefined ? undefined : () => seed, !reduced),
    // The demo is decided once: switching motion off mid-game just stops effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one runner per mount
    [seed],
  );
  const status = useSyncExternalStore(
    runner.subscribe,
    runner.getStatus,
    runner.getStatus,
  );
  const [records, setRecords] = useState<Records>(() =>
    loadRecords(safeStorage()),
  );
  // The loop reads these between renders.
  const recordsRef = useRef(records);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  const [result, setResult] = useState<{
    score: number;
    metres: number;
    tokens: number;
    cause: string;
    newBest: boolean;
  } | null>(null);
  const [biome, setBiome] = useState<BiomeId | null>(null);

  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const hudMetres = useRef<HTMLSpanElement>(null);
  const hudScore = useRef<HTMLSpanElement>(null);
  const hudPowers = useRef<HTMLSpanElement>(null);

  const say = useCallback((text: string) => {
    if (live.current) live.current.textContent = text;
  }, []);

  const finish = useCallback(() => {
    const run = runner.state;
    const { records: next, newBest } = afterRun(recordsRef.current, run);
    saveRecords(safeStorage(), next);
    recordsRef.current = next;
    setRecords(next);
    const cause = run.cause ? CRASH_LINES[run.cause] : "Crashed";
    setResult({
      score: score(run),
      metres: metres(run),
      tokens: run.tokens,
      cause,
      newBest,
    });
    say(
      `${cause}. ${String(metres(run))} metres, ${String(run.tokens)} tokens, score ${String(score(run))}.${newBest ? " A new best!" : ""} Press Space to run again.`,
    );
  }, [runner, say]);

  // The loop: the engine steps at 60 Hz; the screen draws as often as it refreshes
  // (120 Hz and more), each picture in between the last two steps.
  useEffect(() => {
    const screen = canvas.current;
    const box = field.current;
    if (!screen || !box) return;
    const context = screen.getContext("2d", { alpha: false });
    if (!context) return;

    const book = new SpriteBook(readPalette(box));
    const effects = newEffects();
    const repaint = () => {
      book.setPalette(readPalette(box));
    };
    const themes = new MutationObserver(repaint);
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", repaint);

    const size = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width } = screen.getBoundingClientRect();
      // The canvas has the screen's own pixels; the scene is drawn to fit them.
      screen.width = Math.max(VIEW_W, Math.round(width * ratio));
      screen.height = Math.round((screen.width * VIEW_H) / VIEW_W);
      book.setScale(screen.width / VIEW_W);
    };
    size();
    const resizes = new ResizeObserver(size);
    resizes.observe(screen);

    let last = performance.now();
    let frame = 0;
    let shownBiome: BiomeId = runner.state.biome;
    const draw = (now: number) => {
      const elapsed = now - last;
      last = now;
      const wasRunning = runner.status === "running";
      const events = runner.advance(elapsed);
      react(effects, events, runner.state, reducedRef.current);
      age(effects, Math.min(elapsed, 100) / (1000 / FPS));
      const state = runner.view();
      for (const event of events) {
        const line = announcement(event);
        if (line) say(line);
        if (event.type === "biome" && event.biome !== shownBiome) {
          shownBiome = event.biome;
          setBiome(event.biome);
        }
      }
      if (wasRunning && runner.status === "over") finish();

      drawScene(context, state, {
        book,
        effects,
        reduced: reducedRef.current,
      });

      const distance = hudMetres.current;
      const points = hudScore.current;
      const powers = hudPowers.current;
      if (runner.status !== "ready") {
        show(distance, `${String(metres(state))} m`);
        show(points, pad(score(state)));
      }
      if (powers) {
        const chips = [
          state.powers.shield ? "Shield" : "",
          state.powers.compact > 0
            ? `/compact ${(state.powers.compact / FPS).toFixed(1)}s`
            : "",
          state.powers.magnet > 0
            ? `Magnet ${(state.powers.magnet / FPS).toFixed(1)}s`
            : "",
        ].filter(Boolean);
        show(powers, runner.status === "ready" ? "" : chips.join(" · "));
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") runner.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      themes.disconnect();
      resizes.disconnect();
      scheme.removeEventListener("change", repaint);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runner, finish, say]);

  // The game takes the keyboard as soon as it's on screen, as Skygrid's map does.
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);

  const send = useCallback(
    (input: Input) => {
      const before = runner.status;
      runner.input(input);
      if (before !== "running" && runner.status === "running") {
        setResult(null);
        setBiome(null);
        say("Running. Jump with Space, slide with the down arrow.");
      }
    },
    [runner, say],
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const action = KEYS[event.code];
    if (event.code === "KeyP" || event.code === "Escape") {
      if (status === "running") {
        event.preventDefault();
        runner.pause();
        say("Paused. Press Space to carry on.");
      } else if (status === "paused" && event.code === "KeyP") {
        event.preventDefault();
        send("jump");
      }
      return;
    }
    if (event.code === "Enter" && (status === "over" || status === "ready")) {
      event.preventDefault();
      send("jump");
      return;
    }
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    send(action);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const action = KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    send(action === "jump" ? "jump-end" : "down-end");
  };

  // Tap to jump; swipe down to slide.
  const swipe = useRef<{ y: number; down: boolean } | null>(null);
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    swipe.current = { y: event.clientY, down: false };
    send("jump");
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = swipe.current;
    if (!start || start.down || event.clientY - start.y < 18) return;
    start.down = true;
    send("jump-end");
    send("down");
  };
  const onPointerUp = () => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    send(start.down ? "down-end" : "jump-end");
  };

  const hold = (input: "jump" | "down") => ({
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault();
      send(input);
    },
    onPointerUp: () => {
      send(input === "jump" ? "jump-end" : "down-end");
    },
    onPointerCancel: () => {
      send(input === "jump" ? "jump-end" : "down-end");
    },
    onPointerLeave: () => {
      send(input === "jump" ? "jump-end" : "down-end");
    },
  });

  return (
    <>
      <Hud
        status={status}
        best={records.best}
        metresRef={hudMetres}
        scoreRef={hudScore}
        powersRef={hudPowers}
      />
      {/* eslint-disable-next-line jsx-a11y-x/no-static-element-interactions -- keys and taps bubble up from the field (the focus target) */}
      <div
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={field}
          role="application"
          aria-label="Hotfix. Space or the up arrow jumps: hold it to jump higher, press it again in the air to double jump. The down arrow slides. P pauses."
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- the field takes the keyboard: it's what you play with
          tabIndex={0}
          onBlur={(event) => {
            // Focus moving between the field and its own buttons isn't leaving.
            const to = event.relatedTarget;
            if (to instanceof Node && event.currentTarget.contains(to)) return;
            if (runner.status === "running") {
              runner.pause();
              say("Paused.");
            }
          }}
          className="relative touch-none border border-ink bg-paper outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          style={{ aspectRatio: `${String(VIEW_W)} / ${String(VIEW_H)}` }}
        >
          <canvas
            ref={canvas}
            className="block h-full w-full [image-rendering:pixelated]"
            aria-hidden="true"
            style={{ backgroundColor: FALLBACK_PALETTE.paper }}
          />
          <Overlay
            status={status}
            result={result}
            best={records.best}
            onRun={() => {
              send("jump");
              send("jump-end");
              field.current?.focus({ preventScroll: true });
            }}
          />
          <AnimatePresence>
            {biome && status === "running" && (
              <Banner
                key={biome}
                biome={biome}
                onDone={() => {
                  setBiome(null);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="hidden gap-3 pointer-coarse:grid pointer-coarse:grid-cols-2">
        <button
          type="button"
          className="press touch-none border border-ink bg-paper py-5 type-label"
          {...hold("jump")}
        >
          Jump
        </button>
        <button
          type="button"
          className="press touch-none border border-ink bg-paper py-5 type-label"
          {...hold("down")}
        >
          Slide
        </button>
      </div>
      <p ref={live} aria-live="polite" className="sr-only" />
    </>
  );
}

function Hud({
  status,
  best,
  metresRef,
  scoreRef,
  powersRef,
}: {
  status: Status;
  best: number;
  metresRef: RefObject<HTMLSpanElement | null>;
  scoreRef: RefObject<HTMLSpanElement | null>;
  powersRef: RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-sm">
      <span className="flex gap-4">
        <span ref={metresRef} className="tabular-nums">
          {status === "ready" ? "0 m" : null}
        </span>
        <span ref={powersRef} className="text-muted" />
      </span>
      <span className="flex gap-4 tabular-nums">
        <span className="text-muted">
          Best <span data-testid="best">{pad(best)}</span>
        </span>
        <span>
          Score{" "}
          <span ref={scoreRef} data-testid="score">
            {status === "ready" ? pad(0) : null}
          </span>
        </span>
      </span>
    </div>
  );
}

function Overlay({
  status,
  result,
  best,
  onRun,
}: {
  status: Status;
  result: {
    score: number;
    metres: number;
    tokens: number;
    cause: string;
    newBest: boolean;
  } | null;
  best: number;
  onRun: () => void;
}) {
  if (status === "running") return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-paper/70 p-4">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION.base, ease: MOTION.easeOut }}
        className="flex max-w-md flex-col items-center gap-3 border border-ink bg-paper px-6 py-5 text-center max-md:gap-1.5 max-md:border-0 max-md:bg-transparent max-md:p-0"
        onPointerDown={(event) => {
          // Buttons inside take the tap; the field behind shouldn't jump too.
          event.stopPropagation();
        }}
      >
        {status === "ready" && (
          <>
            <p className="type-card max-md:sr-only">Ship the hotfix.</p>
            <p className="text-[15px] text-muted max-md:hidden">
              Jump the bugs, slide under the drones, mind the 404s.
            </p>
            <Button onClick={onRun} className={RUN_BUTTON}>
              Run
              <span className="pointer-coarse:hidden"> (Space)</span>
            </Button>
          </>
        )}
        {status === "paused" && (
          <>
            <p className="type-card max-md:text-sm max-md:font-semibold">
              Paused
            </p>
            <Button onClick={onRun} className={RUN_BUTTON}>
              Carry on
              <span className="pointer-coarse:hidden"> (Space)</span>
            </Button>
          </>
        )}
        {status === "over" && result && (
          <>
            <p
              className="type-card max-md:text-sm max-md:font-semibold"
              role="status"
            >
              {result.cause}
            </p>
            <p className="font-mono text-sm tabular-nums">
              {result.metres} m · {result.tokens} tokens (×{TOKEN_POINTS}) ·{" "}
              <strong>{pad(result.score)}</strong>
            </p>
            <p className="type-label text-muted max-md:hidden">
              {result.newBest ? (
                <span className="bg-accent px-1.5 py-0.5 text-on-accent">
                  New best
                </span>
              ) : (
                <>Best {pad(best)}</>
              )}
            </p>
            <Button onClick={onRun} className={RUN_BUTTON}>
              Run again
              <span className="pointer-coarse:hidden"> (Space)</span>
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Banner({ biome, onDone }: { biome: BiomeId; onDone: () => void }) {
  const { name, line } = biomeById(biome);
  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => {
      clearTimeout(timer);
    };
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION.slow, ease: MOTION.easeOut }}
      className="pointer-events-none absolute top-3 left-3 border border-ink bg-paper px-3 py-1.5"
      aria-hidden="true"
    >
      <p className="type-label">{name}</p>
      <p className="text-xs text-muted max-md:hidden">{line}</p>
    </motion.div>
  );
}
