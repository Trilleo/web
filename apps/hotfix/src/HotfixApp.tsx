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
  RULES_VERSION,
  TOKEN_POINTS,
  VIEW_H,
  VIEW_W,
  biomeById,
  dailySeed,
  dayOf,
  metres,
  score,
  unpackInputs,
  type AccessoryId,
  type BiomeId,
  type Input,
  type RunEvent,
  type RunMode,
} from "./core";
import {
  Account,
  type CheckOutcome,
  type PlayerView,
  type Ticket,
} from "./ui/account";
import { AccountPanel, unlockedLine } from "./ui/AccountPanel";
import { SpriteBook, age, drawScene, newEffects, react } from "./ui/draw";
import { FALLBACK_PALETTE, readPalette } from "./ui/palette";
import {
  afterRun,
  dailyBest,
  loadRecords,
  saveRecords,
  type Records,
} from "./ui/records";
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

/** What a tap still goes to while the game takes the screen's other taps. */
const TAPPABLE =
  "a, button, input, label, select, textarea, summary, [role=dialog], [role=menu]";

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

/** Someone's best run, to watch (from the leaderboard's links). */
export interface WatchView {
  seed: number;
  /** packInputs form. */
  inputs: number[];
  /** The engine's RULES_VERSION when it was run. */
  rules: number;
  score: number;
  /** Null for a private profile. */
  name: string | null;
  accessory: AccessoryId | null;
  /** "endless" or "daily:<day>". */
  board: string;
}

export interface HotfixAppProps {
  /** For tests: the seed of every unchecked run. */
  seed?: number;
  signedIn?: boolean;
  /** Where "Sign in" goes; it comes back here afterwards. */
  signInHref?: string;
  /** Signed in: the player's record (null before their first run). */
  account?: PlayerView | null;
  /** A run to offer to watch. */
  watch?: WatchView | null;
  leaderboardHref?: string;
}

const NO_PLAYER: PlayerView = {
  runs: 0,
  tokens: 0,
  furthest: 0,
  achievements: [],
  accessory: null,
  endless: null,
  daily: null,
};

/** How the last run was counted. */
type Check =
  | { state: "unchecked"; reason: "signed-out" | "no-ticket" }
  | { state: "checking" }
  | { state: "done"; outcome: CheckOutcome };

interface Result {
  score: number;
  metres: number;
  tokens: number;
  cause: string;
  mode: RunMode;
  /** Beat this browser's best (unchecked runs). */
  newBest: boolean;
  /** A replay that just ended. */
  watched: boolean;
}

/**
 * Hotfix: a runner drawn in pixels. Signed in, each run gets its seed from the
 * server and is replayed there when it ends; signed out, records stay in this
 * browser. It starts once it's running in the browser.
 */
export function HotfixApp(props: HotfixAppProps) {
  const hydrated = useHydrated();
  return (
    <MotionConfig reducedMotion="user">
      {hydrated ? (
        <Game {...props} />
      ) : (
        <Band>
          <div
            className="grid place-items-center border border-ink bg-paper"
            style={{ aspectRatio: `${String(VIEW_W)} / ${String(VIEW_H)}` }}
          >
            <p className="type-label text-muted">Booting the robot…</p>
          </div>
        </Band>
      )}
    </MotionConfig>
  );
}

function Band({
  children,
  ref,
}: {
  children: React.ReactNode;
  ref?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={ref}
      className="border-y border-ink bg-fig px-page py-6 select-none md:py-10"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

function Game({
  seed,
  signedIn = false,
  signInHref,
  account: initialPlayer,
  watch,
  leaderboardHref = "/games/hotfix/leaderboard/",
}: HotfixAppProps) {
  const reduced = useReducedMotion();
  const runner = useMemo(
    () => new Runner(seed === undefined ? undefined : () => seed, !reduced),
    // The demo is decided once: switching motion off mid-game just stops effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one runner per mount
    [seed],
  );
  const account = useMemo(() => (signedIn ? new Account() : null), [signedIn]);
  const status = useSyncExternalStore(
    runner.subscribe,
    runner.getStatus,
    runner.getStatus,
  );
  const [records, setRecords] = useState<Records>(() =>
    loadRecords(safeStorage()),
  );
  const [player, setPlayer] = useState<PlayerView | null>(() =>
    signedIn ? (initialPlayer ?? NO_PLAYER) : null,
  );
  const [mode, setMode] = useState<RunMode>("endless");
  const [check, setCheck] = useState<Check | null>(null);
  const [today] = useState(() => dayOf(Date.now()));
  // A replay offered from the leaderboard, while it can still be played back.
  const replayable = useMemo(() => {
    if (watch?.rules !== RULES_VERSION) return null;
    const inputs = unpackInputs(watch.inputs);
    return inputs ? { ...watch, inputs } : null;
  }, [watch]);
  const [offer, setOffer] = useState(
    () => watch !== undefined && watch !== null,
  );
  const [wearing, setWearing] = useState<AccessoryId | null>(
    () => initialPlayer?.accessory ?? null,
  );

  // The loop reads these between renders.
  const recordsRef = useRef(records);
  const reducedRef = useRef(reduced);
  const lookRef = useRef<AccessoryId | null>(wearing);
  const current = useRef<{ mode: RunMode; ticket: Ticket | null; day: string }>(
    {
      mode: "endless",
      ticket: null,
      day: today,
    },
  );
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  useEffect(() => {
    if (!runner.watching) lookRef.current = wearing;
  }, [wearing, runner]);
  const [result, setResult] = useState<Result | null>(null);
  const [biome, setBiome] = useState<BiomeId | null>(null);

  // Signed in: a ticket waits for the next run in the chosen mode.
  useEffect(() => {
    void account?.prefetch(mode);
  }, [account, mode]);

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
    const cause = run.cause ? CRASH_LINES[run.cause] : "Crashed";
    const summary = `${String(metres(run))} metres, ${String(run.tokens)} tokens, score ${String(score(run))}.`;
    if (runner.watching) {
      setResult({
        score: score(run),
        metres: metres(run),
        tokens: run.tokens,
        cause,
        mode: "endless",
        newBest: false,
        watched: true,
      });
      say(`The replay ended: ${cause}. ${summary}`);
      return;
    }
    const { mode: ranMode, ticket, day } = current.current;
    const { records: next, newBest } = afterRun(
      recordsRef.current,
      run,
      ranMode,
      day,
    );
    saveRecords(safeStorage(), next);
    recordsRef.current = next;
    setRecords(next);
    setResult({
      score: score(run),
      metres: metres(run),
      tokens: run.tokens,
      cause,
      mode: ranMode,
      newBest,
      watched: false,
    });
    say(`${cause}. ${summary} Press Space to run again.`);

    if (!account) {
      setCheck({ state: "unchecked", reason: "signed-out" });
      return;
    }
    void account.prefetch(ranMode);
    if (!ticket) {
      setCheck({ state: "unchecked", reason: "no-ticket" });
      return;
    }
    setCheck({ state: "checking" });
    const log = [...runner.log];
    void account.finish(ticket, log).then((outcome) => {
      setCheck({ state: "done", outcome });
      if (!outcome.ok) {
        say(outcome.error);
        return;
      }
      const { checked } = outcome;
      setPlayer(checked.player);
      const best =
        ranMode === "daily" ? checked.player.daily : checked.player.endless;
      const parts = [
        checked.newBest && best
          ? `Counted: a new best, number ${String(best.rank)} on the board.`
          : "Counted.",
      ];
      if (checked.unlocked.length > 0) {
        parts.push(`Unlocked: ${unlockedLine(checked.unlocked)}.`);
      }
      say(parts.join(" "));
    });
  }, [runner, account, say]);

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
        accessory: lookRef.current,
      });

      if (runner.status !== "ready") {
        show(hudMetres.current, `${String(metres(state))} m`);
        show(hudScore.current, pad(score(state)));
      }
      const chips = [
        state.powers.shield ? "Shield" : "",
        state.powers.compact > 0
          ? `/compact ${(state.powers.compact / FPS).toFixed(1)}s`
          : "",
        state.powers.magnet > 0
          ? `Magnet ${(state.powers.magnet / FPS).toFixed(1)}s`
          : "",
      ].filter(Boolean);
      show(
        hudPowers.current,
        runner.status === "ready" ? "" : chips.join(" · "),
      );
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

  const started = useCallback(() => {
    setResult(null);
    setBiome(null);
    setCheck(null);
    setOffer(false);
  }, []);

  /** Picks the next run's seed: a ticket's, the day's, or a fresh one. */
  const prepare = useCallback(() => {
    const day = dayOf(Date.now());
    const ticket = account?.take(mode) ?? null;
    const runSeed =
      ticket?.seed ??
      seed ??
      (mode === "daily" ? dailySeed(day) : randomSeed());
    current.current = { mode, ticket, day: ticket?.day ?? day };
    runner.nextSeed(runSeed);
    lookRef.current = wearing;
  }, [account, mode, runner, seed, wearing]);

  const send = useCallback(
    (input: Input) => {
      const before = runner.status;
      if ((before === "ready" || before === "over") && input === "jump") {
        prepare();
      }
      runner.input(input);
      if (before !== "running" && runner.status === "running") {
        started();
        say(
          before === "paused"
            ? "Carrying on."
            : `${mode === "daily" ? "Daily Run" : "Running"}. Jump with Space, slide with the down arrow.`,
        );
      }
    },
    [runner, prepare, started, say, mode],
  );

  const watchReplay = useCallback(() => {
    if (!replayable) return;
    lookRef.current = replayable.accessory;
    runner.watch(replayable.seed, replayable.inputs);
    started();
    say(`Watching ${replayable.name ?? "a player"}’s run.`);
    field.current?.focus({ preventScroll: true });
  }, [replayable, runner, started, say]);

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

  // A mouse click on the field jumps (touch is handled below, for the whole screen).
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    send("jump");
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    send("jump-end");
  };

  // Touch screens, as in the dino game: a tap anywhere jumps (held, higher; again in
  // the air, the double jump). There's no slide: every course can be run without it.
  // Before and after a run only the game's band starts one, so the page still
  // scrolls; links, buttons and fields keep their taps.
  const band = useRef<HTMLDivElement>(null);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);
  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(TAPPABLE)) return;
      const playing = runner.status === "running" || runner.status === "paused";
      if (!playing && !(target && band.current?.contains(target))) return;
      if (runner.watching && runner.status === "running") return;
      // No scrolling, zooming or text selection while the robot runs.
      event.preventDefault();
      sendRef.current("jump");
    };
    const onEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) sendRef.current("jump-end");
    };
    window.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [runner]);

  const best =
    mode === "daily"
      ? player
        ? (player.daily?.score ?? 0)
        : dailyBest(records, today)
      : player
        ? (player.endless?.score ?? 0)
        : records.best;
  const idle = status === "ready" || status === "over";
  const runNow = () => {
    send("jump");
    send("jump-end");
    field.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <Band ref={band}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ModeSwitch
            mode={mode}
            disabled={!idle}
            day={today}
            onChange={(next) => {
              setMode(next);
              setOffer(false);
            }}
          />
          {runner.watching && status !== "ready" && replayable && (
            <p className="type-label text-muted">
              Replay · {replayable.name ?? "A private player"} ·{" "}
              {pad(replayable.score)}
            </p>
          )}
        </div>
        <Hud
          status={status}
          best={best}
          mode={mode}
          metresRef={hudMetres}
          scoreRef={hudScore}
          powersRef={hudPowers}
        />
        {/* eslint-disable-next-line jsx-a11y-x/no-static-element-interactions -- keys and taps bubble up from the field (the focus target) */}
        <div
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
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
              if (to instanceof Node && event.currentTarget.contains(to))
                return;
              // A replay needs no keys: it carries on.
              if (runner.status === "running" && !runner.watching) {
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
              best={best}
              check={check}
              signInHref={signInHref}
              offer={
                offer && watch
                  ? {
                      name: watch.name,
                      score: watch.score,
                      playable: replayable !== null,
                    }
                  : null
              }
              onRun={runNow}
              onWatch={replayable ? watchReplay : null}
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
        <p ref={live} aria-live="polite" className="sr-only" />
      </Band>
      <AccountPanel
        player={player}
        records={records}
        signInHref={signInHref}
        leaderboardHref={leaderboardHref}
        wearing={wearing}
        onWear={
          account
            ? (next) => {
                const before = wearing;
                setWearing(next);
                void account.wear(next).then((done) => {
                  if (!done) setWearing(before);
                });
              }
            : null
        }
      />
    </>
  );
}

function ModeSwitch({
  mode,
  disabled,
  day,
  onChange,
}: {
  mode: RunMode;
  disabled: boolean;
  day: string;
  onChange: (mode: RunMode) => void;
}) {
  const options: { value: RunMode; label: string }[] = [
    { value: "endless", label: "Endless" },
    { value: "daily", label: `Daily Run · ${day}` },
  ];
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Mode</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={`relative press cursor-pointer border border-ink px-3 py-1.5 type-label has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${mode === option.value ? "bg-ink text-paper" : "bg-paper hover:bg-chip"}`}
        >
          <input
            type="radio"
            name="hotfix-mode"
            className="sr-only"
            checked={mode === option.value}
            disabled={disabled}
            onChange={() => {
              onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function Hud({
  status,
  best,
  mode,
  metresRef,
  scoreRef,
  powersRef,
}: {
  status: Status;
  best: number;
  mode: RunMode;
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
          {mode === "daily" ? "Today’s best" : "Best"}{" "}
          <span data-testid="best">{pad(best)}</span>
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

/** How the run was counted, under its result. */
function CheckLine({
  check,
  mode,
  newBest,
  best,
  signInHref,
}: {
  check: Check | null;
  mode: RunMode;
  newBest: boolean;
  best: number;
  signInHref: string | undefined;
}) {
  const badge = (text: string) => (
    <span className="bg-accent px-1.5 py-0.5 text-on-accent">{text}</span>
  );
  if (!check || check.state === "unchecked") {
    return (
      <p className="type-label text-muted max-md:hidden">
        {newBest ? badge("New best") : <>Best {pad(best)}</>}
        {check?.reason === "signed-out" && signInHref && (
          <>
            {" · "}
            <a href={signInHref} className="text-ink underline">
              Sign in
            </a>{" "}
            to be counted
          </>
        )}
        {check?.reason === "no-ticket" && " · Not counted (offline)"}
      </p>
    );
  }
  if (check.state === "checking") {
    return <p className="type-label text-muted">Checking…</p>;
  }
  if (!check.outcome.ok) {
    return <p className="type-label text-muted">{check.outcome.error}</p>;
  }
  const { checked } = check.outcome;
  const board =
    mode === "daily" ? checked.player.daily : checked.player.endless;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="type-label text-muted">
        {checked.newBest ? badge("New best") : "Counted"}
        {board &&
          ` · #${String(board.rank)}${mode === "daily" ? " today" : ""}`}
      </p>
      {checked.unlocked.length > 0 && (
        <p className="type-label max-md:hidden" data-testid="unlocked">
          Unlocked: {unlockedLine(checked.unlocked)}
        </p>
      )}
    </div>
  );
}

function Overlay({
  status,
  result,
  best,
  check,
  signInHref,
  offer,
  onRun,
  onWatch,
}: {
  status: Status;
  result: Result | null;
  best: number;
  check: Check | null;
  signInHref: string | undefined;
  offer: { name: string | null; score: number; playable: boolean } | null;
  onRun: () => void;
  onWatch: (() => void) | null;
}) {
  if (status === "running") return null;
  const key = `${status}-${offer ? "offer" : ""}`;
  return (
    <div className="absolute inset-0 grid place-items-center bg-paper/70 p-4">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION.base, ease: MOTION.easeOut }}
        className="flex max-w-md flex-col items-center gap-3 border border-ink bg-paper px-6 py-5 text-center max-md:gap-1.5 max-md:border-0 max-md:bg-transparent max-md:p-0"
        onPointerDown={(event) => {
          // Buttons inside take the tap; the field behind shouldn't jump too.
          event.stopPropagation();
        }}
      >
        {status === "ready" && offer && (
          <>
            <p className="type-card max-md:text-sm max-md:font-semibold">
              {offer.name ?? "A private player"}’s run · {pad(offer.score)}
            </p>
            {!offer.playable && (
              <p className="text-[15px] text-muted">
                It was run under older rules, so it can’t be played back.
              </p>
            )}
            <div className="flex gap-2">
              {onWatch && (
                <Button onClick={onWatch} className={RUN_BUTTON}>
                  Watch
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={onRun}
                className={RUN_BUTTON}
              >
                Play instead
              </Button>
            </div>
          </>
        )}
        {status === "ready" && !offer && (
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
              {result.watched ? `Replay over: ${result.cause}` : result.cause}
            </p>
            <p className="font-mono text-sm tabular-nums">
              {result.metres} m · {result.tokens} tokens (×{TOKEN_POINTS}) ·{" "}
              <strong>{pad(result.score)}</strong>
            </p>
            {!result.watched && (
              <CheckLine
                check={check}
                mode={result.mode}
                newBest={result.newBest}
                best={best}
                signInHref={signInHref}
              />
            )}
            <div className="flex gap-2">
              {result.watched && onWatch && (
                <Button
                  variant="secondary"
                  onClick={onWatch}
                  className={RUN_BUTTON}
                >
                  Watch again
                </Button>
              )}
              <Button onClick={onRun} className={RUN_BUTTON}>
                {result.watched ? "Play" : "Run again"}
                <span className="pointer-coarse:hidden"> (Space)</span>
              </Button>
            </div>
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
