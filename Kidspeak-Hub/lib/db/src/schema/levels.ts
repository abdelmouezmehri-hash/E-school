import { table, text, integer, real, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const levelsTable = table("levels", {
  id: id(),
  programId: integer("program_id").references(() => programsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  durationWeeks: integer("duration_weeks").notNull(),
  sessionsPerWeek: integer("sessions_per_week").notNull(),
  price: real("price").notNull(),
  sessionType: text("session_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLevelSchema = createInsertSchema(levelsTable).omit({ id: true, createdAt: true });
export type InsertLevel = z.infer<typeof insertLevelSchema>;
export type Level = typeof levelsTable.$inferSelect;
