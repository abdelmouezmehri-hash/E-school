import { table, text, integer, id, timestamp, jsonText } from "./helpers";

export const baseTemplates = ["teacher", "psychologist", "accountant", "photographer", "designer"] as const;
export type BaseTemplate = typeof baseTemplates[number];

export const customRolesTable = table("custom_roles", {
  id: id(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  baseTemplate: text("base_template", { enum: baseTemplates }).notNull(),
  description: text("description"),
  permissions: jsonText("permissions").$type<string[]>().notNull().$defaultFn(() => []),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
