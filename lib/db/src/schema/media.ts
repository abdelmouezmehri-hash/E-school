import { table, text, integer, id, timestamp } from "./helpers";
import { studentsTable } from "./students";
import { groupsTable } from "./groups";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const mediaTable = table("media", {
  id: id(),
  type: text("type", { enum: ["photo", "video"] }).notNull(),
  category: text("category", {
    enum: ["group", "private", "talkshow", "teacher_broadcast", "global"],
  }).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  description: text("description"),
  studentId: integer("student_id").references(() => studentsTable.id, {
    onDelete: "cascade",
  }),
  groupId: integer("group_id").references(() => groupsTable.id, {
    onDelete: "cascade",
  }),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
