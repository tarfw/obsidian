---
type: C4 Component
title: Point of sale
status: stable
groma:
  id: pos
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/pos/store.ts
    - scanner: typescript
      file: tarharness/src/pos/catalog.ts
      symbol: posActions
    - scanner: typescript
      file: tarharness/src/pos/content.ts
  technology: Turso, Workers AI
description: Runs counter sales as governed actions.
---

Defines the POS action set (sell, orders, stock, customers, register) and commits a sale, its payment and receipt in one workspace transaction. Product content and AI drafts live here too.
