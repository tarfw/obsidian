---
type: C4 Component
title: Flow runtime
status: stable
groma:
  id: flow-runtime
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/flows/dispatch.ts
    - scanner: typescript
      file: tarharness/src/flows/workflow.ts
      symbol: FlowWorkflow
  technology: Cloudflare Workflows, D1
description: Runs published Flow Books durably.
---

Accepts flow.start and flow.advance, records dispatch intent and drives automatic steps through the workflow adapter, so a run survives restarts and human waits.
