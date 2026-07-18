import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const USER_ROLES = ["admin", "salesperson", "cashier"] as const;
export type UserRoleType = typeof USER_ROLES[number];

export const ALL_PERMISSIONS = [
  "dashboard",
  "inventory",
  "sales",
  "categories",
  "users",
  "settings",
  "customers",
  "reports",
] as const;
export type PermissionType = typeof ALL_PERMISSIONS[number];

export const userRolesTable = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  role: text("role").$type<UserRoleType | null>(),
  /** When set, overrides the role-based permission defaults for this user. */
  permissions: text("permissions").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserRoleSchema = createInsertSchema(userRolesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleRow = typeof userRolesTable.$inferSelect;
