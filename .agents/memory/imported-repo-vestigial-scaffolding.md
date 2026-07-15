---
name: GitHub-imported repo may already have unused Replit-native scaffolding
description: Patterns seen when a project built on Replit and later exported to GitHub is re-imported — dead code and leaked secrets to check for before building new features.
---

A project originally built on Replit (with Replit Object Storage, Replit Auth pane, etc.) that gets pushed to GitHub and re-imported can carry two non-obvious issues:

1. **Dead Replit-native code alongside a real replacement.** E.g. a GCS-backed `objectStorage.ts`/`objectAcl.ts` (using the Replit sidecar token endpoint) can sit unused in the tree while the actual upload route already uses a different provider (Cloudinary). Always grep for whether the suspect module is actually wired into the router/app before assuming it's live — `grep` for the import in the route index, not just the file's existence.
2. **A committed root `.env` with real secret values** (not placeholders) — e.g. a live `CLERK_SECRET_KEY` — checked into git history. Check `git ls-files | grep env` before doing any "keep secrets out of GitHub" work; don't assume `.gitignore` already covers it.

**Why:** Both were found in a "Shop Manager" (Nexus POS) project — the GCS object-storage module was fully unused (Cloudinary was already the live path, just under a confusingly-named `@workspace/object-storage-web` package), and `.env` with a real Clerk secret key was tracked in git and already pushed to the GitHub remote.

**How to apply:** When asked to "replace the current upload system" or "keep secrets out of GitHub" on an imported project, first verify what's actually wired up vs. vestigial, and check `git ls-files` for tracked env files, rather than assuming a rebuild is needed. If a real secret was found in git history, remove it from tracking going forward (`git rm --cached`, add to `.gitignore`, add a `.env.example` with placeholders) and tell the user to rotate the exposed credential — history rewrite is a separate, more destructive step requiring explicit consent.
