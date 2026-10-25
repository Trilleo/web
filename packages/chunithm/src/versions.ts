/**
 * CHUNITHM's versions (each a year or half-year of the game). Every source names them
 * its own way: otoge-db "AIR+" and "無印", sdvx.in's removed songs "LUMINOUS PLUS".
 * `versionSlug` turns any of them into one slug.
 *
 * A version that isn't listed here still works: it gets a slug from its name and sorts
 * after the known ones by when it started. Add it here when it's convenient, so the
 * name shows as the game writes it.
 */
export interface KnownVersion {
  slug: string;
  name: string;
}

export const KNOWN_VERSIONS: readonly KnownVersion[] = [
  { slug: "chunithm", name: "CHUNITHM" },
  { slug: "plus", name: "CHUNITHM PLUS" },
  { slug: "air", name: "AIR" },
  { slug: "air-plus", name: "AIR PLUS" },
  { slug: "star", name: "STAR" },
  { slug: "star-plus", name: "STAR PLUS" },
  { slug: "amazon", name: "AMAZON" },
  { slug: "amazon-plus", name: "AMAZON PLUS" },
  { slug: "crystal", name: "CRYSTAL" },
  { slug: "crystal-plus", name: "CRYSTAL PLUS" },
  { slug: "paradise", name: "PARADISE" },
  { slug: "paradise-lost", name: "PARADISE LOST" },
  { slug: "new", name: "NEW" },
  { slug: "new-plus", name: "NEW PLUS" },
  { slug: "sun", name: "SUN" },
  { slug: "sun-plus", name: "SUN PLUS" },
  { slug: "luminous", name: "LUMINOUS" },
  { slug: "luminous-plus", name: "LUMINOUS PLUS" },
  { slug: "verse", name: "VERSE" },
  { slug: "x-verse", name: "X-VERSE" },
  { slug: "x-verse-x", name: "X-VERSE-X" },
  { slug: "mate", name: "Mate" },
];

/** Names that don't slug to the right version by themselves. */
const ALIASES: Record<string, string> = {
  無印: "chunithm",
  "paradise×": "paradise-lost",
  paradisex: "paradise-lost",
};

/** "AIR+", "LUMINOUS PLUS", "X-VERSE-X", "Mate", "無印" → a slug; "" for nothing usable. */
export function versionSlug(name: string): string {
  const plain = name.normalize("NFKC").trim().toLowerCase();
  const alias = ALIASES[plain] ?? ALIASES[plain.replace(/\s+/g, "")];
  if (alias) return alias;
  return plain
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The game's own name for a slug, or the name a source gave for one we don't know. */
export function versionName(slug: string, fallback?: string): string {
  return (
    KNOWN_VERSIONS.find((version) => version.slug === slug)?.name ??
    fallback ??
    slug.toUpperCase()
  );
}

/** Where a known version sorts (0 for CHUNITHM), or null for one we don't know. */
export function knownVersionIndex(slug: string): number | null {
  const index = KNOWN_VERSIONS.findIndex((version) => version.slug === slug);
  return index === -1 ? null : index;
}

/**
 * otoge-db freezes each version's constants when it ends, as
 * chunithm/data/music-ex-<slug without hyphens>-final.json.
 */
export function otogeFinalFile(slug: string): string {
  return `music-ex-${slug.replace(/-/g, "")}-final.json`;
}
