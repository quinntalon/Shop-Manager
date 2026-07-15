# SyncCart

A point-of-sale and shop management system with inventory tracking, sales recording, and category management. Built as a pnpm monorepo with a React frontend and Express API backend.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the API server (port 5000)
pnpm --filter @workspace/api-server run dev

# In another terminal, run the shop frontend
pnpm --filter @workspace/shop run dev
```

Open the preview or visit the root path (`/`) for the Shop Manager UI and `/api` for the API.

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (auth) |

## Common Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Typecheck + build all packages
pnpm run build

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Regenerate API hooks and Zod schemas from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, TanStack Query
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk
- **Validation**: Zod (v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project Layout

```
artifacts/
  shop/          # React + Vite frontend (Shop Manager UI)
  api-server/    # Express 5 API server
  mockup-sandbox/# Design / Canvas artifact
lib/
  db/            # Drizzle schema and database client
  api-spec/      # OpenAPI spec + generated hooks and schemas
scripts/         # Utility scripts
```

## CI

Every push and pull request to `main` runs a full typecheck via GitHub Actions (`.github/workflows/ci.yml`).
