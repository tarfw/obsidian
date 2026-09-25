---
type: C4 Component
title: Local device store
status: stable
groma:
  id: local-store
  parent: tar
  technology: SQLite (Turso sync), React Query
description: Keeps permitted local data and drafts on the device.
---

Owns the SQLite connections, schemas and React provider for private data, device drafts and preferences; workspace data always goes through the worker.
