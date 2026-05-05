import { table, text, id, timestamp, boolean } from "./helpers";

export const customPages = table("custom_pages", {
  id: id(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull().default(""),
  slug: text("slug").notNull().unique(),
  contentEn: text("content_en").notNull().default(""),
  contentAr: text("content_ar").notNull().default(""),
  status: text("status").notNull().default("draft"),
  showInNavbar: boolean("show_in_navbar").notNull().default(false),
  showInFooter: boolean("show_in_footer").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
