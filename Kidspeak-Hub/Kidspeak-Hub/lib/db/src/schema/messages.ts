import { table, text, integer, id, timestamp, boolean } from "./helpers";
import { usersTable } from "./users";
import { studentsTable } from "./students";

export const recipientTypes = ["individual", "group", "level", "role", "all_parents", "global"] as const;
export type RecipientType = typeof recipientTypes[number];

export const messagesTable = table("messages", {
  id: id(),
  fromUserId: integer("from_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  toUserId: integer("to_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  recipientType: text("recipient_type").notNull().default("individual"),
  recipientLabel: text("recipient_label"),
  recipientCount: integer("recipient_count"),
  batchId: text("batch_id"),
  replyToId: integer("reply_to_id"),
  linkedStudentId: integer("linked_student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
