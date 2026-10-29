import type { APIRoute } from "astro";
import { checker, setPassCookie, visitorOf } from "../../../lib/captcha/gate";
import { isCheckRoute } from "../../../lib/captcha/routes";

export const prerender = false;

/**
 * POST {route, token, nonce}: the answer to a proof-of-work from
 * /api/check/challenge. Right: 204 and a pass cookie. Wrong or stale: 422.
 */
export const POST: APIRoute = async (context) => {
  const headers = { "Cache-Control": "private, no-store" };
  const { request, url } = context;
  if (request.headers.get("origin") !== url.origin)
    return Response.json(
      { error: "Not from this site." },
      { status: 403, headers },
    );
  let input: { route?: unknown; token?: unknown; nonce?: unknown } = {};
  try {
    input = ((await request.json()) as typeof input | null) ?? {};
  } catch {
    return Response.json({ error: "Not JSON." }, { status: 400, headers });
  }
  const { route, token, nonce } = input;
  if (
    !isCheckRoute(route) ||
    typeof token !== "string" ||
    typeof nonce !== "number"
  )
    return Response.json(
      { error: "Missing answer." },
      { status: 400, headers },
    );
  const visitor = visitorOf(context);
  const result = checker.verify(token, route, visitor, { nonce });
  if (!result.ok) {
    checker.fail(route, visitor);
    return Response.json({ error: result.reason }, { status: 422, headers });
  }
  checker.count(route, "passed");
  setPassCookie(context, result.level);
  return new Response(null, { status: 204, headers });
};
