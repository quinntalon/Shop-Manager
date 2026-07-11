---
name: Replit env var loading from .env
description: Why a repo-committed .env file's values don't show up in process.env on Replit, and what to do about it.
---

A root `.env` file committed to a repo is not automatically loaded into process environments on Replit (no implicit dotenv sourcing at the shell/workflow level). Only Replit-managed values (`DATABASE_URL`, `PG*`, secrets set via the Secrets tool, env vars set via `setEnvVars`) actually appear in `process.env` for workflows.

**Why:** Confirmed by checking `/proc/<pid>/environ` for a running workflow — DB vars set by Replit's Postgres provisioning were present, but non-Replit-managed keys from the same `.env` file (e.g. `VITE_CLERK_PUBLISHABLE_KEY`) were absent, even though the app has no dotenv-loading code of its own.

**How to apply:** After importing a project with a committed `.env` containing real-looking config (API keys, etc.), don't assume those values are live. Check `printenv` / `viewEnvVars` first. If missing, promote the values into real Replit env vars (`setEnvVars` for non-sensitive) or secrets (`requestSecrets` for sensitive ones like API secret keys) rather than relying on the file.
