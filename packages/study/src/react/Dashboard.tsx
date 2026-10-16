/**
 * The personal part of /study/: today's reviews, where to carry on, the streak and
 * the last 30 days, each subject's mastery, mistakes waiting, and review settings.
 * Signed in, it can move this browser's records into the account. Rendered in the
 * browser over the prebuilt page (the server renders a placeholder).
 */
import { useState } from "react";
import { DEFAULT_SETTINGS } from "../progress";
import { useDecks, useNow, useProgress, useStudy } from "./hooks";
import { KeptNote } from "./Tracked";

function percent(value: number | null): string {
  return value === null ? "—" : `${String(Math.round(value * 100))}%`;
}

function Settings() {
  const [state, store] = useStudy();
  const [message, setMessage] = useState<string | null>(null);
  const submit = (element: HTMLFormElement) => {
    const form = new FormData(element);
    const settings = {
      newPerDay: Number(form.get("newPerDay")),
      retention: Number(form.get("retention")),
    };
    store?.saveSettings(settings).then(
      () => {
        setMessage("Saved.");
      },
      (error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Not saved.");
      },
    );
  };
  return (
    <details className="study-settings">
      <summary>Review settings</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
        key={`${String(state.settings.newPerDay)}-${String(state.settings.retention)}`}
      >
        <label>
          <span>New cards a day</span>
          <input
            name="newPerDay"
            type="number"
            min={0}
            max={200}
            step={1}
            required
            defaultValue={state.settings.newPerDay}
          />
        </label>
        <label>
          <span>Target recall</span>
          <select
            name="retention"
            defaultValue={String(state.settings.retention)}
          >
            {[0.8, 0.85, 0.9, 0.93, 0.95].map((value) => (
              <option key={value} value={value}>
                {Math.round(value * 100)}%
                {value === DEFAULT_SETTINGS.retention ? " (recommended)" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="study-muted">
          Higher recall means more reviews. Reviews themselves have no daily
          limit: whatever is due shows up.
        </p>
        <p className="study-tracker-actions">
          <button type="submit" className="study-button">
            Save settings
          </button>
          <span aria-live="polite">{message}</span>
        </p>
      </form>
    </details>
  );
}

export function Dashboard() {
  const [state, store] = useStudy();
  const decks = useDecks();
  const now = useNow(60_000);
  const progress = useProgress(state, decks.decks, now);
  const [moving, setMoving] = useState<string | null>(null);

  if (state.status !== "ready" || decks.status === "loading")
    return <p className="study-panel-note">Loading your progress…</p>;
  if (decks.status === "error" || !progress)
    return <p className="wiki-error">Your progress couldn't be loaded.</p>;
  if (decks.decks.length === 0) return null;

  const dueCount = progress.due.length;
  const freshCount = progress.fresh.length;
  const nothingYet = state.events.length === 0;
  const nextDeck = progress.next
    ? decks.decks.find((deck) => deck.subject === progress.next?.subject)
    : undefined;
  const nextLesson = nextDeck?.lessons.find(
    (lesson) => lesson.slug === progress.next?.lesson,
  );
  const firstDeck = decks.decks[0];
  const firstLesson = firstDeck?.lessons[0];
  const active = progress.activity.filter((day) => day.count > 0).length;
  const busiest = Math.max(1, ...progress.activity.map((day) => day.count));

  return (
    <div className="study-dashboard">
      {state.mode === "account" && state.browserRecords > 0 && (
        <div className="study-callout" data-kind="key" role="note">
          <p className="study-callout-label">
            From this browser
            <span className="study-callout-title">
              {state.browserRecords}{" "}
              {state.browserRecords === 1 ? "record" : "records"} from before
              you signed in
            </span>
          </p>
          <p>
            Move them into your account, so your reviews and answers follow you.
          </p>
          <p className="study-tracker-actions">
            <button
              type="button"
              className="study-button"
              onClick={() => {
                setMoving("Moving…");
                store?.moveBrowserRecords().then(
                  (count) => {
                    setMoving(`Moved ${String(count)}.`);
                  },
                  (error: unknown) => {
                    setMoving(
                      error instanceof Error
                        ? error.message
                        : "They couldn't be moved.",
                    );
                  },
                );
              }}
            >
              Move them to my account
            </button>
          </p>
        </div>
      )}
      {/* Outside the box, which goes once they've moved. */}
      <p className="study-panel-note" aria-live="polite" hidden={!moving}>
        {moving}
      </p>

      <div className="study-today">
        <div className="study-stat">
          <p className="study-stat-label">Due today</p>
          <p className="study-stat-value">{dueCount + freshCount}</p>
          <p className="study-muted">
            {dueCount} to review · {freshCount} new
            {progress.waiting > 0 && ` · ${String(progress.waiting)} waiting`}
          </p>
          {dueCount + freshCount > 0 ? (
            <a className="study-button" href="/study/review/">
              Start review
            </a>
          ) : (
            <p className="study-muted">
              {nothingYet
                ? "Cards join when you finish a lesson."
                : "All done for now."}
            </p>
          )}
        </div>
        <div className="study-stat">
          <p className="study-stat-label">
            {nothingYet ? "Start here" : "Carry on"}
          </p>
          {nextDeck && nextLesson ? (
            <a
              className="study-stat-link"
              href={`/study/${nextDeck.subject}/${nextLesson.slug}/`}
            >
              <span className="study-muted">{nextDeck.title}</span>
              <span>
                {nextLesson.number} {nextLesson.title}
              </span>
            </a>
          ) : firstDeck && firstLesson ? (
            <a
              className="study-stat-link"
              href={`/study/${firstDeck.subject}/${firstLesson.slug}/`}
            >
              <span className="study-muted">{firstDeck.title}</span>
              <span>
                {firstLesson.number} {firstLesson.title}
              </span>
            </a>
          ) : null}
          {progress.mistakes.length > 0 && (
            <a className="study-link" href="/study/mistakes/">
              {progress.mistakes.length}{" "}
              {progress.mistakes.length === 1 ? "mistake" : "mistakes"} to put
              right
            </a>
          )}
        </div>
        <div className="study-stat">
          <p className="study-stat-label">Streak</p>
          <p className="study-stat-value">
            {progress.streak}{" "}
            <span className="study-stat-unit">
              {progress.streak === 1 ? "day" : "days"}
            </span>
          </p>
          <ol
            className="study-activity"
            aria-label={`Studied on ${String(active)} of the last 30 days`}
          >
            {progress.activity.map((day) => (
              <li
                key={day.day}
                title={`${day.day}: ${String(day.count)}`}
                style={{
                  opacity:
                    day.count === 0
                      ? undefined
                      : 0.35 + (0.65 * day.count) / busiest,
                }}
                data-active={day.count > 0 ? "" : undefined}
              />
            ))}
          </ol>
          <p className="study-muted">Last 30 days</p>
        </div>
      </div>

      <table className="study-mastery">
        <caption className="sr-only">Mastery by subject</caption>
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Studied</th>
            <th scope="col">Mastery</th>
            <th scope="col">
              <span className="sr-only">Practise</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {decks.decks.map((deck) => {
            const entry = progress.subjects.get(deck.subject);
            const due = progress.due.filter(
              (card) => card.card.subject === deck.subject,
            ).length;
            return (
              <tr key={deck.subject}>
                <th scope="row">
                  <a href={`/study/${deck.subject}/`}>{deck.title}</a>
                </th>
                <td>
                  {entry?.studied ?? 0} /{" "}
                  {entry?.lessons ?? deck.lessons.length}
                </td>
                <td>
                  <span className="study-meter" aria-hidden="true">
                    <span style={{ width: percent(entry?.mastery ?? 0) }} />
                  </span>{" "}
                  {percent(entry?.mastery ?? null)}
                </td>
                <td className="study-mastery-links">
                  <a href={`/study/${deck.subject}/practice/`}>Practise</a>
                  {due > 0 && (
                    <a
                      href={`/study/review/?subject=${encodeURIComponent(deck.subject)}`}
                    >
                      Review {due}
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="study-dashboard-foot">
        <p className="study-panel-note">
          <KeptNote state={state} />
          {state.error && <span className="study-error"> {state.error}</span>}
        </p>
        <Settings />
      </div>
    </div>
  );
}
