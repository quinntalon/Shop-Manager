import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("Nexus POS"),
  logoUrl: text("logo_url"),
  themeMode: text("theme_mode").notNull().default("light"),
  primaryColor: text("primary_color").notNull().default("221 83% 53%"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;

export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
