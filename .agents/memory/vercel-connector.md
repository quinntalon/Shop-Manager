---
name: Vercel connector setup
description: Workspace-specific constraint for authorizing Vercel publishing.
---

The Vercel catalog connector cannot be authorized inline while it is still in
`requires_setup` state. It must first be enabled from the workspace
Connectors settings; once enabled, it becomes a regular connector that can be
proposed for account authorization.

**Why:** The imported project already has a validated Vercel Build Output API
pipeline, but publishing requires an authorized Vercel account connection.

**How to apply:** When a project needs Vercel publishing, check the connector
state before asking for a token or claiming deployment. If it is still a
catalog connector, direct the user to enable it in Workspace Settings.