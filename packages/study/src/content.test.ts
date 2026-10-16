import { describe, expect, test } from "vitest";
import {
  daysLabel,
  daysUntil,
  findLesson,
  loadSubjects,
  neighbours,
  readingMinutes,
  StudyContentError,
} from "./content";
import { parseFrontMatter } from "./front-matter";

const SUBJECT = `---
title: Circuits
zh: 电路
summary: The course.
exams:
  - 2027-01-12 | Final
  - 2026-11-20 | Midterm
---
Overview.`;

const unit = (title: string) => `---\ntitle: ${title}\n---\n`;
const lesson = (title: string) =>
  `---\ntitle: ${title}\nsummary: About ${title}.\n---\nText.`;

function errorsOf(files: Record<string, string>): readonly string[] {
  try {
    loadSubjects(files);
  } catch (error) {
    if (error instanceof StudyContentError) return error.problems;
    throw error;
  }
  return [];
}

describe("parseFrontMatter", () => {
  test("reads fields, lists and quotes", () => {
    const { data, body } = parseFrontMatter(
      '---\ntitle: "A: B"\nitems:\n  - one\n  - two\nempty:\n---\nBody\n',
    );
    expect(data).toEqual({ title: "A: B", items: ["one", "two"], empty: [] });
    expect(body).toBe("Body\n");
  });

  test("leaves files without front matter alone", () => {
    expect(parseFrontMatter("Just text")).toEqual({
      data: {},
      body: "Just text",
    });
  });
});

describe("loadSubjects", () => {
  const files = {
    "circuits/subject.md": SUBJECT,
    "circuits/01-dc/unit.md": unit("DC"),
    "circuits/01-dc/01-ohm.md": lesson("Ohm"),
    "circuits/01-dc/02-power.md": lesson("Power"),
    "circuits/02-ac/unit.md": unit("AC"),
    "circuits/02-ac/01-phasors.md": lesson("Phasors"),
    "circuits/figures/bridge.webp": "",
  };

  test("orders and numbers units and lessons", () => {
    const [subject] = loadSubjects(files);
    expect(subject?.title).toBe("Circuits");
    expect(subject?.exams.map((exam) => exam.name)).toEqual([
      "Midterm",
      "Final",
    ]);
    expect(subject?.units.map((entry) => entry.slug)).toEqual(["dc", "ac"]);
    expect(
      subject?.units.flatMap((entry) =>
        entry.lessons.map((item) => `${item.number} ${item.slug}`),
      ),
    ).toEqual(["1.1 ohm", "1.2 power", "2.1 phasors"]);
    if (!subject) return;
    const power = findLesson(subject, "power");
    if (!power) throw new Error("missing");
    expect(neighbours(subject, power).next?.slug).toBe("phasors");
    expect(neighbours(subject, power).previous?.slug).toBe("ohm");
  });

  test("leaves drafts out unless asked", () => {
    const draft = {
      ...files,
      "circuits/subject.md": SUBJECT.replace(
        "summary:",
        "draft: true\nsummary:",
      ),
    };
    expect(loadSubjects(draft)).toEqual([]);
    expect(loadSubjects(draft, { drafts: true })).toHaveLength(1);
  });

  test("reports every problem at once", () => {
    const problems = errorsOf({
      "circuits/subject.md": SUBJECT.replace(
        "title: Circuits\n",
        "titel: Circuits\n",
      ),
      "circuits/01-dc/01-ohm.md": lesson("Ohm"),
      "circuits/02-ac/unit.md": unit("AC"),
      "circuits/02-ac/01-glossary.md": lesson("Glossary"),
      "circuits/02-ac/02-ohm.md": "---\ntitle: Again\n---\n",
      "circuits/notes.md": "",
      "Bad Name/subject.md": SUBJECT,
      "review/subject.md": SUBJECT,
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/unknown field “titel”/),
        expect.stringMatching(/“title” is missing/),
        expect.stringMatching(/01-dc\/unit.md is missing/),
        expect.stringMatching(/one of the subject's own pages/),
        expect.stringMatching(/“summary” is missing/),
        expect.stringMatching(/notes.md: lessons live in unit folders/),
        expect.stringMatching(/Bad Name/),
        expect.stringMatching(
          /“review” is one of the study section's own pages/,
        ),
      ]),
    );
  });

  test("refuses two lessons with one slug", () => {
    expect(
      errorsOf({ ...files, "circuits/02-ac/02-ohm.md": lesson("Again") }),
    ).toEqual([expect.stringMatching(/also called “ohm”/)]);
  });

  test("checks exam dates", () => {
    expect(
      errorsOf({
        ...files,
        "circuits/subject.md": SUBJECT.replace(
          "2027-01-12 | Final",
          "next week | Final",
        ),
      }),
    ).toEqual([expect.stringMatching(/YYYY-MM-DD/)]);
  });
});

test("readingMinutes counts words, Chinese and maths", () => {
  expect(readingMinutes("word ".repeat(320))).toBe(2);
  expect(readingMinutes("")).toBe(1);
});

test("daysUntil counts days in China's time zone", () => {
  // 23:30 on 10 Jan in Beijing is still 10 Jan there.
  expect(daysUntil("2027-01-12", new Date("2027-01-10T15:30:00Z"))).toBe(2);
  expect(daysUntil("2027-01-12", new Date("2027-01-11T16:30:00Z"))).toBe(0);
  expect(daysUntil("2027-01-12", new Date("2027-01-13T05:00:00Z"))).toBe(-1);
  expect([-1, 0, 1, 12].map(daysLabel)).toEqual([
    "past",
    "today",
    "tomorrow",
    "in 12 days",
  ]);
});
