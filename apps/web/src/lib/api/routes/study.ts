/** The Study group: the study section's subjects and their lessons (study/). Public. */
import { studyPath, type Subject } from "@trilleo/study";
import { studySubjects } from "../../study/content";
import { SITE_URL } from "../../site";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const absolute = (path: string) => new URL(path, SITE_URL).href;

const subjectFields = {
  slug: t.string(),
  title: t.string(),
  zh: t.nullable(t.string({ description: "Its Chinese name." })),
  summary: t.string(),
  teacher: t.nullable(t.string()),
  course: t.nullable(
    t.string({ description: "The course as the school names it." }),
  ),
  term: t.nullable(t.string()),
  url: t.string({ format: "uri" }),
  lessons: t.integer({ description: "How many lessons it has." }),
  exams: t.array(t.object({ date: t.date(), name: t.string() })),
};

function summaryOf(subject: Subject) {
  return {
    slug: subject.slug,
    title: subject.title,
    zh: subject.zh,
    summary: subject.summary,
    teacher: subject.teacher,
    course: subject.course,
    term: subject.term,
    url: absolute(studyPath(subject.slug)),
    lessons: subject.units.reduce(
      (total, unit) => total + unit.lessons.length,
      0,
    ),
    exams: subject.exams.map((exam) => ({ date: exam.date, name: exam.name })),
  };
}

const EXAMPLE_SUBJECT = {
  slug: "circuits",
  title: "Circuit Analysis",
  zh: "电路分析",
  summary: "DC and AC circuits, from Ohm's law to Laplace transforms.",
  teacher: null,
  course: null,
  term: "Autumn 2026",
  url: "https://www.trilleo.net/study/circuits/",
  lessons: 24,
  exams: [{ date: "2027-01-08", name: "Final exam" }],
};

export const listStudySubjects = defineRoute({
  method: "GET",
  path: "/v1/study/subjects",
  operationId: "listStudySubjects",
  group: "study",
  summary: "List subjects",
  description: "The study section's subjects, in the site's order.",
  auth: "public",
  cacheSeconds: 3600,
  response: t.object({ items: t.array(t.object(subjectFields)) }),
  example: { response: { items: [EXAMPLE_SUBJECT] } },
  handler: () => ({ items: studySubjects().map(summaryOf) }),
});

export const getStudySubject = defineRoute({
  method: "GET",
  path: "/v1/study/subjects/{slug}",
  operationId: "getStudySubject",
  group: "study",
  summary: "Get a subject's contents",
  description:
    "A subject with its units and lessons (titles, summaries and addresses; the lessons themselves are on the site).",
  auth: "public",
  cacheSeconds: 3600,
  params: t.object({ slug: t.string({ min: 1, max: 100 }) }),
  response: t.object({
    ...subjectFields,
    units: t.array(
      t.object({
        number: t.string({ description: '"2"' }),
        title: t.string(),
        zh: t.nullable(t.string()),
        summary: t.nullable(t.string()),
        lessons: t.array(
          t.object({
            number: t.string({ description: '"2.3"' }),
            slug: t.string(),
            title: t.string(),
            zh: t.nullable(t.string()),
            summary: t.string(),
            minutes: t.integer({
              description: "About how long it takes to read.",
            }),
            url: t.string({ format: "uri" }),
          }),
        ),
      }),
    ),
  }),
  errors: ["not_found"],
  example: {
    params: { slug: "circuits" },
    response: {
      ...EXAMPLE_SUBJECT,
      units: [
        {
          number: "1",
          title: "Basics",
          zh: "基础",
          summary: null,
          lessons: [
            {
              number: "1.1",
              slug: "ohms-law",
              title: "Ohm's law",
              zh: "欧姆定律",
              summary: "Voltage, current and resistance.",
              minutes: 12,
              url: "https://www.trilleo.net/study/circuits/ohms-law/",
            },
          ],
        },
      ],
    },
  },
  handler: ({ params }) => {
    const subject = studySubjects().find((entry) => entry.slug === params.slug);
    if (!subject) throw new ApiError("not_found", "There's no such subject.");
    return {
      ...summaryOf(subject),
      units: subject.units.map((unit) => ({
        number: unit.number,
        title: unit.title,
        zh: unit.zh,
        summary: unit.summary,
        lessons: unit.lessons.map((lesson) => ({
          number: lesson.number,
          slug: lesson.slug,
          title: lesson.title,
          zh: lesson.zh,
          summary: lesson.summary,
          minutes: lesson.minutes,
          url: absolute(studyPath(subject.slug, lesson.slug)),
        })),
      })),
    };
  },
});
