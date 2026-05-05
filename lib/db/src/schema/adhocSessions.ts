import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";
import { studentsTable } from "./students";

export const adhocSessionsTable = table("adhoc_sessions", {
  id: id(),
  psychologistId: integer("psychologist_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  sessionDate: text("session_date").notNull(),
  durationMinutes: integer("duration_minutes"),
  title: text("title"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdhocSession = typeof adhocSessionsTable.$inferSelect;
