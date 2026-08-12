import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, userRolesTable } from "@workspace/db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "shopdesk_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = typeof userRolesTable.$inferSelect;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}

function getCookie(request: FastifyRequest, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  const value = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

function setSessionCookie(reply: FastifyReply, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  reply.header(
    "set-cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  );
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header(
    "set-cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export async function createSession(userId: number, reply: FastifyReply): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  setSessionCookie(reply, token);
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashSessionToken(token)));
  }
  clearSessionCookie(reply);
}

export async function getCurrentUser(request: FastifyRequest): Promise<AuthUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const [row] = await db
    .select({ user: userRolesTable })
    .from(sessionsTable)
    .innerJoin(userRolesTable, eq(sessionsTable.userId, userRolesTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, hashSessionToken(token)),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    );

  return row?.user ?? null;
}

export async function requireCurrentUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const user = await getCurrentUser(request);
  if (!user) {
    reply.code(401).send({ error: "Please sign in to continue." });
    return null;
  }
  return user;
}