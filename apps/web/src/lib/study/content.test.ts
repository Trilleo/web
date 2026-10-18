import { lessonsOf } from "@trilleo/study";
import { describe, expect, it } from "vitest";
import {
  renderLesson,
  showDrafts,
  studySubjects,
  subjectReference,
} from "./content";

describe("study content", () => {
  it("shows drafts outside production builds", () => {
    expect(showDrafts()).toBe(true);
    expect(studySubjects().map((subject) => subject.slug)).toContain("sample");
  });

  it("renders every lesson of every subject without problems", async () => {
    for (const subject of studySubjects())
      for (const lesson of lessonsOf(subject)) {
        const rendered = await renderLesson(lesson);
        expect(rendered.errors).toEqual([]);
      }
  });

  it("gathers a subject's glossary, formulas and counts", async () => {
    const sample = studySubjects().find((subject) => subject.slug === "sample");
    if (!sample) throw new Error("no sample");
    const reference = await subjectReference(sample);
    expect(reference.formulas.map((formula) => formula.number)).toEqual([
      "1.1.1",
      "1.2.1",
      "1.2.2",
      "2.1.1",
    ]);
    expect(
      reference.glossary.find((entry) => entry.term === "Resistance"),
    ).toMatchObject({
      zh: "电阻",
      lesson: "ohms-law",
      anchor: "def-resistance",
    });
    expect(reference.questions).toBe(10);
    expect(reference.lessons.get("kirchhoff")?.cards).toBe(3);
  });
});
