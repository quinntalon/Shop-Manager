import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import { getCurrentUser } from "../lib/auth";

export type Permission =
  | "dashboard"
  | "inventory"
  | "sales"
  | "categories"
  | "users"
  | "settings"
  | "customers"
  | "reports";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ["dashboard", "inventory", "sales", "categories", "users", "settings", "customers", "reports"],
  salesperson: ["dashboard", "sales", "customers"],
  cashier: ["sales"],
};

export function requirePermission(...permissions: Permission[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await getCurrentUser(req);
    if (!user) {
      reply.code(401).send({ error: "Please sign in to continue." });
      return;
    }
    if (user.status !== "approved" || !user.role) {
      reply.code(403).send({ error: "Your application is waiting for admin approval." });
      return;
    }
    const userPerms: string[] =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : (ROLE_PERMISSIONS[user.role] ?? []);
    if (!permissions.every((p) => userPerms.includes(p))) {
      reply.code(403).send({ error: "Insufficient permissions." });
    }
  };
}

export function requireAnyRole() {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await getCurrentUser(req);
    if (!user) {
      reply.code(401).send({ error: "Please sign in to continue." });
      return;
    }
    if (user.status !== "approved" || !user.role) {
      reply.code(403).send({ error: "Your application is waiting for admin approval." });
    }
  };
}