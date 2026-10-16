/**
 * The learning engine. Someone's record is a list of events (a card graded, a
 * question answered, a lesson studied, a question turned into a card), kept in the
 * browser or the account (study_events). Everything else is worked out from them
 * and the subjects' decks, here, the same way in every browser:
 *
 * - card schedules: FSRS (ts-fsrs), replaying each card's reviews in order;
 * - what's due, and which new cards may start today (a lesson's cards join once it's
 *   studied, at most `newPerDay` first reviews a day);
 * - quiz results per question, and the mistake log (questions whose latest answer
 *   was wrong);
 * - mastery per lesson and subject, the streak and recent activity.
 *
 * Because nothing derived is stored, a browser's events and an account's merge by
 * adding them up (IDs make duplicates harmless).
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from "ts-fsrs";
import { dayOf } from "./dates";
import { lessonOf } from "./ids";
import type { QuizQuestion } from "./types";

export const GRADES = [1, 2, 3, 4] as const;
export type GradeValue = (typeof GRADES)[number];
const RATINGS: Readonly<Record<GradeValue, Grade>> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};
export const GRADE_LABELS: Readonly<Record<GradeValue, string>> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

interface EventBase {
  /** A UUID, made by the browser that recorded it. */
  id: string;
  subject: string;
  /** ISO time. */
  at: string;
}

export type StudyEvent =
  | (EventBase & { kind: "review"; item: string; data: { grade: GradeValue } })
  | (EventBase & {
      kind: "attempt";
      item: string;
      data: { correct: boolean; response: string };
    })
  | (EventBase & { kind: "studied"; item: string; data: Record<string, never> })
  | (EventBase & { kind: "card"; item: string; data: Record<string, never> });

export type StudyEventKind = StudyEvent["kind"];

export interface StudySettings {
  /** First reviews (new cards) a day, 0–200. */
  newPerDay: number;
  /** FSRS's target recall, 0.7–0.97. */
  retention: number;
}

export const DEFAULT_SETTINGS: StudySettings = {
  newPerDay: 20,
  retention: 0.9,
};

export const STUDY_LIMITS = {
  /** Events in one save. */
  perRequest: 500,
  /** Events an account (or a browser) keeps. */
  perPerson: 50_000,
  /** Characters of a quiz answer kept. */
  response: 300,
  item: 120,
  /** How far ahead of the server's clock an event may be. */
  futureMs: 10 * 60_000,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ITEM = /^[a-z0-9:-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An event, if `value` is a valid one (the server's only check on what's saved; the
 * browser checks what it reads back from storage the same way). `now` bounds `at`.
 */
export function parseEvent(
  value: unknown,
  now = new Date(),
): StudyEvent | null {
  if (!isRecord(value)) return null;
  const { id, kind, subject, item, at, data } = value;
  if (typeof id !== "string" || !UUID.test(id)) return null;
  if (typeof subject !== "string" || !SLUG.test(subject) || subject.length > 60)
    return null;
  if (
    typeof item !== "string" ||
    item.length > STUDY_LIMITS.item ||
    !ITEM.test(item)
  )
    return null;
  if (typeof at !== "string") return null;
  const time = Date.parse(at);
  if (
    Number.isNaN(time) ||
    time > now.getTime() + STUDY_LIMITS.futureMs ||
    time < Date.UTC(2020, 0, 1)
  )
    return null;
  const base = { id, subject, item, at: new Date(time).toISOString() };
  if (!isRecord(data)) return null;
  switch (kind) {
    case "review": {
      const grade = data.grade;
      return typeof grade === "number" &&
        (GRADES as readonly number[]).includes(grade)
        ? { ...base, kind, data: { grade: grade as GradeValue } }
        : null;
    }
    case "attempt": {
      const { correct, response } = data;
      return typeof correct === "boolean" && typeof response === "string"
        ? {
            ...base,
            kind,
            data: {
              correct,
              response: response.slice(0, STUDY_LIMITS.response),
            },
          }
        : null;
    }
    case "studied":
    case "card":
      return { ...base, kind, data: {} };
    default:
      return null;
  }
}

export function parseSettings(value: unknown): StudySettings | null {
  if (!isRecord(value)) return null;
  const { newPerDay, retention } = value;
  if (
    typeof newPerDay !== "number" ||
    !Number.isInteger(newPerDay) ||
    newPerDay < 0 ||
    newPerDay > 200
  )
    return null;
  if (typeof retention !== "number" || !(retention >= 0.7 && retention <= 0.97))
    return null;
  return { newPerDay, retention };
}

// Decks: what a subject offers to review and practise (built per subject with the site).

export interface DeckLesson {
  slug: string;
  number: string;
  title: string;
}

export interface DeckCard {
  id: string;
  lesson: string;
  front: string;
  back: string;
}

export type DeckQuestion = QuizQuestion & { lesson: string };

export interface Deck {
  subject: string;
  title: string;
  zh: string | null;
  exams: { date: string; name: string }[];
  lessons: DeckLesson[];
  cards: DeckCard[];
  questions: DeckQuestion[];
}

/** A card in someone's reviews, with its subject. */
export interface StudyCard extends DeckCard {
  subject: string;
  /** "question": made from a quiz question (from the mistake log). */
  source: "deck" | "question";
}

export interface CardProgress {
  card: StudyCard;
  fsrs: FsrsCard;
  /** Reviews so far. */
  reviews: number;
  /** Recall probability now (0–1). */
  recall: number;
}

export interface QuestionProgress {
  attempts: number;
  /** Whether the first answer was right. */
  first: boolean;
  /** Whether the latest answer was right. */
  latest: boolean;
  lastResponse: string;
  lastAt: string;
}

export interface Mistake {
  subject: string;
  question: DeckQuestion;
  progress: QuestionProgress;
  /** Already a card in their reviews. */
  carded: boolean;
}

export interface LessonProgress {
  studiedAt: string | null;
  /** 0–1, or null before there's anything to go on. */
  mastery: number | null;
  /** Questions answered right at their latest try, out of the lesson's. */
  right: number;
  /** Questions answered at least once. */
  answered: number;
  questions: number;
  cards: number;
  /** Its cards that have started. */
  started: number;
}

export interface Progress {
  now: Date;
  settings: StudySettings;
  /** Cards that have started, by key (`subject card-id`). */
  cards: Map<string, CardProgress>;
  /** Started cards due now, soonest first. */
  due: CardProgress[];
  /** Cards that may start now (today's allowance), in lesson order. */
  fresh: StudyCard[];
  /** Cards waiting to start, beyond today's allowance. */
  waiting: number;
  /** Cards that started today. */
  startedToday: number;
  questions: Map<string, QuestionProgress>;
  mistakes: Mistake[];
  lessons: Map<string, LessonProgress>;
  subjects: Map<
    string,
    { mastery: number | null; studied: number; lessons: number }
  >;
  /** Days in a row (China time) with a review or an answer, ending today or yesterday. */
  streak: number;
  /** The last 30 days (oldest first), with how many reviews and answers each had. */
  activity: { day: string; count: number }[];
  /** Where to carry on: the lesson after the last one studied, or the last one touched. */
  next: { subject: string; lesson: string } | null;
}

export function itemKey(subject: string, item: string): string {
  return `${subject} ${item}`;
}

export function scheduler(settings: StudySettings): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: settings.retention,
      enable_fuzz: true,
    }),
  );
}

/** A card made from a quiz question: the prompt on the front, the answer and why behind it. */
export function questionCard(
  subject: string,
  question: DeckQuestion,
): StudyCard {
  return {
    id: question.id,
    lesson: question.lesson,
    subject,
    source: "question",
    front: question.prompt,
    back: `<p><strong>${question.answer}</strong></p>${question.explanation}`,
  };
}

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Works out everything from someone's events and the decks. Pure. */
export function buildProgress(
  events: readonly StudyEvent[],
  decks: readonly Deck[],
  settings: StudySettings = DEFAULT_SETTINGS,
  now = new Date(),
): Progress {
  const f = scheduler(settings);
  const sorted = [...events].sort(
    (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
  );
  const deckOf = new Map(decks.map((deck) => [deck.subject, deck]));
  const cardIndex = new Map<string, StudyCard>();
  const questionIndex = new Map<string, DeckQuestion>();
  for (const deck of decks) {
    for (const card of deck.cards)
      cardIndex.set(itemKey(deck.subject, card.id), {
        ...card,
        subject: deck.subject,
        source: "deck",
      });
    for (const question of deck.questions)
      questionIndex.set(itemKey(deck.subject, question.id), question);
  }

  const studied = new Map<string, string>();
  const carded = new Set<string>();
  const questions = new Map<string, QuestionProgress>();
  const cards = new Map<string, CardProgress>();
  const today = dayOf(now);
  let startedToday = 0;
  const perDay = new Map<string, number>();
  let lastTouched: { subject: string; lesson: string } | null = null;

  for (const event of sorted) {
    const key = itemKey(event.subject, event.item);
    switch (event.kind) {
      case "studied":
        if (!studied.has(key)) studied.set(key, event.at);
        lastTouched = { subject: event.subject, lesson: event.item };
        break;
      case "card":
        carded.add(key);
        break;
      case "attempt": {
        const known = questions.get(key);
        questions.set(
          key,
          known
            ? {
                ...known,
                attempts: known.attempts + 1,
                latest: event.data.correct,
                lastResponse: event.data.response,
                lastAt: event.at,
              }
            : {
                attempts: 1,
                first: event.data.correct,
                latest: event.data.correct,
                lastResponse: event.data.response,
                lastAt: event.at,
              },
        );
        perDay.set(
          dayOf(new Date(event.at)),
          (perDay.get(dayOf(new Date(event.at))) ?? 0) + 1,
        );
        lastTouched = { subject: event.subject, lesson: lessonOf(event.item) };
        break;
      }
      case "review": {
        const card =
          cardIndex.get(key) ??
          (() => {
            const question = questionIndex.get(key);
            return question ? questionCard(event.subject, question) : undefined;
          })();
        perDay.set(
          dayOf(new Date(event.at)),
          (perDay.get(dayOf(new Date(event.at))) ?? 0) + 1,
        );
        if (!card) break; // Its lesson changed: the history stays, the card is gone.
        const at = new Date(event.at);
        const known = cards.get(key);
        if (!known && dayOf(at) === today) startedToday += 1;
        const before: FsrsCard = known ? known.fsrs : createEmptyCard(at);
        const after = f.next(before, at, RATINGS[event.data.grade]).card;
        cards.set(key, {
          card,
          fsrs: after,
          reviews: (known?.reviews ?? 0) + 1,
          recall: 0,
        });
        break;
      }
    }
  }

  for (const progress of cards.values())
    progress.recall =
      progress.fsrs.state === State.New
        ? 0
        : f.get_retrievability(progress.fsrs, now, false);

  const due = [...cards.values()]
    .filter((progress) => progress.fsrs.due.getTime() <= now.getTime())
    .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  // New cards: studied lessons' cards, in subject and lesson order, then cards made from questions.
  const candidates: StudyCard[] = [];
  for (const deck of decks) {
    for (const lesson of deck.lessons) {
      if (!studied.has(itemKey(deck.subject, lesson.slug))) continue;
      for (const card of deck.cards)
        if (
          card.lesson === lesson.slug &&
          !cards.has(itemKey(deck.subject, card.id))
        )
          candidates.push({ ...card, subject: deck.subject, source: "deck" });
    }
  }
  for (const key of carded) {
    const question = questionIndex.get(key);
    const subject = key.split(" ")[0] ?? "";
    if (question && !cards.has(key))
      candidates.push(questionCard(subject, question));
  }
  const allowance = Math.max(0, settings.newPerDay - startedToday);
  const fresh = candidates.slice(0, allowance);

  const mistakes: Mistake[] = [];
  for (const [key, progress] of questions) {
    const question = questionIndex.get(key);
    if (!question || progress.latest) continue;
    mistakes.push({
      subject: key.split(" ")[0] ?? "",
      question,
      progress,
      carded: carded.has(key) || cards.has(key),
    });
  }
  mistakes.sort((a, b) => b.progress.lastAt.localeCompare(a.progress.lastAt));

  const lessons = new Map<string, LessonProgress>();
  const subjects = new Map<
    string,
    { mastery: number | null; studied: number; lessons: number }
  >();
  for (const deck of decks) {
    const masteries: number[] = [];
    let studiedCount = 0;
    for (const lesson of deck.lessons) {
      const key = itemKey(deck.subject, lesson.slug);
      const lessonQuestions = deck.questions.filter(
        (question) => question.lesson === lesson.slug,
      );
      const answered = lessonQuestions
        .map((question) => questions.get(itemKey(deck.subject, question.id)))
        .filter((entry): entry is QuestionProgress => entry !== undefined);
      const right = answered.filter((entry) => entry.latest).length;
      const lessonCards = deck.cards.filter(
        (card) => card.lesson === lesson.slug,
      );
      const started = lessonCards
        .map((card) => cards.get(itemKey(deck.subject, card.id)))
        .filter((entry): entry is CardProgress => entry !== undefined);
      // Quizzes count every question (unanswered ones as not yet right); cards, their recall.
      const parts = [
        ...(answered.length > 0 && lessonQuestions.length > 0
          ? [right / lessonQuestions.length]
          : []),
        ...(started.length > 0 && lessonCards.length > 0
          ? [
              started.reduce((sum, entry) => sum + entry.recall, 0) /
                lessonCards.length,
            ]
          : []),
      ];
      const mastery = mean(parts);
      if (mastery !== null) masteries.push(mastery);
      const studiedAt = studied.get(key) ?? null;
      if (studiedAt) studiedCount += 1;
      lessons.set(key, {
        studiedAt,
        mastery,
        right,
        answered: answered.length,
        questions: lessonQuestions.length,
        cards: lessonCards.length,
        started: started.length,
      });
    }
    // A subject's mastery: its lessons', counting untouched ones as 0.
    subjects.set(deck.subject, {
      mastery:
        masteries.length > 0
          ? masteries.reduce((sum, value) => sum + value, 0) /
            Math.max(1, deck.lessons.length)
          : null,
      studied: studiedCount,
      lessons: deck.lessons.length,
    });
  }

  const activity: { day: string; count: number }[] = [];
  for (let back = 29; back >= 0; back -= 1) {
    const day = dayOf(new Date(now.getTime() - back * 86_400_000));
    activity.push({ day, count: perDay.get(day) ?? 0 });
  }
  let streak = 0;
  const yesterday = dayOf(new Date(now.getTime() - 86_400_000));
  let cursor = perDay.has(today)
    ? now
    : perDay.has(yesterday)
      ? new Date(now.getTime() - 86_400_000)
      : null;
  while (cursor && perDay.has(dayOf(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  let next: Progress["next"] = null;
  const touched = lastTouched;
  if (touched) {
    const deck = deckOf.get(touched.subject);
    const index =
      deck?.lessons.findIndex((lesson) => lesson.slug === touched.lesson) ?? -1;
    const following = deck?.lessons
      .slice(index + 1)
      .find((lesson) => !studied.has(itemKey(deck.subject, lesson.slug)));
    next =
      following && deck
        ? { subject: deck.subject, lesson: following.slug }
        : touched;
  }

  return {
    now,
    settings,
    cards,
    due,
    fresh,
    waiting: candidates.length - fresh.length,
    startedToday,
    questions,
    mistakes,
    lessons,
    subjects,
    streak,
    activity,
    next,
  };
}

/** When a card would next be due for each grade (for the buttons' hints). */
export function previewIntervals(
  progress: CardProgress | null,
  settings: StudySettings,
  now = new Date(),
): Record<GradeValue, Date> {
  const f = scheduler(settings);
  const card: FsrsCard = progress ? progress.fsrs : createEmptyCard(now);
  const result = {} as Record<GradeValue, Date>;
  for (const grade of GRADES)
    result[grade] = f.next(card, now, RATINGS[grade]).card.due;
  return result;
}

/** "1 min", "10 min", "3 h", "4 d", "2 mo". */
export function formatInterval(from: Date, to: Date): string {
  const minutes = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 60_000),
  );
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${String(days)} d`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `${String(months)} mo`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, "")} y`;
}

/**
 * A practice set: up to `count` of a subject's questions, weighted towards ones
 * answered wrong last time (×4), then never tried (×2), then right (×1). `random`
 * is injectable for tests.
 */
export function practiceSet(
  deck: Deck,
  progress: Progress,
  count = 10,
  random: () => number = Math.random,
  lesson?: string,
): DeckQuestion[] {
  const pool = deck.questions
    .filter((question) => !lesson || question.lesson === lesson)
    .map((question) => {
      const entry = progress.questions.get(itemKey(deck.subject, question.id));
      return { question, weight: !entry ? 2 : entry.latest ? 1 : 4 };
    });
  const chosen: DeckQuestion[] = [];
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let pick = random() * total;
    let index = pool.findIndex((entry) => {
      pick -= entry.weight;
      return pick < 0;
    });
    if (index === -1) index = pool.length - 1;
    const [taken] = pool.splice(index, 1);
    if (taken) chosen.push(taken.question);
  }
  return chosen;
}
