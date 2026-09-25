---
type: C4 Component
title: Tab screens
status: stable
groma:
  id: workspace-tabs
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/WorkspaceTabScreen.tsx
    - scanner: typescript
      file: tarapp/src/components/WorkspaceTabScreen.tsx
      symbol: WorkspaceTabScreen
    - scanner: react
      file: tarapp/src/app/(tabs)/space.tsx
    - scanner: typescript
      file: tarapp/src/app/(tabs)/space.tsx
      symbol: SpaceScreen
    - scanner: react
      file: tarapp/src/app/(tabs)/inbox.tsx
    - scanner: typescript
      file: tarapp/src/app/(tabs)/inbox.tsx
      symbol: InboxScreen
    - scanner: react
      file: tarapp/src/app/(tabs)/ask.tsx
    - scanner: typescript
      file: tarapp/src/app/(tabs)/ask.tsx
      symbol: AskScreen
    - scanner: react
      file: tarapp/src/app/(tabs)/flows.tsx
    - scanner: typescript
      file: tarapp/src/app/(tabs)/flows.tsx
      symbol: FlowsScreen
description: Expose the Space, Inbox, Ask and Flows routes.
---

Thin route entries that render the shared workspace screen for the selected tab.
