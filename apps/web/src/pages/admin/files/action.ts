import type { APIRoute } from "astro";
import {
  FILE_ID_PATTERN,
  FILE_VISIBILITIES,
  type FileAction,
  type FileVisibility,
} from "@trilleo/storage";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field } from "../../../lib/comments/form";
import { requesterOf, storageDeps } from "../../../lib/storage/deps";
import { actOnFile, changeVisibility } from "../../../lib/storage/service";

export const prerender = false;

const ACTIONS: readonly FileAction[] = [
  "approve",
  "reject",
  "remove",
  "restore",
  "delete",
];

/**
 * The admin's buttons on /admin/files: moderation actions and visibility. Goes back
 * to the list (`back`) with ?done=<action> or ?error=<message>.
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const requester = requesterOf(admin);
  const deps = await storageDeps();

  const form = await context.request.formData();
  const back = new URL(
    safeNextPath(field(form, "back") || "/admin/files/"),
    context.url,
  );
  back.searchParams.delete("done");
  back.searchParams.delete("error");
  const finish = (key: "done" | "error", value: string) => {
    back.searchParams.set(key, value);
    return noStoreRedirect(back.pathname + back.search, 303);
  };

  const id = field(form, "id");
  const action = field(form, "action");
  if (!deps || !requester) return finish("error", "File storage isn’t set up.");
  if (!FILE_ID_PATTERN.test(id))
    return finish("error", "There’s no such file.");

  if (action === "visibility") {
    const visibility = field(form, "visibility") as FileVisibility;
    if (!FILE_VISIBILITIES.includes(visibility))
      return finish("error", "Choose a visibility.");
    const result = await changeVisibility(deps, requester, id, visibility);
    return result.ok
      ? finish("done", "visibility")
      : finish("error", result.error);
  }

  if (!ACTIONS.includes(action as FileAction))
    return finish("error", "Unknown action.");
  const result = await actOnFile(
    deps,
    requester,
    id,
    action as FileAction,
    field(form, "reason"),
  );
  return result.ok ? finish("done", action) : finish("error", result.error);
};
