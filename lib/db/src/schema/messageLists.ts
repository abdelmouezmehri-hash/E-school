import { table, text, integer, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const messageListsTable = table("message_lists", {
  id: id(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageListMembersTable = table("message_list_members", {
  id: id(),
  listId: integer("list_id")
    .notNull()
    .references(() => messageListsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageListSchema = createInsertSchema(messageListsTable).omit({
  id: true,
  createdAt: true,
});
export type MessageList = typeof messageListsTable.$inferSelect;
export type InsertMessageList = z.infer<typeof insertMessageListSchema>;

export const insertMessageListMemberSchema = createInsertSchema(messageListMembersTable).omit({
  id: true,
  createdAt: true,
});
export type MessageListMember = typeof messageListMembersTable.$inferSelect;
export type InsertMessageListMember = z.infer<typeof insertMessageListMemberSchema>;
