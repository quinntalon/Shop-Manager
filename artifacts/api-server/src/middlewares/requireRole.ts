import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import type { UserRoleType } from "@workspace/db";

export type Permission =
  | "dashboard"
  | "inventory"
  | "sales"
  | "categories"
  | "users"
  | "settings";

export const ROLE_PERMISSIONS: Record<UserRoleType, Permission[]> = {
  admin: ["dashboard", "inventory", "sales", "categories", "users", "settings"],
  salesperson: ["dashboard", "sales"],
  cashier: ["sales"],
};

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [row] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId));
    if (!row || !row.role) {
      res.status(403).json({ error: "No role assigned. Contact an admin." });
      return;
    }
    const userPerms = ROLE_PERMISSIONS[row.role] ?? [];
    if (!permissions.every((p) => userPerms.includes(p))) {
      res.status(403).json({ error: "Insufficient permissions." });
      return;
    }
    next();
  };
}

export function requireAnyRole() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [row] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, userId));
    if (!row || !row.role) {
      res.status(403).json({ error: "No role assigned. Contact an admin." });
      return;
    }
    next();
  };
}
