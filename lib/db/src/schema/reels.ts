import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoPath: text("video_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  status: text("status").notNull().default("published"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  duration: real("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReelSchema = createInsertSchema(reelsTable).omit({
  id: true,
  views: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReel = z.infer<typeof insertReelSchema>;
export type Reel = typeof reelsTable.$inferSelect;
