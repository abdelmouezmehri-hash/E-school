import { table, text, integer, real, id, timestamp } from "./helpers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const userRoles = ["admin", "teacher", "parent", "psychologist", "accountant", "photographer", "designer", "marketer", "branch_manager", "receptionist"] as const;
export type UserRole = typeof userRoles[number];

export const usersTable = table("users", {
  id: id(),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("teacher"),
  phone: text("phone"),
  phone2: text("phone2"),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  specialization: text("specialization"),
  emergencyContact1Name: text("emergency_contact1_name"),
  emergencyContact1Relation: text("emergency_contact1_relation"),
  emergencyContact1Phone: text("emergency_contact1_phone"),
  emergencyContact2Name: text("emergency_contact2_name"),
  emergencyContact2Relation: text("emergency_contact2_relation"),
  emergencyContact2Phone: text("emergency_contact2_phone"),
  ccpNumber: text("ccp_number"),
  ccpKey: text("ccp_key"),
  rip: text("rip"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  paymentType: text("payment_type", { enum: ["per_session", "monthly"] }),
  payPerSession: real("pay_per_session"),
  monthlySalary: real("monthly_salary"),
  customRoleId: integer("custom_role_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
