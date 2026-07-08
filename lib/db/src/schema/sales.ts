import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name"),
  note: text("note"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
