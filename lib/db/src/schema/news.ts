import { table, text, integer, id, timestamp, jsonText } from "./helpers";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const newsCategoryValues = ["school_update", "educational_tip", "event_gallery"] as const;

export const schoolNewsTable = table("school_news", {
  id: id(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  content: text("content").notNull(),
  contentAr: text("content_ar"),
  imageUrl: text("image_url"),
  category: text("category", { enum: newsCategoryValues }).notNull().default("school_update"),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SchoolNews = typeof schoolNewsTable.$inferSelect;

export const activityRequestsTable = table("activity_requests", {
  id: id(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description").notNull(),
  descriptionAr: text("description_ar"),
  date: text("date").notNull(),
  requiredItems: jsonText("required_items").$type<string[]>().notNull().$defaultFn(() => []),
  requiredItemsAr: jsonText("required_items_ar").$type<string[]>().notNull().$defaultFn(() => []),
  cost: integer("cost"),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  targetType: text("target_type").notNull().default("all"), // 'all' | 'level' | 'group' | 'teacher'
  targetId: integer("target_id"),                          // level/group/teacher id, null when 'all'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityRequest = typeof activityRequestsTable.$inferSelect;

export const activityConsentsTable = table("activity_consents", {
  id: id(),
  requestId: integer("request_id").references(() => activityRequestsTable.id, { onDelete: "cascade" }).notNull(),
  parentId: integer("parent_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(),
  respondedAt: timestamp("responded_at").notNull().defaultNow(),
});

export type ActivityConsent = typeof activityConsentsTable.$inferSelect;
