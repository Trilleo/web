/**
 * The reference, written from the routes themselves: one Markdown page per group,
 * each route with its address, auth, inputs, answer, errors and a curl example.
 */
import {
  COMMON_ERRORS,
  ERROR_CODES,
  KEY_ERRORS,
  type ErrorCode,
} from "../errors";
import type { ApiGroup, Route } from "../registry";
import { fieldRows, type Schema } from "../schema";
import type { DocContext } from "./context";

/** A table cell: pipes and line breaks would end it. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function fieldTable(schema: Schema<unknown>, withRequired: boolean): string {
  const rows = fieldRows(schema);
  if (rows.length === 0) return "";
  const head = withRequired
    ? "| Name | Type | Required | Description |\n| --- | --- | --- | --- |"
    : "| Field | Type | Description |\n| --- | --- | --- |";
  const lines = rows.map((row) =>
    withRequired
      ? `| \`${row.name}\` | ${cell(row.type)} | ${row.required ? "Yes" : "No"} | ${cell(row.description)} |`
      : `| \`${row.name}\` | ${cell(row.type)}${row.required ? "" : " (may be absent)"} | ${cell(row.description)} |`,
  );
  return [head, ...lines].join("\n");
}

/** Every error a route can answer with: its own, then the shared ones. */
export function routeErrors(route: Route): ErrorCode[] {
  const all: ErrorCode[] = [
    ...route.errors,
    ...(route.body
      ? (["invalid_json", "unsupported_media_type", "body_too_large"] as const)
      : []),
    ...(route.auth === "key" || route.scope ? KEY_ERRORS : []),
    ...(route.scope ? (["insufficient_scope"] as const) : []),
    ...COMMON_ERRORS,
  ];
  return [...new Set(all)];
}

/** The address with the example's path parameters and query filled in. */
export function exampleUrl(route: Route, origin: string): string {
  let path = route.path;
  for (const [name, value] of Object.entries(route.example.params ?? {}))
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
  const query = new URLSearchParams(
    Object.entries(route.example.query ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  ).toString();
  return `${origin}${path}${query ? `?${query}` : ""}`;
}

function curl(route: Route, origin: string): string {
  const lines = [
    `curl -s${route.method === "GET" ? "" : ` -X ${route.method}`} "${exampleUrl(route, origin)}"`,
  ];
  if (route.auth === "key")
    lines.push(`  -H "Authorization: Bearer $TRILLEO_API_KEY"`);
  if (route.example.body) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${JSON.stringify(route.example.body)}'`);
  }
  return lines.join(" \\\n");
}

export function routeMarkdown(route: Route, context: DocContext): string {
  const auth =
    route.auth === "public"
      ? "None (a key, if sent, is checked and gets its own rate limit)"
      : route.scope
        ? `API key with the \`${route.scope}\` scope`
        : "API key (any scope)";
  const parts = [
    `## ${route.summary}`,
    `\`${route.method} ${route.path}\``,
    `- **Auth:** ${auth}\n- **Operation ID:** \`${route.operationId}\``,
  ];
  if (route.description) parts.push(route.description);
  if (route.params)
    parts.push(`### Path parameters\n\n${fieldTable(route.params, true)}`);
  if (route.query)
    parts.push(`### Query parameters\n\n${fieldTable(route.query, true)}`);
  if (route.body)
    parts.push(
      `### Body\n\nJSON, with \`Content-Type: application/json\`.\n\n${fieldTable(route.body, true)}`,
      "```json\n" + JSON.stringify(route.example.body, null, 2) + "\n```",
    );
  const fields = fieldTable(route.response, false);
  parts.push(
    `### Answer\n\n\`${String(route.status)}\` with:${fields ? `\n\n${fields}` : ""}`,
    "```json\n" + JSON.stringify(route.example.response, null, 2) + "\n```",
  );
  parts.push(
    `### Errors\n\n${routeErrors(route)
      .map((code) => `- \`${code}\` (${String(ERROR_CODES[code].status)})`)
      .join(
        "\n",
      )}\n\nSee [Errors](${context.api}/docs/errors/) for what each means.`,
  );
  parts.push("### Example\n\n```bash\n" + curl(route, context.api) + "\n```");
  return parts.join("\n\n");
}

export function groupMarkdown(
  group: ApiGroup,
  routes: readonly Route[],
  context: DocContext,
): string {
  // A string, so the comparison stays a real one while there's only one group.
  const wanted: string = group;
  const own = routes.filter((route) => route.group === wanted);
  const list = own
    .map((route) => `- \`${route.method} ${route.path}\`: ${route.summary}`)
    .join("\n");
  return [list, ...own.map((route) => routeMarkdown(route, context))].join(
    "\n\n",
  );
}
