import {
  browserStorage,
  moveItems,
  useToolItems,
  useToolStorage,
  type SaveState,
  type StoredItem,
} from "@trilleo/tool-kit";
import { ArrowLeftIcon, Button, buttonClasses } from "@trilleo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOTE_MAX_LENGTH, meta, type Note } from "./meta";
import {
  exportMarkdown,
  formatNoteDate,
  newNoteKey,
  notePreview,
  noteTitle,
  searchNotes,
  sortNotes,
  type NoteItem,
} from "./notes";
import { renderNote } from "./render";

export interface NotesAppProps {
  signedIn: boolean;
  /** Where "Sign in" goes; it comes back here afterwards. */
  signInHref: string;
  /** The account's notes, included by the server when signed in. */
  initialNotes?: StoredItem<Note>[];
}

/** Typing is saved this long after it stops (or at once, on leaving the note). */
export const SAVE_DELAY_MS = 600;

const SAVE_STATUS: Record<SaveState, string> = {
  saving: "Saving…",
  saved: "Saved",
  failed: "Not saved.",
};

const fieldClass =
  "w-full border border-ink bg-paper text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent";

export function NotesApp({
  signedIn,
  signInHref,
  initialNotes,
}: NotesAppProps) {
  const storage = useToolStorage<Note>(meta.slug, signedIn);
  const notes = useToolItems(storage, signedIn ? initialNotes : undefined);
  const { save, remove, reload } = notes;

  const [selected, setSelected] = useState<string | null>(null);
  // The selected note's text while it's being typed, ahead of saving.
  const [draft, setDraft] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  // Typed but not yet handed to storage (waiting for a pause).
  const [typing, setTyping] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const focusEditor = useRef(false);

  const queued = useRef<{ key: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushTyping = useCallback(() => {
    clearTimeout(timer.current);
    const next = queued.current;
    queued.current = null;
    setTyping(false);
    if (next) save(next.key, { body: next.body });
  }, [save]);

  // Unmounting saves what's typed.
  useEffect(() => flushTyping, [flushTyping]);

  // So does leaving the page; and while anything is unsaved, the browser asks first.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (queued.current || notes.unsaved) event.preventDefault();
    };
    addEventListener("pagehide", flushTyping);
    addEventListener("beforeunload", warn);
    return () => {
      removeEventListener("pagehide", flushTyping);
      removeEventListener("beforeunload", warn);
    };
  }, [flushTyping, notes.unsaved]);

  // Signed in with notes still in this browser from before? Offer to move them.
  useEffect(() => {
    if (!signedIn) return;
    void browserStorage<Note>(meta.slug)
      .list()
      .then((local) => {
        setLocalCount(local.length);
      });
  }, [signedIn]);

  useEffect(() => {
    if (focusEditor.current) {
      focusEditor.current = false;
      editor.current?.focus();
    }
  });

  const bodyOf = (item: NoteItem) =>
    item.key === selected && draft !== null ? draft : item.value.body;
  const all = sortNotes(
    notes.items.map((item) => ({ ...item, value: { body: bodyOf(item) } })),
  );
  const shown = searchNotes(all, query);
  const current = all.find((item) => item.key === selected) ?? null;
  const body = current?.value.body ?? "";

  /** Saves the open note, and drops it if it was left empty. */
  const leaveCurrent = () => {
    flushTyping();
    if (current && !current.value.body.trim()) void remove(current.key);
  };

  const open = (key: string) => {
    if (key === selected) return;
    leaveCurrent();
    setSelected(key);
    setDraft(null);
    setConfirmingDelete(false);
  };

  const create = () => {
    leaveCurrent();
    const key = newNoteKey();
    save(key, { body: "" });
    setSelected(key);
    setDraft("");
    setPreviewing(false);
    setConfirmingDelete(false);
    setQuery("");
    focusEditor.current = true;
  };

  const type = (text: string) => {
    if (!current) return;
    setDraft(text);
    setTyping(true);
    queued.current = { key: current.key, body: text };
    clearTimeout(timer.current);
    timer.current = setTimeout(flushTyping, SAVE_DELAY_MS);
  };

  const deleteCurrent = async () => {
    if (!current) return;
    queued.current = null;
    clearTimeout(timer.current);
    setTyping(false);
    if (await remove(current.key)) {
      setSelected(null);
      setDraft(null);
      setConfirmingDelete(false);
    }
  };

  const backToList = () => {
    leaveCurrent();
    setSelected(null);
    setDraft(null);
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportMarkdown(all)], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "notes.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const moveLocalNotes = async () => {
    const local = browserStorage<Note>(meta.slug);
    try {
      const moved = await moveItems(local, storage);
      setMoveMessage(
        `Moved ${String(moved)} ${moved === 1 ? "note" : "notes"} into your account.`,
      );
    } catch (failure) {
      setMoveMessage(
        failure instanceof Error ? failure.message : "Moving failed.",
      );
    }
    setLocalCount((await local.list()).length);
    await reload();
  };

  const saveState = current ? notes.saveStates[current.key] : undefined;
  const statusText = typing
    ? "Editing…"
    : saveState
      ? SAVE_STATUS[saveState]
      : "";

  return (
    <div className="flex flex-col gap-6">
      {!signedIn && (
        <p className="border-l-2 border-accent pl-4">
          Notes are kept in this browser only.{" "}
          <a href={signInHref} className="underline underline-offset-4">
            Sign in with GitHub
          </a>{" "}
          to keep them in your account.
        </p>
      )}
      {signedIn && localCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-accent pl-4">
          <p>
            {localCount} {localCount === 1 ? "note is" : "notes are"} still in
            this browser from before you signed in.
          </p>
          <Button variant="secondary" onClick={() => void moveLocalNotes()}>
            Move to your account
          </Button>
        </div>
      )}
      {moveMessage && <p role="status">{moveMessage}</p>}
      {notes.error && (
        <p role="alert" className="border-l-2 border-accent pl-4">
          {notes.error}
        </p>
      )}

      <div className="grid-swiss gap-y-6">
        <section
          aria-label="Your notes"
          className={`col-span-4 flex-col gap-4 md:col-span-3 md:flex xl:col-span-4 ${current ? "hidden" : "flex"}`}
        >
          <div className="flex flex-wrap gap-2">
            <Button onClick={create}>New note</Button>
            <Button
              variant="secondary"
              onClick={download}
              disabled={all.every((item) => !item.value.body.trim())}
            >
              Download all
            </Button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Search notes</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              className={`${fieldClass} h-11 px-3`}
            />
          </label>
          {notes.loading ? (
            <p className="text-muted">Loading notes…</p>
          ) : shown.length === 0 ? (
            <p className="text-muted">
              {query
                ? "No notes match."
                : "No notes yet. Start one with “New note”."}
            </p>
          ) : (
            <ul className="flex flex-col border-t border-ink">
              {shown.map((item) => (
                <li key={item.key} className="border-b border-hair">
                  <button
                    type="button"
                    onClick={() => {
                      open(item.key);
                    }}
                    aria-current={item.key === selected ? "true" : undefined}
                    className="flex w-full flex-col items-start gap-1 px-2 py-3 text-left hover:bg-chip aria-[current=true]:bg-chip"
                  >
                    <span className="font-medium">
                      {noteTitle(item.value.body)}
                    </span>
                    <span className="type-label text-muted">
                      {formatNoteDate(item.updatedAt)}
                    </span>
                    {notePreview(item.value.body) && (
                      <span className="line-clamp-1 text-sm text-muted">
                        {notePreview(item.value.body)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="Note"
          className={`col-span-4 flex-col gap-4 md:col-span-5 md:flex xl:col-span-8 ${current ? "flex" : "hidden"}`}
        >
          {current ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <button
                  type="button"
                  onClick={backToList}
                  className="inline-flex items-center gap-2 type-label underline-offset-4 hover:underline md:hidden"
                >
                  <ArrowLeftIcon size={16} />
                  All notes
                </button>
                <div className="flex" role="group" aria-label="View">
                  {(["Write", "Preview"] as const).map((label) => {
                    const pressed = (label === "Preview") === previewing;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => {
                          if (label === "Preview") flushTyping();
                          setPreviewing(label === "Preview");
                        }}
                        className={`border border-ink px-3 py-2 type-label ${pressed ? "bg-ink text-paper" : "hover:bg-chip"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p role="status" className="type-label text-muted">
                  {statusText}
                  {saveState === "failed" && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => {
                          notes.retry(current.key);
                        }}
                        className="underline underline-offset-4"
                      >
                        Try again
                      </button>
                    </>
                  )}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {confirmingDelete ? (
                    <>
                      <span className="type-label">Delete this note?</span>
                      <button
                        type="button"
                        onClick={() => void deleteCurrent()}
                        className={buttonClasses()}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingDelete(false);
                        }}
                        className={buttonClasses({ variant: "secondary" })}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(true);
                      }}
                      className="type-label text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Delete note
                    </button>
                  )}
                </div>
              </div>
              {previewing ? (
                <div
                  className="prose min-h-96 border border-hair p-4 md:p-6"
                  // Rendered by render.ts: no raw HTML, images or unsafe links.
                  dangerouslySetInnerHTML={{ __html: renderNote(body) }}
                />
              ) : (
                <textarea
                  ref={editor}
                  aria-label="Note text"
                  value={body}
                  maxLength={NOTE_MAX_LENGTH}
                  onChange={(event) => {
                    type(event.target.value);
                  }}
                  onBlur={flushTyping}
                  placeholder="Write in Markdown. The first line is the title."
                  className={`${fieldClass} min-h-96 resize-y p-4 font-mono text-[15px] leading-relaxed`}
                />
              )}
            </>
          ) : (
            <p className="text-muted">Pick a note, or start a new one.</p>
          )}
        </section>
      </div>
    </div>
  );
}
