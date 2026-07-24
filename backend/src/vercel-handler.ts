/**
 * Vercel Serverless Function Entry Point
 *
 * Wraps the Fastify app as a Node.js HTTP handler compatible with
 * Vercel's serverless runtime. The Fastify instance is cached across
 * warm invocations to avoid rebuilding on every request.
 *
 * Built by `pnpm --filter @workspace/api-server run build:vercel`
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app.js";

process.env.NODE_ENV ??= "production";

// Check required env vars early so the error message is clear in Vercel logs.
const REQUIRED = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[vercel-handler] Missing required env vars: ${missing.join(", ")}`);
}

// Initialize the app eagerly — Vercel keeps the function warm between
// invocations so this runs once per cold start.
let appPromise: Promise<Awaited<ReturnType<typeof buildApp>>> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp();
    app.server.emit("request", req, res);
  } catch (err) {
    console.error("[vercel-handler] Fatal startup error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Server failed to start",
      detail: err instanceof Error ? err.message : String(err),
    }));
    // Reset so the next request tries again (env vars may be fixed via redeploy).
    appPromise = null;
  }
}
