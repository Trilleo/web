import { users, type User } from "@trilleo/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "../auth/guard";
import { getDb } from "../db";
import { getStorage } from "./config";
import type { Requester, StorageDeps } from "./service";

/** The database and storage, or null when the server has no storage set up. */
export async function storageDeps(): Promise<StorageDeps | null> {
  const storage = getStorage();
  if (!storage) return null;
  const db = await getDb();
  return {
    db,
    storage,
    isAdminId: async (userId) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return user !== undefined && isAdmin(user);
    },
  };
}

/** The signed-in person as a storage requester, or null when signed out. */
export function requesterOf(user: User | null): Requester | null {
  return user ? { user, isAdmin: isAdmin(user) } : null;
}
