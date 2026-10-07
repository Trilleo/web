/**
 * The platform's public JSON API (read-only, open to any site), for launchers, bots
 * and other tools. Served by src/pages/api/minecraft/v1/[...path].ts:
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
import { creditOf, readListingQuery, toListFilter } from "./public";
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

/** Answers an API path ("projects", "projects/<slug>", …) for anyone. */
export async function answerApi(
  db: Database,
  path: string,
  url: URL,
): Promise<ApiAnswer> {
  const [resource, slug, sub, ...rest] = path.split("/").filter(Boolean);
  if (resource !== "projects" || rest.length > 0) return missing;

  if (!slug) {
    const query = readListingQuery(url);
    const typeParam = url.searchParams.get("type") ?? "";
    const type =
      typeFromSegment(typeParam)?.type ??
      PROJECT_TYPES.find((info) => info.type === typeParam)?.type;
    if (typeParam && !type)
      return { status: 400, body: { error: "Unknown type." } };
    const filter = toListFilter(query, type);
    const { cards, total } = await listProjects(db, filter);
    return {
      status: 200,
      body: {
        total,
        page: query.page,
        perPage: filter.perPage,
        projects: cards.map(cardJson),
      },
    };
  }

  const found = await findProject(db, slug);
  if (!found || !isVisible(found.project, found.owner)) return missing;
  const { project, owner } = found;

  if (sub === "latest") {
    const channel = url.searchParams.get("channel");
    const pick = await pickDownload(db, project.id, {
      ...(url.searchParams.get("version")
        ? { version: url.searchParams.get("version") ?? "" }
        : {}),
      ...(url.searchParams.get("loader")
        ? { loader: url.searchParams.get("loader") ?? "" }
        : {}),
      ...(CHANNELS.some((entry) => entry.value === channel)
        ? { channel: channel as (typeof CHANNELS)[number]["value"] }
        : {}),
    });
    if (!pick) return missing;
    const [entry] = await releasesOf(db, project, ANONYMOUS, {
      releaseId: pick.release.id,
    });
    return entry ? { status: 200, body: releaseJson(project, entry) } : missing;
  }
  if (sub !== undefined) return missing;

  const storage = getStorage();
  const [releases, gallery, downloads] = await Promise.all([
    releasesOf(db, project, ANONYMOUS),
    galleryOf(db, project, ANONYMOUS),
    projectDownloads(db, project.id),
  ]);
  const credit = creditOf(owner);
  const license = licenseInfo(project.license);
  return {
    status: 200,
    body: {
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
    },
  };
}
