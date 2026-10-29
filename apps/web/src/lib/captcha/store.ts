/**
 * The human check's database side: the admin's mode (captcha_settings, one row),
 * daily counts (captcha_stats), and the flood watch. Counts gather in memory and are
 * written at most every minute; a flood (many failed checks in an hour) alerts the
 * admin and, while the mode is normal, raises it for an hour by itself.
 */
import {
  adminAlerts,
  captchaSettings,
  captchaStats,
  type Database,
} from "@trilleo/db";
import { isCheckMode, type CheckMode } from "@trilleo/captcha";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { utcDay } from "../storage/downloads-stats";
import type { Checker, CheckCounts } from "./checker";
import type { CheckRoute } from "./routes";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const CHECK_FLOOD = {
  /** Failed checks in an hour, across everyone, that count as a flood. */
  failuresPerHour: 100,
  /** How long a flood raises the mode by itself. */
  autoRaiseMs: HOUR_MS,
  /** At most one flood alert this often. */
  alertGapMs: 6 * HOUR_MS,
} as const;

/** captcha_stats rows are kept this many days. */
export const CHECK_STATS_DAYS = 90;

/** Choices for how long a mode lasts, in hours (null: until changed). */
export const MODE_DURATIONS = [1, 6, 24, null] as const;

export interface ModeState {
  mode: CheckMode;
  /** When it goes back to normal by itself (null: it doesn't). */
  until: Date | null;
  setBy: "admin" | "auto" | null;
  updatedAt: Date | null;
}

const NORMAL: ModeState = {
  mode: "normal",
  until: null,
  setBy: null,
  updatedAt: null,
};

export async function readMode(
  db: Database,
  now = new Date(),
): Promise<ModeState> {
  const [row] = await db
    .select()
    .from(captchaSettings)
    .where(eq(captchaSettings.id, 1))
    .limit(1);
  if (!row || !isCheckMode(row.mode)) return NORMAL;
  if (row.until && row.until <= now)
    return { ...NORMAL, updatedAt: row.updatedAt };
  return {
    mode: row.mode,
    until: row.until,
    setBy: row.setBy === "auto" ? "auto" : "admin",
    updatedAt: row.updatedAt,
  };
}

let cached: { state: ModeState; at: number } | null = null;
const CACHE_MS = 15_000;

/** The mode now, read from the database at most every 15 seconds. */
export async function currentMode(
  getDb: () => Promise<Database>,
  now = new Date(),
): Promise<CheckMode> {
  if (!cached || now.getTime() - cached.at > CACHE_MS) {
    cached = { state: await readMode(await getDb(), now), at: now.getTime() };
  }
  const { state } = cached;
  return state.until && state.until <= now ? "normal" : state.mode;
}

export async function setMode(
  db: Database,
  change: { mode: CheckMode; until: Date | null; setBy: "admin" | "auto" },
  now = new Date(),
): Promise<void> {
  const values = {
    ...change,
    until: change.mode === "normal" ? null : change.until,
  };
  await db
    .insert(captchaSettings)
    .values({ id: 1, ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: captchaSettings.id,
      set: { ...values, updatedAt: now },
    });
  cached = null;
}

async function writeCounts(
  db: Database,
  counts: Map<CheckRoute, CheckCounts>,
  day: string,
): Promise<void> {
  for (const [route, c] of counts) {
    await db
      .insert(captchaStats)
      .values({ day, route, ...c })
      .onConflictDoUpdate({
        target: [captchaStats.day, captchaStats.route],
        set: {
          challenged: sql`${captchaStats.challenged} + ${c.challenged}`,
          passed: sql`${captchaStats.passed} + ${c.passed}`,
          failed: sql`${captchaStats.failed} + ${c.failed}`,
          puzzles: sql`${captchaStats.puzzles} + ${c.puzzles}`,
        },
      });
  }
}

/** A flood: alert the admin (not too often) and raise a normal mode for an hour. */
async function watchForFlood(
  db: Database,
  checker: Checker,
  now: Date,
): Promise<boolean> {
  const failures = checker.failuresLastHour();
  if (failures < CHECK_FLOOD.failuresPerHour) return false;
  const state = await readMode(db, now);
  if (state.mode === "normal") {
    await setMode(
      db,
      {
        mode: "raised",
        until: new Date(now.getTime() + CHECK_FLOOD.autoRaiseMs),
        setBy: "auto",
      },
      now,
    );
  }
  const [told] = await db
    .select({ id: adminAlerts.id })
    .from(adminAlerts)
    .where(
      and(
        eq(adminAlerts.kind, "captcha-flood"),
        gte(
          adminAlerts.createdAt,
          new Date(now.getTime() - CHECK_FLOOD.alertGapMs),
        ),
      ),
    )
    .limit(1);
  if (!told) {
    await alertAdmin(
      db,
      {
        kind: "captcha-flood",
        summary: `${String(failures)} failed human checks in the last hour${state.mode === "normal" ? "; the check is raised for an hour" : ""}.`,
        path: "/admin/captcha/",
      },
      now,
    );
  }
  return true;
}

/** Writes gathered counts, purges old ones, watches for a flood. */
export async function flushChecks(
  db: Database,
  checker: Checker,
  now = new Date(),
): Promise<void> {
  await writeCounts(db, checker.takeCounts(), utcDay(now));
  await db
    .delete(captchaStats)
    .where(lt(captchaStats.day, utcDay(now, CHECK_STATS_DAYS)));
  await watchForFlood(db, checker, now);
}

let lastFlush = 0;
let flushing = false;

/** From any request, at most every minute, in the background. */
export function flushChecksInBackground(
  getDb: () => Promise<Database>,
  checker: Checker,
  now = Date.now(),
): void {
  if (flushing || now - lastFlush < MINUTE_MS) return;
  flushing = true;
  lastFlush = now;
  void getDb()
    .then((db) => flushChecks(db, checker))
    .catch((error: unknown) => {
      console.warn("Human check counts weren't written:", error);
    })
    .finally(() => {
      flushing = false;
    });
}

/** Daily counts for the admin page, newest first. */
export async function recentStats(
  db: Database,
  days: number,
  now = new Date(),
) {
  return db
    .select()
    .from(captchaStats)
    .where(gte(captchaStats.day, utcDay(now, days - 1)))
    .orderBy(desc(captchaStats.day), captchaStats.route);
}
