import type { APIRoute } from "astro";
import { isAdmin, requireUser } from "../../../../lib/auth/guard";
import { noStoreRedirect } from "../../../../lib/auth/redirect";
import { getDb } from "../../../../lib/db";
import {
  handleCreatorAction,
  ownProject,
} from "../../../../lib/minecraft/creator";
import { editPath } from "../../../../lib/minecraft/paths";
import { requesterOf, storageDeps } from "../../../../lib/storage/deps";

export const prerender = false;

/**
 * The buttons on a project's creator pages (gallery, release files, deleting): plain
 * POST forms that come back to their page with ?done= or ?error=.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const found = await ownProject(
    await getDb(),
    user,
    isAdmin(user),
    context.params.id,
  );
  if (!found) return context.rewrite("/404");
  const deps = await storageDeps();
  const requester = requesterOf(user);
  if (!deps || !requester)
    return noStoreRedirect(
      `${editPath(found.project.id)}?error=${encodeURIComponent("File storage isn’t set up.")}`,
      303,
    );
  const outcome = await handleCreatorAction(
    deps,
    requester,
    found.project,
    await context.request.formData(),
  );
  return noStoreRedirect(outcome.location, 303);
};
