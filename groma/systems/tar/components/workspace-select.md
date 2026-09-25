---
type: C4 Component
title: Workspace selection
status: stable
groma:
  id: workspace-select
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/WorkspaceTabsProvider.tsx
    - scanner: typescript
      file: tarapp/src/components/WorkspaceTabsProvider.tsx
    - scanner: react
      file: tarapp/src/components/CreateWorkspace.tsx
    - scanner: typescript
      file: tarapp/src/components/CreateWorkspace.tsx
      symbol: CreateWorkspace
description: Chooses or creates the workspace a member works in.
---

Loads the member's workspaces, keeps the current one and creates a workspace when the list is empty.
