---
type: C4 Component
title: Workspace database
status: stable
groma:
  id: workspace-db
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/db/turso.ts
    - scanner: typescript
      file: tarharness/src/db/schema.ts
  technology: Turso (libSQL)
description: Owns each workspace's own records.
---

Provisions one Turso database per workspace, applies schema patches on open, and holds records, events, tasks, runs and steps.
