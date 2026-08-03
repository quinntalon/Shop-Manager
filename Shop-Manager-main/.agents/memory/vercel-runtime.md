---
name: Vercel runtime adapter
description: Runtime constraints for this project's Vercel Build Output API function.
---

When exposing the Fastify app through Vercel's Build Output API Node launcher,
adapt requests with `app.inject()` and copy the resulting status, headers, and
body to Vercel's response. Emitting directly through `app.server` assumes a
Node `ServerResponse` implementation and can fail before a route runs.

**Why:** The Vercel response object in this deployment path does not implement
all Node response event methods that Fastify expects.

**How to apply:** Keep the serverless adapter separate from the normal
long-running server entry point, and validate a real `/api/healthz` invocation
after changing the adapter.