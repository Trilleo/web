import type { APIRoute } from "astro";
import {
  setSessionCookie,
  takeWebAuthnCookie,
} from "../../../../lib/auth/cookies";
import {
  PASSKEY_ERRORS,
  relyingParty,
  signInWithPasskey,
} from "../../../../lib/auth/passkeys";
import { safeNextPath } from "../../../../lib/auth/redirect";
import { startSession } from "../../../../lib/auth/sign-in";
import { getDb } from "../../../../lib/db";
import { json, sameOrigin } from "../../../../lib/auth/respond";

export const prerender = false;

/**
 * Signs in with a passkey: `{ credential, next }`. Answers `{ next }` and sets the
 * session cookie, or `{ error, message }`.
 */
export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!sameOrigin(request, url)) return json({ error: "origin" }, 403);
  const state = takeWebAuthnCookie(cookies, url);
  if (state?.purpose !== "authenticate")
    return json(
      { error: "expired", message: "That took too long. Try again." },
      400,
    );

  const body: unknown = await request.json().catch(() => null);
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const db = await getDb();
  const result = await signInWithPasskey(db, record.credential, {
    expected: { challenge: state.challenge, ...relyingParty(url) },
  });
  if (!result.ok)
    return json(
      { error: result.error, message: PASSKEY_ERRORS[result.error] },
      400,
    );
  const session = await startSession(db, result.user, {
    method: "passkey",
    userAgent: request.headers.get("user-agent"),
  });
  setSessionCookie(cookies, url, session.token, session.expiresAt);
  return json({
    ok: true,
    next: safeNextPath(typeof record.next === "string" ? record.next : null),
  });
};
