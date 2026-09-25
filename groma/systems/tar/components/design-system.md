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
 scanner: typescript
      file: tarapp/src/hooks/use-color-scheme.ts
  technology: React Native
description: Provides the shared visual language and brand marks.
---

Holds colors, spacing, tokens, primitives, theme hooks and the TAR logo marks used across screens.
