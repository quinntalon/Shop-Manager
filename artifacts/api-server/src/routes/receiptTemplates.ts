import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  receiptTemplatesTable,
  DEFAULT_RECEIPT_CONFIG,
  receiptTemplateConfigSchema,
} from "@workspace/db";
import {
  CreateReceiptTemplateBody,
  UpdateReceiptTemplateParams,
  UpdateReceiptTemplateBody,
  GetReceiptTemplateParams,
  DeleteReceiptTemplateParams,
  SetDefaultReceiptTemplateParams,
} from "@workspace/api-zod";
import { requireAnyRole, requirePermission } from "../middlewares/requireRole";

const router: IRouter = Router();

router.get("/receipt-templates", requireAnyRole(), async (_req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(receiptTemplatesTable)
    .orderBy(asc(receiptTemplatesTable.createdAt));
  res.json(templates);
});

router.get("/receipt-templates/default", requireAnyRole(), async (_req, res): Promise<void> => {
  const [existingDefault] = await db
    .select()
    .from(receiptTemplatesTable)
    .where(eq(receiptTemplatesTable.isDefault, true));
  if (existingDefault) {
    res.json(existingDefault);
    return;
  }

  const [anyTemplate] = await db
    .select()
    .from(receiptTemplatesTable)
    .orderBy(asc(receiptTemplatesTable.createdAt));
  if (anyTemplate) {
    res.json(anyTemplate);
    return;
  }

  // No templates exist yet — return a synthetic built-in default (not persisted).
  res.json({
    id: 0,
    name: "Default",
    isDefault: true,
    config: DEFAULT_RECEIPT_CONFIG,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

router.post("/receipt-templates", requirePermission("settings"), async (req, res): Promise<void> => {
  const parsed = CreateReceiptTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const config = receiptTemplateConfigSchema.parse(parsed.data.config);

  const existingTemplates = await db.select({ id: receiptTemplatesTable.id }).from(receiptTemplatesTable).limit(1);
  const makeDefault = existingTemplates.length === 0;

  const [template] = await db
    .insert(receiptTemplatesTable)
    .values({ name: parsed.data.name, config, isDefault: makeDefault })
    .returning();
  res.status(201).json(template);
});

router.get("/receipt-templates/:id", requireAnyRole(), async (req, res): Promise<void> => {
  const params = GetReceiptTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [template] = await db
    .select()
    .from(receiptTemplatesTable)
    .where(eq(receiptTemplatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Receipt template not found" });
    return;
  }
  res.json(template);
});

router.patch("/receipt-templates/:id", requirePermission("settings"), async (req, res): Promise<void> => {
  const params = UpdateReceiptTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReceiptTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const config = receiptTemplateConfigSchema.parse(parsed.data.config);

  const [template] = await db
    .update(receiptTemplatesTable)
    .set({ name: parsed.data.name, config, updatedAt: new Date() })
    .where(eq(receiptTemplatesTable.id, params.data.id))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Receipt template not found" });
    return;
  }
  res.json(template);
});

router.delete("/receipt-templates/:id", requirePermission("settings"), async (req, res): Promise<void> => {
  const params = DeleteReceiptTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(receiptTemplatesTable)
    .where(eq(receiptTemplatesTable.id, params.data.id));
  if (!target) {
    res.status(404).json({ error: "Receipt template not found" });
    return;
  }

  const [deleted] = await db
    .delete(receiptTemplatesTable)
    .where(eq(receiptTemplatesTable.id, params.data.id))
    .returning();

  if (deleted?.isDefault) {
    const [nextTemplate] = await db
      .select()
      .from(receiptTemplatesTable)
      .orderBy(asc(receiptTemplatesTable.createdAt))
      .limit(1);
    if (nextTemplate) {
      await db
        .update(receiptTemplatesTable)
        .set({ isDefault: true })
        .where(eq(receiptTemplatesTable.id, nextTemplate.id));
    }
  }

  res.sendStatus(204);
});

router.post(
  "/receipt-templates/:id/set-default",
  requirePermission("settings"),
  async (req, res): Promise<void> => {
    const params = SetDefaultReceiptTemplateParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [target] = await db
      .select()
      .from(receiptTemplatesTable)
      .where(eq(receiptTemplatesTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Receipt template not found" });
      return;
    }

    await db.update(receiptTemplatesTable).set({ isDefault: false }).where(eq(receiptTemplatesTable.isDefault, true));
    const [template] = await db
      .update(receiptTemplatesTable)
      .set({ isDefault: true })
      .where(eq(receiptTemplatesTable.id, params.data.id))
      .returning();
    res.json(template);
  }
);

export default router;
