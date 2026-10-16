import { findSubject } from "@trilleo/study";
import type { APIRoute, GetStaticPaths } from "astro";
import { studySubjects, subjectDeck } from "../../../lib/study/content";

export const getStaticPaths = (() =>
  studySubjects().map((subject) => ({
    params: { subject: subject.slug },
  }))) satisfies GetStaticPaths;

/** A subject's cards and questions for the study pages' widgets (built with the site). */
export const GET: APIRoute = async ({ params }) => {
  const subject = findSubject(studySubjects(), params.subject);
  if (!subject) return new Response("Not found", { status: 404 });
  return Response.json(await subjectDeck(subject));
};
