import type { APIRoute } from "astro";
import {
  FILE_ID_PATTERN,
  FILE_VISIBILITIES,
  UPLOAD_TRUST_MODES,
  type FileAction,
  type FileVisibility,
  type UploadTrustMode,
} from "@trilleo/storage";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId, parseUserId } from "../../../lib/comments/form";
import { decideAppeal } from "../../../lib/storage/appeals";
import { requesterOf, storageDeps } from "../../../lib/storage/deps";
import {
  actOnFile,
  changeVisibility,
  markReviewed,
  type Result,
} from "../../../lib/storage/service";
import {
  banUploader,
  setTrust,
  unbanUploader,
} from "../../../lib/storage/standing";
import { resolveReports } from "../../../lib/storage/store";

export const prerender = false;

const FILE_ACTIONS: readonly FileAction[] = [
  "approve",
  "reject",
  "remove",
  "restore",
  "delete",
];

/**
 * The admin's buttons on /admin/files and /admin/files/review: moderation actions,
 * visibility, reports, appeals, and uploader controls (trust, ban). Goes back to
 * the page (`back`) with ?done=<action> or ?error=<message>.
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
    return noStoreRedirect(back.pathname + back.search + back.hash, 303);
  };
  const outcome = (result: Result<unknown>, done: string) =>
    result.ok ? finish("done", done) : finish("error", result.error);

  const action = field(form, "action");
  if (!deps || !requester) return finish("error", "File storage isn’t set up.");
  const now = new Date();

  // Uploader controls.
  if (["trust", "ban", "unban"].includes(action)) {
    const userId = parseUserId(field(form, "user"));
    if (!userId) return finish("error", "There’s no such account.");
    if (action === "trust") {
      const mode = field(form, "mode") as UploadTrustMode;
      if (!UPLOAD_TRUST_MODES.includes(mode))
        return finish("error", "Choose how to trust them.");
      await setTrust(deps.db, { userId, mode, actorId: admin.id, now });
      return finish("done", "trust");
    }
    if (action === "ban") {
      const reason = field(form, "reason").trim();
      if (!reason) return finish("error", "Say why (they’ll see it).");
      await banUploader(deps.db, { userId, reason, actorId: admin.id, now });
      return finish("done", "ban");
    }
    await unbanUploader(deps.db, {
      userId,
      clearStrikes: field(form, "clear-strikes") === "yes",
      actorId: admin.id,
      now,
    });
    return finish("done", "unban");
  }

  // Appeals.
  if (action === "appeal-accept" || action === "appeal-deny") {
    const appealId = parseId(field(form, "appeal"));
    if (appealId === null) return finish("error", "There’s no such appeal.");
    return outcome(
      await decideAppeal(deps, requester, {
        appealId,
        accept: action === "appeal-accept",
        response: field(form, "response"),
      }),
      action,
    );
  }

  // Everything else is about one file.
  const id = field(form, "id");
  if (!FILE_ID_PATTERN.test(id))
    return finish("error", "There’s no such file.");

  if (action === "visibility") {
    const visibility = field(form, "visibility") as FileVisibility;
    if (!FILE_VISIBILITIES.includes(visibility))
      return finish("error", "Choose a visibility.");
    return outcome(
      await changeVisibility(deps, requester, id, visibility),
      "visibility",
    );
  }
  if (action === "reviewed")
    return outcome(await markReviewed(deps, requester, id), "reviewed");
  if (action === "dismiss-reports") {
    await resolveReports(deps.db, id, "dismissed", now);
    return finish("done", "dismiss-reports");
  }

  if (!FILE_ACTIONS.includes(action as FileAction))
    return finish("error", "Unknown action.");
  return outcome(
    await actOnFile(
      deps,
      requester,
      id,
      action as FileAction,
      field(form, "reason"),
      {
        strike: field(form, "no-strike") !== "yes",
        trust: field(form, "trust") === "yes",
      },
    ),
    field(form, "trust") === "yes" ? "approve-trust" : action,
  );
};
