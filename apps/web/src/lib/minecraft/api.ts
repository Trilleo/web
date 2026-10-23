/**
 * The platform's public JSON API (read-only, open to any site), for launchers, bots
 * and other tools. The same data is in the site's API (lib/api/routes/minecraft.ts,
 * /v1/minecraft/…); the old addresses, served by src/pages/api/minecraft/v1/[...path].ts,
 * still work but answer with a Deprecation header:
 *
 *   GET /api/minecraft/v1/projects                   listed projects (the listing's
 *       ?q= &type= &version= &loader= &edition= &tag= &sort= &page=)
 *   GET /api/minecraft/v1/projects/<slug>            one project, with its releases
 *   GET /api/minecraft/v1/projects/<slug>/latest     the file Download gets
 *       (?version= &loader= &channel=)
 *
 * Projects others can't see are 404s. Unlisted ones answer by slug but aren't listed.
 */
import type { Database, McProjectType } from "@trilleo/db";
import { getStorage } from "../storage/config";
import { downloadPath } from "../storage/service";
import { SITE_URL } from "../site";
import {
  CHANNELS,
  PROJECT_TYPES,
  editionLabel,
  licenseInfo,
  typeFromSegment,
  typeInfo,
} from "./catalog";
import { compareVersions } from "./game-versions";
import { creatorPath, projectPath, releasePath } from "./paths";
import {
  creditOf,
  readListingQuery,
  toListFilter,
  type ListingQuery,
} from "./public";
import {
  ANONYMOUS,
  findProject,
  galleryOf,
  isVisible,
  listProjects,
  pickDownload,
  projectDownloads,
  releasesOf,
  type ProjectCard,
  type ReleaseEntry,
} from "./store";

export const API_VERSION = "v1";

const absolute = (path: string) => new URL(path, SITE_URL).href;

/** A public file URL as an absolute address (the local driver's are site-relative). */
function fileUrl(url: string): string {
  return new URL(url, SITE_URL).href;
}

export function cardJson(card: ProjectCard) {
  const storage = getStorage();
  return {
    slug: card.slug,
    type: typeInfo(card.type).segment,
    name: card.name,
    summary: card.summary,
    url: absolute(projectPath(card)),
    edition: card.edition,
    author: card.ownerLogin,
    downloads: card.downloads,
    gameVersions: card.gameVersions,
    loaders: card.loaders,
    tags: card.tags,
    imageUrl:
      card.cover && storage
        ? fileUrl(storage.publicUrl(card.cover.thumbnailKey ?? card.cover.key))
        : null,
    updated: card.lastReleasedAt?.toISOString() ?? null,
    published: card.firstReleasedAt?.toISOString() ?? null,
  };
}

export function releaseJson(
  project: { type: McProjectType; slug: string },
  entry: ReleaseEntry,
) {
  const { release } = entry;
  return {
    version: release.version,
    title: release.title || null,
    channel: release.channel,
    url: absolute(releasePath(project, release.version)),
    gameVersions: [...release.gameVersions].sort(compareVersions),
    loaders: release.loaders,
    released: release.releasedAt?.toISOString() ?? null,
    changelog: release.changelog,
    files: entry.files
      .filter(({ file }) => file.status === "published")
      .map(({ file, primary }) => ({
        name: file.name,
        size: file.size,
        sha256: file.sha256,
        primary,
        url: absolute(downloadPath(file.id)),
      })),
    dependencies: entry.dependencies.map((dep) => ({
      kind: dep.kind,
      name: dep.name,
      project: dep.slug,
      url:
        dep.slug && dep.type
          ? absolute(projectPath({ type: dep.type, slug: dep.slug }))
          : dep.url,
    })),
  };
}

export interface ApiAnswer {
  status: number;
  body: unknown;
}

const missing: ApiAnswer = { status: 404, body: { error: "Not found." } };

/** The type a ?type= names (its address segment, or its own name); null if unknown. */
export function projectTypeOf(param: string): McProjectType | null {
  return (
    typeFromSegment(param)?.type ??
    PROJECT_TYPES.find((info) => info.type === param)?.type ??
    null
  );
}

/** A page of listed projects, as the listing would show it. */
export async function projectsJson(
  db: Database,
  query: ListingQuery,
  type: McProjectType | undefined,
) {
  const filter = toListFilter(query, type);
  const { cards, total } = await listProjects(db, filter);
  return {
    total,
    page: query.page,
    perPage: filter.perPage,
    projects: cards.map(cardJson),
  };
}

/** One visible project with its releases and gallery; null if others can't see it. */
export async function projectJson(db: Database, slug: string) {
  const found = await findProject(db, slug);
  if (!found || !isVisible(found.project, found.owner)) return null;
  const { project, owner } = found;
  const storage = getStorage();
  const [releases, gallery, downloads] = await Promise.all([
    releasesOf(db, project, ANONYMOUS),
    galleryOf(db, project, ANONYMOUS),
    projectDownloads(db, project.id),
  ]);
  const credit = creditOf(owner);
  const license = licenseInfo(project.license);
  return {
    slug: project.slug,
    type: typeInfo(project.type).segment,
    name: project.name,
    summary: project.summary,
    description: project.description,
    url: absolute(projectPath(project)),
    edition: project.edition,
    editionName: editionLabel(project.edition),
    author: {
      login: credit.login,
      name: credit.name,
      url: absolute(creatorPath(credit.login)),
    },
    license: {
      id: project.license,
      name: license?.label ?? project.license,
      url: license?.url ?? null,
      text: project.licenseText,
    },
    tags: project.tags,
    links: project.links,
    archived: project.state === "archived",
    downloads,
    published: project.firstReleasedAt?.toISOString() ?? null,
    updated: project.lastReleasedAt?.toISOString() ?? null,
    gallery: gallery.map(({ image, file }) => ({
      caption: image.caption,
      url: storage ? fileUrl(storage.publicUrl(file.key)) : null,
    })),
    releases: releases.map((entry) => releaseJson(project, entry)),
  };
}

export interface LatestOptions {
  version?: string;
  loader?: string;
  channel?: string;
}

/** The release Download would give (newest stable that fits); null if none. */
export async function latestJson(
  db: Database,
  slug: string,
  options: LatestOptions,
) {
  const found = await findProject(db, slug);
  if (!found || !isVisible(found.project, found.owner)) return null;
  const { project } = found;
  const channel = options.channel;
  const pick = await pickDownload(db, project.id, {
    ...(options.version ? { version: options.version } : {}),
    ...(options.loader ? { loader: options.loader } : {}),
    ...(CHANNELS.some((entry) => entry.value === channel)
      ? { channel: channel as (typeof CHANNELS)[number]["value"] }
      : {}),
  });
  if (!pick) return null;
  const [entry] = await releasesOf(db, project, ANONYMOUS, {
    releaseId: pick.release.id,
  });
  return entry ? releaseJson(project, entry) : null;
}

/**
 * Answers an old API path ("projects", "projects/<slug>", …) for anyone. Kept for
 * clients of /api/minecraft/v1/; the same data is at /v1/minecraft/ in the API.
 */
export async function answerApi(
  db: Database,
  path: string,
  url: URL,
): Promise<ApiAnswer> {
  const [resource, slug, sub, ...rest] = path.split("/").filter(Boolean);
  if (resource !== "projects" || rest.length > 0) return missing;

  if (!slug) {
    const typeParam = url.searchParams.get("type") ?? "";
    const type = projectTypeOf(typeParam);
    if (typeParam && !type)
      return { status: 400, body: { error: "Unknown type." } };
    return {
      status: 200,
      body: await projectsJson(db, readListingQuery(url), type ?? undefined),
    };
  }

  if (sub === "latest") {
    const get = (name: string) => url.searchParams.get(name) ?? undefined;
    const body = await latestJson(db, slug, {
      version: get("version"),
      loader: get("loader"),
      channel: get("channel"),
    });
    return body ? { status: 200, body } : missing;
  }
  if (sub !== undefined) return missing;
  const body = await projectJson(db, slug);
  return body ? { status: 200, body } : missing;
}
