# SyncCart

A point-of-sale and shop management system with inventory tracking, sales recording, and category management.

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **ShopDesk frontend**: React 19, Vite 7, Tailwind CSS 4, TanStack Query (`shopDesk/frontend/`)
- **Storefront**: React 19, Vite 7, Tailwind CSS 4 — customer-facing store (`storefront/`)
- **Backend**: Fastify 5 API server — shared by both frontends (`shopDesk/backend/`)
- **Database**: PostgreSQL + Drizzle ORM (`shopDesk/lib/db/`)
- **Auth**: Clerk (dev keys pre-configured)
- **Image uploads**: Cloudinary (pre-configured)
- **API codegen**: Orval from OpenAPI spec (`shopDesk/lib/api-spec/`)

## Project Layout

```
shopDesk/          # Management app (admin/POS)
  frontend/        #   @workspace/shop — React + Vite SPA
  backend/         #   @workspace/api-server — Fastify API (shared with storefront)
  lib/
    db/            #   @workspace/db — Drizzle schema and DB client
    api-spec/      #   OpenAPI spec + generated hooks and schemas
    api-zod/       #   Zod schemas derived from the API spec
    api-client-react/ # React Query hooks for the API
    object-storage-web/
  scripts/         #   Utility scripts

storefront/        # @workspace/storefront — customer-facing store (React + Vite)
```

Both frontends talk to the **same backend API** (`shopDesk/backend/`):
- In dev, both proxy `/api/*` to `localhost:3001` via Vite's dev server proxy.
- When deploying the storefront to a separate domain, set `VITE_API_URL=https://your-api-domain.com` in the storefront build.

## How to Run

Three workflows run in parallel (started automatically via the run button):

| Workflow | Command | Port |
|---|---|---|
| API Server | `PORT=3001 pnpm --filter @workspace/api-server run dev` | 3001 |
| Start application | `pnpm --filter @workspace/shop run dev` | 5000 |
| Storefront | `PORT=5001 pnpm --filter @workspace/storefront run dev` | 5001 |

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

## Vercel Deployment (ShopDesk)

The ShopDesk app (management + API) includes a Vercel Build Output API configuration at `shopDesk/vercel.json`. Vercel uses:

- Install command: `pnpm install`
- Build command: `node shopDesk/build.vercel.mjs`

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


## Receipt Editor

The receipt editor (`/settings/receipt-editor`) is a fully dynamic, database-driven builder stored as JSONB in `receipt_templates.config`. Key features added:

- **A4 paper size** in addition to 58mm/80mm
- **Duplicate / Export JSON / Import JSON / Reset to Default** template actions
- **Logo size slider** (24–150px)
- **Border style** (none/solid/dashed), **border color**, and **rounded corners** at receipt level
- **Per-element background color and padding** (top/bottom) via click-to-select in the Elements list
- **Configurable items table columns** — show/hide/reorder Item, SKU, Qty, Unit Price, Discount, Total
- **Unlimited footer rows** — text, image, divider, or spacer rows; falls back to `footerText` when empty
- **Template variables** in text blocks and footer rows: `{{store_name}}`, `{{receipt_number}}`, `{{customer_name}}`, `{{total}}`, etc. — auto-substituted from sale data in the preview and printed receipt

The `receiptTemplateConfigSchema` in `lib/db/src/schema/receiptTemplates.ts` is the source of truth. It uses `.passthrough()` so future frontend-only config fields survive the backend save without code changes.

**Do not edit** `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` directly — they are generated by orval from the OpenAPI spec. Extended types live in `frontend/src/pages/settings/receipt-editor.tsx` (`ExtendedConfig`, `ExtendedElementStyle`, `FooterRow`, `ItemColumn`).

## User Preferences
