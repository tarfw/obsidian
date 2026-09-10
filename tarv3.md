# TAR v3 — Final

> **Records hold truth. Actions do work. Flows order work. Cards show work by role. Channels carry it. The Gateway is the only writer.**

============================================================
## 1. THE FOUR PRIMITIVES
============================================================

| Primitive | Is | Does |
|---|---|---|
| **Record** | any unit of truth | stores |
| **Action** | any executable capability | does one thing |
| **Flow** | ordered Actions + trigger | orchestrates |
| **Gateway** | the single writer | authorizes + commits |

Everything else is a Record or a query over Records.
Canvas, Cards, Channels, Bots, Runs, Events, Messages, Links — all Records.

```
        Trigger
           |
        Flow Run ── Action ──> Gateway ──> Record
           ^                                 |
           └─────────── next Action ─────────┘
```

Gateway sits inside every hop. It cannot be skipped, removed or bypassed.

============================================================
## 2. STORAGE — TWO STORES
============================================================

| Store | Holds | Size |
|---|---|---|
| **Control** | identity, membership, workspace routing | tiny, few tables |
| **Workspace** | the one `record` table | one per workspace |

**Control** (`users`, `workspaces`, `members`) is shared and small. It never holds business data.

**Workspace** is one isolated database per workspace with **one table**.

```
record
  id            text pk
  workspace_id  text
  type          text
  title         text
  state         text
  data          json
  assignee      text null
  version       int
  created_at / updated_at / archived_at
```

Rules:
- New capability = a new `type`, never a new table.
- Definitions (flows, bots, canvases, cards) are rows, not a separate store.
- `version` gives optimistic concurrency; `archived_at` gives soft delete.

Reserved system types:

| type | meaning |
|---|---|
| `flow` | process: trigger + ordered Action ids |
| `run` | one execution: pinned flow version + cursor |
| `bot` | installable bundle: title + flow ids |
| `canvas` | home screen: ordered Card ids |
| `card` | one Canvas unit + roles |
| `channel` | a connection: family + provider + account |
| `message` | one inbound/outbound channel item |
| `link` | a relation: `{ from, to, relation }` |
| `event` | append-only audit entry |

Everything else is yours: `contact`, `task`, `order`, `product`, `payment`, …

============================================================
## 3. ACTIONS
============================================================

| kind | who | authority |
|---|---|---|
| `app` | deterministic code / connector | commits via Gateway |
| `agent` | AI | proposes only |
| `human` | a person | answers via Inbox |

```
Action = id · kind · input schema · output · roles[] · effects
```

Gateway adds the rest automatically: idempotency, version check, audit, retry.

Core catalog:

```
record.create · record.update · record.archive · record.link
task.create   · task.complete
flow.start    · flow.install
channel.reply · channel.send · channel.publish
```

Verticals add packs (`pos.*`, `restaurant.*`). Everything else is a Flow composed of these.
No Action needs SQL, credentials or its own table.

============================================================
## 4. FLOWS AND RUNS
============================================================

A Flow is a Record:

```yaml
type: flow
title: Onboard member
data:
  trigger: manual | schedule | channel
  actions: [record.create, task.create, task.complete, access.grant]
```

A Run is a Record that pins the flow version.

```
ready ──> running ──> waiting ──> done
                        |
                   failed | cancelled
```

| Rule | Behavior |
|---|---|
| Sequence | linear by default; branch only when needed |
| Human wait | one `task` Record waiting in the Inbox |
| Resume | `task.complete` resumes the Run exactly once |
| Dedupe | one stable key per occurrence; repeats return the saved result |
| Edit | new publications affect new Runs; migrate active Runs explicitly |

============================================================
## 5. GATEWAY
============================================================

Four verbs. One path each.

| verb | does |
|---|---|
| `create` | new Record |
| `update` | change data with a version check |
| `transition` | change state and resume a Run |
| `link` | connect two Records |

```
authorize -> validate -> version-check -> commit -> saved result
                                (record + run + event, one transaction)
```

| Guarantee | Rule |
|---|---|
| Authority | membership, role, scope, schema, version, approval |
| Idempotency | same key + same input = same result, no second effect |
| Atomicity | record, run, audit and delivery intent commit together |
| Delivery | external effects commit intent, then deliver and confirm |
| Retry | bounded safe retries, then visible work or failure |
| Uncertainty | reconcile an unclear result; never blindly resend |
| Agents | no direct commits, no SQL, no credentials |

============================================================
## 6. CANVAS AND CARDS
============================================================

**Canvas** is the home screen. **Card** is its only unit.
One name only — never block, tile, widget or view.

| Card kind | shows | tapping it |
|---|---|---|
| `metric` | a number | opens the Records behind it |
| `action` | one Action | runs it |
| `flow` | one Flow | starts or continues it |

```
Card = { kind, title, target, roles[] }

metric   target = { type, filter }     Gateway computes the count
action   target = actionId
flow     target = flowId
```

**Role-based, one rule:**

```
viewer sees a Card  <=>  viewer.roles intersects card.roles
```

- One Canvas serves everyone; the server filters, the app renders.
- Owner and admin see every Card.
- Build is the same Canvas in edit mode: add, remove, reorder.

============================================================
## 7. CHANNELS — THREE FAMILIES, ONE SHAPE
============================================================

```
Channel = { family, provider, account, direction }
```

| family | who | providers | in | out |
|---|---|---|---|---|
| **team** | your people | Slack · Discord · Google Chat (native) | a message becomes a request | notifications |
| **customer** | buyers & contacts | Zernio: WhatsApp, Telegram, Instagram DM, Messenger · native: Website & on-site chat, Email | message, comment, review, form | `channel.reply` / `channel.send` |
| **social** | the world | Zernio: Instagram, LinkedIn, Facebook, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business | comment, review, mention | `channel.publish` |

| Action | does |
|---|---|
| `channel.reply` | answer where the conversation already is |
| `channel.send` | start an outbound message on one channel |
| `channel.publish` | post to one or more social channels |

Rules:
- One integration, one shape. Adding a platform is one provider entry.
- A linked channel identity never grants business authority — membership does.
- One Contact is one person with many handles; every message is a `message` Record linked to that Contact.
- Team: one destination per workspace; each member verifies their chat identity once.

============================================================
## 8. BOTS, SPACE, ACCESS
============================================================

```
Bot     = { title, category, flowIds[] }
Install = create the Flow Records it lists
Remove  = archive those Flow Records
```

```
Google sign-in -> Personal workspace (free, always there)
                    `-> Work workspace -> members + shared Records
```

| Item | Rule |
|---|---|
| Workspace | one isolated database + one membership list |
| Base roles | `owner · admin · member · guest` |
| Vertical roles | a Kit may add labels (`kitchen`, `cashier`, `stock`); a member holds `roles[]` |
| Action access | `roles[]` gate who may execute |
| Record access | `scope: own | team | all` gates which Records |
| Card access | `roles[]` gate what appears on a Canvas |

============================================================
## 9. COST
============================================================

```
Monthly = 100 credits per active owned work workspace
Usage   = chargeable registered Action executions
Total   = monthly + usage
```

Manual reads and ordinary record edits cost 0. Declare cost before publishing an Action; preview it before a consequential run.

============================================================
## 10. FOREVER RULES
============================================================

```
1. One table. New capability = new type.
2. One writer. Every effect goes through the Gateway.
3. One name per thing. Card, not block.
4. Agents propose. Only Gateway commits.
5. Archive over delete.
6. Same key, same result.
7. Records hold truth; runs and events are history.
8. Reuse a Flow before adding one.
```

============================================================

# PART B — A PIZZA STORE, END TO END

============================================================

## B1. THE STORE

```
Slice House — one Work workspace
  People : owner, manager, cashier, kitchen
  Sell   : dine-in, takeaway, delivery
  Channels: Website chat + WhatsApp (customer)
            Slack (team)
            Instagram + Google Business (social)
```

============================================================
## B2. INSTALL
============================================================

One setup pass. No new tables, no new engine.

| Step | Result |
|---|---|
| Create work workspace | one isolated database + membership |
| Install Bot: **Order** | flows `order.take`, `order.complete` |
| Install Bot: **Kitchen** | flow `kitchen.prepare` |
| Install Bot: **Stock** | flow `stock.receive`, `stock.count` |
| Install Bot: **Shift** | flow `shift.close` |
| Connect channels | 2 customer, 1 team, 2 social |
| Seed records | 12 `product`, 1 `canvas`, 8 `card` |

Members and their roles:

| Person | roles[] |
|---|---|
| Raj (owner) | `owner` |
| Meera (manager) | `admin`, `cashier`, `stock` |
| Arjun (cashier) | `member`, `cashier` |
| Kiran (kitchen) | `member`, `kitchen` |

============================================================
## B3. RECORDS AND LINKS
============================================================

Record types in use:

| type | key fields |
|---|---|
| `product` | title, price_minor, station, available |
| `contact` | name, handles[] |
| `order` | number, service, items[], totals, kitchen_state, payment_state |
| `task` | title, roles[], state |
| `payment` | order, kind, amount_minor, method, state |
| `inventory_item` | unit, on_hand, minimum |
| `movement` | item, qty, reason |
| `shift` | opened_by, expected_minor, counted_minor, variance |
| `message` | channel, direction, body, contact |
| `channel` | family, provider, account |
| `flow` · `run` · `bot` · `canvas` · `card` · `event` · `link` | system |

```
order ──placed_by──> contact
order ──contains───> product
order ──paid_by────> payment
task  ──for────────> order
movement ──affects─> inventory_item
message ──from─────> contact
```

Links are Records (`type=link`). Nothing else connects anything.

============================================================
## B4. CANVAS BY ROLE
============================================================

One Canvas. Four views, filtered by `roles[]`.

| Card | kind | target | roles[] |
|---|---|---|---|
| Sales today | `metric` | `{ type: order, filter: paid+today }` | owner, admin |
| New sale | `action` | `pos.order.save` | owner, admin, cashier |
| Kitchen queue | `flow` | `kitchen.prepare` | owner, admin, kitchen |
| Low stock | `metric` | `{ type: inventory_item, filter: on_hand<minimum }` | owner, admin, stock |
| Close shift | `flow` | `shift.close` | owner, admin, cashier |
| Post special | `action` | `channel.publish` | owner, admin |
| Today's payments | `metric` | `{ type: payment, filter: confirmed+today }` | owner, admin |

```
              owner/admin            cashier              kitchen
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │ Sales today  │    │ New sale     │    │ Kitchen queue│
            │ Low stock    │    │ Close shift  │    │ (only card)  │
            │ Kitchen queue│    └──────────────┘    └──────────────┘
            │ Post special │
            └──────────────┘
```

Same Canvas record. The server returns three different lists.

============================================================
## B5. FLOWS
============================================================

```
order.take      channel message -> order -> kitchen task
kitchen.prepare accept -> preparing -> ready
order.complete  payment -> receipt -> close
stock.receive   supplier delivery -> movement -> availability
shift.close     count cash -> variance -> approval if needed
```

`order.take`:

```
[channel] message.received
   -> run starts (key = provider message id)
   -> agent.classify        -> intent = order
   -> contact find or create
   -> order create (draft, kitchen_state=not_sent)
   -> task create           -> kitchen ticket, roles=[kitchen]
   -> waiting
```

`order.complete`:

```
[human] kitchen marks ready  -> task.complete -> run resumes
   -> pos.checkout        -> payment confirmed
   -> movement create     -> stock down
   -> channel.reply       -> receipt on WhatsApp
   -> order state=completed
```

============================================================
## B6. A REAL ORDER, TRACED
============================================================

**11:42 — guest messages the WhatsApp number**

```
message (m_01)  direction: in   channel: whatsapp   body: "2 margherita + 1 coke"
```

Gateway: `channel.reply` intent queued, `message` saved, run started with key `wa:8842`.

**11:42 — agent classifies (proposes only)**

```
agent.classify -> { intent: "order", items: [margherita x2, coke x1] }
```

**11:42 — order created**

```
order (o_17)
  number          1042
  service         takeaway
  kitchen_state   queued
  payment_state   unpaid
  items           [{product: p_marg, qty: 2, price_minor: 24900},
                   {product: p_coke, qty: 1, price_minor:  6000}]
  totals          55800
  version         1
```

**11:42 — kitchen ticket born**

```
task (t_88)  title "Order 1042"  roles=[kitchen]  state=open
link  t_88 ──for──> o_17
```

Kiran opens TAR. Kitchen queue shows one Card. Tap → he sees only ticket contents: items, quantities, service type. No prices, no customer phone.

**11:51 — Kiran taps Start, then Ready**

```
transition task t_88 -> state=done
transition order o_17 -> kitchen_state=ready     version 2
```

The run resumes once. `task.complete` is idempotent — a double tap changes nothing.

**11:52 — Arjun takes payment**

```
pos.checkout -> payment (pay_31)
  order o_17   amount 55800  method upi  state confirmed
transition o_17 -> payment_state=paid  state=completed  version 3
```

**11:52 — stock moves (deterministic, no agent)**

```
movement mv_11  item i_marg  qty -2  reason: sale
movement mv_12  item i_coke  qty -1  reason: sale
```

`i_marg.on_hand` drops below minimum → a `stock.reorder` task is created for Meera.

**11:52 — receipt sent where the guest already is**

```
channel.reply -> WhatsApp -> contact c_44
```

**Result**

```
o_17  completed  55800 paid  took 10 min
```

No order table. No message table. No kitchen table. One `record` table, four types, six link rows, one run, five events.

============================================================
## B7. WHAT EACH PERSON SEES
============================================================

| Person | Canvas | Inbox | Channels |
|---|---|---|---|
| Raj (owner) | all 7 Cards | approvals, reorder | all |
| Meera (manager) | all 7 Cards | reorder, shift review | all |
| Arjun (cashier) | New sale, Close shift | his tasks | WhatsApp |
| Kiran (kitchen) | Kitchen queue only | kitchen tickets | none |

Enforced by three `roles[]` checks over one dataset.

============================================================
## B8. STOCK AND SHIFT
============================================================

**Stock**

```
delivery arrives -> stock.receive
  -> product availability derived from movements
  -> low stock creates a task, never a silent edit
```

**Close shift**

```
shift.close
  -> expected cash = opening + cash sales - refunds
  -> human counts cash (human Action)
  -> variance = counted - expected
  -> within policy -> close
  -> above policy -> approval.request -> owner approves in Inbox
  -> shift record closed, report generated
```

============================================================
## B9. SOCIAL
============================================================

Raj posts the Friday special.

```
channel.publish -> Zernio
  channels: instagram, google-business
  content:  "Friday: 2 for 1 margherita"
```

```
channel.publish result
  instagram        published
  google-business  published
```

One request, several destinations, each succeeds or fails alone. A caption too long for one network fails on that entry only — the others still publish.

============================================================
## B10. FAILURE CASES
============================================================

| Situation | Behavior |
|---|---|
| WhatsApp resends the same webhook | same key → same order, no duplicate ticket |
| Payment times out | state stays pending, reconcile, never blind resend |
| Guest changes order mid-prep | new order version or a delta ticket, priced by snapshot |
| Margherita sold out | kitchen marks it; flow pauses and asks replace / remove |
| Kitchen offline | ticket waits in Inbox; nothing is lost |
| Cashier double-taps Pay | one payment; repeat returns saved result |
| Staff member removed | future Gateway calls rejected immediately; audit kept |
| Overnight crash | runs resume from saved cursor; retries are bounded |

============================================================
## B11. WHAT THE STORE COST
============================================================

```
Slice House        1 work workspace   100 credits / month
Manual work        reads, edits, kitchen, cashier   0
Agent use          classify + summaries             billed per run
Total              monthly + agent usage
```

============================================================
## B12. WHY IT STAYS SIMPLE
============================================================

```
Add a pizza      -> one product record
Add a channel    -> one channel record
Add a promo      -> one channel.publish
Add a report     -> one card with a metric target
Add a process    -> one flow record
Add a permission -> one role label in a roles[] array
```

No new table. No new engine. No new builder concept.

============================================================

## FINAL REVIEW NOTES (v2 → v3)

| Gap found in v2 | Fix in v3 |
|---|---|
| Relations had no home | `link` is a reserved type: `{ from, to, relation }` |
| Control vs workspace storage was ambiguous | split into Control store + one workspace table |
| `work_role` (cook/cashier) still leaked vertical logic | member holds `roles[]`; verticals add labels |
| Card `target` was undefined | `metric = {type, filter}`, `action = actionId`, `flow = flowId` |
| Cost and forever-rules were scattered | one Cost section, one Forever Rules block |

> **Records hold truth. Actions do work. Flows order work. Cards show work by role. Channels carry it. The Gateway is the only writer.**
