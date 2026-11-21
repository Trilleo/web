import {
  MAX_ATTRIBUTE_LEVEL,
  RARITIES,
  RARITY_LABELS,
  type Rarity,
} from "@trilleo/skyblock";
import {
  LIMITS,
  SAVED_KEYS,
  isChosenRecipe,
  isPlannerSave,
  leftToMax,
  readCollection,
  readSettings,
  type CalcSettings,
  type ChosenRecipe,
  type PlannerSave,
} from "@trilleo/skyblock/calc";
import {
  useToolItems,
  useToolStorage,
  type StoredItem,
} from "@trilleo/tool-kit";
import { Button, Choice, Field, ToolSection, fieldClasses } from "@trilleo/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalcClient } from "./calc/client";
import type { MultiRequest, MultiView } from "./calc/engine";
import { Checklist } from "./calc/Extras";
import { formatCost, formatNumber } from "./calc/format";
import { ShardName } from "./calc/PlanTree";
import type { ShardOption } from "./calc/types";
import { CALCULATOR_PATH, COLLECTION_PATH, calculatorPath, meta } from "./meta";
import { ShardIcon } from "./ShardBrowser";

/** A shard as the planner lists it: the calculator's, plus where and how it's hunted. */
export interface PlannerShard extends ShardOption {
  category: string;
  families: string[];
  /** How to hunt it, a line each, as plain words. */
  where: string[];
}

export interface PlannerProps {
  signedIn: boolean;
  signInHref: string;
  shards: PlannerShard[];
  initialSaved?: StoredItem<unknown>[];
  /** Tests pass their own engine. */
  client?: CalcClient;
}

/** After a change, how long before the list is saved. */
export const PLANNER_SAVE_DELAY_MS = 600;

const EMPTY: PlannerSave = { targets: [], done: [] };

type Status = "loading" | "ready" | "failed";

/** What "fill from my collection" takes: everything, or one group. */
type Scope =
  { kind: "all" } | { kind: "category" | "family" | "rarity"; value: string };

/**
 * Several shards at once: one list of what to hunt (grouped by category, with where),
 * the fusions in order, and each target's share, with the calculator's setup.
 */
export function Planner({
  signedIn,
  signInHref,
  shards,
  initialSaved,
  client: givenClient,
}: PlannerProps) {
  const storage = useToolStorage<unknown>(meta.slug, signedIn);
  const saved = useToolItems(storage, initialSaved);
  const valueOf = (
    items: readonly StoredItem<unknown>[] | undefined,
    key: string,
  ) => items?.find((item) => item.key === key)?.value;

  const [list, setList] = useState<PlannerSave>(() => {
    const value = valueOf(initialSaved, SAVED_KEYS.planner);
    return isPlannerSave(value) ? value : EMPTY;
  });
  const [settings, setSettings] = useState<CalcSettings>(() =>
    readSettings(valueOf(initialSaved, SAVED_KEYS.settings)),
  );
  const [chosen, setChosen] = useState<ChosenRecipe[]>([]);
  const latest = useRef(list);
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
    const value = valueOf(saved.items, SAVED_KEYS.planner);
    const loaded = isPlannerSave(value) ? value : EMPTY;
    latest.current = loaded;
    setList(loaded);
    setSettings(readSettings(valueOf(saved.items, SAVED_KEYS.settings)));
    const overrides = valueOf(saved.items, SAVED_KEYS.overrides);
    setChosen(Array.isArray(overrides) ? overrides.filter(isChosenRecipe) : []);
    setFormKey((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saved.items is settled once loading is; this runs once.
  }, [saved.loading]);
  const collectionValue = valueOf(saved.items, SAVED_KEYS.collection);
  const collection = useMemo(
    () => readCollection(collectionValue),
    [collectionValue],
  );

  // Saving the list: after a pause, or at once when the page is hidden or left.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useRef(saved.save);
  useEffect(() => {
    save.current = saved.save;
  }, [saved.save]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    save.current(SAVED_KEYS.planner, latest.current);
  }, []);
  const change = (next: PlannerSave, now = false) => {
    latest.current = next;
    setList(next);
    pending.current = true;
    edited.current = true;
    clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(flush, PLANNER_SAVE_DELAY_MS);
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
  const updateSettings = (next: Partial<CalcSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saved.save(SAVED_KEYS.settings, merged);
  };

  // The engine.
  const client = useRef<CalcClient | null>(givenClient ?? null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pricesAt, setPricesAt] = useState<string | null>(null);
  useEffect(() => {
    client.current ??= new CalcClient();
    const engine = client.current;
    let cancelled = false;
    engine.load().then(
      () => {
        if (cancelled) return;
        setStatus("ready");
        engine.loadPrices().then(
          (loaded) => {
            if (!cancelled) setPricesAt(loaded.fetchedAt);
          },
          () => {
            // No prices: coins stay off.
          },
        );
      },
      (error: unknown) => {
        if (cancelled) return;
        setStatus("failed");
        setLoadError(
          error instanceof Error
            ? error.message
            : "The shard data didn’t load.",
        );
      },
    );
    return () => {
      cancelled = true;
      if (!givenClient) {
        client.current?.close();
        client.current = null;
      }
    };
  }, [givenClient]);

  const request: MultiRequest | null = useMemo(
    () =>
      list.targets.length > 0
        ? {
            settings,
            chosen,
            targets: list.targets,
            collection: settings.useCollection ? collection : null,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pricesAt asks again once prices arrive.
    [settings, chosen, list.targets, collection, pricesAt],
  );
  const [result, setResult] = useState<MultiView | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  useEffect(() => {
    // With an empty list nothing is shown, so the last result can stay.
    if (status !== "ready" || !client.current || !request) return;
    let cancelled = false;
    setCalculating(true);
    client.current.multi(request).then(
      (view) => {
        if (cancelled || view === undefined) return;
        setCalculating(false);
        setPlanError(null);
        setResult(view);
      },
      (error: unknown) => {
        if (cancelled) return;
        setCalculating(false);
        setPlanError(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [status, request]);

  const byId = useMemo(
    () => new Map(shards.map((shard) => [shard.id, shard])),
    [shards],
  );
  const setTargets = (targets: PlannerSave["targets"], now = false) => {
    change(
      { ...latest.current, targets: targets.slice(0, LIMITS.targets) },
      now,
    );
  };

  // Adding a target.
  const listId = useId();
  const [addText, setAddText] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const addShard = shards.find(
    (s) => s.name.toLowerCase() === addText.trim().toLowerCase(),
  );
  const add = () => {
    if (!addShard) return;
    const level = collection.levels[addShard.id] ?? 0;
    const quantity =
      Math.floor(Number(addQuantity)) ||
      Math.max(1, leftToMax(addShard.rarity, level));
    const others = latest.current.targets.filter(
      (target) => target.shard !== addShard.id,
    );
    setTargets(
      [
        ...others,
        {
          shard: addShard.id,
          quantity: Math.min(LIMITS.quantity, Math.max(1, quantity)),
        },
      ],
      true,
    );
    setAddText("");
    setAddQuantity("");
  };

  // Filling from the Collection.
  const [scopeText, setScopeText] = useState("all");
  const scopes = useMemo(() => {
    const categories = [...new Set(shards.map((s) => s.category))].sort();
    const families = [...new Set(shards.flatMap((s) => s.families))].sort();
    return { categories, families };
  }, [shards]);
  const scopeOf = (text: string): Scope => {
    const [kind, ...rest] = text.split(":");
    const value = rest.join(":");
    return kind === "category" || kind === "family" || kind === "rarity"
      ? { kind, value }
      : { kind: "all" };
  };
  const inScope = (shard: PlannerShard, scope: Scope) =>
    scope.kind === "all" ||
    (scope.kind === "category" && shard.category === scope.value) ||
    (scope.kind === "family" && shard.families.includes(scope.value)) ||
    (scope.kind === "rarity" && shard.rarity === scope.value);
  const fillCandidates = shards.filter(
    (shard) =>
      inScope(shard, scopeOf(scopeText)) &&
      (collection.levels[shard.id] ?? 0) < MAX_ATTRIBUTE_LEVEL,
  );
  const fill = () => {
    setTargets(
      fillCandidates.map((shard) => ({
        shard: shard.id,
        quantity: leftToMax(shard.rarity, collection.levels[shard.id] ?? 0),
      })),
      true,
    );
  };

  const done = useMemo(() => new Set(list.done), [list.done]);
  const toggle = (id: string, isDone: boolean) => {
    const next = new Set(latest.current.done);
    if (isDone) next.add(id);
    else next.delete(id);
    change(
      { ...latest.current, done: [...next].slice(0, LIMITS.checklistSteps) },
      true,
    );
  };

  const shareOf = new Map(
    result?.targets.map((target) => [target.shard, target]) ?? [],
  );
  const impossible =
    result?.targets.filter((target) => !Number.isFinite(target.cost)) ?? [];
  const hunted = result?.hunt ?? [];
  const groups = groupHunt(hunted, byId);
  const coins = settings.mode === "coins";

  return (
    <div className="flex flex-col gap-10">
      <ToolSection number="01" title="What to make">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[2fr_1fr_auto]">
            <Field label="Add a shard" hint="Start typing its name.">
              {(props) => (
                <input
                  {...props}
                  list={listId}
                  value={addText}
                  onChange={(event) => {
                    setAddText(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add();
                    }
                  }}
                  autoComplete="off"
                  placeholder="e.g. Tiamat"
                  className={`${fieldClasses} h-11 px-3`}
                />
              )}
            </Field>
            <datalist id={listId}>
              {shards.map((shard) => (
                <option key={shard.id} value={shard.name} />
              ))}
            </datalist>
            <Field label="How many" hint="Empty: what’s left to max.">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={1}
                  max={LIMITS.quantity}
                  value={addQuantity}
                  onChange={(event) => {
                    setAddQuantity(event.target.value);
                  }}
                  className={`${fieldClasses} h-11 px-3`}
                />
              )}
            </Field>
            <Button onClick={add} disabled={!addShard}>
              Add
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-hair pt-5">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[2fr_auto]">
              <Field
                label="Or plan what’s left to max in your collection"
                hint={`${String(fillCandidates.length)} shards not maxed. This replaces the list.`}
              >
                {(props) => (
                  <select
                    {...props}
                    value={scopeText}
                    onChange={(event) => {
                      setScopeText(event.target.value);
                    }}
                    className={`${fieldClasses} h-11 px-2`}
                  >
                    <option value="all">Every shard</option>
                    <optgroup label="Category">
                      {scopes.categories.map((value) => (
                        <option key={value} value={`category:${value}`}>
                          {value}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Rarity">
                      {RARITIES.map((value: Rarity) => (
                        <option key={value} value={`rarity:${value}`}>
                          {RARITY_LABELS[value]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Family">
                      {scopes.families.map((value) => (
                        <option key={value} value={`family:${value}`}>
                          {value}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </Field>
              <Button
                variant="secondary"
                onClick={fill}
                disabled={fillCandidates.length === 0}
              >
                Fill the list
              </Button>
            </div>
            <p className="text-sm text-muted">
              Levels come from your{" "}
              <a href={COLLECTION_PATH} className="underline">
                collection
              </a>
              ; a shard you haven’t levelled counts from nothing.
            </p>
          </div>

          {list.targets.length === 0 ? (
            <p className="text-muted">Nothing on the list yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <ul
                className="flex flex-col border-t border-hair"
                data-testid="planner-targets"
                key={formKey}
              >
                {list.targets.map((target) => {
                  const shard = byId.get(target.shard);
                  const share = shareOf.get(target.shard);
                  return (
                    <li
                      key={target.shard}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-hair py-2 md:grid-cols-[auto_minmax(0,1fr)_8rem_10rem_auto]"
                      data-testid="planner-target"
                    >
                      {shard ? <ShardIcon shard={shard} size={32} /> : <span />}
                      <span className="min-w-0 font-medium">
                        {shard?.name ?? target.shard}
                      </span>
                      <button
                        type="button"
                        className="type-label underline md:order-last"
                        aria-label={`Remove ${shard?.name ?? target.shard}`}
                        onClick={() => {
                          setTargets(
                            latest.current.targets.filter(
                              (other) => other.shard !== target.shard,
                            ),
                            true,
                          );
                        }}
                      >
                        Remove
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={LIMITS.quantity}
                        defaultValue={target.quantity}
                        aria-label={`${shard?.name ?? target.shard}: how many`}
                        onChange={(event) => {
                          const value = Math.floor(Number(event.target.value));
                          if (value >= 1 && value <= LIMITS.quantity)
                            setTargets(
                              latest.current.targets.map((other) =>
                                other.shard === target.shard
                                  ? { ...other, quantity: value }
                                  : other,
                              ),
                            );
                        }}
                        className={`${fieldClasses} col-start-2 h-10 px-2 md:col-start-auto`}
                      />
                      <span className="col-span-3 flex items-center justify-between gap-3 text-sm md:col-span-1 md:flex-col md:items-end md:gap-0">
                        <span className="text-muted tabular-nums">
                          {share
                            ? formatCost(share.cost, result?.mode ?? "time")
                            : "…"}
                        </span>
                        {shard && (
                          <a
                            href={calculatorPath(shard.slug, target.quantity)}
                            className="type-label underline"
                          >
                            Its tree
                          </a>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div>
                <button
                  type="button"
                  className="type-label underline"
                  onClick={() => {
                    change({ targets: [], done: [] }, true);
                  }}
                >
                  Clear the list
                </button>
              </div>
            </div>
          )}
        </div>
      </ToolSection>

      <ToolSection number="02" title="Setup">
        <div className="flex flex-col gap-5" key={formKey}>
          <Choice
            legend="Count the cost in"
            value={settings.mode}
            options={[
              { value: "time", label: "Hours (hunt everything)" },
              {
                value: "coins",
                label: "Coins (buy from the Bazaar)",
                disabled: pricesAt === null && settings.mode !== "coins",
              },
            ]}
            onChange={(mode) => {
              updateSettings({ mode });
            }}
          />
          <div className="flex items-start gap-3">
            <input
              id={`${listId}-collection`}
              type="checkbox"
              checked={settings.useCollection}
              onChange={(event) => {
                updateSettings({ useCollection: event.target.checked });
              }}
              className="mt-1 size-4 cursor-pointer accent-[var(--tr-accent)]"
            />
            <div className="flex flex-col">
              <label
                htmlFor={`${listId}-collection`}
                className="cursor-pointer type-label"
              >
                Use my collection
              </label>
              <span className="text-sm text-muted">
                Shards you hold go into the plans first, spread across the list
                from the top.
              </span>
            </div>
          </div>
          <p className="text-sm text-muted">
            Fortune, attribute levels, rates and chosen recipes are the{" "}
            <a href={CALCULATOR_PATH} className="underline">
              calculator’s
            </a>
            ; change them there.{" "}
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

      <ToolSection number="03" title="The plan">
        <div
          className="flex flex-col gap-6"
          aria-busy={calculating || status === "loading"}
        >
          {status === "loading" && (
            <p className="text-muted">Loading the shard data…</p>
          )}
          {status === "failed" && (
            <p role="alert" className="border-l-2 border-accent pl-3">
              {loadError} Reload the page to try again.
            </p>
          )}
          {planError && (
            <p role="alert" className="border-l-2 border-accent pl-3">
              {planError}
            </p>
          )}
          {status === "ready" && list.targets.length === 0 && (
            <p className="text-muted">
              Add shards above to see one plan for all of them.
            </p>
          )}
          {result && list.targets.length > 0 && (
            <>
              {impossible.length > 0 && (
                <p
                  className="border-l-2 border-accent pl-3"
                  data-testid="planner-impossible"
                >
                  {impossible
                    .map(
                      (target) => byId.get(target.shard)?.name ?? target.shard,
                    )
                    .join(", ")}{" "}
                  can’t be made with this setup, so{" "}
                  {impossible.length === 1 ? "it’s" : "they’re"} left out of the
                  totals.
                </p>
              )}
              <dl
                className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"
                data-testid="planner-summary"
              >
                <div>
                  <dt className="type-label text-muted">
                    {coins ? "Cost" : "Time"}
                  </dt>
                  <dd className="type-lead">
                    {formatCost(
                      result.targets.reduce(
                        (sum, t) =>
                          Number.isFinite(t.cost) ? sum + t.cost : sum,
                        0,
                      ),
                      result.mode,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="type-label text-muted">Shards</dt>
                  <dd className="type-lead">
                    {formatNumber(list.targets.length)}
                  </dd>
                </div>
                <div>
                  <dt className="type-label text-muted">Fusions</dt>
                  <dd className="type-lead">{formatNumber(result.crafts)}</dd>
                </div>
                <div>
                  <dt className="type-label text-muted">
                    {coins ? "Kinds to buy" : "Kinds to hunt"}
                  </dt>
                  <dd className="type-lead">{formatNumber(hunted.length)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted" aria-live="polite">
                {calculating
                  ? "Working it out again…"
                  : "Each shard planned the calculator’s way, then added up."}
              </p>
              {result.used && result.used.length > 0 && (
                <details className="text-sm" data-testid="planner-used">
                  <summary className="cursor-pointer">
                    Uses{" "}
                    {formatNumber(
                      result.used.reduce((sum, item) => sum + item.quantity, 0),
                    )}{" "}
                    shards from your collection
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {result.used.map((item) => (
                      <li key={item.shard}>
                        <ShardName
                          shard={result.shards[item.shard]}
                          quantity={item.quantity}
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </ToolSection>

      {result && list.targets.length > 0 && (
        <>
          <ToolSection
            number="04"
            title={coins ? "What to buy" : "What to hunt"}
          >
            <div className="flex flex-col gap-8" data-testid="planner-hunt">
              {hunted.length === 0 && (
                <p className="text-muted">Nothing: you hold it all.</p>
              )}
              {groups.map((group) => (
                <section
                  key={group.category}
                  className="flex flex-col gap-2"
                  aria-labelledby={`${listId}-${group.category}`}
                >
                  <h3
                    id={`${listId}-${group.category}`}
                    className="flex justify-between border-b border-ink pb-1 type-label"
                  >
                    <span>{group.category}</span>
                    <span className="text-muted">
                      {formatCost(group.cost, result.mode)}
                    </span>
                  </h3>
                  <ul className="flex flex-col">
                    {group.items.map((item) => (
                      <li
                        key={item.shard}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-hair py-2"
                      >
                        <ShardName
                          shard={result.shards[item.shard]}
                          quantity={item.quantity}
                        />
                        <span className="text-sm text-muted tabular-nums">
                          {formatCost(item.cost, result.mode)}
                        </span>
                        {!coins &&
                          (byId.get(item.shard)?.where.length ?? 0) > 0 && (
                            <span className="col-span-2 text-sm text-muted">
                              {byId.get(item.shard)?.where.join(" · ")}
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </ToolSection>

          <ToolSection number="05" title="Checklist">
            <Checklist
              plan={result}
              done={done}
              onToggle={toggle}
              onClear={() => {
                change({ ...latest.current, done: [] }, true);
              }}
              testId="planner-checklist"
            />
          </ToolSection>
        </>
      )}
    </div>
  );
}

/** What to hunt by the shard's category, dearest group first. */
export function groupHunt(
  hunt: readonly { shard: string; quantity: number; cost: number }[],
  shards: ReadonlyMap<string, PlannerShard>,
) {
  const groups = new Map<
    string,
    { category: string; cost: number; items: (typeof hunt)[number][] }
  >();
  for (const item of hunt) {
    const known = shards.get(item.shard)?.category ?? "";
    const category = known === "" ? "Other" : known;
    let group = groups.get(category);
    if (!group)
      groups.set(category, (group = { category, cost: 0, items: [] }));
    group.items.push(item);
    group.cost += item.cost;
  }
  return [...groups.values()].sort((a, b) => b.cost - a.cost);
}
