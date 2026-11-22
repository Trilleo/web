import {
  KUUDRA,
  KUUDRA_TIERS,
  LEVEL_SHARDS,
  BAZAAR_TAXES,
  LIMITS,
  type CalcSettings,
  type KuudraTier,
} from "@trilleo/skyblock/calc";
import { Choice, Field, fieldClasses } from "@trilleo/ui";
import { useId } from "react";
import type { ShardOption } from "./types";

const LEVELS = Array.from({ length: LIMITS.level + 1 }, (_, i) => i);

/** A number field that keeps what's typed until it's a valid number in range. */
function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})}>
      {(props) => (
        <input
          {...props}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          defaultValue={value ?? ""}
          onChange={(event) => {
            const text = event.target.value.trim();
            if (text === "") {
              onChange(null);
              return;
            }
            const number = Number(text);
            if (Number.isFinite(number) && number >= min && number <= max)
              onChange(number);
          }}
          className={`${fieldClasses} h-11 px-3`}
        />
      )}
    </Field>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="mt-1 size-4 cursor-pointer accent-[var(--tr-accent)]"
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer type-label">
          {label}
        </label>
        {hint && (
          <span id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

export interface SetupProps {
  settings: CalcSettings;
  shards: ShardOption[];
  /** When the server last fetched Bazaar prices (ISO); null: none yet. */
  pricesAt: string | null;
  onChange: (change: Partial<CalcSettings>) => void;
}

/** Everything about the player that changes the result. */
export function Setup({ settings, shards, pricesAt, onChange }: SetupProps) {
  const nameOf = (id: string) =>
    shards.find((shard) => shard.id === id)?.name ?? id;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
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
            onChange({ mode });
          }}
        />
        <p className="text-sm text-muted" data-testid="calc-prices-at">
          {pricesAt
            ? `Bazaar prices from ${new Date(pricesAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}, fetched by this site every 5 minutes.`
            : "Bazaar prices haven't loaded yet, so coins can't be counted."}
        </p>
      </div>

      {settings.mode === "coins" && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          data-testid="calc-coin-setup"
        >
          <Toggle
            label="Instant buy"
            hint="Lowest sell offer, not top buy order."
            checked={settings.instantBuy}
            onChange={(instantBuy) => {
              onChange({ instantBuy });
            }}
          />
          <NumberField
            label="Coins per fusion"
            hint="Per fusion. 0 to leave out."
            value={settings.fusionCoins}
            min={0}
            max={LIMITS.coins}
            onChange={(value) => {
              onChange({ fusionCoins: value ?? 0 });
            }}
          />
          <Field label="Bazaar tax">
            {(props) => (
              <select
                {...props}
                value={settings.tax}
                onChange={(event) => {
                  onChange({ tax: Number(event.target.value) });
                }}
                className={`${fieldClasses} h-11 px-2`}
              >
                {BAZAAR_TAXES.map((tax) => (
                  <option key={tax} value={tax}>
                    {`${String(tax)}%`}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberField
          label="Hunting Fortune"
          hint="Before attribute bonuses."
          value={settings.hunterFortune}
          min={0}
          max={LIMITS.hunterFortune}
          onChange={(value) => {
            onChange({ hunterFortune: value ?? 0 });
          }}
        />
        <NumberField
          label="Seconds per fusion"
          hint="Per fusion. 0 to leave out."
          value={settings.fusionSeconds}
          min={0}
          max={LIMITS.fusionSeconds}
          onChange={(value) => {
            onChange({ fusionSeconds: value ?? 0 });
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Toggle
          label="Frog pet"
          hint="+10% to hunting rates."
          checked={settings.frogBonus}
          onChange={(frogBonus) => {
            onChange({ frogBonus });
          }}
        />
        <Toggle
          label="No Chameleon"
          checked={settings.excludeChameleon}
          onChange={(excludeChameleon) => {
            onChange({ excludeChameleon });
          }}
        />
        <Toggle
          label="No wooden bait"
          hint="5% rate (Shinyfish 10%)."
          checked={settings.noWoodenBait}
          onChange={(noWoodenBait) => {
            onChange({ noWoodenBait });
          }}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 type-label">Attribute levels</legend>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {LEVEL_SHARDS.map((shard) => (
            <Field key={shard.key} label={nameOf(shard.id)} hint={shard.effect}>
              {(props) => (
                <select
                  {...props}
                  value={settings.levels[shard.key]}
                  onChange={(event) => {
                    onChange({
                      levels: {
                        ...settings.levels,
                        [shard.key]: Number(event.target.value),
                      },
                    });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level === 0 ? "None" : `Level ${String(level)}`}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 type-label">Kuudra (Kraken shards)</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Tier">
            {(props) => (
              <select
                {...props}
                value={settings.kuudraTier}
                onChange={(event) => {
                  onChange({
                    kuudraTier: event.target.value as KuudraTier | "none",
                  });
                }}
                className={`${fieldClasses} h-11 px-2`}
              >
                <option value="none">I don’t run Kuudra</option>
                {KUUDRA_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {`Tier ${tier.slice(1)} (key ${KUUDRA[tier].keyCost.toLocaleString("en")})`}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <NumberField
            label="Seconds per run"
            hint="Empty: the tier’s default."
            value={settings.kuudraSeconds}
            min={1}
            max={LIMITS.kuudraSeconds}
            placeholder={
              settings.kuudraTier === "none"
                ? ""
                : String(KUUDRA[settings.kuudraTier].seconds)
            }
            onChange={(kuudraSeconds) => {
              onChange({ kuudraSeconds });
            }}
          />
          <NumberField
            label="Coins an hour"
            hint="Empty: keys are free."
            value={settings.coinsPerHour}
            min={0}
            max={LIMITS.coinsPerHour}
            onChange={(coinsPerHour) => {
              onChange({ coinsPerHour });
            }}
          />
        </div>
      </fieldset>
    </div>
  );
}
