# Nexus POS

Nexus POS is a shop sales & inventory management system: a web dashboard (Shop Manager) plus a mobile companion app (Nexus POS Mobile) for staff to run sales, browse inventory, and monitor stock from a phone/tablet, all backed by the same Express API and Postgres database.

## Run & Operate

- **API Server** (port 3001): `PORT=3001 pnpm --filter @workspace/api-server run dev` — managed by the "API Server" workflow
- **Shop frontend** (port 5000): `pnpm --filter @workspace/shop run dev` — managed by the "Start application" workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Secrets

| Variable | Description |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (same value, both names are read by frontend/backend respectively) |
| `CLERK_SECRET_KEY` | Clerk secret key — used by the API server's Clerk middleware and proxy |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary account credentials — required for the image-upload endpoint (`/api/storage/upload`); the API server still starts without them, but uploads fail until set |

`DATABASE_URL` is provided automatically by Replit's managed PostgreSQL. Set secrets via Replit Secrets — never commit real values to `.env` (see `.env.example` for the list of variables to configure).

## Setup (already done on Replit)

1. `pnpm install` — install all workspace dependencies
2. `pnpm --filter @workspace/db run push` — push Drizzle schema to the database
3. Clerk keys set as env vars/secrets (see above) — required for the frontend auth to load and the API server to start

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind CSS 4, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk
- Validation: Zod (v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/shop` — React + Vite frontend (Shop Manager UI)
- `artifacts/api-server` — Express 5 API server
- `artifacts/mockup-sandbox` — Design / Canvas artifact
- `lib/db` — Drizzle schema and database client
- `lib/api-spec` — OpenAPI spec + generated hooks and schemas
- `lib/api-client-react` — Generated TanStack Query hooks
- `lib/api-zod` — Generated Zod schemas

## Architecture decisions

- Auth is handled entirely by Clerk — the frontend uses `@clerk/react`, the API uses `@clerk/express` middleware
- The Vite dev server proxies `/api/*` to the Express server at port 3001, so the frontend never calls the API directly by absolute URL
- esbuild bundles the API server into a single ESM file (`dist/index.mjs`) on every `dev` start
- `VITE_CLERK_PUBLISHABLE_KEY` is used at build time by Vite, so a restart is required after changing it
- Image uploads (product photos, category photos, business logo) go through Cloudinary only: `POST /api/storage/upload` (`artifacts/api-server/src/routes/storage.ts` + `lib/cloudinary.ts`) uploads the file and returns a permanent Cloudinary URL, which the frontend stores directly on the record (`products.photo_url`, `settings.logo_url`). The frontend's `useUpload`/`ObjectUploader` (`lib/object-storage-web`) call that endpoint — despite the package name, there is no Replit Object Storage / GCS dependency anywhere in the app; the earlier GCS-backed `objectStorage.ts`/`objectAcl.ts` scaffolding was unused and has been removed

## Product

- **Shop Manager** (web, `artifacts/shop`): admin dashboard for categories, products, sales, and reporting
- **Nexus POS Mobile** (Expo, `artifacts/pos-mobile`): handheld register for retail staff

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend hard-errors on startup if `VITE_CLERK_PUBLISHABLE_KEY` is missing — set the secret and restart the "Start application" workflow
- The API Server workflow builds with esbuild before starting; this takes ~500ms on each restart
- After a fresh GitHub import, `node_modules` won't exist yet — run `pnpm install` at the workspace root before starting either workflow
- The root `.env` file is committed for local-dev reference only; it is **not** auto-loaded into the Replit process environment. Values needed at runtime (Clerk keys, etc.) must be set as real Replit env vars/secrets
- `cloudinary.ts` no longer throws at import time when Cloudinary credentials are missing — it only throws when `uploadImage()` is actually called, so the API server can start without them
- If API requests 500 with a Drizzle "Failed query" error on a fresh database, the schema hasn't been pushed yet — run `pnpm --filter @workspace/db run push`
- `.env` was previously committed to GitHub with a real `CLERK_SECRET_KEY` in it. It has since been removed from git tracking and added to `.gitignore` (`.env.example` holds placeholders instead), but the old key is still visible in the repo's git history — rotate `CLERK_SECRET_KEY` in the Clerk/Auth pane if this repo is or was public
