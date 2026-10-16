/**
 * Study content: subjects written as files in the repository's study/ folder.
 *
 *   study/<subject>/subject.md                   the subject (front matter + overview)
 *   study/<subject>/<NN>-<unit>/unit.md          a unit (chapter)
 *   study/<subject>/<NN>-<unit>/<NN>-<lesson>.md  a lesson
 *   study/<subject>/figures/<file>               pictures lessons show
 *
 * The numbers only order things (and number them: lesson 2.3); slugs come from the
 * rest of the name. `loadSubjects` reads the files (paths relative to study/) and
 * checks everything it can without rendering: a mistake throws, listing every
 * problem, so a broken subject fails the build instead of showing up broken.
 */
import { parseFrontMatter, type FrontMatter } from "./front-matter";

export interface Exam {
  /** YYYY-MM-DD. */
  date: string;
  name: string;
}

export interface Subject {
  slug: string;
  title: string;
  /** The Chinese name, shown beside the English one. */
  zh: string | null;
  summary: string;
  teacher: string | null;
  /** The course as the school names it (code, class). */
  course: string | null;
  term: string | null;
  /** Where the materials came from ("Rain Classroom"). */
  source: string | null;
  exams: Exam[];
  /** Shown only in development and tests. */
  draft: boolean;
  order: number;
  /** Markdown under the front matter: the subject's introduction. */
  overview: string;
  units: Unit[];
}

export interface Unit {
  slug: string;
  /** "2" */
  number: string;
  title: string;
  zh: string | null;
  summary: string | null;
  lessons: Lesson[];
}

export interface Lesson {
  subject: string;
  unit: string;
  slug: string;
  /** "2.3" */
  number: string;
  title: string;
  zh: string | null;
  summary: string;
  /** The lecture or chapter it's based on. */
  source: string | null;
  body: string;
  /** Rough reading time, in minutes. */
  minutes: number;
}

export class StudyContentError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `Study content has ${String(problems.length)} problem(s):\n- ${problems.join("\n- ")}`,
    );
  }
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMBERED = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
/** The study section's own pages: subjects can't take these slugs. */
export const RESERVED_SUBJECT_SLUGS = new Set(["review", "mistakes", "decks"]);

/** A subject's own pages: lessons can't take these slugs. */
export const RESERVED_LESSON_SLUGS = new Set([
  "glossary",
  "formulas",
  "review",
  "practice",
  "mistakes",
  "units",
  "figures",
]);

const SUBJECT_KEYS = new Set([
  "title",
  "zh",
  "summary",
  "teacher",
  "course",
  "term",
  "source",
  "exams",
  "draft",
  "order",
]);
const UNIT_KEYS = new Set(["title", "zh", "summary"]);
const LESSON_KEYS = new Set(["title", "zh", "summary", "source"]);

/** Words per minute for reading time; maths and exercises are slow going. */
const READING_SPEED = 160;

export function readingMinutes(body: string): number {
  const latin = body.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const han = body.match(/\p{Script=Han}/gu)?.length ?? 0;
  const math = body.match(/\$/g)?.length ?? 0;
  // Two characters of Chinese read like a word; each formula costs a few words.
  return Math.max(1, Math.round((latin + han / 2 + math * 2) / READING_SPEED));
}

class Reader {
  readonly problems: string[] = [];

  constructor(
    private readonly file: string,
    private readonly data: FrontMatter,
    allowed: ReadonlySet<string>,
  ) {
    for (const key of Object.keys(data))
      if (!allowed.has(key))
        this.problems.push(`${file}: unknown field “${key}”.`);
  }

  text(key: string, required: true): string;
  text(key: string, required?: false): string | null;
  text(key: string, required = false): string | null {
    const raw = this.data[key];
    // "key:" with nothing after it reads as an empty list.
    const value = Array.isArray(raw) && raw.length === 0 ? undefined : raw;
    if (Array.isArray(value)) {
      this.problems.push(
        `${this.file}: “${key}” should be one line, not a list.`,
      );
      return null;
    }
    if (value === undefined || value === "") {
      if (required) this.problems.push(`${this.file}: “${key}” is missing.`);
      return required ? "" : null;
    }
    return value;
  }

  list(key: string): string[] {
    const value = this.data[key];
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }
}

function parseExams(file: string, lines: string[], problems: string[]): Exam[] {
  return lines.flatMap((line) => {
    const [date = "", ...name] = line.split("|").map((part) => part.trim());
    const valid =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
    if (!valid || name.join("|") === "") {
      problems.push(
        `${file}: exams are written “YYYY-MM-DD | Name” (got “${line}”).`,
      );
      return [];
    }
    return [{ date, name: name.join(" | ") }];
  });
}

/**
 * Subjects from their files: `files` maps paths relative to study/
 * ("circuits/01-dc/02-kcl.md") to their text. Drafts are left out unless asked for.
 */
export function loadSubjects(
  files: Readonly<Record<string, string>>,
  { drafts = false }: { drafts?: boolean } = {},
): Subject[] {
  const problems: string[] = [];
  const bySubject = new Map<string, Map<string, string>>();
  for (const [path, text] of Object.entries(files)) {
    const parts = path.split("/");
    const subject = parts[0] ?? "";
    if (parts.length < 2 || !SLUG.test(subject)) {
      problems.push(`${path}: subjects are folders named like “circuits”.`);
      continue;
    }
    if (RESERVED_SUBJECT_SLUGS.has(subject)) {
      problems.push(
        `${subject}/: “${subject}” is one of the study section's own pages; pick another name.`,
      );
      continue;
    }
    if (parts[1] === "figures" || !path.endsWith(".md")) continue;
    if (!bySubject.has(subject)) bySubject.set(subject, new Map());
    bySubject.get(subject)?.set(parts.slice(1).join("/"), text);
  }

  const subjects: Subject[] = [];
  for (const [slug, subjectFiles] of bySubject) {
    const subjectFile = subjectFiles.get("subject.md");
    if (subjectFile === undefined) {
      problems.push(`${slug}/: subject.md is missing.`);
      continue;
    }
    const { data, body } = parseFrontMatter(subjectFile);
    const reader = new Reader(`${slug}/subject.md`, data, SUBJECT_KEYS);
    const draftText = reader.text("draft");
    const orderText = reader.text("order");
    const subject: Subject = {
      slug,
      title: reader.text("title", true),
      zh: reader.text("zh"),
      summary: reader.text("summary", true),
      teacher: reader.text("teacher"),
      course: reader.text("course"),
      term: reader.text("term"),
      source: reader.text("source"),
      exams: parseExams(
        `${slug}/subject.md`,
        reader.list("exams"),
        problems,
      ).sort((a, b) => a.date.localeCompare(b.date)),
      draft: draftText === "true",
      order: orderText === null ? 100 : Number(orderText),
      overview: body.trim(),
      units: [],
    };
    if (draftText !== null && draftText !== "true" && draftText !== "false")
      problems.push(`${slug}/subject.md: draft is true or false.`);
    if (!Number.isFinite(subject.order))
      problems.push(`${slug}/subject.md: order is a number.`);
    problems.push(...reader.problems);

    // Units and lessons, ordered by their numbers.
    const unitDirs = new Map<string, Map<string, string>>();
    for (const [path, text] of subjectFiles) {
      if (path === "subject.md") continue;
      const [dir = "", file, ...deeper] = path.split("/");
      if (!file || deeper.length > 0 || !NUMBERED.test(dir)) {
        problems.push(
          `${slug}/${path}: lessons live in unit folders named like “01-dc-circuits”.`,
        );
        continue;
      }
      if (!unitDirs.has(dir)) unitDirs.set(dir, new Map());
      unitDirs.get(dir)?.set(file, text);
    }
    const lessonSlugs = new Set<string>();
    const unitSlugs = new Set<string>();
    for (const dir of [...unitDirs.keys()].sort()) {
      const [, numberText = "", unitSlug = ""] = NUMBERED.exec(dir) ?? [];
      const unitNumber = String(Number(numberText));
      const unitFiles = unitDirs.get(dir) ?? new Map<string, string>();
      if (unitSlugs.has(unitSlug))
        problems.push(
          `${slug}/${dir}: another unit is also called “${unitSlug}”.`,
        );
      unitSlugs.add(unitSlug);
      const unitText = unitFiles.get("unit.md");
      if (unitText === undefined) {
        problems.push(`${slug}/${dir}/unit.md is missing.`);
        continue;
      }
      const unitMatter = parseFrontMatter(unitText);
      const unitReader = new Reader(
        `${slug}/${dir}/unit.md`,
        unitMatter.data,
        UNIT_KEYS,
      );
      const unit: Unit = {
        slug: unitSlug,
        number: unitNumber,
        title: unitReader.text("title", true),
        zh: unitReader.text("zh"),
        summary: unitReader.text("summary"),
        lessons: [],
      };
      problems.push(...unitReader.problems);
      const seenNumbers = new Set<string>();
      for (const file of [...unitFiles.keys()].sort()) {
        if (file === "unit.md") continue;
        const where = `${slug}/${dir}/${file}`;
        const match = NUMBERED.exec(file.replace(/\.md$/, ""));
        if (!match || !file.endsWith(".md")) {
          problems.push(`${where}: lessons are named like “02-ohms-law.md”.`);
          continue;
        }
        const [, lessonNumberText = "", lessonSlug = ""] = match;
        const lessonNumber = `${unitNumber}.${String(Number(lessonNumberText))}`;
        if (seenNumbers.has(lessonNumber))
          problems.push(
            `${where}: another lesson is also numbered ${lessonNumber}.`,
          );
        seenNumbers.add(lessonNumber);
        if (lessonSlugs.has(lessonSlug))
          problems.push(
            `${where}: another lesson in ${slug} is also called “${lessonSlug}”.`,
          );
        if (RESERVED_LESSON_SLUGS.has(lessonSlug))
          problems.push(
            `${where}: “${lessonSlug}” is one of the subject's own pages; pick another name.`,
          );
        lessonSlugs.add(lessonSlug);
        const lessonMatter = parseFrontMatter(unitFiles.get(file) ?? "");
        const lessonReader = new Reader(where, lessonMatter.data, LESSON_KEYS);
        unit.lessons.push({
          subject: slug,
          unit: unitSlug,
          slug: lessonSlug,
          number: lessonNumber,
          title: lessonReader.text("title", true),
          zh: lessonReader.text("zh"),
          summary: lessonReader.text("summary", true),
          source: lessonReader.text("source"),
          body: lessonMatter.body,
          minutes: readingMinutes(lessonMatter.body),
        });
        problems.push(...lessonReader.problems);
      }
      subject.units.push(unit);
    }
    if (drafts || !subject.draft) subjects.push(subject);
  }

  if (problems.length > 0) throw new StudyContentError(problems);
  return subjects.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

/** Every lesson of a subject, in order. */
export function lessonsOf(subject: Subject): Lesson[] {
  return subject.units.flatMap((unit) => unit.lessons);
}

export function findSubject(
  subjects: readonly Subject[],
  slug: string | undefined,
): Subject | undefined {
  return subjects.find((subject) => subject.slug === slug);
}

export function findLesson(
  subject: Subject,
  slug: string | undefined,
): Lesson | undefined {
  return lessonsOf(subject).find((lesson) => lesson.slug === slug);
}

/** The lessons before and after one, across units. */
export function neighbours(
  subject: Subject,
  lesson: Lesson,
): { previous: Lesson | null; next: Lesson | null } {
  const all = lessonsOf(subject);
  const index = all.findIndex((entry) => entry.slug === lesson.slug);
  return { previous: all[index - 1] ?? null, next: all[index + 1] ?? null };
}

export function studyPath(subject?: string, lesson?: string): string {
  if (!subject) return "/study/";
  return lesson ? `/study/${subject}/${lesson}/` : `/study/${subject}/`;
}

export { daysUntil, daysLabel } from "./dates";
