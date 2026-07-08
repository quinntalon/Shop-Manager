import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq, isNotNull, count } from "drizzle-orm";
import { db, userRolesTable } from "@workspace/db";
import { USER_ROLES, type UserRoleType } from "@workspace/db";
import { requirePermission } from "../middlewares/requireRole";
import { z } from "zod/v4";

const router: IRouter = Router();

const RoleUpdateBody = z.object({
  role: z.enum(USER_ROLES).nullable(),
});

const ClerkUserIdParams = z.object({
  clerkUserId: z.string().min(1),
});

router.get("/users/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
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
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? "";
  } catch {
    req.log.warn("Could not fetch Clerk user info for %s", userId);
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

    const [row] = await db
      .insert(userRolesTable)
      .values({ clerkUserId: userId, name, email, role })
      .returning();

    const permissions = role
      ? (
          await import("../middlewares/requireRole").then(
            (m) => m.ROLE_PERMISSIONS[role] ?? []
          )
        )
      : [];

    res.json({ clerkUserId: userId, name, email, role, permissions });
    return;
  }

  await db
    .update(userRolesTable)
    .set({ name: name || existing.name, email: email || existing.email })
    .where(eq(userRolesTable.clerkUserId, userId));

  const { ROLE_PERMISSIONS } = await import("../middlewares/requireRole");
  const permissions = existing.role ? (ROLE_PERMISSIONS[existing.role] ?? []) : [];

  res.json({
    clerkUserId: userId,
    name: name || existing.name,
    email: email || existing.email,
    role: existing.role,
    permissions,
  });
});

router.get(
  "/users",
  requirePermission("users"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(userRolesTable)
      .orderBy(userRolesTable.createdAt);
    res.json(rows);
  }
);

router.patch(
  "/users/:clerkUserId",
  requirePermission("users"),
  async (req, res): Promise<void> => {
    const params = ClerkUserIdParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = RoleUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [row] = await db
      .update(userRolesTable)
      .set({ role: parsed.data.role as UserRoleType | null })
      .where(eq(userRolesTable.clerkUserId, params.data.clerkUserId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(row);
  }
);

router.delete(
  "/users/:clerkUserId",
  requirePermission("users"),
  async (req, res): Promise<void> => {
    const params = ClerkUserIdParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .delete(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, params.data.clerkUserId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.sendStatus(204);
  }
);

export default router;
