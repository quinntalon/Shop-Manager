import { z } from "zod/v4";

export const CreateStockTransferBody = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const ListStockTransfersQueryParams = z.object({
  productId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const StockTransferResponse = z.object({
  id: z.number(),
  productId: z.number(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number(),
  notes: z.string().nullable(),
  transferredBy: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateStockTransferInput = z.infer<typeof CreateStockTransferBody>;
export type StockTransferItem = z.infer<typeof StockTransferResponse>;
