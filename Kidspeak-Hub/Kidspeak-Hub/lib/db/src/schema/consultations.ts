import { table, text, integer, real, id, timestamp } from "./helpers";
import { usersTable } from "./users";
import { studentsTable } from "./students";

export const consultationsTable = table("consultations", {
  id: id(),
  parentId: integer("parent_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "set null" }),
  type: text("type", { enum: ["free", "paid"] }).notNull().default("free"),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "completed"],
  }).notNull().default("pending"),
  parentNotes: text("parent_notes"),
  price: real("price"),
  adminDescription: text("admin_description"),
  psychologistSummary: text("psychologist_summary"),
  scheduledDate: text("scheduled_date"),
  initiatedBy: text("initiated_by", { enum: ["parent", "psychologist"] }).notNull().default("parent"),
  psychologistId: integer("psychologist_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
});

export type Consultation = typeof consultationsTable.$inferSelect;
