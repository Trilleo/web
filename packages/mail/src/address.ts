/**
 * Email addresses: what the site accepts and how it stores them. Deliberately
 * simple (one @, a dotted domain, no spaces or control characters): the real check
 * is the code sent to the address.
 */

/** RFC 5321's limit on a whole address. */
export const EMAIL_MAX_LENGTH = 254;

const LOCAL_PART = /^[^\s@"<>(),;:\\[\]]+$/;
const DOMAIN_LABEL = /^[a-z0-9-]{1,63}$/;

/**
 * The address as stored, or null when it isn't one. Lower-cased whole: providers
 * treat the local part case-insensitively in practice, and one spelling per address
 * keeps the unique index honest.
 */
export function normalizeEmail(input: string): string | null {
  const address = input.trim().toLowerCase();
  if (address.length === 0 || address.length > EMAIL_MAX_LENGTH) return null;
  // Header injection: nothing that could end a header line, ever.
  if (/[\r\n\0]/.test(address)) return null;
  const at = address.lastIndexOf("@");
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  if (at < 1 || local.length > 64 || !LOCAL_PART.test(local)) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes(".."))
    return null;
  // Split, not one big pattern: no backtracking on long input.
  const labels = domain.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!DOMAIN_LABEL.test(label)) return null;
    if (label.startsWith("-") || label.endsWith("-")) return null;
  }
  return address;
}

/** "a•••@example.com": enough to recognise an address, not to harvest it. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${address.slice(0, 1)}•••${address.slice(at)}`;
}

/**
 * `Name <address>` for a From or To header. The name is quoted, and anything that
 * could break out of the quotes or the header is dropped.
 */
export function formatAddress(name: string | null, address: string): string {
  const clean = (name ?? "").replace(/[\r\n\0"\\<>]/g, "").trim();
  return clean ? `"${clean}" <${address}>` : address;
}

/** The address inside `Name <address>` (or the whole string when it's bare). */
export function addressOf(value: string): string {
  const match = /<([^<>]+)>\s*$/.exec(value);
  return (match?.[1] ?? value).trim();
}
