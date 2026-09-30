/**
 * The Skygrid API, for signed-in players (the browser game runs without it):
 *   POST /api/games/skygrid/import  { state: GameState | null }
 *     → 201 { state, version, serverTime }: the account's first island, new
 *       (null) or brought from this browser (capped: nobody could check it).
 *       409 with the existing island if there is one.
 *   POST /api/games/skygrid/sync    { version, actions: Action[] }
 *     → 200 { version, serverTime }; 409 (another tab played) and 422 (an action
 *       broke a rule) come with { error, state, version } to carry on from.
 * Errors are { error: "<message for people>" }. Never cached.
 */
import type { Database, User } from "@trilleo/db";
import {
  newGame,
  parseActions,
  parseSave,
  prepareImport,
} from "@trilleo/game-skygrid/core";
import {
  SYNC_MAX_ACTIONS,
  startSkygridSave,
  syncSkygridSave,
  type AccountSave,
} from "./store";

export type SkygridEndpoint = "import" | "sync";

export interface SkygridRequest {
  request: Request;
  url: URL;
  user: User | null;
  endpoint: SkygridEndpoint;
  getDb: () => Promise<Database>;
  now?: () => number;
  seed?: () => number;
}

/** Bodies bigger than this are refused unread (a save is a few KB). */
export const MAX_BODY_BYTES = 128 * 1024;

const HEADERS = { "Cache-Control": "no-store" };

function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: { ...HEADERS, ...extra } });
}

function problem(status: number, error: string, extra: object = {}): Response {
  return json({ error, ...extra }, status);
}

function randomSeed(): number {
  return crypto.getRandomValues(new Int32Array(1))[0] ?? 0;
}

function withSave(save: AccountSave, serverTime: number) {
  return { state: save.state, version: save.version, serverTime };
}

async function readBody(request: Request): Promise<object | Response> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return problem(415, "Send JSON.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return problem(413, "That’s too much at once.");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem(400, "That isn’t valid JSON.");
  }
  return typeof body === "object" && body !== null
    ? body
    : problem(400, "Send a JSON object.");
}

async function importSave(
  input: SkygridRequest,
  user: User,
  body: object,
  now: number,
): Promise<Response> {
  if (!("state" in body)) return problem(400, 'Send { "state": … }.');
  const seed = (input.seed ?? randomSeed)();
  let state;
  if (body.state === null) {
    state = newGame(seed, now);
  } else {
    const parsed = parseSave(body.state);
    if (!parsed) return problem(422, "That isn’t a Skygrid save.");
    state = prepareImport(parsed, now, seed);
  }
  const db = await input.getDb();
  const result = await startSkygridSave(db, user.id, state, new Date(now));
  return result.ok
    ? json(withSave(result.save, now), 201)
    : problem(
        409,
        "You already have an island in your account.",
        withSave(result.save, now),
      );
}

async function sync(
  input: SkygridRequest,
  user: User,
  body: object,
  now: number,
): Promise<Response> {
  const version = "version" in body ? body.version : undefined;
  const actions = parseActions(
    "actions" in body ? body.actions : undefined,
    SYNC_MAX_ACTIONS,
  );
  if (
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    !actions
  ) {
    return problem(400, 'Send { "version": …, "actions": […] }.');
  }
  const db = await input.getDb();
  const result = await syncSkygridSave(db, user.id, { version, actions }, now);
  if (result.ok) return json({ version: result.version, serverTime: now });
  switch (result.error) {
    case "no-save":
      return problem(404, "There’s no island in your account yet.");
    case "conflict":
      return problem(
        409,
        "Your island changed in another tab.",
        withSave(result.save, now),
      );
    case "rejected":
      return problem(422, result.message, withSave(result.save, now));
  }
}

export async function handleSkygrid(input: SkygridRequest): Promise<Response> {
  const { request, url, user } = input;
  if (request.method !== "POST") {
    return json({ error: "Not allowed." }, 405, { Allow: "POST" });
  }
  if (!user) return problem(401, "Sign in to save to your account.");
  // Only this site's own pages may change a save.
  if (request.headers.get("origin") !== url.origin) {
    return problem(403, "Changes can only come from this site.");
  }
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const now = (input.now ?? Date.now)();
  return input.endpoint === "import"
    ? importSave(input, user, body, now)
    : sync(input, user, body, now);
}
