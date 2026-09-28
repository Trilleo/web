/**
 * The database schema. After changing it, run `pnpm --filter @trilleo/db db:generate`
 * and commit the new migration. Migrations must stay backward-compatible with the
 * previous release (add, don't rename or drop in one step) so a rollback still works.
 */
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Someone who has signed in with GitHub. Only their public profile is kept. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // GitHub's numeric user ID never changes; the login (username) can.
  githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  createdAt: createdAt(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A signed-in browser. `id` is the SHA-256 of the cookie's token, never the token. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
