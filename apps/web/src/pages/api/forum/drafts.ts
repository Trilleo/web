import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import {
  deleteDraft,
  getDraft,
  isDraftKey,
  saveDraft,
} from "../../../lib/forum/drafts";

export const prerender = false;

const HEADERS = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: HEADERS });

/**
 * The signed-in person's draft for one place (`key`: "topic:<forum>" or
 * "reply:<topic>"). GET reads it, PUT ({key, title, body}) saves it, DELETE
 * (?key=) drops it. Writes must come from this site.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  const key = url.searchParams.get("key") ?? "";
  if (!isDraftKey(key)) return json({ error: "No such place." }, 400);
  const draft = await getDraft(await getDb(), locals.user.id, key);
  return json(
    draft
      ? { title: draft.title, body: draft.body, updatedAt: draft.updatedAt }
      : null,
  );
};

export const PUT: APIRoute = async ({ locals, request, url }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  if (request.headers.get("origin") !== url.origin)
    return json({ error: "Not from this site." }, 403);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Not JSON." }, 400);
  }
  const record =
    input !== null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const key = typeof record.key === "string" ? record.key : "";
  const title = typeof record.title === "string" ? record.title : "";
  const body = typeof record.body === "string" ? record.body : "";
  const saved = await saveDraft(await getDb(), locals.user.id, {
    key,
    title,
    body,
  });
  return saved ? json({ saved: true }) : json({ error: "No such place." }, 400);
};

export const DELETE: APIRoute = async ({ locals, request, url }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  if (request.headers.get("origin") !== url.origin)
    return json({ error: "Not from this site." }, 403);
  const key = url.searchParams.get("key") ?? "";
  if (!isDraftKey(key)) return json({ error: "No such place." }, 400);
  await deleteDraft(await getDb(), locals.user.id, key);
  return json({ deleted: true });
};
