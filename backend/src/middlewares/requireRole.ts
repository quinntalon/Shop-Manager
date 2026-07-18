import type { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "@clerk/fastify";
import { eq } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import type { UserRoleType } from "@workspace/db";

export type Permission =
  | "dashboard"
  | "inventory"
  | "sales"
  | "categories"
  | "users"
  | "settings"
  | "customers"
  | "reports";

export const ROLE_PERMISSIONS: Record<UserRoleType, Permission[]> = {
  admin: ["dashboard", "inventory", "sales", "categories", "users", "settings", "customers", "reports"],
  salesperson: ["dashboard", "sales", "customers", "reports"],
  cashier: ["sales"],
};

export function requirePermission(...permissions: Permission[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    const [row] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId));
    if (!row || !row.role) {
      reply.code(403).send({ error: "No role assigned. Contact an admin." });
      return;
    }
    const userPerms: string[] =
      row.permissions && row.permissions.length > 0
        ? row.permissions
        : (ROLE_PERMISSIONS[row.role] ?? []);
    if (!permissions.every((p) => userPerms.includes(p))) {
      reply.code(403).send({ error: "Insufficient permissions." });
      return;
    }
  };
}

export function requireAnyRole() {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    const [row] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId));
    if (!row || !row.role) {
      reply.code(403).send({ error: "No role assigned. Contact an admin." });
      return;
    }
  };
}
