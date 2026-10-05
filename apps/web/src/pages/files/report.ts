import type { APIRoute } from "astro";
import { FILE_ID_PATTERN } from "@trilleo/storage";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { field } from "../../lib/comments/form";
import { requesterOf, storageDeps } from "../../lib/storage/deps";
import { reportFile } from "../../lib/storage/reports";
import { filePagePath } from "../../lib/storage/service";

export const prerender = false;

/**
 * POST (form): someone reports a public file. Back to its page with
 * ?reported=1, or ?report-error=<message>.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const requester = requesterOf(user);
  const form = await context.request.formData();
  const fileId = field(form, "id");
  const deps = FILE_ID_PATTERN.test(fileId) ? await storageDeps() : null;
  if (!deps || !requester) return context.rewrite("/404");

  const result = await reportFile(deps, requester, {
    fileId,
    reason: field(form, "reason"),
    details: field(form, "details"),
  });
  const back = new URL(filePagePath(fileId), context.url);
  if (result.ok) back.searchParams.set("reported", "1");
  else back.searchParams.set("report-error", result.error);
  return noStoreRedirect(`${back.pathname}${back.search}#report`, 303);
};
