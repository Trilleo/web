import {
  MAX_ATTRIBUTE_LEVEL,
  RARITIES,
  RARITY_LABELS,
  filterOptions,
  searchShards,
  type Rarity,
  type ShardSummary,
} from "@trilleo/skyblock";
import { leftToMax } from "@trilleo/skyblock/calc";
import { preferenceStore } from "@trilleo/tool-kit";
import { CloseIcon, fieldClasses } from "@trilleo/ui";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { RarityTag, ShardIcon, ShardId } from "./ShardBrowser";

/** A shard the picker can offer: the list's summary plus Hypixel's item ID. */
export type PickerShard = ShardSummary & { id: string };

/** Where recent picks are kept (a "preferences" key, under trilleo:tool:). */
export const RECENT_SHARDS_KEY = "trilleo:tool:skyblock:recent-shards";
/** Recent picks kept and shown. */
export const RECENT_MAX = 6;
/** Results drawn at first, and added by "Show more". */
export const PICKER_PAGE = 50;

/** Hypixel IDs picked lately, newest first; [] when none or unreadable. */
export function readRecent(): string[] {
  try {
    const raw = preferenceStore()?.getItem(RECENT_SHARDS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value
          .filter((id): id is string => typeof id === "string")
          .slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function rememberPick(id: string): void {
  try {
    const next = [id, ...readRecent().filter((other) => other !== id)];
    preferenceStore()?.setItem(
      RECENT_SHARDS_KEY,
      JSON.stringify(next.slice(0, RECENT_MAX)),
    );
  } catch {
    // Storage full or blocked: recent picks are a convenience.
  }
}

/**
 * The picker's note from the Collection: a shard's level and what's left to max it
 * ("Level 4 · 180 left", "Maxed"); nothing for shards not levelled yet.
 */
export function levelNote(
  levels: Readonly<Record<string, number>>,
): (shard: Pick<PickerShard, "id" | "rarity">) => string | null {
  return (shard) => {
    const level = levels[shard.id] ?? 0;
    if (level <= 0) return null;
    if (level >= MAX_ATTRIBUTE_LEVEL) return "Maxed";
    return `Level ${String(level)} · ${String(leftToMax(shard.rarity, level))} left`;
  };
}

export interface ShardPickerProps<T extends PickerShard> {
  label: string;
  hint?: string;
  shards: readonly T[];
  /** The chosen shard's Hypixel ID, or null. */
  value: string | null;
  onChange: (shard: T) => void;
  /** A line for a result (your level, what's left to max), or null. */
  note?: (shard: T) => ReactNode;
  /** The trigger's text when nothing is chosen. */
  placeholder?: string;
  /** Placement in its grid (`col-span-2`). */
  className?: string;
  testId?: string;
}

interface Entry<T> {
  shard: T;
  section: "recent" | "all";
}

/**
 * Choosing a shard: a field-like button that opens a modal search over every shard:
 * name, ID, family, attribute, its text and how to hunt it, with rarity, category and
 * family filters (chosen, or typed: `r:legendary c:water fam:reptile s:fishing`).
 * Arrow keys move, Enter picks, Escape closes; recent picks lead while the search is
 * empty.
 */
export function ShardPicker<T extends PickerShard>({
  label,
  hint,
  shards,
  value,
  onChange,
  note,
  placeholder = "Choose a shard",
  className,
  testId,
}: ShardPickerProps<T>) {
  const labelId = useId();
  const valueId = useId();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const chosen = value ? shards.find((shard) => shard.id === value) : undefined;

  return (
    <div
      className={`flex flex-col gap-1.5 ${className ?? ""}`}
      data-testid={testId}
    >
      <span id={labelId} className="type-label">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => {
          setOpen(true);
        }}
        className={`${fieldClasses} flex h-11 items-center gap-2 px-3 text-left hover:bg-chip`}
      >
        {chosen && <ShardIcon shard={chosen} size={24} />}
        <span id={valueId} className="flex min-w-0 flex-1 items-baseline gap-2">
          {chosen ? (
            <>
              <span className="truncate">{chosen.name}</span>
              <ShardId id={chosen.key} />
            </>
          ) : (
            <span className="truncate text-muted">{placeholder}</span>
          )}
        </span>
        <SearchGlyph />
      </button>
      {hint && (
        <span id={hintId} className="text-sm text-muted">
          {hint}
        </span>
      )}
      {open && (
        <PickerDialog
          title={label}
          shards={shards}
          value={value}
          note={note}
          onPick={(shard) => {
            rememberPick(shard.id);
            onChange(shard);
          }}
          onClose={() => {
            setOpen(false);
            // Back to the button, unless the pick already moved focus somewhere
            // (the close event comes after the page has reacted to the pick).
            const focused = document.activeElement;
            if (
              !focused ||
              focused === document.body ||
              focused === trigger.current
            )
              trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}

const chip =
  "press border px-2.5 py-1 type-label aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";

function PickerDialog<T extends PickerShard>({
  title,
  shards,
  value,
  note,
  onPick,
  onClose,
}: {
  title: string;
  shards: readonly T[];
  value: string | null;
  note?: (shard: T) => ReactNode;
  onPick: (shard: T) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const listId = useId();
  const syntaxId = useId();
  const countId = useId();
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [shown, setShown] = useState(PICKER_PAGE);
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
  const options = useMemo(() => filterOptions(shards), [shards]);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // showModal focuses the first control (Close): the search is the point of opening.
    search.current?.focus();
    return () => {
      element?.close();
    };
  }, []);

  const filtering =
    query.trim() !== "" || rarity !== "" || category !== "" || family !== "";
  const results = useMemo(
    () => searchShards(shards, { query, rarity, category, family }),
    [shards, query, rarity, category, family],
  );
  const entries = useMemo((): Entry<T>[] => {
    const all = results
      .slice(0, shown)
      .map((shard): Entry<T> => ({ shard, section: "all" }));
    if (filtering) return all;
    const recents = recent.flatMap((id): Entry<T>[] => {
      const shard = shards.find((s) => s.id === id);
      return shard ? [{ shard, section: "recent" }] : [];
    });
    return [...recents, ...all];
  }, [results, shown, filtering, recent, shards]);
  const recentCount = entries.filter((e) => e.section === "recent").length;
  const optionId = (i: number) => `${listId}-${String(i)}`;

  // Each change of search starts at the top.
  const restart = () => {
    setActive(0);
    setShown(PICKER_PAGE);
    list.current?.scrollTo({ top: 0 });
  };

  // Keep the active option in view.
  useEffect(() => {
    document
      .getElementById(`${listId}-${String(active)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const pick = (entry: Entry<T> | undefined) => {
    if (!entry) return;
    onPick(entry.shard);
    dialog.current?.close();
  };
  const move = (to: number) => {
    if (entries.length === 0) return;
    const next = Math.max(0, Math.min(entries.length - 1, to));
    // Reaching the end draws the next page.
    if (next >= entries.length - 1 && results.length > shown)
      setShown((n) => n + PICKER_PAGE);
    setActive(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const steps: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 10,
      PageUp: -10,
    };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      move(active + step);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(entries[active]);
    }
  };

  const toggle = <V extends string>(
    current: V | "",
    next: V,
    set: (value: V | "") => void,
  ) => {
    set(current === next ? "" : next);
    restart();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      data-testid="shard-picker"
      className="m-0 h-dvh max-h-none w-screen max-w-none animate-dialog border-ink bg-paper p-0 text-ink backdrop:animate-backdrop backdrop:bg-ink/40 md:m-auto md:h-[min(44rem,calc(100dvh-4rem))] md:w-[min(48rem,calc(100vw-4rem))] md:border"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-hair p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="type-row font-medium">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              className="grid size-9 press place-items-center border border-ink hover:bg-chip"
              onClick={() => dialog.current?.close()}
            >
              <CloseIcon />
            </button>
          </div>
          <input
            type="search"
            role="combobox"
            aria-label="Search shards"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              entries.length > 0 ? optionId(active) : undefined
            }
            aria-describedby={`${syntaxId} ${countId}`}
            ref={search}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              restart();
            }}
            onKeyDown={onKeyDown}
            className={`${fieldClasses} h-11 px-3`}
          />
          <p id={syntaxId} className="text-sm text-muted">
            Name, ID, family, attribute or effect.{" "}
            <span className="font-mono">r: c: fam: s:</span> filter.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {RARITIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rarity === value}
                className={`${chip} border-hair hover:border-ink`}
                onClick={() => {
                  toggle(rarity, value, setRarity);
                }}
              >
                {RARITY_LABELS[value]}
              </button>
            ))}
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-hair" />
            {options.categories.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                className={`${chip} border-hair hover:border-ink`}
                onClick={() => {
                  toggle(category, value, setCategory);
                }}
              >
                {value}
              </button>
            ))}
            <label className="sr-only" htmlFor={`${listId}-family`}>
              Family
            </label>
            <select
              id={`${listId}-family`}
              value={family}
              onChange={(event) => {
                setFamily(event.target.value);
                restart();
              }}
              className="h-8 border border-ink bg-paper pl-2 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            >
              <option value="">Any family</option>
              {options.families.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p
          id={countId}
          aria-live="polite"
          className="px-4 pt-3 text-sm text-muted"
          data-testid="shard-picker-count"
        >
          {filtering
            ? `${String(results.length)} of ${String(shards.length)} shards`
            : `${String(shards.length)} shards`}
        </p>

        {entries.length === 0 ? (
          <p className="p-4 text-muted">No shard matches.</p>
        ) : (
          <div
            ref={list}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
          >
            <ul id={listId} role="listbox" aria-label="Shards">
              {entries.map((entry, i) => {
                const { shard } = entry;
                const startsSection =
                  (i === 0 && recentCount > 0) || (i === recentCount && i > 0);
                const extra = note?.(shard);
                return (
                  // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events -- options are chosen from the keyboard through the combobox (aria-activedescendant), as the pattern has it
                  <li
                    key={`${entry.section}-${shard.id}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    data-current={shard.id === value || undefined}
                    onMouseMove={() => {
                      if (i !== active) setActive(i);
                    }}
                    onClick={() => {
                      pick(entry);
                    }}
                    className={`flex cursor-pointer gap-3 px-2 py-2 aria-selected:bg-chip ${startsSection ? "mt-2" : ""}`}
                  >
                    <ShardIcon shard={shard} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {startsSection && (
                        <span
                          aria-hidden="true"
                          className="type-label text-muted"
                        >
                          {entry.section === "recent" ? "Recent" : "All shards"}
                        </span>
                      )}
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{shard.name}</span>
                        <ShardId id={shard.key} />
                        <span className="text-sm">
                          <RarityTag rarity={shard.rarity} />
                        </span>
                        {shard.id === value && (
                          <span className="type-label text-muted">Chosen</span>
                        )}
                      </span>
                      {shard.attribute && (
                        <span className="line-clamp-2 text-sm">
                          <span>{shard.attribute}</span>
                          {shard.text && (
                            <span className="text-muted">: {shard.text}</span>
                          )}
                        </span>
                      )}
                      <span className="text-sm text-muted">
                        {[shard.category, ...shard.families]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    {extra != null && extra !== false && (
                      <span className="shrink-0 self-center text-right text-sm text-muted">
                        {extra}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {results.length > shown && (
              <div className="p-2">
                <button
                  type="button"
                  className="type-label underline"
                  onClick={() => {
                    setShown((n) => n + PICKER_PAGE);
                  }}
                >
                  Show more ({results.length - shown} left)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
