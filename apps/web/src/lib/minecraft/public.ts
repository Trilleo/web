/**
 * What the public pages share: the section's number, how a creator is credited, the
 * listing filters read from a URL, image URLs, share cards and structured data.
 */
import type {
  Database,
  McProject,
  McProjectType,
  McRelease,
  StoredFile,
  User,
} from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { displayName, profileHref } from "../profile/profile";
import { CARD_META_LENGTH, truncate, type JsonLd, type OgCard } from "../seo";
import { SITE_URL } from "../site";
import {
  PROJECT_TYPES,
  editionLabel,
  licenseInfo,
  loaderLabel,
  typeInfo,
} from "./catalog";
import { summarizeVersions } from "./format";
import { creatorPath, projectPath } from "./paths";
import { BEDROCK_VERSIONS, javaVersions } from "./game-versions";
import {
  SORTS,
  listProjects,
  popularTags,
  type ListFilter,
  type Sort,
} from "./store";

/** The section's number on the home page and in labels: "(05) Minecraft". */
export const SECTION_NUMBER = "05";
export const SECTION_LABEL = `(${SECTION_NUMBER}) Minecraft`;

export const MINECRAFT_DESCRIPTION =
  "Mods, plugins, worlds, builds and packs for Minecraft, shared by the people who made them.";

export const PER_PAGE = 24;

// --- Credits ------------------------------------------------------------------

export interface Credit {
  login: string;
  /** Their display name, when their profile is public; otherwise only @login. */
  name: string | null;
  /** Their profile, when it's public. */
  profile: string | null;
  /** Their page of projects. */
  creations: string;
}

/**
 * How a creator is credited. Publishing a project always credits its creator; a
 * private profile shows only the username (the profile rules, see /account/profile).
 */
export function creditOf(
  owner: Pick<User, "githubLogin" | "name" | "displayName" | "profilePublic">,
): Credit {
  return {
    login: owner.githubLogin,
    name: owner.profilePublic ? displayName(owner) : null,
    profile: owner.profilePublic ? profileHref(owner.githubLogin) : null,
    creations: creatorPath(owner.githubLogin),
  };
}

// --- Listing filters ----------------------------------------------------------

/** A listing's filters as the URL gives them (unknown values are dropped). */
export interface ListingQuery {
  q: string;
  version: string;
  loader: string;
  edition: "" | "java" | "bedrock";
  tag: string;
  sort: Sort | "";
  page: number;
}

export function readListingQuery(url: URL): ListingQuery {
  const get = (name: string) =>
    (url.searchParams.get(name) ?? "").trim().slice(0, 100);
  const edition = get("edition");
  const sort = get("sort");
  const page = Number.parseInt(get("page") || "1", 10);
  return {
    q: get("q"),
    version: /^[0-9a-z.]{1,16}$/i.test(get("version")) ? get("version") : "",
    loader: /^[a-z]{1,20}$/.test(get("loader")) ? get("loader") : "",
    edition: edition === "java" || edition === "bedrock" ? edition : "",
    tag: /^[a-z0-9-]{1,24}$/.test(get("tag")) ? get("tag") : "",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : "",
    page: Number.isSafeInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

export function toListFilter(
  query: ListingQuery,
  type?: McProjectType,
): ListFilter {
  return {
    ...(type ? { type } : {}),
    ...(query.q ? { q: query.q } : {}),
    ...(query.version ? { version: query.version } : {}),
    ...(query.loader ? { loader: query.loader } : {}),
    ...(query.edition ? { edition: query.edition } : {}),
    ...(query.tag ? { tag: query.tag } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    page: query.page,
    perPage: PER_PAGE,
  };
}

/** Whether a listing shows anything but its plain first page (then it's noindex). */
export function isFiltered(query: ListingQuery): boolean {
  return Boolean(
    query.q ||
    query.version ||
    query.loader ||
    query.edition ||
    query.tag ||
    query.sort ||
    query.page > 1,
  );
}

/** The same listing with some filters changed ("" removes one). */
export function listingHref(
  path: string,
  query: ListingQuery,
  change: Partial<Record<keyof ListingQuery, string | number>> = {},
): string {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...query, ...change })) {
    const text = String(value);
    if (text && !(key === "page" && text === "1")) merged[key] = text;
  }
  // A new filter starts from the first page.
  if (!("page" in change)) delete merged.page;
  const search = new URLSearchParams(merged).toString();
  return search ? `${path}?${search}` : path;
}

/** "3 mods", "1 project". */
export function countLabel(n: number, type?: McProjectType): string {
  const noun = type
    ? (n === 1 ? typeInfo(type).label : typeInfo(type).plural).toLowerCase()
    : n === 1
      ? "project"
      : "projects";
  return `${n.toLocaleString("en")} ${noun}`;
}

export function typeOptions() {
  return PROJECT_TYPES.map((info) => ({
    type: info.type,
    label: info.plural,
    segment: info.segment,
  }));
}

// --- Images ---------------------------------------------------------------------

/**
 * Where a stored image can be shown: its public address once published; for its
 * owner (or the admin) before that, a short-lived signed link.
 */
export async function imageUrl(
  storage: StorageDriver | null,
  file: Pick<StoredFile, "key" | "status" | "purgedAt" | "visibility">,
  key = file.key,
): Promise<string | null> {
  if (!storage || file.purgedAt) return null;
  if (file.status === "published") return storage.publicUrl(key);
  return storage.signedUrl(key, 15 * 60);
}

// --- Share cards and structured data ----------------------------------------------

export function projectCard(
  project: Pick<McProject, "type" | "name">,
  owner: Pick<User, "githubLogin">,
  gameVersions: readonly string[],
): OgCard {
  const parts = [`@${owner.githubLogin}`];
  if (gameVersions.length > 0) parts.push(summarizeVersions(gameVersions));
  return {
    section: `${SECTION_LABEL} / ${typeInfo(project.type).label}`,
    title: project.name,
    meta: truncate(parts.join(" · "), CARD_META_LENGTH),
  };
}

export const SECTION_CARD: OgCard = {
  section: SECTION_LABEL,
  title: "Minecraft creations",
  meta: "Mods · Plugins · Worlds · Builds · Packs",
};

function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

export interface ProjectJsonLdInput {
  project: McProject;
  owner: User;
  latest: McRelease | null;
  gameVersions: readonly string[];
  loaders: readonly string[];
  downloads: number;
  image: string;
  description: string;
}

/**
 * A project as schema.org sees it: mods and plugins are software
 * (SoftwareApplication); worlds, builds and packs are creative works.
 */
export function projectJsonLd(input: ProjectJsonLdInput): JsonLd {
  const { project, owner, latest } = input;
  const credit = creditOf(owner);
  const url = absolute(projectPath(project));
  const license = licenseInfo(project.license);
  const isSoftware = project.type === "mod" || project.type === "plugin";
  const common: JsonLd = {
    "@id": `${url}#project`,
    name: project.name,
    description: input.description,
    url,
    image: absolute(input.image),
    author: {
      "@type": "Person",
      name: credit.name ?? `@${credit.login}`,
      url: absolute(credit.creations),
    },
    ...(project.firstReleasedAt && {
      datePublished: project.firstReleasedAt.toISOString(),
    }),
    dateModified: (project.lastReleasedAt ?? project.updatedAt).toISOString(),
    ...(license?.url && { license: license.url }),
    ...(project.tags.length > 0 && { keywords: project.tags.join(", ") }),
    isAccessibleForFree: true,
    inLanguage: "en",
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/DownloadAction",
      userInteractionCount: input.downloads,
    },
  };
  if (!isSoftware)
    return {
      "@type": "CreativeWork",
      ...common,
      genre: typeInfo(project.type).label,
      about: { "@type": "VideoGame", name: "Minecraft" },
    };
  return {
    "@type": "SoftwareApplication",
    ...common,
    applicationCategory: "GameApplication",
    applicationSubCategory:
      project.type === "mod" ? "Minecraft mod" : "Minecraft server plugin",
    operatingSystem: `Minecraft ${editionLabel(project.edition)}`,
    ...(latest && { softwareVersion: latest.version }),
    ...(input.loaders.length > 0 && {
      softwareRequirements: input.loaders.map(loaderLabel).join(", "),
    }),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

// --- Listing pages ------------------------------------------------------------------

/** Everything a listing page shows, from its URL. */
export async function loadListing(
  db: Database,
  url: URL,
  type?: McProjectType,
) {
  const query = readListingQuery(url);
  const [result, tags, java] = await Promise.all([
    listProjects(db, toListFilter(query, type)),
    popularTags(db, type, 24),
    javaVersions().versions(),
  ]);
  return {
    query,
    ...result,
    tags,
    versions: [...java, ...BEDROCK_VERSIONS],
    noindex: isFiltered(query),
  };
}
