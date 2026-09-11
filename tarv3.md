# TAR v3 — Final

> **Records hold truth. Actions do work. Flows order work. Cards show work by role. Channels carry it. The Gateway is the only writer.**

```
1  Four primitives      6  Canvas and Cards
2  Storage              7  Channels
3  Actions              8  Bots, space, access
4  Flows and Runs       9  Cost
5  Gateway             10  Forever rules
```

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
        Run ── Action ──> Gateway ──> Record
         ^                              |
         └──────── next Action ─────────┘
```

Gateway sits inside every hop. It cannot be skipped, removed or bypassed.

============================================================
## 2. STORAGE — TWO STORES
============================================================

| Store | Holds | Size |
|---|---|---|
| **Control** | identity, membership, workspace routing | tiny, few tables |
| **Workspace** | the one `record` table | one per workspace |

**Control** (`users`, `workspaces`, `members`) is shared and small. It never holds business data — it is the **only** store with a `workspace_id`, because it spans all workspaces.

**Workspace** is one isolated database per workspace with **one table**.

```
record
  id            text pk
  type          text
  title         text
  state         text
  data          json
  assignee      text null
  due_at        int null      -- runs, tasks, schedules
  version       int
  created_at / updated_at / archived_at
```

Rules:
- The database is the tenant. No `workspace_id` in workspace tables — the connection decides.
- New capability = a new `type`, never a new table.
- Definitions (flows, bots, canvases, cards) are rows, not a separate store.
- `version` gives optimistic concurrency; `archived_at` gives soft delete.
- Pooling several workspaces into one database is the only reason to add `workspace_id` back — and then it leads every index and every query.

**Hot filters are columns; everything else is `data`.**
Only `type`, `state`, `assignee`, `due_at` and the timestamps get filtered constantly, so they stay columns and every index stays small.

```
CREATE INDEX records_by_type   ON records(type, state, updated_at DESC) WHERE archived_at IS NULL
CREATE INDEX tasks_by_assignee ON records(assignee, state, updated_at DESC) WHERE type='task' AND archived_at IS NULL
CREATE INDEX runs_due          ON records(state, due_at) WHERE type='run' AND state IN ('ready','waiting')
CREATE INDEX records_by_day    ON records(json_extract(data,'$.business_date')) WHERE type='order'
CREATE UNIQUE INDEX one_open_register ON records(type) WHERE type='register' AND state='open'
```

Index what you filter, nothing else. A new Card or Flow that needs a new filter adds an index — never a table.

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
## 2.1 QUANTITY — WHERE NUMBERS LIVE
============================================================

| Quantity | Home | Rule |
|---|---|---|
| Price, tax | `product.data` | integers: minor units; tax in basis points |
| Line qty | `order.data.items[]` | snapshot at sale time; menu edits never rewrite history |
| Stock on hand | `movement` rows + `product.stock` | movements are truth, the number is a cache |

Naming, once: JSON keys are `snake_case`; every money field ends `_minor`; every rate ends `_bps`.

```
product.data  = { kind, price_minor, cost_minor, tax_bps, stock, low_stock, sku, unit, station, available }
order.data    = { number, service, items[], total_minor, kitchen_state, payment_state }
order.items[] = { product_id, title, quantity, price_minor, tax_minor, total_minor, status }
movement.data = { product_id, delta, balance, reason, reference }
```

```
Never edit stock directly     -> every change is a movement with a reason
One transaction writes both   -> movement (truth) + cached number (speed)
sum(deltas) = cached number   -> re-derive to reconcile
Availability is a state       -> crossing the threshold creates a task
Stale version or short stock  -> the whole action is rejected
Integers only                 -> no floats for money, tax or counts
```

One `product` type covers menu items, ingredients and supplies via `kind`. There is no separate inventory type.

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
agent.classify · agent.extract · agent.draft · agent.summarize
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
| Concurrency | one lease per Run; each occurrence advances once |
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

metric   target = { type, where }   Gateway computes the count
action   target = actionId
flow     target = flowId
```

`where` is one comparison — field, operator, value. No query language, no joins.

```
field    a column (state, assignee, due_at) or a data key (total_minor)
op       = != < <= > >=
value    a literal, or a word: today | this_week | this_month   (workspace timezone)
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
Channel = { family, provider, account, direction: in | out | both }
```

| family | who | providers | in | out |
|---|---|---|---|---|
| **team** | your people | Slack · Discord · Google Chat · Telegram (native) | a message becomes a request | notifications |
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
- Team channels are workspace-wide: **one shared destination** (Slack, Discord, Google Chat or Telegram). Each member verifies their chat identity once; that link grants no business authority.
- Customer channels are conversation queues: a guest message lands in the Inbox, and `roles[]` decide who may reply.
- A platform can serve two families: Telegram as a group is a team channel; Telegram as a DM is a customer channel. Family is a property of the connection, not the platform.

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
| Vertical roles | a vertical may add labels (`kitchen`, `cashier`, `stock`); a member holds `roles[]` |
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
9. Index what you filter.
10. Integers for money, tax and counts.
```

============================================================

# PART B — A PIZZA STORE, END TO END

============================================================

## B1. THE STORE

```
Slice House — one Work workspace
  People : owner, manager, cashier, kitchen
           Muthu · Malar · Iniya · Velan
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
| Seed records | 12 `product`, 1 `canvas`, 7 `card` |

Members and their roles:

| Person | roles[] |
|---|---|
| Muthu (owner) | `owner` |
| Malar (manager) | `admin`, `cashier`, `stock` |
| Iniya (cashier) | `member`, `cashier` |
| Velan (kitchen) | `member`, `kitchen` |

============================================================
## B3. RECORDS AND LINKS
============================================================

Record types in use:

| type | key fields |
|---|---|
| `product` | title, kind (menu / ingredient / supply), price_minor, stock, low_stock, station, available |
| `contact` | name, handles[] |
| `order` | number, service, items[], total_minor, kitchen_state, payment_state |
| `task` | title, roles[], state |
| `payment` | order_id, kind, amount_minor, method, state |
| `movement` | product_id, delta, balance, reason |
| `shift` | opened_by, expected_minor, counted_minor, variance_minor |
| `message` | channel_id, direction, body, contact_id |
| `channel` | family, provider, account |
| `flow` · `run` · `bot` · `canvas` · `card` · `event` · `link` | system |

```
order    ──placed_by──> contact
order    ──contains───> product
order    ──paid_by────> payment
task     ──for────────> order
movement ──affects────> product
message  ──from───────> contact
```

Links are Records (`type=link`). Nothing else connects anything.

============================================================
## B4. CANVAS BY ROLE
============================================================

One Canvas. Three views, filtered by `roles[]`.

| Card | kind | target | roles[] |
|---|---|---|---|
| Sales today | `metric` | `{ type: order, where: state=completed }` | owner, admin |
| New sale | `action` | `pos.open` | owner, admin, cashier |
| Kitchen queue | `flow` | `kitchen.prepare` | owner, admin, kitchen |
| Low stock | `metric` | `{ type: product, where: stock<=low_stock }` | owner, admin, stock |
| Close shift | `flow` | `shift.close` | owner, admin, cashier |
| Post special | `action` | `channel.publish` | owner, admin |
| Today's payments | `metric` | `{ type: payment, where: state=confirmed }` | owner, admin |

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
  items           [{product_id: p_marg, quantity: 2, price_minor: 24900},
                   {product_id: p_coke, quantity: 1, price_minor:  6000}]
  total_minor     55800
  version         1
```

**11:42 — kitchen ticket born**

```
task (t_88)  title "Order 1042"  roles=[kitchen]  state=open
link  t_88 ──for──> o_17
```

Velan opens TAR. Kitchen queue shows one Card. Tap → he sees only ticket contents: items, quantities, service type. No prices, no customer phone.

**11:51 — Velan taps Start, then Ready**

```
transition task t_88 -> state=done
transition order o_17 -> kitchen_state=ready     version 2
```

The run resumes once. `task.complete` is idempotent — a double tap changes nothing.

**11:52 — Iniya takes payment**

```
pos.checkout -> payment (pay_31)
  order o_17   amount_minor 55800  method upi  state confirmed
transition o_17 -> payment_state=paid  state=completed  version 3
```

**11:52 — stock moves (deterministic, no agent)**

```
movement mv_11  product p_marg  delta -2  reason: sale
movement mv_12  product p_coke  delta -1  reason: sale
```

`p_marg.stock` drops below `low_stock` → a reorder task is created for Malar.

**11:52 — receipt sent where the guest already is**

```
channel.reply -> WhatsApp -> contact c_44
```

**Result**

```
o_17  completed  55800 paid  took 10 min
```

One `record` table. `order`, `task`, `payment` and `movement` are rows, not tables. One run, six links, one full event trail.

============================================================
## B7. WHAT EACH PERSON SEES
============================================================

Two different things. They must never be mixed up:

```
TEAM CHANNEL       ONE per workspace — Slack, Discord, Google Chat or Telegram.
                   Everybody shares it. Nobody has a personal team channel.

CUSTOMER CHANNEL   Guest conversations — WhatsApp, Website chat, Email.
                   They land in the Inbox. roles[] decide who may reply.
```

**Why a cashier is never "on WhatsApp for the team":** WhatsApp is a *customer* channel. It carries guest conversations, and Iniya answers them from the Inbox. The team itself talks in the one workspace team channel. Joining that channel verifies identity only — it grants no business authority.

| Person | Canvas | Inbox | Team channel | Customer channels they work |
|---|---|---|---|---|
| Muthu (owner) | all 7 Cards | approvals, reorder | the one workspace channel | all |
| Malar (manager) | all 7 Cards | reorder, shift review | the one workspace channel | all |
| Iniya (cashier) | New sale, Close shift | her tasks | the one workspace channel | WhatsApp, Website chat |
| Velan (kitchen) | Kitchen queue only | kitchen tickets | the one workspace channel | none — kitchen sees no guest data |

One dataset. Three `roles[]` checks. One shared team channel.

============================================================
## B8. STOCK AND SHIFT
============================================================

**Stock**

```
delivery arrives -> stock.receive
  -> movement rows written
  -> product.stock cached in the same transaction
  -> availability derived; low stock creates a task, never a silent edit
```

**Close shift**

```
shift.close
  -> expected_minor = opening + cash sales - refunds
  -> human counts cash (human Action)
  -> variance_minor = counted_minor - expected_minor
  -> within policy -> close
  -> above policy -> approval.request -> owner approves in Inbox
  -> shift record closed, report generated
```

============================================================
## B9. SOCIAL
============================================================

Muthu posts the Friday special.

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

> **Records hold truth. Actions do work. Flows order work. Cards show work by role. Channels carry it. The Gateway is the only writer.**
