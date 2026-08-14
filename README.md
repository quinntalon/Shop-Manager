# ShopDesk

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
| Auth | Custom session-based auth (scrypt + HttpOnly cookies) |
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
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (image uploads, optional) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (optional) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (optional) |
| `PORT` | Server port for local dev (not used on Vercel) |
| `BASE_PATH` | Frontend base path, defaults to `/` |

## First-Time Setup

After deploying, you need to create an admin account:

1. Register a user account via the sign-up page
2. Log in, then run this in the browser console:
   ```js
   fetch('/api/auth/bootstrap-admin', { method: 'POST', credentials: 'same-origin' })
     .then(r => r.json()).then(console.log)
   ```
3. Refresh — you now have full admin access
4. Use the Users page to approve and assign roles to other users

This endpoint is permanently disabled once any admin account exists.

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

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full Vercel deployment instructions.
