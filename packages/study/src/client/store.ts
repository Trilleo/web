/**
 * Someone's study records in the browser: one store per page, shared by every
 * widget on it. On load it asks the account (GET /api/study); signed out (401) it
 * keeps records in this browser instead, where the cookie settings allow
 * (@trilleo/tool-kit's preferenceStore: localStorage, or this tab only when
 * "preferences" are off). Recording is immediate on screen; account saves go out
 * in the background, retried until they arrive (IDs make repeats harmless).
 */
import { preferenceStore } from "@trilleo/tool-kit";
import {
  DEFAULT_SETTINGS,
  STUDY_LIMITS,
  parseEvent,
  parseSettings,
  type StudyEvent,
  type StudySettings,
} from "../progress";

/** The browser's copy (a "preferences" key: see @trilleo/ui's consent.ts). */
export const STUDY_STORAGE_KEY = "trilleo:study:records";

export interface StudyState {
  status: "loading" | "ready";
  /** Where records go: this browser (signed out) or the account. */
  mode: "browser" | "account";
  events: StudyEvent[];
  settings: StudySettings;
  /** Records not yet in the account. */
  unsaved: number;
  /** Signed in, with records still kept in this browser (they can move over). */
  browserRecords: number;
  error: string | null;
}

/** What a widget records; the store adds the ID and the time. */
export type NewEvent = Omit<StudyEvent, "id" | "at"> &
  Partial<Pick<StudyEvent, "at">>;

export interface StoreDeps {
  fetch: typeof fetch;
  storage: () => Storage | null;
  now: () => Date;
  uuid: () => string;
  /** Milliseconds before a failed save is tried again. */
  retryMs: number;
}

const DEFAULT_DEPS: StoreDeps = {
  fetch: (...args) => fetch(...args),
  storage: preferenceStore,
  now: () => new Date(),
  uuid: () => crypto.randomUUID(),
  retryMs: 15_000,
};

interface BrowserCopy {
  events: StudyEvent[];
  settings: StudySettings | null;
}

const INITIAL: StudyState = {
  status: "loading",
  mode: "browser",
  events: [],
  settings: DEFAULT_SETTINGS,
  unsaved: 0,
  browserRecords: 0,
  error: null,
};

export class StudyStore {
  private state: StudyState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private pending: StudyEvent[] = [];
  private flushing = false;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private loading: Promise<void> | null = null;
  private readonly deps: StoreDeps;

  constructor(deps: Partial<StoreDeps> = {}) {
    this.deps = { ...DEFAULT_DEPS, ...deps };
  }

  getState = (): StudyState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<StudyState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private readBrowser(): BrowserCopy {
    try {
      const raw = this.deps.storage()?.getItem(STUDY_STORAGE_KEY);
      if (!raw) return { events: [], settings: null };
      const parsed = JSON.parse(raw) as {
        events?: unknown;
        settings?: unknown;
      };
      const now = this.deps.now();
      const events = Array.isArray(parsed.events)
        ? parsed.events
            .map((entry) => parseEvent(entry, now))
            .filter((entry) => entry !== null)
        : [];
      return { events, settings: parseSettings(parsed.settings) };
    } catch {
      return { events: [], settings: null };
    }
  }

  private writeBrowser(copy: BrowserCopy): boolean {
    try {
      const store = this.deps.storage();
      if (!store) return false;
      if (copy.events.length === 0 && !copy.settings)
        store.removeItem(STUDY_STORAGE_KEY);
      else store.setItem(STUDY_STORAGE_KEY, JSON.stringify({ v: 1, ...copy }));
      return true;
    } catch {
      return false;
    }
  }

  /** Loads once; later calls wait for the same load. */
  load(): Promise<void> {
    this.loading ??= this.doLoad();
    return this.loading;
  }

  private async doLoad(): Promise<void> {
    const browser = this.readBrowser();
    try {
      const response = await this.deps.fetch("/api/study", {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const body = response.ok
        ? ((await response.json()) as {
            signedIn?: unknown;
            events?: unknown;
            settings?: unknown;
          })
        : null;
      if (body?.signedIn === true) {
        const now = this.deps.now();
        const events = Array.isArray(body.events)
          ? body.events
              .map((entry) => parseEvent(entry, now))
              .filter((entry) => entry !== null)
          : [];
        this.set({
          status: "ready",
          mode: "account",
          events,
          settings:
            parseSettings(body.settings) ??
            browser.settings ??
            DEFAULT_SETTINGS,
          browserRecords: browser.events.length,
          error: null,
        });
        return;
      }
      if (body?.signedIn !== false) throw new Error(String(response.status));
      this.set({
        status: "ready",
        mode: "browser",
        events: browser.events,
        settings: browser.settings ?? DEFAULT_SETTINGS,
        error: null,
      });
    } catch {
      // Offline or the server failed: carry on in this browser, and say so.
      this.set({
        status: "ready",
        mode: "browser",
        events: browser.events,
        settings: browser.settings ?? DEFAULT_SETTINGS,
        error:
          "Couldn’t reach your account: progress is kept in this browser for now.",
      });
    }
  }

  /** Records what happened (shown at once); returns the full events. */
  record(entries: readonly NewEvent[]): StudyEvent[] {
    const now = this.deps.now().toISOString();
    const events = entries
      .map((entry) =>
        parseEvent(
          { ...entry, id: this.deps.uuid(), at: entry.at ?? now },
          this.deps.now(),
        ),
      )
      .filter((entry) => entry !== null);
    if (events.length === 0) return [];
    const all = [...this.state.events, ...events];
    if (this.state.mode === "browser") {
      const kept = all.slice(-STUDY_LIMITS.perPerson);
      const saved = this.writeBrowser({
        events: kept,
        settings: this.state.settings,
      });
      this.set({
        events: kept,
        error: saved
          ? null
          : "This browser won’t keep your progress (its storage is off or full).",
      });
    } else {
      this.pending.push(...events);
      this.set({ events: all, unsaved: this.pending.length });
      void this.flush();
    }
    return events;
  }

  /** Sends what the account doesn't have yet. */
  async flush(): Promise<void> {
    if (
      this.flushing ||
      this.pending.length === 0 ||
      this.state.mode !== "account"
    )
      return;
    this.flushing = true;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    try {
      while (this.pending.length > 0) {
        const batch = this.pending.slice(0, STUDY_LIMITS.perRequest);
        await this.post("/api/study/events", "POST", { events: batch });
        this.pending = this.pending.slice(batch.length);
        this.set({ unsaved: this.pending.length, error: null });
      }
    } catch (error) {
      this.set({
        error:
          error instanceof Error
            ? error.message
            : "Your progress hasn’t been saved yet.",
      });
      this.retry = setTimeout(() => void this.flush(), this.deps.retryMs);
    } finally {
      this.flushing = false;
    }
  }

  private async post(
    path: string,
    method: "POST" | "PUT",
    body: unknown,
  ): Promise<unknown> {
    const response = await this.deps.fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
      keepalive: true,
    });
    const reply = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok)
      throw new Error(
        reply.error ??
          "Your progress hasn’t been saved yet: it will try again.",
      );
    return reply;
  }

  async saveSettings(settings: StudySettings): Promise<void> {
    const checked = parseSettings(settings);
    if (!checked) throw new Error("Those settings aren’t valid.");
    const before = this.state.settings;
    this.set({ settings: checked });
    if (this.state.mode === "browser") {
      this.writeBrowser({ events: this.state.events, settings: checked });
      return;
    }
    try {
      await this.post("/api/study/settings", "PUT", { settings: checked });
    } catch (error) {
      this.set({ settings: before });
      throw error;
    }
  }

  /** Signed in: moves this browser's records into the account, then forgets them here. */
  async moveBrowserRecords(): Promise<number> {
    if (this.state.mode !== "account") return 0;
    const browser = this.readBrowser();
    for (
      let start = 0;
      start < browser.events.length;
      start += STUDY_LIMITS.perRequest
    )
      await this.post("/api/study/events", "POST", {
        events: browser.events.slice(start, start + STUDY_LIMITS.perRequest),
      });
    this.writeBrowser({ events: [], settings: null });
    const known = new Set(this.state.events.map((event) => event.id));
    this.set({
      events: [
        ...this.state.events,
        ...browser.events.filter((event) => !known.has(event.id)),
      ],
      browserRecords: 0,
    });
    return browser.events.length;
  }
}

let shared: StudyStore | null = null;

/** The page's store (made and loaded on first use, in the browser only). */
export function studyStore(): StudyStore {
  if (!shared) {
    shared = new StudyStore();
    void shared.load();
    // Leaving the page: one last try for anything unsaved.
    addEventListener("pagehide", () => void shared?.flush());
  }
  return shared;
}

export const INITIAL_STUDY_STATE = INITIAL;
