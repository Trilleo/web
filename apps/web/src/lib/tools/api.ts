import type { Database, User } from "@trilleo/db";
import {
  MAX_KEYS_PER_TOOL,
  MAX_VALUE_BYTES,
  type ToolMeta,
} from "@trilleo/tool-kit";
import { TOOLS, findTool } from "./registry";
import {
  deleteToolData,
  listToolData,
  putToolData,
  type PutError,
} from "./store";

/**
 * The tools' data API, for signed-in people:
 *   GET    /api/tools/<tool>/data        → { items: [{ key, value, updatedAt }] }
 *   PUT    /api/tools/<tool>/data/<key>  { value } → the saved item
 *   DELETE /api/tools/<tool>/data/<key>  → 204
 * Errors are { error: "<message for people>" }. Never cached.
 */
export interface ToolDataRequest {
  request: Request;
  url: URL;
  user: User | null;
  tool: string | undefined;
  /** Undefined for the list (…/data), set for one item (…/data/<key>). */
  key: string | undefined;
  getDb: () => Promise<Database>;
  tools?: readonly ToolMeta[];
}

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: HEADERS });
}

function problem(
  status: number,
  error: string,
  extra: Record<string, string> = {},
): Response {
  return Response.json(
    { error },
    { status, headers: { ...HEADERS, ...extra } },
  );
}

function putProblem(error: PutError, tool: ToolMeta): Response {
  switch (error) {
    case "invalid-key":
      return problem(400, "That item’s key isn’t valid.");
    case "invalid-value":
      return problem(422, `${tool.name} can’t save that.`);
    case "too-large":
      return problem(
        413,
        `That’s too big to save (the limit is ${String(MAX_VALUE_BYTES / 1024)} KB).`,
      );
    case "too-many":
      return problem(
        422,
        `You can keep up to ${String(MAX_KEYS_PER_TOOL)} items in ${tool.name}.`,
      );
  }
}

export async function handleToolData(
  input: ToolDataRequest,
): Promise<Response> {
  const { request, url, user, key } = input;
  const tool = findTool(input.tool, input.tools ?? TOOLS);
  if (!tool || tool.status === "planned" || !tool.isValidValue) {
    return problem(404, "There’s no such tool.");
  }
  if (!user) return problem(401, "Sign in to save to your account.");

  const method = request.method;
  if (key === undefined) {
    if (method !== "GET") return problem(405, "Not allowed.", { Allow: "GET" });
    return json({
      items: await listToolData(await input.getDb(), user.id, tool.slug),
    });
  }

  if (method !== "PUT" && method !== "DELETE") {
    return problem(405, "Not allowed.", { Allow: "PUT, DELETE" });
  }
  // Only this site's own pages may change data.
  if (request.headers.get("origin") !== url.origin) {
    return problem(403, "Changes can only come from this site.");
  }

  if (method === "DELETE") {
    await deleteToolData(await input.getDb(), user.id, tool.slug, key);
    return new Response(null, { status: 204, headers: HEADERS });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return problem(415, "Send JSON.");
  }
  const text = await request.text();
  // The envelope ({"value": …}) adds a little; anything far over is refused unread.
  if (text.length > MAX_VALUE_BYTES + 1024) {
    return putProblem("too-large", tool);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem(400, "That isn’t valid JSON.");
  }
  if (typeof body !== "object" || body === null || !("value" in body)) {
    return problem(400, 'Send { "value": … }.');
  }

  const result = await putToolData(await input.getDb(), {
    userId: user.id,
    tool,
    key,
    value: body.value,
  });
  return result.ok ? json(result.item) : putProblem(result.error, tool);
}
