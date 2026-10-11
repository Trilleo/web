import type { APIRoute } from "astro";
import { noStoreRedirect } from "../../../../lib/auth/redirect";
import { field } from "../../../../lib/comments/form";
import { openWiki, wikiSlugOf } from "../../../../lib/wiki/page";
import {
  deletePage,
  findPage,
  protectPage,
  restorePage,
} from "../../../../lib/wiki/store";
import { normalizeTitle, titleKey } from "../../../../lib/wiki/titles";
import { toolHref, wikiHref } from "../../../../lib/wiki/wikis";

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
 * An owner's page actions, as form posts: `intent` delete (with a reason),
 * restore, or protect (`protection` owners|none).
 */
export const POST: APIRoute = async (context) => {
  const wikiContext = await openWiki(context, wikiSlugOf(context));
  if (!wikiContext) return refuse(404, "No such wiki.");
  const { db, wiki, access, user } = wikiContext;
  if (!user || !access.manage)
    return refuse(403, "Only this wiki's owners can do that.");
  const form = await context.request.formData();
  const title = normalizeTitle(field(form, "title"));
  if (!title) return refuse(400, "No page given.");
  const page = await findPage(db, wiki.id, titleKey(title));
  if (!page) return refuse(404, "No such page.");

  switch (field(form, "intent")) {
    case "delete":
      if (!page.deletedAt)
        await deletePage(
          db,
          wiki,
          user,
          page,
          field(form, "reason").slice(0, 300),
        );
      return noStoreRedirect(wikiHref(wiki, page.title), 303);
    case "restore":
      if (page.deletedAt) await restorePage(db, wiki, user, page);
      return noStoreRedirect(wikiHref(wiki, page.title), 303);
    case "protect": {
      const protection =
        field(form, "protection") === "owners" ? "owners" : "none";
      await protectPage(db, wiki, user, page, protection);
      return noStoreRedirect(toolHref(wiki, "move", page.title), 303);
    }
    default:
      return refuse(400, "Unknown action.");
  }
};
