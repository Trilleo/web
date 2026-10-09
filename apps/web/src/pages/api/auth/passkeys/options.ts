import type { APIRoute } from "astro";
import { setWebAuthnCookie } from "../../../../lib/auth/cookies";
import {
  authenticationOptions,
  listPasskeys,
  newChallenge,
  registrationOptions,
} from "../../../../lib/auth/passkeys";
import { getDb } from "../../../../lib/db";
import { json, sameOrigin } from "../../../../lib/auth/respond";

export const prerender = false;

/**
 * Starts a passkey ceremony: `{ purpose: "register" }` (signed in, adding one) or
 * `{ purpose: "authenticate" }` (signing in). Answers with the options for
 * navigator.credentials, and keeps the challenge in a cookie.
 */
export const POST: APIRoute = async ({ request, url, cookies, locals }) => {
  if (!sameOrigin(request, url)) return json({ error: "origin" }, 403);
  const body: unknown = await request.json().catch(() => null);
  const purpose =
    typeof body === "object" && body !== null && "purpose" in body
      ? body.purpose
      : null;
  const challenge = newChallenge();

  if (purpose === "register") {
    const { user } = locals;
    if (!user) return json({ error: "sign-in" }, 401);
    const existing = await listPasskeys(await getDb(), user.id);
    setWebAuthnCookie(cookies, url, {
      challenge,
      purpose,
      userId: user.id,
    });
    return json(registrationOptions(user, existing, url, challenge));
  }
  if (purpose === "authenticate") {
    setWebAuthnCookie(cookies, url, { challenge, purpose });
    return json(authenticationOptions(url, challenge));
  }
  return json({ error: "purpose" }, 400);
};
