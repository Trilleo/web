import type { APIRoute } from "astro";
import { studySubjects } from "../../../lib/study/content";

/** Which subjects have decks (/study/decks/<subject>.json), in order. */
export const GET: APIRoute = () =>
  Response.json({
    subjects: studySubjects().map((subject) => subject.slug),
  });
