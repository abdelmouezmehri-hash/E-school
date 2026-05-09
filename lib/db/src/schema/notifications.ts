import { table, text, integer, boolean, id, timestamp } from "./helpers";
import { usersTable } from "./users";

export const notificationType = [
  "payment_due",
  "payment_received",
  "new_registration",
  "message",
  "event",
  "salary",
  "attendance",
  "general",
] as const;

export const notificationsTable = table("notifications", {
  id: id(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("general"),
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
