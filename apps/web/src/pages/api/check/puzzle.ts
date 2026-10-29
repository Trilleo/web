import type { APIRoute } from "astro";
import { cellSvg } from "@trilleo/captcha";
import { checkTestMode, checker, visitorOf } from "../../../lib/captcha/gate";
import { isCheckRoute } from "../../../lib/captcha/routes";

export const prerender = false;

/**
 * POST {route}: a puzzle for the dialog @trilleo/captcha/client shows when a JSON
 * route wants the puzzle: its token, the shape to find, each square's drawing (our
 * own SVG) and the question in words. Answered at /api/check/solve.
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
  const visitor = visitorOf(context);
  if (checker.refused(visitor) && !checkTestMode())
    return Response.json(
      {
        error:
          "Lots of checks from your network have failed lately. Try again in an hour.",
      },
      { status: 429, headers },
    );
  const { token, puzzle } = checker.puzzleChallenge(route, visitor);
  checker.count(route, "puzzles");
  return Response.json(
    {
      token,
      target: puzzle.target,
      cells: puzzle.cells.map(cellSvg),
      question: puzzle.question,
      // E2E only: the answers, so specs can solve it.
      ...(checkTestMode()
        ? { answer: puzzle.answer, textAnswer: puzzle.textAnswer }
        : {}),
    },
    { headers },
  );
};
