import type { FastifyPluginAsync } from "fastify";
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

const receiptTemplatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/receipt-templates",
    { preHandler: [requireAnyRole()] },
    async () => {
      const templates = await db
        .select()
        .from(receiptTemplatesTable)
        .orderBy(asc(receiptTemplatesTable.createdAt));
      return templates;
    },
  );

  fastify.get(
    "/receipt-templates/default",
    { preHandler: [requireAnyRole()] },
    async () => {
      const [existingDefault] = await db
        .select()
        .from(receiptTemplatesTable)
        .where(eq(receiptTemplatesTable.isDefault, true));
      if (existingDefault) {
        return existingDefault;
      }

      const [anyTemplate] = await db
        .select()
        .from(receiptTemplatesTable)
        .orderBy(asc(receiptTemplatesTable.createdAt));
      if (anyTemplate) {
        return anyTemplate;
      }

      // No templates exist yet — return a synthetic built-in default (not persisted).
      return {
        id: 0,
        name: "Default",
        isDefault: true,
        config: DEFAULT_RECEIPT_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  );

  fastify.post(
    "/receipt-templates",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const parsed = CreateReceiptTemplateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const config = receiptTemplateConfigSchema.parse(parsed.data.config);

      const existingTemplates = await db
        .select({ id: receiptTemplatesTable.id })
        .from(receiptTemplatesTable)
        .limit(1);
      const makeDefault = existingTemplates.length === 0;

      const [template] = await db
        .insert(receiptTemplatesTable)
        .values({ name: parsed.data.name, config, isDefault: makeDefault })
        .returning();
      return reply.code(201).send(template);
    },
  );

  fastify.get(
    "/receipt-templates/:id",
    { preHandler: [requireAnyRole()] },
    async (request, reply) => {
      const params = GetReceiptTemplateParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const [template] = await db
        .select()
        .from(receiptTemplatesTable)
        .where(eq(receiptTemplatesTable.id, params.data.id));
      if (!template) {
        return reply.code(404).send({ error: "Receipt template not found" });
      }
      return template;
    },
  );

  fastify.patch(
    "/receipt-templates/:id",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const params = UpdateReceiptTemplateParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const parsed = UpdateReceiptTemplateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const config = receiptTemplateConfigSchema.parse(parsed.data.config);

      const [template] = await db
        .update(receiptTemplatesTable)
        .set({ name: parsed.data.name, config, updatedAt: new Date() })
        .where(eq(receiptTemplatesTable.id, params.data.id))
        .returning();
      if (!template) {
        return reply.code(404).send({ error: "Receipt template not found" });
      }
      return template;
    },
  );

  fastify.delete(
    "/receipt-templates/:id",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const params = DeleteReceiptTemplateParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }

      const [target] = await db
        .select()
        .from(receiptTemplatesTable)
        .where(eq(receiptTemplatesTable.id, params.data.id));
      if (!target) {
        return reply.code(404).send({ error: "Receipt template not found" });
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

      return reply.code(204).send();
    },
  );

  fastify.post(
    "/receipt-templates/:id/set-default",
    { preHandler: [requirePermission("settings")] },
    async (request, reply) => {
      const params = SetDefaultReceiptTemplateParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }

      const [target] = await db
        .select()
        .from(receiptTemplatesTable)
        .where(eq(receiptTemplatesTable.id, params.data.id));
      if (!target) {
        return reply.code(404).send({ error: "Receipt template not found" });
      }

      await db
        .update(receiptTemplatesTable)
        .set({ isDefault: false })
        .where(eq(receiptTemplatesTable.isDefault, true));

      const [template] = await db
        .update(receiptTemplatesTable)
        .set({ isDefault: true })
        .where(eq(receiptTemplatesTable.id, params.data.id))
        .returning();

      return template;
    },
  );
};

export default receiptTemplatesRoutes;
