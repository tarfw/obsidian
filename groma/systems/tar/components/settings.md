---
type: C4 Component
title: Settings
status: stable
groma:
  id: settings
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/app/settings.tsx
    - scanner: typescript
      file: tarapp/src/app/settings.tsx
      symbol: SettingsScreen
description: Manages device preferences and models.
---

Switches theme mode, downloads or clears on-device models and signs the member out.
