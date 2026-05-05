import { table, text, integer, real, id, timestamp } from "./helpers";
import { paymentsTable } from "./payments";
import { branchesTable } from "./branches";

export const paymentTransactionsTable = table("payment_transactions", {
  id: id(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method", {
    enum: ["cash", "bank_transfer", "cheque", "online"],
  })
    .notNull()
    .default("cash"),
  transactionDate: text("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
