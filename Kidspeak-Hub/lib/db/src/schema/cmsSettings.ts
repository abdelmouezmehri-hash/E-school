import { table, text, id, timestamp } from "./helpers";

export const cmsSettings = table("cms_settings", {
  id: id(),
  key: text("key").notNull().unique(),
  valueJson: text("value_json").notNull().default("{}"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
