import type { APIRoute } from "astro";
import { PUZZLE_LEVEL } from "@trilleo/captcha";
import { checker, levelFor, passCovers } from "../../../lib/captcha/gate";
import { isCheckRoute } from "../../../lib/captcha/routes";
import { isAdmin } from "../../../lib/auth/guard";

export const prerender = false;

/**
 * POST {route}: what the visitor's next form on that route needs, for <HumanCheck>.
 * `{ level: 0 }` (send it), a proof-of-work to solve first, or `{ level: 3 }` (send
 * it; /check/ will show the puzzle). Doesn't count as an action.
 */
export const POST: APIRoute = async (context) => {
  const headers = { "Cache-Control": "private, no-store" };
  const { request, url } = context;
  if (request.headers.get("origin") !== url.origin)
    return Response.json(
      { error: "Not from this site." },
      { status: 403, headers },
    );
  let route: unknown;
  try {
    route = ((await request.json()) as { route?: unknown } | null)?.route;
  } catch {
    return Response.json({ error: "Not JSON." }, { status: 400, headers });
  }
  if (!isCheckRoute(route))
    return Response.json({ error: "No such check." }, { status: 404, headers });
  if (isAdmin(context.locals.user))
    return Response.json({ level: 0 }, { headers });
  const { level, visitor } = await levelFor(context, route);
  if (passCovers(context, visitor, level, false))
    return Response.json({ level: 0 }, { headers });
  if (level === PUZZLE_LEVEL || checker.refused(visitor))
    return Response.json({ level: PUZZLE_LEVEL }, { headers });
  checker.count(route, "challenged");
  const pow = checker.powChallenge(route, visitor, level === 1 ? 1 : 2);
  return Response.json({ level, ...pow }, { headers });
};
