/**
 * What the post editor submits, checked. Pure (no database), so it's unit-tested
 * directly; store.ts adds the checks that need the database (a slug already taken).
 */
import type { CommentMode } from "@trilleo/db";
import { tagSlug } from "../posts";

export const POST_LIMITS = {
  title: 200,
  description: 500,
  seoTitle: 120,
  seoDescription: 300,
  body: 200_000,
  slug: 100,
  tags: 12,
  tag: 40,
} as const;

/** Paths under /writing/ that aren't posts. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set(["tags", "preview"]);

export const COMMENT_MODES: readonly CommentMode[] = ["open", "closed", "off"];

/** What the editor's buttons do beyond saving. */
export type PostAction = "save" | "publish" | "unpublish";

export interface PostInput {
  title: string;
  slug: string;
  description: string;
  body: string;
  tags: string[];
  /** When it goes (or went) live; null: "now", once published. */
  publishedAt: Date | null;
  commentMode: CommentMode;
  /** Show readers this edit as an update ("Updated <date>"). */
  revised: boolean;
  /** For search engines and link previews; "" uses the title. */
  seoTitle: string;
  /** For search engines and link previews; "" uses the description. */
  seoDescription: string;
}

export type PostField =
  | "title"
  | "slug"
  | "description"
  | "body"
  | "tags"
  | "publishedAt"
  | "seoTitle"
  | "seoDescription";
export type PostErrors = Partial<Record<PostField, string>>;

/** "Why I moved off WordPress!" → "why-i-moved-off-wordpress". */
export function slugify(title: string): string {
  return tagSlug(title).slice(0, POST_LIMITS.slug).replace(/-+$/, "");
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length <= POST_LIMITS.slug &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_SLUGS.has(slug)
  );
}

/** "Astro, tooling, astro" → ["Astro", "tooling"]: trimmed, and one per tag slug. */
export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value.split(",")) {
    const tag = raw.trim().replace(/\s+/g, " ");
    const slug = tagSlug(tag);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    tags.push(tag);
  }
  return tags;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function parsePostAction(value: string): PostAction {
  return value === "publish" || value === "unpublish" ? value : "save";
}

/**
 * The editor's form, checked. `publishedAt` arrives as an ISO date-time: the editor
 * converts the admin's local time, so the server needn't guess their time zone.
 */
export function parsePostForm(
  form: FormData,
):
  | { ok: true; input: PostInput }
  | { ok: false; errors: PostErrors; input: PostInput } {
  const title = text(form, "title").trim();
  const slugField = text(form, "slug").trim().toLowerCase();
  const slug = slugField || slugify(title);
  const description = text(form, "description").trim();
  const body = text(form, "body").replace(/\r\n?/g, "\n");
  const tags = parseTags(text(form, "tags"));
  const dateField = text(form, "publishedAt").trim();
  const date = dateField ? new Date(dateField) : null;
  const modeField = text(form, "commentMode");
  const commentMode =
    COMMENT_MODES.find((mode) => mode === modeField) ?? "open";

  const input: PostInput = {
    title,
    slug,
    description,
    body,
    tags,
    publishedAt: date && !Number.isNaN(date.getTime()) ? date : null,
    commentMode,
    revised: text(form, "revised") === "on",
    seoTitle: text(form, "seoTitle").trim().replace(/\s+/g, " "),
    seoDescription: text(form, "seoDescription").trim().replace(/\s+/g, " "),
  };

  const errors: PostErrors = {};
  if (!title) errors.title = "Give the post a title.";
  else if (title.length > POST_LIMITS.title)
    errors.title = `Keep the title under ${String(POST_LIMITS.title)} characters.`;
  if (!isValidSlug(slug))
    errors.slug = RESERVED_SLUGS.has(slug)
      ? `“${slug}” is used by the site; pick another.`
      : "Use lowercase letters, numbers and single hyphens.";
  if (description.length > POST_LIMITS.description)
    errors.description = `Keep the description under ${String(POST_LIMITS.description)} characters.`;
  if (input.seoTitle.length > POST_LIMITS.seoTitle)
    errors.seoTitle = `Keep the search title under ${String(POST_LIMITS.seoTitle)} characters.`;
  if (input.seoDescription.length > POST_LIMITS.seoDescription)
    errors.seoDescription = `Keep the search description under ${String(POST_LIMITS.seoDescription)} characters.`;
  if (body.length > POST_LIMITS.body)
    errors.body = "The post is too long to save.";
  if (tags.length > POST_LIMITS.tags)
    errors.tags = `Use at most ${String(POST_LIMITS.tags)} tags.`;
  else if (tags.some((tag) => tag.length > POST_LIMITS.tag))
    errors.tags = `Keep each tag under ${String(POST_LIMITS.tag)} characters.`;
  if (dateField && input.publishedAt === null)
    errors.publishedAt = "That date isn’t valid.";

  return Object.keys(errors).length === 0
    ? { ok: true, input }
    : { ok: false, errors, input };
}

/** Publishing needs a description (it's the post's summary in lists, feeds and search). */
export function publishErrors(input: PostInput): PostErrors {
  return input.description
    ? {}
    : { description: "Add a description before publishing." };
}
