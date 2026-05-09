import { table, text, integer, boolean, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";
import { studentsTable } from "./students";

export const messages = table("messages", {
  id: id(),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  linkedStudentId: integer("linked_student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  replyToId: integer("reply_to_id"),
  recipientType: text("recipient_type").default("individual"),
  recipientLabel: text("recipient_label"),
  recipientCount: integer("recipient_count"),
  batchId: text("batch_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export { messages as messagesTable };
