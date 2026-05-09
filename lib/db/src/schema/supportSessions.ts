import { table, text, integer, real, id, timestamp } from "./helpers";
import { usersTable } from "./users";
import { groupsTable } from "./groups";

export const supportSessionsTable = table("support_sessions", {
  id: id(),
  psychologistId: integer("psychologist_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  sessionDate: text("session_date").notNull(),
  sessionTime: text("session_time"),
  topic: text("topic").notNull(),
  teacherNote: text("teacher_note"),
  status: text("status").notNull().default("scheduled"),
  rateAmount: real("rate_amount"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SupportSession = typeof supportSessionsTable.$inferSelect;
