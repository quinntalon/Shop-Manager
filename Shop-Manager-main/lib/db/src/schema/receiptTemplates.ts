import { pgTable, serial, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const RECEIPT_PAPER_SIZES = ["58mm", "80mm", "A4"] as const;
export type ReceiptPaperSize = (typeof RECEIPT_PAPER_SIZES)[number];

export const RECEIPT_FONT_FAMILIES = ["sans", "mono", "serif"] as const;
export type ReceiptFontFamily = (typeof RECEIPT_FONT_FAMILIES)[number];

export const RECEIPT_FONT_SIZES = ["xs", "sm", "base", "lg", "xl"] as const;
export type ReceiptFontSize = (typeof RECEIPT_FONT_SIZES)[number];

export const RECEIPT_ALIGNMENTS = ["left", "center", "right"] as const;
export type ReceiptAlignment = (typeof RECEIPT_ALIGNMENTS)[number];

export const RECEIPT_ELEMENT_IDS = [
  "logo",
  "storeInfo",
  "receiptMeta",
  "customerInfo",
  "itemsTable",
  "totals",
  "paymentDetails",
  "footer",
] as const;
export type ReceiptElementId = (typeof RECEIPT_ELEMENT_IDS)[number];

export const receiptElementStyleSchema = z.object({
  id: z.enum(RECEIPT_ELEMENT_IDS),
  visible: z.boolean(),
  order: z.number().int(),
  align: z.enum(RECEIPT_ALIGNMENTS),
  bold: z.boolean(),
  fontSize: z.enum(RECEIPT_FONT_SIZES),
  color: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  paddingTop: z.number().int().min(0).max(40).optional(),
  paddingBottom: z.number().int().min(0).max(40).optional(),
});
export type ReceiptElementStyle = z.infer<typeof receiptElementStyleSchema>;

export const receiptTemplateConfigSchema = z
  .object({
    paperSize: z.enum(RECEIPT_PAPER_SIZES),
    fontFamily: z.enum(RECEIPT_FONT_FAMILIES),
    baseFontSize: z.number().int().min(8).max(24),
    spacing: z.number().int().min(0).max(32),
    textColor: z.string().min(1),
    accentColor: z.string().min(1),
    backgroundColor: z.string().min(1),
    showLogo: z.boolean(),
    logoUrl: z.string().nullable().optional(),
    logoSize: z.number().int().min(24).max(200).optional(),
    storeName: z.string(),
    storeAddress: z.string().optional().default(""),
    storePhone: z.string().optional().default(""),
    footerText: z.string(),
    elements: z.array(receiptElementStyleSchema),
    // Extended config — these were previously stripped; now preserved
    customBlocks: z.array(z.any()).optional(),
    footerRows: z.array(z.any()).optional(),
    itemColumns: z.array(z.any()).optional(),
    // Receipt-level styling
    borderStyle: z.enum(["none", "solid", "dashed"]).optional(),
    borderColor: z.string().optional(),
    borderRadius: z.number().int().min(0).max(24).optional(),
  })
  .passthrough(); // preserve any future frontend-only fields without backend stripping them

export type ReceiptTemplateConfig = z.infer<typeof receiptTemplateConfigSchema>;

export const DEFAULT_RECEIPT_ELEMENTS: ReceiptElementStyle[] = [
  { id: "logo", visible: true, order: 0, align: "center", bold: false, fontSize: "base", color: null },
  { id: "storeInfo", visible: true, order: 1, align: "center", bold: true, fontSize: "lg", color: null },
  { id: "receiptMeta", visible: true, order: 2, align: "center", bold: false, fontSize: "sm", color: null },
  { id: "customerInfo", visible: true, order: 3, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "itemsTable", visible: true, order: 4, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "totals", visible: true, order: 5, align: "right", bold: true, fontSize: "base", color: null },
  { id: "paymentDetails", visible: true, order: 6, align: "left", bold: false, fontSize: "sm", color: null },
  { id: "footer", visible: true, order: 7, align: "center", bold: false, fontSize: "sm", color: null },
];

export const DEFAULT_RECEIPT_CONFIG: ReceiptTemplateConfig = {
  paperSize: "80mm",
  fontFamily: "sans",
  baseFontSize: 13,
  spacing: 8,
  textColor: "#0f172a",
  accentColor: "#2563eb",
  backgroundColor: "#ffffff",
  showLogo: true,
  logoUrl: null,
  logoSize: 48,
  storeName: "Nexus POS",
  storeAddress: "",
  storePhone: "",
  footerText: "Thank you for your purchase!",
  elements: DEFAULT_RECEIPT_ELEMENTS,
  customBlocks: [],
  footerRows: [],
  itemColumns: [],
  borderStyle: "none",
  borderColor: "#e2e8f0",
  borderRadius: 0,
};

export const receiptTemplatesTable = pgTable("receipt_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  config: jsonb("config").$type<ReceiptTemplateConfig>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReceiptTemplateSchema = createInsertSchema(receiptTemplatesTable, {
  config: receiptTemplateConfigSchema,
}).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceiptTemplate = z.infer<typeof insertReceiptTemplateSchema>;
export type ReceiptTemplate = typeof receiptTemplatesTable.$inferSelect;
