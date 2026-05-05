import { table, text, integer, id, timestamp, primaryKey } from "./helpers";
import { usersTable } from "./users";
import { levelsTable } from "./levels";
import { studentsTable } from "./students";
import { branchesTable } from "./branches";

export const groupsTable = table("groups", {
  id: id(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  teacherId: integer("teacher_id").references(() => usersTable.id),
  levelId: integer("level_id").references(() => levelsTable.id),
  psychologicalLevelId: integer("psychological_level_id").references(() => levelsTable.id),
  psychologistId: integer("psychologist_id").references(() => usersTable.id),
  schedule: text("schedule"),
  maxStudents: integer("max_students").default(10),
  nextSessionGoal: text("next_session_goal"),
  startDate: text("start_date"),
  recurringDays: text("recurring_days"),
  sessionStartTime: text("session_start_time"),
  sessionDurationMins: integer("session_duration_mins"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupStudentsTable = table("group_students", {
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.groupId, t.studentId] })]);

export type Group = typeof groupsTable.$inferSelect;
export type GroupStudent = typeof groupStudentsTable.$inferSelect;
