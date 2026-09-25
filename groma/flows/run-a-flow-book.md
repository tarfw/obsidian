---
type: Groma Flow
title: Run a Flow Book
groma:
  id: run-a-flow-book
---

A member starts a published Flow Book; the worker accepts the dispatch and runs the automatic steps.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Operator](../actors/operator.md) | [Workspace canvas](../systems/tar/components/workspace-canvas.md) | Opens Flow Books |
| [Workspace canvas](../systems/tar/components/workspace-canvas.md) | [Action interfaces](../systems/tar/components/action-interfaces.md) | Opens the Flow Book interface |
| [Action interfaces](../systems/tar/components/action-interfaces.md) | [Gateway client](../systems/tar/components/gateway-client.md) | Requests flow.start |
| [Gateway client](../systems/tar/components/gateway-client.md) | [Worker ingress](../systems/tar/components/ingress.md) | Calls the workspace API |
| [Worker ingress](../systems/tar/components/ingress.md) | [Flow runtime](../systems/tar/components/flow-runtime.md) | Accepts the dispatch |
| [Flow runtime](../systems/tar/components/flow-runtime.md) | [Action Gateway](../systems/tar/components/gateway.md) | Executes automatic steps |
