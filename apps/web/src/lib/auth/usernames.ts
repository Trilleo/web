/**
 * The site's own usernames: the handle in /people/<username>/, creator and island
 * pages, and @mentions. Lower-case letters, digits and single hyphens. People choose
 * one when they sign up (or get one made from their GitHub login) and can change it
 * every USERNAME_COOLDOWN_DAYS; the old one redirects, and stays theirs, for
 * USERNAME_HOLD_DAYS.
 */
import { usernameHistory, users, type Database, type User } from "@trilleo/db";
import { and, eq, gt, ne } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;

export const USERNAME_LIMITS = { min: 3, max: 30 } as const;
/** Between two changes of username. */
export const USERNAME_COOLDOWN_DAYS = 30;
/** How long an old username redirects and nobody else can take it. */
export const USERNAME_HOLD_DAYS = 30;

const PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Names that would look official or collide with the site's own words. Accounts
 * from before usernames existed keep theirs even if listed here.
 */
const RESERVED = new Set([
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "auth",
  "contact",
  "games",
  "help",
  "login",
  "logout",
  "mail",
  "me",
  "minecraft",
  "moderator",
  "new",
  "null",
  "official",
  "people",
  "root",
  "security",
  "settings",
  "sign-in",
  "sign-out",
  "sign-up",
  "signin",
  "signup",
  "staff",
  "support",
  "system",
  "tools",
  "trilleo",
  "undefined",
  "writing",
  "www",
]);

export type UsernameProblem =
  "short" | "long" | "characters" | "reserved" | "taken" | "same" | "cooldown";

export const USERNAME_PROBLEMS: Readonly<Record<UsernameProblem, string>> = {
  short: `At least ${String(USERNAME_LIMITS.min)} characters.`,
  long: `At most ${String(USERNAME_LIMITS.max)} characters.`,
  characters:
    "Use lower-case letters, digits and hyphens (not two in a row, or at either end).",
  reserved: "That one’s reserved for the site. Pick another.",
  taken: "Someone else has that username. Pick another.",
  same: "That’s already your username.",
  cooldown: `You can change your username once every ${String(USERNAME_COOLDOWN_DAYS)} days.`,
};

/** As typed, give or take spaces and capitals (usernames are lower-case). */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, "");
}

/** What's wrong with a username's shape, or null. Doesn't check who has it. */
export function usernameShapeProblem(name: string): UsernameProblem | null {
  if (name.length < USERNAME_LIMITS.min) return "short";
  if (name.length > USERNAME_LIMITS.max) return "long";
  if (!PATTERN.test(name)) return "characters";
  if (RESERVED.has(name)) return "reserved";
  return null;
}

function heldSince(now: Date): Date {
  return new Date(now.getTime() - USERNAME_HOLD_DAYS * DAY_MS);
}

/**
 * Whether `name` is free for `userId` (or for a new account): nobody has it, and
 * nobody else gave it up recently. Taking back your own old name is fine.
 */
export async function usernameAvailable(
  db: Database,
  name: string,
  userId: string | null,
  now = new Date(),
): Promise<boolean> {
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, name))
    .limit(1);
  if (owner) return owner.id === userId;
  const [held] = await db
    .select({ userId: usernameHistory.userId })
    .from(usernameHistory)
    .where(
      and(
        eq(usernameHistory.username, name),
        gt(usernameHistory.releasedAt, heldSince(now)),
      ),
    )
    .limit(1);
  return !held || held.userId === userId;
}

/** Turns anything (a GitHub login, an address's local part) into a username's shape. */
export function usernameBase(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_LIMITS.max - 4)
    .replace(/-+$/, "");
  if (base.length >= USERNAME_LIMITS.min && !RESERVED.has(base)) return base;
  return base ? `${base}-user`.replace(/^-/, "") : "user";
}

/** A free username close to `input`: itself, then with -2, -3… */
export async function suggestUsername(
  db: Database,
  input: string,
  now = new Date(),
): Promise<string> {
  const base = usernameBase(input);
  if (await usernameAvailable(db, base, null, now)) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${String(n)}`;
    if (await usernameAvailable(db, candidate, null, now)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A new username for a new account: its shape, then whether it's free. */
export async function checkNewUsername(
  db: Database,
  input: string,
  now = new Date(),
): Promise<
  { ok: true; username: string } | { ok: false; problem: UsernameProblem }
> {
  const name = normalizeUsername(input);
  const problem = usernameShapeProblem(name);
  if (problem) return { ok: false, problem };
  if (!(await usernameAvailable(db, name, null, now)))
    return { ok: false, problem: "taken" };
  return { ok: true, username: name };
}

/** When `user` may next change their username (null: now). */
export function nextUsernameChange(user: User, now = new Date()): Date | null {
  if (!user.usernameChangedAt) return null;
  const at = new Date(
    user.usernameChangedAt.getTime() + USERNAME_COOLDOWN_DAYS * DAY_MS,
  );
  return at > now ? at : null;
}

/**
 * Gives `user` a new username. The old one goes into username_history, so links to
 * it redirect and nobody else takes it for USERNAME_HOLD_DAYS.
 */
export async function changeUsername(
  db: Database,
  user: User,
  input: string,
  now = new Date(),
): Promise<
  { ok: true; username: string } | { ok: false; problem: UsernameProblem }
> {
  const name = normalizeUsername(input);
  if (name === user.username) return { ok: false, problem: "same" };
  const problem = usernameShapeProblem(name);
  if (problem) return { ok: false, problem };
  if (nextUsernameChange(user, now)) return { ok: false, problem: "cooldown" };
  if (!(await usernameAvailable(db, name, user.id, now)))
    return { ok: false, problem: "taken" };
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(usernameHistory)
        .values({ username: user.username, userId: user.id, releasedAt: now })
        .onConflictDoUpdate({
          target: usernameHistory.username,
          set: { userId: user.id, releasedAt: now },
        });
      // Their own old name, taken back: it no longer needs holding.
      await tx
        .delete(usernameHistory)
        .where(eq(usernameHistory.username, name));
      await tx
        .update(users)
        // github_login mirrors the username for the previous release (see schema).
        .set({ username: name, githubLogin: name, usernameChangedAt: now })
        .where(eq(users.id, user.id));
    });
  } catch {
    // The unique index: someone took it a moment ago.
    return { ok: false, problem: "taken" };
  }
  return { ok: true, username: name };
}

/**
 * The username someone moved to from `input`, while the old one still redirects
 * (USERNAME_HOLD_DAYS): for 301s from /people/<old>/ and the like. Call it only
 * once nobody has `input` itself. Like profiles, a private or blocked account
 * doesn't give its new name away, except to itself.
 */
export async function movedUsername(
  db: Database,
  input: string,
  viewerId: string | null,
  now = new Date(),
): Promise<string | null> {
  const name = normalizeUsername(input);
  if (!name) return null;
  const [moved] = await db
    .select({
      id: users.id,
      username: users.username,
      profilePublic: users.profilePublic,
      blockedAt: users.blockedAt,
    })
    .from(usernameHistory)
    .innerJoin(users, eq(users.id, usernameHistory.userId))
    .where(
      and(
        eq(usernameHistory.username, name),
        gt(usernameHistory.releasedAt, heldSince(now)),
        ne(users.username, name),
      ),
    )
    .limit(1);
  if (!moved) return null;
  const visible = moved.profilePublic && moved.blockedAt === null;
  return visible || moved.id === viewerId ? moved.username : null;
}
