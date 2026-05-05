import { table, text, integer, real, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const evaluationsTable = table("evaluations", {
  id: id(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  sessionDate: text("session_date").notNull(),
  speakingScore: integer("speaking_score").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  participationScore: integer("participation_score").notNull(),
  progressScore: real("progress_score").notNull().default(0),
  teacherNotes: text("teacher_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ id: true, createdAt: true });
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
