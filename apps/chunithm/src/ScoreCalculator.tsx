import {
  LOSS,
  RANKS,
  allowance,
  formatConstant,
  formatRating,
  formatScore,
  justiceLeft,
  lossBudget,
  maxRating,
  parseRating,
  rankOf,
  ratingOf,
  scoreForRating,
  scoreOf,
  type Rank,
} from "@trilleo/chunithm";
import { Field, fieldClasses } from "@trilleo/ui";
import { useState, type ReactNode } from "react";

export interface ScoreCalculatorProps {
  /** The chart's note count, when known; people can type another. */
  notes: number | null;
  /** The chart's constant in tenths; without one there's no rating. */
  constant: number | null;
}

/** The ranks the table and the budget offer: SSS+ down to A. */
export const TABLE_RANKS = RANKS.slice(
  0,
  RANKS.findIndex((r) => r.name === "A") + 1,
);

const inputClasses = `${fieldClasses} h-11 px-3`;

/** A count typed in a field: blank is 0, anything else must be a whole number. */
function readCount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  if (!/^\d{1,6}$/.test(trimmed)) return null;
  return Number(trimmed);
}

function minOf(rank: Rank): number {
  return RANKS.find((r) => r.name === rank)?.min ?? 0;
}

/**
 * The score calculator under a chart: what each rank allows (Justice, Attack, Miss),
 * the score of a play, the Justice left once some Attacks and Misses are spent, and the
 * score a rating needs. Everything is worked out in the browser from the note count
 * (and the constant); nothing is kept. The table renders on the server too.
 */
export function ScoreCalculator({ notes, constant }: ScoreCalculatorProps) {
  const [notesText, setNotesText] = useState(
    notes === null ? "" : String(notes),
  );
  const typed = readCount(notesText);
  const count = typed !== null && typed > 0 ? typed : null;

  return (
    <div className="flex flex-col gap-8" data-testid="score-calculator">
      <div className="flex flex-col gap-3">
        <div className="max-w-60">
          <Field
            label="Notes"
            hint={
              notes === null
                ? "This chart’s note count isn’t known: type it in."
                : "The chart’s note count. Change it to try another."
            }
          >
            {(props) => (
              <input
                {...props}
                inputMode="numeric"
                value={notesText}
                onChange={(event) => {
                  setNotesText(event.target.value);
                }}
                className={inputClasses}
              />
            )}
          </Field>
        </div>
        <p className="text-sm text-muted">
          A Justice costs {LOSS.justice / 100} of a note’s share; an Attack{" "}
          {LOSS.attack / 100} (as much as {LOSS.attack} Justice), a Miss{" "}
          {LOSS.miss / 100} ({LOSS.miss} Justice).
        </p>
      </div>
      {count === null ? (
        <p className="border border-hair p-4 text-muted" role="status">
          Type the chart’s note count to work out scores.
        </p>
      ) : (
        <>
          <RankTable notes={count} constant={constant} />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <PlayPanel notes={count} constant={constant} />
            <BudgetPanel notes={count} />
            <RatingPanel notes={count} constant={constant} />
          </div>
        </>
      )}
    </div>
  );
}

function RankTable({
  notes,
  constant,
}: {
  notes: number;
  constant: number | null;
}) {
  return (
    <table className="w-full text-sm tabular-nums" data-testid="rank-table">
      <caption className="mb-2 text-left type-label">
        The most of each judgement per rank, everything else Justice Critical
      </caption>
      <thead>
        <tr className="border-b border-ink text-left">
          <th scope="col" className="py-2 pr-3 type-label">
            Rank
          </th>
          <th scope="col" className="hidden py-2 pr-3 type-label md:table-cell">
            Score
          </th>
          <th scope="col" className="py-2 pr-3 text-right type-label">
            Justice
          </th>
          <th scope="col" className="py-2 pr-3 text-right type-label">
            Attack
          </th>
          <th scope="col" className="py-2 pr-3 text-right type-label">
            Miss
          </th>
          {constant !== null && (
            <th scope="col" className="py-2 text-right type-label">
              Rating
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {TABLE_RANKS.map((rank) => {
          const allowed = allowance(notes, rank.min);
          return (
            <tr key={rank.name} className="border-b border-hair">
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                {rank.name}
              </th>
              <td className="hidden py-2 pr-3 md:table-cell">
                {formatScore(rank.min)}
              </td>
              <td className="py-2 pr-3 text-right">{allowed?.justice}</td>
              <td className="py-2 pr-3 text-right">{allowed?.attack}</td>
              <td className="py-2 pr-3 text-right">{allowed?.miss}</td>
              {constant !== null && (
                <td className="py-2 text-right">
                  {formatRating(ratingOf(constant, rank.min))}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Panel({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 border border-ink p-4"
      data-testid={testId}
    >
      <h3 className="type-label">{title}</h3>
      {children}
    </section>
  );
}

function CountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      {(props) => (
        <input
          {...props}
          inputMode="numeric"
          placeholder="0"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={inputClasses}
        />
      )}
    </Field>
  );
}

/** Answers that change as people type, read out politely. */
function Result({ children }: { children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-1 border-t border-hair pt-3"
    >
      {children}
    </div>
  );
}

function PlayPanel({
  notes,
  constant,
}: {
  notes: number;
  constant: number | null;
}) {
  const [justice, setJustice] = useState("");
  const [attack, setAttack] = useState("");
  const [miss, setMiss] = useState("");
  const j = readCount(justice);
  const a = readCount(attack);
  const m = readCount(miss);
  const score =
    j !== null && a !== null && m !== null
      ? scoreOf(notes, { justice: j, attack: a, miss: m })
      : null;

  let detail: ReactNode = null;
  if (score !== null && j !== null && a !== null && m !== null) {
    const rank = rankOf(score);
    const used = j * LOSS.justice + a * LOSS.attack + m * LOSS.miss;
    const critical = notes - j - a - m;
    const index = RANKS.findIndex((r) => r.name === rank);
    const next = index > 0 ? RANKS[index - 1] : null;
    const spare = Math.min(critical, lossBudget(notes, minOf(rank)) - used);
    detail = (
      <>
        <p className="type-card tabular-nums" data-testid="play-score">
          {formatScore(score)} <span className="text-muted">{rank}</span>
        </p>
        <p className="text-sm">Justice Critical: {critical}</p>
        {constant !== null && (
          <p className="text-sm" data-testid="play-rating">
            Rating {formatRating(ratingOf(constant, score))}
          </p>
        )}
        {next && (
          <p className="text-sm">
            {next.name}: {formatScore(next.min - score)} points more
          </p>
        )}
        {rank !== "D" && (
          <p className="text-sm text-muted">
            {spare} more Justice would still be {rank}.
          </p>
        )}
      </>
    );
  }

  return (
    <Panel title="Your play" testId="play-panel">
      <div className="grid grid-cols-3 gap-3">
        <CountField label="Justice" value={justice} onChange={setJustice} />
        <CountField label="Attack" value={attack} onChange={setAttack} />
        <CountField label="Miss" value={miss} onChange={setMiss} />
      </div>
      <Result>
        {j === null || a === null || m === null ? (
          <p role="alert">Counts are whole numbers.</p>
        ) : score === null ? (
          <p role="alert">That’s more judgements than the chart has notes.</p>
        ) : (
          detail
        )}
      </Result>
    </Panel>
  );
}

function BudgetPanel({ notes }: { notes: number }) {
  const [rank, setRank] = useState<Rank>("SSS+");
  const [attack, setAttack] = useState("");
  const [miss, setMiss] = useState("");
  const a = readCount(attack);
  const m = readCount(miss);
  const left =
    a !== null && m !== null ? justiceLeft(notes, minOf(rank), a, m) : null;

  return (
    <Panel title="Justice left" testId="budget-panel">
      <Field label="Rank">
        {(props) => (
          <select
            {...props}
            value={rank}
            onChange={(event) => {
              setRank(event.target.value as Rank);
            }}
            className={inputClasses}
          >
            {TABLE_RANKS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({formatScore(r.min)})
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <CountField label="Attack" value={attack} onChange={setAttack} />
        <CountField label="Miss" value={miss} onChange={setMiss} />
      </div>
      <Result>
        {a === null || m === null ? (
          <p role="alert">Counts are whole numbers.</p>
        ) : left === null ? (
          <p data-testid="budget-result">
            Out of reach: {a} Attack and {m} Miss already fall below {rank}.
          </p>
        ) : (
          <p data-testid="budget-result">
            Up to <strong className="tabular-nums">{left}</strong> Justice for{" "}
            {rank}.
          </p>
        )}
      </Result>
    </Panel>
  );
}

function RatingPanel({
  notes,
  constant,
}: {
  notes: number;
  constant: number | null;
}) {
  const [text, setText] = useState("");
  if (constant === null)
    return (
      <Panel title="Rating target" testId="rating-panel">
        <p className="text-muted">
          This chart has no constant, so it gives no rating.
        </p>
      </Panel>
    );
  const best = maxRating(constant);
  const target = parseRating(text);
  const score = target === null ? null : scoreForRating(constant, target);
  const allowed = score === null ? null : allowance(notes, score);

  return (
    <Panel title="Rating target" testId="rating-panel">
      <Field
        label="Rating"
        hint={`Constant ${formatConstant(constant)}: at most ${formatRating(best)}.`}
      >
        {(props) => (
          <input
            {...props}
            inputMode="decimal"
            placeholder={formatRating(best - 15)}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className={inputClasses}
          />
        )}
      </Field>
      <Result>
        {text.trim() === "" ? (
          <p className="text-muted">Type a rating to see the score it needs.</p>
        ) : target === null ? (
          <p role="alert">Type a rating like 16.50.</p>
        ) : score === null ? (
          <p data-testid="rating-result">
            Out of reach: this chart gives at most {formatRating(best)}.
          </p>
        ) : (
          <>
            <p data-testid="rating-result">
              Needs{" "}
              <strong className="tabular-nums">{formatScore(score)}</strong> (
              {rankOf(score)}).
            </p>
            {allowed && (
              <p className="text-sm text-muted">
                At most {allowed.justice} Justice, or {allowed.attack} Attack,
                or {allowed.miss} Miss.
              </p>
            )}
          </>
        )}
      </Result>
    </Panel>
  );
}
