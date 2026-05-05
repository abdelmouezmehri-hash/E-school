import { table, text, integer, real, id, timestamp } from "./helpers";
import { groupsTable } from "./groups";
import { usersTable } from "./users";
import { studentsTable } from "./students";

export const attendanceStatusValues = ["present", "absent", "late"] as const;
export const teacherPaymentStatusValues = ["pending", "paid"] as const;

export const classSessionsTable = table("class_sessions", {
  id: id(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").references(() => usersTable.id),
  psychologistId: integer("psychologist_id").references(() => usersTable.id),
  sessionKind: text("session_kind").default("regular"),
  sessionType: text("session_type").default("regular"), // regular|support|makeup|workshop
  sessionMode: text("session_mode"), // clinical|developmental
  sessionDate: text("session_date").notNull(),
  sessionTime: text("session_time"), // HH:MM
  lessonTitle: text("lesson_title"),
  notes: text("notes"),
  sessionGoal: text("session_goal"),
  sessionOutcome: text("session_outcome"),
  nextGoal: text("next_goal"),
  status: text("status").default("completed"), // planned|completed
  reportStatus: text("report_status").default("none"), // none|draft|published
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessionAttendanceTable = table("session_attendance", {
  id: id(),
  sessionId: integer("session_id").notNull().references(() => classSessionsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: attendanceStatusValues }).notNull().default("present"),
  speakingScore: integer("speaking_score"),
  confidenceScore: integer("confidence_score"),
  participationScore: integer("participation_score"),
  initiativeScore: integer("initiative_score"),
  behavioralNotes: text("behavioral_notes"),
  curriculumProgress: text("curriculum_progress"),
  // Communication Metrics (Verbal)
  verbalFluency: integer("verbal_fluency"),       // 1–10
  verbalClarity: integer("verbal_clarity"),       // 1–10
  verbalVocabulary: integer("verbal_vocabulary"), // 1–10
  // Communication Metrics (Non-Verbal)
  nonverbalEyeContact: integer("nonverbal_eye_contact"),         // 1–10
  nonverbalBodyLanguage: integer("nonverbal_body_language"),     // 1–10
  nonverbalFacialExpressions: integer("nonverbal_facial_expressions"), // 1–10
  reportScore: integer("report_score"), // 1-5, set by teacher/specialist in post-session report
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teacherPaymentsTable = table("teacher_payments", {
  id: id(),
  teacherId: integer("teacher_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  period: text("period").notNull(),
  status: text("status", { enum: teacherPaymentStatusValues }).notNull().default("pending"),
  note: text("note"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ClassSession = typeof classSessionsTable.$inferSelect;
export type SessionAttendance = typeof sessionAttendanceTable.$inferSelect;
export type TeacherPayment = typeof teacherPaymentsTable.$inferSelect;
