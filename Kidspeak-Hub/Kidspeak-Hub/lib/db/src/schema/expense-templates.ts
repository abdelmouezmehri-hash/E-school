import { table, text, integer, real, id, timestamp, boolean } from "./helpers";
import { branchesTable } from "./branches";

export const expenseTemplatesTable = table("expense_templates", {
  id:            id(),
  branchId:      integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  name:          text("name").notNull(),
  category:      text("category", { enum: ["rent", "utilities", "salaries", "materials", "maintenance", "other"] }).notNull(),
  defaultAmount: real("default_amount").notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export type ExpenseTemplate = typeof expenseTemplatesTable.$inferSelect;
export type InsertExpenseTemplate = typeof expenseTemplatesTable.$inferInsert;