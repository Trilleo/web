/**
 * /.well-known/security.txt (RFC 9116): where to report vulnerabilities. Built with
 * the site, so `Expires` is a year after each build (deploys are far more often).
 */
import { CONTACT_EMAIL, SITE_URL } from "./site";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function securityTxt(now = new Date()): string {
  const expires = new Date(now.getTime() + YEAR_MS);
  expires.setUTCHours(0, 0, 0, 0);
  return [
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Contact: ${new URL("/contact/", SITE_URL).href}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en, zh",
    `Canonical: ${new URL("/.well-known/security.txt", SITE_URL).href}`,
    `Policy: ${new URL("/security/", SITE_URL).href}`,
    "",
  ].join("\n");
}
