import { table, text, real, integer, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const salariesTable = table("salaries", {
  id: id(),
  employeeId: integer("employee_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  period: text("period").notNull(),
  note: text("note"),
  paidAt: text("paid_at").notNull(),
  profitSharePercent: real("profit_share_percent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSalarySchema = createInsertSchema(salariesTable).omit({ id: true, createdAt: true });
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salariesTable.$inferSelect;
