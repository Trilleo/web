import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId } from "../../../lib/comments/form";
import {
  INBOX_VIEWS,
  deleteMessage,
  setMessageStatus,
  type InboxView,
} from "../../../lib/contact/store";
import { getDb } from "../../../lib/db";

export const prerender = false;

/** The inbox's buttons: move a message to another view, or delete it. */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;

  const form = await context.request.formData();
  const back = safeNextPath(field(form, "back") || "/admin/messages/");
  const id = parseId(field(form, "id"));
  const status = field(form, "status");
  if (id === null) return noStoreRedirect(back, 303);

  const db = await getDb();
  let done: string | null = null;
  if (status === "deleted") {
    if (await deleteMessage(db, id)) done = "deleted";
  } else if (INBOX_VIEWS.includes(status as InboxView)) {
    if (await setMessageStatus(db, id, status as InboxView)) done = status;
  }
  const url = new URL(back, context.url);
  if (done) url.searchParams.set("done", done);
  return noStoreRedirect(`${url.pathname}${url.search}`, 303);
};
