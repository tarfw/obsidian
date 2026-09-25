---
type: C4 Component
title: Action registry
status: stable
groma:
  id: registry
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/registry/catalog.ts
  technology: TypeScript
description: Declares the actions and interfaces a workspace offers.
---

Owns the typed contracts a caller reads: fields, roles, effects and interface keys. POS contributes its own entries and the app renders each interface key.
