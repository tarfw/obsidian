---
type: C4 Component
title: Local device store
status: stable
groma:
  id: local-store
  parent: tar
  code:
    - scanner: typescript
      file: tarapp/src/lib/db.ts
    - scanner: typescript
      file: tarapp/src/lib/schema.ts
    - scanner: react
      file: tarapp/src/db/provider.tsx
    - scanner: typescript
      file: tarapp/src/db/provider.tsx
    - scanner: typescript
      file: tarapp/src/constants/types-config.ts
  technology: SQLite (Turso sync), React Query
description: Keeps permitted local data and drafts on the device.
---

Owns the SQLite connections, schemas and React provider for private data, device drafts and preferences; workspace data always goes through the worker.
