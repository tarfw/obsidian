---
type: C4 Component
title: Design system
status: stable
groma:
  id: design-system
  parent: tar
  code:
    - scanner: typescript
      file: tarapp/src/components/ds/tokens.ts
    - scanner: typescript
      file: tarapp/src/constants/theme.ts
    - scanner: typescript
      file: tarapp/src/components/ds/index.ts
    - scanner: react
      file: tarapp/src/components/ds/ContentCard.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/ContentCard.tsx
      symbol: ContentCard
    - scanner: react
      file: tarapp/src/components/ds/EmptyState.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/EmptyState.tsx
      symbol: EmptyState
    - scanner: react
      file: tarapp/src/components/ds/FirstAction.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/FirstAction.tsx
      symbol: FirstAction
    - scanner: react
      file: tarapp/src/components/ds/InlinePrompt.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/InlinePrompt.tsx
      symbol: InlinePrompt
    - scanner: react
      file: tarapp/src/components/ds/PrimaryButton.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/PrimaryButton.tsx
      symbol: PrimaryButton
    - scanner: react
      file: tarapp/src/components/ds/SecondaryTextAction.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/SecondaryTextAction.tsx
      symbol: SecondaryTextAction
    - scanner: react
      file: tarapp/src/components/ds/WorkspaceHeader.tsx
    - scanner: typescript
      file: tarapp/src/components/ds/WorkspaceHeader.tsx
      symbol: WorkspaceHeader
    - scanner: react
      file: tarapp/src/components/TarLogo.tsx
    - scanner: typescript
      file: tarapp/src/components/TarLogo.tsx
      symbol: TarLogo
    - scanner: react
      file: tarapp/src/components/TarLogoLoader.tsx
    - scanner: typescript
      file: tarapp/src/components/TarLogoLoader.tsx
      symbol: TarLogoLoader
    - scanner: typescript
      file: tarapp/src/hooks/use-theme.ts
      symbol: useTheme
    - scanner: react
      file: tarapp/src/hooks/use-theme-context.tsx
    - scanner: typescript
      file: tarapp/src/hooks/use-theme-context.tsx
    - scanner: typescript
      file: tarapp/src/hooks/use-color-scheme.ts
  technology: React Native
description: Provides the shared visual language and brand marks.
---

Holds colors, spacing, tokens, primitives, theme hooks and the TAR logo marks used across screens.
