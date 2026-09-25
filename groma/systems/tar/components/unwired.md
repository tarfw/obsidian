---
type: C4 Component
title: Unwired code
status: stable
groma:
  id: unwired
  parent: tar
  code:
    - scanner: typescript
      file: tarapp/src/lib/tar.ts
    - scanner: typescript
      file: tarapp/src/lib/vectorStore.ts
    - scanner: typescript
      file: tarapp/src/lib/skills-cache.ts
    - scanner: typescript
      file: tarapp/src/lib/s2-client.ts
    - scanner: typescript
      file: tarapp/src/lib/inventory.ts
    - scanner: typescript
      file: tarapp/src/lib/ai.ts
    - scanner: typescript
      file: tarapp/src/lib/geo.ts
    - scanner: typescript
      file: tarapp/src/lib/design-parser.ts
    - scanner: typescript
      file: tarapp/src/lib/design-tokens.ts
    - scanner: typescript
      file: tarapp/src/lib/textSplitter.ts
    - scanner: typescript
      file: tarapp/src/hooks/use-form.ts
    - scanner: react
      file: tarapp/src/components/plans.tsx
    - scanner: typescript
      file: tarapp/src/components/plans.tsx
      symbol: EphemeralPlanCanvas
    - scanner: react
      file: tarapp/src/components/ItemComposeModal.tsx
    - scanner: typescript
      file: tarapp/src/components/ItemComposeModal.tsx
    - scanner: react
      file: tarapp/src/components/AgentCollectibleCard.tsx
    - scanner: typescript
      file: tarapp/src/components/AgentCollectibleCard.tsx
    - scanner: react
      file: tarapp/src/components/AnimatedTarLogoAgent.tsx
    - scanner: typescript
      file: tarapp/src/components/AnimatedTarLogoAgent.tsx
    - scanner: react
      file: tarapp/src/components/ContactCreateModal.tsx
    - scanner: typescript
      file: tarapp/src/components/ContactCreateModal.tsx
    - scanner: react
      file: tarapp/src/components/ContactMentionPicker.tsx
    - scanner: typescript
      file: tarapp/src/components/ContactMentionPicker.tsx
    - scanner: typescript
      file: tarapp/src/lib/team.ts
description: Keeps modules the app no longer reaches.
---

Legacy clients, stubs and unused screens - the old Tarai client, s2 stream writer, vector store, design parser and contact modals - kept in the repository but off every live path. Candidates for removal.
