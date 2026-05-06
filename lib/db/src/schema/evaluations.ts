import {
  table,
  text,
  integer,
  real,
  id,
  timestamp,
  index,
  check,
} from "./helpers";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { branchesTable } from "./branches";

export const evaluationsTable = table(
  "evaluations",
  {
    id: id(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id").references(() => branchesTable.id, {
      onDelete: "set null",
    }),
    weekNumber: integer("week_number").notNull(),
    sessionDate: text("session_date").notNull(),
    speakingScore: integer("speaking_score").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    participationScore: integer("participation_score").notNull(),
    progressScore: real("progress_score").notNull().default(0),
    teacherNotes: text("teacher_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("evaluations_student_week_idx").on(t.studentId, t.weekNumber),
    check(
      "evaluations_speaking_score_range",
      sql`${t.speakingScore} between 1 and 10`,
    ),
    check(
      "evaluations_confidence_score_range",
      sql`${t.confidenceScore} between 1 and 10`,
    ),
    check(
      "evaluations_participation_score_range",
      sql`${t.participationScore} between 1 and 10`,
    ),
    check(
      "evaluations_progress_score_range",
      sql`${t.progressScore} between 0 and 100`,
    ),
  ],
);

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit(
  { id: true, createdAt: true },
);
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
