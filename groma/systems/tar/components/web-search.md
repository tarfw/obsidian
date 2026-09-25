---
type: C4 Component
title: Web search
status: stable
groma:
  id: web-search
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/web/search.ts
  technology: TinyFish Search API
description: Searches the web for permitted evidence.
---

Calls TinyFish and records the turn, so a retried request returns the saved result instead of paying twice.
