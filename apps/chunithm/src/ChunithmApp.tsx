import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  formatConstant,
  parseConstant,
  type Difficulty,
  type SongIndex,
  type SongIndexEntry,
} from "@trilleo/chunithm";
import {
  useToolItems,
  useToolStorage,
  type StoredItem,
} from "@trilleo/tool-kit";
import { Button, Field, ToolSection, fieldClasses } from "@trilleo/ui";
import { useEffect, useMemo, useState } from "react";
import { chartHref, fetchIndex } from "./api";
import {
  NO_FILTERS,
  browse,
  genres,
  newest,
  searchable,
  type Filters,
  type Listed,
} from "./browse";
import { chartOfKey, meta, type SavedChart } from "./meta";

/** Rows shown at first, and added by "Show more". */
export const PAGE_SIZE = 50;

const SHORT: Record<Difficulty, string> = {
  basic: "BAS",
  advanced: "ADV",
  expert: "EXP",
  master: "MAS",
  ultima: "ULT",
  worldsend: "WE",
};

const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1).flatMap((n) =>
  n >= 7 ? [n, n + 0.5] : [n],
);
const levelLabel = (n: number) => `${String(Math.floor(n))}${n % 1 ? "+" : ""}`;

export interface ChunithmAppProps {
  signedIn: boolean;
  signInHref: string;
  initialSaved?: StoredItem<SavedChart>[];
  /** The search the page was opened with (?q=). */
  initialQuery?: string;
}

/** Search, filters, favourites, recent charts and what's new. */
export function ChunithmApp({
  signedIn,
  signInHref,
  initialSaved,
  initialQuery = "",
}: ChunithmAppProps) {
  const [index, setIndex] = useState<SongIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    ...NO_FILTERS,
    query: initialQuery,
  });
  const [shown, setShown] = useState(PAGE_SIZE);
  const storage = useToolStorage<SavedChart>(meta.slug, signedIn);
  const saved = useToolItems(storage, initialSaved);

  useEffect(() => {
    const controller = new AbortController();
    fetchIndex(controller.signal).then(setIndex, (failure: unknown) => {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "The catalog didn't load.",
        );
    });
    return () => {
      controller.abort();
    };
  }, []);

  // Keep the search in the address, so it can be shared and survives going back.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filters.query) url.searchParams.set("q", filters.query);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [filters.query]);

  const songs = useMemo(() => (index ? searchable(index) : []), [index]);
  const byId = useMemo(
    () => new Map(index?.songs.map((song) => [song.id, song]) ?? []),
    [index],
  );
  const results = useMemo(() => browse(songs, filters), [songs, filters]);
  const update = (change: Partial<Filters>) => {
    setFilters((now) => ({ ...now, ...change }));
    setShown(PAGE_SIZE);
  };
  const browsing =
    !filters.query &&
    filters.difficulty === "any" &&
    filters.levelMin === null &&
    filters.levelMax === null &&
    filters.constantMin === null &&
    filters.constantMax === null &&
    !filters.genre &&
    !filters.version;

  const savedCharts = (kind: SavedChart["kind"]) =>
    saved.items
      .flatMap((item) => {
        const chart = chartOfKey(item.key);
        const song = chart ? byId.get(chart.songId) : undefined;
        return chart?.kind === kind && song
          ? [{ song, difficulty: chart.difficulty, at: item.updatedAt }]
          : [];
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  const favourites = savedCharts("favourite");
  const recent = savedCharts("recent").slice(0, 12);

  return (
    <div className="flex flex-col gap-10">
      <ToolSection number="01" title="Find a chart">
        <div className="flex flex-col gap-5">
          <Field
            label="Title, artist or alias"
            hint="English, Japanese (kana or romaji) or Chinese."
          >
            {(props) => (
              <input
                {...props}
                type="search"
                value={filters.query}
                onChange={(event) => {
                  update({ query: event.target.value });
                }}
                placeholder="e.g. Oracle, こんくえすと, konkuesuto"
                className={`${fieldClasses} h-11 px-3`}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Difficulty">
              {(props) => (
                <select
                  {...props}
                  value={filters.difficulty}
                  onChange={(event) => {
                    update({
                      difficulty: event.target.value as Filters["difficulty"],
                    });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="any">Any</option>
                  {DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {DIFFICULTY_LABELS[difficulty]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Level from">
              {(props) => (
                <select
                  {...props}
                  value={filters.levelMin ?? ""}
                  onChange={(event) => {
                    update({
                      levelMin: event.target.value
                        ? Number(event.target.value)
                        : null,
                    });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {LEVELS.map((n) => (
                    <option key={n} value={n}>
                      {levelLabel(n)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Level to">
              {(props) => (
                <select
                  {...props}
                  value={filters.levelMax ?? ""}
                  onChange={(event) => {
                    update({
                      levelMax: event.target.value
                        ? Number(event.target.value)
                        : null,
                    });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {LEVELS.map((n) => (
                    <option key={n} value={n}>
                      {levelLabel(n)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Sort">
              {(props) => (
                <select
                  {...props}
                  value={filters.sort}
                  onChange={(event) => {
                    update({ sort: event.target.value as Filters["sort"] });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="relevance">Best match</option>
                  <option value="title">Title</option>
                  <option value="newest">Newest</option>
                  <option value="constant">Constant, highest first</option>
                </select>
              )}
            </Field>
            <Field label="Constant from" hint="e.g. 14.5">
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  defaultValue=""
                  onChange={(event) => {
                    update({ constantMin: parseConstant(event.target.value) });
                  }}
                  className={`${fieldClasses} h-11 px-3`}
                />
              )}
            </Field>
            <Field label="Constant to">
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  defaultValue=""
                  onChange={(event) => {
                    update({ constantMax: parseConstant(event.target.value) });
                  }}
                  className={`${fieldClasses} h-11 px-3`}
                />
              )}
            </Field>
            <Field label="Genre">
              {(props) => (
                <select
                  {...props}
                  value={filters.genre}
                  onChange={(event) => {
                    update({ genre: event.target.value });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {(index ? genres(index) : []).map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Version">
              {(props) => (
                <select
                  {...props}
                  value={filters.version}
                  onChange={(event) => {
                    update({ version: event.target.value });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="">Any</option>
                  {[...(index?.versions ?? [])].reverse().map((version) => (
                    <option key={version.slug} value={version.slug}>
                      {version.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Songs">
              {(props) => (
                <select
                  {...props}
                  value={filters.status}
                  onChange={(event) => {
                    update({ status: event.target.value as Filters["status"] });
                  }}
                  className={`${fieldClasses} h-11 px-2`}
                >
                  <option value="in-game">In the game</option>
                  <option value="removed">Removed from the game</option>
                  <option value="all">All</option>
                </select>
              )}
            </Field>
          </div>
        </div>
      </ToolSection>

      {error && (
        <p role="alert" className="border-l-2 border-accent pl-4">
          {error}
        </p>
      )}
      {!index && !error && (
        <p role="status" className="text-muted">
          Loading the catalog…
        </p>
      )}

      {index && browsing && favourites.length > 0 && (
        <ToolSection number="02" title="Favourites">
          <ChartLinks charts={favourites} />
        </ToolSection>
      )}
      {index && browsing && recent.length > 0 && (
        <ToolSection number="03" title="Recently viewed">
          <ChartLinks charts={recent} />
          {!signedIn && (
            <p className="mt-3 text-sm text-muted">
              Kept in this browser.{" "}
              <a href={signInHref} className="underline">
                Sign in
              </a>{" "}
              to keep favourites and recent charts in your account.
            </p>
          )}
        </ToolSection>
      )}
      {index && browsing && (
        <ToolSection
          number="04"
          title={`New in ${index.versions.at(-1)?.name ?? "this version"}`}
        >
          <SongList
            items={newest(index).map((song) => ({ song, charts: song.charts }))}
          />
        </ToolSection>
      )}

      {index && (
        <ToolSection number={browsing ? "05" : "02"} title="Charts">
          <p
            className="mb-3 type-label text-muted"
            role="status"
            data-testid="chunithm-count"
          >
            {results.length} {results.length === 1 ? "song" : "songs"}
          </p>
          <SongList items={results.slice(0, shown)} />
          {results.length > shown && (
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShown((n) => n + PAGE_SIZE);
                }}
              >
                Show more
              </Button>
            </div>
          )}
        </ToolSection>
      )}
    </div>
  );
}

function ChartLinks({
  charts,
}: {
  charts: { song: SongIndexEntry; difficulty: Difficulty }[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {charts.map(({ song, difficulty }) => (
        <li key={`${String(song.id)}-${difficulty}`}>
          <a
            href={chartHref(song.id, difficulty)}
            className="inline-flex items-center gap-2 border border-ink px-3 py-2 hover:bg-chip"
          >
            <span className="type-label">{SHORT[difficulty]}</span>
            <span lang="ja">{song.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function SongList({ items }: { items: Listed[] }) {
  if (items.length === 0)
    return <p className="text-muted">No songs fit those filters.</p>;
  return (
    <ul className="flex flex-col" data-testid="chunithm-results">
      {items.map(({ song, charts }) => (
        <li
          key={song.id}
          className="grid grid-cols-[3rem_1fr] items-center gap-x-4 gap-y-2 border-b border-hair py-3 md:grid-cols-[3rem_1fr_auto]"
        >
          {song.jacket ? (
            <img
              src={song.jacket}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              className="size-12 border border-hair object-cover"
            />
          ) : (
            <span aria-hidden="true" className="size-12 border border-hair" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium" lang="ja">
              {song.title}
            </p>
            <p className="truncate text-sm text-muted" lang="ja">
              {song.artist}
              {!song.inGame && " · removed from the game"}
            </p>
          </div>
          <ul className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1 md:justify-end">
            {charts.map((chart) => {
              const text = `${SHORT[chart.difficulty]} ${chart.level}${chart.worldsEndStars ? ` ${"☆".repeat(chart.worldsEndStars)}` : ""}`;
              const title = `${DIFFICULTY_LABELS[chart.difficulty]} ${chart.level}${chart.constant !== null ? ` (${formatConstant(chart.constant)})` : ""}`;
              return (
                <li key={chart.difficulty}>
                  {chart.viewable ? (
                    <a
                      href={chartHref(song.id, chart.difficulty)}
                      title={title}
                      aria-label={`${song.title}, ${title}`}
                      className="inline-block border border-ink px-2 py-1 type-label hover:bg-ink hover:text-paper"
                    >
                      {text}
                    </a>
                  ) : (
                    <span
                      title={`${title}: no picture`}
                      className="inline-block border border-hair px-2 py-1 type-label text-muted"
                    >
                      {text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
