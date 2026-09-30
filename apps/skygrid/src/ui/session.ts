/**
 * The running game in the browser: the state, the log, and what's on screen right
 * now. Actions go through the engine; nothing changes the state any other way.
 * Components read it with useSyncExternalStore (see useSession).
 */
import {
  GameRuleError,
  ISLAND_MAPS,
  SKILL_NAMES,
  advance,
  applyAction,
  collectionReward,
  itemName,
  newGame,
  parseSave,
  romanTier,
  type Action,
  type GameEvent,
  type GameState,
  type IslandId,
} from "../core";

export const SAVE_KEY = "trilleo:game:skygrid";
export const SAVE_DELAY_MS = 1000;
export const TICK_MS = 250;
const LOG_SIZE = 40;
const FLOATER_MS = 1400;

export interface LogLine {
  id: number;
  text: string;
  tone: "info" | "gain" | "warn" | "big";
}

/** "+3 Wheat" rising from where it happened. */
export interface Floater {
  id: number;
  text: string;
  island: IslandId;
  x: number;
  y: number;
}

export interface Busy {
  x: number;
  y: number;
  start: number;
  until: number;
}

export interface View {
  state: GameState;
  log: readonly LogLine[];
  floaters: readonly Floater[];
  /** What you're working on, while it lasts. */
  busy: Busy | null;
}

type ActionInput = Action extends infer A
  ? A extends Action
    ? Omit<A, "t">
    : never
  : never;

export interface SessionOptions {
  now?: () => number;
  /** Where the save is kept; null: nowhere here (signed in, the server keeps it). */
  storage?: Storage | null;
  /** Every action that went through, as the server will replay it. */
  onAction?: (action: Action) => void;
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Loads this browser's save, or null (missing, broken, or storage blocked). */
export function loadSave(storage: Storage | null): GameState | null {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return raw ? parseSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function describe(event: GameEvent): Omit<LogLine, "id"> | null {
  switch (event.type) {
    case "gain":
      return {
        text: `+${String(event.n)} ${itemName(event.item)}`,
        tone: "gain",
      };
    case "coins":
      return event.n > 0
        ? { text: `+${String(event.n)} coins`, tone: "gain" }
        : { text: `−${String(-event.n)} coins`, tone: "info" };
    case "level":
      return {
        text: `${SKILL_NAMES[event.skill]} level ${String(event.level)}!`,
        tone: "big",
      };
    case "collection":
      return {
        text: `${itemName(event.item)} collection ${romanTier(event.tier)} (+${String(collectionReward(event.tier))} coins)`,
        tone: "big",
      };
    case "travel":
      return {
        text: `You arrive at ${ISLAND_MAPS[event.to].name}.`,
        tone: "info",
      };
    case "note":
      return { text: event.text, tone: "info" };
    case "lose":
    case "xp":
      return null;
  }
}

export class GameSession {
  private view: View;
  private listeners = new Set<() => void>();
  private nextId = 1;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly now: () => number;
  private readonly storage: Storage | null;
  private readonly onAction: ((action: Action) => void) | undefined;

  constructor(state: GameState | null, options: SessionOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.storage =
      options.storage === undefined ? defaultStorage() : options.storage;
    this.onAction = options.onAction;
    const now = this.now();
    const loaded = state ?? newGame(Math.floor(Math.random() * 2 ** 31), now);
    this.view = { state: loaded, log: [], floaters: [], busy: null };
    // An island nobody has played yet (e.g. just made by the server) is new.
    if (state && state.now > state.createdAt) this.welcomeBack(state, now);
    else this.say("You wake up on a small island in the sky.", "big");
  }

  /** What minions made while you were away. */
  private welcomeBack(state: GameState, now: number): void {
    const later = advance(state, now);
    const made = new Map<string, number>();
    later.minions.forEach((minion, slot) => {
      const before = state.minions[slot]?.stored ?? 0;
      if (minion && minion.stored > before) {
        made.set(
          minion.kind,
          (made.get(minion.kind) ?? 0) + minion.stored - before,
        );
      }
    });
    this.view = { ...this.view, state: later };
    if (made.size > 0) {
      const list = [...made].map(
        ([item, n]) => `${String(n)} ${itemName(item)}`,
      );
      this.say(
        `While you were away, your minions made ${list.join(", ")}.`,
        "big",
      );
    } else {
      this.say("Welcome back.", "info");
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getView = (): View => this.view;

  private update(view: Partial<View>): void {
    this.view = { ...this.view, ...view };
    for (const listener of this.listeners) listener();
  }

  say(text: string, tone: LogLine["tone"] = "info"): void {
    const line = { id: this.nextId++, text, tone };
    this.update({ log: [...this.view.log, line].slice(-LOG_SIZE) });
  }

  /** The time for a new action: now, but never before the last one. */
  private time(): number {
    return Math.max(this.now(), this.view.state.now);
  }

  /** Tries an action; on a rule it breaks, logs why and returns false. */
  act(input: ActionInput): boolean {
    const t = this.time();
    const action: Action = { ...input, t };
    let step;
    try {
      step = applyAction(this.view.state, action);
    } catch (error) {
      if (error instanceof GameRuleError) {
        // Walking into things is common; saying "Blocked." each time is noise.
        if (input.k !== "move") this.say(error.message, "warn");
        return false;
      }
      throw error;
    }
    const { state, events } = step;
    const busy =
      input.k === "gather" && state.busyUntil > t
        ? { x: input.x, y: input.y, start: t, until: state.busyUntil }
        : null;
    this.update({ state, busy: busy ?? this.view.busy });
    // Gathering shows its haul when the work is done.
    if (busy) {
      setTimeout(() => {
        this.update({ busy: null });
        this.report(events);
      }, busy.until - t);
    } else {
      this.report(events);
    }
    this.onAction?.(action);
    this.scheduleSave();
    return true;
  }

  /** Takes the server's island instead of this one (it refused something). */
  replace(state: GameState, message: string): void {
    this.update({ state, busy: null, floaters: [] });
    this.say(message, "warn");
  }

  private report(events: readonly GameEvent[]): void {
    const { pos } = this.view.state;
    const floaters: Floater[] = [];
    for (const event of events) {
      const line = describe(event);
      if (line) this.say(line.text, line.tone);
      if (event.type === "gain" || event.type === "xp") {
        const text =
          event.type === "gain"
            ? `+${String(event.n)} ${itemName(event.item)}`
            : `+${String(event.n)} ${SKILL_NAMES[event.skill]} XP`;
        floaters.push({ id: this.nextId++, text, ...pos });
      }
    }
    if (floaters.length === 0) return;
    this.update({ floaters: [...this.view.floaters, ...floaters].slice(-6) });
    setTimeout(() => {
      const gone = new Set(floaters.map((f) => f.id));
      this.update({
        floaters: this.view.floaters.filter((f) => !gone.has(f.id)),
      });
    }, FLOATER_MS);
  }

  /** Moves the clock on: minions work, nodes grow back, fish bite. */
  tick(): void {
    const now = this.now();
    const { state } = this.view;
    const bite = state.fishing?.biteAt;
    const later = advance(state, now);
    if (later === state) return;
    this.update({ state: later });
    if (bite !== undefined && state.now < bite && now >= bite) {
      this.say("A bite! Reel in (E).", "big");
    }
  }

  scheduleSave(): void {
    if (!this.storage) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.save();
    }, SAVE_DELAY_MS);
  }

  save(): void {
    clearTimeout(this.saveTimer);
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.view.state));
    } catch {
      this.say("This browser won’t let the game save.", "warn");
    }
  }
}
