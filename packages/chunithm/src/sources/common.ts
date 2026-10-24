export type SourceName = "sega" | "otoge-db" | "sdvx.in";

/** A source answered with something we can't use (so nothing from it is applied). */
export class SourceError extends Error {
  constructor(
    readonly source: SourceName,
    message: string,
  ) {
    super(`${source}: ${message}`);
    this.name = "SourceError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A string field, trimmed; "" when missing or not a string (or number). */
export function field(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** "20261008" → "2026-10-08", or null. */
export function compactDay(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const day = `${match[1] ?? ""}-${match[2] ?? ""}-${match[3] ?? ""}`;
  return Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ? null : day;
}
