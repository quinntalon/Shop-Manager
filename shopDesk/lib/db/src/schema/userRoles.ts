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
  username: text("clerk_user_id").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  nextOfKinName: text("next_of_kin_name").notNull().default(""),
  nextOfKinPhone: text("next_of_kin_phone").notNull().default(""),
  position: text("position").notNull().default(""),
  applicationNotes: text("application_notes").notNull().default(""),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
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
