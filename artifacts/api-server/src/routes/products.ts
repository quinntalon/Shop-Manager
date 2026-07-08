import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

function buildProduct(row: {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  photoUrl: string | null;
  price: string;
  costPrice: string | null;
  stock: number;
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
    reorderLevel: row.reorderLevel,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/products", requireAnyRole(), async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
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
      reorderLevel: productsTable.reorderLevel,
      categoryId: productsTable.categoryId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  res.json(rows.map(buildProduct));
});

router.post("/products", requirePermission("inventory"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({
      name: parsed.data.name,
      sku: parsed.data.sku,
      description: parsed.data.description ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
      price: String(parsed.data.price),
      costPrice: parsed.data.costPrice != null ? String(parsed.data.costPrice) : null,
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
      reorderLevel: productsTable.reorderLevel,
      categoryId: productsTable.categoryId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, product.id));

  res.status(201).json(buildProduct(row));
});

router.get("/products/:id", requireAnyRole(), async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
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
      reorderLevel: productsTable.reorderLevel,
      categoryId: productsTable.categoryId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(buildProduct(row));
});

router.patch("/products/:id", requirePermission("inventory"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.sku !== undefined) updates.sku = parsed.data.sku;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.photoUrl !== undefined) updates.photoUrl = parsed.data.photoUrl;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.costPrice !== undefined) updates.costPrice = parsed.data.costPrice != null ? String(parsed.data.costPrice) : null;
  if (parsed.data.stock !== undefined) updates.stock = parsed.data.stock;
  if (parsed.data.reorderLevel !== undefined) updates.reorderLevel = parsed.data.reorderLevel;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
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
      reorderLevel: productsTable.reorderLevel,
      categoryId: productsTable.categoryId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  res.json(buildProduct(row));
});

router.delete("/products/:id", requirePermission("inventory"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/products/:id/adjust-stock", requirePermission("inventory"), async (req, res): Promise<void> => {
  const params = AdjustStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AdjustStockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [current] = await db
    .select({ stock: productsTable.stock })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!current) {
    res.status(404).json({ error: "Product not found" });
    return;
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
      reorderLevel: productsTable.reorderLevel,
      categoryId: productsTable.categoryId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, params.data.id));

  res.json(buildProduct(row));
});

export default router;
