---
type: Groma Flow
title: Sell at the counter
groma:
  id: sell-at-the-counter
---

A customer pays at the counter; the app sends one action and the Gateway commits the sale with its receipt.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Customer](../actors/customer.md) | [Point of sale](../systems/tar/components/pos-ui.md) | Pays for a sale |
| [Point of sale](../systems/tar/components/pos-ui.md) | [Gateway client](../systems/tar/components/gateway-client.md) | Sends pos.checkout |
| [Gateway client](../systems/tar/components/gateway-client.md) | [Worker ingress](../systems/tar/components/ingress.md) | Calls the action endpoint |
| [Worker ingress](../systems/tar/components/ingress.md) | [Action Gateway](../systems/tar/components/gateway.md) | Dispatches the action |
| [Action Gateway](../systems/tar/components/gateway.md) | [Point of sale](../systems/tar/components/pos.md) | Commits the sale and receipt |
