/**
 * /study/mistakes/: every question whose latest answer was wrong, newest first, with
 * what was answered, the right answer and why. Each can be tried again on the spot
 * (a right answer clears it) or turned into a flashcard.
 */
import { formatInterval, type DeckQuestion, type Mistake } from "../progress";
import { useDecks, useNow, useProgress, useStudy } from "./hooks";
import { Quiz } from "./Quiz";
import { KeptNote, recordAttempt } from "./Tracked";

/** What was answered, as it was shown: choices by their text. */
export function shownResponse(
  question: DeckQuestion,
  response: string,
): string {
  if (question.kind !== "choice" && question.kind !== "multiple")
    return response;
  const picked = response
    .split(",")
    .map((part) => Number(part.replace("#", "")) - 1)
    .map((index) => question.options[index])
    .filter((option): option is string => option !== undefined)
    // Options are HTML; show their text.
    .map((option) => option.replace(/<[^>]*>/g, ""));
  return picked.join("; ");
}

export function Mistakes() {
  const [state, store] = useStudy();
  const decks = useDecks();
  const now = useNow();
  const progress = useProgress(state, decks.decks, now);

  if (state.status !== "ready" || decks.status === "loading")
    return <p className="study-panel-note">Loading your mistakes…</p>;
  if (decks.status === "error")
    return <p className="wiki-error">{decks.error}</p>;
  const mistakes = progress?.mistakes ?? [];
  const title = (mistake: Mistake) => {
    const deck = decks.decks.find((entry) => entry.subject === mistake.subject);
    const lesson = deck?.lessons.find(
      (entry) => entry.slug === mistake.question.lesson,
    );
    return { deck, lesson };
  };

  return (
    <div className="study-mistakes">
      <p className="study-panel-note" aria-live="polite">
        {mistakes.length === 0
          ? "No mistakes waiting. Questions you get wrong in quizzes show up here until you answer them right."
          : `${String(mistakes.length)} ${mistakes.length === 1 ? "question" : "questions"} to put right.`}{" "}
        <KeptNote state={state} />
      </p>
      <ol className="study-mistake-list">
        {mistakes.map((mistake) => {
          const { deck, lesson } = title(mistake);
          const { question, progress: answered } = mistake;
          return (
            <li
              key={`${mistake.subject} ${question.id}`}
              className="study-mistake"
            >
              <p className="study-flashcard-meta">
                <a href={`/study/${mistake.subject}/${question.lesson}/`}>
                  {deck?.title} ·{" "}
                  {lesson
                    ? `${lesson.number} ${lesson.title}`
                    : question.lesson}
                </a>{" "}
                · {formatInterval(new Date(answered.lastAt), now)} ago ·{" "}
                {answered.attempts} {answered.attempts === 1 ? "try" : "tries"}
              </p>
              <p className="study-mistake-yours">
                You answered:{" "}
                <span className="study-mistake-response">
                  {shownResponse(question, answered.lastResponse) || "—"}
                </span>
              </p>
              <Quiz
                id={`mistake-${question.id.replace(/[^a-z0-9-]/g, "-")}`}
                title="Try it again"
                questions={[question]}
                onAttempt={(entry, correct, response) => {
                  recordAttempt(
                    store,
                    mistake.subject,
                    entry,
                    correct,
                    response,
                  );
                }}
              />
              <p className="study-mistake-actions">
                {mistake.carded ? (
                  <span className="study-muted">
                    In your reviews as a flashcard.
                  </span>
                ) : (
                  <button
                    type="button"
                    className="study-link"
                    onClick={() => {
                      store?.record([
                        {
                          kind: "card",
                          subject: mistake.subject,
                          item: question.id,
                          data: {},
                        },
                      ]);
                    }}
                  >
                    Make it a flashcard
                  </button>
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
