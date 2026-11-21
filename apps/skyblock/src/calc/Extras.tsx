import { CopyButton } from "@trilleo/ui";
import {
  MOD_FORMATS,
  MOD_LABELS,
  type ModFormat,
} from "@trilleo/skyblock/calc";
import { useEffect, useState } from "react";
import type { PlanView } from "./engine";
import { formatCost, formatNumber, gzipBase64 } from "./format";
import { ShardName } from "./PlanTree";

/** Shards shown in the breakdown before the rest are summed as "Other". */
const BREAKDOWN_SHOWN = 5;
/** Ink strengths for the bar's hunting parts (the accent is fusing). */
const SHADES = ["bg-ink", "bg-ink/70", "bg-ink/50", "bg-ink/35", "bg-ink/20"];

/** Where the time (or coins) goes: the dearest shards to get, then fusing. */
export function Breakdown({ plan }: { plan: PlanView }) {
  if (!(plan.cost > 0) || !Number.isFinite(plan.cost)) return null;
  const top = plan.hunt.slice(0, BREAKDOWN_SHOWN);
  const rest = plan.hunt
    .slice(BREAKDOWN_SHOWN)
    .reduce((sum, item) => sum + item.cost, 0);
  const parts = [
    ...top.map((item, i) => ({
      key: item.shard,
      label: plan.shards[item.shard]?.name ?? item.shard,
      cost: item.cost,
      shade: SHADES[i] ?? "bg-ink/20",
    })),
    ...(rest > 0
      ? [{ key: "other", label: "Other shards", cost: rest, shade: "bg-chip" }]
      : []),
    ...(plan.fusionCost > 0
      ? [
          {
            key: "fusing",
            label: "Fusing",
            cost: plan.fusionCost,
            shade: "bg-accent",
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-3" data-testid="calc-breakdown">
      <div
        className="flex h-4 w-full overflow-hidden border border-ink"
        aria-hidden="true"
      >
        {parts.map((part) => (
          <div
            key={part.key}
            className={part.shade}
            style={{ width: `${String((part.cost / plan.cost) * 100)}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-2">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 border border-ink ${part.shade}`}
            />
            <span className="min-w-0 flex-1">{part.label}</span>
            <span className="text-muted tabular-nums">
              {formatCost(part.cost, plan.mode)} ·{" "}
              {formatNumber((part.cost / plan.cost) * 100, 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ChecklistProps {
  /** A plan, or the planner's (anything with what to hunt and the fusions). */
  plan: Pick<PlanView, "hunt" | "steps" | "shards" | "mode">;
  testId?: string;
  done: ReadonlySet<string>;
  onToggle: (id: string, done: boolean) => void;
  onClear: () => void;
}

const huntId = (shard: string) => `hunt:${shard}`;

/** The plan as things to do, in order, ticked off as they're done (and kept). */
export function Checklist({
  plan,
  done,
  onToggle,
  onClear,
  testId = "calc-checklist",
}: ChecklistProps) {
  const items = [
    ...plan.hunt.map((item) => ({
      id: huntId(item.shard),
      content: (
        <>
          <span className="type-label text-muted">
            {plan.mode === "coins" ? "Buy" : "Hunt"}
          </span>{" "}
          <ShardName shard={plan.shards[item.shard]} quantity={item.quantity} />
        </>
      ),
    })),
    ...plan.steps.map((step) => ({
      id: step.id,
      content:
        step.kind === "fuse" ? (
          <>
            <span className="type-label text-muted">
              Fuse {formatNumber(step.crafts)}×
            </span>{" "}
            {plan.shards[step.recipe.a]?.name} +{" "}
            {plan.shards[step.recipe.b]?.name} →{" "}
            <ShardName
              shard={plan.shards[step.output]}
              quantity={step.quantity}
            />
          </>
        ) : (
          <>
            <span className="type-label text-muted">
              Loop {formatNumber(step.crafts)} fusions
            </span>{" "}
            for{" "}
            <ShardName
              shard={plan.shards[step.output]}
              quantity={step.quantity}
            />
          </>
        ),
    })),
  ];
  const count = items.filter((item) => done.has(item.id)).length;
  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted" aria-live="polite">
          {count} of {items.length} done
        </p>
        {count > 0 && (
          <button
            type="button"
            className="type-label underline"
            onClick={onClear}
          >
            Start over
          </button>
        )}
      </div>
      <ol className="flex flex-col">
        {items.map((item) => {
          const checked = done.has(item.id);
          return (
            <li key={item.id} className="border-b border-hair py-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    onToggle(item.id, event.target.checked);
                  }}
                  className="mt-1.5 size-4 shrink-0 accent-[var(--tr-accent)]"
                />
                <span
                  className={`flex flex-wrap items-center gap-x-1 ${checked ? "text-muted line-through" : ""}`}
                >
                  {item.content}
                </span>
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Pinned against now: totals, then shards whose hunting changed. */
export function Compare({
  pinned,
  plan,
  onUnpin,
}: {
  pinned: PlanView;
  plan: PlanView;
  onUnpin: () => void;
}) {
  const rows: [string, string, string][] = [
    [
      plan.mode === "coins" ? "Cost" : "Time",
      formatCost(pinned.cost, pinned.mode),
      formatCost(plan.cost, plan.mode),
    ],
    [
      "Per shard",
      formatCost(pinned.costPerShard, pinned.mode),
      formatCost(plan.costPerShard, plan.mode),
    ],
    ["Fusions", formatNumber(pinned.crafts), formatNumber(plan.crafts)],
    [
      "Shards to hunt",
      formatNumber(pinned.hunt.length),
      formatNumber(plan.hunt.length),
    ],
  ];
  const ids = new Set([
    ...pinned.hunt.map((h) => h.shard),
    ...plan.hunt.map((h) => h.shard),
  ]);
  const changed = [...ids].flatMap((id) => {
    const before = pinned.hunt.find((h) => h.shard === id)?.quantity ?? 0;
    const after = plan.hunt.find((h) => h.shard === id)?.quantity ?? 0;
    return before === after ? [] : [{ id, before, after }];
  });
  const name = (id: string) =>
    plan.shards[id]?.name ?? pinned.shards[id]?.name ?? id;
  const sameTarget = pinned.target === plan.target;
  return (
    <div className="flex flex-col gap-4" data-testid="calc-compare">
      {!sameTarget && (
        <p className="text-sm text-muted">
          The pinned route is for {formatNumber(pinned.quantity)}{" "}
          {name(pinned.target)}.
        </p>
      )}
      <div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-ink py-2 pr-4 type-label font-normal text-muted"
              >
                <span className="sr-only">Measure</span>
              </th>
              <th
                scope="col"
                className="border-b border-ink py-2 pr-4 type-label font-normal text-muted"
              >
                Pinned
              </th>
              <th
                scope="col"
                className="border-b border-ink py-2 pr-4 type-label font-normal text-muted"
              >
                Now
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, after]) => (
              <tr key={label}>
                <th
                  scope="row"
                  className="border-b border-hair py-2 pr-4 font-normal"
                >
                  {label}
                </th>
                <td className="border-b border-hair py-2 pr-4 tabular-nums">
                  {before}
                </td>
                <td
                  className={`border-b border-hair py-2 pr-4 tabular-nums ${before !== after ? "font-medium" : ""}`}
                >
                  {after}
                </td>
              </tr>
            ))}
            {changed.map((row) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  className="border-b border-hair py-2 pr-4 font-normal"
                >
                  {plan.mode === "coins" ? "Buy" : "Hunt"} {name(row.id)}
                </th>
                <td className="border-b border-hair py-2 pr-4 tabular-nums">
                  {formatNumber(row.before)}
                </td>
                <td className="border-b border-hair py-2 pr-4 font-medium tabular-nums">
                  {formatNumber(row.after)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button
          type="button"
          className="type-label underline"
          onClick={onUnpin}
        >
          Unpin
        </button>
      </div>
    </div>
  );
}

/** Copy the plan: plain text, or for the SkyOcean, NoFrills and SkyHanni mods. */
export function Exports({ plan }: { plan: PlanView }) {
  // Kept with the plan they were made from, so a new plan shows none until its own
  // are ready.
  const [made, setMade] = useState<{
    plan: PlanView;
    values: Partial<Record<ModFormat, string>>;
  } | null>(null);
  const encoded = made?.plan === plan ? made.values : {};
  const offered = MOD_FORMATS.filter((format) => plan.mods[format]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      MOD_FORMATS.filter((format) => plan.mods[format]).map(async (format) => {
        const { prefix, json } = plan.mods[format] ?? { prefix: "", json: "" };
        return [format, await gzipBase64(prefix, json)] as const;
      }),
    ).then(
      (pairs) => {
        if (!cancelled) setMade({ plan, values: Object.fromEntries(pairs) });
      },
      () => {
        // A browser without CompressionStream: the mod buttons stay off.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [plan]);
  return (
    <div className="flex flex-col gap-3" data-testid="calc-exports">
      <div className="flex flex-wrap items-center gap-3">
        <span className="type-label">Plain text</span>
        <CopyButton value={plan.text} label="Copy the plan as text" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {offered.map((format) => (
          <div key={format} className="flex items-center gap-3">
            <span className="type-label">{MOD_LABELS[format]}</span>
            {encoded[format] ? (
              <CopyButton
                value={encoded[format]}
                label={`Copy the plan for ${MOD_LABELS[format]}`}
              />
            ) : (
              <span className="text-sm text-muted">…</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Paste the mod strings into SkyOcean, NoFrills or SkyHanni’s shard
        tracker. SkyHanni gets only what to hunt.
        {offered.length < MOD_FORMATS.length &&
          " SkyOcean can’t show shards you already have, so it’s left out while the plan uses your collection."}
      </p>
    </div>
  );
}
