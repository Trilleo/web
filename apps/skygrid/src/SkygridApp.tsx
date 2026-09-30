import { Button } from "@trilleo/ui";
import { MotionConfig } from "motion/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { GameState } from "./core";
import { GameScreen } from "./ui/GameScreen";
import { GameSession, SAVE_KEY, TICK_MS, loadSave } from "./ui/session";
import { Syncer, type SyncStatus } from "./ui/sync";

/** The account's island as the server has it. */
export interface AccountSave {
  state: GameState;
  version: number;
}

export interface SkygridAppProps {
  signedIn: boolean;
  /** Where "Sign in" goes; it comes back here afterwards. */
  signInHref: string;
  /** Signed in: the account's island, or null if it has none yet. */
  account?: AccountSave | null;
  /** The server's clock when the page was made (ms), to keep actions in step with it. */
  serverTime?: number;
}

export const IMPORT_URL = "/api/games/skygrid/import";

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
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

/** Runs the clock and whatever keeps the island, while the game is on screen. */
function useRunning(
  session: GameSession,
  flush: (leaving: boolean) => void,
): void {
  useEffect(() => {
    const tick = setInterval(() => {
      session.tick();
    }, TICK_MS);
    const leave = () => {
      flush(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leave();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(tick);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(false);
    };
  }, [session, flush]);
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[calc(100svh-7.5rem)] min-h-[34rem] place-items-center border-y border-ink bg-fig px-page">
      {children}
    </div>
  );
}

/**
 * Skygrid. Signed out, the island lives in this browser; signed in, in the account
 * (the server checks every action). It starts once it's running in the browser.
 */
export function SkygridApp(props: SkygridAppProps) {
  const hydrated = useHydrated();
  return (
    <MotionConfig reducedMotion="user">
      {!hydrated ? (
        <Frame>
          <p className="type-label text-muted">Loading your island…</p>
        </Frame>
      ) : props.signedIn ? (
        <AccountGame {...props} />
      ) : (
        <GuestGame signInHref={props.signInHref} />
      )}
    </MotionConfig>
  );
}

function GuestGame({ signInHref }: { signInHref: string }) {
  const session = useMemo(() => new GameSession(loadSave(safeStorage())), []);
  const flush = useMemo(
    () => () => {
      session.save();
    },
    [session],
  );
  useRunning(session, flush);
  return (
    <GameScreen
      session={session}
      saveNote={
        <>
          Saved in this browser ·{" "}
          <a href={signInHref} className="text-ink underline">
            Sign in
          </a>
        </>
      }
    />
  );
}

function AccountGame({ account = null, serverTime }: SkygridAppProps) {
  const [save, setSave] = useState<{
    save: AccountSave;
    serverTime: number;
  } | null>(() =>
    account ? { save: account, serverTime: serverTime ?? Date.now() } : null,
  );
  if (!save) {
    return (
      <FirstSignIn
        onReady={(ready, time) => {
          setSave({ save: ready, serverTime: time });
        }}
      />
    );
  }
  return <AccountRunner save={save.save} serverTime={save.serverTime} />;
}

/**
 * A clock in step with the server's: actions are stamped with its time, not this
 * device's. The offset is taken on first use.
 */
function serverClock(serverTime: number): () => number {
  let offset: number | undefined;
  return () => {
    const local = Date.now();
    offset ??= serverTime - local;
    return local + offset;
  };
}

const STATUS_NOTE: Record<SyncStatus, string> = {
  saved: "Saved to your account",
  saving: "Saving…",
  offline: "Can’t reach the server: retrying",
  "signed-out": "Signed out: not saving. Reload to sign in again",
};

function AccountRunner({
  save,
  serverTime,
}: {
  save: AccountSave;
  serverTime: number;
}) {
  const { session, syncer } = useMemo(() => {
    const now = serverClock(serverTime);
    let recorder: Syncer | null = null;
    const running = new GameSession(save.state, {
      now,
      storage: null,
      onAction: (action) => recorder?.record(action),
    });
    recorder = new Syncer(running, save.version);
    return { session: running, syncer: recorder };
  }, [save, serverTime]);

  useEffect(() => {
    syncer.start();
    return () => {
      syncer.stop();
    };
  }, [syncer]);
  const flush = useMemo(
    () => (leaving: boolean) => {
      void syncer.flush(leaving);
    },
    [syncer],
  );
  useRunning(session, flush);
  const status = useSyncExternalStore(
    syncer.subscribe,
    syncer.getStatus,
    syncer.getStatus,
  );
  return <GameScreen session={session} saveNote={STATUS_NOTE[status]} />;
}

interface ImportReply {
  state?: GameState;
  version?: number;
  serverTime?: number;
  error?: string;
}

type ImportResult =
  | { ok: true; save: AccountSave; serverTime: number }
  | { ok: false; error: string };

/** Asks the server for the account's first island (see IMPORT_URL). */
async function requestImport(state: GameState | null): Promise<ImportResult> {
  try {
    const response = await fetch(IMPORT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ state }),
      credentials: "same-origin",
    });
    const body = (await response.json()) as ImportReply;
    // 409: the account already has one (another tab got there first). Use it.
    if (
      (response.ok || response.status === 409) &&
      body.state &&
      body.version
    ) {
      return {
        ok: true,
        save: { state: body.state, version: body.version },
        serverTime: body.serverTime ?? Date.now(),
      };
    }
    return {
      ok: false,
      error: body.error ?? "Something went wrong. Try again.",
    };
  } catch {
    return {
      ok: false,
      error: "Couldn’t reach the server. Check your connection.",
    };
  }
}

/**
 * Signed in for the first time: the account gets an island, new or the one this
 * browser has been keeping.
 */
function FirstSignIn({
  onReady,
}: {
  onReady: (save: AccountSave, serverTime: number) => void;
}) {
  const [guest] = useState(() => loadSave(safeStorage()));
  const [error, setError] = useState<string | null>(null);
  // With nothing to bring, a new island is on its way from the start.
  const [busy, setBusy] = useState(() => guest === null);

  const finish = (result: ImportResult, moved: boolean) => {
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    if (moved) {
      try {
        safeStorage()?.removeItem(SAVE_KEY);
      } catch {
        // Only tidying up: the island is in the account either way.
      }
    }
    onReady(result.save, result.serverTime);
  };

  const start = (state: GameState | null) => {
    setBusy(true);
    setError(null);
    void requestImport(state).then((result) => {
      finish(result, state !== null);
    });
  };

  useEffect(() => {
    if (guest) return;
    void requestImport(null).then((result) => {
      finish(result, false);
    });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on arrival
  }, []);

  return (
    <Frame>
      <div className="flex max-w-lg flex-col gap-5">
        {guest ? (
          <>
            <h2 className="type-card">Bring your island along?</h2>
            <p className="text-[15px] leading-normal text-muted">
              This browser has an island you played signed out. Move it into
              your account to keep playing it anywhere. It wasn’t checked while
              you played, so very large amounts are capped (coins at 100,000,
              skills at level 15). Or start a new island in your account and
              leave this one here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy}
                onClick={() => {
                  start(guest);
                }}
              >
                Move it to my account
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  start(null);
                }}
              >
                Start a new island
              </Button>
            </div>
          </>
        ) : (
          !error && (
            <p className="type-label text-muted">Setting up your island…</p>
          )
        )}
        {error && (
          <div role="alert" className="flex flex-col gap-3">
            <p className="font-semibold">{error}</p>
            {!guest && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  start(null);
                }}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </Frame>
  );
}
