/**
 * Every feature that stores files says so here, with its rules (who uploads, which
 * types, how big, whether uploads wait for review). Uploads name a purpose; the
 * storage API refuses any other. A new feature that needs files adds an entry.
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
];

export function findPurpose(
  slug: string | undefined,
  purposes: readonly StoragePurpose[] = STORAGE_PURPOSES,
): StoragePurpose | undefined {
  return purposes.find((purpose) => purpose.slug === slug);
}
