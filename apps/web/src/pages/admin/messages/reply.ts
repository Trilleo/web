import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId } from "../../../lib/comments/form";
import { getMessage, replyToMessage } from "../../../lib/contact/reply";
import { getDb } from "../../../lib/db";
import { mailSetup } from "../../../lib/mail/config";

export const prerender = false;

/** The inbox's "Reply by email": queues the reply, back to the message. */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;

  const form = await context.request.formData();
  const back = new URL(
    safeNextPath(field(form, "back") || "/admin/messages/"),
    context.url,
  );
  back.searchParams.delete("done");
  back.searchParams.delete("error");
  const id = parseId(field(form, "id"));
  const db = await getDb();
  const message = id === null ? undefined : await getMessage(db, id);
  if (!message) {
    back.searchParams.set("error", "There’s no such message.");
    return noStoreRedirect(back.pathname + back.search, 303);
  }
  const { config } = mailSetup();
  const result = await replyToMessage(db, {
    message,
    body: field(form, "body"),
    replyTo: config.replyTo,
    available: config.available,
  });
  if (result.ok) {
    back.searchParams.set("done", "replied");
    // Answering marks a new message read: follow it there.
    if (message.status === "new") back.searchParams.set("view", "read");
  } else back.searchParams.set("error", result.error);
  return noStoreRedirect(
    `${back.pathname}${back.search}#message-${String(message.id)}`,
    303,
  );
};
