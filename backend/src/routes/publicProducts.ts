import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { db, productsTable, categoriesTable, settingsTable } from "@workspace/db";

const publicProductsRoutes: FastifyPluginAsync = async (fastify) => {
  /** Public catalog — no auth required. Returns only published products. */
  fastify.get("/public/products", async (_request, reply) => {
    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        sku: productsTable.sku,
        description: productsTable.description,
        photoUrl: productsTable.photoUrl,
        price: productsTable.price,
        discountPercent: productsTable.discountPercent,
        stock: productsTable.stock,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
      })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.published, true))
      .orderBy(productsTable.name);

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        description: row.description,
        photoUrl: row.photoUrl,
        price: parseFloat(row.price),
        discountPercent: row.discountPercent,
        salePrice:
          row.discountPercent > 0
            ? parseFloat(row.price) * (1 - row.discountPercent / 100)
            : parseFloat(row.price),
        stock: row.stock,
        soldOut: row.stock === 0,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? null,
      })),
    );
  });

  /** Public settings — only businessName + logoUrl. */
  fastify.get("/public/settings", async (_request, reply) => {
    const rows = await db
      .select({ businessName: settingsTable.businessName, logoUrl: settingsTable.logoUrl })
      .from(settingsTable)
      .limit(1);
    const s = rows[0];
    return reply.send({
      businessName: s?.businessName ?? "Our Store",
      logoUrl: s?.logoUrl ?? null,
    });
  });
};

export default publicProductsRoutes;
