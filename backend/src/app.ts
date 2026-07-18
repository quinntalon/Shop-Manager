import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { clerkPlugin } from "@clerk/fastify";
import { clerkProxyPlugin } from "./middlewares/clerkProxyMiddleware";
import router from "./routes/";
import { logger } from "./lib/logger";

export async function buildApp() {
  const app = Fastify({
    // Re-use the existing pino logger instance so log config (level, redact,
    // pretty-print in dev) is applied consistently.
    loggerInstance: logger,
  });

  // Clerk proxy must be registered first — its content-type parser for raw
  // Buffer bodies must not be overridden by later plugins on those routes.
  await app.register(clerkProxyPlugin);

  // CORS — mirrors the previous Express cors({ credentials: true, origin: true })
  await app.register(cors, { credentials: true, origin: true });

  // Multipart — used by the storage/upload route (replaces multer)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // Clerk authentication middleware
  // Reads CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY from the environment
  // automatically; no need to pass them explicitly.
  await app.register(clerkPlugin);

  // All API routes under /api
  await app.register(router, { prefix: "/api" });

  return app;
}

export default buildApp;
