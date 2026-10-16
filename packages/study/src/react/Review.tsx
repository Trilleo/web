/**
 * /study/review/: a flashcard session. Cards due now come first (soonest first),
 * then today's new ones. Each shows its front; Space (or the button) turns it over;
 * 1–4 grade it, each button saying when the card would come back. Grades are
 * recorded and the schedule worked out again, so a card graded Again returns in a
 * few minutes, in this same session. `?subject=` keeps it to one subject.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  GRADES,
  GRADE_LABELS,
  formatInterval,
  itemKey,
  previewIntervals,
  type GradeValue,
  type StudyCard,
} from "../progress";
import {
  useDecks,
  useNow,
  useProgress,
  useSearchParam,
  useStudy,
} from "./hooks";
import { KeptNote } from "./Tracked";

function html(content: string) {
  return { __html: content };
}

export function Review({ subject: fixed }: { subject?: string | null }) {
  // ?subject= when it isn't given (the page is built once for every subject).
  const fromAddress = useSearchParam("subject");
  const subject = fixed === undefined ? fromAddress : fixed;

  const [state, store] = useStudy();
  const decks = useDecks(subject);
  const now = useNow(15_000);
  // Grading moves time on at once (the next card), not at the next tick.
  const [gradedAt, setGradedAt] = useState<Date | null>(null);
  const at = gradedAt && gradedAt > now ? gradedAt : now;
  const progress = useProgress(state, decks.decks, at);
  const [shown, setShown] = useState(false);
  const [session, setSession] = useState({ reviewed: 0, again: 0 });
  const answerRef = useRef<HTMLButtonElement>(null);

  const queue: { card: StudyCard; isNew: boolean }[] = useMemo(() => {
    if (!progress) return [];
    return [
      ...progress.due.map((entry) => ({ card: entry.card, isNew: false })),
      ...progress.fresh.map((card) => ({ card, isNew: true })),
    ];
  }, [progress]);
  const current = queue[0] ?? null;
  const currentProgress =
    current && progress
      ? (progress.cards.get(itemKey(current.card.subject, current.card.id)) ??
        null)
      : null;
  const preview = useMemo(
    () =>
      current && progress
        ? previewIntervals(currentProgress, progress.settings, at)
        : null,
    [current, currentProgress, progress, at],
  );
  const deckTitle = (slug: string) =>
    decks.decks.find((deck) => deck.subject === slug)?.title ?? slug;
  const lessonTitle = (card: StudyCard) => {
    const lesson = decks.decks
      .find((deck) => deck.subject === card.subject)
      ?.lessons.find((entry) => entry.slug === card.lesson);
    return lesson ? `${lesson.number} ${lesson.title}` : "";
  };

  const grade = (value: GradeValue) => {
    if (!current || !store) return;
    store.record([
      {
        kind: "review",
        subject: current.card.subject,
        item: current.card.id,
        data: { grade: value },
      },
    ]);
    setGradedAt(new Date());
    setShown(false);
    setSession((before) => ({
      reviewed: before.reviewed + 1,
      again: before.again + (value === 1 ? 1 : 0),
    }));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!current || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!shown && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        grade(Number(event.key) as GradeValue);
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  });

  useEffect(() => {
    if (shown) answerRef.current?.focus();
  }, [shown]);

  if (state.status !== "ready" || decks.status === "loading")
    return <p className="study-panel-note">Loading your reviews…</p>;
  if (decks.status === "error")
    return <p className="wiki-error">{decks.error}</p>;

  // What's still to come today, and when the next card comes back.
  const upcoming = progress
    ? [...progress.cards.values()]
        .map((entry) => entry.fsrs.due)
        .filter((due) => due > at)
        .sort((a, b) => a.getTime() - b.getTime())[0]
    : undefined;

  return (
    <div className="study-review">
      <div className="study-review-bar">
        <p aria-live="polite">
          <strong>{queue.length}</strong> to go
          {progress &&
            progress.fresh.length > 0 &&
            ` (${String(progress.fresh.length)} new)`}{" "}
          · {session.reviewed} reviewed
          {session.again > 0 && `, ${String(session.again)} again`}
        </p>
        <p className="study-review-scope">
          {subject ? (
            <>
              {deckTitle(subject)} · <a href="/study/review/">All subjects</a>
            </>
          ) : (
            "All subjects"
          )}
        </p>
      </div>

      {current ? (
        <article className="study-flashcard" aria-label="Flashcard">
          <p className="study-flashcard-meta">
            {deckTitle(current.card.subject)} · {lessonTitle(current.card)}
            {current.isNew && <span className="study-flashcard-new">New</span>}
            {current.card.source === "question" && (
              <span className="study-flashcard-new">From a mistake</span>
            )}
          </p>
          <div
            className="study-flashcard-front"
            dangerouslySetInnerHTML={html(current.card.front)}
          />
          {shown ? (
            <>
              <div
                className="study-flashcard-back"
                dangerouslySetInnerHTML={html(current.card.back)}
              />
              <div
                className="study-grades"
                role="group"
                aria-label="How well did you remember it?"
              >
                {GRADES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    ref={value === 3 ? answerRef : undefined}
                    className="study-grade"
                    data-grade={value}
                    onClick={() => {
                      grade(value);
                    }}
                  >
                    <span className="study-grade-label">
                      {GRADE_LABELS[value]}
                    </span>
                    <span className="study-grade-when">
                      {preview ? formatInterval(at, preview[value]) : ""}
                      <span className="sr-only"> until it's back</span>
                    </span>
                    <kbd aria-hidden="true">{value}</kbd>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="study-button study-show"
              onClick={() => {
                setShown(true);
              }}
            >
              Show answer <kbd aria-hidden="true">Space</kbd>
            </button>
          )}
        </article>
      ) : (
        <div className="study-review-done">
          <p className="study-heading">
            {session.reviewed > 0
              ? "Done for now."
              : "Nothing to review right now."}
          </p>
          <p>
            {upcoming
              ? `The next card is due in ${formatInterval(at, upcoming)}.`
              : "Cards join your reviews when you finish a lesson."}
            {progress &&
              progress.waiting > 0 &&
              ` ${String(progress.waiting)} new cards wait for tomorrow's allowance.`}
          </p>
          <p>
            <a href="/study/">Back to your dashboard</a>
          </p>
        </div>
      )}
      <p className="study-panel-note">
        <KeptNote state={state} />
        {state.error && <span className="study-error"> {state.error}</span>}
      </p>
    </div>
  );
}
