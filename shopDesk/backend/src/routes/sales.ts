import type { FastifyPluginAsync } from "fastify";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable, loyaltyTransactionsTable, settingsTable } from "@workspace/db";
import { getLoyaltyBalance } from "./loyalty";
import {
  ListSalesQueryParams,
  CreateSaleBody,
  GetSaleParams,
} from "@workspace/api-zod";
import { requirePermission } from "../middlewares/requireRole";

type PaymentMethod = "cash" | "momo" | "card" | "bank" | "delivery";
type DeliveryPaymentStatus = "pay_on_delivery" | "paid";

async function buildSaleResponse(saleId: number) {
  const [sale] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, saleId));
  if (!sale) return null;

  const items = await db
    .select({
      id: saleItemsTable.id,
      saleId: saleItemsTable.saleId,
      productId: saleItemsTable.productId,
      quantity: saleItemsTable.quantity,
      unitPrice: saleItemsTable.unitPrice,
      discount: saleItemsTable.discount,
      productName: productsTable.name,
      productPhotoUrl: productsTable.photoUrl,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, saleId));

  const subtotal = parseFloat(sale.subtotal);
  const cartDiscount = parseFloat(sale.cartDiscount);
  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + parseFloat(item.discount),
    0,
  );

  return {
    id: sale.id,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    note: sale.note,
    subtotal,
    cartDiscount,
    discountTotal: itemDiscountTotal + cartDiscount,
    total: parseFloat(sale.total),
    paymentMethod: sale.paymentMethod as PaymentMethod,
    transactionId: sale.transactionId,
    bankName: sale.bankName,
    deliveryPaymentStatus: sale.deliveryPaymentStatus as DeliveryPaymentStatus | null,
    createdAt: sale.createdAt.toISOString(),
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName ?? null,
      productPhotoUrl: item.productPhotoUrl ?? null,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      discount: parseFloat(item.discount),
    })),
  };
}

const salesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/sales",
    { preHandler: [requirePermission("sales")] },
    async (request, reply) => {
      const query = ListSalesQueryParams.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: query.error.message });
      }

      const limit = query.data.limit ?? 50;
      const offset = query.data.offset ?? 0;

      const sales = await db
        .select()
        .from(salesTable)
        .orderBy(desc(salesTable.createdAt))
        .limit(limit)
        .offset(offset);

      if (sales.length === 0) {
        return [];
      }

      const saleIds = sales.map((s) => s.id);
      const allItems = await db
        .select({
          id: saleItemsTable.id,
          saleId: saleItemsTable.saleId,
          productId: saleItemsTable.productId,
          quantity: saleItemsTable.quantity,
          unitPrice: saleItemsTable.unitPrice,
          discount: saleItemsTable.discount,
          productName: productsTable.name,
          productPhotoUrl: productsTable.photoUrl,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
        .where(inArray(saleItemsTable.saleId, saleIds));

      const itemsBySaleId: Record<number, typeof allItems> = {};
      for (const item of allItems) {
        if (!itemsBySaleId[item.saleId]) itemsBySaleId[item.saleId] = [];
        itemsBySaleId[item.saleId].push(item);
      }

      return sales.map((sale) => {
        const saleItems = itemsBySaleId[sale.id] ?? [];
        const itemDiscountTotal = saleItems.reduce(
          (sum, item) => sum + parseFloat(item.discount),
          0,
        );
        const cartDiscount = parseFloat(sale.cartDiscount);
        return {
          id: sale.id,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          note: sale.note,
          subtotal: parseFloat(sale.subtotal),
          cartDiscount,
          discountTotal: itemDiscountTotal + cartDiscount,
          total: parseFloat(sale.total),
          paymentMethod: sale.paymentMethod as PaymentMethod,
          transactionId: sale.transactionId,
          bankName: sale.bankName,
          deliveryPaymentStatus:
            sale.deliveryPaymentStatus as DeliveryPaymentStatus | null,
          createdAt: sale.createdAt.toISOString(),
          items: saleItems.map((item) => ({
            productId: item.productId,
            productName: item.productName ?? null,
            productPhotoUrl: item.productPhotoUrl ?? null,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            discount: parseFloat(item.discount),
          })),
        };
      });
    },
  );

  fastify.post(
    "/sales",
    { preHandler: [requirePermission("sales")] },
    async (request, reply) => {
      const parsed = CreateSaleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      const {
        items,
        customerName,
        customerPhone,
        note,
        paymentMethod,
        transactionId,
        bankName,
        deliveryPaymentStatus,
        cartDiscount,
        pointsRedeemed: rawPointsRedeemed,
      } = parsed.data;

      const pointsRedeemed = rawPointsRedeemed ?? 0;
      const method = (paymentMethod ?? "cash") as PaymentMethod;

      if (method === "momo" && !transactionId?.trim()) {
        return reply
          .code(400)
          .send({ error: "Transaction ID is required for Momo payments" });
      }
      if (method === "bank" && !bankName?.trim()) {
        return reply
          .code(400)
          .send({ error: "Bank name is required for Bank payments" });
      }
      if (method === "delivery" && !deliveryPaymentStatus) {
        return reply
          .code(400)
          .send({ error: "Payment status is required for Delivery orders" });
      }

      const productIds = items.map((i) => i.productId);
      const products = await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          return reply
            .code(400)
            .send({ error: `Product ${item.productId} not found` });
        }
        if (product.stock < item.quantity) {
          return reply
            .code(400)
            .send({ error: `Insufficient stock for "${product.name}"` });
        }
        const lineTotal = parseFloat(product.price) * item.quantity;
        if ((item.discount ?? 0) > lineTotal) {
          return reply.code(400).send({
            error: `Discount for "${product.name}" cannot exceed its line total`,
          });
        }
      }

      let subtotal = 0;
      let itemDiscountTotal = 0;
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        subtotal += parseFloat(product.price) * item.quantity;
        itemDiscountTotal += item.discount ?? 0;
      }

      // ── Loyalty: validate and calculate redemption discount ──────────────────
      let redeemDiscountAmount = 0;
      let loyaltyConfig: { loyaltyEnabled: boolean; loyaltyPointsPerCedi: number; loyaltyRedemptionRate: number } | null = null;

      if (pointsRedeemed > 0 || customerPhone) {
        const [settingsRow] = await db
          .select({
            loyaltyEnabled: settingsTable.loyaltyEnabled,
            loyaltyPointsPerCedi: settingsTable.loyaltyPointsPerCedi,
            loyaltyRedemptionRate: settingsTable.loyaltyRedemptionRate,
          })
          .from(settingsTable)
          .where(eq(settingsTable.id, 1));
        loyaltyConfig = settingsRow ?? null;
      }

      if (pointsRedeemed > 0) {
        if (!loyaltyConfig?.loyaltyEnabled) {
          return reply.code(400).send({ error: "Loyalty program is not enabled" });
        }
        if (!customerPhone) {
          return reply.code(400).send({ error: "Customer phone is required to redeem loyalty points" });
        }
        const balance = await getLoyaltyBalance(customerPhone);
        if (balance < pointsRedeemed) {
          return reply.code(422).send({ error: `Insufficient loyalty points. Balance: ${balance}` });
        }
        redeemDiscountAmount = Math.floor(pointsRedeemed / loyaltyConfig.loyaltyRedemptionRate);
      }

      // ── Totals ────────────────────────────────────────────────────────────────
      const cartDiscountAmount = Math.min(
        cartDiscount ?? 0,
        Math.max(subtotal - itemDiscountTotal, 0),
      );
      const preRedeemSubtotal = Math.max(subtotal - itemDiscountTotal - cartDiscountAmount, 0);
      const appliedRedeemDiscount = Math.min(redeemDiscountAmount, preRedeemSubtotal);
      const total = Math.max(preRedeemSubtotal - appliedRedeemDiscount, 0);
      // Store redemption discount folded into cartDiscount so the DB total is correct
      const storedCartDiscount = cartDiscountAmount + appliedRedeemDiscount;

      const [sale] = await db
        .insert(salesTable)
        .values({
          customerName: customerName ?? null,
          customerPhone: customerPhone ?? null,
          note: note ?? null,
          subtotal: String(subtotal.toFixed(2)),
          cartDiscount: String(storedCartDiscount.toFixed(2)),
          total: String(total.toFixed(2)),
          paymentMethod: method,
          transactionId: method === "momo" ? (transactionId ?? null) : null,
          bankName: method === "bank" ? (bankName ?? null) : null,
          deliveryPaymentStatus:
            method === "delivery" ? (deliveryPaymentStatus ?? null) : null,
        })
        .returning();

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        await db.insert(saleItemsTable).values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          discount: String((item.discount ?? 0).toFixed(2)),
        });
        await db
          .update(productsTable)
          .set({ stock: product.stock - item.quantity })
          .where(eq(productsTable.id, item.productId));
      }

      // ── Loyalty transactions ──────────────────────────────────────────────────
      if (loyaltyConfig?.loyaltyEnabled && customerPhone) {
        // Deduct redeemed points first
        if (pointsRedeemed > 0) {
          await db.insert(loyaltyTransactionsTable).values({
            customerPhone,
            customerName: customerName ?? null,
            points: -pointsRedeemed,
            type: "redeemed",
            saleId: sale.id,
            note: `Redeemed on sale #${sale.id}`,
          });
        }
        // Earn points on the final amount paid
        const earnedPoints = Math.floor(total * loyaltyConfig.loyaltyPointsPerCedi);
        if (earnedPoints > 0) {
          await db.insert(loyaltyTransactionsTable).values({
            customerPhone,
            customerName: customerName ?? null,
            points: earnedPoints,
            type: "earned",
            saleId: sale.id,
            note: `Earned on sale #${sale.id}`,
          });
        }
      }

      const fullSale = await buildSaleResponse(sale.id);
      return reply.code(201).send(fullSale);
    },
  );

  fastify.get(
    "/sales/:id",
    { preHandler: [requirePermission("sales")] },
    async (request, reply) => {
      const params = GetSaleParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const sale = await buildSaleResponse(params.data.id);
      if (!sale) {
        return reply.code(404).send({ error: "Sale not found" });
      }
      return sale;
    },
  );
};

export default salesRoutes;
