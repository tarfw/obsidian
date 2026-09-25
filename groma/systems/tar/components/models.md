---
type: C4 Component
title: On-device models
status: stable
groma:
  id: models
  parent: tar
  code:
    - scanner: typescript
      file: tarapp/src/lib/embeddings.ts
    - scanner: react
      file: tarapp/src/db/embeddings-provider.tsx
    - scanner: typescript
      file: tarapp/src/db/embeddings-provider.tsx
    - scanner: typescript
      file: tarapp/src/lib/hammer.ts
  technology: react-native-executorch
description: Runs embedding and language models on the device.
---

Loads the MiniLM embedder and manages the Hammer and LFM model caches used for local search and drafting.
