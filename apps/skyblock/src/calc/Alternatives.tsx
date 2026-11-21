import { useEffect, useRef } from "react";
import type { AlternativesView, RecipeView } from "./engine";
import { formatCost, formatNumber } from "./format";

export interface AlternativesProps {
  /** null while loading. */
  view: AlternativesView | null;
  name: string;
  /** "time" or "coins": how costs read. */
  mode: "time" | "coins";
  onPick: (recipe: RecipeView | null) => void;
  onClose: () => void;
}

/**
 * The other ways to get a shard, cheapest first, in a modal <dialog> (Escape and the
 * close button close it; focus returns to where it was).
 */
export function Alternatives({
  view,
  name,
  mode,
  onPick,
  onClose,
}: AlternativesProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
    };
  }, []);
  const best = view?.options.find((option) =>
    Number.isFinite(option.costPerShard),
  );
  return (
    <dialog
      ref={dialog}
      aria-labelledby="alternatives-title"
      onClose={onClose}
      className="m-auto max-h-[80vh] w-[min(40rem,calc(100vw-2rem))] border border-ink bg-paper p-0 text-ink backdrop:bg-ink/40"
      data-testid="calc-alternatives"
    >
      <div className="flex items-start justify-between gap-4 border-b border-hair p-4">
        <div>
          <h2 id="alternatives-title" className="type-row font-medium">
            Ways to get {name}
          </h2>
          <p className="text-sm text-muted">
            {mode === "coins" ? "Coins" : "Time"} per shard with your setup.
            Picking one keeps it until you go back to the cheapest.
          </p>
        </div>
        <button
          type="button"
          className="press border border-ink px-3 py-1.5 type-label hover:bg-chip"
          onClick={() => dialog.current?.close()}
        >
          Close
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-4">
        {!view ? (
          <p className="text-muted">Working them out…</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {view.options.map((option, i) => {
                const recipe = option.recipe;
                const a = recipe ? view.shards[recipe.a] : undefined;
                const b = recipe ? view.shards[recipe.b] : undefined;
                const label = recipe
                  ? `${String(a?.fuse ?? 1)} ${a?.name ?? "?"} + ${String(b?.fuse ?? 1)} ${b?.name ?? "?"} → ${String(recipe.quantity)}${recipe.reptile ? " (reptile)" : ""}`
                  : mode === "coins"
                    ? "Buy it"
                    : "Hunt it";
                const slower =
                  best &&
                  option !== best &&
                  Number.isFinite(option.costPerShard)
                    ? (option.costPerShard / best.costPerShard - 1) * 100
                    : null;
                const extra =
                  slower === null
                    ? ""
                    : slower < 0.5
                      ? " · about the same"
                      : ` · ${formatNumber(slower, 0)}% slower`;
                return (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hair py-2 text-sm"
                  >
                    <span className="min-w-0">
                      {label}
                      <span className="block text-muted">
                        {Number.isFinite(option.costPerShard)
                          ? `${formatCost(option.costPerShard, mode)} a shard${extra}`
                          : "can’t be done"}
                      </span>
                    </span>
                    {option.current ? (
                      <span className="type-label text-muted">In use</span>
                    ) : (
                      <button
                        type="button"
                        disabled={!Number.isFinite(option.costPerShard)}
                        className="press border border-ink px-3 py-1.5 type-label hover:bg-chip disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Use ${label}`}
                        onClick={() => {
                          onPick(recipe);
                          dialog.current?.close();
                        }}
                      >
                        Use
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {view.total >
              view.options.filter((option) => option.recipe).length && (
              <p className="mt-3 text-sm text-muted">
                The cheapest{" "}
                {view.options.filter((option) => option.recipe).length} of{" "}
                {formatNumber(view.total)} recipes.
              </p>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
