/**
 * The human check at a protected page. A page's POST handler starts with
 *
 *   const check = await requireHuman(Astro, "contact");
 *   if (check) return check;
 *
 * Most visitors need no check and go straight through. When one is needed and the
 * visitor has no pass good enough, the answer is a 307 to /check/: the browser posts
 * the same form there, /check/ shows a challenge, and once it's answered sets a pass
 * cookie and 307s back here with the form again. So any POST form is covered, without
 * JavaScript, and nothing typed is lost. With JavaScript, <HumanCheck> solves the
 * proof-of-work before the form is sent, so the detour never happens.
 */
import type { CheckLevel, CheckMode } from "@trilleo/captcha";
import type { APIContext } from "astro";
import { isAdmin } from "../auth/guard";
import { getDb } from "../db";
import { Checker } from "./checker";
import { currentMode, flushChecksInBackground } from "./store";
import type { CheckRoute } from "./routes";

export const checker = new Checker();

export type CheckContext = Pick<
  APIContext,
  "cookies" | "url" | "locals" | "clientAddress"
>;

const PASS_COOKIE = "trilleo_human";
/** E2E only (CAPTCHA_TEST=1): the level this browser's checks get. */
const TEST_COOKIE = "trilleo_check_test";

/** E2E: levels come from a cookie, and puzzles carry their answers. */
export function checkTestMode(): boolean {
  return process.env.CAPTCHA_TEST === "1";
}

function passCookieName(url: URL): string {
  return url.protocol === "https:" ? `__Host-${PASS_COOKIE}` : PASS_COOKIE;
}

export function setPassCookie(context: CheckContext, level: CheckLevel): void {
  const visitor = visitorOf(context);
  const pass = checker.issuePass(visitor, level);
  context.cookies.set(passCookieName(context.url), pass.value, {
    path: "/",
    httpOnly: true,
    secure: context.url.protocol === "https:",
    sameSite: "lax",
    expires: pass.expiresAt,
  });
}

/** The visitor's hashed IP ("" when the server can't tell: everyone shares one). */
export function visitorOf(context: Pick<APIContext, "clientAddress">): string {
  let ip = "";
  try {
    ip = context.clientAddress;
  } catch {
    // Not available (some test setups): everyone shares one memory.
  }
  return checker.visitor(ip);
}

/** The level this visitor's next action on `route` needs. */
export async function levelFor(
  context: CheckContext,
  route: CheckRoute,
): Promise<{ level: CheckLevel; mode: CheckMode; visitor: string }> {
  const visitor = visitorOf(context);
  flushChecksInBackground(getDb, checker);
  if (checkTestMode()) {
    const forced = Number(context.cookies.get(TEST_COOKIE)?.value ?? "0");
    const level = ([0, 1, 2, 3].includes(forced) ? forced : 0) as CheckLevel;
    return { level, mode: "normal", visitor };
  }
  const mode = await currentMode(getDb);
  return { level: checker.level(route, visitor, mode), mode, visitor };
}

/**
 * Whether the visitor's pass covers `level`. `spend` uses one of its uses (when the
 * action goes ahead); without it, it only looks.
 */
export function passCovers(
  context: CheckContext,
  visitor: string,
  level: CheckLevel,
  spend = true,
): boolean {
  if (level === 0) return true;
  const value = context.cookies.get(passCookieName(context.url))?.value;
  return spend
    ? checker.usePass(value, visitor, level)
    : checker.passCovers(value, visitor, level);
}

/**
 * Where /check/ is for this route and page. `level` is what the page asked for:
 * /check/ never asks less (it may ask more), so its pass always gets through.
 */
export function checkUrl(route: CheckRoute, to: string, level = 1): string {
  return `/check/?route=${route}&level=${String(level)}&to=${encodeURIComponent(to)}`;
}

/**
 * null: go ahead (the action is counted). Otherwise a 307 to /check/, which the
 * page returns as it is. The admin is never checked.
 */
export async function requireHuman(
  context: CheckContext,
  route: CheckRoute,
): Promise<Response | null> {
  if (isAdmin(context.locals.user)) return null;
  const { level, visitor } = await levelFor(context, route);
  if (passCovers(context, visitor, level)) {
    checker.accept(route, visitor);
    return null;
  }
  checker.count(route, "challenged");
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: checkUrl(
        route,
        context.url.pathname + context.url.search,
        level,
      ),
    },
  });
}
