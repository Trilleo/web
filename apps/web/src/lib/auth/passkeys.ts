/**
 * Passkeys: the options the browser needs, and the stored side of adding one
 * (/account/security/) and signing in with one (/sign-in). The checks themselves
 * are in webauthn.ts. Each ceremony's challenge travels in the short-lived
 * `trilleo_webauthn` cookie (httpOnly, so a page can't plant one).
 */
import {
  passkeys,
  users,
  type Database,
  type Passkey,
  type User,
} from "@trilleo/db";
import { and, count, desc, eq } from "drizzle-orm";
import { randomToken } from "./crypto";
import { describeUserAgent } from "./devices";
import {
  COSE_ALGORITHMS,
  WebAuthnError,
  fromBase64Url,
  toBase64Url,
  verifyAssertion,
  verifyRegistration,
  type Expected,
} from "./webauthn";
import { SITE_NAME } from "../site";

/** Passkeys per account. */
export const MAX_PASSKEYS = 10;
/** How long the browser may take. */
export const PASSKEY_TIMEOUT_MS = 5 * 60 * 1000;
export const PASSKEY_NAME_MAX = 60;

const TRANSPORTS = new Set([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

/** The challenge for one ceremony: random, sent to the browser and kept in a cookie. */
export function newChallenge(): string {
  return randomToken();
}

/** Where this request says it is: the RP ID is the hostname, the origin the origin. */
export function relyingParty(url: URL): { rpId: string; origin: string } {
  return { rpId: url.hostname, origin: url.origin };
}

/** The user handle authenticators keep: the account's UUID as bytes (no personal data). */
function userHandle(userId: string): string {
  return toBase64Url(Buffer.from(userId.replaceAll("-", ""), "hex"));
}

function userFromHandle(handle: string): string | null {
  try {
    const hex = fromBase64Url(handle).toString("hex");
    if (hex.length !== 32) return null;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

/** PublicKeyCredentialCreationOptions, as JSON (binary fields base64url). */
export function registrationOptions(
  user: User,
  existing: readonly Pick<Passkey, "id" | "transports">[],
  url: URL,
  challenge: string,
) {
  return {
    challenge,
    rp: { id: relyingParty(url).rpId, name: SITE_NAME },
    user: {
      id: userHandle(user.id),
      name: user.email ?? user.username,
      displayName: `@${user.username}`,
    },
    pubKeyCredParams: COSE_ALGORITHMS.map((alg) => ({
      type: "public-key",
      alg,
    })),
    timeout: PASSKEY_TIMEOUT_MS,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
    excludeCredentials: existing.map((passkey) => ({
      type: "public-key",
      id: passkey.id,
      transports: passkey.transports,
    })),
  };
}

/** PublicKeyCredentialRequestOptions: any passkey for this site (discoverable). */
export function authenticationOptions(url: URL, challenge: string) {
  return {
    challenge,
    rpId: relyingParty(url).rpId,
    timeout: PASSKEY_TIMEOUT_MS,
    userVerification: "required",
    allowCredentials: [],
  };
}

export async function listPasskeys(
  db: Database,
  userId: string,
): Promise<Passkey[]> {
  return db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .orderBy(desc(passkeys.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function field(record: Record<string, unknown>, name: string): Buffer {
  const value = record[name];
  if (typeof value !== "string") throw new WebAuthnError(`Missing ${name}`);
  return fromBase64Url(value);
}

export type PasskeyError =
  "invalid" | "too-many" | "already-added" | "unknown" | "not-allowed";

export const PASSKEY_ERRORS: Readonly<Record<PasskeyError, string>> = {
  invalid: "That passkey didn’t check out. Please try again.",
  "too-many": `You can have up to ${String(MAX_PASSKEYS)} passkeys. Remove one first.`,
  "already-added": "That passkey is already on an account here.",
  unknown:
    "That passkey isn’t on any account here (it may have been removed). Sign in with your email instead.",
  "not-allowed": "That account can’t sign in here.",
};

/**
 * Adds the passkey from the browser's answer (`credential`: the PublicKeyCredential
 * as JSON, binary fields base64url) to `user`.
 */
export async function addPasskey(
  db: Database,
  user: User,
  credential: unknown,
  input: { expected: Expected; userAgent: string | null; now?: Date },
): Promise<
  { ok: true; passkey: Passkey } | { ok: false; error: PasskeyError }
> {
  const now = input.now ?? new Date();
  const [mine] = await db
    .select({ n: count() })
    .from(passkeys)
    .where(eq(passkeys.userId, user.id));
  if ((mine?.n ?? 0) >= MAX_PASSKEYS) return { ok: false, error: "too-many" };
  if (!isRecord(credential) || !isRecord(credential.response))
    return { ok: false, error: "invalid" };
  const response = credential.response;

  let verified;
  try {
    verified = verifyRegistration({
      clientDataJSON: field(response, "clientDataJSON"),
      attestationObject: field(response, "attestationObject"),
      expected: input.expected,
    });
  } catch (error) {
    if (!(error instanceof WebAuthnError)) throw error;
    return { ok: false, error: "invalid" };
  }
  const transports = Array.isArray(response.transports)
    ? response.transports.filter(
        (t): t is string => typeof t === "string" && TRANSPORTS.has(t),
      )
    : [];
  try {
    const [passkey] = await db
      .insert(passkeys)
      .values({
        id: verified.id,
        userId: user.id,
        publicKey: verified.publicKey,
        algorithm: verified.algorithm,
        signCount: verified.signCount,
        transports,
        backedUp: verified.backedUp,
        name: describeUserAgent(input.userAgent),
        createdAt: now,
      })
      .returning();
    if (!passkey) throw new Error("Saving the passkey returned nothing");
    return { ok: true, passkey };
  } catch {
    // The primary key: this credential is already stored.
    return { ok: false, error: "already-added" };
  }
}

/** Checks a sign-in answer; the passkey's account, ready for startSession. */
export async function signInWithPasskey(
  db: Database,
  credential: unknown,
  input: { expected: Expected; now?: Date },
): Promise<{ ok: true; user: User } | { ok: false; error: PasskeyError }> {
  const now = input.now ?? new Date();
  if (
    !isRecord(credential) ||
    typeof credential.id !== "string" ||
    !isRecord(credential.response)
  )
    return { ok: false, error: "invalid" };
  const response = credential.response;
  const [row] = await db
    .select({ passkey: passkeys, user: users })
    .from(passkeys)
    .innerJoin(users, eq(users.id, passkeys.userId))
    .where(eq(passkeys.id, credential.id))
    .limit(1);
  if (!row) return { ok: false, error: "unknown" };
  // If the authenticator names the account, it must be this passkey's.
  if (
    typeof response.userHandle === "string" &&
    response.userHandle !== "" &&
    userFromHandle(response.userHandle) !== row.user.id
  )
    return { ok: false, error: "invalid" };

  let checked;
  try {
    checked = verifyAssertion({
      clientDataJSON: field(response, "clientDataJSON"),
      authenticatorData: field(response, "authenticatorData"),
      signature: field(response, "signature"),
      expected: input.expected,
      publicKey: row.passkey.publicKey,
      signCount: row.passkey.signCount,
    });
  } catch (error) {
    if (!(error instanceof WebAuthnError)) throw error;
    return { ok: false, error: "invalid" };
  }
  if (row.user.blockedAt) return { ok: false, error: "not-allowed" };
  await db
    .update(passkeys)
    .set({
      signCount: checked.signCount,
      backedUp: checked.backedUp,
      lastUsedAt: now,
    })
    .where(eq(passkeys.id, row.passkey.id));
  return { ok: true, user: row.user };
}

export async function renamePasskey(
  db: Database,
  userId: string,
  id: string,
  name: string,
): Promise<boolean> {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, PASSKEY_NAME_MAX);
  if (!clean) return false;
  const changed = await db
    .update(passkeys)
    .set({ name: clean })
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
    .returning({ id: passkeys.id });
  return changed.length > 0;
}

/** Removes one of their passkeys; its name, or null if it wasn't theirs. */
export async function removePasskey(
  db: Database,
  userId: string,
  id: string,
): Promise<string | null> {
  const [gone] = await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
    .returning({ name: passkeys.name });
  return gone?.name ?? null;
}
