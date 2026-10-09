/**
 * How far the move to accounts-by-email has got, for /admin. Accounts from before
 * it have no address until their next sign-in: GitHub's verified address is taken
 * if no other account has it (adoptVerifiedEmail), otherwise they're asked for one
 * (src/lib/auth/setup.ts). Nothing here changes anything.
 */
import { users, type Database, type User } from "@trilleo/db";
import { and, count, desc, isNotNull, isNull } from "drizzle-orm";
import type { AuthConfig } from "./config";

/** Accounts without an address listed on /admin (the rest are counted). */
export const MIGRATION_LIST = 10;

export interface AccountMigration {
  total: number;
  withEmail: number;
  /** Not blocked, no address yet. */
  waiting: number;
  /** The most recently seen of them. */
  recent: Pick<User, "id" | "username" | "lastSignInAt">[];
  /** Advice about the admin's own account, if any. */
  admin: "add-email" | "set-admin-emails" | null;
}

/**
 * What /admin says about the admin's account: add an address (they'd otherwise be
 * asked at their next sign-in anyway), then name it in ADMIN_EMAILS, so admin access
 * no longer depends on a linked GitHub account.
 */
export function adminAdvice(
  admin: Pick<User, "email">,
  config: Pick<AuthConfig, "adminEmails">,
): AccountMigration["admin"] {
  if (!admin.email) return "add-email";
  return config.adminEmails.has(admin.email) ? null : "set-admin-emails";
}

export async function accountMigration(
  db: Database,
  admin: Pick<User, "email">,
  config: Pick<AuthConfig, "adminEmails">,
): Promise<AccountMigration> {
  const [all] = await db.select({ n: count() }).from(users);
  const [proved] = await db
    .select({ n: count() })
    .from(users)
    .where(isNotNull(users.email));
  const without = and(isNull(users.email), isNull(users.blockedAt));
  const [waiting] = await db.select({ n: count() }).from(users).where(without);
  const recent = await db
    .select({
      id: users.id,
      username: users.username,
      lastSignInAt: users.lastSignInAt,
    })
    .from(users)
    .where(without)
    .orderBy(desc(users.lastSignInAt))
    .limit(MIGRATION_LIST);
  return {
    total: all?.n ?? 0,
    withEmail: proved?.n ?? 0,
    waiting: waiting?.n ?? 0,
    recent,
    admin: adminAdvice(admin, config),
  };
}
