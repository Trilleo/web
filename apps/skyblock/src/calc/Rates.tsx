import { LIMITS, type CalcSettings } from "@trilleo/skyblock/calc";
import { Button, Field, fieldClasses } from "@trilleo/ui";
import { useId, useState } from "react";
import { ShardIcon } from "../ShardBrowser";
import { formatRate } from "./format";
import type { ShardOption } from "./types";

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
  const listId = useId();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const byName = (text: string) =>
    shards.find(
      (shard) => shard.name.toLowerCase() === text.trim().toLowerCase(),
    );
  const own = Object.entries(settings.rates)
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
    const value = Number(rate);
    if (!shard) {
      setProblem("Pick a shard from the list.");
      return;
    }
    if (
      rate.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > LIMITS.rate
    ) {
      setProblem("Give shards an hour: 0 or more.");
      return;
    }
    if (!(shard.id in settings.rates) && own.length >= LIMITS.rates) {
      setProblem(`At most ${String(LIMITS.rates)} own rates.`);
      return;
    }
    onChange({ ...settings.rates, [shard.id]: value });
    setName("");
    setRate("");
    setProblem(null);
  };
  const chosen = byName(name);
  return (
    <div className="flex flex-col gap-5" data-testid="calc-rates">
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
              ? `Default: ${formatRate(chosen.rate)}.`
              : "Start typing its name."
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
        <Field label="Shards an hour" hint="Before fortune.">
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={rate}
              onChange={(event) => {
                setRate(event.target.value);
              }}
              className={`${fieldClasses} h-11 px-3`}
            />
          )}
        </Field>
        <div className="md:pb-6">
          <Button type="submit">Set rate</Button>
        </div>
      </form>
      {problem && (
        <p role="alert" className="border-l-2 border-accent pl-3 text-sm">
          {problem}
        </p>
      )}
      {own.length === 0 ? (
        <p className="text-sm text-muted">
          Using SkyShards’ rates for every shard: hunted well, often in a group.
          Set your own for shards you hunt slower or faster; 0 means you won’t
          hunt it.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {own.map(({ shard, id, value }) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-hair py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  {shard && <ShardIcon shard={shard} size={24} />}
                  <span>{shard?.name ?? id}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{formatRate(value)}</span>
                  {shard && (
                    <span className="text-muted">
                      (default {formatRate(shard.rate)})
                    </span>
                  )}
                  <button
                    type="button"
                    className="type-label underline"
                    aria-label={`Reset ${shard?.name ?? id}`}
                    onClick={() => {
                      onChange(
                        Object.fromEntries(
                          Object.entries(settings.rates).filter(
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
            ))}
          </ul>
          <div>
            <button
              type="button"
              className="type-label underline"
              onClick={() => {
                onChange({});
              }}
            >
              Reset all rates
            </button>
          </div>
        </>
      )}
    </div>
  );
}
