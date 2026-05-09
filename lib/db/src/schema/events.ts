import { table, text, integer, real, id, timestamp, boolean } from "./helpers";
import { usersTable } from "./users";

export const eventTypeValues = ["meeting", "workshop", "school_event", "other"] as const;

export const eventsTable = table("events", {
  id: id(),
  type: text("type", { enum: eventTypeValues }).notNull().default("other"),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  isPaid: boolean("is_paid").notNull().default(false),
  price: real("price"),
  createdBy: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventInvitationsTable = table("event_invitations", {
  id: id(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
});

export type Event = typeof eventsTable.$inferSelect;
export type EventInvitation = typeof eventInvitationsTable.$inferSelect;
