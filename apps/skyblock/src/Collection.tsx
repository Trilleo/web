import {
  MAX_ATTRIBUTE_LEVEL,
  RARITIES,
  RARITY_LABELS,
  filterOptions,
  searchShards,
  shardsToMax,
  type Rarity,
  type ShardSummary,
} from "@trilleo/skyblock";
import {
  COLLECTION_LIMITS,
  SAVED_KEYS,
  collectionFile,
  leftToMax,
  parseCollectionFile,
  readCollection,
  withShard,
  type Collection as CollectionValue,
} from "@trilleo/skyblock/calc";
import {
  downloadBlob,
  useToolItems,
  useToolStorage,
  type StoredItem,
} from "@trilleo/tool-kit";
import { Button, Field, ToolSection, fieldClasses } from "@trilleo/ui";
import { showToast } from "@trilleo/ui/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "./calc/format";
import { PLANNER_PATH, calculatorPath, meta, shardPath } from "./meta";
import { RarityTag, ShardIcon } from "./ShardBrowser";

/** A shard as the Collection lists it: the browser's summary plus Hypixel's ID. */
export type CollectionShard = ShardSummary & { id: string };

export interface CollectionProps {
  signedIn: boolean;
  signInHref: string;
  shards: CollectionShard[];
  initialSaved?: StoredItem<unknown>[];
}

/** Rows shown at first, and added by "Show more". */
export const COLLECTION_PAGE_SIZE = 60;

/** After a change, how long before the collection is saved (typing is many changes). */
export const COLLECTION_SAVE_DELAY_MS = 600;

const SHOWS = {
  all: "Every shard",
  unmaxed: "Not maxed",
  started: "Levelled",
  held: "Held",
} as const;
type Show = keyof typeof SHOWS;

const LEVELS = Array.from({ length: MAX_ATTRIBUTE_LEVEL + 1 }, (_, i) => i);

/** Totals over the whole collection. */
export function collectionTotals(
  shards: readonly CollectionShard[],
  collection: CollectionValue,
) {
  let maxed = 0;
  let started = 0;
  let left = 0;
  let held = 0;
  for (const shard of shards) {
    const level = collection.levels[shard.id] ?? 0;
    if (level >= MAX_ATTRIBUTE_LEVEL) maxed++;
    else if (level > 0) started++;
    left += leftToMax(shard.rarity, level);
    held += collection.held[shard.id] ?? 0;
  }
  return {
    maxed,
    started,
    left,
    held,
    kinds: Object.keys(collection.held).length,
  };
}

/**
 * The shards someone has: each attribute's level and the shards held but not used,
 * with what's left to max. The calculator and the hunting planner read it.
 */
export function Collection({
  signedIn,
  signInHref,
  shards,
  initialSaved,
}: CollectionProps) {
  const storage = useToolStorage<unknown>(meta.slug, signedIn);
  const saved = useToolItems(storage, initialSaved);
  const [collection, setCollection] = useState<CollectionValue>(() =>
    readCollection(
      initialSaved?.find((item) => item.key === SAVED_KEYS.collection)?.value,
    ),
  );
  const latest = useRef(collection);
  // Browser storage loads after the first render: take what it has once, then own it.
  const adopted = useRef(false);
  /** Changes not saved yet. */
  const pending = useRef(false);
  /** Changed here at all (so storage loading late doesn't undo it). */
  const edited = useRef(false);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (saved.loading || adopted.current) return;
    adopted.current = true;
    // Edited before storage answered: what's on screen wins.
    if (edited.current) return;
    const loaded = readCollection(
      saved.items.find((item) => item.key === SAVED_KEYS.collection)?.value,
    );
    latest.current = loaded;
    setCollection(loaded);
    setFormKey((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saved.items is settled once loading is; this runs once.
  }, [saved.loading]);

  // Saving: after a pause, or at once when the page is hidden or left.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useRef(saved.save);
  useEffect(() => {
    save.current = saved.save;
  }, [saved.save]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    save.current(SAVED_KEYS.collection, latest.current);
  }, []);
  const change = (next: CollectionValue, now = false) => {
    latest.current = next;
    setCollection(next);
    pending.current = true;
    edited.current = true;
    clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(flush, COLLECTION_SAVE_DELAY_MS);
  };
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [flush]);
  const update = (id: string, shardChange: Parameters<typeof withShard>[2]) => {
    change(withShard(latest.current, id, shardChange));
  };

  // Filters.
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [show, setShow] = useState<Show>("all");
  // Rows shown: COLLECTION_PAGE_SIZE more at a time, back to the first page whenever
  // the filters change (hundreds of rows of fields at once are slow to draw and read).
  const filterKey = JSON.stringify([query, rarity, category, family, show]);
  const [paging, setPaging] = useState({
    key: filterKey,
    shown: COLLECTION_PAGE_SIZE,
  });
  const shown = paging.key === filterKey ? paging.shown : COLLECTION_PAGE_SIZE;
  const options = useMemo(() => filterOptions(shards), [shards]);
  const byKey = useMemo(
    () => new Map(shards.map((shard) => [shard.key, shard])),
    [shards],
  );
  const matches = useMemo(
    () =>
      searchShards(shards, { query, rarity, category, family }).flatMap(
        (summary) => {
          const shard = byKey.get(summary.key);
          return shard ? [shard] : [];
        },
      ),
    [shards, byKey, query, rarity, category, family],
  );
  const results = matches.filter((shard) => {
    const level = collection.levels[shard.id] ?? 0;
    if (show === "unmaxed") return level < MAX_ATTRIBUTE_LEVEL;
    if (show === "started") return level > 0;
    if (show === "held") return (collection.held[shard.id] ?? 0) > 0;
    return true;
  });
  const totals = collectionTotals(shards, collection);
  const filtered =
    query !== "" ||
    rarity !== "" ||
    category !== "" ||
    family !== "" ||
    show !== "all";

  const fileInput = useRef<HTMLInputElement>(null);
  const load = async (file: File) => {
    const loaded = parseCollectionFile(await file.text());
    if (!loaded) {
      showToast("That isn’t a collection file from this site.", {
        tone: "error",
      });
      return;
    }
    change(loaded, true);
    setFormKey((n) => n + 1);
    showToast("Collection loaded.");
  };

  return (
    <div className="flex flex-col gap-10">
      <ToolSection number="01" title="Overview">
        <div className="flex flex-col gap-6">
          <dl
            className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"
            data-testid="collection-totals"
          >
            <div>
              <dt className="type-label text-muted">Maxed</dt>
              <dd className="type-lead">
                {formatNumber(totals.maxed)} of {formatNumber(shards.length)}
              </dd>
            </div>
            <div>
              <dt className="type-label text-muted">Levelled, not maxed</dt>
              <dd className="type-lead">{formatNumber(totals.started)}</dd>
            </div>
            <div>
              <dt className="type-label text-muted">Shards left to max all</dt>
              <dd className="type-lead">{formatNumber(totals.left)}</dd>
            </div>
            <div>
              <dt className="type-label text-muted">Held</dt>
              <dd className="type-lead">
                {formatNumber(totals.held)}
                <span className="text-base text-muted">
                  {" "}
                  (
                  {totals.kinds === 1
                    ? "one kind"
                    : `${formatNumber(totals.kinds)} kinds`}
                  )
                </span>
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <a href={PLANNER_PATH} className={plannerLink}>
              Plan everything left to max
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                downloadBlob(
                  new Blob([collectionFile(latest.current, new Date())], {
                    type: "application/json",
                  }),
                  "skyblock-collection.json",
                );
              }}
            >
              Download a copy
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                fileInput.current?.click();
              }}
            >
              Load a copy
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-label="Collection file to load"
              data-testid="collection-file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void load(file);
              }}
            />
            {(totals.maxed + totals.started > 0 || totals.kinds > 0) && (
              <button
                type="button"
                className="type-label underline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Clear every level and held shard? Download a copy first if you might want it back.",
                    )
                  ) {
                    change({ levels: {}, held: {}, keep: [] }, true);
                    setFormKey((n) => n + 1);
                  }
                }}
              >
                Clear everything
              </button>
            )}
          </div>
          <p className="text-sm text-muted">
            {signedIn ? (
              "Kept in your account."
            ) : (
              <>
                Kept in this browser.{" "}
                <a href={signInHref} className="underline">
                  Sign in
                </a>{" "}
                to keep it in your account.
              </>
            )}
            {saved.error && ` Couldn’t save: ${saved.error}`}
          </p>
        </div>
      </ToolSection>

      <ToolSection number="02" title="Your shards">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="col-span-2">
              <Field label="Find a shard">
                {(props) => (
                  <input
                    {...props}
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    placeholder="e.g. Tiamat"
                    className={`${fieldClasses} h-11 px-3`}
                  />
                )}
              </Field>
            </div>
            <Field label="Show">
              {(props) => (
                <select
                  {...props}
                  value={show}
                  onChange={(event) => {
                    setShow(event.target.value as Show);
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  {Object.entries(SHOWS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Rarity">
              {(props) => (
                <select
                  {...props}
                  value={rarity}
                  onChange={(event) => {
                    setRarity(event.target.value as Rarity | "");
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {RARITIES.map((value) => (
                    <option key={value} value={value}>
                      {RARITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Category">
              {(props) => (
                <select
                  {...props}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {options.categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="col-span-2 md:col-span-1">
              <Field label="Family">
                {(props) => (
                  <select
                    {...props}
                    value={family}
                    onChange={(event) => {
                      setFamily(event.target.value);
                    }}
                    className={`${fieldClasses} h-11 px-2`}
                  >
                    <option value="">Any</option>
                    {options.families.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p
              className="text-sm text-muted"
              aria-live="polite"
              data-testid="collection-count"
            >
              {filtered
                ? `${String(results.length)} of ${String(shards.length)} shards`
                : `${String(shards.length)} shards`}
            </p>
            {filtered && (
              <button
                type="button"
                className="type-label underline"
                onClick={() => {
                  setQuery("");
                  setRarity("");
                  setCategory("");
                  setFamily("");
                  setShow("all");
                }}
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-muted">
            Level: your attribute’s level at the Hunting Box. Held: shards you
            have and haven’t used. “Keep” leaves a held shard out of plans.
          </p>
          {results.length === 0 ? (
            <p className="text-muted">No shard matches.</p>
          ) : (
            <ul
              className="flex flex-col border-t border-ink"
              data-testid="collection-list"
              key={formKey}
            >
              <li
                aria-hidden="true"
                className="hidden border-b border-hair py-2 type-label text-muted md:grid md:grid-cols-[auto_minmax(0,1fr)_7rem_8rem_auto_9rem] md:gap-x-4"
              >
                <span className="w-9" />
                <span>Shard</span>
                <span>Level</span>
                <span>Held</span>
                <span className="w-[3.75rem]" />
                <span className="text-right">To max</span>
              </li>
              {results.slice(0, shown).map((shard) => (
                <ShardRow
                  key={shard.id}
                  shard={shard}
                  level={collection.levels[shard.id] ?? 0}
                  held={collection.held[shard.id] ?? 0}
                  keep={collection.keep.includes(shard.id)}
                  onChange={(shardChange) => {
                    update(shard.id, shardChange);
                  }}
                />
              ))}
            </ul>
          )}
          {results.length > shown && (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setPaging({
                    key: filterKey,
                    shown: shown + COLLECTION_PAGE_SIZE,
                  });
                }}
              >
                Show more ({results.length - shown} left)
              </Button>
            </div>
          )}
        </div>
      </ToolSection>
    </div>
  );
}

const plannerLink =
  "press inline-flex h-11 items-center bg-ink px-4 type-label text-paper hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ShardRow({
  shard,
  level,
  held,
  keep,
  onChange,
}: {
  shard: CollectionShard;
  level: number;
  held: number;
  keep: boolean;
  onChange: (change: { level?: number; held?: number; keep?: boolean }) => void;
}) {
  const left = leftToMax(shard.rarity, level);
  return (
    <li
      className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 border-b border-hair py-3 md:grid-cols-[auto_minmax(0,1fr)_7rem_8rem_auto_9rem]"
      data-testid="collection-row"
      data-shard={shard.id}
    >
      <ShardIcon shard={shard} size={36} />
      <div className="flex min-w-0 flex-col">
        <a
          href={shardPath(shard.slug)}
          className="font-medium underline-offset-2 hover:underline"
        >
          {shard.name}
        </a>
        <span className="text-sm">
          <RarityTag rarity={shard.rarity} />
          <span className="text-muted"> · {shard.category}</span>
        </span>
      </div>
      <div className="col-span-2 grid grid-cols-3 gap-3 md:contents">
        <label className="flex flex-col gap-1">
          <span className="type-label text-muted md:sr-only">Level</span>
          <select
            value={level}
            aria-label={`${shard.name}: level`}
            onChange={(event) => {
              onChange({ level: Number(event.target.value) });
            }}
            className={`${fieldClasses} h-10 px-2`}
          >
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                {value === MAX_ATTRIBUTE_LEVEL ? "10 (max)" : value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="type-label text-muted md:sr-only">Held</span>
          <input
            type="number"
            min={0}
            max={COLLECTION_LIMITS.held}
            inputMode="numeric"
            defaultValue={held || ""}
            placeholder="0"
            aria-label={`${shard.name}: held`}
            onChange={(event) => {
              const value = Math.floor(Number(event.target.value || "0"));
              if (
                Number.isFinite(value) &&
                value >= 0 &&
                value <= COLLECTION_LIMITS.held
              )
                onChange({ held: value });
            }}
            className={`${fieldClasses} h-10 px-2`}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5 md:self-center md:pb-0">
          <input
            type="checkbox"
            checked={keep}
            disabled={held === 0 && !keep}
            aria-label={`${shard.name}: keep out of plans`}
            onChange={(event) => {
              onChange({ keep: event.target.checked });
            }}
            className="size-4 cursor-pointer accent-[var(--tr-accent)] disabled:cursor-not-allowed"
          />
          <span className="type-label" aria-hidden="true">
            Keep
          </span>
        </label>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 text-sm md:col-span-1 md:flex-col md:items-end md:gap-0">
        {left === 0 ? (
          <span className="type-label text-accent">Maxed</span>
        ) : (
          <>
            <span className="text-muted tabular-nums">
              {formatNumber(left)} of {formatNumber(shardsToMax(shard.rarity))}{" "}
              left
            </span>
            <a
              href={calculatorPath(shard.slug, left)}
              className="type-label underline"
            >
              Plan it
            </a>
          </>
        )}
      </div>
    </li>
  );
}
