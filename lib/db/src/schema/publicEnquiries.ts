import { table, text, id, timestamp } from "./helpers";

export const publicEnquiriesTable = table("public_enquiries", {
  id: id(),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  parentEmail: text("parent_email"),
  childName: text("child_name").notNull(),
  childAge: text("child_age"),
  preferredLevel: text("preferred_level"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PublicEnquiry = typeof publicEnquiriesTable.$inferSelect;
