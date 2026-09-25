---
type: C4 Component
title: Team and channels
status: stable
groma:
  id: team-ui
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/WorkspaceTeam.tsx
    - scanner: typescript
      file: tarapp/src/components/WorkspaceTeam.tsx
      symbol: WorkspaceTeam
description: Manages members, invitations and chat links.
---

Lists members and roles, invites people and links or disconnects Slack, Discord and Google Chat identities.
