/**
 * Vercel serverless function entry point.
 *
 * All /api/* requests are routed here (see vercel.json rewrites).
 * @vercel/node bundles this file with esbuild and exposes it as a
 * serverless function; Express handles the internal routing.
 */
import app from "../backend/src/app";

export default app;
