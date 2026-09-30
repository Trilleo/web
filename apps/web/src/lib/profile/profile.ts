import type { CommentName, ProfileLink, User } from "@trilleo/db";

/**
 * Profiles: what people fill in on /account/profile, and how their name is shown.
 * The username is GitHub's login and can't be changed here; everything else can.
 */

export const PROFILE_LIMITS = {
  displayName: 50,
  pronouns: 30,
  location: 60,
  status: 100,
  bio: 1000,
  links: 5,
  linkLabel: 40,
  linkUrl: 300,
} as const;

/** The fields someone can edit. */
export interface ProfileInput {
  displayName: string | null;
  pronouns: string | null;
  location: string | null;
  status: string | null;
  bio: string | null;
  links: ProfileLink[];
  profilePublic: boolean;
  commentName: CommentName;
}

export type ProfileField =
  "displayName" | "pronouns" | "location" | "status" | "bio" | `link-${string}`;

export type ProfileResult =
  | { ok: true; profile: ProfileInput }
  | { ok: false; errors: Partial<Record<ProfileField, string>> };

/** A profile form's raw values, as typed (so a refused form can be shown again). */
export interface ProfileDraft {
  displayName: string;
  pronouns: string;
  location: string;
  status: string;
  bio: string;
  links: { label: string; url: string }[];
  profilePublic: boolean;
  commentName: CommentName;
}

// Control characters, and the bidi controls that can make a name read backwards.
const CONTROL = /[\p{Cc}\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;
// The same, but newlines survive (for the bio).
const CONTROL_KEEP_NEWLINES =
  /[^\P{Cc}\n]|[\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;

/** One line of text: controls removed, runs of space collapsed, trimmed. */
export function cleanLine(value: string): string {
  return value.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
}

/** Several lines: consistent line endings, controls removed, at most one blank line. */
export function cleanText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_KEEP_NEWLINES, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** The characters as people see them: an emoji (even 👩‍💻) or an accented letter is one. */
function characters(value: string): string[] {
  return Array.from(graphemes.segment(value), (part) => part.segment);
}

/** Characters as people count them. */
function length(value: string): number {
  return characters(value).length;
}

/**
 * A link someone typed, as a full http(s) URL, or null if it isn't one. A bare host
 * ("example.com/me") gets https://. Links with a username or password are refused.
 */
export function normalizeLink(value: string): string | null {
  const typed = value.trim();
  if (!typed || /\s/.test(typed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(typed)
    ? typed
    : `https://${typed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  // A real host: a name with a dot (example.com), not "localhost" or "foo".
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;
  return url.href;
}

/** A link's label when none is given: its host, without "www.". */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Reads the profile form. Link rows are link-label-<n> / link-url-<n>, n from 0. */
export function readProfileForm(form: FormData): ProfileDraft {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const links: ProfileDraft["links"] = [];
  for (let index = 0; index < PROFILE_LIMITS.links; index++) {
    links.push({
      label: text(`link-label-${String(index)}`),
      url: text(`link-url-${String(index)}`),
    });
  }
  return {
    displayName: text("displayName"),
    pronouns: text("pronouns"),
    location: text("location"),
    status: text("status"),
    bio: text("bio"),
    links,
    profilePublic: text("profilePublic") === "on",
    commentName: text("commentName") === "username" ? "username" : "display",
  };
}

/** Checks and tidies a profile form. Empty fields become null. */
export function validateProfile(draft: ProfileDraft): ProfileResult {
  const errors: Partial<Record<ProfileField, string>> = {};

  const line = (
    field: "displayName" | "pronouns" | "location" | "status",
    label: string,
  ): string | null => {
    const value = cleanLine(draft[field]);
    const max = PROFILE_LIMITS[field];
    if (length(value) > max)
      errors[field] = `${label} can be at most ${String(max)} characters.`;
    return value || null;
  };

  const displayName = line("displayName", "Display name");
  const pronouns = line("pronouns", "Pronouns");
  const location = line("location", "Location");
  const status = line("status", "Status");

  const bioText = cleanText(draft.bio);
  if (length(bioText) > PROFILE_LIMITS.bio)
    errors.bio = `Your bio can be at most ${String(PROFILE_LIMITS.bio)} characters.`;
  const bio = bioText || null;

  const links: ProfileLink[] = [];
  draft.links.slice(0, PROFILE_LIMITS.links).forEach((link, index) => {
    const field = `link-${String(index)}` as const;
    const label = cleanLine(link.label);
    const typed = link.url.trim();
    if (!typed) {
      if (label) errors[field] = "Add the link’s address, or clear its label.";
      return;
    }
    const url = normalizeLink(typed);
    if (!url || url.length > PROFILE_LIMITS.linkUrl) {
      errors[field] = url
        ? `Links can be at most ${String(PROFILE_LIMITS.linkUrl)} characters.`
        : "That doesn’t look like a web address (https://…).";
      return;
    }
    if (length(label) > PROFILE_LIMITS.linkLabel) {
      errors[field] =
        `Link labels can be at most ${String(PROFILE_LIMITS.linkLabel)} characters.`;
      return;
    }
    links.push({ label: label || linkHost(url), url });
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    profile: {
      displayName,
      pronouns,
      location,
      status,
      bio,
      links,
      profilePublic: draft.profilePublic,
      commentName: draft.commentName,
    },
  };
}

/** The form's starting values for someone's saved profile. */
export function profileDraft(user: User): ProfileDraft {
  const links = user.links.map((link) => ({ ...link }));
  while (links.length < PROFILE_LIMITS.links)
    links.push({ label: "", url: "" });
  return {
    displayName: user.displayName ?? "",
    pronouns: user.pronouns ?? "",
    location: user.location ?? "",
    status: user.status ?? "",
    bio: user.bio ?? "",
    links,
    profilePublic: user.profilePublic,
    commentName: user.commentName,
  };
}

type Named = Pick<User, "githubLogin" | "name" | "displayName">;

/** Their name: the one they chose, else GitHub's, else their username. */
export function displayName(user: Named): string {
  return user.displayName ?? user.name ?? user.githubLogin;
}

/** The name on their comments: their display name, or null to show only @username. */
export function commentName(
  user: Named & Pick<User, "commentName">,
): string | null {
  return user.commentName === "username" ? null : displayName(user);
}

/** One or two letters for their monogram: initials of their name, else of the login. */
export function monogram(user: Named): string {
  const words = displayName(user)
    .split(/[\s._-]+/)
    .map((word) => characters(word.replace(/[^\p{L}\p{N}\p{M}]/gu, "")))
    .filter((letters) => letters.length > 0);
  const [first, second] = words;
  if (!first) return (characters(user.githubLogin)[0] ?? "?").toUpperCase();
  return ((first[0] ?? "") + (second?.[0] ?? "")).toUpperCase();
}

/** Their public page. */
export function profileHref(login: string): string {
  return `/people/${encodeURIComponent(login)}/`;
}
