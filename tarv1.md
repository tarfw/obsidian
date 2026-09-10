# TAR v1 — System Overview

Compact, organized picture of the current bot, flows, actions, space, canvas and inbox systems.
Code lives in `tarharness/` (Cloudflare Workers + D1/Turso harness) and `tarapp/` (React Native/Expo app).

---

## 1. Architecture

```
Records -> Run -> Action -> Gateway: checks -> execute -> attach
                                     -> saved result -> audit -> next Action
```

- **Records** hold truth.
- **Flows** organize Actions.
- **Actions** are the only executable capability.
- **Gateway** is the mandatory authority for every official Record/external effect — never skippable.
- **Agents** handle uncertainty but can only *propose*, never commit directly.

---

## 2. Space (Workspace)

- Google sign-in creates one reusable **Personal** workspace + on-demand **Work** workspaces (invite → approve → provision).
- **D1 (CONTROL)**: Google identity, users, workspaces, membership, invites, team channels.
- **Turso (per workspace)**: definitions, records, links, runs, events, outbox.
- **R2** files/media; **Secrets store** values; **Queues + due-work scan** for delivery/recovery.
- Routing names: `googleuser`, `googleuser-w1`, etc.
- **Roles**: `owner/admin/member/guest` (authority) + `work_role` (`general` / `cook` / `cashier`).

| Store | Contents |
|-------|----------|
| D1 | users, workspaces, members, workspace_invites, team_channels, channel_identities, channel_link_requests, control_events, channel_commands |
| Turso | definitions, records, links, runs, events, outbox |

---

## 3. Actions — the only executable unit

| Type | Behavior |
|------|----------|
| `app` | Deterministic code / approved integration; commits only via Gateway |
| `agent` | Reasoning / drafts / allowlisted choices; **no direct commits** |
| `human` | A Task awaiting an authorized response |

Catalog families (`actionsreg.md`): `record.*`, `task.*`, `flow.*`/`workflow.*`, `inbox.*`, `channel.*`, `email/sms/chat/voice/meeting`, `schedule.*`, `web.*`, `research.*`, `sandbox.*`, `order.*`, `contact.*`, `payment.*`, `approval.*`, etc.

Implementd catalog today: `record.create/update`, `task.create/complete`, `flow.start/publish`, `directory.install/remove`, plus `pos.*`.

**Gateway guarantees:**

- Authority + role check
- Input/output schema validation
- Record-version (MVCC) conflict detection
- Idempotency via SHA-256 fingerprint of actor+action+input
- Atomic commit (transaction + run + event + outbox in one TX)
- Bounded safe retries, register uncertain delivery

---

## 4. Flows

```
Verified trigger -> Run -> Action -> saved result -> next Action -> outcome
```

- **Definition**: versioned trigger + ordered Actions + outcome routes.
- **Run**: pinned Flow/Action versions, `UNIQUE(flow_id, occurrence)` dedupes.
- Run states: `ready → running → waiting → completed | failed | cancelled`.
- **Human wait** = one Inbox Task; `task.complete` resumes the Run once.
- **Bot** = an *optional__ named Flow binding (Kit of templates/views/actions + guidance) — not a separate entity or data.

---

## 5. Bot (built-in directory)

| Bot | Template Flows | Records |
|-----|----------------|---------|
| POS | new sale, orders/returns, stock, customers, register | Order, Payment, Product, Customer, Register |
| Team | onboarding, work review | Contact, Task |
| Sales | customer follow-up, sales review | Contact, Task |
| Operations | operational request, request + review | Request, Task |

- `directory.install` publishes the bot definition + selected Kit cards + flows (+ POS indexes).
- `flow.publish` creates a **custom** flow inside an installed bot.

---

## 6. Canvas — main view (not an execution engine)

- Rendered from published **Kit** definitions; cards are `data` (metrics), `action` (run one Action), `flow` (start/continue).
- Filtered by role + `canExecute`; cooks get a Kitchen card, cashiers are limited.
- Default fallback: Records / Open-work tiles + `record.create`/`task.create` + flow cards.

---

## 7. Inbox — work queue

- `GET /inbox` → open Tasks (assigned or unassigned) + POS orders.
- Permissions (POS): `pos.order.item.update` (preparing), `pos.checkout` (collect), plus `task.complete`, `pos.open`.
- **Chat-in-inbox** (Slack/Discord/Google Chat): `done <task>`, `start|ready <order> <product>`, `status` — commands processed in a queue worker with identity resolution and dedupe.

---

## 8. App surface (tarapp/)

Tabs: **Canvas + Inbox + Records** (Work), plus **Bots** (directory/install), auth/settings. Build (flows/actions/settings) lives in harness routes.

## 9. Where state lives

```
D1                 Turso (per workspace)    R2 / Queues
users/workspaces   definitions records      files/media
members/invites    links runs events         delivery
channels           outbox                    secrets
```

---

## 10. Reference docs

| Doc | Owns |
|-----|------|
| `tar-harness.md` | architecture |
| `actionsreg.md` | Action catalog |
| `tar-harness-implementation.md` | engineering / storage / build |
| `tarharnessexamples.md` | examples |

**Note:** repo is mid-transition between a broad "everything is Actions + Gateway" target and a POS-cooking vertical slice (Kitchen view, `cook`/`cashier` roles, orders) which is currently the most-complete built feature.