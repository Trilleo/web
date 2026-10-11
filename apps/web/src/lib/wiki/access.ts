/**
 * Who may do what in a wiki. The site's admin can do everything everywhere; a wiki's
 * owners run it (settings, members, protected pages, moves and deletions); editors
 * write pages. Everyone else can read public and unlisted wikis, nothing more.
 */
import type { Wiki, WikiPage, WikiRole } from "@trilleo/db";

export interface WikiAccess {
  role: WikiRole | null;
  admin: boolean;
  signedIn: boolean;
  read: boolean;
  edit: boolean;
  /** Settings, members, moving, deleting, protecting. */
  manage: boolean;
}

export function wikiAccess(
  wiki: Pick<Wiki, "visibility">,
  input: { signedIn: boolean; role: WikiRole | null; admin: boolean },
): WikiAccess {
  const { role, admin, signedIn } = input;
  const manage = admin || role === "owner";
  const edit = manage || role === "editor";
  const read = wiki.visibility !== "private" || edit;
  return { role, admin, signedIn, read, edit, manage };
}

/** Whether this person may change this page (protected pages are for owners). */
export function canEditPage(
  access: WikiAccess,
  page: Pick<WikiPage, "protection"> | null,
): boolean {
  if (!access.edit) return false;
  return page?.protection === "owners" ? access.manage : true;
}

export const ROLE_LABELS: Readonly<Record<WikiRole, string>> = {
  owner: "Owner",
  editor: "Editor",
};
