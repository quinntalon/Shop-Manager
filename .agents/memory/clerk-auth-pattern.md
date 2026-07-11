---
name: Replit Clerk Auth pattern
description: How projects set up with Replit's Auth pane (Clerk) wire their keys, and recovery after a fresh GitHub import.
---

Replit has a first-class "Auth pane" feature (docs: Clerk Auth) that provisions a dedicated Clerk tenant and injects `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` as env vars/secrets automatically — no external Clerk dashboard involved, no `searchIntegrations` connector for it. Frontend code typically reads `VITE_CLERK_PUBLISHABLE_KEY` (Vite build-time) and backend reads `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`; both publishable-key env names need the same value set.

**Why:** These key names are not exposed as a normal integration/connector, so there's no `addIntegration`/`ProposeIntegration` flow to re-provision them. When a project built this way is exported/imported via GitHub, the secrets don't travel with it, but the values are sometimes left behind in a committed `.env` for reference (see env-loading.md — that file isn't auto-loaded).

**How to apply:** If Clerk-related env vars are missing after a GitHub import and the app has `@clerk/react` + `@clerk/express` with comments referencing "Auth pane" / "no external Clerk dashboard", check the repo's `.env` for leftover `pk_test_...` / `sk_test_...` values and re-set them as real env vars/secrets (publishable key via `setEnvVars`, secret key via `requestSecrets`) rather than asking the user to create a new Clerk account.
