import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";

export const sessionsTable = table("sessions", {
  id: id(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Session = typeof sessionsTable.$inferSelect;
