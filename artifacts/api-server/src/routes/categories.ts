import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAnyRole, requirePermission } from "../middlewares/requireRole";

const router: IRouter = Router();

router.get("/categories", requireAnyRole(), async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", requirePermission("categories"), async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .insert(categoriesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(category);
});

router.patch("/categories/:id", requirePermission("categories"), async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

router.delete("/categories/:id", requirePermission("categories"), async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [category] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
