---
type: C4 Component
title: Jev step advisor
status: stable
groma:
  id: jev-advisor
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/brain/jev.ts
      symbol: suggest
  technology: TypeSafe System One
description: Suggests which eligible step comes next.
---

Asks Jev for one first step among the registered actions and returns the proposal for review. Jev can neither execute nor publish.
