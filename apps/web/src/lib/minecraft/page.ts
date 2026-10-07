/**
 * Finding a project for its public pages (/minecraft/<type>/<slug>/…): old slugs and
 * a wrong type redirect to its current address; projects the viewer may not see are
 * missing (404).
 */
import type { Database, McProject, User } from "@trilleo/db";
import { isAdmin } from "../auth/guard";
import { typeFromSegment } from "./catalog";
import { projectPath } from "./paths";
import {
  canEdit,
  canSee,
  findProject,
  isListed,
  isVisible,
  refreshRendering,
  viewerOf,
  type Viewer,
} from "./store";

export type ProjectLookup =
  | { kind: "missing" }
  /** `location` is the project's current address, plus `rest` (e.g. "releases/"). */
  | { kind: "redirect"; location: string }
  | {
      kind: "page";
      project: McProject;
      owner: User;
      viewer: Viewer;
      /** The viewer is its owner or the admin. */
      editable: boolean;
      /** Others can see it. */
      visible: boolean;
      /** It shows in listings and may be indexed. */
      listed: boolean;
    };

export async function lookupProject(
  db: Database,
  params: { type?: string | undefined; slug?: string | undefined },
  user: User | null,
  rest = "",
  search = "",
): Promise<ProjectLookup> {
  const info = typeFromSegment(params.type ?? "");
  const found = await findProject(db, params.slug ?? "");
  if (!info || !found) return { kind: "missing" };
  const viewer = viewerOf(user, isAdmin(user));
  if (!canSee(found.project, found.owner, viewer)) return { kind: "missing" };
  if (found.moved || found.project.type !== info.type)
    return {
      kind: "redirect",
      location: `${projectPath(found.project)}${rest}${search}`,
    };
  return {
    kind: "page",
    project: await refreshRendering(db, found.project),
    owner: found.owner,
    viewer,
    editable: canEdit(found.project, viewer),
    visible: isVisible(found.project, found.owner),
    listed: isListed(found.project, found.owner),
  };
}
