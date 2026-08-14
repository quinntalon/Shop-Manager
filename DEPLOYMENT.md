# Deploying to Vercel

## Prerequisites

- A PostgreSQL database (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres provider)
- A [Vercel](https://vercel.com) account
- The [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`), or use the Vercel dashboard

---

## 1. Link the project

The Vercel project root is `shopDesk/`, not the repo root.

```bash
cd shopDesk
vercel link
```

If setting up for the first time, follow the prompts to create a new Vercel project.

---

## 2. Set environment variables

In the Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/db` |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name — image uploads disabled if not set |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |

> Do **not** set `PORT`, `CLERK_*`, or `SESSION_SECRET` — they are not used.

---

## 3. Deploy

```bash
cd shopDesk
vercel --prod
```

Or push to your connected Git branch and Vercel will deploy automatically.

---

## 4. First-time admin setup

After deploying, you need to promote your account to admin:

1. Go to your deployed URL and register an account
2. Open the browser DevTools console and run:
   ```js
   fetch('/api/auth/bootstrap-admin', { method: 'POST', credentials: 'same-origin' })
     .then(r => r.json()).then(console.log)
   ```
3. You should see `{ "message": "You are now an admin." }`
4. Refresh the page — you now have full dashboard access
5. Use the **Users** page to approve and assign roles to other users

This endpoint is permanently disabled once any admin account exists, so it cannot be used to escalate privileges later.

---

## How the build works

`vercel.json` runs `node build.vercel.mjs`, which:

1. Builds the Fastify API into a single serverless function → `.vercel/output/functions/api/index.func/`
2. Builds the React frontend with Vite → `.vercel/output/static/`
3. Writes routing config so `/api/*` hits the serverless function and everything else serves the SPA

The DB schema is pushed automatically before the build via `pnpm --filter @workspace/db run push`.

---

## Local dev

```bash
# Install dependencies
pnpm install

# Terminal 1 — API server on port 3001
PORT=3001 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend on port 5000
pnpm --filter @workspace/shop run dev
```

Copy `.env.example` to `.env` and fill in your values before running locally.
