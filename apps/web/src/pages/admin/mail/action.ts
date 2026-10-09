import { normalizeEmail } from "@trilleo/mail";
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";
import { composeDirect } from "../../../lib/mail/compose";
import { mailSetup } from "../../../lib/mail/config";
import { cancelMail, queueMail, retryMail } from "../../../lib/mail/outbox";
import { SITE_NAME } from "../../../lib/site";

export const prerender = false;

/**
 * The admin's buttons on /admin/mail/: send a test, check the SMTP login, retry or
 * cancel a message. Back to the page with ?done= or ?error=.
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const form = await context.request.formData();
  const back = new URL(
    safeNextPath(field(form, "back") || "/admin/mail/"),
    context.url,
  );
  if (!back.pathname.startsWith("/admin/mail/")) back.pathname = "/admin/mail/";
  back.search = "";
  const finish = (key: "done" | "error", value: string) => {
    back.searchParams.set(key, value);
    return noStoreRedirect(back.pathname + back.search, 303);
  };

  const db = await getDb();
  const { driver } = mailSetup();
  switch (field(form, "intent")) {
    case "test": {
      const to = normalizeEmail(field(form, "to"));
      if (!to) return finish("error", "That isn’t an email address.");
      const mail = composeDirect(
        `Test email from ${SITE_NAME}`,
        {
          label: "Admin",
          title: "It works",
          blocks: [
            {
              type: "text",
              text: `If you can read this, ${SITE_NAME} can send email to ${to}.`,
            },
            {
              type: "facts",
              rows: [
                ["Sent by", `@${admin.githubLogin}`],
                ["Written", new Date().toISOString()],
              ],
            },
          ],
        },
        ["Sent from /admin/mail/."],
      );
      await queueMail(db, {
        kind: "test",
        to,
        userId: admin.id,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      return finish("done", "test");
    }
    case "verify": {
      try {
        await driver.verify();
        return finish("done", "verified");
      } catch (error) {
        return finish(
          "error",
          `The SMTP server said no: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    case "retry":
    case "cancel": {
      const id = parseId(field(form, "id"));
      if (id === null) return finish("error", "There’s no such message.");
      const intent = field(form, "intent");
      const changed =
        intent === "retry" ? await retryMail(db, id) : await cancelMail(db, id);
      if (!changed)
        return finish(
          "error",
          "That can’t be done to the message as it is now.",
        );
      return finish("done", intent === "retry" ? "retried" : "cancelled");
    }
    default:
      return finish("error", "Unknown action.");
  }
};
