import { table, text, id, timestamp } from "./helpers";

export const registrationRequestsTable = table("registration_requests", {
  id: id(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  whatsappPhone: text("whatsapp_phone"),
  address: text("address"),
  source: text("source"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RegistrationRequest = typeof registrationRequestsTable.$inferSelect;
export type InsertRegistrationRequest = typeof registrationRequestsTable.$inferInsert;
