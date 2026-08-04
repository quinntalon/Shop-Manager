import type { FastifyPluginAsync } from "fastify";
import { eq, ilike, gte, lte, and, desc, asc, type SQL } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { z } from "zod/v4";

const StoreProductsQuery = z.object({
  search:     z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minPrice:   z.coerce.number().min(0).optional(),
  maxPrice:   z.coerce.number().min(0).optional(),
  sort:       z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
});

const StoreProductParams = z.object({ id: z.coerce.number().int().positive() });

const PRODUCT_SELECT = {
  id:              productsTable.id,
  name:            productsTable.name,
  sku:             productsTable.sku,
  description:     productsTable.description,
  photoUrl:        productsTable.photoUrl,
  price:           productsTable.price,
  discountPercent: productsTable.discountPercent,
  stock:           productsTable.stock,
  categoryId:      productsTable.categoryId,
  createdAt:       productsTable.createdAt,
  categoryName:    categoriesTable.name,
} as const;

function buildProduct(row: {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  photoUrl: string | null;
  price: string;
  discountPercent: number;
  stock: number;
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
    discountPercent: row.discountPercent,
    stock: row.stock,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const storeRoutes: FastifyPluginAsync = async (fastify) => {
  // Public: list categories
  fastify.get("/store/categories", async (_request, reply) => {
    const rows = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.name);
    return reply.send(rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
    })));
  });

  // Public: list products (with optional filters)
  fastify.get("/store/products", async (request, reply) => {
    const query = StoreProductsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: query.error.message });
    }

    const { search, categoryId, minPrice, maxPrice, sort } = query.data;
    const conditions: SQL[] = [];

    if (categoryId != null) {
      conditions.push(eq(productsTable.categoryId, categoryId));
    }
    if (search) {
      conditions.push(ilike(productsTable.name, `%${search}%`));
    }
    if (minPrice != null) {
      conditions.push(gte(productsTable.price, String(minPrice)));
    }
    if (maxPrice != null) {
      conditions.push(lte(productsTable.price, String(maxPrice)));
    }

    const orderBy =
      sort === "price_asc"  ? asc(productsTable.price)  :
      sort === "price_desc" ? desc(productsTable.price) :
      sort === "name"       ? asc(productsTable.name)   :
      /* newest */            desc(productsTable.createdAt);

    const rows = await db
      .select(PRODUCT_SELECT)
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy);

    return reply.send(rows.map(buildProduct));
  });

  // Public: single product
  fastify.get("/store/products/:id", async (request, reply) => {
    const params = StoreProductParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: params.error.message });
    }

    const [row] = await db
      .select(PRODUCT_SELECT)
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.id, params.data.id));

    if (!row) {
      return reply.code(404).send({ error: "Product not found" });
    }

    return reply.send(buildProduct(row));
  });
};

export default storeRoutes;
