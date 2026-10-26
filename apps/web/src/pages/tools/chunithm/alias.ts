import type { APIRoute } from "astro";
import { isDifficulty } from "@trilleo/chunithm";
import { signInHref } from "@trilleo/tool-kit";
import { isAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import {
  addAlias,
  decideSuggestion,
  removeAlias,
  suggestAlias,
  type AliasResult,
} from "../../../lib/chunithm/aliases";
import { field, parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";

export const prerender = false;

/** What the admin's buttons on a chart page do, and the answer each gives back. */
const ADMIN_INTENTS = {
  add: "added",
  remove: "removed",
  approve: "approved",
  decline: "declined",
} as const;
type AdminIntent = keyof typeof ADMIN_INTENTS;

function isAdminIntent(intent: string): intent is AdminIntent {
  return intent in ADMIN_INTENTS;
}

/**
 * POST /tools/chunithm/alias, from a chart page's forms (no JavaScript needed).
 * Someone signed in suggests a name for a song; the admin (`intent`) adds one
 * directly, removes one, or approves or declines a waiting suggestion. Back to the
 * page with ?alias=sent (or added, removed, approved, declined), or ?alias=<error>
 * (lib/chunithm/aliases.ts ALIAS_ERRORS).
 */
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const songId = parseId(field(form, "song"));
  const difficulty = field(form, "difficulty");
  const intent = field(form, "intent") || "suggest";
  const back =
    songId !== null && isDifficulty(difficulty)
      ? `/tools/chunithm/${String(songId)}/${difficulty}/`
      : "/tools/chunithm/";
  const { user } = context.locals;
  if (!user) return noStoreRedirect(signInHref(back), 303);
  if (songId === null) return noStoreRedirect(back, 303);
  const db = await getDb();
  const answer = (result: AliasResult<unknown>, done: string) =>
    noStoreRedirect(
      `${back}?alias=${result.ok ? done : result.error}#names`,
      303,
    );

  if (isAdminIntent(intent)) {
    if (!isAdmin(user))
      return new Response("Only the admin can do that.", { status: 403 });
    const done = ADMIN_INTENTS[intent];
    if (intent === "add")
      return answer(await addAlias(db, songId, field(form, "alias")), done);
    const id = parseId(field(form, "id"));
    if (intent === "remove") {
      if (id !== null) await removeAlias(db, id);
      return answer({ ok: true, value: undefined }, done);
    }
    if (id === null) return answer({ ok: false, error: "decided" }, done);
    return answer(
      await decideSuggestion(db, id, intent === "approve", field(form, "note")),
      done,
    );
  }
  return answer(
    await suggestAlias(db, user.id, songId, field(form, "alias")),
    "sent",
  );
};
