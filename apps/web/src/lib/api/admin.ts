/** The control panel's forms (/admin/api/): reading them, and what to say when they're wrong. */
import type { AstroCookies } from "astro";
import { field } from "../comments/form";
import type { AppInput, AppProblem, KeyInput } from "./keys";
import { API_LIMITS } from "./limits";

export const APP_PROBLEMS: Readonly<Record<AppProblem, string>> = {
  name: "Give the app a name (up to 80 characters).",
  description: "Keep the description under 500 characters.",
  rateLimit: `The rate limit is a whole number of requests per minute, from 1 to ${String(API_LIMITS.maxPerMinute)}.`,
};

export const KEY_PROBLEMS = {
  name: "Give the key a label (up to 80 characters), e.g. where it runs.",
  expiry: "The expiry date has to be in the future.",
  limit: `An app can have at most ${String(API_LIMITS.keysPerApp)} keys that aren't revoked. Revoke one first.`,
} as const;

export function appInputFromForm(form: FormData): AppInput {
  const rate = field(form, "rateLimit").trim();
  return {
    name: field(form, "name"),
    description: field(form, "description"),
    scopes: form
      .getAll("scope")
      .filter((v): v is string => typeof v === "string"),
    rateLimit: /^\d{1,6}$/.test(rate) ? Number(rate) : Number.NaN,
  };
}

/**
 * A key's form: its label, "all of the app's scopes" or a chosen few, and an
 * optional expiry day (the key stops at the end of that UTC day).
 */
export function keyInputFromForm(form: FormData): KeyInput {
  const day = field(form, "expires").trim();
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? new Date(`${day}T23:59:59.999Z`)
    : null;
  return {
    name: field(form, "name"),
    scopes:
      field(form, "scopeMode") === "some"
        ? form.getAll("scope").filter((v): v is string => typeof v === "string")
        : null,
    expiresAt:
      expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  };
}

const NEW_KEY_COOKIE = "trilleo_new_key";
/** Long enough to follow the redirect; the page reads it once. */
export const NEW_KEY_MAX_AGE_S = 2 * 60;

/** A key just made, on its way from the form's POST to the page that shows it once. */
interface NewKey {
  appId: number;
  name: string;
  secret: string;
}

function newKeyCookie(url: URL) {
  const https = url.protocol === "https:";
  return {
    name: https ? `__Host-${NEW_KEY_COOKIE}` : NEW_KEY_COOKIE,
    options: {
      path: "/",
      httpOnly: true,
      secure: https,
      sameSite: "strict" as const,
    },
  };
}

/**
 * Carries a new key across the redirect after the form (so reloading the page can't
 * make another one). Only in the admin's browser, for a couple of minutes at most.
 */
export function setNewKeyCookie(
  cookies: AstroCookies,
  url: URL,
  key: NewKey,
): void {
  const { name, options } = newKeyCookie(url);
  cookies.set(name, JSON.stringify(key), {
    ...options,
    maxAge: NEW_KEY_MAX_AGE_S,
  });
}

/** The new key for this app, if one is waiting, and forgets it either way. */
export function takeNewKeyCookie(
  cookies: AstroCookies,
  url: URL,
  appId: number,
): { name: string; secret: string } | null {
  const { name, options } = newKeyCookie(url);
  const raw = cookies.get(name)?.value;
  if (raw === undefined) return null;
  cookies.delete(name, options);
  try {
    const value = JSON.parse(raw) as Partial<NewKey>;
    return value.appId === appId &&
      typeof value.name === "string" &&
      typeof value.secret === "string"
      ? { name: value.name, secret: value.secret }
      : null;
  } catch {
    return null;
  }
}
