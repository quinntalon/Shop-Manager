import { z } from "zod/v4";
import { UpdateProductBody as _UpdateProductBody } from "./generated/api";

export const BulkDiscountBody = z.object({
  discountPercent: z.number().int().min(0).max(100),
  productIds: z.array(z.number().int().positive()).optional(),
});

export const AddWarehouseStockBody = z.object({
  quantity: z.number().int().positive(),
});

/**
 * Extended UpdateProductBody that includes originalPhotoUrl.
 * Merges into the generated schema without re-declaring existing fields.
 */
export const UpdateProductBody = _UpdateProductBody.extend({
  originalPhotoUrl: z.string().optional(),
});