import {
  mailMessages,
  openDatabase,
  sbReminderSends,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { REMINDER_LIMITS, skyblockTime } from "@trilleo/skyblock/events";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addReminder,
  adminReminders,
  listReminders,
  reminderEmail,
  reminderEvent,
  reminderExport,
  reminderSettings,
  removeReminder,
  saveReminderSettings,
  sendDueReminders,
  setPaused,
} from "./reminders";

let handle: DatabaseHandle;
let userId: string;

/** 15 minutes before the Spooky Festival of Year 527. */
const SPOOKY = skyblockTime(527, 8, 29);
const BEFORE = new Date(SPOOKY - 15 * 60_000);

async function makeUser(username: string, email: string | null) {
  const [user] = await handle.db
    .insert(users)
    .values({
      username,
      email,
      emailToken: email ? `token-${username}-0123456789abcdefghij` : null,
    })
    .returning({ id: users.id });
  return user?.id ?? "";
}

const mail = () => handle.db.select().from(mailMessages);
const sends = () => handle.db.select().from(sbReminderSends);

beforeEach(async () => {
  handle = await openDatabase("memory://");
  userId = await makeUser("hunter", "hunter@example.com");
});
afterEach(async () => {
  await handle.close();
});

describe("subscriptions", () => {
  it("adds and removes reminders, checking the event and lead", async () => {
    expect(await addReminder(handle.db, userId, "spooky-festival", 15)).toEqual(
      {
        ok: true,
      },
    );
    expect(await addReminder(handle.db, userId, "spooky-festival", 15)).toEqual(
      {
        ok: false,
        error: "exists",
      },
    );
    expect(await addReminder(handle.db, userId, "nope", 15)).toEqual({
      ok: false,
      error: "unknown-event",
    });
    // An hour is longer than the gap between Dark Auctions.
    expect(await addReminder(handle.db, userId, "dark-auction", 60)).toEqual({
      ok: false,
      error: "bad-lead",
    });
    expect(await addReminder(handle.db, userId, "fishing-festival", 0)).toEqual(
      {
        ok: true,
      },
    );
    const rows = await listReminders(handle.db, userId);
    expect(rows.map((r) => [r.eventSlug, r.leadMinutes])).toEqual([
      ["fishing-festival", 0],
      ["spooky-festival", 15],
    ]);
    const other = await makeUser("other", "other@example.com");
    expect(await removeReminder(handle.db, rows[0]?.id ?? 0, other)).toBe(
      false,
    );
    expect(await removeReminder(handle.db, rows[0]?.id ?? 0, userId)).toBe(
      true,
    );
    expect(reminderEvent("fishing-festival")?.perk).toBe("Fishing Festival");
  });

  it("caps how many someone may have", async () => {
    const slugs = [
      "spooky-festival",
      "season-of-jerry",
      "new-year-celebration",
      "traveling-zoo",
      "hoppitys-hunt",
      "harvest-feast",
    ];
    const leads = [0, 5, 15, 30, 60, 1440] as const;
    let added = 0;
    for (const slug of slugs)
      for (const lead of leads)
        if ((await addReminder(handle.db, userId, slug, lead)).ok) added += 1;
    expect(added).toBe(REMINDER_LIMITS.perUser);
    expect(await addReminder(handle.db, userId, "mayor-election", 0)).toEqual({
      ok: false,
      error: "too-many",
    });
  });

  it("checks and keeps settings", async () => {
    expect((await reminderSettings(handle.db, userId)).dailyCap).toBe(
      REMINDER_LIMITS.dailyCap,
    );
    const save = (over: object) =>
      saveReminderSettings(handle.db, userId, {
        timeZone: "Asia/Shanghai",
        dailyCap: 5,
        quietStart: 22 * 60,
        quietEnd: 7 * 60,
        ...over,
      });
    expect(await save({ timeZone: "Nowhere/Here" })).toEqual({
      ok: false,
      error: "time-zone",
    });
    expect(await save({ dailyCap: 99 })).toEqual({ ok: false, error: "cap" });
    expect(await save({ quietEnd: null })).toEqual({
      ok: false,
      error: "quiet",
    });
    expect(await save({})).toEqual({ ok: true });
    expect(await reminderSettings(handle.db, userId)).toMatchObject({
      timeZone: "Asia/Shanghai",
      dailyCap: 5,
      quietStart: 1320,
      quietEnd: 420,
    });
  });
});

describe("sending", () => {
  it("emails once when a reminder comes due, never twice", async () => {
    await addReminder(handle.db, userId, "spooky-festival", 15);
    expect(
      await sendDueReminders(handle.db, new Date(BEFORE.getTime() - 60_000)),
    ).toBe(0);
    expect(await sendDueReminders(handle.db, BEFORE)).toBe(1);
    expect(
      await sendDueReminders(handle.db, new Date(BEFORE.getTime() + 30_000)),
    ).toBe(0);
    const [message] = await mail();
    expect(message?.kind).toBe("skyblock-reminder");
    expect(message?.toAddress).toBe("hunter@example.com");
    expect(message?.subject).toBe("Spooky Festival starts in 15 minutes");
    expect(message?.textBody).toContain("Autumn 29th, Year 527");
    expect(message?.textBody).toContain("/tools/skyblock/events/reminders/");
    expect((await listReminders(handle.db, userId))[0]?.lastSentAt).toEqual(
      BEFORE,
    );
  });

  it("puts everything due at once in one email", async () => {
    await addReminder(handle.db, userId, "spooky-festival", 15);
    await addReminder(handle.db, userId, "spooky-festival", 0);
    await sendDueReminders(handle.db, BEFORE);
    await sendDueReminders(handle.db, new Date(SPOOKY));
    const messages = await mail();
    expect(messages.map((m) => m.subject)).toEqual([
      "Spooky Festival starts in 15 minutes",
      "Spooky Festival has started",
    ]);
    const spooky = reminderEvent("spooky-festival");
    const auction = reminderEvent("dark-auction");
    if (!spooky || !auction) throw new Error("missing events");
    const { subject } = reminderEmail(
      [
        {
          reminder: {
            id: 1,
            userId,
            eventSlug: "a",
            leadMinutes: 0,
            crops: null,
            createdAt: BEFORE,
            lastSentAt: null,
          },
          event: spooky,
          occurrence: {
            event: spooky,
            start: SPOOKY,
            end: SPOOKY + 1,
          },
        },
        {
          reminder: {
            id: 2,
            userId,
            eventSlug: "b",
            leadMinutes: 0,
            crops: null,
            createdAt: BEFORE,
            lastSentAt: null,
          },
          event: auction,
          occurrence: {
            event: auction,
            start: SPOOKY + 60_000,
            end: SPOOKY + 60_000,
          },
        },
      ],
      "UTC",
      BEFORE.getTime(),
    );
    expect(subject).toBe("Spooky Festival starts in 15 minutes, and 1 more");
  });

  it("holds to the daily cap, quiet hours, the email switch and the admin's pause", async () => {
    await addReminder(handle.db, userId, "dark-auction", 5);
    await saveReminderSettings(handle.db, userId, {
      timeZone: "UTC",
      dailyCap: 2,
      quietStart: null,
      quietEnd: null,
    });
    // Three Dark Auctions an hour apart: the third is over the cap.
    const first = Date.UTC(2026, 10, 22, 12, 50);
    for (let i = 0; i < 3; i++)
      await sendDueReminders(handle.db, new Date(first + i * 3_600_000));
    expect((await mail()).length).toBe(2);
    expect((await sends()).map((s) => s.status)).toEqual([
      "sent",
      "sent",
      "cap",
    ]);

    // Quiet hours over the next one.
    await saveReminderSettings(handle.db, userId, {
      timeZone: "UTC",
      dailyCap: 24,
      quietStart: 15 * 60,
      quietEnd: 16 * 60,
    });
    await sendDueReminders(handle.db, new Date(first + 3 * 3_600_000));
    expect((await sends()).at(-1)?.status).toBe("quiet");

    // The email switch off.
    await saveReminderSettings(handle.db, userId, {
      timeZone: "UTC",
      dailyCap: 24,
      quietStart: null,
      quietEnd: null,
    });
    await handle.db
      .update(users)
      .set({ emailNotifications: { skyblock: false } })
      .where(eq(users.id, userId));
    await sendDueReminders(handle.db, new Date(first + 4 * 3_600_000));
    expect((await sends()).at(-1)?.status).toBe("off");

    // Paused by the admin: nothing at all, not even logged.
    await handle.db
      .update(users)
      .set({ emailNotifications: {} })
      .where(eq(users.id, userId));
    await setPaused(handle.db, userId, true);
    await sendDueReminders(handle.db, new Date(first + 5 * 3_600_000));
    expect(await sends()).toHaveLength(5);
    expect((await mail()).length).toBe(2);
  });

  it("sends a Jacob's contest reminder with crops only for contests known to use one", async () => {
    // The contest at 1795083300 uses Wheat, Nether Wart and Cocoa Beans.
    const start = 1795083300_000;
    const { sbFeeds } = await import("@trilleo/db");
    await handle.db.insert(sbFeeds).values({
      feed: "jacob",
      fetchedAt: new Date(start - 3_600_000),
      data: {
        contests: { [String(start)]: ["Wheat", "Nether Wart", "Cocoa Beans"] },
      },
    });
    const other = await makeUser("farmer", "farmer@example.com");
    await addReminder(
      handle.db,
      userId,
      "jacobs-farming-contest",
      5,
      new Date(),
      ["Cactus"],
    );
    await addReminder(
      handle.db,
      other,
      "jacobs-farming-contest",
      5,
      new Date(),
      ["Wheat", "Gold"],
    );
    expect((await listReminders(handle.db, other))[0]?.crops).toEqual([
      "Wheat",
    ]);
    await sendDueReminders(handle.db, new Date(start - 5 * 60_000));
    const messages = await mail();
    expect(messages.map((m) => m.toAddress)).toEqual(["farmer@example.com"]);
    expect(messages[0]?.textBody).toContain("Wheat, Nether Wart, Cocoa Beans");
    // The next contest's crops aren't known: no email for a crop reminder.
    await sendDueReminders(handle.db, new Date(start + 3_600_000 - 5 * 60_000));
    expect(await mail()).toHaveLength(1);
  });

  it("sends perk events only while someone in office holds the perk", async () => {
    await addReminder(handle.db, userId, "fishing-festival", 0);
    // No election loaded: nobody holds it.
    await sendDueReminders(handle.db, new Date(skyblockTime(527, 5, 1)));
    expect(await sends()).toEqual([]);
  });

  it("lists everything for the admin and the export", async () => {
    await addReminder(handle.db, userId, "spooky-festival", 15);
    await sendDueReminders(handle.db, BEFORE);
    const overview = await adminReminders(
      handle.db,
      { event: null, username: null },
      BEFORE,
    );
    expect(overview.total).toBe(1);
    expect(overview.people).toBe(1);
    expect(overview.sends.sent).toBe(1);
    expect(overview.rows[0]).toMatchObject({
      username: "hunter",
      eventSlug: "spooky-festival",
    });
    expect(
      (
        await adminReminders(handle.db, {
          event: "dark-auction",
          username: null,
        })
      ).rows,
    ).toEqual([]);
    const exported = await reminderExport(handle.db, userId);
    expect(exported.reminders[0]?.lead).toBe("15 minutes before");
    expect(exported.sends[0]?.status).toBe("sent");
  });
});
