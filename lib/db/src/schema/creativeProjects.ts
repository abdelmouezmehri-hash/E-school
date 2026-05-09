import { table, text, integer, real, id, timestamp, boolean } from "./helpers";
import { usersTable } from "./users";

export const creativeProjectsTable = table("creative_projects", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  deadline: text("deadline"),
  status: text("status").notNull().default("todo"),
  taskType: text("task_type").default("graphic_design"),
  budget: real("budget"),
  earningStatus: text("earning_status").default("pending"),
  earningPaidAt: timestamp("earning_paid_at"),
  earningPaidBy: integer("earning_paid_by").references(() => usersTable.id, { onDelete: "set null" }),
  assignedTo: integer("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  publishedNewsId: integer("published_news_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CreativeProject = typeof creativeProjectsTable.$inferSelect;

export const projectFilesTable = table("project_files", {
  id: id(),
  projectId: integer("project_id").references(() => creativeProjectsTable.id, { onDelete: "cascade" }).notNull(),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectFile = typeof projectFilesTable.$inferSelect;

export const projectCommentsTable = table("project_comments", {
  id: id(),
  projectId: integer("project_id").references(() => creativeProjectsTable.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  isApproval: boolean("is_approval").notNull().default(false),
  isRevision: boolean("is_revision").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProjectComment = typeof projectCommentsTable.$inferSelect;

export const creativeAssetVaultTable = table("creative_asset_vault", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("image"),
  category: text("category").notNull().default("other"),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CreativeAssetVault = typeof creativeAssetVaultTable.$inferSelect;
