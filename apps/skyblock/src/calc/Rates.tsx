import { LIMITS, type CalcSettings } from "@trilleo/skyblock/calc";
import { Button, Field, fieldClasses } from "@trilleo/ui";
import { useId, useState, type ReactNode } from "react";
import { ShardIcon } from "../ShardBrowser";
import { formatCoins, formatRate } from "./format";
import type { ShardOption } from "./types";

interface OwnValuesProps {
  values: Record<string, number>;
  shards: ShardOption[];
  onChange: (values: Record<string, number>) => void;
  /** The number field's label and hint. */
  label: string;
  hint?: string;
  submit: string;
  max: number;
  maxCount: number;
  /** "Give shards an hour: 0 or more." */
  invalid: string;
  format: (value: number) => string;
  /** What the shard’s value is without one of these (null: none). */
  fallback: (shard: ShardOption) => string | null;
  empty: ReactNode;
  resetAll: string;
  testId: string;
}

/** Own numbers per shard, over the defaults: pick a shard, give a number, reset. */
function OwnValues({
  values,
  shards,
  onChange,
  label,
  hint,
  submit,
  max,
  maxCount,
  invalid,
  format,
  fallback,
  empty,
  resetAll,
  testId,
}: OwnValuesProps) {
  const listId = useId();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const byName = (text: string) =>
    shards.find(
      (shard) => shard.name.toLowerCase() === text.trim().toLowerCase(),
    );
  const own = Object.entries(values)
    .map(([id, value]) => ({
      shard: shards.find((s) => s.id === id),
      id,
      value,
    }))
    .sort((a, b) =>
      (a.shard?.name ?? a.id).localeCompare(b.shard?.name ?? b.id),
    );
  const add = () => {
    const shard = byName(name);
    const value = Number(number);
    if (!shard) {
      setProblem("Pick a shard from the list.");
      return;
    }
    if (
      number.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max
    ) {
      setProblem(invalid);
      return;
    }
    if (!(shard.id in values) && own.length >= maxCount) {
      setProblem(`At most ${String(maxCount)}.`);
      return;
    }
    onChange({ ...values, [shard.id]: value });
    setName("");
    setNumber("");
    setProblem(null);
  };
  const chosen = byName(name);
  const chosenDefault = chosen ? fallback(chosen) : null;
  return (
    <div className="flex flex-col gap-5" data-testid={testId}>
      <form
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-[2fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Field
          label="Shard"
          hint={
            chosen
              ? chosenDefault
                ? `Default: ${chosenDefault}.`
                : "No default."
              : undefined
          }
        >
          {(props) => (
            <input
              {...props}
              list={listId}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              autoComplete="off"
              className={`${fieldClasses} h-11 px-3`}
            />
          )}
        </Field>
        <datalist id={listId}>
          {shards.map((shard) => (
            <option key={shard.id} value={shard.name} />
          ))}
        </datalist>
        <Field label={label} hint={hint}>
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={number}
              onChange={(event) => {
                setNumber(event.target.value);
              }}
              className={`${fieldClasses} h-11 px-3`}
            />
          )}
        </Field>
        <div className="md:pb-6">
          <Button type="submit">{submit}</Button>
        </div>
      </form>
      {problem && (
        <p role="alert" className="border-l-2 border-accent pl-3 text-sm">
          {problem}
        </p>
      )}
      {own.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {own.map(({ shard, id, value }) => {
              const usual = shard ? fallback(shard) : null;
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hair py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {shard && <ShardIcon shard={shard} size={24} />}
                    <span>{shard?.name ?? id}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{format(value)}</span>
                    {usual && (
                      <span className="text-muted">(default {usual})</span>
                    )}
                    <button
                      type="button"
                      className="type-label underline"
                      aria-label={`Reset ${shard?.name ?? id}`}
                      onClick={() => {
                        onChange(
                          Object.fromEntries(
                            Object.entries(values).filter(
                              ([key]) => key !== id,
                            ),
                          ),
                        );
                      }}
                    >
                      Reset
                    </button>
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
                onChange({});
              }}
            >
              {resetAll}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export interface RatesProps {
  settings: CalcSettings;
  shards: ShardOption[];
  onChange: (rates: CalcSettings["rates"]) => void;
}

/**
 * Own hunting rates: the defaults are SkyShards' (hunted well, often in a group); set
 * yours for shards you hunt slower or faster. Shards an hour before fortune.
 */
export function Rates({ settings, shards, onChange }: RatesProps) {
  return (
    <OwnValues
      values={settings.rates}
      shards={shards}
      onChange={onChange}
      label="Shards an hour"
      hint="Before fortune."
      submit="Set rate"
      max={LIMITS.rate}
      maxCount={LIMITS.rates}
      invalid="Give shards an hour: 0 or more."
      format={formatRate}
      fallback={(shard) => formatRate(shard.rate)}
      empty="Using SkyShards’ rates for every shard: hunted well, often in a group. Set your own for shards you hunt slower or faster; 0 means you won’t hunt it."
      resetAll="Reset all rates"
      testId="calc-rates"
    />
  );
}

export interface PricesProps {
  settings: CalcSettings;
  shards: ShardOption[];
  /** The Bazaar's buy price per shard with the current settings (null: none). */
  market: (id: string) => number | null;
  onChange: (prices: CalcSettings["prices"]) => void;
}

/** Own prices in coin mode, over the Bazaar's: what you'd really pay for a shard. */
export function Prices({ settings, shards, market, onChange }: PricesProps) {
  return (
    <OwnValues
      values={settings.prices}
      shards={shards}
      onChange={onChange}
      label="Coins a shard"
      submit="Set price"
      max={LIMITS.coins}
      maxCount={LIMITS.prices}
      invalid="Give a price in coins: 0 or more."
      format={formatCoins}
      fallback={(shard) => {
        const price = market(shard.id);
        return price === null ? null : `${formatCoins(price)} on the Bazaar`;
      }}
      empty="Using the Bazaar’s prices for every shard. Set your own for shards you can get cheaper (or only dearer); 0 means you won’t buy it."
      resetAll="Reset all prices"
      testId="calc-prices"
    />
  );
}
