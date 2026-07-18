import type { FastifyPluginAsync } from "fastify";
import { desc, sql, and, isNotNull, or, ilike, eq } from "drizzle-orm";
import { db, salesTable } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const ListCustomersQuery = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const customersRoutes: FastifyPluginAsync = async (fastify) => {
  /** List all unique customers (derived from sales). */
  fastify.get(
    "/customers",
    { preHandler: [requirePermission("customers")] },
    async (request, reply) => {
      const q = ListCustomersQuery.safeParse(request.query);
      if (!q.success) return reply.code(400).send({ error: q.error.message });
      const { search, limit, offset } = q.data;

      const baseCondition = isNotNull(salesTable.customerName);
      const whereClause = search
        ? and(
            baseCondition,
            or(
              ilike(salesTable.customerName, `%${search}%`),
              ilike(salesTable.customerPhone, `%${search}%`),
            ),
          )!
        : baseCondition;

      const rows = await db
        .select({
          name: salesTable.customerName,
          phone: salesTable.customerPhone,
          totalOrders: sql<number>`count(*)::int`,
          totalSpent: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
          lastOrderAt: sql<string>`max(${salesTable.createdAt})::text`,
        })
        .from(salesTable)
        .where(whereClause)
        .groupBy(salesTable.customerName, salesTable.customerPhone)
        .orderBy(desc(sql`max(${salesTable.createdAt})`))
        .limit(limit)
        .offset(offset);

      return rows.map((r) => ({
        name: r.name!,
        phone: r.phone ?? null,
        totalOrders: r.totalOrders,
        totalSpent: Number(r.totalSpent),
        lastOrderAt: r.lastOrderAt,
      }));
    },
  );

  /** Purchase history for a specific customer by name. */
  fastify.get(
    "/customers/:name/purchases",
    { preHandler: [requirePermission("customers")] },
    async (request, reply) => {
      const { name } = request.params as { name: string };
      const decodedName = decodeURIComponent(name);

      const sales = await db
        .select({
          id: salesTable.id,
          total: salesTable.total,
          subtotal: salesTable.subtotal,
          cartDiscount: salesTable.cartDiscount,
          paymentMethod: salesTable.paymentMethod,
          note: salesTable.note,
          createdAt: salesTable.createdAt,
        })
        .from(salesTable)
        .where(eq(salesTable.customerName, decodedName))
        .orderBy(desc(salesTable.createdAt))
        .limit(100);

      return sales.map((s) => ({
        id: s.id,
        total: parseFloat(s.total),
        subtotal: parseFloat(s.subtotal),
        cartDiscount: parseFloat(s.cartDiscount),
        paymentMethod: s.paymentMethod,
        note: s.note ?? null,
        createdAt: s.createdAt.toISOString(),
      }));
    },
  );
};

export default customersRoutes;
