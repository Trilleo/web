import type { APIRoute } from "astro";
import { checker, setPassCookie, visitorOf } from "../../../lib/captcha/gate";
import { isCheckRoute } from "../../../lib/captcha/routes";

export const prerender = false;

/**
 * POST {route, token, nonce} (a proof-of-work from /api/check/challenge) or
 * {route, token, cells, text} (a puzzle from /api/check/puzzle). Right: 204 and a
 * pass cookie. Wrong or stale: 422 with the reason.
 */
export const POST: APIRoute = async (context) => {
  const headers = { "Cache-Control": "private, no-store" };
  const { request, url } = context;
  if (request.headers.get("origin") !== url.origin)
    return Response.json(
      { error: "Not from this site." },
      { status: 403, headers },
    );
  let input: {
    route?: unknown;
    token?: unknown;
    nonce?: unknown;
    cells?: unknown;
    text?: unknown;
  } = {};
  try {
    input = ((await request.json()) as typeof input | null) ?? {};
  } catch {
    return Response.json({ error: "Not JSON." }, { status: 400, headers });
  }
  const { route, token, nonce, cells, text } = input;
  if (!isCheckRoute(route) || typeof token !== "string")
    return Response.json(
      { error: "Missing answer." },
      { status: 400, headers },
    );
  const visitor = visitorOf(context);
  const result = checker.verify(token, route, visitor, {
    ...(typeof nonce === "number" ? { nonce } : {}),
    ...(Array.isArray(cells)
      ? {
          cells: cells
            .slice(0, 64)
            .filter((cell): cell is number => typeof cell === "number"),
        }
      : {}),
    ...(typeof text === "string" ? { text: text.slice(0, 40) } : {}),
  });
  if (!result.ok) {
    checker.fail(route, visitor);
    return Response.json({ error: result.reason }, { status: 422, headers });
  }
  checker.count(route, "passed");
  setPassCookie(context, result.level);
  return new Response(null, { status: 204, headers });
};
