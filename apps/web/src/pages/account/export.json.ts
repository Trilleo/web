import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { getDb } from "../../lib/db";
import { exportUserData } from "../../lib/profile/store";

export const prerender = false;

/** Downloads everything kept about the signed-in person, as JSON. Read-only. */
export const GET: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;

  const data = await exportUserData(await getDb(), user.id);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trilleo-${user.githubLogin}-${day}.json"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
