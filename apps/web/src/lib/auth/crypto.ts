import { createHash, randomBytes } from "node:crypto";

/** A random URL-safe secret (256 bits): session tokens, OAuth state, PKCE verifiers. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** How a session token is stored, so a database leak doesn't hand out sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The PKCE (RFC 7636) S256 challenge sent to GitHub for a code verifier. */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
