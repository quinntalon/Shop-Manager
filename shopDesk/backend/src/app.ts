import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import router from "./routes/";
import { logger } from "./lib/logger";

export async function buildApp() {
  const app = Fastify({
    // Re-use the existing pino logger instance so log config (level, redact,
    // pretty-print in dev) is applied consistently.
    loggerInstance: logger,
  });

  // The app uses same-origin HTTP-only sessions. Keep credentials enabled for
  // local development and deployments where the frontend/API are separated.
  await app.register(cors, { credentials: true, origin: true });

  // Multipart — used by the storage/upload route (replaces multer)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // All API routes under /api
  await app.register(router, { prefix: "/api" });

  return app;
}

export default buildApp;
