/**
 * The API's input and output shapes, written once: each schema checks a value (path
 * parameters, the query string, a JSON body) and describes itself as JSON Schema for
 * the docs and /openapi.json. Hand-written and small on purpose (no zod): only what
 * the routes need.
 *
 *   const query = t.object({ days: t.optional(t.integer({ min: 1, max: 90 })) });
 *   type Query = Infer<typeof query>; // { days?: number }
 */

/** A JSON Schema (the OpenAPI 3.1 dialect), as far as the docs need one. */
export type JsonSchema = Record<string, unknown>;

/** Something wrong with the input: where (`days`, `player.id`) and what. */
export interface Problem {
  path: string;
  message: string;
}

export interface ParseContext {
  problems: Problem[];
  /** Values come from a URL (path or query): numbers and booleans arrive as text. */
  text: boolean;
}

export interface Schema<T> {
  readonly kind: string;
  /** What it is, for the docs. */
  readonly description: string | undefined;
  /** May be left out of an object. */
  readonly optional: boolean;
  /** The value, or undefined after adding a problem. */
  parse(value: unknown, path: string, context: ParseContext): T | undefined;
  json(): JsonSchema;
  /** A short type name for the docs' tables: "string", "integer", "array of string". */
  typeName(): string;
}

export type Infer<S> = S extends Schema<infer T> ? T : never;

interface Common {
  description?: string;
}

function at(path: string): string {
  return path === "" ? "the body" : `\`${path}\``;
}

function base<T>(
  kind: string,
  common: Common,
  parts: Pick<Schema<T>, "parse" | "json" | "typeName">,
): Schema<T> {
  const { description } = common;
  return {
    kind,
    description,
    optional: false,
    parse: parts.parse,
    typeName: parts.typeName,
    json: () => ({
      ...parts.json(),
      ...(description ? { description } : {}),
    }),
  };
}

export interface StringOptions extends Common {
  min?: number;
  max?: number;
  pattern?: RegExp;
  /** What the pattern means, for the error message ("a date like 2026-10-23"). */
  patternHint?: string;
  format?: "date" | "date-time" | "uri";
  example?: string;
}

function string(options: StringOptions = {}): Schema<string> {
  const { min, max, pattern, patternHint, format } = options;
  return base("string", options, {
    parse(value, path, { problems }) {
      if (typeof value !== "string") {
        problems.push({ path, message: `${at(path)} must be a string.` });
        return undefined;
      }
      // Characters as code points (so an emoji counts once, mostly).
      const length = Array.from(value).length;
      if (min !== undefined && length < min) {
        problems.push({
          path,
          message:
            min === 1
              ? `${at(path)} can't be empty.`
              : `${at(path)} must be at least ${String(min)} characters.`,
        });
        return undefined;
      }
      if (max !== undefined && length > max) {
        problems.push({
          path,
          message: `${at(path)} must be at most ${String(max)} characters.`,
        });
        return undefined;
      }
      if (pattern && !pattern.test(value)) {
        problems.push({
          path,
          message: `${at(path)} must be ${patternHint ?? `like ${pattern.source}`}.`,
        });
        return undefined;
      }
      return value;
    },
    json: () => ({
      type: "string",
      ...(min !== undefined ? { minLength: min } : {}),
      ...(max !== undefined ? { maxLength: max } : {}),
      ...(pattern ? { pattern: pattern.source } : {}),
      ...(format ? { format } : {}),
      ...(options.example ? { examples: [options.example] } : {}),
    }),
    typeName: () => (format ? `string (${format})` : "string"),
  });
}

export interface NumberOptions extends Common {
  min?: number;
  max?: number;
}

function numeric(integer: boolean, options: NumberOptions): Schema<number> {
  const { min, max } = options;
  const name = integer ? "integer" : "number";
  return base(name, options, {
    parse(value, path, { problems, text }) {
      let number = value;
      if (text && typeof value === "string" && value.trim() !== "")
        number = Number(value);
      if (
        typeof number !== "number" ||
        !Number.isFinite(number) ||
        (integer && !Number.isInteger(number))
      ) {
        problems.push({
          path,
          message: `${at(path)} must be ${integer ? "a whole number" : "a number"}.`,
        });
        return undefined;
      }
      if (
        (min !== undefined && number < min) ||
        (max !== undefined && number > max)
      ) {
        const range =
          min !== undefined && max !== undefined
            ? `between ${String(min)} and ${String(max)}`
            : min !== undefined
              ? `at least ${String(min)}`
              : `at most ${String(max)}`;
        problems.push({ path, message: `${at(path)} must be ${range}.` });
        return undefined;
      }
      return number;
    },
    json: () => ({
      type: name,
      ...(min !== undefined ? { minimum: min } : {}),
      ...(max !== undefined ? { maximum: max } : {}),
    }),
    typeName: () => name,
  });
}

function boolean(options: Common = {}): Schema<boolean> {
  return base("boolean", options, {
    parse(value, path, { problems, text }) {
      if (typeof value === "boolean") return value;
      if (text && (value === "true" || value === "false"))
        return value === "true";
      problems.push({ path, message: `${at(path)} must be true or false.` });
      return undefined;
    },
    json: () => ({ type: "boolean" }),
    typeName: () => "boolean",
  });
}

function oneOf<const T extends string>(
  values: readonly T[],
  options: Common = {},
): Schema<T> {
  return base("enum", options, {
    parse(value, path, { problems }) {
      if (
        typeof value === "string" &&
        (values as readonly string[]).includes(value)
      )
        return value as T;
      problems.push({
        path,
        message: `${at(path)} must be one of ${values.map((v) => `"${v}"`).join(", ")}.`,
      });
      return undefined;
    },
    json: () => ({ type: "string", enum: [...values] }),
    typeName: () => values.map((v) => `"${v}"`).join(" | "),
  });
}

export interface ArrayOptions extends Common {
  max?: number;
}

function array<T>(
  item: Schema<T>,
  options: ArrayOptions = {},
): Schema<T[]> & { item: Schema<T> } {
  const schema = base<T[]>("array", options, {
    parse(value, path, context) {
      if (!Array.isArray(value)) {
        context.problems.push({ path, message: `${at(path)} must be a list.` });
        return undefined;
      }
      if (options.max !== undefined && value.length > options.max) {
        context.problems.push({
          path,
          message: `${at(path)} can hold at most ${String(options.max)} items.`,
        });
        return undefined;
      }
      const before = context.problems.length;
      const out = value.map((entry, index) =>
        item.parse(entry, `${path}[${String(index)}]`, context),
      );
      return context.problems.length > before ? undefined : (out as T[]);
    },
    json: () => ({
      type: "array",
      items: item.json(),
      ...(options.max !== undefined ? { maxItems: options.max } : {}),
    }),
    typeName: () => `array of ${item.typeName()}`,
  });
  return { ...schema, item };
}

/** An object's fields; optional ones may be left out (and come out as undefined). */
export type Shape = Record<string, Schema<unknown>>;

type OptionalKeys<S extends Shape> = {
  [K in keyof S]: S[K]["optional"] extends true ? K : never;
}[keyof S];

export type InferShape<S extends Shape> = {
  [K in Exclude<keyof S, OptionalKeys<S>>]: Infer<S[K]>;
} & { [K in OptionalKeys<S>]?: Infer<S[K]> };

export interface ObjectSchema<S extends Shape> extends Schema<InferShape<S>> {
  readonly shape: S;
}

function object<S extends Shape>(
  shape: S,
  options: Common = {},
): ObjectSchema<S> {
  const schema = base<InferShape<S>>("object", options, {
    parse(value, path, context) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        context.problems.push({
          path,
          message: `${at(path)} must be an object.`,
        });
        return undefined;
      }
      const record = value as Record<string, unknown>;
      const before = context.problems.length;
      const out: Record<string, unknown> = {};
      // Unknown fields are ignored, so clients may send more than a route reads.
      for (const [key, field] of Object.entries(shape)) {
        const fieldPath = path === "" ? key : `${path}.${key}`;
        const raw = record[key];
        if (raw === undefined || (context.text && raw === "")) {
          if (!field.optional)
            context.problems.push({
              path: fieldPath,
              message: `${at(fieldPath)} is required.`,
            });
          continue;
        }
        out[key] = field.parse(raw, fieldPath, context);
      }
      return context.problems.length > before
        ? undefined
        : (out as InferShape<S>);
    },
    json: () => {
      const required = Object.entries(shape)
        .filter(([, field]) => !field.optional)
        .map(([key]) => key);
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, field]) => [key, field.json()]),
        ),
        ...(required.length > 0 ? { required } : {}),
      };
    },
    typeName: () => "object",
  });
  return { ...schema, shape };
}

/** A field that may be left out. */
function optional<T>(
  schema: Schema<T>,
): Schema<T | undefined> & { optional: true } {
  return { ...schema, optional: true };
}

/** A value that may be null (answers only: "not set"). */
function nullable<T>(schema: Schema<T>): Schema<T | null> {
  return {
    ...schema,
    parse(value, path, context) {
      return value === null ? null : schema.parse(value, path, context);
    },
    json: () => {
      const inner = schema.json();
      const type = inner.type;
      return typeof type === "string"
        ? { ...inner, type: [type, "null"] }
        : { anyOf: [inner, { type: "null" }] };
    },
    typeName: () => `${schema.typeName()} or null`,
  };
}

/** Builders. Each takes an optional `description`, shown in the docs. */
export const t = {
  string,
  integer: (options: NumberOptions = {}) => numeric(true, options),
  number: (options: NumberOptions = {}) => numeric(false, options),
  boolean,
  enum: oneOf,
  array,
  object,
  optional,
  nullable,
  /** An ISO 8601 timestamp in UTC, e.g. "2026-10-23T08:00:00.000Z". */
  dateTime: (description?: string) =>
    string({
      description,
      format: "date-time",
      example: "2026-10-23T08:00:00.000Z",
    }),
  /** A calendar day, e.g. "2026-10-23". */
  date: (description?: string) =>
    string({
      description,
      format: "date",
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternHint: "a date like 2026-10-23",
      example: "2026-10-23",
    }),
};

/** Parses a value against a schema: the value, or every problem found. */
export function check<T>(
  schema: Schema<T>,
  value: unknown,
  text = false,
): { ok: true; value: T } | { ok: false; problems: Problem[] } {
  const context: ParseContext = { problems: [], text };
  const parsed = schema.parse(value, "", context);
  if (context.problems.length > 0 || parsed === undefined)
    return { ok: false, problems: context.problems };
  return { ok: true, value: parsed };
}

/** One row per field, nested fields as dotted paths, for the docs' tables. */
export interface FieldRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export function fieldRows(schema: Schema<unknown>, prefix = ""): FieldRow[] {
  if (!("shape" in schema)) return [];
  const rows: FieldRow[] = [];
  for (const [key, field] of Object.entries(
    (schema as ObjectSchema<Shape>).shape,
  )) {
    const name = prefix ? `${prefix}.${key}` : key;
    rows.push({
      name,
      type: field.typeName(),
      required: !field.optional,
      description: field.description ?? "",
    });
    rows.push(...fieldRows(field, name));
    if ("item" in field)
      rows.push(...fieldRows(field.item as Schema<unknown>, `${name}[]`));
  }
  return rows;
}
