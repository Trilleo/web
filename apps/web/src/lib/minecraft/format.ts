/** Short texts for lists and pages. */
import { compareVersions, versionLine } from "./game-versions";

/**
 * Minecraft versions in a few words: "1.21.4", "1.21–1.21.4", "1.20.1, 1.21.4":
 * a few are listed, more become oldest–newest.
 */
export function summarizeVersions(
  versions: readonly string[],
  max = 3,
): string {
  if (versions.length === 0) return "No versions";
  const sorted = [...versions].sort(compareVersions);
  if (sorted.length === 1) return sorted[0] ?? "";
  const lines = [...new Set(sorted.map(versionLine))];
  if (lines.length === 1) {
    const newest = sorted[0] ?? "";
    const oldest = sorted.at(-1) ?? "";
    return `${oldest}–${newest}`;
  }
  if (sorted.length <= max) return [...sorted].reverse().join(", ");
  return `${sorted.at(-1) ?? ""}–${sorted[0] ?? ""}`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
