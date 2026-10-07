import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";
import { resolveProjectReports } from "../../../lib/minecraft/service";
import {
  getProject,
  setFeatured,
  setHidden,
} from "../../../lib/minecraft/store";

export const prerender = false;

/**
 * The admin's buttons on /admin/minecraft: feature or unfeature a project, hide it
 * (settling its open reports) or show it again, dismiss its reports. Back to the page
 * with ?done= or ?error=.
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const form = await context.request.formData();
  const back = new URL(
    safeNextPath(field(form, "back") || "/admin/minecraft/"),
    context.url,
  );
  back.searchParams.delete("done");
  back.searchParams.delete("error");
  const finish = (key: "done" | "error", value: string) => {
    back.searchParams.set(key, value);
    return noStoreRedirect(back.pathname + back.search + back.hash, 303);
  };

  const db = await getDb();
  const id = parseId(field(form, "project"));
  const project = id === null ? undefined : await getProject(db, id);
  if (!project) return finish("error", "There’s no such project.");

  const action = field(form, "action");
  switch (action) {
    case "feature":
    case "unfeature":
      await setFeatured(db, project.id, action === "feature");
      return finish("done", action);
    case "hide": {
      const reason = field(form, "reason").trim();
      if (!reason) return finish("error", "Say why (the creator will see it).");
      if (reason.length > 2000)
        return finish("error", "Keep the reason shorter.");
      await resolveProjectReports({ db }, project, "actioned", reason);
      return finish("done", "hide");
    }
    case "unhide":
      await setHidden(db, project.id, null);
      return finish("done", "unhide");
    case "dismiss":
      await resolveProjectReports({ db }, project, "dismissed", null);
      return finish("done", "dismiss");
    default:
      return finish("error", "Unknown action.");
  }
};
