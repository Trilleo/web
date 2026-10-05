import type { APIRoute } from "astro";
import { FILE_ID_PATTERN } from "@trilleo/storage";
import { requireUser } from "../../../lib/auth/guard";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { field } from "../../../lib/comments/form";
import { appealFile } from "../../../lib/storage/appeals";
import { requesterOf, storageDeps } from "../../../lib/storage/deps";
import { actOnFile } from "../../../lib/storage/service";

export const prerender = false;

/**
 * Someone's buttons on /account/files: delete one of their files, or appeal a refused
 * or taken-down one. Back to the page with ?done= or ?error=.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const requester = requesterOf(user);
  const deps = await storageDeps();
  const form = await context.request.formData();
  const id = field(form, "id");
  const action = field(form, "action");

  const finish = (key: "done" | "error", value: string) =>
    noStoreRedirect(
      `/account/files/?${new URLSearchParams({ [key]: value }).toString()}#file-${id}`,
      303,
    );
  if (!deps || !requester) return finish("error", "File storage isn’t set up.");
  if (!FILE_ID_PATTERN.test(id))
    return finish("error", "There’s no such file.");

  if (action === "delete") {
    const result = await actOnFile(deps, requester, id, "delete");
    return result.ok ? finish("done", "delete") : finish("error", result.error);
  }
  if (action === "appeal") {
    const result = await appealFile(deps, requester, {
      fileId: id,
      message: field(form, "message"),
    });
    return result.ok ? finish("done", "appeal") : finish("error", result.error);
  }
  return finish("error", "Unknown action.");
};
