import { table, text, integer, real, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { expenseTemplatesTable } from "./expense-templates";
import { salariesTable } from "./salaries";
import { staffPaymentRequestsTable } from "./staffPaymentRequests";

/**
 * Unified expenses ledger.
 *
 * Every outgoing payment in the school must produce exactly one row in this
 * table. To make the link auditable and to enable cascade deletes, we store a
 * polymorphic source reference using two nullable, mutually-exclusive FK
 * columns:
 *
 *   - salaryId               → expense was auto-created by POST /salaries
 *   - staffPaymentRequestId  → expense was auto-created by approving a
 *                              staff_payment_requests row (bonus / materials
 *                              / transportation / payment_request)
 *
 * If both are null, the expense was entered manually by an admin (rent,
 * utilities, etc.). Both columns are UNIQUE so that one source row can never
 * spawn two expenses.
 *
 * Cascade rules: deleting a salary or a payment request automatically deletes
 * the linked expense. This replaces the fragile (category, amount, date)
 * matching logic that previously lived in routes/salaries.ts.
 */
export const expensesTable = table("expenses", {
  id: id(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  category: text("category", { enum: ["rent", "utilities", "salaries", "materials", "maintenance", "other"] }).notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  notes: text("notes"),
  templateId: integer("template_id").references(() => expenseTemplatesTable.id, { onDelete: "set null" }),

  // ── Polymorphic source links ────────────────────────────────────────────
  salaryId: integer("salary_id")
    .references(() => salariesTable.id, { onDelete: "cascade" })
    .unique(),
  staffPaymentRequestId: integer("staff_payment_request_id")
    .references(() => staffPaymentRequestsTable.id, { onDelete: "cascade" })
    .unique(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schema omits server-managed FK columns — they are only ever set by
// internal handlers (salaries POST, staff-payment-requests approve), never by
// API clients.
export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  createdAt: true,
  salaryId: true,
  staffPaymentRequestId: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
