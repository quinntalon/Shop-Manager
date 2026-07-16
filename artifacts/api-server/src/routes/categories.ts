import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireAnyRole, requirePermission } from "../middlewares/requireRole";

const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/categories",
    { preHandler: [requireAnyRole()] },
    async () => {
      const categories = await db
        .select()
        .from(categoriesTable)
        .orderBy(categoriesTable.name);
      return categories;
    },
  );

  fastify.post(
    "/categories",
    { preHandler: [requirePermission("categories")] },
    async (request, reply) => {
      const parsed = CreateCategoryBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const [category] = await db
        .insert(categoriesTable)
        .values(parsed.data)
        .returning();
      return reply.code(201).send(category);
    },
  );

  fastify.patch(
    "/categories/:id",
    { preHandler: [requirePermission("categories")] },
    async (request, reply) => {
      const params = UpdateCategoryParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const parsed = UpdateCategoryBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const [category] = await db
        .update(categoriesTable)
        .set(parsed.data)
        .where(eq(categoriesTable.id, params.data.id))
        .returning();
      if (!category) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return category;
    },
  );

  fastify.delete(
    "/categories/:id",
    { preHandler: [requirePermission("categories")] },
    async (request, reply) => {
      const params = DeleteCategoryParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const [category] = await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, params.data.id))
        .returning();
      if (!category) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return reply.code(204).send();
    },
  );
};

export default categoriesRoutes;
