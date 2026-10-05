/**
 * The storage API (shapes in @trilleo/storage's api-types.ts), served by
 * src/pages/api/storage/[...path].ts:
 *
 *   POST   uploads                 start an upload
 *   POST   uploads/<id>/parts      signed URLs for some parts
 *   POST   uploads/<id>/complete   finish it
 *   POST   uploads/<id>/thumbnail  its thumbnail (an image/webp body)
 *   DELETE uploads/<id>            cancel it
 *   GET    files/<id>              how a file is doing (owner or admin)
 *
 * Signed in only; changes only from this site's pages. Never cached.
 */
import {
  FILE_ID_PATTERN,
  FILE_VISIBILITIES,
  THUMBNAIL_MAX_BYTES,
  type FileVisibility,
  type PartUrls,
  type UploadRequest,
  type UploadStarted,
} from "@trilleo/storage";
import { StorageError } from "@trilleo/storage/server";
import {
  PART_URL_SECONDS,
  cancelUpload,
  canManage,
  completeUpload,
  partUrls,
  startUpload,
  storeThumbnail,
  toSummary,
  type Requester,
  type Result,
  type StorageDeps,
} from "./service";
import { getFile } from "./store";

export interface StorageApiRequest {
  request: Request;
  url: URL;
  requester: Requester | null;
  /** What follows /api/storage/, e.g. "uploads/abc123def456/parts". */
  path: string;
  deps: () => Promise<StorageDeps | null>;
}

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: HEADERS });
}

function problem(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: HEADERS });
}

function fromResult<T>(
  result: Result<T>,
  respond: (value: T) => Response,
): Response {
  return result.ok
    ? respond(result.value)
    : problem(result.status, result.error);
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return undefined;
  const text = await request.text();
  if (text.length > 10_000) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseUploadRequest(body: unknown): UploadRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { purpose, name, size, visibility } = body as Record<string, unknown>;
  if (typeof purpose !== "string" || typeof name !== "string") return null;
  if (typeof size !== "number") return null;
  if (
    visibility !== undefined &&
    !FILE_VISIBILITIES.includes(visibility as FileVisibility)
  )
    return null;
  return {
    purpose,
    name,
    size,
    ...(visibility ? { visibility: visibility as FileVisibility } : {}),
  };
}

export async function handleStorageApi(
  input: StorageApiRequest,
): Promise<Response> {
  try {
    return await route(input);
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("Storage error:", error);
      return problem(
        502,
        "File storage isn’t answering right now. Try again soon.",
      );
    }
    throw error;
  }
}

async function route(input: StorageApiRequest): Promise<Response> {
  const { request, url, requester } = input;
  const segments = input.path.split("/").filter(Boolean);
  const method = request.method;
  const [resource, id, sub] = segments;

  if (!requester) return problem(401, "Sign in to upload files.");
  if (method !== "GET" && request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  if (id !== undefined && !FILE_ID_PATTERN.test(id))
    return problem(404, "There’s no such file.");

  const deps = await input.deps();
  if (!deps) return problem(503, "File storage isn’t set up yet.");

  if (resource === "files" && id && !sub) {
    if (method !== "GET") return problem(405, "Not allowed.");
    const row = await getFile(deps.db, id);
    if (!row || !canManage(row, requester))
      return problem(404, "There’s no such file.");
    return json({ file: toSummary(row, deps.storage) });
  }

  if (resource !== "uploads" || segments.length > 3)
    return problem(404, "Not found.");

  if (!id) {
    if (method !== "POST") return problem(405, "Not allowed.");
    const body = parseUploadRequest(await readJson(request));
    if (!body) return problem(400, "Send { purpose, name, size }.");
    return fromResult(await startUpload(deps, requester, body), (value) => {
      const started: UploadStarted = {
        file: toSummary(value.file, deps.storage),
        partSize: value.plan.partSize,
        partCount: value.plan.partCount,
      };
      return json(started, 201);
    });
  }

  if (!sub) {
    if (method !== "DELETE") return problem(405, "Not allowed.");
    return fromResult(
      await cancelUpload(deps, requester, id),
      () => new Response(null, { status: 204, headers: HEADERS }),
    );
  }

  if (method !== "POST") return problem(405, "Not allowed.");
  if (sub === "parts") {
    const body = await readJson(request);
    const parts =
      typeof body === "object" && body !== null && "parts" in body
        ? body.parts
        : undefined;
    return fromResult(await partUrls(deps, requester, id, parts), (urls) => {
      const answer: PartUrls = { urls, expiresIn: PART_URL_SECONDS };
      return json(answer);
    });
  }
  if (sub === "thumbnail") {
    if (!request.headers.get("content-type")?.startsWith("image/webp"))
      return problem(415, "Send a WebP image.");
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > THUMBNAIL_MAX_BYTES)
      return problem(413, "That thumbnail is too big.");
    const bytes = new Uint8Array(await request.arrayBuffer());
    return fromResult(await storeThumbnail(deps, requester, id, bytes), (row) =>
      json({ file: toSummary(row, deps.storage) }),
    );
  }
  if (sub === "complete") {
    return fromResult(await completeUpload(deps, requester, id), (row) =>
      json({ file: toSummary(row, deps.storage) }),
    );
  }
  return problem(404, "Not found.");
}
