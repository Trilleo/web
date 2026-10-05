/**
 * Every feature that stores files says so here, with its rules (who uploads, which
 * types, how big, whether uploads wait for review). Uploads name a purpose; the
 * storage API refuses any other. A new feature that needs files adds an entry.
 *
 * A purpose with `enabled: false` is defined but refuses uploads until its feature
 * goes live. STORAGE_ENABLE_PURPOSES (comma-separated slugs) switches such purposes
 * on without a code change: e2e does that for `shared`.
 */
import type { StoragePurpose } from "@trilleo/storage";

export const STORAGE_PURPOSES: readonly StoragePurpose[] = [
  {
    slug: "site",
    label: "Site files",
    uploaders: "admin",
    visibilities: ["public", "unlisted", "private"],
    defaultVisibility: "public",
    review: "never",
  },
  {
    // What people's uploads will use (the creator platform): public files wait for
    // review until the uploader is trusted. Not live yet.
    slug: "shared",
    label: "People’s uploads",
    uploaders: "users",
    visibilities: ["public", "unlisted", "private"],
    defaultVisibility: "public",
    review: "untrusted",
    enabled: false,
  },
];

/** The registry with STORAGE_ENABLE_PURPOSES applied. */
export function activePurposes(
  env: Record<string, string | undefined> = process.env,
  purposes: readonly StoragePurpose[] = STORAGE_PURPOSES,
): readonly StoragePurpose[] {
  const enable = new Set(
    (env.STORAGE_ENABLE_PURPOSES ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
  );
  if (enable.size === 0) return purposes;
  return purposes.map((purpose) =>
    enable.has(purpose.slug) ? { ...purpose, enabled: true } : purpose,
  );
}

export function findPurpose(
  slug: string | undefined,
  purposes: readonly StoragePurpose[] = activePurposes(),
): StoragePurpose | undefined {
  return purposes.find((purpose) => purpose.slug === slug);
}
