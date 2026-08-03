/**
 * Clerk Frontend API Proxy Plugin (Fastify)
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be registered BEFORE the JSON body parser / other plugins that consume
 *   the request body, because proxy routes need the raw body stream.
 *
 * Usage in app.ts:
 *   import { clerkProxyPlugin } from "./middlewares/clerkProxyMiddleware";
 *   await app.register(clerkProxyPlugin);
 */

import type { FastifyInstance } from "fastify";
import type { IncomingHttpHeaders } from "http";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(",")[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

/** Hop-by-hop headers that must not be forwarded (RFC 7230 §6.1). */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export async function clerkProxyPlugin(fastify: FastifyInstance): Promise<void> {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") return;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;

  // Parse the body as a raw Buffer for proxy routes so the bytes can be
  // forwarded verbatim to Clerk without any JSON/form decoding.
  fastify.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  fastify.all(`${CLERK_PROXY_PATH}/*`, async (request, reply) => {
    // Strip the proxy prefix to get the Clerk FAPI path
    const clerkPath = request.url.slice(CLERK_PROXY_PATH.length) || "/";
    const targetUrl = `${CLERK_FAPI}${clerkPath}`;

    // Determine proxy URL (sent to Clerk as Clerk-Proxy-Url header)
    const protocol = (request.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const host = getClerkProxyHost(request.raw) ?? "";
    const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

    // Resolve client IP
    const xff = request.headers["x-forwarded-for"];
    const clientIp =
      (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
      request.socket?.remoteAddress ||
      "";

    // Forward headers, stripping hop-by-hop ones
    const upstreamHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(request.headers)) {
      if (HOP_BY_HOP.has(k.toLowerCase()) || v === undefined) continue;
      upstreamHeaders[k] = Array.isArray(v) ? v.join(", ") : v;
    }
    upstreamHeaders["host"] = "frontend-api.clerk.dev";
    upstreamHeaders["clerk-proxy-url"] = proxyUrl;
    upstreamHeaders["clerk-secret-key"] = secretKey;
    if (clientIp) upstreamHeaders["x-forwarded-for"] = clientIp;

    // Pass raw body bytes (Buffer from our content-type parser, or nothing for bodyless methods)
    const rawBody =
      request.body instanceof Buffer && request.body.length > 0
        ? request.body
        : undefined;

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: rawBody,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – Node fetch needs duplex when a body stream is present
      duplex: "half",
    });

    // Build response headers, stripping hop-by-hop and Content-Length
    // (we will recompute it after buffering).
    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      if (key.toLowerCase() === "content-length") return; // recomputed below
      responseHeaders[key] = value;
    });

    const status = upstream.status;

    // Body-less responses: 1xx, 204, 304, and HEAD replies
    const isBodyless =
      request.method === "HEAD" ||
      status < 200 ||
      status === 204 ||
      status === 304;

    if (isBodyless) {
      reply.code(status).headers(responseHeaders).send("");
      return;
    }

    // Buffer the body so we can set a Content-Length (the deployment edge
    // rejects chunked Transfer-Encoding).
    const arrayBuffer = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    responseHeaders["content-length"] = String(buf.length);

    reply.code(status).headers(responseHeaders).send(buf);
  });
}
