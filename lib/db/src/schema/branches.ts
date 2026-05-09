import { table, text, integer, id, timestamp, boolean } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const branchesTable = table("branches", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  address: text("address"),
  addressAr: text("address_ar"),
  managerName: text("manager_name"),
  managerId: integer("manager_id"),   // FK to users — no .references() to avoid circular dep
  phone: text("phone"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
