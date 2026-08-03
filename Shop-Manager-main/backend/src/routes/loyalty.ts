import type { FastifyPluginAsync } from "fastify";
import { eq, sql, desc } from "drizzle-orm";
import { db, loyaltyTransactionsTable, settingsTable } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const SETTINGS_ID = 1;

async function getSettings() {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, SETTINGS_ID));
  return row;
}

export async function getLoyaltyBalance(phone: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${loyaltyTransactionsTable.points}), 0)::int` })
    .from(loyaltyTransactionsTable)
    .where(eq(loyaltyTransactionsTable.customerPhone, phone));
  return row?.balance ?? 0;
}

const AdjustBody = z.object({
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
  points: z.number().int(),
  note: z.string().optional(),
});

const loyaltyRoutes: FastifyPluginAsync = async (fastify) => {
  /** GET /api/loyalty/:phone — balance + last 50 transactions */
  fastify.get(
    "/loyalty/:phone",
    { preHandler: [requirePermission("customers")] },
    async (request, reply) => {
      const { phone } = request.params as { phone: string };
      const decodedPhone = decodeURIComponent(phone);

      const [balanceRow] = await db
        .select({ balance: sql<number>`coalesce(sum(${loyaltyTransactionsTable.points}), 0)::int` })
        .from(loyaltyTransactionsTable)
        .where(eq(loyaltyTransactionsTable.customerPhone, decodedPhone));

      const transactions = await db
        .select()
        .from(loyaltyTransactionsTable)
        .where(eq(loyaltyTransactionsTable.customerPhone, decodedPhone))
        .orderBy(desc(loyaltyTransactionsTable.createdAt))
        .limit(50);

      return {
        phone: decodedPhone,
        balance: balanceRow?.balance ?? 0,
        transactions: transactions.map((t) => ({
          id: t.id,
          points: t.points,
          type: t.type,
          saleId: t.saleId ?? null,
          note: t.note ?? null,
          createdAt: t.createdAt.toISOString(),
        })),
      };
    },
  );

  /** GET /api/loyalty/sale/:saleId — loyalty transactions for a specific sale */
  fastify.get(
    "/loyalty/sale/:saleId",
    { preHandler: [requirePermission("sales")] },
    async (request, reply) => {
      const saleId = Number((request.params as { saleId: string }).saleId);
      if (!saleId) return reply.code(400).send({ error: "Invalid sale ID" });

      const transactions = await db
        .select()
        .from(loyaltyTransactionsTable)
        .where(eq(loyaltyTransactionsTable.saleId, saleId));

      return transactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        saleId: t.saleId ?? null,
        note: t.note ?? null,
        createdAt: t.createdAt.toISOString(),
      }));
    },
  );

  /** POST /api/loyalty/adjust — manual point adjustment (admin) */
  fastify.post(
    "/loyalty/adjust",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const parsed = AdjustBody.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });

      const { customerPhone, customerName, points, note } = parsed.data;
      if (points === 0) return reply.code(400).send({ error: "Points must be non-zero" });

      // Prevent negative balance on manual deductions
      if (points < 0) {
        const balance = await getLoyaltyBalance(customerPhone);
        if (balance + points < 0) {
          return reply.code(422).send({ error: "Adjustment would result in a negative balance" });
        }
      }

      const [row] = await db
        .insert(loyaltyTransactionsTable)
        .values({
          customerPhone,
          customerName: customerName ?? null,
          points,
          type: "adjusted",
          note: note ?? null,
        })
        .returning();

      const newBalance = await getLoyaltyBalance(customerPhone);

      return { transaction: row, balance: newBalance };
    },
  );
};

export default loyaltyRoutes;
