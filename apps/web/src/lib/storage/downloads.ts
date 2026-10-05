/**
 * Download counting for /d/<id>: roughly once per visitor per file per UTC day. The
 * visitor is a hash of their IP and browser, kept only in this process's memory
 * and forgotten when the day changes, so nothing about them is stored.
 */
import { createHash } from "node:crypto";

const MAX_REMEMBERED = 100_000;
let day = "";
let seen = new Set<string>();

/** True the first time today this visitor downloads this file. */
export function firstDownloadToday(
  fileId: string,
  visitor: { ip: string; userAgent: string },
  now = new Date(),
): boolean {
  const today = now.toISOString().slice(0, 10);
  if (today !== day || seen.size >= MAX_REMEMBERED) {
    day = today;
    seen = new Set();
  }
  const id = createHash("sha256")
    .update(`${today}\n${visitor.ip}\n${visitor.userAgent}\n${fileId}`)
    .digest("base64url");
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
}

/** Likely crawlers and link previews: their visits aren't downloads. */
export function looksLikeBot(userAgent: string): boolean {
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget/i.test(
    userAgent,
  );
}
