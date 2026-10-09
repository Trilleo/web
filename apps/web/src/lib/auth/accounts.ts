/**
 * Accounts and the ways into them. An account is its email address; other ways to
 * sign in (for now GitHub) are identities linked to it, found by the ID the provider
 * never changes, so renaming yourself on GitHub changes nothing here.
 */
import {
  userIdentities,
  usernameHistory,
  users,
  type Database,
  type IdentityProvider,
  type User,
  type UserIdentity,
} from "@trilleo/db";
import { and, eq } from "drizzle-orm";
import { randomToken } from "./crypto";
import { suggestUsername } from "./usernames";

/** What a provider tells us about the account someone signed in with. */
export interface ProviderProfile {
  provider: IdentityProvider;
  /** The provider's permanent ID for the account. */
  id: string;
  /** Its username there, which can change. */
  login: string;
  name: string | null;
  /** Its primary address, if the provider says it's verified. */
  verifiedEmail: string | null;
}

export const PROVIDER_LABELS: Readonly<Record<IdentityProvider, string>> = {
  github: "GitHub",
};

/** The account with this (proved) address. */
export async function userByEmail(
  db: Database,
  email: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user;
}

/** The account a provider's account is linked to, with the link. */
export async function findIdentity(
  db: Database,
  provider: IdentityProvider,
  providerUserId: string,
): Promise<{ user: User; identity: UserIdentity } | undefined> {
  const [row] = await db
    .select({ user: users, identity: userIdentities })
    .from(userIdentities)
    .innerJoin(users, eq(users.id, userIdentities.userId))
    .where(
      and(
        eq(userIdentities.provider, provider),
        eq(userIdentities.providerUserId, providerUserId),
      ),
    )
    .limit(1);
  return row;
}

export async function identitiesOf(
  db: Database,
  userId: string,
): Promise<UserIdentity[]> {
  return db
    .select()
    .from(userIdentities)
    .where(eq(userIdentities.userId, userId))
    .orderBy(userIdentities.linkedAt);
}

/**
 * Makes an account. `email` must already be proved (a code, or a provider that
 * verified it); null only for an account that will be asked for one.
 */
export async function createAccount(
  db: Database,
  input: {
    username: string;
    email: string | null;
    name?: string | null;
    now?: Date;
  },
): Promise<User> {
  const now = input.now ?? new Date();
  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      // Mirrors the username for the previous release (see the schema).
      githubLogin: input.username,
      name: input.name ?? null,
      email: input.email,
      emailVerifiedAt: input.email ? now : null,
      emailToken: input.email ? randomToken() : null,
      createdAt: now,
      lastSignInAt: now,
    })
    .returning();
  if (!user) throw new Error("Saving the user returned nothing");
  return user;
}

export type LinkError = "linked-elsewhere" | "already-linked";

/** Links a provider's account to `userId`. */
export async function linkIdentity(
  db: Database,
  userId: string,
  profile: ProviderProfile,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: LinkError }> {
  const existing = await findIdentity(db, profile.provider, profile.id);
  if (existing)
    return existing.user.id === userId
      ? { ok: true }
      : { ok: false, error: "linked-elsewhere" };
  const [mine] = await db
    .select({ id: userIdentities.id })
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.userId, userId),
        eq(userIdentities.provider, profile.provider),
      ),
    )
    .limit(1);
  if (mine) return { ok: false, error: "already-linked" };
  try {
    await db.transaction(async (tx) => {
      await tx.insert(userIdentities).values({
        userId,
        provider: profile.provider,
        providerUserId: profile.id,
        login: profile.login,
        linkedAt: now,
        lastUsedAt: now,
      });
      // users.github_id mirrors the GitHub link, for the ADMIN_GITHUB_IDS check.
      // GitHub is the only provider so far; another one wouldn't set it.
      await tx
        .update(users)
        .set({
          githubId: Number(profile.id),
          ...(profile.name && { name: profile.name }),
        })
        .where(eq(users.id, userId));
    });
  } catch {
    // A unique index: linked a moment ago, here or elsewhere.
    return { ok: false, error: "linked-elsewhere" };
  }
  return { ok: true };
}

/**
 * Unlinks a provider. Email always remains a way in, so an account without an
 * address can't unlink its last identity.
 */
export async function unlinkIdentity(
  db: Database,
  user: User,
  provider: IdentityProvider,
): Promise<{ ok: true } | { ok: false; error: "last-way-in" | "not-linked" }> {
  if (!user.email) return { ok: false, error: "last-way-in" };
  const gone = await db
    .delete(userIdentities)
    .where(
      and(
        eq(userIdentities.userId, user.id),
        eq(userIdentities.provider, provider),
      ),
    )
    .returning({ id: userIdentities.id });
  if (gone.length === 0) return { ok: false, error: "not-linked" };
  // The mirror of the GitHub link (GitHub is the only provider so far).
  await db.update(users).set({ githubId: null }).where(eq(users.id, user.id));
  return { ok: true };
}

/** A sign-in through an identity: refreshes what the provider says about it. */
export async function touchIdentity(
  db: Database,
  user: User,
  identity: UserIdentity,
  profile: ProviderProfile,
  now = new Date(),
): Promise<User> {
  await db
    .update(userIdentities)
    .set({ login: profile.login, lastUsedAt: now })
    .where(eq(userIdentities.id, identity.id));
  const [updated] = await db
    .update(users)
    .set({ name: profile.name, lastSignInAt: now })
    .where(eq(users.id, user.id))
    .returning();
  return updated ?? user;
}

/**
 * Gives an account without an address the one its provider verified, if no other
 * account has it: how accounts from before email sign-in move over. Returns the
 * updated account, or null if nothing changed.
 */
export async function adoptVerifiedEmail(
  db: Database,
  user: User,
  email: string | null,
  now = new Date(),
): Promise<User | null> {
  if (user.email || !email) return null;
  if (await userByEmail(db, email)) return null;
  try {
    const [updated] = await db
      .update(users)
      .set({ email, emailVerifiedAt: now, emailToken: randomToken() })
      .where(eq(users.id, user.id))
      .returning();
    return updated ?? null;
  } catch {
    // The unique index: another account claimed it a moment ago.
    return null;
  }
}

/** A new account from a provider's: a username like its login, its verified address. */
export async function createFromProvider(
  db: Database,
  profile: ProviderProfile,
  now = new Date(),
): Promise<User> {
  const username = await suggestUsername(db, profile.login, now);
  const user = await createAccount(db, {
    username,
    email: profile.verifiedEmail,
    name: profile.name,
    now,
  });
  const linked = await linkIdentity(db, user.id, profile, now);
  if (!linked.ok) {
    await db.delete(users).where(eq(users.id, user.id));
    throw new Error(`Linking the new account failed: ${linked.error}`);
  }
  const [fresh] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return fresh ?? user;
}

/**
 * Signs in a GitHub account, making its account if needed (no address-matching:
 * that's the sign-in flow's job). For tests and seeding; the callback goes through
 * completeSignIn.
 */
export async function upsertGitHubUser(
  db: Database,
  profile: { id: number; login: string; name: string | null; email?: string },
  now = new Date(),
): Promise<User> {
  const provider: ProviderProfile = {
    provider: "github",
    id: String(profile.id),
    login: profile.login,
    name: profile.name,
    verifiedEmail: profile.email ?? null,
  };
  const found = await findIdentity(db, "github", provider.id);
  if (found)
    return touchIdentity(db, found.user, found.identity, provider, now);
  return createFromProvider(db, provider, now);
}

/** Usernames they've given up that still redirect to them (for the export). */
export async function usernameHistoryOf(db: Database, userId: string) {
  return db
    .select({
      username: usernameHistory.username,
      releasedAt: usernameHistory.releasedAt,
    })
    .from(usernameHistory)
    .where(eq(usernameHistory.userId, userId));
}
