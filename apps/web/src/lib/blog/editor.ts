/**
 * The admin editor's server side: the values it starts from, and what a submitted
 * form does. The pages (/admin/posts/new, /admin/posts/<id>) render PostEditor with
 * these and call handleEditorPost on POST.
 */
import type { CommentMode, Database, Post } from "@trilleo/db";
import { SITE_URL } from "../site";
import { postHref } from "../posts";
import {
  parsePostAction,
  parsePostForm,
  type PostErrors,
  type PostInput,
} from "./input";
import {
  adminState,
  createPost,
  deletePost,
  getPost,
  isPublic,
  newPreviewToken,
  setPreviewToken,
  updatePost,
  type AdminPostState,
} from "./store";

/** What the editor's fields hold (all serializable, for the React island). */
export interface EditorValues {
  title: string;
  slug: string;
  description: string;
  body: string;
  /** Comma-separated. */
  tags: string;
  /** ISO date-time, or "" for none. */
  publishedAt: string;
  commentMode: CommentMode;
}

export interface EditorProps {
  /** Null for a post not saved yet. */
  id: number | null;
  values: EditorValues;
  state: AdminPostState;
  /** Readers can see it here now. */
  publicUrl: string | null;
  /** Its share link, if one exists (absolute, to copy). */
  previewUrl: string | null;
  errors: PostErrors;
  /** A one-line result of the last action ("Published.", …). */
  notice: string | null;
  /** ISO time of the last save, or null. */
  savedAt: string | null;
}

export const EMPTY_VALUES: EditorValues = {
  title: "",
  slug: "",
  description: "",
  body: "",
  tags: "",
  publishedAt: "",
  commentMode: "open",
};

export function editorValues(post: Post | PostInput): EditorValues {
  return {
    title: post.title,
    slug: post.slug,
    description: post.description,
    body: post.body,
    tags: post.tags.join(", "),
    publishedAt: post.publishedAt?.toISOString() ?? "",
    commentMode: post.commentMode,
  };
}

export function editorProps(
  post: Post,
  options: { now?: Date; notice?: string | null; site?: URL | string } = {},
): EditorProps {
  const now = options.now ?? new Date();
  return {
    id: post.id,
    values: editorValues(post),
    state: adminState(post, now),
    publicUrl: isPublic(post, now) ? postHref(post.slug) : null,
    previewUrl: post.previewToken
      ? new URL(
          `/writing/preview/${post.previewToken}/`,
          options.site ?? SITE_URL,
        ).href
      : null,
    errors: {},
    notice: options.notice ?? null,
    savedAt: post.savedAt.toISOString(),
  };
}

export const editHref = (id: number) => `/admin/posts/${String(id)}/`;

/** What ?done=… in the editor's URL says after a redirect. */
export const NOTICES: Readonly<Record<string, string>> = {
  created: "Saved as a draft.",
  saved: "Saved.",
  published: "Published.",
  scheduled: "Scheduled.",
  unpublished: "Unpublished: it’s a draft again.",
  linked: "Share link created.",
  unlinked: "Share link revoked: the old link no longer works.",
};

export type EditorOutcome =
  /** Go here (after a normal form post). */
  | { kind: "redirect"; location: string }
  /** Show the editor again with these values and errors. */
  | { kind: "invalid"; values: EditorValues; errors: PostErrors }
  /** For an autosave (JSON). */
  | { kind: "json"; status: number; body: unknown }
  | { kind: "not-found" };

/**
 * Handles the editor's form: saving (and publishing, scheduling, unpublishing), the
 * share link, and deleting. `id` is null on /admin/posts/new. With `json`, it's an
 * autosave from the editor: the answer is JSON, never a redirect.
 */
export async function handleEditorPost(
  db: Database,
  id: number | null,
  form: FormData,
  options: { json: boolean; now?: Date },
): Promise<EditorOutcome> {
  const now = options.now ?? new Date();
  const intentField = form.get("intent");
  const intent = typeof intentField === "string" ? intentField : "save";

  if (
    id !== null &&
    (intent === "delete" || intent === "link" || intent === "unlink")
  ) {
    if (intent === "delete") {
      return (await deletePost(db, id))
        ? { kind: "redirect", location: "/admin/posts/?done=deleted" }
        : { kind: "not-found" };
    }
    const changed = await setPreviewToken(
      db,
      id,
      intent === "link" ? newPreviewToken() : null,
    );
    if (!changed) return { kind: "not-found" };
    return {
      kind: "redirect",
      location: `${editHref(id)}?done=${intent}ed#sharing`,
    };
  }

  const parsed = parsePostForm(form);
  // Autosaves only ever save, and only drafts: a live post changes when the admin says.
  const action = options.json ? "save" : parsePostAction(intent);
  if (options.json && id !== null) {
    const current = await getPost(db, id);
    if (!current) return { kind: "not-found" };
    if (current.status !== "draft") {
      return { kind: "json", status: 409, body: { ok: false, errors: {} } };
    }
  }
  if (!parsed.ok) {
    return options.json
      ? {
          kind: "json",
          status: 422,
          body: { ok: false, errors: parsed.errors },
        }
      : {
          kind: "invalid",
          values: editorValues(parsed.input),
          errors: parsed.errors,
        };
  }

  const result =
    id === null
      ? await createPost(db, parsed.input, action, now)
      : await updatePost(db, id, parsed.input, action, now);
  if (!result.ok) {
    if (result.errors === "not-found") return { kind: "not-found" };
    return options.json
      ? {
          kind: "json",
          status: 422,
          body: { ok: false, errors: result.errors },
        }
      : {
          kind: "invalid",
          values: editorValues(parsed.input),
          errors: result.errors,
        };
  }

  const { post } = result;
  if (options.json) {
    return {
      kind: "json",
      status: 200,
      body: {
        ok: true,
        id: post.id,
        editUrl: editHref(post.id),
        slug: post.slug,
        savedAt: post.savedAt.toISOString(),
      },
    };
  }
  const done =
    id === null && action === "save"
      ? "created"
      : action === "publish"
        ? adminState(post, now) === "scheduled"
          ? "scheduled"
          : "published"
        : action === "unpublish"
          ? "unpublished"
          : "saved";
  return { kind: "redirect", location: `${editHref(post.id)}?done=${done}` };
}
