/** The platform's addresses, in one place. */
import type { McProjectType } from "@trilleo/db";
import { typeInfo } from "./catalog";

export const MINECRAFT_PATH = "/minecraft/";

export function typePath(type: McProjectType): string {
  return `/minecraft/${typeInfo(type).segment}/`;
}

export function projectPath(project: {
  type: McProjectType;
  slug: string;
}): string {
  return `${typePath(project.type)}${project.slug}/`;
}

export function releasesPath(project: {
  type: McProjectType;
  slug: string;
}): string {
  return `${projectPath(project)}releases/`;
}

export function releasePath(
  project: { type: McProjectType; slug: string },
  version: string,
): string {
  return `${releasesPath(project)}${encodeURIComponent(version)}/`;
}

export function projectDownloadPath(project: {
  type: McProjectType;
  slug: string;
}): string {
  return `${projectPath(project)}download/`;
}

export function creatorPath(login: string): string {
  return `/minecraft/creators/${encodeURIComponent(login)}/`;
}

// The creator's own pages (signed in, under /account/).
export const DASHBOARD_PATH = "/account/minecraft/";

export function editPath(id: number | "new"): string {
  return `${DASHBOARD_PATH}${String(id)}/`;
}

export function galleryEditPath(id: number): string {
  return `${editPath(id)}gallery/`;
}

export function releasesEditPath(id: number): string {
  return `${editPath(id)}releases/`;
}

export function releaseEditPath(id: number, releaseId: number | "new"): string {
  return `${releasesEditPath(id)}${String(releaseId)}/`;
}

export function actionPath(id: number): string {
  return `${editPath(id)}action`;
}
