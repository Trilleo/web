import type { APIRoute } from "astro";
import { isDifficulty } from "@trilleo/chunithm";
import { signInHref } from "@trilleo/tool-kit";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { suggestAlias } from "../../../lib/chunithm/aliases";
import { field, parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";

export const prerender = false;

/**
 * POST /tools/chunithm/alias: someone signed in suggests a name for a song, from a
 * chart page's form (no JavaScript needed). Back to the page with ?alias=sent, or
 * ?alias=<error> (lib/chunithm/aliases.ts ALIAS_ERRORS).
 */
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const songId = parseId(field(form, "song"));
  const difficulty = field(form, "difficulty");
  const back =
    songId !== null && isDifficulty(difficulty)
      ? `/tools/chunithm/${String(songId)}/${difficulty}/`
      : "/tools/chunithm/";
  const { user } = context.locals;
  if (!user) return noStoreRedirect(signInHref(back), 303);
  if (songId === null) return noStoreRedirect(back, 303);
  const result = await suggestAlias(
    await getDb(),
    user.id,
    songId,
    field(form, "alias"),
  );
  return noStoreRedirect(
    `${back}?alias=${result.ok ? "sent" : result.error}#names`,
    303,
  );
};
