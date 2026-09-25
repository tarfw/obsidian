---
type: C4 Component
title: Sign in
status: stable
groma:
  id: signin
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/app/auth.tsx
    - scanner: typescript
      file: tarapp/src/app/auth.tsx
      symbol: AuthScreen
    - scanner: typescript
      file: tarapp/src/lib/auth.ts
  technology: Google Sign-In
description: Signs a member in with Google.
---

Runs Google Sign-In, caches the profile in secure storage and keeps the identity token fresh for the worker.
