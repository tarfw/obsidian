---
type: C4 Component
title: Identity and access
status: stable
groma:
  id: identity
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/access.ts
    - scanner: typescript
      file: tarharness/src/team.ts
    - scanner: typescript
      file: tarharness/src/auth/google.ts
      symbol: verifyGoogleIdentity
  technology: Google OIDC, D1
description: Verifies who may act and with what scope.
---

Verifies Google sign-in tokens, keeps membership in the control plane backed by D1, and gates every read and action by the member's role.
