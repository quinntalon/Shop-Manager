import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const stockTransfersTable = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  transferredBy: text("transferred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StockTransfer = typeof stockTransfersTable.$inferSelect;
