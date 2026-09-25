---
type: Groma Relationships
title: Architecture relationships
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Operator](actors/operator.md) | [tarapp/src/app/index.tsx](../tarapp/src/app/index.tsx) | Opens the app | Expo |
| [Customer](actors/customer.md) | [tarapp/src/pos/PosInterface.tsx](../tarapp/src/pos/PosInterface.tsx) | Buys at the counter | React Native |
| [Customer](actors/customer.md) | [tarharness/src/index.ts](../tarharness/src/index.ts) | Reads the published site | HTTPS |
| [Operator](actors/operator.md) | [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | Works with the workspace | React Native |
| [tarapp/src/lib/auth.ts](../tarapp/src/lib/auth.ts) | [Google identity](externals/google-identity.md) | Signs in with Google | OIDC |
| [tarharness/src/auth/google.ts](../tarharness/src/auth/google.ts) | [Google identity](externals/google-identity.md) | Verifies identity tokens | JWKS |
| [tarapp/src/lib/harness.ts](../tarapp/src/lib/harness.ts) | [tarharness/src/index.ts](../tarharness/src/index.ts) | Calls the workspace API | HTTPS |
| [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | [tarapp/src/lib/harness.ts](../tarapp/src/lib/harness.ts) | Loads workspace work | TypeScript |
| [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | [tarapp/src/action-interfaces/ActionInterfaceHost.tsx](../tarapp/src/action-interfaces/ActionInterfaceHost.tsx) | Opens action screens | React Native |
| [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | [tarapp/src/components/site.tsx](../tarapp/src/components/site.tsx) | Opens Site Studio | React Native |
| [tarapp/src/action-interfaces/ActionInterfaceHost.tsx](../tarapp/src/action-interfaces/ActionInterfaceHost.tsx) | [tarapp/src/lib/harness.ts](../tarapp/src/lib/harness.ts) | Executes accepted actions | TypeScript |
| [tarapp/src/pos/PosInterface.tsx](../tarapp/src/pos/PosInterface.tsx) | [tarapp/src/lib/harness.ts](../tarapp/src/lib/harness.ts) | Executes POS actions | TypeScript |
| [tarapp/src/components/site.tsx](../tarapp/src/components/site.tsx) | [tarapp/src/lib/harness.ts](../tarapp/src/lib/harness.ts) | Publishes site releases | TypeScript |
| [tarharness/src/index.ts](../tarharness/src/index.ts) | [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | Dispatches gateway calls | TypeScript |
| [tarharness/src/index.ts](../tarharness/src/index.ts) | [tarharness/src/flows/dispatch.ts](../tarharness/src/flows/dispatch.ts) | Accepts flow requests | TypeScript |
| [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | [tarharness/src/registry/catalog.ts](../tarharness/src/registry/catalog.ts) | Looks up action contracts | TypeScript |
| [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | [tarharness/src/pos/store.ts](../tarharness/src/pos/store.ts) | Commits counter sales | TypeScript |
| [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | [tarharness/src/site/store.ts](../tarharness/src/site/store.ts) | Publishes site releases | TypeScript |
| [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | [tarharness/src/db/turso.ts](../tarharness/src/db/turso.ts) | Writes records and receipts | libSQL |
| [tarharness/src/flows/dispatch.ts](../tarharness/src/flows/dispatch.ts) | [tarharness/src/flows/workflow.ts](../tarharness/src/flows/workflow.ts) | Starts durable runs | Cloudflare Workflows |
| [tarharness/src/flows/workflow.ts](../tarharness/src/flows/workflow.ts) | [tarharness/src/gateway/actions.ts](../tarharness/src/gateway/actions.ts) | Executes automatic steps | TypeScript |
| [tarharness/src/brain/jev.ts](../tarharness/src/brain/jev.ts) | [Jev](externals/jev.md) | Asks for the next step | HTTPS |
| [tarharness/src/db/turso.ts](../tarharness/src/db/turso.ts) | [Turso](externals/turso.md) | Provisions workspace databases | Turso Platform API |
| [tarharness/src/web/search.ts](../tarharness/src/web/search.ts) | [TinyFish](externals/tinyfish.md) | Searches the web | HTTPS |
| [tarharness/src/channels/providers.ts](../tarharness/src/channels/providers.ts) | [Chat platforms](externals/chat-platforms.md) | Receives chat events | Webhooks |
| [tarharness/src/pos/content.ts](../tarharness/src/pos/content.ts) | [Cloudflare Workers AI](externals/cloudflare-workers-ai.md) | Drafts product copy | Workers AI |

## Derived relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tarapp/src/components/RecordDetailModal.tsx](../tarapp/src/components/RecordDetailModal.tsx) | [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | Invokes supplied callbacks: onAction, onClose | react |
| [tarapp/src/components/SearchRecordsModal.tsx](../tarapp/src/components/SearchRecordsModal.tsx) | [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | Invokes supplied callback: onSelect | react |
| [tarapp/src/components/WorkspaceTeam.tsx](../tarapp/src/components/WorkspaceTeam.tsx) | [tarapp/src/components/HarnessWorkspaceCanvas.tsx](../tarapp/src/components/HarnessWorkspaceCanvas.tsx) | Invokes supplied callback: onChanged | react |
