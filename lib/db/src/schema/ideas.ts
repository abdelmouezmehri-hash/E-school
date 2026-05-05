import { table, text, integer, id, timestamp } from "./helpers";
import { usersTable } from "./users";

export const ideasTable = table("ideas", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'marketing_idea' | 'educational_activity' | 'system_improvement' | 'event_suggestion'
  status: text("status").notNull().default("under_review"), // 'under_review' | 'approved' | 'done' | 'archived'
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  submittedBy: integer("submitted_by").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  adminFeedback: text("admin_feedback"),
  adminFeedbackAr: text("admin_feedback_ar"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Idea = typeof ideasTable.$inferSelect;
