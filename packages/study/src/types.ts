/**
 * What rendering a lesson gives back besides its HTML: entries for the subject's
 * glossary and formula sheet, flashcards, and the interactive widgets (islands) the
 * page mounts where their placeholders are.
 */
import type { CheckData, QuestionKind } from "./quiz";

export interface GlossaryEntry {
  term: string;
  zh: string | null;
  /** The definition's HTML, when the lesson defines it (::: define). */
  definition: string | null;
  /** The id of the definition on the lesson's page. */
  anchor: string | null;
}

export interface FormulaEntry {
  name: string;
  zh: string | null;
  /** "2.3.1" */
  number: string;
  anchor: string;
  /** The equation (KaTeX HTML). */
  equation: string;
  /** Its symbols' table, or "". */
  symbols: string;
}

export interface CardEntry {
  front: string;
  back: string;
}

export interface QuizQuestion {
  kind: QuestionKind;
  prompt: string;
  options: string[];
  /** The right answer, shown on request (HTML). */
  answer: string;
  explanation: string;
  check: CheckData;
}

export interface QuizProps {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface WidgetProps {
  id: string;
  title: string;
  /** The block's body: the widget parses it (plot, explore, circuit). */
  source: string;
  /** "Figure 2.3.1" */
  label: string;
}

export type Island =
  | { id: string; name: "quiz"; props: QuizProps }
  | { id: string; name: "plot" | "explore" | "circuit"; props: WidgetProps };

export interface Heading {
  depth: 2 | 3;
  slug: string;
  text: string;
  /** "2.3.1" */
  number: string;
}

export interface RenderedLesson {
  html: string;
  toc: Heading[];
  glossary: GlossaryEntry[];
  formulas: FormulaEntry[];
  cards: CardEntry[];
  islands: Island[];
  /** Questions across its quizzes. */
  questions: number;
  /** Problems found while rendering (bad maths, component errors). */
  errors: string[];
}
