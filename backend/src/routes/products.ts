import type { FastifyPluginAsync } from "fastify";
import { eq, ilike, lte, and, type SQL } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  AdjustStockParams,
  AdjustStockBody,
} from "@workspace/api-zod";
import { requireAnyRole, requirePermission } from "../middlewares/requireRole";

function buildProduct(row: {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  photoUrl: string | null;
  price: string;
  costPrice: string | null;
  stock: number;
  warehouseStock: number;
  reorderLevel: number;
  categoryId: number | null;
  createdAt: Date;
  categoryName?: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    photoUrl: row.photoUrl,
    price: parseFloat(row.price),
    costPrice: row.costPrice != null ? parseFloat(row.costPrice) : null,
    stock: row.stock,
    warehouseStock: row.warehouseStock,
    reorderLevel: row.reorderLevel,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/products",
    { preHandler: [requireAnyRole()] },
    async (request, reply) => {
      const query = ListProductsQueryParams.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: query.error.message });
      }

      const conditions: SQL[] = [];
      if (query.data.categoryId != null) {
        conditions.push(eq(productsTable.categoryId, query.data.categoryId));
      }
      if (query.data.search) {
        conditions.push(ilike(productsTable.name, `%${query.data.search}%`));
      }
      if (query.data.lowStock === true) {
        conditions.push(lte(productsTable.stock, productsTable.reorderLevel));
      }

      const rows = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          photoUrl: productsTable.photoUrl,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          warehouseStock: productsTable.warehouseStock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(productsTable.name);

      return rows.map(buildProduct);
    },
  );

  fastify.post(
    "/products",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const parsed = CreateProductBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const [product] = await db
        .insert(productsTable)
        .values({
          name: parsed.data.name,
          sku: parsed.data.sku,
          description: parsed.data.description ?? null,
          photoUrl: parsed.data.photoUrl ?? null,
          price: String(parsed.data.price),
          costPrice:
            parsed.data.costPrice != null ? String(parsed.data.costPrice) : null,
          stock: parsed.data.stock,
          reorderLevel: parsed.data.reorderLevel ?? 5,
          categoryId: parsed.data.categoryId ?? null,
        })
        .returning();

      const [row] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          photoUrl: productsTable.photoUrl,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          warehouseStock: productsTable.warehouseStock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(eq(productsTable.id, product.id));

      return reply.code(201).send(buildProduct(row));
    },
  );

  fastify.get(
    "/products/:id",
    { preHandler: [requireAnyRole()] },
    async (request, reply) => {
      const params = GetProductParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const [row] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          photoUrl: productsTable.photoUrl,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          warehouseStock: productsTable.warehouseStock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(eq(productsTable.id, params.data.id));

      if (!row) {
        return reply.code(404).send({ error: "Product not found" });
      }
      return buildProduct(row);
    },
  );

  fastify.patch(
    "/products/:id",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const params = UpdateProductParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const parsed = UpdateProductBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      const updates: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) updates.name = parsed.data.name;
      if (parsed.data.sku !== undefined) updates.sku = parsed.data.sku;
      if (parsed.data.description !== undefined)
        updates.description = parsed.data.description;
      if (parsed.data.photoUrl !== undefined)
        updates.photoUrl = parsed.data.photoUrl;
      if (parsed.data.price !== undefined)
        updates.price = String(parsed.data.price);
      if (parsed.data.costPrice !== undefined)
        updates.costPrice =
          parsed.data.costPrice != null ? String(parsed.data.costPrice) : null;
      if (parsed.data.stock !== undefined) updates.stock = parsed.data.stock;
      if (parsed.data.reorderLevel !== undefined)
        updates.reorderLevel = parsed.data.reorderLevel;
      if (parsed.data.categoryId !== undefined)
        updates.categoryId = parsed.data.categoryId;

      const [updated] = await db
        .update(productsTable)
        .set(updates)
        .where(eq(productsTable.id, params.data.id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Product not found" });
      }

      const [row] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          photoUrl: productsTable.photoUrl,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          warehouseStock: productsTable.warehouseStock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(eq(productsTable.id, params.data.id));

      return buildProduct(row);
    },
  );

  fastify.delete(
    "/products/:id",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const params = DeleteProductParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const [product] = await db
        .delete(productsTable)
        .where(eq(productsTable.id, params.data.id))
        .returning();
      if (!product) {
        return reply.code(404).send({ error: "Product not found" });
      }
      return reply.code(204).send();
    },
  );

  fastify.post(
    "/products/:id/adjust-stock",
    { preHandler: [requirePermission("inventory")] },
    async (request, reply) => {
      const params = AdjustStockParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const parsed = AdjustStockBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      const [current] = await db
        .select({ stock: productsTable.stock })
        .from(productsTable)
        .where(eq(productsTable.id, params.data.id));

      if (!current) {
        return reply.code(404).send({ error: "Product not found" });
      }

      const newStock = Math.max(0, current.stock + parsed.data.delta);
      await db
        .update(productsTable)
        .set({ stock: newStock })
        .where(eq(productsTable.id, params.data.id));

      const [row] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          photoUrl: productsTable.photoUrl,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          warehouseStock: productsTable.warehouseStock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(eq(productsTable.id, params.data.id));

      return buildProduct(row);
    },
  );
};

export default productsRoutes;
