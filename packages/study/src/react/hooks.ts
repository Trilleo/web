/** React access to the study store, decks and derived progress. */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { fetchDecks } from "../client/decks";
import {
  INITIAL_STUDY_STATE,
  studyStore,
  type StudyState,
  type StudyStore,
} from "../client/store";
import { buildProgress, type Deck, type Progress } from "../progress";

/** The page's records and store (the server, with no store, renders the loading state). */
export function useStudy(store?: StudyStore): [StudyState, StudyStore | null] {
  const instance =
    store ?? (typeof window === "undefined" ? null : studyStore());
  const state = useSyncExternalStore(
    instance?.subscribe ?? noSubscribe,
    instance?.getState ?? initial,
    initial,
  );
  return [state, instance];
}

const noSubscribe = () => () => undefined;
const initial = () => INITIAL_STUDY_STATE;

export type DecksState =
  | { status: "loading"; decks: Deck[] }
  | { status: "ready"; decks: Deck[] }
  | { status: "error"; decks: Deck[]; error: string };

/** Every subject's deck, or one (`only`). */
export function useDecks(only?: string | null): DecksState {
  const [state, setState] = useState<DecksState>({
    status: "loading",
    decks: [],
  });
  useEffect(() => {
    let live = true;
    fetchDecks(only).then(
      (decks) => {
        if (live) setState({ status: "ready", decks });
      },
      (error: unknown) => {
        if (live)
          setState({
            status: "error",
            decks: [],
            error:
              error instanceof Error
                ? error.message
                : "The subjects couldn’t be loaded.",
          });
      },
    );
    return () => {
      live = false;
    };
  }, [only]);
  return state;
}

/** The current time, ticking every `everyMs` (due cards appear as their time comes). */
export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, everyMs);
    return () => {
      clearInterval(timer);
    };
  }, [everyMs]);
  return now;
}

/** Progress from the records and decks, worked out again when either changes. */
export function useProgress(
  state: StudyState,
  decks: readonly Deck[],
  now: Date,
): Progress | null {
  return useMemo(
    () =>
      state.status === "ready"
        ? buildProgress(state.events, decks, state.settings, now)
        : null,
    [state.status, state.events, state.settings, decks, now],
  );
}

const noChange = () => () => undefined;

/** A query parameter of the page's address (null on the server, and when absent). */
export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(
    noChange,
    () => new URLSearchParams(location.search).get(name),
    () => null,
  );
}
