/**
 * Widgets connected to someone's records: a lesson's quiz that records each answer,
 * and the tracker at a lesson's end that marks it studied (its cards then join the
 * reviews) and shows where things stand.
 */
import { useEffect, type ReactNode } from "react";
import type { StudyState, StudyStore } from "../client/store";
import { itemKey } from "../progress";
import type { QuizProps, QuizQuestion } from "../types";
import { useDecks, useNow, useProgress, useStudy } from "./hooks";
import { Quiz } from "./Quiz";

const SIGN_IN = (path: string) => `/sign-in?next=${encodeURIComponent(path)}`;

/** Where answers go, in a sentence (with a sign-in link when they stay in this browser). */
export function KeptNote({ state }: { state: StudyState }): ReactNode {
  if (state.status !== "ready") return null;
  if (state.mode === "account")
    return state.unsaved > 0
      ? "Saving to your account…"
      : "Saved to your account.";
  return (
    <>
      Kept in this browser.{" "}
      <a
        href={SIGN_IN(
          typeof location === "undefined" ? "/study/" : location.pathname,
        )}
      >
        Sign in
      </a>{" "}
      to keep it in your account.
    </>
  );
}

export function recordAttempt(
  store: StudyStore | null,
  subject: string,
  question: QuizQuestion,
  correct: boolean,
  response: string,
): void {
  store?.record([
    {
      kind: "attempt",
      subject,
      item: question.id,
      data: { correct, response },
    },
  ]);
}

/** A lesson's quiz, recording answers. */
export function LessonQuiz(props: QuizProps) {
  const [state, store] = useStudy();
  return (
    <Quiz
      {...props}
      note={<KeptNote state={state} />}
      onAttempt={(question, correct, response) => {
        recordAttempt(store, props.subject, question, correct, response);
      }}
    />
  );
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * At the end of a lesson. It hydrates when it scrolls into view (client:visible),
 * which is reaching the end: that marks the lesson studied, once.
 */
export function LessonTracker({
  subject,
  lesson,
}: {
  subject: string;
  lesson: string;
}) {
  const [state, store] = useStudy();
  const decks = useDecks(subject);
  const now = useNow();
  const progress = useProgress(state, decks.decks, now);
  const entry = progress?.lessons.get(itemKey(subject, lesson));
  const studiedAt =
    entry?.studiedAt ??
    state.events.find(
      (event) =>
        event.kind === "studied" &&
        event.subject === subject &&
        event.item === lesson,
    )?.at ??
    null;

  const ready = state.status === "ready";
  useEffect(() => {
    if (!ready || !store) return;
    const studied = store
      .getState()
      .events.some(
        (event) =>
          event.kind === "studied" &&
          event.subject === subject &&
          event.item === lesson,
      );
    if (!studied)
      store.record([{ kind: "studied", subject, item: lesson, data: {} }]);
  }, [ready, store, subject, lesson]);

  const due = progress ? progress.due.length + progress.fresh.length : 0;
  return (
    <section className="study-tracker" aria-label="Your progress">
      <p className="study-tracker-status" aria-live="polite">
        {state.status !== "ready"
          ? "Loading your progress…"
          : studiedAt
            ? `Studied ${formatDay(studiedAt)}.`
            : "Marking this lesson as studied…"}
        {entry && entry.cards > 0 && studiedAt
          ? ` Its ${String(entry.cards)} ${entry.cards === 1 ? "card joins" : "cards join"} your reviews.`
          : ""}
      </p>
      {entry && entry.answered > 0 && (
        <p className="study-tracker-line">
          Quiz: {entry.right} of {entry.questions} right at the latest try
          {entry.mastery !== null &&
            ` · mastery ${String(Math.round(entry.mastery * 100))}%`}
        </p>
      )}
      <p className="study-tracker-actions">
        <a
          className="study-button"
          href={`/study/review/?subject=${encodeURIComponent(subject)}`}
        >
          Review{due > 0 ? ` (${String(due)})` : ""}
        </a>
        <a
          className="study-link"
          href={`/study/${subject}/practice/?lesson=${encodeURIComponent(lesson)}`}
        >
          Practise this lesson
        </a>
      </p>
      <p className="study-tracker-kept">
        <KeptNote state={state} />
        {state.error && <span className="study-error"> {state.error}</span>}
      </p>
    </section>
  );
}
