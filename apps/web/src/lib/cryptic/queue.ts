/**
 * Keeping the daily cryptic stocked: when fewer than CRYPTIC_LIMITS.queueWarnDays days
 * from today have a puzzle, /admin says so and the admin gets an alert email (one a
 * day at most). Only while the cryptic is in use: a puzzle in the last week or ahead.
 */
import { adminAlerts, crypticPuzzles, type Database } from "@trilleo/db";
import { addDays, dayOf, dayStart } from "@trilleo/cryptic";
import { and, eq, gte } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { CRYPTIC_LIMITS, daysCovered } from "./puzzles";

const CHECK_EVERY_MS = 60 * 60 * 1000;
let lastCheck = 0;
let running = false;

/** "No cryptic today", "Cryptics are set for 1 more day", or null when there's enough. */
export function queueWarning(covered: number): string | null {
  if (covered >= CRYPTIC_LIMITS.queueWarnDays) return null;
  if (covered === 0) return "There's no daily cryptic for today.";
  return `Daily cryptics are set for only ${String(covered)} ${covered === 1 ? "day" : "days"} from today.`;
}

/** Alerts the admin if the queue is short and they haven't heard today. */
export async function checkCrypticQueue(
  db: Database,
  now = new Date(),
): Promise<boolean> {
  const today = dayOf(now);
  const warning = queueWarning(await daysCovered(db, today));
  if (!warning) return false;
  const [recent] = await db
    .select({ id: crypticPuzzles.id })
    .from(crypticPuzzles)
    .where(gte(crypticPuzzles.day, addDays(today, -7)))
    .limit(1);
  if (!recent) return false;
  const [told] = await db
    .select({ id: adminAlerts.id })
    .from(adminAlerts)
    .where(
      and(
        eq(adminAlerts.kind, "cryptic-queue"),
        gte(adminAlerts.createdAt, dayStart(today)),
      ),
    )
    .limit(1);
  if (told) return false;
  await alertAdmin(
    db,
    { kind: "cryptic-queue", summary: warning, path: "/admin/cryptic/" },
    now,
  );
  return true;
}

/** From any request, at most hourly, in the background. */
export function crypticQueueInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || now - lastCheck < CHECK_EVERY_MS) return;
  running = true;
  lastCheck = now;
  void getDb()
    .then((db) => checkCrypticQueue(db))
    .catch((error: unknown) => {
      console.warn("Cryptic queue check failed:", error);
    })
    .finally(() => {
      running = false;
    });
}
