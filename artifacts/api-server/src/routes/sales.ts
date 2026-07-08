import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import {
  ListSalesQueryParams,
  CreateSaleBody,
  GetSaleParams,
} from "@workspace/api-zod";
import { requirePermission } from "../middlewares/requireRole";

const router: IRouter = Router();

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
      productName: productsTable.name,
      productPhotoUrl: productsTable.photoUrl,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, saleId));

  return {
    id: sale.id,
    customerName: sale.customerName,
    note: sale.note,
    total: parseFloat(sale.total),
    createdAt: sale.createdAt.toISOString(),
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName ?? null,
      productPhotoUrl: item.productPhotoUrl ?? null,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
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
    .orderBy(salesTable.createdAt)
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

  const result = sales.map((sale) => ({
    id: sale.id,
    customerName: sale.customerName,
    note: sale.note,
    total: parseFloat(sale.total),
    createdAt: sale.createdAt.toISOString(),
    items: (itemsBySaleId[sale.id] ?? []).map((item) => ({
      productId: item.productId,
      productName: item.productName ?? null,
      productPhotoUrl: item.productPhotoUrl ?? null,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
    })),
  }));

  res.json(result.reverse());
});

router.post("/sales", requirePermission("sales"), async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, customerName, note } = parsed.data;

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
  }

  let total = 0;
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    total += parseFloat(product.price) * item.quantity;
  }

  const [sale] = await db
    .insert(salesTable)
    .values({
      customerName: customerName ?? null,
      note: note ?? null,
      total: String(total.toFixed(2)),
    })
    .returning();

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    await db.insert(saleItemsTable).values({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: product.price,
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
