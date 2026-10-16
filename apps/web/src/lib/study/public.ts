/**
 * The study section's public face: its number and words, share cards, and paths.
 * Pure (no content loading), so the share-image route and tests can use it.
 */
import { lessonsOf, type Subject } from "@trilleo/study";
import { CARD_META_LENGTH, truncate, type OgCard } from "../seo";

export const STUDY_NUMBER = "06";
export const STUDY_LABEL = `(${STUDY_NUMBER}) Study`;
export const STUDY_DESCRIPTION =
  "Class materials turned into lessons: definitions, worked examples, formula sheets, quizzes that check your answers, flashcards, and circuits you can change.";

export const STUDY_CARD: OgCard = {
  section: STUDY_LABEL,
  title: "Study",
  meta: "Lessons · Quizzes · Flashcards · Formulas",
};

export function lessonCount(subject: Subject): string {
  const count = lessonsOf(subject).length;
  return `${String(count)} ${count === 1 ? "lesson" : "lessons"}`;
}

/** A subject's card. Share images have no Chinese font, so its Chinese name stays off it. */
export function subjectCard(subject: Subject): OgCard {
  return {
    section: STUDY_LABEL,
    title: subject.title,
    meta: truncate(
      [subject.course, subject.term, lessonCount(subject)]
        .filter(Boolean)
        .join(" · "),
      CARD_META_LENGTH,
    ),
  };
}
