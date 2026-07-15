import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import {
  ListSalesQueryParams,
  CreateSaleBody,
  GetSaleParams,
} from "@workspace/api-zod";
import { requirePermission } from "../middlewares/requireRole";

const router: IRouter = Router();

type PaymentMethod = 'cash' | 'momo' | 'card' | 'bank' | 'delivery';
type DeliveryPaymentStatus = 'pay_on_delivery' | 'paid';

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
  const itemDiscountTotal = items.reduce((sum, item) => sum + parseFloat(item.discount), 0);

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

router.get("/sales", requirePermission("sales"), async (req, res): Promise<void> => {
  const query = ListSalesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
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
    res.json([]);
    return;
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

  const result = sales.map((sale) => {
    const saleItems = itemsBySaleId[sale.id] ?? [];
    const itemDiscountTotal = saleItems.reduce((sum, item) => sum + parseFloat(item.discount), 0);
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
      deliveryPaymentStatus: sale.deliveryPaymentStatus as DeliveryPaymentStatus | null,
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

  res.json(result);
});

router.post("/sales", requirePermission("sales"), async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
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
  } = parsed.data;

  const method = (paymentMethod ?? "cash") as PaymentMethod;

  if (method === "momo" && !transactionId?.trim()) {
    res.status(400).json({ error: "Transaction ID is required for Momo payments" });
    return;
  }
  if (method === "bank" && !bankName?.trim()) {
    res.status(400).json({ error: "Bank name is required for Bank payments" });
    return;
  }
  if (method === "delivery" && !deliveryPaymentStatus) {
    res.status(400).json({ error: "Payment status is required for Delivery orders" });
    return;
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
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for "${product.name}"` });
      return;
    }
    const lineTotal = parseFloat(product.price) * item.quantity;
    if ((item.discount ?? 0) > lineTotal) {
      res.status(400).json({ error: `Discount for "${product.name}" cannot exceed its line total` });
      return;
    }
  }

  let subtotal = 0;
  let itemDiscountTotal = 0;
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    subtotal += parseFloat(product.price) * item.quantity;
    itemDiscountTotal += item.discount ?? 0;
  }

  const cartDiscountAmount = Math.min(cartDiscount ?? 0, Math.max(subtotal - itemDiscountTotal, 0));
  const total = Math.max(subtotal - itemDiscountTotal - cartDiscountAmount, 0);

  const [sale] = await db
    .insert(salesTable)
    .values({
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      note: note ?? null,
      subtotal: String(subtotal.toFixed(2)),
      cartDiscount: String(cartDiscountAmount.toFixed(2)),
      total: String(total.toFixed(2)),
      paymentMethod: method,
      transactionId: method === "momo" ? transactionId ?? null : null,
      bankName: method === "bank" ? bankName ?? null : null,
      deliveryPaymentStatus: method === "delivery" ? deliveryPaymentStatus ?? null : null,
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

  const fullSale = await buildSaleResponse(sale.id);
  res.status(201).json(fullSale);
});

router.get("/sales/:id", requirePermission("sales"), async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const sale = await buildSaleResponse(params.data.id);
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  res.json(sale);
});

export default router;
