/**
 * The creator's pages under /account/minecraft/: loading a project they may edit,
 * the forms' starting values, saving them, and the buttons (gallery, release files,
 * deleting). Pages stay thin: they call these and render or redirect.
 */
import type {
  Database,
  McProject,
  McProjectType,
  McRelease,
  User,
} from "@trilleo/db";
import { FILE_ID_PATTERN } from "@trilleo/storage";
import { field, parseId } from "../comments/form";
import type { Requester, StorageDeps } from "../storage/service";
import { LOADER_LABELS, MC_LIMITS, typeInfo } from "./catalog";
import { BEDROCK_VERSIONS, javaVersions } from "./game-versions";
import {
  cleanCaption,
  readProjectForm,
  readReleaseForm,
  validateProject,
  validateRelease,
  type Errors,
  type ProjectDraft,
  type ProjectField,
  type ReleaseDraft,
  type ReleaseField,
} from "./input";
import {
  editPath,
  galleryEditPath,
  releaseEditPath,
  releasesEditPath,
  DASHBOARD_PATH,
} from "./paths";
import {
  deleteProject,
  deleteRelease,
  removeGalleryImage,
  removeReleaseFile,
} from "./service";
import {
  createProject,
  createRelease,
  getProject,
  getRelease,
  moveImage,
  setCaption,
  setCover,
  setPrimaryFile,
  updateProject,
  updateRelease,
  type Viewer,
} from "./store";

/** A project the signed-in person may edit (theirs, or any for the admin). */
export async function ownProject(
  db: Database,
  user: User,
  admin: boolean,
  idParam: string | undefined,
): Promise<{ project: McProject; viewer: Viewer } | null> {
  const id = parseId(idParam ?? "");
  if (id === null) return null;
  const project = await getProject(db, id);
  if (!project) return null;
  if (!admin && project.ownerId !== user.id) return null;
  return { project, viewer: { userId: user.id, isAdmin: admin } };
}

// --- Projects -----------------------------------------------------------------

export function emptyProjectDraft(type = "mod"): ProjectDraft {
  return {
    type,
    name: "",
    slug: "",
    summary: "",
    description: "",
    edition: "java",
    tags: "",
    license: "ARR",
    licenseText: "",
    links: Array.from({ length: MC_LIMITS.links }, () => ({
      kind: "source",
      url: "",
    })),
    state: "public",
  };
}

export function projectDraftOf(project: McProject): ProjectDraft {
  const links = project.links.map((link) => ({ ...link }));
  while (links.length < MC_LIMITS.links)
    links.push({ kind: "source", url: "" });
  return {
    type: project.type,
    name: project.name,
    slug: project.slug,
    summary: project.summary,
    description: project.description,
    edition: project.edition,
    tags: project.tags.join(", "),
    license: project.license,
    licenseText: project.licenseText ?? "",
    links,
    state: project.state,
  };
}

export type FormOutcome<Field extends string, Draft> =
  | { kind: "redirect"; location: string }
  | {
      kind: "invalid";
      values: Draft;
      errors: Errors<Field> & { form?: string };
    };

/** Saves the details form: a new project, or changes to one. */
export async function saveProjectForm(
  db: Database,
  user: User,
  admin: boolean,
  project: McProject | null,
  form: FormData,
): Promise<FormOutcome<ProjectField, ProjectDraft>> {
  const draft = readProjectForm(form);
  // The type is chosen once, when the project is made.
  if (project) draft.type = project.type;
  const checked = validateProject(draft);
  if (!checked.ok)
    return { kind: "invalid", values: draft, errors: checked.errors };
  const saved = project
    ? await updateProject(db, project, checked.value)
    : await createProject(db, user, admin, checked.value);
  if (!saved.ok) {
    const errors: Errors<ProjectField> & { form?: string } =
      saved.status === 409 ? { slug: saved.error } : { form: saved.error };
    return { kind: "invalid", values: draft, errors };
  }
  return {
    kind: "redirect",
    location: project
      ? `${editPath(saved.value.id)}?done=saved`
      : `${galleryEditPath(saved.value.id)}?done=created`,
  };
}

// --- Releases -----------------------------------------------------------------

/** The Minecraft versions a project's releases can name, by edition. */
export async function versionChoices(project: Pick<McProject, "edition">) {
  const java =
    project.edition === "bedrock" ? [] : [...(await javaVersions().versions())];
  const bedrock = project.edition === "java" ? [] : [...BEDROCK_VERSIONS];
  return { java, bedrock, all: new Set([...java, ...bedrock]) };
}

export function emptyReleaseDraft(): ReleaseDraft {
  return {
    version: "",
    title: "",
    channel: "release",
    changelog: "",
    gameVersions: [],
    loaders: [],
    dependencies: [],
  };
}

export function releaseDraftOf(
  release: McRelease,
  dependencies: {
    kind: string;
    slug: string | null;
    name: string;
    url: string | null;
  }[],
): ReleaseDraft {
  return {
    version: release.version,
    title: release.title,
    channel: release.channel,
    changelog: release.changelog,
    gameVersions: [...release.gameVersions],
    loaders: [...release.loaders],
    dependencies: dependencies.map((dep) => ({
      kind: dep.kind,
      target: dep.slug ?? dep.name,
      url: dep.slug ? "" : (dep.url ?? ""),
    })),
  };
}

/** What the release editor (a React island) needs. */
export interface ReleaseEditorProps {
  projectId: number;
  type: McProjectType;
  typeLabel: string;
  /** Extensions a main file may have. */
  extensions: string[];
  loaders: { value: string; label: string }[];
  needsLoader: boolean;
  edition: McProject["edition"];
  javaVersions: string[];
  bedrockVersions: string[];
  releaseId: number | null;
  values: ReleaseDraft;
  errors: Errors<ReleaseField> & { form?: string };
  notice: string | null;
  /** Where the form posts. */
  action: string;
  cancelHref: string;
  /** The editor's own address for a release, once made ("…/releases/<id>/"). */
  releaseHrefBase: string;
}

export async function releaseEditorProps(
  project: McProject,
  release: McRelease | null,
  values: ReleaseDraft,
  errors: ReleaseEditorProps["errors"] = {},
  notice: string | null = null,
): Promise<ReleaseEditorProps> {
  const info = typeInfo(project.type);
  const choices = await versionChoices(project);
  return {
    projectId: project.id,
    type: project.type,
    typeLabel: info.label,
    extensions: [...info.extensions],
    loaders: info.loaders.map((value) => ({
      value,
      label: LOADER_LABELS[value] ?? value,
    })),
    needsLoader: info.needsLoader,
    edition: project.edition,
    javaVersions: choices.java,
    bedrockVersions: choices.bedrock,
    releaseId: release?.id ?? null,
    values,
    errors,
    notice,
    action: releaseEditPath(project.id, release?.id ?? "new"),
    cancelHref: releasesEditPath(project.id),
    releaseHrefBase: releasesEditPath(project.id),
  };
}

export type ReleaseOutcome =
  | FormOutcome<ReleaseField, ReleaseDraft>
  | { kind: "json"; status: number; body: unknown };

/**
 * Saves the release form. With `json` (the editor uploading a main file next), it
 * answers with the release's id or the problems instead of redirecting.
 */
export async function saveReleaseForm(
  db: Database,
  viewer: Viewer,
  project: McProject,
  release: McRelease | null,
  form: FormData,
  json: boolean,
): Promise<ReleaseOutcome> {
  const draft = readReleaseForm(form);
  const { all } = await versionChoices(project);
  const checked = validateRelease(draft, {
    type: project.type,
    knownVersions: all,
  });
  const invalid = (
    errors: Errors<ReleaseField> & { form?: string },
  ): ReleaseOutcome =>
    json
      ? { kind: "json", status: 422, body: { ok: false, errors } }
      : { kind: "invalid", values: draft, errors };
  if (!checked.ok) return invalid(checked.errors);
  const saved = release
    ? await updateRelease(db, project, release, checked.value)
    : await createRelease(db, project, viewer, checked.value);
  if (!saved.ok)
    return invalid(
      saved.status === 409 ? { version: saved.error } : { form: saved.error },
    );
  if (json)
    return {
      kind: "json",
      status: release ? 200 : 201,
      body: { ok: true, releaseId: saved.value.id },
    };
  return {
    kind: "redirect",
    location: `${releaseEditPath(project.id, saved.value.id)}?done=${release ? "saved" : "created"}`,
  };
}

// --- Buttons ------------------------------------------------------------------

/** What a creator's button did: back to `location` with ?done= or ?error=. */
export interface ActionOutcome {
  location: string;
}

function back(path: string, key: "done" | "error", value: string, hash = "") {
  return {
    location: `${path}?${new URLSearchParams({ [key]: value }).toString()}${hash}`,
  };
}

/**
 * The creator's buttons (POST /account/minecraft/<id>/action): gallery captions,
 * order, cover and removal; a release's main file, file removal and deletion; and
 * deleting the whole project.
 */
export async function handleCreatorAction(
  deps: StorageDeps,
  requester: Requester,
  project: McProject,
  form: FormData,
): Promise<ActionOutcome> {
  const { db } = deps;
  const action = field(form, "action");
  const gallery = galleryEditPath(project.id);
  const imageId = parseId(field(form, "image"));
  const releaseId = parseId(field(form, "release"));
  const fileId = field(form, "file");

  switch (action) {
    case "caption": {
      if (imageId === null)
        return back(gallery, "error", "There’s no such image.");
      const caption = cleanCaption(field(form, "caption"));
      if (caption === null)
        return back(
          gallery,
          "error",
          `Captions can be at most ${String(MC_LIMITS.caption)} characters.`,
          `#image-${String(imageId)}`,
        );
      await setCaption(db, project, imageId, caption);
      return back(gallery, "done", "caption", `#image-${String(imageId)}`);
    }
    case "up":
    case "down": {
      if (imageId === null)
        return back(gallery, "error", "There’s no such image.");
      await moveImage(db, project, imageId, action === "up" ? -1 : 1);
      return back(gallery, "done", "moved", `#image-${String(imageId)}`);
    }
    case "cover": {
      if (imageId === null)
        return back(gallery, "error", "There’s no such image.");
      const result = await setCover(db, project, imageId);
      return result.ok
        ? back(gallery, "done", "cover", `#image-${String(imageId)}`)
        : back(gallery, "error", result.error);
    }
    case "remove-image": {
      if (imageId === null)
        return back(gallery, "error", "There’s no such image.");
      const result = await removeGalleryImage(
        deps,
        requester,
        project,
        imageId,
      );
      return result.ok
        ? back(gallery, "done", "removed")
        : back(gallery, "error", result.error);
    }
    case "primary":
    case "remove-file":
    case "delete-release": {
      const release =
        releaseId === null
          ? undefined
          : await getRelease(db, project.id, releaseId);
      if (!release)
        return back(
          releasesEditPath(project.id),
          "error",
          "There’s no such release.",
        );
      const page = releaseEditPath(project.id, release.id);
      if (action === "delete-release") {
        await deleteRelease(deps, requester, project, release);
        return back(releasesEditPath(project.id), "done", "deleted");
      }
      if (!FILE_ID_PATTERN.test(fileId))
        return back(page, "error", "There’s no such file.");
      const result =
        action === "primary"
          ? await setPrimaryFile(db, project, release, fileId)
          : await removeReleaseFile(deps, requester, project, release, fileId);
      return result.ok
        ? back(
            page,
            "done",
            action === "primary" ? "primary" : "removed",
            "#files",
          )
        : back(page, "error", result.error, "#files");
    }
    case "delete-project": {
      if (form.get("confirm") !== "yes")
        return back(
          editPath(project.id),
          "error",
          "Tick the box to confirm.",
          "#delete",
        );
      await deleteProject(deps, requester, project);
      return back(DASHBOARD_PATH, "done", "deleted");
    }
    default:
      return back(editPath(project.id), "error", "Unknown action.");
  }
}

// --- Attaching uploads (the editor's JSON endpoint) -----------------------------

export interface AttachRequest {
  project: number;
  /** A release's file, or (without) a gallery image. */
  release?: number;
  file: string;
  primary?: boolean;
  caption?: string;
}

export function parseAttachRequest(body: unknown): AttachRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { project, release, file, primary, caption } = body as Record<
    string,
    unknown
  >;
  if (typeof project !== "number" || !Number.isSafeInteger(project))
    return null;
  if (typeof file !== "string" || !FILE_ID_PATTERN.test(file)) return null;
  if (
    release !== undefined &&
    (typeof release !== "number" || !Number.isSafeInteger(release))
  )
    return null;
  if (primary !== undefined && typeof primary !== "boolean") return null;
  if (caption !== undefined && typeof caption !== "string") return null;
  return {
    project,
    file,
    ...(release === undefined ? {} : { release }),
    ...(primary === undefined ? {} : { primary }),
    ...(caption === undefined ? {} : { caption }),
  };
}
