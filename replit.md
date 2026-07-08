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
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key — find it in the Clerk dashboard under API Keys (starts with `pk_test_` or `pk_live_`) |

`DATABASE_URL` is provided automatically by Replit's managed PostgreSQL.

## Setup (already done on Replit)

1. `pnpm install` — install all workspace dependencies
2. `pnpm --filter @workspace/db run push` — push Drizzle schema to the database
3. Add `VITE_CLERK_PUBLISHABLE_KEY` secret — required for the frontend auth to load

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

## Product

- **Shop Manager** (web, `artifacts/shop`): admin dashboard for categories, products, sales, and reporting
- **Nexus POS Mobile** (Expo, `artifacts/pos-mobile`): handheld register for retail staff

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend hard-errors on startup if `VITE_CLERK_PUBLISHABLE_KEY` is missing — set the secret and restart the "Start application" workflow
- The API Server workflow builds with esbuild before starting; this takes ~500ms on each restart
