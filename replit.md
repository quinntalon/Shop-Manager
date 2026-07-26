# SyncCart

A point-of-sale and shop management system with inventory tracking, sales recording, and category management.

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, TanStack Query (`frontend/`)
- **Backend**: Fastify 5 API server (`backend/`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db/`)
- **Auth**: Clerk (dev keys pre-configured)
- **Image uploads**: Cloudinary (pre-configured)
- **API codegen**: Orval from OpenAPI spec (`lib/api-spec/`)

## How to Run

Two workflows run in parallel (started automatically via the run button):

| Workflow | Command | Port |
|---|---|---|
| API Server | `PORT=3001 pnpm --filter @workspace/api-server run dev` | 3001 |
| Start application | `pnpm --filter @workspace/shop run dev` | 5000 |

The frontend proxies `/api/*` to the API server on port 3001.

## Environment Variables

All required env vars are already set in the Replit environment:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Runtime-managed by Replit — do not set manually |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dev key (pre-configured) |
| `CLERK_PUBLISHABLE_KEY` | Clerk dev key (pre-configured) |
| `CLERK_SECRET_KEY` | Clerk dev secret (pre-configured) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary (pre-configured) |
| `CLOUDINARY_API_KEY` | Cloudinary (pre-configured) |
| `CLOUDINARY_API_SECRET` | Cloudinary (pre-configured) |
| `SESSION_SECRET` | Stored as a Replit Secret |

## Common Commands

```bash
# Install dependencies
pnpm install

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Full typecheck
pnpm run typecheck

# Typecheck + build all packages
pnpm run build

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Vercel Deployment

The repository includes a Vercel Build Output API configuration. From the repository
root, Vercel uses:

- Install command: `pnpm install`
- Build command: `node build.vercel.mjs`

Configure these environment variables in the Vercel project for the relevant
environments before deploying:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY` (required during the frontend build; the build
  also accepts `CLERK_PUBLISHABLE_KEY` as a public-key fallback)
- `SESSION_SECRET`

The Cloudinary variables are also required for image uploads:
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
The database must be reachable from Vercel's serverless runtime; Replit's
runtime-managed development database URL should not be copied blindly into an
external Vercel project.

The API health endpoint is `/api/healthz`. The frontend is served as a static SPA,
while `/api/*` is routed to the bundled Fastify serverless function.
After changing any Vercel environment variable, create a new deployment and
disable the build cache for that deployment so the frontend bundle is rebuilt
with the new public Clerk key.

## Project Layout

```
frontend/          # @workspace/shop — React + Vite frontend
backend/           # @workspace/api-server — Fastify API server
lib/
  db/              # @workspace/db — Drizzle schema and DB client
  api-spec/        # OpenAPI spec + generated hooks and schemas
  api-zod/         # Zod schemas derived from the API spec
  api-client-react/# React Query hooks for the API
  object-storage-web/
scripts/           # Utility scripts (post-merge, etc.)
```

## User Preferences
