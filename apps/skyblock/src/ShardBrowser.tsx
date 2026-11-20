import {
  RARITIES,
  RARITY_CODES,
  RARITY_LABELS,
  filterOptions,
  searchShards,
  type Rarity,
  type ShardFilters,
  type ShardSummary,
} from "@trilleo/skyblock";
import { Button, Field, ToolSection, fieldClasses } from "@trilleo/ui";
import { useEffect, useMemo, useState } from "react";
import { shardPath } from "./meta";

/** Shards shown at first, and added by "Show more". */
export const PAGE_SIZE = 60;

export interface ShardBrowserProps {
  shards: ShardSummary[];
  /** The search the page was opened with (?q=). */
  initialQuery?: string;
}

/** A shard's icon, or its rarity's letter on the game's panel when there's none. */
export function ShardIcon({
  shard,
  size = 48,
}: {
  shard: Pick<ShardSummary, "icon" | "rarity">;
  size?: number;
}) {
  return shard.icon ? (
    <img
      src={shard.icon}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`mc-text mc-c-${RARITY_CODES[shard.rarity]} inline-grid shrink-0 place-items-center`}
      style={{ width: size, height: size }}
    >
      {RARITY_LABELS[shard.rarity][0]}
    </span>
  );
}

/** The rarity as the game shows it: its colour on the dark panel. */
export function RarityTag({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`mc-text mc-c-${RARITY_CODES[rarity]}`}>
      {RARITY_LABELS[rarity]}
    </span>
  );
}

const NO_FILTERS: Required<ShardFilters> = {
  query: "",
  rarity: "",
  category: "",
  family: "",
  skill: "",
};

/** Search and filter every shard; each card opens its page. */
export function ShardBrowser({ shards, initialQuery = "" }: ShardBrowserProps) {
  const [filters, setFilters] = useState<Required<ShardFilters>>({
    ...NO_FILTERS,
    query: initialQuery,
  });
  const [shown, setShown] = useState(PAGE_SIZE);
  const options = useMemo(() => filterOptions(shards), [shards]);
  const results = useMemo(
    () => searchShards(shards, filters),
    [shards, filters],
  );
  const update = (change: Partial<ShardFilters>) => {
    setFilters((current) => ({ ...current, ...change }));
    setShown(PAGE_SIZE);
  };

  // Keep the search in the address, so it survives a reload and can be shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filters.query) url.searchParams.set("q", filters.query);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [filters.query]);

  const filtered =
    filters.query !== "" ||
    filters.rarity !== "" ||
    filters.category !== "" ||
    filters.family !== "" ||
    filters.skill !== "";

  return (
    <div className="flex flex-col gap-10">
      <ToolSection number="01" title="Find a shard">
        <div className="flex flex-col gap-5">
          <Field
            label="Name, attribute or effect"
            hint="Searches names first, then attributes, what they do and where to hunt."
          >
            {(props) => (
              <input
                {...props}
                type="search"
                value={filters.query}
                onChange={(event) => {
                  update({ query: event.target.value });
                }}
                placeholder="e.g. Tiamat, Pure Reptile, health, Kiara"
                className={`${fieldClasses} h-11 px-3`}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Rarity">
              {(props) => (
                <select
                  {...props}
                  value={filters.rarity}
                  onChange={(event) => {
                    update({ rarity: event.target.value as Rarity | "" });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {RARITY_LABELS[rarity]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {(
              [
                ["Category", "category", options.categories],
                ["Family", "family", options.families],
                ["Skill", "skill", options.skills],
              ] as const
            ).map(([label, key, values]) => (
              <Field key={key} label={label}>
                {(props) => (
                  <select
                    {...props}
                    value={filters[key]}
                    onChange={(event) => {
                      update({ [key]: event.target.value });
                    }}
                    className={`${fieldClasses} h-11 px-2`}
                  >
                    <option value="">Any</option>
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <p
              className="text-sm text-muted"
              aria-live="polite"
              data-testid="shard-count"
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
                  setFilters(NO_FILTERS);
                  setShown(PAGE_SIZE);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </ToolSection>

      <ToolSection number="02" title={filtered ? "Matches" : "All shards"}>
        {results.length === 0 ? (
          <p className="text-muted">
            No shard matches. Try fewer words or filters.
          </p>
        ) : (
          <>
            <ul
              className="grid grid-cols-1 gap-px border border-hair bg-hair md:grid-cols-2 xl:grid-cols-3"
              data-testid="shard-list"
            >
              {results.slice(0, shown).map((shard) => (
                <li
                  key={shard.key}
                  className="relative flex gap-4 bg-paper p-4 hover:bg-chip"
                >
                  <ShardIcon shard={shard} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="type-row font-medium">
                      {/* The link stretches over the card, so the whole card opens it. */}
                      <a
                        href={shardPath(shard.slug)}
                        className="after:absolute after:inset-0 after:content-['']"
                      >
                        {shard.name}
                      </a>
                    </h3>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <RarityTag rarity={shard.rarity} />
                      <span className="text-muted">
                        {[shard.category, ...shard.families]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                    {shard.attribute && (
                      <p className="text-sm">
                        <span className="font-medium">{shard.attribute}</span>
                        {shard.text && (
                          <span className="text-muted">: {shard.text}</span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {results.length > shown && (
              <div className="mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShown((n) => n + PAGE_SIZE);
                  }}
                >
                  Show more ({results.length - shown} left)
                </Button>
              </div>
            )}
          </>
        )}
      </ToolSection>
    </div>
  );
}
