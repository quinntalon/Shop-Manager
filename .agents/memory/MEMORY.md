# Memory Index

- [Replit env var loading from .env](env-loading.md) — a repo-committed root `.env` is NOT auto-sourced into process env on Replit; runtime values must be set via setEnvVars/requestSecrets.
- [Replit Clerk Auth pattern](clerk-auth-pattern.md) — how Clerk-based auth wired by Replit's Auth pane expects its keys, and how to recover them after a GitHub import.
- [GitHub-imported repo may already have unused Replit-native scaffolding](imported-repo-vestigial-scaffolding.md) — check for dead GCS/object-storage code and a committed real `.env` before assuming an upload/storage system needs to be built from scratch.
