// FILE: lib/db/src/schema/campaigns.ts
import { table, text, integer, id, timestamp, boolean } from "./helpers";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const campaignsTable = table("campaigns", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  type: text("type", {
    enum: ["open_day", "early_registration", "summer_school", "custom"],
  })
    .notNull()
    .default("custom"),
  status: text("status", { enum: ["active", "paused", "ended"] })
    .notNull()
    .default("active"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  ctaType: text("cta_type", { enum: ["whatsapp", "form", "call"] })
    .notNull()
    .default("form"),
  whatsappNumber: text("whatsapp_number"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  slug: text("slug").notNull().unique(),
  branchId: integer("branch_id").references(() => branchesTable.id, {
    onDelete: "set null",
  }),
  assignedTo: integer("assigned_to").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdBy: integer("created_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Campaign = typeof campaignsTable.$inferSelect;

export const leadsTable = table("leads", {
  id: id(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaignsTable.id, { onDelete: "cascade" }),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  parentEmail: text("parent_email"),
  childName: text("child_name").notNull(),
  childAge: text("child_age"),
  preferredLevel: text("preferred_level"),
  source: text("source", {
    enum: ["whatsapp", "form", "call", "other"],
  })
    .notNull()
    .default("form"),
  status: text("status", {
    enum: ["new", "contacted", "interested", "registered", "not_interested"],
  })
    .notNull()
    .default("new"),
  assignedTo: integer("assigned_to").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  followUpDate: text("follow_up_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Lead = typeof leadsTable.$inferSelect;
