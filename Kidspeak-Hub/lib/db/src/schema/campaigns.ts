import { table, text, integer, id, timestamp, boolean, real, jsonText } from "./helpers";
import { usersTable } from "./users";
import { branchesTable } from "./branches";
import { levelsTable } from "./levels";

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
  // Landing page — basic
  landingPageEnabled: boolean("landing_page_enabled").notNull().default(false),
  landingPageTitle: text("landing_page_title"),
  landingPageSubtitle: text("landing_page_subtitle"),
  landingPageColor: text("landing_page_color").default("#1B2E8F"),
  // Landing page — builder
  heroTitleEn: text("hero_title_en"),
  heroTitleAr: text("hero_title_ar"),
  heroSubtitleEn: text("hero_subtitle_en"),
  heroSubtitleAr: text("hero_subtitle_ar"),
  heroImage: text("hero_image"),
  ctaTextEn: text("cta_text_en"),
  ctaTextAr: text("cta_text_ar"),
  benefits: jsonText("benefits").$type<Array<{ icon: string; titleEn: string; titleAr: string; descEn: string; descAr: string }>>(),
  testimonials: jsonText("testimonials").$type<Array<{ name: string; role: string; text: string; rating: number }>>(),
  accentColor: text("accent_color").default("#F5A600"),
  videoUrl: text("video_url"),
});

export type Campaign = typeof campaignsTable.$inferSelect;

export const leadsTable = table("leads", {
  id: id(),
  // nullable → allows standalone leads (not linked to any campaign)
  campaignId: integer("campaign_id").references(() => campaignsTable.id, {
    onDelete: "cascade",
  }),
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

export const campaignExpensesTable = table("campaign_expenses", {
  id: id(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaignsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull().default("other"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CampaignExpense = typeof campaignExpensesTable.$inferSelect;

export const marketingEnrollmentRequestsTable = table("marketing_enrollment_requests", {
  id: id(),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").references(() => campaignsTable.id, { onDelete: "set null" }),
  childName: text("child_name").notNull(),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  parentEmail: text("parent_email"),
  childAge: text("child_age"),
  preferredLevel: text("preferred_level"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  levelId: integer("level_id").references(() => levelsTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MarketingEnrollmentRequest = typeof marketingEnrollmentRequestsTable.$inferSelect;
