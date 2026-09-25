---
type: C4 Component
title: Worker ingress
status: stable
groma:
  id: ingress
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/index.ts
  technology: Cloudflare Workers, TypeScript
description: Routes every request into the platform.
---

Verifies the caller's Google token, resolves the workspace and member, then dispatches actions, records, contacts, flows, sites and channel events. Also runs the queue consumer and the scheduled dispatch sweep.
