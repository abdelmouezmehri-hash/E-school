import { table, text, integer, real, id, timestamp } from "./helpers";
import { usersTable } from "./users";

export const paymentRequestTypeValues = ["payment_request", "bonus_expense"] as const;
export const paymentRequestStatusValues = ["pending", "approved", "rejected"] as const;
export const bonusCategoryValues = ["bonus", "materials", "transportation"] as const;

export const staffPaymentRequestsTable = table("staff_payment_requests", {
  id: id(),
  staffId: integer("staff_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: paymentRequestTypeValues }).notNull(),
  amount: real("amount").notNull(),
  category: text("category", { enum: bonusCategoryValues }),
  reason: text("reason"),
  status: text("status", { enum: paymentRequestStatusValues }).notNull().default("pending"),
  adminComment: text("admin_comment"),
  referenceNumber: text("reference_number"),
  linkedPaymentId: integer("linked_payment_id"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  receiptConfirmedAt: timestamp("receipt_confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StaffPaymentRequest = typeof staffPaymentRequestsTable.$inferSelect;
