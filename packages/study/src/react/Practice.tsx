/**
 * /study/<subject>/practice/: ten of the subject's questions (or one lesson's, with
 * ?lesson=), leaning towards ones answered wrong last time, then ones never tried.
 * Answers are recorded like a lesson's quiz. "New set" draws again.
 */
import { useState } from "react";
import { practiceSet, type DeckQuestion } from "../progress";
import {
  useDecks,
  useNow,
  useProgress,
  useSearchParam,
  useStudy,
} from "./hooks";
import { Quiz } from "./Quiz";
import { KeptNote, recordAttempt } from "./Tracked";

export const PRACTICE_SIZE = 10;

export function Practice({ subject }: { subject: string }) {
  const [state, store] = useStudy();
  const decks = useDecks(subject);
  const now = useNow(60_000);
  const progress = useProgress(state, decks.decks, now);
  const lesson = useSearchParam("lesson");
  const [set, setSet] = useState<DeckQuestion[] | null>(null);
  const [round, setRound] = useState(1);
  const deck = decks.decks[0];

  // Drawn once the records are in (so it can lean on them), then kept until "New set".
  if (!set && deck && progress)
    setSet(
      practiceSet(
        deck,
        progress,
        PRACTICE_SIZE,
        Math.random,
        lesson ?? undefined,
      ),
    );

  if (state.status !== "ready" || decks.status === "loading" || (deck && !set))
    return <p className="study-panel-note">Picking questions…</p>;
  if (decks.status === "error" || !deck)
    return (
      <p className="wiki-error">This subject's questions couldn't be loaded.</p>
    );
  const lessonInfo = lesson
    ? deck.lessons.find((entry) => entry.slug === lesson)
    : undefined;

  return (
    <div className="study-practice">
      <p className="study-panel-note">
        {lessonInfo
          ? `From ${lessonInfo.number} ${lessonInfo.title}`
          : `From all of ${deck.title}`}
        : {set?.length ?? 0} of{" "}
        {lessonInfo
          ? deck.questions.filter((question) => question.lesson === lesson)
              .length
          : deck.questions.length}{" "}
        questions, with the ones you missed most likely to come up.{" "}
        {lessonInfo && <a href="?">Practise the whole subject</a>}
      </p>
      {set && set.length > 0 ? (
        <Quiz
          key={round}
          id={`practice-${String(round)}`}
          title={`Set ${String(round)}`}
          questions={set}
          note={<KeptNote state={state} />}
          onAttempt={(question, correct, response) => {
            recordAttempt(store, subject, question, correct, response);
          }}
        />
      ) : (
        <p>This has no quiz questions yet.</p>
      )}
      <p className="study-tracker-actions">
        <button
          type="button"
          className="study-button"
          onClick={() => {
            setSet(null);
            setRound((value) => value + 1);
          }}
        >
          New set
        </button>
        <a className="study-link" href="/study/mistakes/">
          Your mistakes
        </a>
      </p>
    </div>
  );
}
