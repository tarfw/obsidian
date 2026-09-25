---
type: C4 Component
title: Control plane
status: stable
groma:
  id: control
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/db/control.ts
      symbol: ControlStore
  technology: Cloudflare D1
description: Keeps identity, membership and workspace control data.
---

Stores users, workspaces, members and access in D1, and resolves a signed-in person to their workspace and role.
