/**
 * The study records API, for signed-in people (packages/study's client store calls
 * it; signed out, records stay in the browser):
 *   GET  /api/study           → { signedIn: true, events, settings } (settings: null if
 *                               never set), or { signedIn: false } (the page then keeps
 *                               records in the browser; a 200, so it's no console error)
 *   POST /api/study/events    { events: [...] } → { saved }
 *   PUT  /api/study/settings  { settings } → { settings }
 * Every event and setting is checked (parseEvent, parseSettings); changes only come
 * from this site's pages. Errors are { error: "<message for people>" }. Never cached.
 */
import type { Database, User } from "@trilleo/db";
import {
  STUDY_LIMITS,
  parseEvent,
  parseSettings,
  type StudyEvent,
} from "@trilleo/study";
import {
  getStudySettings,
  listStudyEvents,
  putStudySettings,
  saveStudyEvents,
} from "./records";

export interface StudyRequest {
  request: Request;
  url: URL;
  user: User | null;
  /** What follows /api/study/: "", "events" or "settings". */
  path: string;
  getDb: () => Promise<Database>;
  now?: Date;
}

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: HEADERS });
}

function problem(status: number, error: string, allow?: string): Response {
  return Response.json(
    { error },
    { status, headers: { ...HEADERS, ...(allow && { Allow: allow }) } },
  );
}

/** A JSON body of at most `limit` characters, or a Response saying what's wrong. */
async function readJson(request: Request, limit: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return problem(415, "Send JSON.");
  const text = await request.text();
  if (text.length > limit) return problem(413, "That’s too much at once.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return problem(400, "That isn’t valid JSON.");
  }
}

/** Generous for 500 events with answers. */
const BODY_LIMIT = STUDY_LIMITS.perRequest * (STUDY_LIMITS.response + 400);

export async function handleStudy(input: StudyRequest): Promise<Response> {
  const { request, url, user, path } = input;
  const method = request.method;
  if (!["", "events", "settings"].includes(path))
    return problem(404, "Not found.");
  if (path === "" && method === "GET" && !user)
    return json({ signedIn: false });
  if (!user)
    return problem(401, "Sign in to keep your progress in your account.");

  if (path === "") {
    if (method !== "GET") return problem(405, "Not allowed.", "GET");
    const db = await input.getDb();
    return json({
      signedIn: true,
      events: await listStudyEvents(db, user.id),
      settings: await getStudySettings(db, user.id),
    });
  }

  const allowed = path === "events" ? "POST" : "PUT";
  if (method !== allowed) return problem(405, "Not allowed.", allowed);
  // Only this site's own pages may change records.
  if (request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  const body = await readJson(request, BODY_LIMIT);
  if (body instanceof Response) return body;
  if (typeof body !== "object" || body === null)
    return problem(400, "Send an object.");

  if (path === "settings") {
    const settings = parseSettings((body as { settings?: unknown }).settings);
    if (!settings) return problem(422, "Those settings aren’t valid.");
    await putStudySettings(await input.getDb(), user.id, settings);
    return json({ settings });
  }

  const raw = (body as { events?: unknown }).events;
  if (!Array.isArray(raw)) return problem(400, 'Send { "events": [...] }.');
  if (raw.length > STUDY_LIMITS.perRequest)
    return problem(
      413,
      `Send at most ${String(STUDY_LIMITS.perRequest)} at once.`,
    );
  const now = input.now ?? new Date();
  const events: StudyEvent[] = [];
  for (const entry of raw) {
    const event = parseEvent(entry, now);
    if (!event) return problem(422, "One of those records isn’t valid.");
    events.push(event);
  }
  const result = await saveStudyEvents(await input.getDb(), user.id, events);
  if (!result.ok)
    return problem(
      422,
      `Your account holds up to ${String(STUDY_LIMITS.perPerson)} study records.`,
    );
  return json({ saved: result.saved });
}
