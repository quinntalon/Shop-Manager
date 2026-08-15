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

process.env.NODE_ENV ??= "production";

// Check required env vars early so the error message is clear in Vercel logs.
const REQUIRED = ["DATABASE_URL"];
type BuildApp = (typeof import("./app.js"))["buildApp"];
type App = Awaited<ReturnType<BuildApp>>;

function missingRequiredEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key]);
}

// Initialize the app eagerly — Vercel keeps the function warm between
// invocations so this runs once per cold start.
let appPromise: Promise<App> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      // Import after validation so a missing DATABASE_URL produces a useful
      // response instead of a module-initialization crash from the DB client.
      const { buildApp } = await import("./app.js");
      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

async function readRequestBody(
  req: IncomingMessage,
): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const missing = missingRequiredEnv();
  if (missing.length > 0) {
    console.error(
      `[vercel-handler] Missing required env vars: ${missing.join(", ")}`,
    );
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Server configuration is incomplete",
        missing,
        hint: "Add the missing variables to the Vercel Production environment and redeploy.",
      }),
    );
    return;
  }

  try {
    const app = await getApp();
    const response = await app.inject({
      method: (req.method ?? "GET") as "GET",
      url: req.url ?? "/",
      headers: req.headers,
      payload: await readRequestBody(req),
    });
    const injectedResponse = response as unknown as {
      headers: Record<string, string | string[] | number | undefined>;
      statusCode: number;
      rawPayload: Buffer;
    };

    for (const [name, value] of Object.entries(injectedResponse.headers)) {
      if (value === undefined) continue;
      // set-cookie must use setHeader with an array to preserve multiple values
      if (name.toLowerCase() === "set-cookie") {
        const cookies = Array.isArray(value) ? value : [String(value)];
        res.setHeader("set-cookie", cookies);
      } else {
        res.setHeader(name, value as string | number | string[]);
      }
    }
    res.statusCode = injectedResponse.statusCode;
    res.end(injectedResponse.rawPayload);
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
