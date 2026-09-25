---
type: C4 Component
title: App shell
status: stable
groma:
  id: app-shell
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/app/_layout.tsx
    - scanner: typescript
      file: tarapp/src/app/_layout.tsx
      symbol: RootLayout
    - scanner: react
      file: tarapp/src/app/index.tsx
    - scanner: typescript
      file: tarapp/src/app/index.tsx
      symbol: Index
    - scanner: react
      file: tarapp/src/app/(tabs)/_layout.tsx
    - scanner: typescript
      file: tarapp/src/app/(tabs)/_layout.tsx
      symbol: TabsLayout
  technology: Expo Router, React Native
description: Boots the app and routes between screens.
---

Restores the session, initializes the local store and models, then hosts the Space, Inbox and Ask tabs plus the Flows and Settings routes.
