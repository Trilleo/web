import type { APIRoute } from "astro";
import { eventsOf } from "../../lib/auth/activity";
import { requireUser } from "../../lib/auth/guard";
import { listPasskeys } from "../../lib/auth/passkeys";
import { getDb } from "../../lib/db";
import { notificationsOf } from "../../lib/mail/addresses";
import { mailOf } from "../../lib/mail/outbox";
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
    // Passkeys by name (their keys are only useful to check signatures), and the log.
    security: {
      passkeys: (await listPasskeys(db, user.id)).map((key) => ({
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        synced: key.backedUp,
      })),
      activity: await eventsOf(db, user.id),
    },
    // The address, its switches, and what was sent (bodies while they’re kept).
    email: {
      address: user.email,
      verifiedAt: user.emailVerifiedAt,
      notifications: notificationsOf(user),
      sent: await mailOf(db, user.id),
    },
  };
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="trilleo-${user.username}-${day}.json"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
