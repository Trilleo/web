import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ISLAND_MAPS, playerStats, type Dir } from "../core";
import { Controller, type Tab } from "./controller";
import { PanelBody, TABS, type BazaarAccess } from "./Panels";
import type { GameSession, View } from "./session";
import { WorldView } from "./WorldView";

const KEY_DIRS: Readonly<Record<string, Dir>> = {
  ArrowUp: "U",
  ArrowDown: "D",
  ArrowLeft: "L",
  ArrowRight: "R",
  w: "U",
  s: "D",
  a: "L",
  d: "R",
};

function keyDir(key: string): Dir | undefined {
  return KEY_DIRS[key.length === 1 ? key.toLowerCase() : key];
}

export interface GameScreenProps {
  session: GameSession;
  /** Where the island is kept, for the top bar ("Saved in this browser", …). */
  saveNote: ReactNode;
  bazaar: BazaarAccess;
}

/** The game on screen: the world, what's going on, and the panels. */
export function GameScreen({ session, saveNote, bazaar }: GameScreenProps) {
  const view = useSyncExternalStore(
    session.subscribe,
    session.getView,
    session.getView,
  );
  const [tab, setTab] = useState<Tab>("skills");
  const [slot, setSlot] = useState<number | null>(null);
  const world = useRef<HTMLDivElement>(null);
  const [controller] = useState(
    () =>
      new Controller(session, {
        open(next, selected) {
          setTab(next);
          setSlot(selected ?? null);
        },
      }),
  );

  useEffect(
    () => () => {
      controller.stop();
    },
    [controller],
  );
  useLayoutEffect(() => {
    world.current?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select")) return;
    const d = keyDir(event.key);
    if (d) {
      event.preventDefault();
      if (!event.repeat) controller.press(d);
      return;
    }
    const onWorld = target === world.current;
    if (
      event.key === "e" ||
      event.key === "E" ||
      (event.key === " " && onWorld)
    ) {
      event.preventDefault();
      if (!event.repeat) controller.use();
      return;
    }
    const tabKey = TABS.find((entry) => entry.key === event.key);
    if (tabKey && onWorld) setTab(tabKey.id);
  };

  const onKeyUp = (event: React.KeyboardEvent) => {
    const d = keyDir(event.key);
    if (d) controller.release(d);
  };

  const now = view.state.now;

  return (
    // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions -- keys bubble up from anywhere in the game (the map is the focus target)
    <div
      className="grid border-y border-ink md:h-[calc(100svh-7.5rem)] md:min-h-[36rem] md:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_26rem]"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className="flex min-h-0 min-w-0 flex-col">
        <Hud view={view} now={now} saveNote={saveNote} />
        <div
          ref={world}
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- the map takes the keyboard: it's what you play with
          tabIndex={0}
          role="application"
          aria-label={`${ISLAND_MAPS[view.state.pos.island].name}. Arrow keys or WASD to walk; walk into things to use them; E to use what you face or reel in.`}
          aria-describedby="skygrid-log"
          className="relative h-[58svh] min-h-80 bg-fig focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:h-auto md:min-h-0 md:flex-1"
        >
          <WorldView
            view={view}
            now={now}
            onTile={(x, y) => {
              world.current?.focus({ preventScroll: true });
              controller.clickTile(x, y);
            }}
          />
          <TouchPad controller={controller} />
        </div>
        <Log view={view} />
      </div>
      <aside
        aria-label="Your progress"
        className="flex min-h-0 flex-col border-t border-ink md:border-t-0 md:border-l"
      >
        <div
          role="tablist"
          aria-label="Panels"
          className="flex overflow-x-auto border-b border-ink [scrollbar-width:none]"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`skygrid-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls="skygrid-panel"
              className="min-h-11 shrink-0 grow px-2.5 type-label text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-selected:bg-ink aria-selected:text-paper"
              onClick={() => {
                setTab(entry.id);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div
          id="skygrid-panel"
          role="tabpanel"
          aria-labelledby={`skygrid-tab-${tab}`}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:p-5"
        >
          <PanelBody
            tab={tab}
            state={view.state}
            session={session}
            selectedSlot={slot}
            now={now}
            bazaar={bazaar}
          />
        </div>
      </aside>
    </div>
  );
}

/** "HP 92/120" and a thin bar: the numbers are the text, the bar is decoration. */
function Meter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <span>
        {label}{" "}
        <span className="font-bold">
          {Math.max(0, Math.ceil(value))}/{max}
        </span>
      </span>
      <span className="block h-1.5 w-16 bg-chip md:w-20" aria-hidden="true">
        <span
          className="block h-full bg-ink"
          style={{
            width: `${String(Math.max(0, Math.min(1, value / max)) * 100)}%`,
          }}
        />
      </span>
    </span>
  );
}

function Hud({
  view,
  now,
  saveNote,
}: {
  view: View;
  now: number;
  saveNote: ReactNode;
}) {
  const { state, busy, target } = view;
  const stats = playerStats(state);
  let activity: React.ReactNode = null;
  const key = target && `${String(target.x)},${String(target.y)}`;
  const wounded = target && key ? state.mobs[target.island]?.[key] : undefined;
  if (target && wounded && target.island === state.pos.island) {
    activity = (
      <Meter label={target.name} value={wounded.hp} max={target.max} />
    );
  } else if (busy) {
    const done = Math.min(1, (now - busy.start) / (busy.until - busy.start));
    activity = (
      <span className="flex items-center gap-2">
        Working
        <span className="block h-1.5 w-20 bg-chip" aria-hidden="true">
          <span
            className="block h-full bg-accent"
            style={{ width: `${String(done * 100)}%` }}
          />
        </span>
      </span>
    );
  } else if (state.fishing) {
    activity = now >= state.fishing.biteAt ? "A bite! Press E" : "Fishing…";
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-5 gap-y-1 border-b border-ink px-4 py-2 type-label md:px-5">
      <span className="flex items-center gap-5">
        <span>{ISLAND_MAPS[state.pos.island].name}</span>
        <Meter label="HP" value={state.health} max={stats.health} />
      </span>
      <span className="text-muted">{activity}</span>
      <span className="flex items-center gap-4">
        <span className="text-muted">{saveNote}</span>
        <span>
          <span className="text-muted">Coins </span>
          <span className="font-bold">{state.coins.toLocaleString("en")}</span>
        </span>
      </span>
    </div>
  );
}

const LOG_TONE = {
  info: "text-muted",
  gain: "text-ink",
  warn: "font-semibold text-ink",
  big: "font-semibold text-ink",
} as const;

function Log({ view }: { view: View }) {
  const list = useRef<HTMLOListElement>(null);
  const lines = view.log.slice(-12);
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [view.log]);
  return (
    <ol
      ref={list}
      id="skygrid-log"
      aria-live="polite"
      aria-label="What happened"
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- a scrolling region has to be reachable from the keyboard
      tabIndex={0}
      className="h-24 shrink-0 overflow-y-auto border-t border-ink px-4 py-2 font-mono text-xs leading-relaxed md:h-28 md:px-5"
    >
      {lines.map((line) => (
        <li key={line.id} className={LOG_TONE[line.tone]}>
          {line.tone === "warn" ? "× " : "> "}
          {line.text}
        </li>
      ))}
    </ol>
  );
}

const PAD: readonly { d: Dir; label: string; glyph: string; area: string }[] = [
  { d: "U", label: "Walk up", glyph: "▲", area: "col-start-2 row-start-1" },
  { d: "L", label: "Walk left", glyph: "◀", area: "col-start-1 row-start-2" },
  { d: "R", label: "Walk right", glyph: "▶", area: "col-start-3 row-start-2" },
  { d: "D", label: "Walk down", glyph: "▼", area: "col-start-2 row-start-3" },
];

/** On touch screens: a pad for walking, and a button to use things. */
function TouchPad({ controller }: { controller: Controller }) {
  const padButton =
    "grid size-12 place-items-center border border-ink bg-paper text-lg select-none active:bg-ink active:text-paper";
  return (
    <div className="absolute right-3 bottom-3 hidden items-end gap-3 pointer-coarse:flex">
      <button
        type="button"
        className={`${padButton} w-16 font-mono text-xs uppercase`}
        onClick={() => {
          controller.use();
        }}
      >
        Use
      </button>
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        {PAD.map(({ d, label, glyph, area }) => (
          <button
            key={d}
            type="button"
            aria-label={label}
            className={`${padButton} ${area}`}
            onPointerDown={(event) => {
              event.preventDefault();
              controller.press(d);
            }}
            onPointerUp={() => {
              controller.release(d);
            }}
            onPointerLeave={() => {
              controller.release(d);
            }}
            onPointerCancel={() => {
              controller.release(d);
            }}
          >
            {glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
