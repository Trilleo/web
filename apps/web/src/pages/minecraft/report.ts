import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import { reportProject } from "../../lib/minecraft/service";
import { getProject } from "../../lib/minecraft/store";
import { requesterOf, storageDeps } from "../../lib/storage/deps";

export const prerender = false;

/**
 * Someone reports a project's page (a plain POST form on it). Back to the page with
 * ?reported= or ?report-error=.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const back = safeNextPath(field(form, "back"));
  const finish = (key: string, value: string) => {
    const url = new URL(back, "https://placeholder.invalid");
    url.searchParams.set(key, value);
    return noStoreRedirect(`${url.pathname}${url.search}#report`, 303);
  };

  const db = await getDb();
  const id = parseId(field(form, "project"));
  const project = id === null ? undefined : await getProject(db, id);
  const requester = requesterOf(user);
  if (!project || !requester)
    return finish("report-error", "There’s no such project.");
  const deps = (await storageDeps()) ?? { db };
  const result = await reportProject(deps, requester, project, {
    reason: field(form, "reason"),
    details: field(form, "details"),
  });
  if (!result.ok) return finish("report-error", result.error);
  return finish(
    "reported",
    result.value === "already-reported" ? "again" : "1",
  );
};
