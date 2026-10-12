import type { APIRoute } from "astro";
import { noStoreRedirect, safeNextPath } from "../../../../lib/auth/redirect";
import { field } from "../../../../lib/comments/form";
import { openWiki, wikiSlugOf } from "../../../../lib/wiki/page";
import { normalizeTitle, titleKey } from "../../../../lib/wiki/titles";
import { WHOLE_WIKI, unwatch, watch } from "../../../../lib/wiki/watch";
import { wikiHref } from "../../../../lib/wiki/wikis";

export const prerender = false;

const refuse = (status: number, text: string) =>
  new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });

/**
 * Watching, as a form post: `intent` watch|unwatch, a `title` (or none for the whole
 * wiki), and `back`, the page to return to.
 */
export const POST: APIRoute = async (context) => {
  const wikiContext = await openWiki(context, wikiSlugOf(context));
  if (!wikiContext) return refuse(404, "No such wiki.");
  const { db, wiki, user } = wikiContext;
  if (!user) return refuse(403, "Sign in to watch pages.");
  const form = await context.request.formData();
  const rawTitle = field(form, "title");
  const title = rawTitle ? normalizeTitle(rawTitle) : null;
  if (rawTitle && !title) return refuse(400, "That isn't a page's title.");
  const key = title ? titleKey(title) : WHOLE_WIKI;
  const back = safeNextPath(
    field(form, "back") || (title ? wikiHref(wiki, title) : wikiHref(wiki)),
  );
  if (field(form, "intent") === "unwatch") {
    await unwatch(db, user.id, wiki.id, key);
  } else if (!(await watch(db, user.id, wiki.id, key))) {
    return refuse(
      422,
      "You watch as many pages as an account can. Unwatch some on your watchlist first.",
    );
  }
  return noStoreRedirect(back, 303);
};
