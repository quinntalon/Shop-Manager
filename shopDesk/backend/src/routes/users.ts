import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import { USER_ROLES, type UserRoleType } from "@workspace/db";
import { getCurrentUser } from "../lib/auth";
import { requirePermission, ROLE_PERMISSIONS } from "../middlewares/requireRole";
import { z } from "zod/v4";

const UserParams = z.object({ clerkUserId: z.string().min(1) });
const RoleUpdateBody = z.object({
  role: z.enum(USER_ROLES).nullable(),
  permissions: z.array(z.string()).nullable().optional(),
});
const StatusUpdateBody = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

function publicUser(user: typeof userRolesTable.$inferSelect) {
  return {
    id: user.id,
    // Kept as an API compatibility name for the generated client. This is
    // now the local username and is not a Clerk identifier.
    clerkUserId: user.username,
    username: user.username,
    name: user.name,
    email: user.email,
    address: user.address,
    phone: user.phone,
    nextOfKinName: user.nextOfKinName,
    nextOfKinPhone: user.nextOfKinPhone,
    position: user.position,
    applicationNotes: user.applicationNotes,
    status: user.status,
    role: user.role,
    permissions: user.permissions ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/users/me", async (request, reply) => {
    const user = await getCurrentUser(request);
    if (!user) return reply.code(401).send({ error: "Please sign in to continue." });
    return reply.send({
      ...publicUser(user),
      permissions:
        user.permissions && user.permissions.length > 0
          ? user.permissions
          : user.role
            ? (ROLE_PERMISSIONS[user.role] ?? [])
            : [],
    });
  });

  fastify.get("/users", { preHandler: [requirePermission("users")] }, async () => {
    const rows = await db.select().from(userRolesTable).orderBy(userRolesTable.createdAt);
    return rows.map(publicUser);
  });

  fastify.patch(
    "/users/:clerkUserId",
    { preHandler: [requirePermission("users")] },
    async (request, reply) => {
      const params = UserParams.safeParse(request.params);
      const parsed = RoleUpdateBody.safeParse(request.body);
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid user or role data." });
      }

      const updates: {
        role: UserRoleType | null;
        permissions?: string[] | null;
        status: "pending" | "approved" | "rejected";
      } = {
        role: parsed.data.role as UserRoleType | null,
        status: parsed.data.role ? "approved" : "pending",
      };
      if ("permissions" in parsed.data) updates.permissions = parsed.data.permissions ?? null;

      const [row] = await db
        .update(userRolesTable)
        .set(updates)
        .where(eq(userRolesTable.username, params.data.clerkUserId))
        .returning();
      if (!row) return reply.code(404).send({ error: "User not found." });
      return publicUser(row);
    },
  );

  fastify.patch(
    "/users/:clerkUserId/status",
    { preHandler: [requirePermission("users")] },
    async (request, reply) => {
      const params = UserParams.safeParse(request.params);
      const parsed = StatusUpdateBody.safeParse(request.body);
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: "Invalid application status." });
      }

      const [row] = await db
        .update(userRolesTable)
        .set({
          status: parsed.data.status,
          role: parsed.data.status === "approved" ? "cashier" : null,
        })
        .where(eq(userRolesTable.username, params.data.clerkUserId))
        .returning();
      if (!row) return reply.code(404).send({ error: "User not found." });
      return publicUser(row);
    },
  );

  fastify.delete(
    "/users/:clerkUserId",
    { preHandler: [requirePermission("users")] },
    async (request, reply) => {
      const params = UserParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: "Invalid user." });

      const current = await getCurrentUser(request);
      if (current?.username === params.data.clerkUserId) {
        return reply.code(400).send({ error: "You cannot delete your own account." });
      }
      const [row] = await db
        .delete(userRolesTable)
        .where(eq(userRolesTable.username, params.data.clerkUserId))
        .returning();
      if (!row) return reply.code(404).send({ error: "User not found." });
      return reply.code(204).send();
    },
  );
};

export default usersRoutes;