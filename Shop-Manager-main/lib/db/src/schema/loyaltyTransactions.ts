import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const loyaltyTransactionsTable = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  customerPhone: text("customer_phone").notNull(),
  customerName: text("customer_name"),
  /** Positive = earned, negative = redeemed */
  points: integer("points").notNull(),
  /** 'earned' | 'redeemed' | 'adjusted' */
  type: text("type").notNull(),
  /** Linked sale, if applicable */
  saleId: integer("sale_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoyaltyTransaction = typeof loyaltyTransactionsTable.$inferSelect;
export type InsertLoyaltyTransaction = typeof loyaltyTransactionsTable.$inferInsert;
