---
type: C4 Component
title: Gateway client
status: stable
groma:
  id: gateway-client
  parent: tar
  code:
    - scanner: typescript
      file: tarapp/src/lib/harness.ts
  technology: HTTPS
description: Calls the worker on behalf of the app.
---

Sends authenticated requests with an idempotency key and a timeout, refreshing or invalidating the token on 401.
