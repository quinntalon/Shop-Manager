import type { FastifyPluginAsync } from "fastify";
import { gte, lte, and, sql, desc } from "drizzle-orm";
import { db, salesTable } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const DateRangeQuery = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),   // YYYY-MM-DD (inclusive)
});

const RevenueQuery = DateRangeQuery.extend({
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

function dateFilters(from?: string, to?: string) {
  return and(
    from ? gte(salesTable.createdAt, new Date(from)) : undefined,
    to
      ? (() => {
          const end = new Date(to);
          end.setDate(end.getDate() + 1);
          return lte(salesTable.createdAt, end);
        })()
      : undefined,
  );
}

const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  /** Revenue grouped by day / week / month. */
  fastify.get(
    "/reports/revenue",
    { preHandler: [requirePermission("reports")] },
    async (request, reply) => {
      const q = RevenueQuery.safeParse(request.query);
      if (!q.success) return reply.code(400).send({ error: q.error.message });
      const { from, to, groupBy } = q.data;

      const selectPeriod =
        groupBy === "month"
          ? sql<string>`date_trunc('month', ${salesTable.createdAt} AT TIME ZONE 'UTC')::date::text`
          : groupBy === "week"
            ? sql<string>`date_trunc('week', ${salesTable.createdAt} AT TIME ZONE 'UTC')::date::text`
            : sql<string>`date(${salesTable.createdAt} AT TIME ZONE 'UTC')::text`;

      const groupByPeriod =
        groupBy === "month"
          ? sql`date_trunc('month', ${salesTable.createdAt} AT TIME ZONE 'UTC')::date`
          : groupBy === "week"
            ? sql`date_trunc('week', ${salesTable.createdAt} AT TIME ZONE 'UTC')::date`
            : sql`date(${salesTable.createdAt} AT TIME ZONE 'UTC')`;

      const rows = await db
        .select({
          period: selectPeriod,
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(salesTable)
        .where(dateFilters(from, to))
        .groupBy(groupByPeriod)
        .orderBy(groupByPeriod);

      return rows.map((r) => ({
        period: r.period as string,
        revenue: Number(r.revenue),
        count: r.count,
      }));
    },
  );

  /** Revenue breakdown by payment method. */
  fastify.get(
    "/reports/payment-methods",
    { preHandler: [requirePermission("reports")] },
    async (request, reply) => {
      const q = DateRangeQuery.safeParse(request.query);
      if (!q.success) return reply.code(400).send({ error: q.error.message });
      const { from, to } = q.data;

      const rows = await db
        .select({
          method: salesTable.paymentMethod,
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
        })
        .from(salesTable)
        .where(dateFilters(from, to))
        .groupBy(salesTable.paymentMethod)
        .orderBy(desc(sql`sum(${salesTable.total}::numeric)`));

      return rows.map((r) => ({
        method: r.method,
        count: r.count,
        revenue: Number(r.revenue),
      }));
    },
  );

  /** Aggregate summary for a date range. */
  fastify.get(
    "/reports/summary",
    { preHandler: [requirePermission("reports")] },
    async (request, reply) => {
      const q = DateRangeQuery.safeParse(request.query);
      if (!q.success) return reply.code(400).send({ error: q.error.message });
      const { from, to } = q.data;

      const [stats] = await db
        .select({
          totalRevenue: sql<number>`coalesce(sum(${salesTable.total}::numeric), 0)`,
          totalSales: sql<number>`count(*)::int`,
          avgOrderValue: sql<number>`coalesce(avg(${salesTable.total}::numeric), 0)`,
          uniqueCustomers: sql<number>`count(distinct ${salesTable.customerName}) filter (where ${salesTable.customerName} is not null)::int`,
        })
        .from(salesTable)
        .where(dateFilters(from, to));

      return {
        totalRevenue: Number(stats.totalRevenue),
        totalSales: stats.totalSales,
        avgOrderValue: Number(stats.avgOrderValue),
        uniqueCustomers: stats.uniqueCustomers,
      };
    },
  );
};

export default reportsRoutes;
