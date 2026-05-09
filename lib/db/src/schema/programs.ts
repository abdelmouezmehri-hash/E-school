import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";

export const programTypeValues = ["language", "psychological"] as const;

export const programsTable = table("programs", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  type: text("type", { enum: programTypeValues }).notNull().default("language"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  leadSpecialistId: integer("lead_specialist_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Program = typeof programsTable.$inferSelect;
export type InsertProgram = typeof programsTable.$inferInsert;
