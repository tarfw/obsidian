---
type: C4 Component
title: Action Gateway
status: stable
groma:
  id: gateway
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/gateway/actions.ts
    - scanner: typescript
      file: tarharness/src/gateway/commit.ts
    - scanner: typescript
      file: tarharness/src/gateway/turns.ts
  technology: Turso, D1
description: Executes registered actions under current authority.
---

Finds the action contract, checks eligibility and field rules, claims the idempotency key so a replay returns the saved result, and commits the accepted effect with its receipt. Paid calls lease a turn before spending.
