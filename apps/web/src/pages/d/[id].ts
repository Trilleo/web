import type { APIRoute } from "astro";
import { FILE_ID_PATTERN } from "@trilleo/storage";
import { firstDownloadToday, looksLikeBot } from "../../lib/storage/downloads";
import { requesterOf, storageDeps } from "../../lib/storage/deps";
import { downloadUrl } from "../../lib/storage/service";
import { recordDownload } from "../../lib/storage/downloads-stats";
import { getFile } from "../../lib/storage/store";

export const prerender = false;

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /d/<id>: downloads a file. Public files redirect to the files domain (counted);
 * the owner and the admin get a short-lived signed link to files that aren't public.
 * Only a redirect passes through the server, never the bytes.
 */
export const GET: APIRoute = async (context) => {
  const id = context.params.id ?? "";
  const deps = FILE_ID_PATTERN.test(id) ? await storageDeps() : null;
  const row = deps ? await getFile(deps.db, id) : undefined;
  const target =
    deps && row
      ? await downloadUrl(deps.storage, row, requesterOf(context.locals.user))
      : null;
  if (!deps || !row || !target) return context.rewrite("/404");

  if (target.public) {
    const userAgent = context.request.headers.get("user-agent") ?? "";
    let ip = "";
    try {
      ip = context.clientAddress;
    } catch {
      // Not available (e.g. some test setups): count by browser alone.
    }
    if (!looksLikeBot(userAgent) && firstDownloadToday(id, { ip, userAgent }))
      await recordDownload(deps.db, id);
  }
  return new Response(null, {
    status: 302,
    headers: {
      ...NO_STORE,
      Location: new URL(target.url, context.url).href,
      "X-Robots-Tag": "noindex",
    },
  });
};
