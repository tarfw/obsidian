---
type: C4 Component
title: Point of sale
status: stable
groma:
  id: pos-ui
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/pos/PosInterface.tsx
    - scanner: typescript
      file: tarapp/src/pos/PosInterface.tsx
      symbol: PosInterface
    - scanner: react
      file: tarapp/src/pos/PosForm.tsx
    - scanner: typescript
      file: tarapp/src/pos/PosForm.tsx
    - scanner: typescript
      file: tarapp/src/pos/types.ts
    - scanner: typescript
      file: tarapp/src/pos/journal.ts
    - scanner: typescript
      file: tarapp/src/pos/session.ts
  technology: React Native
description: Runs the counter screen and its local safety nets.
---

Sells, refunds and takes payment at the counter, and journals a pending sale before executing so a lost connection cannot duplicate a payment.
