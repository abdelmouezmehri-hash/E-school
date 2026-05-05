import { table, text, integer, id, timestamp } from "./helpers";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const performanceReportsTable = table("performance_reports", {
  id: id(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }).notNull(),
  period: text("period").notNull(),
  reportDate: text("report_date").notNull(),
  status: text("status").default("draft"),

  teacherId: integer("teacher_id").references(() => usersTable.id),
  teacherVocabNotes: text("teacher_vocab_notes"),
  teacherStructureNotes: text("teacher_structure_notes"),
  teacherFluencyNotes: text("teacher_fluency_notes"),
  teacherSummary: text("teacher_summary"),
  teacherVocabScore: integer("teacher_vocab_score"),
  teacherStructureScore: integer("teacher_structure_score"),
  teacherFluencyScore: integer("teacher_fluency_score"),

  psychologistId: integer("psychologist_id").references(() => usersTable.id),
  fearReductionScore: integer("fear_reduction_score"),
  socialInitiativeScore: integer("social_initiative_score"),
  selfConfidenceScore: integer("self_confidence_score"),
  psychologistNotes: text("psychologist_notes"),
  psychologistSummary: text("psychologist_summary"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PerformanceReport = typeof performanceReportsTable.$inferSelect;
export type NewPerformanceReport = typeof performanceReportsTable.$inferInsert;
