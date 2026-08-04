import type { FastifyPluginAsync } from "fastify";
import { lte, sql, gte } from "drizzle-orm";
import { db, productsTable, salesTable, saleItemsTable, categoriesTable } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/dashboard/summary",
    { preHandler: [requirePermission("dashboard")] },
    async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [productStats] = await db
        .select({
          totalProducts: sql<number>`count(*)::int`,
          lowStockCount: sql<number>`count(*) filter (where ${productsTable.stock} <= ${productsTable.reorderLevel})::int`,
        })
        .from(productsTable);

      const [todayStats] = await db
        .select({
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(salesTable)
        .where(gte(salesTable.createdAt, todayStart));

      const [weekStats] = await db
        .select({
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
        })
        .from(salesTable)
        .where(gte(salesTable.createdAt, weekStart));

      const [monthStats] = await db
        .select({
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
        })
        .from(salesTable)
        .where(gte(salesTable.createdAt, monthStart));

      return {
        todayRevenue: Number(todayStats.revenue),
        weekRevenue: Number(weekStats.revenue),
        monthRevenue: Number(monthStats.revenue),
        totalProducts: productStats.totalProducts,
        lowStockCount: productStats.lowStockCount,
        totalSalesToday: todayStats.count,
      };
    },
  );

  fastify.get(
    "/dashboard/sales-by-day",
    { preHandler: [requirePermission("dashboard")] },
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const rows = await db
        .select({
          date: sql<string>`date(${salesTable.createdAt} AT TIME ZONE 'UTC')::text`,
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(salesTable)
        .where(gte(salesTable.createdAt, thirtyDaysAgo))
        .groupBy(sql`date(${salesTable.createdAt} AT TIME ZONE 'UTC')`)
        .orderBy(sql`date(${salesTable.createdAt} AT TIME ZONE 'UTC')`);

      return rows.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
        count: r.count,
      }));
    },
  );

  fastify.get(
    "/dashboard/top-products",
    { preHandler: [requirePermission("dashboard")] },
    async () => {
      const rows = await db
        .select({
          productId: saleItemsTable.productId,
          productName: productsTable.name,
          totalRevenue: sql<number>`sum(${saleItemsTable.unitPrice}::numeric * ${saleItemsTable.quantity})`,
          totalQuantity: sql<number>`sum(${saleItemsTable.quantity})::int`,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, sql`${saleItemsTable.productId} = ${productsTable.id}`)
        .groupBy(saleItemsTable.productId, productsTable.name)
        .orderBy(sql`sum(${saleItemsTable.unitPrice}::numeric * ${saleItemsTable.quantity}) DESC`)
        .limit(10);

      return rows.map((r) => ({
        productId: r.productId,
        productName: r.productName ?? "Unknown",
        totalRevenue: Number(r.totalRevenue),
        totalQuantity: r.totalQuantity,
      }));
    },
  );

  fastify.get(
    "/dashboard/low-stock",
    { preHandler: [requirePermission("dashboard")] },
    async () => {
      const rows = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          sku: productsTable.sku,
          description: productsTable.description,
          price: productsTable.price,
          costPrice: productsTable.costPrice,
          stock: productsTable.stock,
          reorderLevel: productsTable.reorderLevel,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(categoriesTable, sql`${productsTable.categoryId} = ${categoriesTable.id}`)
        .where(lte(productsTable.stock, productsTable.reorderLevel))
        .orderBy(productsTable.stock);

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        description: r.description,
        price: parseFloat(r.price),
        costPrice: r.costPrice != null ? parseFloat(r.costPrice) : null,
        stock: r.stock,
        reorderLevel: r.reorderLevel,
        categoryId: r.categoryId,
        categoryName: r.categoryName ?? null,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  );
};

export default dashboardRoutes;
