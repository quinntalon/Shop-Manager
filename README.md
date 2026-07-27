# ShopManager

A modern point-of-sale and shop management system. Built as a pnpm monorepo with a React frontend and Fastify API backend.

## Features

- Sales recording and transaction history
- Inventory and stock management with transfer tracking
- Customer management
- Category management
- Role-based access (Admin, Salesperson, Cashier)
- Customisable receipt builder with A4/58mm/80mm paper sizes
- Reports and analytics
- Light/dark theme

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces, Node.js 24, TypeScript 5.9 |
| Frontend | React 19, Vite 7, Tailwind CSS 4, TanStack Query |
| Backend | Fastify 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| Validation | Zod v4, drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |

## Project Layout

```
frontend/        # @workspace/shop — React + Vite SPA
backend/         # @workspace/api-server — Fastify API
lib/
  db/            # Drizzle schema and database client
  api-spec/      # OpenAPI spec + generated hooks and schemas
  api-zod/       # Zod schemas derived from the API spec
  api-client-react/ # React Query hooks
scripts/         # Utility scripts
```

## Quick Start

```bash
pnpm install

# API server — port 3001
PORT=3001 pnpm --filter @workspace/api-server run dev

# Frontend — port 5000 (in a second terminal)
pnpm --filter @workspace/shop run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend build) |
| `SESSION_SECRET` | Session signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (image uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Common Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## CI

Every push and pull request to `main` runs a full typecheck via GitHub Actions (`.github/workflows/ci.yml`).
