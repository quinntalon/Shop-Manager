import type { FastifyPluginAsync } from "fastify";
import { eq, desc, and, sql, type SQL } from "drizzle-orm";
import { db, productsTable, stockTransfersTable } from "@workspace/db";
import { getAuth } from "@clerk/fastify";
import { CreateStockTransferBody, ListStockTransfersQueryParams } from "@workspace/api-zod";
import { requirePermission } from "../middlewares/requireRole";

const stockTransfersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /stock-transfers — list transfers (newest first)
  fastify.get(
    "/stock-transfers",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const query = ListStockTransfersQueryParams.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: query.error.message });
      }

      const conditions: SQL[] = [];
      if (query.data.productId != null) {
        conditions.push(eq(stockTransfersTable.productId, query.data.productId));
      }

      const rows = await db
        .select({
          id: stockTransfersTable.id,
          productId: stockTransfersTable.productId,
          productName: productsTable.name,
          productSku: productsTable.sku,
          quantity: stockTransfersTable.quantity,
          notes: stockTransfersTable.notes,
          transferredBy: stockTransfersTable.transferredBy,
          createdAt: stockTransfersTable.createdAt,
        })
        .from(stockTransfersTable)
        .innerJoin(productsTable, eq(stockTransfersTable.productId, productsTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(stockTransfersTable.createdAt))
        .limit(query.data.limit)
        .offset(query.data.offset);

      return rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        productSku: r.productSku,
        quantity: r.quantity,
        notes: r.notes,
        transferredBy: r.transferredBy,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  );

  // POST /stock-transfers — atomically move qty warehouse → shop
  fastify.post(
    "/stock-transfers",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const parsed = CreateStockTransferBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      const { productId, quantity, notes } = parsed.data;
      const { userId } = getAuth(request);

      // Validate product + warehouse stock in a single query
      const [product] = await db
        .select({ id: productsTable.id, warehouseStock: productsTable.warehouseStock })
        .from(productsTable)
        .where(eq(productsTable.id, productId));

      if (!product) {
        return reply.code(404).send({ error: "Product not found" });
      }
      if (product.warehouseStock < quantity) {
        return reply.code(422).send({
          error: `Insufficient warehouse stock. Available: ${product.warehouseStock}`,
        });
      }

      // Atomically decrement warehouseStock and increment shop stock
      await db
        .update(productsTable)
        .set({
          warehouseStock: sql`${productsTable.warehouseStock} - ${quantity}`,
          stock: sql`${productsTable.stock} + ${quantity}`,
        })
        .where(eq(productsTable.id, productId));

      // Record the transfer
      const [transfer] = await db
        .insert(stockTransfersTable)
        .values({ productId, quantity, notes: notes ?? null, transferredBy: userId ?? null })
        .returning();

      const [row] = await db
        .select({
          id: stockTransfersTable.id,
          productId: stockTransfersTable.productId,
          productName: productsTable.name,
          productSku: productsTable.sku,
          quantity: stockTransfersTable.quantity,
          notes: stockTransfersTable.notes,
          transferredBy: stockTransfersTable.transferredBy,
          createdAt: stockTransfersTable.createdAt,
        })
        .from(stockTransfersTable)
        .innerJoin(productsTable, eq(stockTransfersTable.productId, productsTable.id))
        .where(eq(stockTransfersTable.id, transfer.id));

      return reply.code(201).send({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        quantity: row.quantity,
        notes: row.notes,
        transferredBy: row.transferredBy,
        createdAt: row.createdAt.toISOString(),
      });
    },
  );
};

export default stockTransfersRoutes;
