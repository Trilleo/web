import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { getDb } from "../../lib/db";
import { minecraftExport } from "../../lib/minecraft/service";
import { exportUserData } from "../../lib/profile/store";
import { storageExport } from "../../lib/storage/account";

export const prerender = false;

/** Downloads everything kept about the signed-in person, as JSON. Read-only. */
export const GET: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;

  const db = await getDb();
  const profile = await exportUserData(db, user.id);
  // Stored files (their details; the files themselves download from their pages).
  const data = profile && {
    ...profile,
    storage: await storageExport(db, user.id),
    minecraft: await minecraftExport({ db }, user.id),
  };
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
