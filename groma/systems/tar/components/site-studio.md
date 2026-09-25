---
type: C4 Component
title: Site Studio
status: stable
groma:
  id: site-studio
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/site.tsx
    - scanner: typescript
      file: tarapp/src/components/site.tsx
    - scanner: typescript
      file: tarapp/src/lib/site-schema.ts
description: Lets an owner generate, publish and roll back the site.
---

Edits the site definition and design tokens, then calls the worker's site actions to publish or restore a release.
