---
type: C4 Component
title: Workspace canvas
status: stable
groma:
  id: workspace-canvas
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/HarnessWorkspaceCanvas.tsx
    - scanner: typescript
      file: tarapp/src/components/HarnessWorkspaceCanvas.tsx
  technology: React Native
description: Shows the selected workspace's work on one surface.
---

Renders the canvas payload as metric tiles, action cards and flow cards, and opens records, POS, Site Studio, team and Flow Books from it.
