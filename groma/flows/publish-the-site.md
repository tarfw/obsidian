---
type: Groma Flow
title: Publish the site
groma:
  id: publish-the-site
---

An owner publishes the site; the Gateway compiles the release and the worker serves it by slug.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Operator](../actors/operator.md) | [Workspace canvas](../systems/tar/components/workspace-canvas.md) | Opens Site Studio |
| [Workspace canvas](../systems/tar/components/workspace-canvas.md) | [Site Studio](../systems/tar/components/site-studio.md) | Edits the site |
| [Site Studio](../systems/tar/components/site-studio.md) | [Gateway client](../systems/tar/components/gateway-client.md) | Requests a publish |
| [Gateway client](../systems/tar/components/gateway-client.md) | [Worker ingress](../systems/tar/components/ingress.md) | Calls the workspace API |
| [Worker ingress](../systems/tar/components/ingress.md) | [Action Gateway](../systems/tar/components/gateway.md) | Dispatches the action |
| [Action Gateway](../systems/tar/components/gateway.md) | [Site publishing](../systems/tar/components/site.md) | Compiles and stores the release |
