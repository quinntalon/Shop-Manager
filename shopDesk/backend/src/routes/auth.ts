import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, userRolesTable } from "@workspace/db";
import {
  createSession,
  destroySession,
  hashPassword,
  requireCurrentUser,
  verifyPassword,
} from "../lib/auth";
import { ROLE_PERMISSIONS } from "../middlewares/requireRole";

const RegistrationBody = z.object({
  fullName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(240),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,40}$/),
  password: z.string().min(8).max(128),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(5).max(40),
  nextOfKinName: z.string().trim().min(2).max(120),
  nextOfKinPhone: z.string().trim().min(5).max(40),
  position: z.string().trim().min(2).max(120),
  applicationNotes: z.string().trim().max(1000).optional().default(""),
});

const LoginBody = z.object({
  username: z.string().trim().toLowerCase().min(3),
  password: z.string().min(1),
});

function publicUser(user: typeof userRolesTable.$inferSelect) {
  return {
    id: user.id,
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

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/auth/register", async (request, reply) => {
    const parsed = RegistrationBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const [existing] = await db
      .select({ id: userRolesTable.id })
      .from(userRolesTable)
      .where(eq(userRolesTable.username, parsed.data.username));
    if (existing) {
      return reply.code(409).send({ error: "That username is already in use." });
    }

    const [user] = await db
      .insert(userRolesTable)
      .values({
        username: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password),
        name: parsed.data.fullName,
        email: parsed.data.email ?? "",
        address: parsed.data.address,
        phone: parsed.data.phone,
        nextOfKinName: parsed.data.nextOfKinName,
        nextOfKinPhone: parsed.data.nextOfKinPhone,
        position: parsed.data.position,
        applicationNotes: parsed.data.applicationNotes ?? "",
        status: "pending",
        role: null,
      })
      .returning();

    await createSession(user.id, reply);
    return reply.code(201).send({
      status: "pending",
      message: "Your application was submitted and is waiting for admin approval.",
      user: publicUser(user),
    });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Enter a valid username and password." });
    }

    const [user] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.username, parsed.data.username));
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Incorrect username or password." });
    }
    if (user.status === "rejected") {
      return reply.code(403).send({ error: "Your application was not approved." });
    }

    await createSession(user.id, reply);
    return reply.send({ user: publicUser(user) });
  });

  fastify.get("/auth/me", async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const resolvedPermissions =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : user.role
          ? (ROLE_PERMISSIONS[user.role] ?? [])
          : [];
    return reply.send({ user: { ...publicUser(user), permissions: resolvedPermissions } });
  });

  fastify.post("/auth/logout", async (request, reply) => {
    await destroySession(request, reply);
    return reply.send({ ok: true });
  });

  fastify.get("/auth/status", async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    return reply.send({ status: user.status, role: user.role });
  });

  /**
   * Bootstrap endpoint: promotes the currently logged-in user to admin.
   * Only works when NO approved admin exists yet — a one-time setup safety valve.
   */
  fastify.post("/auth/bootstrap-admin", async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;

    // Check if any admin already exists
    const [existingAdmin] = await db
      .select({ id: userRolesTable.id })
      .from(userRolesTable)
      .where(
        eq(userRolesTable.role, "admin"),
      );

    if (existingAdmin) {
      return reply.code(403).send({ error: "An admin account already exists. Use the Users page to manage roles." });
    }

    const [updated] = await db
      .update(userRolesTable)
      .set({ role: "admin", status: "approved" })
      .where(eq(userRolesTable.id, user.id))
      .returning();

    return reply.send({ message: "You are now an admin.", user: publicUser(updated) });
  });
};

export default authRoutes;