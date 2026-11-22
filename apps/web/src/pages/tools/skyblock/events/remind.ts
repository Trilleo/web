import type { APIRoute } from "astro";
import { parseClock } from "@trilleo/skyblock/events";
import { requireUser } from "../../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../../lib/auth/redirect";
import { field, parseId } from "../../../../lib/comments/form";
import { getDb } from "../../../../lib/db";
import {
  REMINDERS_PATH,
  addReminder,
  removeReminder,
  saveReminderSettings,
} from "../../../../lib/skyblock/reminders";

export const prerender = false;

/**
 * POST /tools/skyblock/events/remind, from the event pages and the reminders page (no
 * JavaScript needed): `intent` add (event, lead), remove (id) or settings (time zone,
 * daily cap, quiet hours). Back to `back` (a page under /tools/skyblock/events/) with
 * ?reminder=<what happened> (REMINDER_ANSWERS in lib/skyblock/reminder-answers.ts).
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const back = new URL(
    safeNextPath(field(form, "back") || REMINDERS_PATH),
    context.url,
  );
  if (!back.pathname.startsWith("/tools/skyblock/events/"))
    back.pathname = REMINDERS_PATH;
  back.search = "";
  const finish = (answer: string, anchor = "#remind") =>
    noStoreRedirect(`${back.pathname}?reminder=${answer}${anchor}`, 303);

  const db = await getDb();
  switch (field(form, "intent")) {
    case "add": {
      const result = await addReminder(
        db,
        user.id,
        field(form, "event"),
        Number.parseInt(field(form, "lead"), 10),
      );
      return finish(result.ok ? "added" : result.error);
    }
    case "remove": {
      const id = parseId(field(form, "id"));
      const removed = id !== null && (await removeReminder(db, id, user.id));
      return finish(removed ? "removed" : "missing");
    }
    case "settings": {
      const quiet = field(form, "quiet") === "on";
      const result = await saveReminderSettings(db, user.id, {
        timeZone: field(form, "timeZone").trim() || "UTC",
        dailyCap: Number.parseInt(field(form, "dailyCap"), 10),
        quietStart: quiet ? parseClock(field(form, "quietStart")) : null,
        quietEnd: quiet ? parseClock(field(form, "quietEnd")) : null,
      });
      return finish(result.ok ? "saved" : result.error, "#settings");
    }
    default:
      return finish("unknown");
  }
};
