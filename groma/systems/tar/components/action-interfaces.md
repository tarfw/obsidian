---
type: C4 Component
title: Action interfaces
status: stable
groma:
  id: action-interfaces
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/action-interfaces/ActionInterfaceHost.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/ActionInterfaceHost.tsx
      symbol: ActionInterfaceHost
    - scanner: react
      file: tarapp/src/action-interfaces/ActionFormInterface.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/ActionFormInterface.tsx
      symbol: ActionFormInterface
    - scanner: react
      file: tarapp/src/action-interfaces/ConfirmationInterface.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/ConfirmationInterface.tsx
      symbol: ConfirmationInterface
    - scanner: react
      file: tarapp/src/action-interfaces/FlowBuilderInterface.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/FlowBuilderInterface.tsx
      symbol: FlowBuilderInterface
    - scanner: react
      file: tarapp/src/action-interfaces/FlowInterface.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/FlowInterface.tsx
      symbol: FlowInterface
    - scanner: react
      file: tarapp/src/action-interfaces/registry.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/registry.tsx
    - scanner: typescript
      file: tarapp/src/action-interfaces/types.ts
      symbol: ActionInterfaceProps
  technology: React Native
description: Renders each action the worker offers.
---

Resolves an action's interface key to a native screen - form, confirmation, POS, flow or flow builder - and reports success only after the Gateway accepts.
