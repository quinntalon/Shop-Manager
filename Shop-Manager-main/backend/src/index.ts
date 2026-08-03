import { buildApp } from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const app = await buildApp();

try {
  // Bind to 0.0.0.0 so the server is reachable in containerised environments
  // (Replit preview, Cloud Run, etc.)
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port }, "Server listening");
} catch (err) {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
}
