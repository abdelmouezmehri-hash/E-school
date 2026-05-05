import { table, text, integer, id, timestamp, jsonText, index } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { levelsTable } from "./levels";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const studentsTable = table("students", {
  id: id(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"),
  levelId: integer("level_id").references(() => levelsTable.id),
  parentId: integer("parent_id").references(() => usersTable.id),
  teacherId: integer("teacher_id").references(() => usersTable.id),
  enrollmentDate: text("enrollment_date").notNull(),
  behavioralFlags: jsonText("behavioral_flags").$type<string[]>().notNull().$defaultFn(() => []),
  notes: text("notes"),
  profilePicture: text("profile_picture"),
  // Guardian info
  guardianRelationship: text("guardian_relationship"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianPhone2: text("guardian_phone2"),
  guardianOccupation: text("guardian_occupation"),
  // Medical & background
  medicalAlerts: text("medical_alerts"),
  referralSource: text("referral_source"),
  medicalIssues: text("medical_issues"),
  learningDisabilities: text("learning_disabilities"),
  supportInstructions: text("support_instructions"),
  preferredTeachingMethod: text("preferred_teaching_method"),
  privateTip: text("private_tip"),
  privateTipUpdatedBy: integer("private_tip_updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  status: text("status", { enum: ["active", "stopped", "graduated"] }).notNull().default("active"),
  lastUpdatedBy: text("last_updated_by"),
  lastUpdatedAt: timestamp("last_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (studentsTable) => [
]);

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
