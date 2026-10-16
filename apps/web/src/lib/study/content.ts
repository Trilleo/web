/**
 * The study section's content: subjects from the repository's study/ folder
 * (@trilleo/study reads and checks them), lessons rendered once per build with the
 * site's Shiki, and each subject's glossary, formula sheet and deck gathered from
 * its lessons. Pages are prerendered, so this runs while building; the server only
 * reads the subject list (share images, llms.txt).
 */
import {
  createRenderer,
  lessonsOf,
  loadSubjects,
  mergeGlossary,
  type FormulaEntry,
  type GlossaryEntry,
  type Lesson,
  type LessonRenderer,
  type RenderedLesson,
  type Subject,
} from "@trilleo/study";
import { getHighlighter, highlightCode } from "../blog/render";

const ROOT = "../../../../../study/";

// Paths relative to this file; trimmed to "subject/…" below.
const sources = import.meta.glob<string>("../../../../../study/*/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const figureUrls = import.meta.glob<string>(
  "../../../../../study/*/figures/*.{webp,png,jpg,jpeg,gif,avif,svg}",
  { query: "?url", import: "default", eager: true },
);

/**
 * Drafts (the sample subject) show in `pnpm dev` and the e2e build (STUDY_DRAFTS=1),
 * never in production.
 */
export function showDrafts(): boolean {
  return import.meta.env.DEV || process.env.STUDY_DRAFTS === "1";
}

let subjects: Subject[] | undefined;

/** Every subject, in order (throws, listing the problems, if any file is wrong). */
export function studySubjects(): Subject[] {
  subjects ??= loadSubjects(
    Object.fromEntries(
      Object.entries(sources).map(([path, text]) => [
        path.slice(ROOT.length),
        text,
      ]),
    ),
    { drafts: showDrafts() },
  );
  return subjects;
}

function figureUrl(subject: string, path: string): string | null {
  const clean = path.replace(/^\.\//, "");
  if (!clean.startsWith("figures/") || clean.includes("..")) return null;
  return figureUrls[`${ROOT}${subject}/${clean}`] ?? null;
}

const renderers = new Map<string, Promise<LessonRenderer>>();
function rendererFor(subject: string): Promise<LessonRenderer> {
  let renderer = renderers.get(subject);
  if (!renderer) {
    renderer = getHighlighter().then((shiki) =>
      createRenderer({
        highlight: (code, lang) => highlightCode(shiki, code, lang),
        figure: (path) => figureUrl(subject, path),
      }),
    );
    renderers.set(subject, renderer);
  }
  return renderer;
}

const rendered = new Map<string, Promise<RenderedLesson>>();

/** A lesson's HTML and what it contributes; mistakes fail the build. */
export function renderLesson(lesson: Lesson): Promise<RenderedLesson> {
  const key = `${lesson.subject}/${lesson.slug}`;
  let result = rendered.get(key);
  if (!result) {
    result = rendererFor(lesson.subject).then((renderer) => {
      const output = renderer.render({
        number: lesson.number,
        title: lesson.title,
        body: lesson.body,
      });
      if (output.errors.length > 0)
        throw new Error(
          `study/${key} has problems:\n- ${output.errors.join("\n- ")}`,
        );
      return output;
    });
    rendered.set(key, result);
  }
  return result;
}

export type LessonRef = Pick<Lesson, "slug" | "title" | "number">;

export interface SubjectReference {
  glossary: (GlossaryEntry & {
    lesson: string;
    lessonTitle: string;
    lessonNumber: string;
  })[];
  formulas: (FormulaEntry & { lesson: LessonRef })[];
  cards: number;
  questions: number;
  /** What each lesson holds, for the subject's contents. */
  lessons: Map<string, { cards: number; questions: number; minutes: number }>;
}

/** A subject's glossary, formula sheet and counts, gathered from its lessons. */
export async function subjectReference(
  subject: Subject,
): Promise<SubjectReference> {
  const lessons = lessonsOf(subject);
  const results = await Promise.all(lessons.map(renderLesson));
  const glossary: SubjectReference["glossary"] = [];
  const formulas: SubjectReference["formulas"] = [];
  const perLesson: SubjectReference["lessons"] = new Map();
  let cards = 0;
  let questions = 0;
  lessons.forEach((lesson, index) => {
    const result = results[index];
    if (!result) return;
    for (const entry of result.glossary)
      glossary.push({
        ...entry,
        lesson: lesson.slug,
        lessonTitle: lesson.title,
        lessonNumber: lesson.number,
      });
    for (const entry of result.formulas)
      formulas.push({
        ...entry,
        lesson: {
          slug: lesson.slug,
          title: lesson.title,
          number: lesson.number,
        },
      });
    cards += result.cards.length;
    questions += result.questions;
    perLesson.set(lesson.slug, {
      cards: result.cards.length,
      questions: result.questions,
      minutes: lesson.minutes,
    });
  });
  return {
    glossary: mergeGlossary(glossary),
    formulas,
    cards,
    questions,
    lessons: perLesson,
  };
}

/** A subject's introduction (subject.md's text), rendered like a lesson's. */
export async function renderOverview(subject: Subject): Promise<string> {
  if (!subject.overview) return "";
  const renderer = await rendererFor(subject.slug);
  const output = renderer.render({
    number: "0",
    title: subject.title,
    body: subject.overview,
  });
  if (output.errors.length > 0)
    throw new Error(
      `study/${subject.slug}/subject.md has problems:\n- ${output.errors.join("\n- ")}`,
    );
  return output.html;
}
