/**
 * What the creator's forms submit, read and checked. Pure (no database): store.ts
 * adds the checks that need it (a slug or version already taken, a dependency that
 * doesn't exist). Each `read…Form` keeps the values as typed, so a refused form can
 * be shown again; each `validate…` tidies them or says what's wrong, per field.
 */
import type {
  McChannel,
  McDependencyKind,
  McEdition,
  McProjectLink,
  McProjectState,
  McProjectType,
} from "@trilleo/db";
import { tagSlug } from "../posts";
import { cleanLine, cleanText, normalizeLink } from "../profile/profile";
import {
  CHANNELS,
  DEPENDENCY_KINDS,
  EDITIONS,
  LINK_KINDS,
  MC_LIMITS,
  STATES,
  isProjectType,
  licenseInfo,
  typeInfo,
} from "./catalog";

export type Errors<Field extends string> = Partial<Record<Field, string>>;

export type Validated<T, Field extends string> =
  { ok: true; value: T } | { ok: false; errors: Errors<Field> };

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Characters as people count them (an emoji is one). */
export function charLength(value: string): number {
  return Array.from(graphemes.segment(value)).length;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function texts(form: FormData, name: string): string[] {
  return form
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

function tooLong(label: string, max: number): string {
  return `${label} can be at most ${max.toLocaleString("en")} characters.`;
}

/** Paths under /minecraft/<type>/ that aren't projects. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "new",
  "edit",
  "page",
  "feed",
  "search",
  "api",
]);

/** "Better Redstone!" → "better-redstone". */
export function slugify(name: string): string {
  return tagSlug(name).slice(0, MC_LIMITS.slug).replace(/-+$/, "");
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= MC_LIMITS.slug &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_SLUGS.has(slug)
  );
}

/** "Redstone, Tech, redstone" → ["redstone", "tech"]. */
export function parseTags(value: string): string[] {
  const tags: string[] = [];
  for (const raw of value.split(",")) {
    const slug = tagSlug(raw);
    if (slug && !tags.includes(slug)) tags.push(slug);
  }
  return tags;
}

// --- Projects ---------------------------------------------------------------

export interface ProjectDraft {
  type: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  edition: string;
  tags: string;
  license: string;
  licenseText: string;
  links: { kind: string; url: string }[];
  state: string;
}

export interface ProjectInput {
  type: McProjectType;
  name: string;
  slug: string;
  summary: string;
  description: string;
  edition: McEdition;
  tags: string[];
  license: string;
  licenseText: string | null;
  links: McProjectLink[];
  state: McProjectState;
}

export type ProjectField =
  | "type"
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "edition"
  | "tags"
  | "license"
  | "licenseText"
  | "state"
  | `link-${string}`;

/** Link rows are link-kind-<n> / link-url-<n>, n from 0. */
export function readProjectForm(form: FormData): ProjectDraft {
  const links: ProjectDraft["links"] = [];
  for (let index = 0; index < MC_LIMITS.links; index++) {
    links.push({
      kind: text(form, `link-kind-${String(index)}`),
      url: text(form, `link-url-${String(index)}`),
    });
  }
  return {
    type: text(form, "type"),
    name: text(form, "name"),
    slug: text(form, "slug"),
    summary: text(form, "summary"),
    description: text(form, "description"),
    edition: text(form, "edition"),
    tags: text(form, "tags"),
    license: text(form, "license"),
    licenseText: text(form, "licenseText"),
    links,
    state: text(form, "state"),
  };
}

export function validateProject(
  draft: ProjectDraft,
): Validated<ProjectInput, ProjectField> {
  const errors: Errors<ProjectField> = {};

  const type = draft.type;
  if (!isProjectType(type)) errors.type = "Choose what kind of project it is.";

  const name = cleanLine(draft.name);
  if (!name) errors.name = "Give it a name.";
  else if (charLength(name) > MC_LIMITS.name)
    errors.name = tooLong("Names", MC_LIMITS.name);

  const slug = draft.slug.trim().toLowerCase() || slugify(name);
  if (!isValidSlug(slug))
    errors.slug = RESERVED_SLUGS.has(slug)
      ? "That address is taken by the site. Try another."
      : `Use 2–${String(MC_LIMITS.slug)} lowercase letters, digits and dashes.`;

  const summary = cleanLine(draft.summary);
  if (!summary) errors.summary = "Say in a line what it is.";
  else if (charLength(summary) > MC_LIMITS.summary)
    errors.summary = tooLong("The summary", MC_LIMITS.summary);

  const description = cleanText(draft.description);
  if (description.length > MC_LIMITS.description)
    errors.description = tooLong("The description", MC_LIMITS.description);

  const edition = draft.edition as McEdition;
  if (!EDITIONS.some((entry) => entry.value === edition))
    errors.edition = "Choose an edition.";

  const tags = parseTags(draft.tags);
  if (tags.length > MC_LIMITS.tags)
    errors.tags = `Use at most ${String(MC_LIMITS.tags)} tags.`;
  else if (tags.some((tag) => tag.length > MC_LIMITS.tag))
    errors.tags = `Tags can be at most ${String(MC_LIMITS.tag)} characters.`;

  const license = draft.license;
  const licenseText = cleanText(draft.licenseText);
  if (!licenseInfo(license)) errors.license = "Choose a licence.";
  else if (license === "custom" && !licenseText)
    errors.licenseText = "Paste your licence, or choose one from the list.";
  else if (licenseText.length > MC_LIMITS.licenseText)
    errors.licenseText = tooLong("The licence", MC_LIMITS.licenseText);

  const links: McProjectLink[] = [];
  draft.links.slice(0, MC_LIMITS.links).forEach((link, index) => {
    const field = `link-${String(index)}` as const;
    const typed = link.url.trim();
    if (!typed) return;
    const kind = LINK_KINDS.some((entry) => entry.value === link.kind)
      ? link.kind
      : "website";
    const url = normalizeLink(typed);
    if (!url)
      errors[field] = "That doesn’t look like a web address (https://…).";
    else if (url.length > MC_LIMITS.linkUrl)
      errors[field] = tooLong("Links", MC_LIMITS.linkUrl);
    else links.push({ kind, url });
  });

  const state = (draft.state || "draft") as McProjectState;
  if (!STATES.some((entry) => entry.value === state))
    errors.state = "Choose who can see it.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      type: type as McProjectType,
      name,
      slug,
      summary,
      description,
      edition,
      tags,
      license,
      licenseText: license === "custom" ? licenseText : null,
      links,
      state,
    },
  };
}

// --- Releases ---------------------------------------------------------------

export interface DependencyDraft {
  kind: string;
  /** A project here, by slug (or its URL), or an outside one's name… */
  target: string;
  /** …and, for an outside one, where to find it. */
  url: string;
}

export interface ReleaseDraft {
  version: string;
  title: string;
  channel: string;
  changelog: string;
  gameVersions: string[];
  loaders: string[];
  dependencies: DependencyDraft[];
}

export interface DependencyInput {
  kind: McDependencyKind;
  /** A slug on this site, to look up; null for an outside project. */
  slug: string | null;
  name: string;
  url: string | null;
}

export interface ReleaseInput {
  version: string;
  title: string;
  channel: McChannel;
  changelog: string;
  gameVersions: string[];
  loaders: string[];
  dependencies: DependencyInput[];
}

export type ReleaseField =
  | "version"
  | "title"
  | "channel"
  | "changelog"
  | "gameVersions"
  | "loaders"
  | `dependency-${string}`;

/** Dependency rows are dep-kind-<n> / dep-target-<n> / dep-url-<n>. */
export function readReleaseForm(form: FormData): ReleaseDraft {
  const dependencies: DependencyDraft[] = [];
  for (let index = 0; index < MC_LIMITS.dependencies; index++) {
    const n = String(index);
    if (!form.has(`dep-target-${n}`)) continue;
    dependencies.push({
      kind: text(form, `dep-kind-${n}`),
      target: text(form, `dep-target-${n}`),
      url: text(form, `dep-url-${n}`),
    });
  }
  return {
    version: text(form, "version"),
    title: text(form, "title"),
    channel: text(form, "channel"),
    changelog: text(form, "changelog"),
    gameVersions: texts(form, "gameVersions"),
    loaders: texts(form, "loaders"),
    dependencies,
  };
}

/** A release's version label: "1.4.2", "v3", "2024.06-beta+fabric". */
export function isValidVersion(version: string): boolean {
  return (
    version.length <= MC_LIMITS.version &&
    /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(version)
  );
}

/** "/minecraft/mods/better-redstone/" or "better-redstone" → "better-redstone". */
export function slugFromTarget(target: string): string | null {
  const trimmed = target.trim();
  const path = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  const match = /^\/?minecraft\/[a-z-]+\/([a-z0-9-]+)\/?$/.exec(path);
  if (match?.[1]) return match[1];
  return isValidSlug(trimmed) ? trimmed : null;
}

export interface ReleaseContext {
  type: McProjectType;
  /** The versions this project's edition can name. */
  knownVersions: ReadonlySet<string>;
}

export function validateRelease(
  draft: ReleaseDraft,
  context: ReleaseContext,
): Validated<ReleaseInput, ReleaseField> {
  const errors: Errors<ReleaseField> = {};
  const info = typeInfo(context.type);

  const version = draft.version.trim();
  if (!version) errors.version = "Give this release a version, like 1.0.0.";
  else if (!isValidVersion(version))
    errors.version = `Use up to ${String(MC_LIMITS.version)} letters, digits, dots, dashes, + and _.`;

  const title = cleanLine(draft.title);
  if (charLength(title) > MC_LIMITS.releaseTitle)
    errors.title = tooLong("Release names", MC_LIMITS.releaseTitle);

  const channel = (draft.channel || "release") as McChannel;
  if (!CHANNELS.some((entry) => entry.value === channel))
    errors.channel = "Choose a channel.";

  const changelog = cleanText(draft.changelog);
  if (changelog.length > MC_LIMITS.changelog)
    errors.changelog = tooLong("The changelog", MC_LIMITS.changelog);

  const gameVersions = [...new Set(draft.gameVersions)];
  if (gameVersions.length === 0)
    errors.gameVersions = "Tick the Minecraft versions it works with.";
  else if (gameVersions.length > MC_LIMITS.gameVersions)
    errors.gameVersions = `Tick at most ${String(MC_LIMITS.gameVersions)} versions.`;
  else if (gameVersions.some((id) => !context.knownVersions.has(id)))
    errors.gameVersions = "One of those isn’t a Minecraft version we know.";

  const loaders = [...new Set(draft.loaders)];
  if (loaders.some((loader) => !info.loaders.includes(loader)))
    errors.loaders = `That loader doesn’t fit a ${info.label.toLowerCase()}.`;
  else if (info.needsLoader && loaders.length === 0)
    errors.loaders = "Tick the platforms it runs on.";

  const dependencies: DependencyInput[] = [];
  draft.dependencies
    .slice(0, MC_LIMITS.dependencies)
    .forEach((dependency, index) => {
      const field = `dependency-${String(index)}` as const;
      const target = cleanLine(dependency.target);
      const typedUrl = dependency.url.trim();
      if (!target && !typedUrl) return;
      const kind = dependency.kind as McDependencyKind;
      if (!DEPENDENCY_KINDS.some((entry) => entry.value === kind)) {
        errors[field] = "Choose how it depends on this.";
        return;
      }
      if (typedUrl) {
        // Somewhere else: a name and an address.
        const url = normalizeLink(typedUrl);
        if (!target) errors[field] = "Name the project.";
        else if (charLength(target) > MC_LIMITS.dependencyName)
          errors[field] = tooLong("Names", MC_LIMITS.dependencyName);
        else if (!url || url.length > MC_LIMITS.linkUrl)
          errors[field] = "That doesn’t look like a web address (https://…).";
        else dependencies.push({ kind, slug: null, name: target, url });
        return;
      }
      const slug = slugFromTarget(target);
      if (!slug) {
        errors[field] =
          "Give a project here (its address), or a name and a link for one elsewhere.";
        return;
      }
      dependencies.push({ kind, slug, name: slug, url: null });
    });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      version,
      title,
      channel,
      changelog,
      gameVersions,
      loaders,
      dependencies,
    },
  };
}

/** A gallery caption, tidied (null: too long). */
export function cleanCaption(value: string): string | null {
  const caption = cleanLine(value);
  return charLength(caption) > MC_LIMITS.caption ? null : caption;
}
