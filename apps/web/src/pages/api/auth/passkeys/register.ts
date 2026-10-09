import type { APIRoute } from "astro";
import { logEvent } from "../../../../lib/auth/activity";
import { takeWebAuthnCookie } from "../../../../lib/auth/cookies";
import {
  PASSKEY_ERRORS,
  addPasskey,
  relyingParty,
} from "../../../../lib/auth/passkeys";
import { getDb } from "../../../../lib/db";
import { json, sameOrigin } from "../../../../lib/auth/respond";

export const prerender = false;

/** Adds the passkey the browser just made (`{ credential }`) to the signed-in account. */
export const POST: APIRoute = async ({ request, url, cookies, locals }) => {
  if (!sameOrigin(request, url)) return json({ error: "origin" }, 403);
  const { user } = locals;
  if (!user) return json({ error: "sign-in" }, 401);
  const state = takeWebAuthnCookie(cookies, url);
  if (state?.purpose !== "register" || state.userId !== user.id)
    return json(
      { error: "expired", message: "That took too long. Try again." },
      400,
    );

  const body: unknown = await request.json().catch(() => null);
  const credential =
    typeof body === "object" && body !== null && "credential" in body
      ? body.credential
      : null;
  const db = await getDb();
  const userAgent = request.headers.get("user-agent");
  const result = await addPasskey(db, user, credential, {
    expected: { challenge: state.challenge, ...relyingParty(url) },
    userAgent,
  });
  if (!result.ok)
    return json(
      { error: result.error, message: PASSKEY_ERRORS[result.error] },
      400,
    );
  await logEvent(db, user.id, "passkey-added", {
    detail: result.passkey.name,
    userAgent,
  });
  return json({ ok: true, id: result.passkey.id });
};
