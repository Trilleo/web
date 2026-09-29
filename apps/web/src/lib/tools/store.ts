import { toolData, type Database } from "@trilleo/db";
import {
  KEY_PATTERN,
  MAX_KEYS_PER_TOOL,
  MAX_VALUE_BYTES,
  type StoredItem,
  type ToolMeta,
} from "@trilleo/tool-kit";
import { and, count, desc, eq } from "drizzle-orm";

const scope = (userId: string, tool: string) =>
  and(eq(toolData.userId, userId), eq(toolData.tool, tool));

/** Someone's saved items in one tool, most recently changed first. */
export async function listToolData<T = unknown>(
  db: Database,
  userId: string,
  tool: string,
): Promise<StoredItem<T>[]> {
  const rows = await db
    .select()
    .from(toolData)
    .where(scope(userId, tool))
    .orderBy(desc(toolData.updatedAt));
  return rows.map((row) => ({
    key: row.key,
    // Checked by the tool's isValidValue when it was saved.
    value: row.value as T,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export type PutError =
  "invalid-key" | "too-large" | "invalid-value" | "too-many";

export type PutResult =
  { ok: true; item: StoredItem<unknown> } | { ok: false; error: PutError };

/** The size of a value as the database will hold it (UTF-8 JSON). */
export function valueBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/**
 * Saves one item, if the key, size, tool's own rules, and item count allow it.
 * Tools without isValidValue don't save anything to accounts.
 */
export async function putToolData(
  db: Database,
  input: {
    userId: string;
    tool: ToolMeta;
    key: string;
    value: unknown;
    now?: Date;
  },
): Promise<PutResult> {
  const { userId, tool, key, value } = input;
  if (!KEY_PATTERN.test(key)) return { ok: false, error: "invalid-key" };
  if (value === undefined || !tool.isValidValue?.(value)) {
    return { ok: false, error: "invalid-value" };
  }
  if (valueBytes(value) > MAX_VALUE_BYTES)
    return { ok: false, error: "too-large" };

  const [existing] = await db
    .select({ key: toolData.key })
    .from(toolData)
    .where(and(scope(userId, tool.slug), eq(toolData.key, key)))
    .limit(1);
  if (!existing) {
    const [row] = await db
      .select({ total: count() })
      .from(toolData)
      .where(scope(userId, tool.slug));
    if ((row?.total ?? 0) >= MAX_KEYS_PER_TOOL)
      return { ok: false, error: "too-many" };
  }

  const now = input.now ?? new Date();
  const [saved] = await db
    .insert(toolData)
    .values({ userId, tool: tool.slug, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [toolData.userId, toolData.tool, toolData.key],
      set: { value, updatedAt: now },
    })
    .returning();
  if (!saved) throw new Error("Saving tool data returned nothing");
  return {
    ok: true,
    item: {
      key: saved.key,
      value: saved.value,
      updatedAt: saved.updatedAt.toISOString(),
    },
  };
}

/** Deletes one item; resolves to whether it existed. */
export async function deleteToolData(
  db: Database,
  userId: string,
  tool: string,
  key: string,
): Promise<boolean> {
  const deleted = await db
    .delete(toolData)
    .where(and(scope(userId, tool), eq(toolData.key, key)))
    .returning({ key: toolData.key });
  return deleted.length > 0;
}
