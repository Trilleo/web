import type { APIRoute } from "astro";
import { isAdmin, requireUser } from "../../lib/auth/guard";
import { requireHuman, requireHumanJson } from "../../lib/captcha/gate";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { field } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import {
  AVATAR_ERROR_MESSAGES,
  avatarMaxBytes,
  avatarUrl,
  removeAvatar,
  saveAvatar,
  type AvatarError,
} from "../../lib/profile/avatar";

export const prerender = false;

const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * POST /account/avatar (multipart): `avatar`, a picture, or `intent=remove`. The
 * admin may send a bigger one (AVATAR_ADMIN_MAX_BYTES). The
 * profile page's script asks for JSON ({"url"} or {"error"}); the plain form comes
 * back to /account/profile/ with ?avatar=saved|removed or ?avatar-error=<code>.
 * A new picture goes through the human check (a 428 for JSON, /check/ for the form).
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  // The admin isn't held to the size limits (lib/profile/avatar.ts).
  const admin = isAdmin(user);
  const json = (context.request.headers.get("accept") ?? "").includes(
    "application/json",
  );
  const refuse = (error: AvatarError, status: number) =>
    json
      ? Response.json(
          { error: AVATAR_ERROR_MESSAGES[error] },
          { status, headers: HEADERS },
        )
      : noStoreRedirect(`/account/profile/?avatar-error=${error}#avatar`, 303);

  // Refuse anything far too big before reading it.
  const length = Number(context.request.headers.get("content-length") ?? "0");
  if (length > avatarMaxBytes(admin) + 64 * 1024)
    return refuse("too-large", 413);

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return refuse("empty", 400);
  }
  const db = await getDb();
  if (field(form, "intent") === "remove") {
    await removeAvatar(db, user.id);
    return json
      ? Response.json({ url: null }, { headers: HEADERS })
      : noStoreRedirect("/account/profile/?avatar=removed#avatar", 303);
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) return refuse("empty", 400);
  const check = json
    ? await requireHumanJson(context, "avatar")
    : await requireHuman(context, "avatar");
  if (check) return check;
  const result = await saveAvatar(
    db,
    user.id,
    new Uint8Array(await file.arrayBuffer()),
    { admin },
  );
  if (!result.ok)
    return refuse(result.error, result.error === "too-large" ? 413 : 422);
  return json
    ? Response.json(
        { url: avatarUrl(result.hash) },
        { status: 201, headers: HEADERS },
      )
    : noStoreRedirect("/account/profile/?avatar=saved#avatar", 303);
};
