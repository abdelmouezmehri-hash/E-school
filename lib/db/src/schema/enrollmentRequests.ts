import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const enrollmentRequestsTable = table("enrollment_requests", {
  id: id(),
  parentId: integer("parent_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  studentName: text("student_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EnrollmentRequest = typeof enrollmentRequestsTable.$inferSelect;
