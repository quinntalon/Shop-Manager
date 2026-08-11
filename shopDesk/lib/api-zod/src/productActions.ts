import { z } from "zod/v4";

export const BulkDiscountBody = z.object({
  discountPercent: z.number().int().min(0).max(100),
  productIds: z.array(z.number().int().positive()).optional(),
});

export const AddWarehouseStockBody = z.object({
  quantity: z.number().int().positive(),
});