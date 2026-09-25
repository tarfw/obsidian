---
type: C4 Component
title: Site publishing
status: stable
groma:
  id: site
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/site/store.ts
    - scanner: typescript
      file: tarharness/src/site/schema.ts
    - scanner: typescript
      file: tarharness/src/site/renderer.ts
  technology: Cloudflare R2
description: Builds and serves the workspace's public site.
---

Compiles the site definition and design tokens into static HTML and CSS, publishes releases to R2 and serves the live page by slug; an earlier release can be restored.
