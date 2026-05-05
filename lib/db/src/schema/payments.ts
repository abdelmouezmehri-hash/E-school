import { table, text, integer, real, id, timestamp, jsonText } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { usersTable } from "./users";
import { levelsTable } from "./levels";
import { branchesTable } from "./branches";

export const paymentsTable = table("payments", {
  id: id(),
  studentId: integer("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  levelId: integer("level_id").references(() => levelsTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  amountDue: real("amount_due").notNull(),
  discount: real("discount").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  status: text("status", {
    enum: ["paid", "partially_paid", "overdue", "pending"],
  })
    .notNull()
    .default("pending"),
  dueDate: text("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

export type PaymentEditChanges = Record<string, { old: unknown; new: unknown }>;

export const paymentEditsTable = table("payment_edits", {
  id: id(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => paymentsTable.id, { onDelete: "cascade" }),
  editedBy: integer("edited_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  editedAt: timestamp("edited_at").notNull().defaultNow(),
  changes: jsonText("changes").$type<PaymentEditChanges>().notNull(),
});

export type PaymentEdit = typeof paymentEditsTable.$inferSelect;
export const insertPaymentEditSchema = createInsertSchema(
  paymentEditsTable,
).omit({ id: true, editedAt: true });
export type InsertPaymentEdit = z.infer<typeof insertPaymentEditSchema>;
