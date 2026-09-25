---
type: C4 Component
title: Channel bridge
status: stable
groma:
  id: channels
  parent: tar
  code:
    - scanner: typescript
      file: tarharness/src/channels/store.ts
    - scanner: typescript
      file: tarharness/src/channels/commands.ts
      symbol: commandRequest
    - scanner: typescript
      file: tarharness/src/channels/jobs.ts
    - scanner: typescript
      file: tarharness/src/channels/providers.ts
  technology: Slack, Discord, Google Chat APIs
description: Brings chat work in and replies back.
---

Verifies provider webhooks, links a chat identity to a member, parses commands and queues them, so the same work appears in the Inbox and in chat.
