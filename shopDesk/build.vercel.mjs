/**
 * Vercel Build Output API orchestrator.
 *
 * Produces .vercel/output/ so Vercel deploys our pre-built artifacts
 * directly instead of trying to auto-detect and re-bundle them.
 *
 * Spec: https://vercel.com/docs/build-output-api/v3
 */

import { mkdir, rm, cp, writeFile, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const vercelOut   = path.join(root, ".vercel/output");
const staticOut   = path.join(vercelOut, "static");
const funcDir     = path.join(vercelOut, "functions/api/index.func");

// ── 1. Clean previous output ──────────────────────────────────────────────
console.log("\n📦  Cleaning .vercel/output …");
await rm(vercelOut, { recursive: true, force: true });
await mkdir(staticOut,  { recursive: true });
await mkdir(funcDir,    { recursive: true });

// ── 2. Build API bundle → repo-root/api/ ─────────────────────────────────
console.log("\n🔨  Building API serverless bundle …");
execSync("pnpm --filter @workspace/api-server run build:vercel", {
  stdio: "inherit",
  cwd: root,
});

// ── 3. Build frontend → frontend/dist/public/ ─────────────────────────────
console.log("\n🔨  Building frontend …");
execSync("pnpm --filter @workspace/shop run build", {
  stdio: "inherit",
  cwd: root,
});

// ── 4. Copy frontend static files ─────────────────────────────────────────
console.log("\n📂  Copying frontend → .vercel/output/static …");
await cp(path.join(root, "frontend/dist/public"), staticOut, { recursive: true });

// ── 5. Copy API bundle files into the function directory ──────────────────
console.log("\n📂  Copying API bundle → .vercel/output/functions/api/index.func …");
const apiSrcDir = path.join(root, "api");
for (const file of await readdir(apiSrcDir)) {
  await cp(path.join(apiSrcDir, file), path.join(funcDir, file));
}

// ── 6. Write Vercel function config (.vc-config.json) ────────────────────
await writeFile(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: false,
    },
    null,
    2,
  ),
);

// ── 7. Write top-level Vercel output config ───────────────────────────────
await writeFile(
  path.join(vercelOut, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Route all /api/* requests to the serverless function
        { src: "^/api/(.*)$", dest: "/api/index" },
        // Serve static assets from the filesystem (hashed JS/CSS/etc.)
        { handle: "filesystem" },
        // SPA fallback — everything else renders index.html
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("\n✅  .vercel/output/ ready for deployment\n");
