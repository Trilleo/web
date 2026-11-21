import { shardsToLevel, shardsToMax } from "@trilleo/skyblock";
import {
  LIMITS,
  SAVED_KEYS,
  isChecklist,
  isChosenRecipe,
  readSettings,
  withChoice,
  withoutChoice,
  type CalcSettings,
  type Checklist as ChecklistValue,
  type ChosenRecipe,
  type PriceTable,
  afterTax,
  buyPrice,
} from "@trilleo/skyblock/calc";
import {
  useToolItems,
  useToolStorage,
  type StoredItem,
} from "@trilleo/tool-kit";
import { Button, Field, ToolSection, fieldClasses } from "@trilleo/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alternatives } from "./calc/Alternatives";
import { CalcClient } from "./calc/client";
import type {
  AlternativesView,
  PlanRequest,
  PlanView,
  RecipeView,
} from "./calc/engine";
import { Breakdown, Checklist, Compare, Exports } from "./calc/Extras";
import { formatCoins, formatCost, formatNumber } from "./calc/format";
import { PlanTree } from "./calc/PlanTree";
import { Prices, Rates } from "./calc/Rates";
import { Setup } from "./calc/Setup";
import type { ShardOption } from "./calc/types";
import { meta } from "./meta";
import { ShardIcon } from "./ShardBrowser";

export type { ShardOption } from "./calc/types";

/** How often the page asks for new Bazaar prices (the server fetches every 5 minutes). */
export const PRICES_REFRESH_MS = 5 * 60 * 1000;

/** What the shards a plan makes sell for (after tax), and the profit, both ways. */
function saleRows(
  plan: PlanView,
  tax: number,
): { label: string; value: string; note: string }[] {
  const rows: { label: string; value: string; note: string }[] = [];
  const ways = [
    ["Sell instantly", plan.market?.bid ?? null],
    ["Sell offer", plan.market?.ask ?? null],
  ] as const;
  for (const [label, price] of ways) {
    if (price === null) continue;
    const sells = afterTax(price, tax) * plan.produced;
    const profit = sells - plan.cost;
    rows.push({
      label,
      value: formatCoins(sells),
      note: `${profit >= 0 ? "Profit" : "Loss"} ${formatCoins(Math.abs(profit))}, after ${String(tax)}% tax`,
    });
  }
  return rows;
}

/** After a change, how long before settings are saved (typing a number is many changes). */
export const SAVE_DELAY_MS = 600;

export interface CalculatorProps {
  signedIn: boolean;
  signInHref: string;
  /** Every shard, for the picker and rates (the page renders them). */
  shards: ShardOption[];
  initialSaved?: StoredItem<unknown>[];
  /** From ?shard= (a slug) and ?qty=. */
  initialShard?: string | null;
  initialQuantity?: number;
  /** From ?mode=coins (the profits page's routes): count in coins, over the saved setup. */
  initialMode?: CalcSettings["mode"];
  /** Tests pass their own engine. */
  client?: CalcClient;
}

type Status = "loading" | "ready" | "failed";

/** The fusion calculator: the fastest way to make some number of a shard. */
export function Calculator({
  signedIn,
  signInHref,
  shards,
  initialSaved,
  initialShard = null,
  initialQuantity,
  initialMode,
  client: givenClient,
}: CalculatorProps) {
  const withMode = (loaded: CalcSettings): CalcSettings =>
    initialMode ? { ...loaded, mode: initialMode } : loaded;
  const storage = useToolStorage<unknown>(meta.slug, signedIn);
  const saved = useToolItems(storage, initialSaved);
  const savedValue = (key: string) =>
    saved.items.find((item) => item.key === key)?.value;

  const [settings, setSettings] = useState<CalcSettings>(() =>
    withMode(
      readSettings(
        initialSaved?.find((item) => item.key === SAVED_KEYS.settings)?.value,
      ),
    ),
  );
  /** The newest settings, for changes made before React re-renders. */
  const latestSettings = useRef(settings);
  const [chosen, setChosen] = useState<ChosenRecipe[]>([]);
  const [checklist, setChecklist] = useState<ChecklistValue | null>(null);
  // Browser storage loads after the first render: take what it has once, then own it.
  const adopted = useRef(false);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (saved.loading || adopted.current) return;
    adopted.current = true;
    const loaded = withMode(readSettings(savedValue(SAVED_KEYS.settings)));
    latestSettings.current = loaded;
    setSettings(loaded);
    const overrides = savedValue(SAVED_KEYS.overrides);
    setChosen(Array.isArray(overrides) ? overrides.filter(isChosenRecipe) : []);
    const list = savedValue(SAVED_KEYS.checklist);
    setChecklist(isChecklist(list) ? list : null);
    setFormKey((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedValue reads saved.items, which loading settles; this runs once.
  }, [saved.loading]);

  const firstShard =
    shards.find((shard) => shard.slug === initialShard) ?? null;
  const [target, setTarget] = useState<ShardOption | null>(firstShard);
  const [targetText, setTargetText] = useState(firstShard?.name ?? "");
  const [quantity, setQuantity] = useState(
    Math.max(
      1,
      Math.min(
        LIMITS.quantity,
        Math.floor(
          initialQuantity ?? (firstShard ? shardsToMax(firstShard.rarity) : 1),
        ),
      ),
    ),
  );

  // Saving: settings after a pause (typing is many changes), or at once when the
  // page is hidden or left, so nothing typed is lost; the rest at once.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingSettings = useRef<CalcSettings | null>(null);
  const save = useRef(saved.save);
  useEffect(() => {
    save.current = saved.save;
  }, [saved.save]);
  const flushSettings = useCallback(() => {
    clearTimeout(saveTimer.current);
    const pending = pendingSettings.current;
    pendingSettings.current = null;
    if (pending) save.current(SAVED_KEYS.settings, pending);
  }, []);
  const updateSettings = (change: Partial<CalcSettings>) => {
    const next = { ...latestSettings.current, ...change };
    latestSettings.current = next;
    setSettings(next);
    pendingSettings.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSettings, SAVE_DELAY_MS);
  };
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushSettings();
    };
    window.addEventListener("pagehide", flushSettings);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flushSettings);
      document.removeEventListener("visibilitychange", onHidden);
      flushSettings();
    };
  }, [flushSettings]);
  const updateChosen = (next: ChosenRecipe[]) => {
    setChosen(next);
    saved.save(SAVED_KEYS.overrides, next);
  };

  // The engine.
  const client = useRef<CalcClient | null>(givenClient ?? null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    client.current ??= new CalcClient();
    let cancelled = false;
    client.current.load().then(
      () => {
        if (!cancelled) setStatus("ready");
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

  // Bazaar prices (for coin mode), loaded once the data is in and again every
  // PRICES_REFRESH_MS; the plan is worked out again when they change.
  const [market, setMarket] = useState<{
    fetchedAt: string | null;
    prices: PriceTable | null;
  }>({ fetchedAt: null, prices: null });
  useEffect(() => {
    if (status !== "ready" || !client.current) return;
    const engine = client.current;
    let cancelled = false;
    const refresh = () => {
      engine.loadPrices().then(
        (loaded) => {
          if (!cancelled) setMarket(loaded);
        },
        () => {
          // No prices: coin mode stays off; hours still work.
        },
      );
    };
    refresh();
    const timer = setInterval(refresh, PRICES_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status]);

  const request: PlanRequest | null = useMemo(
    () => (target ? { settings, chosen, target: target.id, quantity } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- market.fetchedAt asks for a new plan when prices change.
    [settings, chosen, target, quantity, market.fetchedAt],
  );
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || !request || !client.current) return;
    let cancelled = false;
    setCalculating(true);
    client.current.plan(request).then(
      (result) => {
        if (cancelled || result === undefined) return;
        setCalculating(false);
        setPlanError(result ? null : "That shard isn’t in the data any more.");
        setPlan(result);
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

  // The address carries the target, so a plan can be shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (target) {
      url.searchParams.set("shard", target.slug);
      url.searchParams.set("qty", String(quantity));
    } else {
      url.searchParams.delete("shard");
      url.searchParams.delete("qty");
    }
    window.history.replaceState(null, "", url);
  }, [target, quantity]);

  // Alternatives.
  const [changing, setChanging] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativesView | null>(
    null,
  );
  useEffect(() => {
    if (!changing || !request || !client.current) return;
    let cancelled = false;
    setAlternatives(null);
    void client.current.alternatives(request, changing).then((view) => {
      if (!cancelled) setAlternatives(view);
    });
    return () => {
      cancelled = true;
    };
  }, [changing, request]);
  const pick = (shard: string, recipe: RecipeView | null) => {
    updateChosen(
      withChoice(chosen, {
        shard,
        recipe: recipe
          ? { inputs: [recipe.a, recipe.b], quantity: recipe.quantity }
          : null,
      }),
    );
  };

  // Checklist (one target's at a time).
  const checklistDone = useMemo(
    () =>
      new Set(
        checklist &&
          checklist.shard === target?.id &&
          checklist.quantity === quantity
          ? checklist.done
          : [],
      ),
    [checklist, target, quantity],
  );
  const toggleStep = (id: string, done: boolean) => {
    if (!target) return;
    const next = new Set(checklistDone);
    if (done) next.add(id);
    else next.delete(id);
    const value = {
      shard: target.id,
      quantity,
      done: [...next].slice(0, LIMITS.checklistSteps),
    };
    setChecklist(value);
    saved.save(SAVED_KEYS.checklist, value);
  };

  const [pinned, setPinned] = useState<PlanView | null>(null);
  const listId = useId();
  const pickTarget = (text: string) => {
    setTargetText(text);
    const shard = shards.find(
      (s) => s.name.toLowerCase() === text.trim().toLowerCase(),
    );
    if (shard && shard.id !== target?.id) {
      setTarget(shard);
      setQuantity(shardsToMax(shard.rarity));
    }
  };
  const nameOf = (id: string) =>
    shards.find((s) => s.id === id)?.name ?? plan?.shards[id]?.name ?? id;

  return (
    <div className="flex flex-col gap-10">
      <ToolSection number="01" title="What to make">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
            <Field label="Shard to make" hint="Start typing its name.">
              {(props) => (
                <input
                  {...props}
                  list={listId}
                  value={targetText}
                  onChange={(event) => {
                    pickTarget(event.target.value);
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
            <Field label="How many">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={1}
                  max={LIMITS.quantity}
                  value={quantity}
                  onChange={(event) => {
                    const value = Math.floor(Number(event.target.value));
                    if (value >= 1 && value <= LIMITS.quantity)
                      setQuantity(value);
                  }}
                  className={`${fieldClasses} h-11 px-3`}
                />
              )}
            </Field>
          </div>
          {target && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <ShardIcon shard={target} size={32} />
              <span className="font-medium">{target.name}</span>
              <span className="text-muted">Quick amounts:</span>
              {[1, 5, 10].map((level) => {
                const amount = shardsToLevel(target.rarity, level);
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={quantity === amount}
                    className="press border border-ink px-2 py-1 type-label hover:bg-chip aria-pressed:bg-ink aria-pressed:text-paper"
                    onClick={() => {
                      setQuantity(amount);
                    }}
                  >
                    {level === 10
                      ? `Max (${String(amount)})`
                      : `Level ${String(level)} (${String(amount)})`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ToolSection>

      <ToolSection
        number="02"
        title={settings.mode === "coins" ? "Cheapest route" : "Fastest route"}
      >
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
          {status === "ready" && !target && (
            <p className="text-muted">
              Pick a shard to see the quickest way to make it.
            </p>
          )}
          {planError && (
            <p role="alert" className="border-l-2 border-accent pl-3">
              {planError}
            </p>
          )}
          {plan && plan.target === target?.id && (
            <>
              {!Number.isFinite(plan.cost) ? (
                <p
                  className="border-l-2 border-accent pl-3"
                  data-testid="calc-impossible"
                >
                  {plan.mode === "coins"
                    ? `${target.name} can’t be bought or fused from what’s on the Bazaar. Set your own prices below, or count in hours.`
                    : `${target.name} can’t be made with this setup: something it needs can’t be hunted or fused. Check your hunting rates and Kuudra below.`}
                </p>
              ) : (
                <dl
                  className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"
                  data-testid="calc-summary"
                >
                  <div>
                    <dt className="type-label text-muted">
                      {plan.mode === "coins" ? "Cost" : "Time"}
                    </dt>
                    <dd className="type-lead">
                      {formatCost(plan.cost, plan.mode)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-label text-muted">Per shard</dt>
                    <dd className="type-lead">
                      {formatCost(plan.costPerShard, plan.mode)}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-label text-muted">Fusions</dt>
                    <dd className="type-lead">{formatNumber(plan.crafts)}</dd>
                  </div>
                  <div>
                    <dt className="type-label text-muted">You get</dt>
                    <dd className="type-lead">{formatNumber(plan.produced)}</dd>
                  </div>
                  {plan.mode === "coins" &&
                    saleRows(plan, settings.tax).map((row) => (
                      <div key={row.label}>
                        <dt className="type-label text-muted">{row.label}</dt>
                        <dd className="type-lead">{row.value}</dd>
                        <dd className="mt-1 text-sm text-muted">{row.note}</dd>
                      </div>
                    ))}
                </dl>
              )}
              <p className="text-sm text-muted" aria-live="polite">
                {calculating
                  ? "Working it out again…"
                  : "With your setup and rates below; change them and this follows."}
              </p>
              {Number.isFinite(plan.cost) && <Breakdown plan={plan} />}
              {plan.stale.length > 0 && (
                <p className="border-l-2 border-accent pl-3 text-sm">
                  {plan.stale.length === 1
                    ? "A recipe you chose is"
                    : `${String(plan.stale.length)} recipes you chose are`}{" "}
                  no longer in the game’s data, so the cheapest way is used
                  instead.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPinned(plan);
                  }}
                >
                  {pinned ? "Pin this instead" : "Pin to compare"}
                </Button>
              </div>
              {pinned && (
                <Compare
                  pinned={pinned}
                  plan={plan}
                  onUnpin={() => {
                    setPinned(null);
                  }}
                />
              )}
              <Exports plan={plan} />
            </>
          )}
        </div>
      </ToolSection>

      {plan && plan.target === target?.id && Number.isFinite(plan.cost) && (
        <>
          <ToolSection number="03" title="Fusion tree">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                From the top: each fusion and what goes into it. “Change” shows
                the other ways to get a shard and what they’d cost.
              </p>
              <PlanTree
                plan={plan}
                onChange={setChanging}
                onReset={(shard) => {
                  updateChosen(withoutChoice(chosen, shard));
                }}
              />
            </div>
          </ToolSection>

          <ToolSection number="04" title="Checklist">
            <Checklist
              plan={plan}
              done={checklistDone}
              onToggle={toggleStep}
              onClear={() => {
                const value = { shard: target.id, quantity, done: [] };
                setChecklist(value);
                saved.save(SAVED_KEYS.checklist, value);
              }}
            />
          </ToolSection>
        </>
      )}

      <ToolSection number="05" title="Your setup">
        <div id="setup" className="flex flex-col gap-4">
          <Setup
            key={formKey}
            settings={settings}
            shards={shards}
            pricesAt={market.fetchedAt}
            onChange={updateSettings}
          />
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

      {settings.mode === "coins" ? (
        <ToolSection number="06" title="Your prices">
          <Prices
            settings={settings}
            shards={shards}
            market={(id) =>
              buyPrice(id, { ...settings, prices: {} }, market.prices)
            }
            onChange={(prices) => {
              updateSettings({ prices });
            }}
          />
        </ToolSection>
      ) : (
        <ToolSection number="06" title="Your hunting rates">
          <Rates
            settings={settings}
            shards={shards}
            onChange={(rates) => {
              updateSettings({ rates });
            }}
          />
        </ToolSection>
      )}

      <ToolSection number="07" title="Recipes you chose">
        {chosen.length === 0 ? (
          <p className="text-sm text-muted">
            None: every shard is made the cheapest way. Use “Change” in the
            fusion tree to pick another.
          </p>
        ) : (
          <div className="flex flex-col gap-3" data-testid="calc-chosen">
            <ul className="flex flex-col">
              {chosen.map((choice) => (
                <li
                  key={choice.shard}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hair py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{nameOf(choice.shard)}</span>:{" "}
                    {choice.recipe
                      ? `${nameOf(choice.recipe.inputs[0])} + ${nameOf(choice.recipe.inputs[1])} → ${String(choice.recipe.quantity)}`
                      : "hunt it"}
                  </span>
                  <button
                    type="button"
                    className="type-label underline"
                    aria-label={`Cheapest way for ${nameOf(choice.shard)}`}
                    onClick={() => {
                      updateChosen(withoutChoice(chosen, choice.shard));
                    }}
                  >
                    Cheapest way
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button
                type="button"
                className="type-label underline"
                onClick={() => {
                  updateChosen([]);
                }}
              >
                Back to the cheapest for all
              </button>
            </div>
          </div>
        )}
      </ToolSection>

      {changing && (
        <Alternatives
          view={alternatives}
          name={nameOf(changing)}
          mode={settings.mode}
          onPick={(recipe) => {
            pick(changing, recipe);
          }}
          onClose={() => {
            setChanging(null);
          }}
        />
      )}
    </div>
  );
}
