# TAR v2 — One Table, One Writer

**The whole idea:** Everything is a Record. Work happens through Actions. Actions run inside Flows. One Gateway writes.

## 1. The four primitives

| Primitive | Is | Does |
|---|---|---|
| **Record** | any unit of truth | stores |
| **Action** | any executable capability | does one thing |
| **Flow** | ordered Actions + trigger | orchestrates |
| **Gateway** | the single writer | authorizes + commits |

Nothing else is a primitive. Canvas, Cards, Channels, Bots, Runs, Events and Messages are all **Records, or queries over Records**.

## 2. The shape

```
        Trigger
           |
        Flow Run ── Action ──> Gateway ──> Record
           ^                                 |
           └─────────── next Action ─────────┘
```

Gateway sits inside every hop. It cannot be skipped, removed or bypassed by a builder.

## 3. One table

```
record
  id            text pk
  workspace_id  text
  type          text      -- contact | task | order | flow | run | channel | card ...
  title         text
  state         text      -- open | active | done | failed ...
  data          json      -- shape defined per type
  assignee      text null
  version       int       -- optimistic concurrency
  created_at / updated_at / archived_at
```

- One table per workspace. Every feature is a `type` + a JSON shape.
- Definitions (flows, bots, canvases) are rows too — no separate definition store.
- New capability = a new `type`, never a new table.

Reserved system types:

| type | meaning |
|---|---|
| `flow` | process: trigger + ordered Action ids + routes |
| `run` | one execution: pinned flow version + cursor + state |
| `bot` | installable bundle: title + flow ids |
| `canvas` | home screen: ordered Card ids |
| `card` | one Canvas unit: metric, action or flow + roles |
| `channel` | a connection: family + provider + account |
| `message` | one inbound/outbound item on a channel |
| `event` | append-only audit entry |

Everything else is yours: `contact`, `task`, `order`, `product`, `document`, `interaction`, `payment`, …

## 4. Actions — the only execution

| kind | who | authority |
|---|---|---|
| `app` | deterministic code / connector | commits via Gateway |
| `agent` | AI | proposes only |
| `human` | a person | answers via Inbox |

Minimal contract:

```
Action = id · kind · input schema · output · roles · effects
```

Gateway adds the rest automatically (idempotency, version check, audit, retry).

The catalog stays tiny; verticals add packs:

```
record.create · record.update · record.archive · record.link
task.create   · task.complete
flow.start    · flow.install
channel.reply · channel.send · channel.publish
pos.*         (vertical pack from the Restaurant / Retail Kit)
```

Everything else is a Flow composed of these. No Action needs SQL, credentials or its own table.

## 5. Flows — the only process

A Flow is a Record (`type=flow`):

```yaml
id: flow.onboard
title: Onboard member
trigger: manual | schedule | channel
actions: [record.create, task.create, task.complete, access.grant]
routes: linear by default
```

A Run is a Record (`type=run`) pinning the flow version; states `ready → running → waiting → done | failed | cancelled`.

Rules:
- Linear by default; branch only when needed.
- A `human` Action = one `task` Record waiting in the Inbox.
- `task.complete` resumes the Run exactly once.
- Every occurrence is deduplicated by a stable key.

## 6. Gateway — the only writer

Four verbs, one path each:

| verb | does |
|---|---|
| `create` | new Record |
| `update` | change data with a version check |
| `transition` | change state (and resume a run) |
| `link` | connect two Records |

Every verb follows one path: **authorize → validate → version-check → commit (record + run + event) → return saved result**. Same input + same key = same result, no second effect or charge.

## 7. Canvas — Cards, by role

**Canvas** is the home screen. **Card** is its only unit. That is the single name — never block, tile, widget or view.

| Card kind | shows | tapping it |
|---|---|---|
| `metric` | a number | opens the Records behind it |
| `action` | one Action | runs it |
| `flow` | one Flow | starts or continues it |

A Canvas is a Record (`type=canvas`, `data.cards[]`). A Card is a Record (`type=card`).

**Role-based by default:**

```
Card = { kind, title, target, roles[] }

viewer sees a Card  <=>  viewer.role in card.roles
```

- Owner/admin see every Card. Member sees theirs. Guest sees the least.
- One Canvas definition serves everyone — the server filters, the app renders.
- Build is the same Canvas in edit mode: add, remove, reorder Cards.

## 8. Channels — three families, one shape

Every channel is a Record and an adapter behind Actions and triggers. It never grants business authority.

```
Channel = Record(type=channel, data:{ family, provider, account, direction })
```

| family | who | providers | in | out |
|---|---|---|---|---|
| **team** | your people | Slack · Discord · Google Chat (native) | a message becomes a TAR request | notifications |
| **customer** | buyers & contacts | Zernio: WhatsApp, Telegram, Instagram DM, Messenger · TAR-native: Website & on-site chat, Email | message, comment, review, form | `channel.reply` / `channel.send` |
| **social** | the world | Zernio: Instagram, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business | comment, review, mention | `channel.publish` |

**Team** — link one destination per workspace; each member verifies their chat identity once; allowed `/tar` commands run permitted Actions. A channel role grants no business authority.

**Customer** — one Contact is one person with many handles; every message becomes a `message` Record linked to that Contact. Zernio carries the messaging platforms; TAR's own adapters carry Website / on-site chat and Email.

**Social** — one `channel.publish` call fans out to any set of networks through Zernio. Each destination succeeds or fails alone.

Channel Actions (all three families share them):

```
channel.reply     answer where the conversation already is
channel.send      start an outbound message on one channel
channel.publish   post content to one or more social channels
```

Rule: one integration, one shape. Adding a platform = one entry in the provider list, never a new engine.

## 9. Bots — a bundle, not an entity

```
Bot     = Record(type=bot, data:{ title, category, flowIds[] })
Install = create the Flow Records it lists
Remove  = archive those Flow Records
```

No Kit vs Bot vs Definition triple. A template bot ships with the product; a custom flow is simply a Flow Record you made.

## 10. Space & access

```
Google sign-in -> Personal workspace (free, always there)
                    `-> Work workspace -> members + shared Records
```

- One workspace = one isolated database + one membership list.
- Roles: `owner · admin · member` (+ optional `guest`). That is all.
- Action `roles` gate who may execute; `scope: own | team | all` gates which Records.
- Card `roles` gate what appears on a Canvas.
- A linked channel identity grants no authority — membership does.

## 11. What v2 removes

| Removed | Because | Now |
|---|---|---|
| Kit + Bot + Definition | three stores, one idea | `bot` + `flow` records |
| `runs` / `events` / `outbox` tables | rows are just records | `type=run` / `type=event` |
| `team_channels` + `channel_identities` tables | one connection is one record | `type=channel` |
| Team-only channel model | customers and social are the same shape | three families, one `channel` Record |
| Block vs Card vs View vs Chip naming | four names, one thing | Card |
| Step model | already merged into Action | Action |
| Interface / presentation types | derived from Action schema | Action schema |
| `work_role` hack (cook / cashier) | leaked vertical logic into core | Card + Action `roles` |
| MCP / skill / sandbox / subagent concepts | implementation detail | Action source |
| Work vs Build split | same queries twice | Canvas edit mode |

## 12. Everyday use

```
Work  = Canvas + Inbox + Records
Build = Canvas (edit mode)
```

Show the next Action, owner, state and due date. Reuse Flows first; add only what the work needs.

## 13. The one-line contract

> Records hold truth. Actions do work. Flows order work. Cards show work by role. Channels carry it. The Gateway is the only writer.
