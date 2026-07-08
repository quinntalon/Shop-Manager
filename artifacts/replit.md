# Nexus POS

Nexus POS is a shop sales & inventory management system: a web dashboard (Shop Manager) plus a mobile companion app (Nexus POS Mobile) for staff to run sales, browse inventory, and monitor stock from a phone/tablet, all backed by the same Express API and Postgres database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/pos-mobile run dev` — run the Expo mobile app (via its workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- **Shop Manager** (web, `artifacts/shop`): admin dashboard for categories, products, sales, and reporting.
- **Nexus POS Mobile** (Expo, `artifacts/pos-mobile`): handheld register for retail staff — PIN login, browse inventory, ring up sales via a cart/checkout flow, view sale history, and see low-stock alerts on the home screen. Talks to the same `artifacts/api-server` and Postgres DB as the web app via the generated `@workspace/api-client-react` hooks (no separate mobile auth backend — PIN is stored locally since the API itself has no auth middleware).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
