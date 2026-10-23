/** /openapi.json: an OpenAPI 3.1 description of every route, from the routes themselves. */
import { ERROR_CODES } from "../errors";
import { API_GROUPS, usedGroups, type Route } from "../registry";
import type { JsonSchema, ObjectSchema, Shape } from "../schema";
import { API_SCOPES } from "../scopes";
import { API_VERSION } from "../routes/system";
import type { DocContext } from "./context";
import { API_NAME } from "./pages";
import { routeErrors } from "./reference";

function parameters(
  schema: ObjectSchema<Shape> | undefined,
  where: "path" | "query",
): JsonSchema[] {
  if (!schema) return [];
  return Object.entries(schema.shape).map(([name, field]) => {
    const json = field.json();
    const { description, ...rest } = json;
    return {
      name,
      in: where,
      required: where === "path" || !field.optional,
      ...(typeof description === "string" ? { description } : {}),
      schema: rest,
    };
  });
}

function operation(route: Route): JsonSchema {
  const errors = routeErrors(route);
  const statuses = [...new Set(errors.map((code) => ERROR_CODES[code].status))];
  return {
    operationId: route.operationId,
    summary: route.summary,
    ...(route.description ? { description: route.description } : {}),
    tags: [API_GROUPS[route.group].title],
    security:
      route.auth === "public"
        ? [{}, { apiKey: [] }]
        : [{ apiKey: route.scope ? [route.scope] : [] }],
    ...(route.scope ? { "x-scope": route.scope } : {}),
    parameters: [
      ...parameters(route.params, "path"),
      ...parameters(route.query, "query"),
    ],
    ...(route.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: route.body.json(),
                ...(route.example.body ? { example: route.example.body } : {}),
              },
            },
          },
        }
      : {}),
    responses: {
      [String(route.status)]: {
        description: "Success.",
        content: {
          "application/json": {
            schema: route.response.json(),
            example: route.example.response,
          },
        },
      },
      ...Object.fromEntries(
        statuses.map((status) => [
          String(status),
          {
            description: errors
              .filter((code) => ERROR_CODES[code].status === status)
              .map((code) => `\`${code}\``)
              .join(", "),
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        ]),
      ),
    },
  };
}

export function openApiDocument(
  context: DocContext,
  routes: readonly Route[],
): JsonSchema {
  const paths: Record<string, Record<string, JsonSchema>> = {};
  for (const route of routes) {
    const entry = (paths[route.path] ??= {});
    entry[route.method.toLowerCase()] = operation(route);
  }
  const groups = usedGroups(routes);
  return {
    openapi: "3.1.0",
    info: {
      title: API_NAME,
      version: API_VERSION,
      description: `The documentation, in Markdown: ${context.api}/docs.md`,
    },
    servers: [{ url: context.api }],
    tags: groups.map((group) => ({
      name: API_GROUPS[group].title,
      description: API_GROUPS[group].intro,
    })),
    paths,
    components: {
      securitySchemes: {
        apiKey: {
          type: "http",
          scheme: "bearer",
          description: `An API key, as \`Authorization: Bearer <key>\`. Scopes: ${Object.keys(API_SCOPES).join(", ")}.`,
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "requestId"],
              properties: {
                code: { type: "string", enum: Object.keys(ERROR_CODES) },
                message: { type: "string" },
                details: { type: "object" },
                requestId: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}
