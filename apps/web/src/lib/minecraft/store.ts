/**
 * Minecraft projects in the database: who can see what, creating and editing
 * projects and releases, attaching uploaded files, the gallery, listings and the
 * download pick. Removing things that have bytes in storage is in service.ts.
 *
 * Visibility, in one place: the owner and the admin see everything. Others see a
 * project when it isn't a draft, isn't hidden, its owner isn't blocked, and it has a
 * live release (`lastReleasedAt`, kept by sync.ts). A release is live while its main
 * file is published; gallery images while their file is.
 */
import {
  files,
  mcDependencies,
  mcGallery,
  mcProjectReports,
  mcProjectSlugs,
  mcProjects,
  mcReleaseFiles,
  mcReleases,
  users,
  type Database,
  type McDependency,
  type McGalleryImage,
  type McProject,
  type McProjectType,
  type McRelease,
  type StoredFile,
  type User,
} from "@trilleo/db";
import { extensionOf } from "@trilleo/storage";
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  GALLERY_EXTENSIONS,
  MC_LIMITS,
  RELEASE_EXTENSIONS,
  typeInfo,
} from "./catalog";
import type { ProjectInput, ReleaseInput } from "./input";
import { MC_RENDER_VERSION, renderMarkdown } from "./render";
import { galleryUrls, syncRelease } from "./sync";

export type Result<T> =
  { ok: true; value: T } | { ok: false; status: number; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(status: number, error: string): Result<T> => ({
  ok: false,
  status,
  error,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** An ILIKE pattern that finds `text` anywhere, with its own % and _ taken literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[%_\\]/g, "\\$&")}%`;
}

/** Who's looking: nobody, someone signed in, or the admin. */
export interface Viewer {
  userId: string | null;
  isAdmin: boolean;
}

export const ANONYMOUS: Viewer = { userId: null, isAdmin: false };

export function viewerOf(user: User | null, isAdmin: boolean): Viewer {
  return { userId: user?.id ?? null, isAdmin: user ? isAdmin : false };
}

export function canEdit(
  project: Pick<McProject, "ownerId">,
  viewer: Viewer,
): boolean {
  return viewer.isAdmin || viewer.userId === project.ownerId;
}

/** Whether others can open the project's page. */
export function isVisible(
  project: Pick<McProject, "state" | "hiddenAt" | "lastReleasedAt">,
  owner: Pick<User, "blockedAt"> | null,
): boolean {
  return (
    project.state !== "draft" &&
    project.hiddenAt === null &&
    project.lastReleasedAt !== null &&
    owner?.blockedAt == null
  );
}

/** Whether it shows in listings, search and sitemaps (visible, and not unlisted). */
export function isListed(
  project: Pick<McProject, "state" | "hiddenAt" | "lastReleasedAt">,
  owner: Pick<User, "blockedAt"> | null,
): boolean {
  return isVisible(project, owner) && project.state !== "unlisted";
}

export function canSee(
  project: McProject,
  owner: Pick<User, "blockedAt"> | null,
  viewer: Viewer,
): boolean {
  return canEdit(project, viewer) || isVisible(project, owner);
}

/** SQL for "listed": use with a join on the owner. */
const listedWhere = (): SQL | undefined =>
  and(
    inArray(mcProjects.state, ["public", "archived"]),
    isNull(mcProjects.hiddenAt),
    isNotNull(mcProjects.lastReleasedAt),
    isNull(users.blockedAt),
  );

/** A release's main file is published. */
const liveRelease = (): SQL =>
  sql`exists (select 1 from ${mcReleaseFiles} inner join ${files} on ${files.id} = ${mcReleaseFiles.fileId} where ${mcReleaseFiles.releaseId} = ${mcReleases.id} and ${mcReleaseFiles.primary} and ${files.status} = 'published')`;

// --- Projects ---------------------------------------------------------------

export async function getProject(
  db: Database,
  id: number,
): Promise<McProject | undefined> {
  const [row] = await db
    .select()
    .from(mcProjects)
    .where(eq(mcProjects.id, id))
    .limit(1);
  return row;
}

export interface FoundProject {
  project: McProject;
  owner: User;
  /** Found by an old slug: redirect to the current one. */
  moved: boolean;
}

/** A project by its slug, or by one it used to have. */
export async function findProject(
  db: Database,
  slug: string,
): Promise<FoundProject | undefined> {
  const current = await db
    .select({ project: mcProjects, owner: users })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(eq(mcProjects.slug, slug))
    .limit(1);
  if (current[0]) return { ...current[0], moved: false };
  const old = await db
    .select({ project: mcProjects, owner: users })
    .from(mcProjectSlugs)
    .innerJoin(mcProjects, eq(mcProjects.id, mcProjectSlugs.projectId))
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(eq(mcProjectSlugs.slug, slug))
    .limit(1);
  return old[0] ? { ...old[0], moved: true } : undefined;
}

export async function projectOwner(
  db: Database,
  project: Pick<McProject, "ownerId">,
): Promise<User | undefined> {
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, project.ownerId))
    .limit(1);
  return owner;
}

/** Whether a slug is in use (or was, by another project). */
async function slugTaken(
  db: Database,
  slug: string,
  exceptId?: number,
): Promise<boolean> {
  const current = await db
    .select({ id: mcProjects.id })
    .from(mcProjects)
    .where(eq(mcProjects.slug, slug))
    .limit(1);
  if (current[0] && current[0].id !== exceptId) return true;
  const old = await db
    .select({ id: mcProjectSlugs.projectId })
    .from(mcProjectSlugs)
    .where(eq(mcProjectSlugs.slug, slug))
    .limit(1);
  return Boolean(old[0] && old[0].id !== exceptId);
}

const SLUG_TAKEN = "Another project already has that address. Try another.";

export async function createProject(
  db: Database,
  owner: User,
  isAdmin: boolean,
  input: ProjectInput,
  now = new Date(),
): Promise<Result<McProject>> {
  if (owner.blockedAt) return fail(403, "This account can’t create projects.");
  if (!isAdmin) {
    const [mine] = await db
      .select({ n: count() })
      .from(mcProjects)
      .where(eq(mcProjects.ownerId, owner.id));
    if ((mine?.n ?? 0) >= MC_LIMITS.projectsPerAccount)
      return fail(
        429,
        `You can have up to ${String(MC_LIMITS.projectsPerAccount)} projects. Delete one to start another.`,
      );
  }
  if (await slugTaken(db, input.slug)) return fail(409, SLUG_TAKEN);
  const [row] = await db
    .insert(mcProjects)
    .values({
      ...input,
      ownerId: owner.id,
      descriptionHtml: renderMarkdown(input.description),
      renderVersion: MC_RENDER_VERSION,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return fail(409, SLUG_TAKEN);
  return ok(row);
}

export async function updateProject(
  db: Database,
  project: McProject,
  input: ProjectInput,
  now = new Date(),
): Promise<Result<McProject>> {
  if (input.slug !== project.slug) {
    if (await slugTaken(db, input.slug, project.id))
      return fail(409, SLUG_TAKEN);
  }
  const images = await galleryUrls(db, project.id);
  const [row] = await db
    .update(mcProjects)
    .set({
      ...input,
      descriptionHtml: renderMarkdown(input.description, images),
      renderVersion: MC_RENDER_VERSION,
      updatedAt: now,
    })
    .where(eq(mcProjects.id, project.id))
    .returning();
  if (!row) return fail(404, "That project is gone.");
  if (input.slug !== project.slug) {
    // Links to the old address keep working, and the new one is never "old".
    await db.delete(mcProjectSlugs).where(eq(mcProjectSlugs.slug, input.slug));
    if (project.firstReleasedAt)
      await db
        .insert(mcProjectSlugs)
        .values({ slug: project.slug, projectId: project.id, createdAt: now })
        .onConflictDoNothing();
  }
  return ok(row);
}

/** Admin: hide a project (or show it again with `reason` null). */
export async function setHidden(
  db: Database,
  projectId: number,
  reason: string | null,
  now = new Date(),
): Promise<void> {
  await db
    .update(mcProjects)
    .set(
      reason === null
        ? { hiddenAt: null, hiddenReason: null }
        : { hiddenAt: now, hiddenReason: reason },
    )
    .where(eq(mcProjects.id, projectId));
}

/** Admin: feature a project on the landing page, or stop. */
export async function setFeatured(
  db: Database,
  projectId: number,
  featured: boolean,
  now = new Date(),
): Promise<void> {
  await db
    .update(mcProjects)
    .set({ featuredAt: featured ? now : null })
    .where(eq(mcProjects.id, projectId));
}

/** Projects whose description was rendered by an older renderer: render them again. */
export async function refreshRendering(
  db: Database,
  project: McProject,
): Promise<McProject> {
  if (project.renderVersion >= MC_RENDER_VERSION) return project;
  const images = await galleryUrls(db, project.id);
  const [row] = await db
    .update(mcProjects)
    .set({
      descriptionHtml: renderMarkdown(project.description, images),
      renderVersion: MC_RENDER_VERSION,
    })
    .where(eq(mcProjects.id, project.id))
    .returning();
  return row ?? project;
}

// --- Releases ---------------------------------------------------------------

export async function getRelease(
  db: Database,
  projectId: number,
  id: number,
): Promise<McRelease | undefined> {
  const [row] = await db
    .select()
    .from(mcReleases)
    .where(and(eq(mcReleases.id, id), eq(mcReleases.projectId, projectId)))
    .limit(1);
  return row;
}

export async function findRelease(
  db: Database,
  projectId: number,
  version: string,
): Promise<McRelease | undefined> {
  const [row] = await db
    .select()
    .from(mcReleases)
    .where(
      and(eq(mcReleases.projectId, projectId), eq(mcReleases.version, version)),
    )
    .limit(1);
  return row;
}

/** Turns dependency slugs into project ids; unknown slugs are an error. */
async function resolveDependencies(
  db: Database,
  project: McProject,
  input: ReleaseInput,
): Promise<Result<(typeof mcDependencies.$inferInsert)[]>> {
  const rows: Omit<typeof mcDependencies.$inferInsert, "releaseId">[] = [];
  for (const dependency of input.dependencies) {
    if (dependency.slug === null) {
      rows.push({
        kind: dependency.kind,
        name: dependency.name,
        url: dependency.url,
        projectId: null,
      });
      continue;
    }
    const found = await findProject(db, dependency.slug);
    if (!found || !isVisible(found.project, found.owner))
      return fail(
        400,
        `There’s no public project at “${dependency.slug}”. For one elsewhere, add its link.`,
      );
    if (found.project.id === project.id)
      return fail(400, "A release can’t depend on its own project.");
    rows.push({
      kind: dependency.kind,
      name: found.project.name,
      url: null,
      projectId: found.project.id,
    });
  }
  return ok(rows as (typeof mcDependencies.$inferInsert)[]);
}

const VERSION_TAKEN = "This project already has a release with that version.";

export async function createRelease(
  db: Database,
  project: McProject,
  viewer: Viewer,
  input: ReleaseInput,
  now = new Date(),
): Promise<Result<McRelease>> {
  if (!viewer.isAdmin) {
    const [today] = await db
      .select({ n: count() })
      .from(mcReleases)
      .innerJoin(mcProjects, eq(mcProjects.id, mcReleases.projectId))
      .where(
        and(
          eq(mcProjects.ownerId, project.ownerId),
          gt(mcReleases.createdAt, new Date(now.getTime() - DAY_MS)),
        ),
      );
    if ((today?.n ?? 0) >= MC_LIMITS.releasesPerDay)
      return fail(
        429,
        "You’ve made a lot of releases today. Try again tomorrow.",
      );
  }
  if (await findRelease(db, project.id, input.version))
    return fail(409, VERSION_TAKEN);
  const dependencies = await resolveDependencies(db, project, input);
  if (!dependencies.ok) return dependencies;
  const [row] = await db
    .insert(mcReleases)
    .values({
      projectId: project.id,
      version: input.version,
      title: input.title,
      channel: input.channel,
      changelog: input.changelog,
      changelogHtml: renderMarkdown(input.changelog),
      renderVersion: MC_RENDER_VERSION,
      gameVersions: input.gameVersions,
      loaders: input.loaders,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return fail(409, VERSION_TAKEN);
  if (dependencies.value.length > 0)
    await db
      .insert(mcDependencies)
      .values(dependencies.value.map((dep) => ({ ...dep, releaseId: row.id })));
  await touch(db, project.id, now);
  return ok(row);
}

export async function updateRelease(
  db: Database,
  project: McProject,
  release: McRelease,
  input: ReleaseInput,
  now = new Date(),
): Promise<Result<McRelease>> {
  if (input.version !== release.version) {
    const other = await findRelease(db, project.id, input.version);
    if (other && other.id !== release.id) return fail(409, VERSION_TAKEN);
  }
  const dependencies = await resolveDependencies(db, project, input);
  if (!dependencies.ok) return dependencies;
  const [row] = await db
    .update(mcReleases)
    .set({
      version: input.version,
      title: input.title,
      channel: input.channel,
      changelog: input.changelog,
      changelogHtml: renderMarkdown(input.changelog),
      renderVersion: MC_RENDER_VERSION,
      gameVersions: input.gameVersions,
      loaders: input.loaders,
    })
    .where(eq(mcReleases.id, release.id))
    .returning();
  if (!row) return fail(404, "That release is gone.");
  await db
    .delete(mcDependencies)
    .where(eq(mcDependencies.releaseId, release.id));
  if (dependencies.value.length > 0)
    await db
      .insert(mcDependencies)
      .values(
        dependencies.value.map((dep) => ({ ...dep, releaseId: release.id })),
      );
  await touch(db, project.id, now);
  return ok(row);
}

async function touch(db: Database, projectId: number, now: Date) {
  await db
    .update(mcProjects)
    .set({ updatedAt: now })
    .where(eq(mcProjects.id, projectId));
}

// --- Attaching uploads --------------------------------------------------------

/** Statuses a file can be attached in (it's on its way, or there). */
const ATTACHABLE: readonly StoredFile["status"][] = [
  "uploading",
  "processing",
  "pending_review",
  "published",
];

async function attachableFile(
  db: Database,
  project: McProject,
  fileId: string,
  purpose: string,
): Promise<Result<StoredFile>> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!file) return fail(404, "There’s no such upload.");
  if (file.ownerId !== project.ownerId || file.purpose !== purpose)
    return fail(404, "There’s no such upload.");
  if (!ATTACHABLE.includes(file.status))
    return fail(409, "That upload can’t be used any more.");
  return ok(file);
}

/**
 * Adds an upload to a release, as its main file or an extra. Called as the upload
 * starts (before its bytes arrive), so the file is never loose. A new main file
 * replaces the old one, which becomes an extra.
 */
export async function attachReleaseFile(
  db: Database,
  project: McProject,
  release: McRelease,
  fileId: string,
  primary: boolean,
  now = new Date(),
): Promise<Result<StoredFile>> {
  const found = await attachableFile(db, project, fileId, "minecraft");
  if (!found.ok) return found;
  const file = found.value;
  const extension = extensionOf(file.name);
  const info = typeInfo(project.type);
  if (primary && !info.extensions.includes(extension))
    return fail(
      415,
      `A ${info.label.toLowerCase()}’s main file is ${info.extensions.map((ext) => `.${ext}`).join(", ")}.`,
    );
  if (!primary && !RELEASE_EXTENSIONS.includes(extension))
    return fail(415, "That kind of file can’t go in a release.");
  const existing = await db
    .select()
    .from(mcReleaseFiles)
    .where(eq(mcReleaseFiles.releaseId, release.id));
  if (existing.some((link) => link.fileId === fileId)) return ok(file);
  const extras = existing.filter((link) => !link.primary).length;
  const hasPrimary = existing.some((link) => link.primary);
  // A new main file pushes the old one into the extras.
  const extrasAfter = primary ? extras + (hasPrimary ? 1 : 0) : extras + 1;
  if (extrasAfter > MC_LIMITS.extraFiles)
    return fail(
      409,
      `A release can have ${String(MC_LIMITS.extraFiles)} extra files besides its main one.`,
    );
  if (primary)
    await db
      .update(mcReleaseFiles)
      .set({ primary: false })
      .where(eq(mcReleaseFiles.releaseId, release.id));
  const inserted = await db
    .insert(mcReleaseFiles)
    .values({ releaseId: release.id, fileId, primary })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0)
    return fail(409, "That upload already belongs to another release.");
  await syncRelease(db, release.id, now);
  await touch(db, project.id, now);
  return ok(file);
}

/** Makes one of a release's files its main one. */
export async function setPrimaryFile(
  db: Database,
  project: McProject,
  release: McRelease,
  fileId: string,
  now = new Date(),
): Promise<Result<null>> {
  const [link] = await db
    .select({ name: files.name })
    .from(mcReleaseFiles)
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(
      and(
        eq(mcReleaseFiles.releaseId, release.id),
        eq(mcReleaseFiles.fileId, fileId),
      ),
    )
    .limit(1);
  if (!link) return fail(404, "That file isn’t in this release.");
  const info = typeInfo(project.type);
  if (!info.extensions.includes(extensionOf(link.name)))
    return fail(
      415,
      `A ${info.label.toLowerCase()}’s main file is ${info.extensions.map((ext) => `.${ext}`).join(", ")}.`,
    );
  await db
    .update(mcReleaseFiles)
    .set({ primary: sql`${mcReleaseFiles.fileId} = ${fileId}` })
    .where(eq(mcReleaseFiles.releaseId, release.id));
  await syncRelease(db, release.id, now);
  return ok(null);
}

/** Adds an upload to the project's gallery (the first image becomes the cover). */
export async function attachGalleryImage(
  db: Database,
  project: McProject,
  viewer: Viewer,
  fileId: string,
  caption: string,
  now = new Date(),
): Promise<Result<McGalleryImage>> {
  const found = await attachableFile(db, project, fileId, "minecraft-media");
  if (!found.ok) return found;
  if (!GALLERY_EXTENSIONS.includes(extensionOf(found.value.name)))
    return fail(415, "Gallery images are PNG, JPEG, WebP, GIF or AVIF.");
  const images = await db
    .select({ position: mcGallery.position })
    .from(mcGallery)
    .where(eq(mcGallery.projectId, project.id));
  if (images.length >= MC_LIMITS.gallery)
    return fail(
      409,
      `A gallery holds up to ${String(MC_LIMITS.gallery)} images. Remove one first.`,
    );
  if (!viewer.isAdmin) {
    const [today] = await db
      .select({ n: count() })
      .from(mcGallery)
      .innerJoin(mcProjects, eq(mcProjects.id, mcGallery.projectId))
      .where(
        and(
          eq(mcProjects.ownerId, project.ownerId),
          gt(mcGallery.createdAt, new Date(now.getTime() - DAY_MS)),
        ),
      );
    if ((today?.n ?? 0) >= MC_LIMITS.imagesPerDay)
      return fail(
        429,
        "You’ve added a lot of images today. Try again tomorrow.",
      );
  }
  const position =
    images.reduce((highest, image) => Math.max(highest, image.position), -1) +
    1;
  const [row] = await db
    .insert(mcGallery)
    .values({
      projectId: project.id,
      fileId,
      caption,
      position,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return fail(409, "That image is already in a gallery.");
  if (!project.coverFileId)
    await db
      .update(mcProjects)
      .set({ coverFileId: fileId })
      .where(eq(mcProjects.id, project.id));
  await touch(db, project.id, now);
  return ok(row);
}

export async function setCaption(
  db: Database,
  project: McProject,
  imageId: number,
  caption: string,
): Promise<void> {
  await db
    .update(mcGallery)
    .set({ caption })
    .where(and(eq(mcGallery.id, imageId), eq(mcGallery.projectId, project.id)));
}

/** Moves an image one place earlier (-1) or later (+1). */
export async function moveImage(
  db: Database,
  project: McProject,
  imageId: number,
  by: -1 | 1,
): Promise<void> {
  const images = await db
    .select({ id: mcGallery.id })
    .from(mcGallery)
    .where(eq(mcGallery.projectId, project.id))
    .orderBy(asc(mcGallery.position), asc(mcGallery.id));
  const from = images.findIndex((image) => image.id === imageId);
  const to = from + by;
  if (from < 0 || to < 0 || to >= images.length) return;
  const order = images.map((image) => image.id);
  [order[from], order[to]] = [order[to] ?? imageId, order[from] ?? imageId];
  for (const [position, id] of order.entries())
    await db.update(mcGallery).set({ position }).where(eq(mcGallery.id, id));
}

export async function setCover(
  db: Database,
  project: McProject,
  imageId: number,
): Promise<Result<null>> {
  const [image] = await db
    .select({ fileId: mcGallery.fileId })
    .from(mcGallery)
    .where(and(eq(mcGallery.id, imageId), eq(mcGallery.projectId, project.id)))
    .limit(1);
  if (!image) return fail(404, "That image isn’t in this gallery.");
  await db
    .update(mcProjects)
    .set({ coverFileId: image.fileId })
    .where(eq(mcProjects.id, project.id));
  return ok(null);
}

// --- Reading a project --------------------------------------------------------

export interface GalleryEntry {
  image: McGalleryImage;
  file: StoredFile;
  isCover: boolean;
}

/** The gallery in order; others see published images only. */
export async function galleryOf(
  db: Database,
  project: McProject,
  viewer: Viewer,
): Promise<GalleryEntry[]> {
  const rows = await db
    .select({ image: mcGallery, file: files })
    .from(mcGallery)
    .innerJoin(files, eq(files.id, mcGallery.fileId))
    .where(eq(mcGallery.projectId, project.id))
    .orderBy(asc(mcGallery.position), asc(mcGallery.id));
  const all = canEdit(project, viewer);
  return rows
    .filter(
      ({ file }) =>
        file.status === "published" ||
        (all && file.status !== "deleted" && file.status !== "removed"),
    )
    .map((row) => ({ ...row, isCover: row.file.id === project.coverFileId }));
}

export interface ReleaseEntry {
  release: McRelease;
  /** The main file first. */
  files: { file: StoredFile; primary: boolean }[];
  dependencies: (McDependency & {
    slug: string | null;
    type: McProjectType | null;
  })[];
  /** Its main file is published. */
  live: boolean;
}

/** Releases, newest first; others see live ones, with published files only. */
export async function releasesOf(
  db: Database,
  project: McProject,
  viewer: Viewer,
  options: { limit?: number; releaseId?: number } = {},
): Promise<ReleaseEntry[]> {
  const all = canEdit(project, viewer);
  const releaseRows = await db
    .select()
    .from(mcReleases)
    .where(
      and(
        eq(mcReleases.projectId, project.id),
        options.releaseId === undefined
          ? undefined
          : eq(mcReleases.id, options.releaseId),
        all ? undefined : liveRelease(),
      ),
    )
    .orderBy(
      desc(sql`coalesce(${mcReleases.releasedAt}, ${mcReleases.createdAt})`),
      desc(mcReleases.id),
    )
    .limit(options.limit ?? 500);
  if (releaseRows.length === 0) return [];
  const ids = releaseRows.map((release) => release.id);
  const fileRows = await db
    .select({ link: mcReleaseFiles, file: files })
    .from(mcReleaseFiles)
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(inArray(mcReleaseFiles.releaseId, ids))
    .orderBy(desc(mcReleaseFiles.primary), asc(files.createdAt));
  const depRows = await db
    .select({
      dependency: mcDependencies,
      slug: mcProjects.slug,
      type: mcProjects.type,
    })
    .from(mcDependencies)
    .leftJoin(mcProjects, eq(mcProjects.id, mcDependencies.projectId))
    .where(inArray(mcDependencies.releaseId, ids))
    .orderBy(asc(mcDependencies.id));
  return releaseRows.map((release) => {
    const own = fileRows.filter((row) => row.link.releaseId === release.id);
    const primary = own.find((row) => row.link.primary);
    return {
      release,
      live: primary?.file.status === "published",
      files: own
        .filter(
          ({ file }) =>
            file.status === "published" || (all && file.status !== "deleted"),
        )
        .map(({ file, link }) => ({ file, primary: link.primary })),
      dependencies: depRows
        .filter((row) => row.dependency.releaseId === release.id)
        .map((row) => ({ ...row.dependency, slug: row.slug, type: row.type })),
    };
  });
}

/** Total downloads of a project's release files. */
export async function projectDownloads(
  db: Database,
  projectId: number,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${files.downloads}), 0)`.mapWith(Number),
    })
    .from(mcReleaseFiles)
    .innerJoin(mcReleases, eq(mcReleases.id, mcReleaseFiles.releaseId))
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(eq(mcReleases.projectId, projectId));
  return row?.total ?? 0;
}

export interface DownloadPick {
  release: McRelease;
  file: StoredFile;
}

/**
 * The file Download gets: the newest live release (stable first, unless a channel is
 * asked for) matching the version and loader, if given.
 */
export async function pickDownload(
  db: Database,
  projectId: number,
  want: {
    version?: string;
    loader?: string;
    channel?: McRelease["channel"];
  } = {},
): Promise<DownloadPick | undefined> {
  const rows = await db
    .select({ release: mcReleases, file: files })
    .from(mcReleases)
    .innerJoin(
      mcReleaseFiles,
      and(
        eq(mcReleaseFiles.releaseId, mcReleases.id),
        eq(mcReleaseFiles.primary, true),
      ),
    )
    .innerJoin(files, eq(files.id, mcReleaseFiles.fileId))
    .where(
      and(
        eq(mcReleases.projectId, projectId),
        eq(files.status, "published"),
        want.version
          ? arrayContains(mcReleases.gameVersions, [want.version])
          : undefined,
        want.loader
          ? arrayContains(mcReleases.loaders, [want.loader])
          : undefined,
        want.channel ? eq(mcReleases.channel, want.channel) : undefined,
      ),
    )
    .orderBy(
      // Stable releases win unless asked otherwise.
      asc(
        sql`case ${mcReleases.channel} when 'release' then 0 when 'beta' then 1 else 2 end`,
      ),
      desc(mcReleases.releasedAt),
      desc(mcReleases.id),
    )
    .limit(1);
  return rows[0];
}

// --- Listings -----------------------------------------------------------------

export const SORTS = ["relevance", "downloads", "updated", "newest"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Readonly<Record<Sort, string>> = {
  relevance: "Best match",
  downloads: "Most downloaded",
  updated: "Recently updated",
  newest: "Newest",
};

export interface ListFilter {
  type?: McProjectType;
  edition?: "java" | "bedrock";
  version?: string;
  loader?: string;
  tag?: string;
  q?: string;
  sort?: Sort;
  ownerId?: string;
  featured?: boolean;
  page?: number;
  perPage?: number;
}

export interface ProjectCard {
  id: number;
  slug: string;
  type: McProjectType;
  name: string;
  summary: string;
  edition: McProject["edition"];
  state: McProject["state"];
  tags: string[];
  ownerLogin: string;
  /** The image on the card: the cover, else the first published gallery image. */
  cover: { key: string; thumbnailKey: string | null } | null;
  downloads: number;
  /** The newest Minecraft versions its live releases name (up to a few). */
  gameVersions: string[];
  loaders: string[];
  lastReleasedAt: Date | null;
  firstReleasedAt: Date | null;
  featuredAt: Date | null;
}

const downloadsSql = sql<number>`(select coalesce(sum(f.downloads), 0) from ${mcReleaseFiles} rf inner join ${mcReleases} r on r.id = rf.release_id inner join ${files} f on f.id = rf.file_id where r.project_id = ${mcProjects.id})`;

const coverSql = sql<string | null>`coalesce(
  (select f.key || '|' || coalesce(f.thumbnail_key, '') from ${files} f where f.id = ${mcProjects.coverFileId} and f.status = 'published'),
  (select f.key || '|' || coalesce(f.thumbnail_key, '') from ${mcGallery} g inner join ${files} f on f.id = g.file_id where g.project_id = ${mcProjects.id} and f.status = 'published' order by g.position, g.id limit 1)
)`;

const liveTagsSql = (column: "game_versions" | "loaders") =>
  sql<
    string[] | null
  >`(select array_agg(distinct v) from ${mcReleases} r inner join ${mcReleaseFiles} rf on rf.release_id = r.id and rf."primary" inner join ${files} f on f.id = rf.file_id and f.status = 'published', unnest(r.${sql.raw(column)}) v where r.project_id = ${mcProjects.id})`;

const liveReleaseMatches = (
  column: "game_versions" | "loaders",
  value: string,
) =>
  sql`exists (select 1 from ${mcReleases} r inner join ${mcReleaseFiles} rf on rf.release_id = r.id and rf."primary" inner join ${files} f on f.id = rf.file_id and f.status = 'published' where r.project_id = ${mcProjects.id} and ${value} = any(r.${sql.raw(column)}))`;

const searchDocument = sql`setweight(to_tsvector('english', ${mcProjects.name}), 'A') || setweight(to_tsvector('english', ${mcProjects.summary} || ' ' || array_to_string(${mcProjects.tags}, ' ')), 'B') || setweight(to_tsvector('english', ${mcProjects.description}), 'C')`;

/** Listed projects matching a filter, and how many match in all. */
export async function listProjects(
  db: Database,
  filter: ListFilter = {},
): Promise<{ cards: ProjectCard[]; total: number }> {
  const perPage = Math.min(Math.max(filter.perPage ?? 24, 1), 60);
  const page = Math.max(filter.page ?? 1, 1);
  const q = filter.q?.trim().slice(0, 200) ?? "";
  const tsquery = q ? sql`websearch_to_tsquery('english', ${q})` : null;

  const where = and(
    listedWhere(),
    filter.type ? eq(mcProjects.type, filter.type) : undefined,
    filter.edition
      ? or(
          eq(mcProjects.edition, filter.edition),
          eq(mcProjects.edition, "both"),
        )
      : undefined,
    filter.tag ? arrayContains(mcProjects.tags, [filter.tag]) : undefined,
    filter.ownerId ? eq(mcProjects.ownerId, filter.ownerId) : undefined,
    filter.featured ? isNotNull(mcProjects.featuredAt) : undefined,
    filter.version
      ? liveReleaseMatches("game_versions", filter.version)
      : undefined,
    filter.loader ? liveReleaseMatches("loaders", filter.loader) : undefined,
    tsquery
      ? or(
          sql`${searchDocument} @@ ${tsquery}`,
          sql`${mcProjects.name} ilike ${likePattern(q)}`,
        )
      : undefined,
  );

  const sort: Sort = filter.sort ?? (tsquery ? "relevance" : "updated");
  const order: SQL[] =
    sort === "relevance" && tsquery
      ? [desc(sql`ts_rank(${searchDocument}, ${tsquery})`)]
      : sort === "downloads"
        ? [desc(downloadsSql)]
        : sort === "newest"
          ? [desc(mcProjects.firstReleasedAt)]
          : filter.featured
            ? [desc(mcProjects.featuredAt)]
            : [desc(mcProjects.lastReleasedAt)];

  const [totals] = await db
    .select({ n: count() })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(where);

  const rows = await db
    .select({
      project: mcProjects,
      ownerLogin: users.githubLogin,
      downloads: downloadsSql.mapWith(Number),
      cover: coverSql,
      gameVersions: liveTagsSql("game_versions"),
      loaders: liveTagsSql("loaders"),
    })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(where)
    .orderBy(...order, desc(mcProjects.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    total: totals?.n ?? 0,
    cards: rows.map((row) => toCard(row)),
  };
}

function toCard(row: {
  project: McProject;
  ownerLogin: string;
  downloads: number;
  cover: string | null;
  gameVersions: string[] | null;
  loaders: string[] | null;
}): ProjectCard {
  const { project } = row;
  const [key, thumbnailKey] = row.cover?.split("|") ?? [];
  return {
    id: project.id,
    slug: project.slug,
    type: project.type,
    name: project.name,
    summary: project.summary,
    edition: project.edition,
    state: project.state,
    tags: project.tags,
    ownerLogin: row.ownerLogin,
    cover: key
      ? {
          key,
          thumbnailKey: thumbnailKey === "" ? null : (thumbnailKey ?? null),
        }
      : null,
    downloads: row.downloads,
    gameVersions: sortVersionsDesc(row.gameVersions ?? []),
    loaders: (row.loaders ?? []).sort(),
    lastReleasedAt: project.lastReleasedAt,
    firstReleasedAt: project.firstReleasedAt,
    featuredAt: project.featuredAt,
  };
}

function sortVersionsDesc(versions: string[]): string[] {
  const parts = (id: string) =>
    id.split(".").map((part) => Number.parseInt(part, 10) || 0);
  return [...versions].sort((a, b) => {
    const pa = parts(a);
    const pb = parts(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pb[i] ?? -1) - (pa[i] ?? -1);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

/** Someone's own projects, every state, for their dashboard. */
export async function projectsOf(
  db: Database,
  ownerId: string,
): Promise<(ProjectCard & { pending: number; hiddenAt: Date | null })[]> {
  const rows = await db
    .select({
      project: mcProjects,
      ownerLogin: users.githubLogin,
      downloads: downloadsSql.mapWith(Number),
      cover: coverSql,
      gameVersions: liveTagsSql("game_versions"),
      loaders: liveTagsSql("loaders"),
      pending:
        sql<number>`(select count(*) from ${files} f where f.status in ('processing', 'pending_review') and (f.id in (select rf.file_id from ${mcReleaseFiles} rf inner join ${mcReleases} r on r.id = rf.release_id where r.project_id = ${mcProjects.id}) or f.id in (select g.file_id from ${mcGallery} g where g.project_id = ${mcProjects.id})))`.mapWith(
          Number,
        ),
    })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(eq(mcProjects.ownerId, ownerId))
    .orderBy(desc(mcProjects.updatedAt), desc(mcProjects.id));
  return rows.map((row) => ({
    ...toCard(row),
    pending: row.pending,
    hiddenAt: row.project.hiddenAt,
  }));
}

/** Tags in use on listed projects, most used first (for the filter list). */
export async function popularTags(
  db: Database,
  type?: McProjectType,
  limit = 30,
): Promise<{ tag: string; count: number }[]> {
  const tag = sql<string>`unnest(${mcProjects.tags})`;
  const rows = await db
    .select({ tag, n: count() })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(and(listedWhere(), type ? eq(mcProjects.type, type) : undefined))
    .groupBy(sql`1`)
    .orderBy(desc(count()), asc(sql`1`))
    .limit(limit);
  return rows.map((row) => ({ tag: row.tag, count: row.n }));
}

/** Every listed project, newest release first (sitemaps, llms.txt). */
export async function listedProjectPaths(db: Database): Promise<
  {
    slug: string;
    type: McProjectType;
    name: string;
    summary: string;
    updatedAt: Date;
  }[]
> {
  return db
    .select({
      slug: mcProjects.slug,
      type: mcProjects.type,
      name: mcProjects.name,
      summary: mcProjects.summary,
      updatedAt: mcProjects.updatedAt,
    })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(listedWhere())
    .orderBy(desc(mcProjects.lastReleasedAt));
}

/** An account by its username, any case (null when unknown or blocked). */
export async function creatorByLogin(
  db: Database,
  login: string,
): Promise<User | null> {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.githubLogin}) = ${login.toLowerCase()}`)
    .limit(1);
  return user && !user.blockedAt ? user : null;
}

/** Listed projects per type (types with none are left out). */
export async function countByType(
  db: Database,
): Promise<Map<McProjectType, number>> {
  const rows = await db
    .select({ type: mcProjects.type, n: count() })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(listedWhere())
    .groupBy(mcProjects.type);
  return new Map(rows.map((row) => [row.type, row.n]));
}

/** Where a stored file is used on the platform, for reviewers. */
export interface FileUse {
  projectId: number;
  name: string;
  type: McProjectType;
  slug: string;
  /** The release it's in, or null for a gallery image. */
  version: string | null;
  role: "main file" | "extra file" | "gallery image";
}

/** The projects some files belong to, by file id. */
export async function fileUses(
  db: Database,
  fileIds: readonly string[],
): Promise<Map<string, FileUse>> {
  const uses = new Map<string, FileUse>();
  if (fileIds.length === 0) return uses;
  const ids = [...fileIds];
  const releaseRows = await db
    .select({
      fileId: mcReleaseFiles.fileId,
      primary: mcReleaseFiles.primary,
      version: mcReleases.version,
      projectId: mcProjects.id,
      name: mcProjects.name,
      type: mcProjects.type,
      slug: mcProjects.slug,
    })
    .from(mcReleaseFiles)
    .innerJoin(mcReleases, eq(mcReleases.id, mcReleaseFiles.releaseId))
    .innerJoin(mcProjects, eq(mcProjects.id, mcReleases.projectId))
    .where(inArray(mcReleaseFiles.fileId, ids));
  for (const row of releaseRows)
    uses.set(row.fileId, {
      projectId: row.projectId,
      name: row.name,
      type: row.type,
      slug: row.slug,
      version: row.version,
      role: row.primary ? "main file" : "extra file",
    });
  const galleryRows = await db
    .select({
      fileId: mcGallery.fileId,
      projectId: mcProjects.id,
      name: mcProjects.name,
      type: mcProjects.type,
      slug: mcProjects.slug,
    })
    .from(mcGallery)
    .innerJoin(mcProjects, eq(mcProjects.id, mcGallery.projectId))
    .where(inArray(mcGallery.fileId, ids));
  for (const row of galleryRows)
    uses.set(row.fileId, { ...row, version: null, role: "gallery image" });
  return uses;
}

export interface AdminProjectRow {
  project: McProject;
  ownerLogin: string;
  downloads: number;
  openReports: number;
}

/** Every project for the admin (any state), newest first, with a search. */
export async function adminProjects(
  db: Database,
  options: {
    q?: string;
    filter?: "all" | "hidden" | "featured" | "reported";
    limit?: number;
  } = {},
): Promise<AdminProjectRow[]> {
  const q = options.q?.trim() ?? "";
  const like = likePattern(q);
  const openReports = sql<number>`(select count(*) from ${mcProjectReports} r where r.project_id = ${mcProjects.id} and r.status = 'open')`;
  const rows = await db
    .select({
      project: mcProjects,
      ownerLogin: users.githubLogin,
      downloads: downloadsSql.mapWith(Number),
      openReports: openReports.mapWith(Number),
    })
    .from(mcProjects)
    .innerJoin(users, eq(users.id, mcProjects.ownerId))
    .where(
      and(
        q
          ? or(
              sql`${mcProjects.name} ilike ${like}`,
              sql`${mcProjects.slug} ilike ${like}`,
              sql`${users.githubLogin} ilike ${like}`,
            )
          : undefined,
        options.filter === "hidden"
          ? isNotNull(mcProjects.hiddenAt)
          : undefined,
        options.filter === "featured"
          ? isNotNull(mcProjects.featuredAt)
          : undefined,
        options.filter === "reported" ? sql`${openReports} > 0` : undefined,
      ),
    )
    .orderBy(desc(mcProjects.createdAt), desc(mcProjects.id))
    .limit(options.limit ?? 200);
  return rows;
}

/** Counts for the admin's overview. */
export async function adminCounts(db: Database) {
  const [row] = await db
    .select({
      projects: count(),
      hidden:
        sql<number>`count(*) filter (where ${mcProjects.hiddenAt} is not null)`.mapWith(
          Number,
        ),
      featured:
        sql<number>`count(*) filter (where ${mcProjects.featuredAt} is not null)`.mapWith(
          Number,
        ),
    })
    .from(mcProjects);
  const [reports] = await db
    .select({ n: count() })
    .from(mcProjectReports)
    .where(eq(mcProjectReports.status, "open"));
  return {
    projects: row?.projects ?? 0,
    hidden: row?.hidden ?? 0,
    featured: row?.featured ?? 0,
    reports: reports?.n ?? 0,
  };
}
