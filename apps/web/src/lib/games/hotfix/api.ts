/**
 * The Hotfix API, for signed-in players (the game runs without it, unchecked):
 *   POST /api/games/hotfix/runs    { mode: "endless" | "daily" }
 *     → 201 { id, seed, mode, day }: a ticket for the next run.
 *   POST /api/games/hotfix/finish  { ticket, inputs: number[] (packInputs) }
 *     → 200 { result, cause, mode, newBest, unlocked, player }: the run as the
 *       server's replay saw it. 404 for a ticket that's unknown or used, 422 for a
 *       log that doesn't end in a crash in the time since the ticket.
 *   POST /api/games/hotfix/look    { accessory: id | null }
 *     → 200 { accessory }; 403 if it isn't unlocked.
 * Errors are { error: "<message for people>" }. Never cached.
 */
import type { Database, User } from "@trilleo/db";
import {
  isAccessory,
  isRunMode,
  unpackInputs,
} from "@trilleo/game-hotfix/core";
import { json, problem, readChange } from "../skygrid/api";
import { finishRun, issueTicket, setAccessory } from "./store";

export type HotfixEndpoint = "runs" | "finish" | "look";

export interface HotfixRequest {
  request: Request;
  url: URL;
  user: User | null;
  endpoint: HotfixEndpoint;
  getDb: () => Promise<Database>;
  now?: () => number;
  seed?: () => number;
}

async function runs(
  input: HotfixRequest,
  user: User,
  body: object,
  now: number,
) {
  const mode = "mode" in body ? body.mode : undefined;
  if (!isRunMode(mode))
    return problem(400, 'Send { "mode": "endless" | "daily" }.');
  const ticket = await issueTicket(
    await input.getDb(),
    user.id,
    mode,
    now,
    input.seed,
  );
  return json(ticket, 201);
}

async function finish(
  input: HotfixRequest,
  user: User,
  body: object,
  now: number,
) {
  const ticket = "ticket" in body ? body.ticket : undefined;
  const inputs = unpackInputs("inputs" in body ? body.inputs : undefined);
  if (
    typeof ticket !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(ticket) ||
    !inputs
  ) {
    return problem(400, 'Send { "ticket": …, "inputs": […] }.');
  }
  const outcome = await finishRun(
    await input.getDb(),
    user.id,
    ticket,
    inputs,
    now,
  );
  if (outcome.ok) {
    const { result, cause, mode, newBest, unlocked, player } = outcome;
    return json({ result, cause, mode, newBest, unlocked, player });
  }
  return outcome.error === "unknown-ticket"
    ? problem(404, "That run was already counted, or is too old.")
    : problem(422, "That run doesn’t add up, so it wasn’t counted.");
}

async function look(
  input: HotfixRequest,
  user: User,
  body: object,
  now: number,
) {
  const accessory = "accessory" in body ? body.accessory : undefined;
  if (accessory !== null && !isAccessory(accessory)) {
    return problem(400, 'Send { "accessory": … }.');
  }
  const done = await setAccessory(await input.getDb(), user.id, accessory, now);
  return done
    ? json({ accessory })
    : problem(403, "Earn its achievement first.");
}

export async function handleHotfix(input: HotfixRequest): Promise<Response> {
  const change = await readChange(input);
  if (change instanceof Response) return change;
  const { body, user } = change;
  const now = (input.now ?? Date.now)();
  switch (input.endpoint) {
    case "runs":
      return runs(input, user, body, now);
    case "finish":
      return finish(input, user, body, now);
    case "look":
      return look(input, user, body, now);
  }
}
