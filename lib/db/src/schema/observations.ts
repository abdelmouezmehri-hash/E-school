import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";
import { studentsTable } from "./students";
import { branchesTable } from "./branches";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const observationsTable = table("observations", {
  id: id(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  observationType: text("observation_type", {
    enum: ["fear", "shyness", "participation", "general"],
  })
    .notNull()
    .default("general"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertObservationSchema = createInsertSchema(
  observationsTable,
).omit({ id: true, createdAt: true });
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type Observation = typeof observationsTable.$inferSelect;
