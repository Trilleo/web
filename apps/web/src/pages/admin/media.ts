import type { APIRoute } from "astro";
import { requireAdmin } from "../../lib/auth/guard";
import {
  MEDIA_MAX_BYTES,
  UPLOAD_ERROR_MESSAGES,
  saveMedia,
} from "../../lib/blog/media";
import { getDb } from "../../lib/db";

export const prerender = false;

const HEADERS = { "Cache-Control": "private, no-store" };

/** POST (multipart, `file`): an image for a post. Answers {"url"} or {"error"}. */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;

  // Refuse anything far too big before reading it.
  const length = Number(context.request.headers.get("content-length") ?? "0");
  if (length > MEDIA_MAX_BYTES + 64 * 1024) {
    return Response.json(
      { error: UPLOAD_ERROR_MESSAGES["too-large"] },
      { status: 413, headers: HEADERS },
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await context.request.formData()).get("file");
  } catch {
    file = null;
  }
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Choose an image to upload." },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await saveMedia(await getDb(), {
    bytes: new Uint8Array(await file.arrayBuffer()),
    name: file.name,
    uploadedBy: admin.id,
  });
  if (!result.ok) {
    return Response.json(
      { error: UPLOAD_ERROR_MESSAGES[result.error] },
      { status: result.error === "too-large" ? 413 : 400, headers: HEADERS },
    );
  }
  return Response.json(
    { url: result.url, name: result.name },
    { status: 201, headers: HEADERS },
  );
};
