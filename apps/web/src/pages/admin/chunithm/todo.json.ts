import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { chartTodo } from "../../../lib/chunithm/imports";
import { getDb } from "../../../lib/db";

export const prerender = false;

/**
 * The admin's to-do list for building charts on their own computer
 * (scripts/chunithm-bundle.ts): in-game Master charts without a picture. Read-only.
 */
export const GET: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const now = new Date();
  const todo = await chartTodo(await getDb(), now);
  return new Response(JSON.stringify(todo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="chunithm-todo-${now.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
