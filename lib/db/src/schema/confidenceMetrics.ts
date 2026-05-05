import { table, integer, id, timestamp } from "./helpers";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const confidenceMetricsTable = table("confidence_metrics", {
  id: id(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  eyeContact: integer("eye_contact").notNull().default(5),
  voiceVolume: integer("voice_volume").notNull().default(5),
  initiative: integer("initiative").notNull().default(5),
  resilience: integer("resilience").notNull().default(5),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  recordedBy: integer("recorded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConfidenceMetric = typeof confidenceMetricsTable.$inferSelect;
