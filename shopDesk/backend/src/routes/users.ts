import type { FastifyPluginAsync } from "fastify";
import { getAuth, clerkClient } from "@clerk/fastify";
import { eq, isNotNull, count } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import { USER_ROLES, type UserRoleType } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const RoleUpdateBody = z.object({
  role: z.enum(USER_ROLES).nullable(),
  permissions: z.array(z.string()).nullable().optional(),
});

const ClerkUserIdParams = z.object({
  clerkUserId: z.string().min(1),
});

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/users/me", async (request, reply) => {
    const { userId } = getAuth(request);
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    let name = "";
    let email = "";
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        "";
      email =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? "";
    } catch {
      request.log.warn("Could not fetch Clerk user info for %s", userId);
    }

    const [existing] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId));

    if (!existing) {
      const [adminCount] = await db
        .select({ count: count() })
        .from(userRolesTable)
        .where(isNotNull(userRolesTable.role));

      const isFirst = adminCount.count === 0;
      const role: UserRoleType | null = isFirst ? "admin" : null;

      await db
        .insert(userRolesTable)
        .values({ clerkUserId: userId, name, email, role })
        .returning();

      const permissions = role
        ? (
            await import("../middlewares/requireRole").then(
              (m) => m.ROLE_PERMISSIONS[role] ?? [],
            )
          )
        : [];

      return { clerkUserId: userId, name, email, role, permissions };
    }

    await db
      .update(userRolesTable)
      .set({ name: name || existing.name, email: email || existing.email })
      .where(eq(userRolesTable.clerkUserId, userId));

    const { ROLE_PERMISSIONS } = await import("../middlewares/requireRole");
    const effectivePermissions: string[] =
      existing.permissions && existing.permissions.length > 0
        ? existing.permissions
        : existing.role
          ? (ROLE_PERMISSIONS[existing.role] ?? [])
          : [];

    return {
      clerkUserId: userId,
      name: name || existing.name,
      email: email || existing.email,
      role: existing.role,
      permissions: effectivePermissions,
    };
  });

  fastify.get(
    "/users",
    { preHandler: [requirePermission("users")] },
    async () => {
      const rows = await db
        .select()
        .from(userRolesTable)
        .orderBy(userRolesTable.createdAt);
      return rows;
    },
  );

  fastify.patch(
    "/users/:clerkUserId",
    { preHandler: [requirePermission("users")] },
    async (request, reply) => {
      const params = ClerkUserIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const parsed = RoleUpdateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }

      const updateData: { role: UserRoleType | null; permissions?: string[] | null } = {
        role: parsed.data.role as UserRoleType | null,
      };
      if ("permissions" in parsed.data) {
        updateData.permissions = parsed.data.permissions ?? null;
      }

      const [row] = await db
        .update(userRolesTable)
        .set(updateData)
        .where(eq(userRolesTable.clerkUserId, params.data.clerkUserId))
        .returning();

      if (!row) {
        return reply.code(404).send({ error: "User not found" });
      }
      return row;
    },
  );

  fastify.delete(
    "/users/:clerkUserId",
    { preHandler: [requirePermission("users")] },
    async (request, reply) => {
      const params = ClerkUserIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: params.error.message });
      }
      const [row] = await db
        .delete(userRolesTable)
        .where(eq(userRolesTable.clerkUserId, params.data.clerkUserId))
        .returning();

      if (!row) {
        return reply.code(404).send({ error: "User not found" });
      }
      return reply.code(204).send();
    },
  );
};

export default usersRoutes;
