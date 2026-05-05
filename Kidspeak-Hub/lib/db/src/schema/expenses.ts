import { table, text, integer, real, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { expenseTemplatesTable } from "./expense-templates";

export const expensesTable = table("expenses", {
  id: id(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  category: text("category", { enum: ["rent", "utilities", "salaries", "materials", "maintenance", "other"] }).notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  notes: text("notes"),
  templateId:  integer("template_id").references(() => expenseTemplatesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
