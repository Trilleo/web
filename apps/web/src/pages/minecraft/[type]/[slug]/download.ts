import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { CHANNELS } from "../../../../lib/minecraft/catalog";
import { lookupProject } from "../../../../lib/minecraft/page";
import { pickDownload } from "../../../../lib/minecraft/store";
import { downloadPath } from "../../../../lib/storage/service";

export const prerender = false;

/**
 * /minecraft/<type>/<slug>/download/: the newest stable main file, or the newest that
 * fits ?version=, ?loader= and ?channel=. Redirects to /d/<id>, which counts the
 * download and sends the file.
 */
export const GET: APIRoute = async ({
  params,
  url,
  locals,
  redirect,
  rewrite,
}) => {
  const db = await getDb();
  const lookup = await lookupProject(
    db,
    params,
    locals.user,
    "download/",
    url.search,
  );
  if (lookup.kind === "missing") return rewrite("/404");
  if (lookup.kind === "redirect") return redirect(lookup.location, 301);
  const channel = url.searchParams.get("channel");
  const pick = await pickDownload(db, lookup.project.id, {
    ...(url.searchParams.get("version")
      ? { version: url.searchParams.get("version") ?? "" }
      : {}),
    ...(url.searchParams.get("loader")
      ? { loader: url.searchParams.get("loader") ?? "" }
      : {}),
    ...(CHANNELS.some((entry) => entry.value === channel)
      ? { channel: channel as (typeof CHANNELS)[number]["value"] }
      : {}),
  });
  if (!pick) return rewrite("/404");
  return new Response(null, {
    status: 302,
    headers: {
      Location: downloadPath(pick.file.id),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
