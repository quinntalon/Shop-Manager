/**
 * Vercel Serverless Function Entry Point
 *
 * Wraps the Fastify app as a Node.js HTTP handler compatible with
 * Vercel's @vercel/node runtime. The Fastify instance is cached across
 * warm invocations to avoid rebuilding on every request.
 *
 * Built by `pnpm --filter @workspace/api-server run build:vercel`
 * → output: api/index.mjs (picked up by Vercel automatically)
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app.js";

process.env.NODE_ENV ??= "production";

// Initialize the app eagerly so it is ready before the first request.
// Vercel keeps the function warm between invocations, so this runs once
// per cold start.
const appPromise = (async () => {
  const app = await buildApp();
  await app.ready();
  return app;
})();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await appPromise;
  // Delegate to Fastify's underlying Node HTTP server — this preserves
  // the full URL (path + query string) so Fastify routing works correctly.
  app.server.emit("request", req, res);
}
