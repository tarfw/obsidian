---
type: C4 Component
title: Shared contracts
status: stable
groma:
  id: contracts
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/errors.ts
    - scanner: typescript
      file: tarharness/src/types.ts
description: Defines shared types and error vocabulary.
---

Carries the identity, workspace, member, record and flow-run shapes plus the harness error types used across the worker.
