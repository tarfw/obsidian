# TAR v3 — Architecture

> **Records hold truth. Actions do work. Flows order work. Agents choose within policy. Blocks show work by role. Channels carry it. The Gateway commits.**

```
1  Four primitives      6  Canvas and Blocks
2  DB, objects, stock   7  Channels
3  Actions + agents     8  Templates, access, local sync
4  Flows and Runs       9  Cost, efficiency, proof
5  Gateway             10  Forever rules
```

Target: almost no operational complexity for users. Keep correctness explicit underneath; prove efficiency with completed work, latency and cost.

User vocabulary = Space, Home, Inbox, business Records, Flows. Canvas is Home's layout; Block is its universal unit. Actions, Runs, operations, deliveries, events and skill revisions appear in authorized execution details only when needed. Business labels such as Customers and Orders replace technical Record names in daily use.

============================================================
## 1. THE FOUR PRIMITIVES
============================================================

| Primitive | Is | Does |
|---|---|---|
| **Record** | any stored unit of truth | stores |
| **Action** | one registered capability | performs one meaningful operation |
| **Flow** | versioned steps + trigger | orders work |
| **Gateway** | the business authority | authorizes + commits |

Canvas, Blocks, Channels, Bots, Runs, Messages, Links and Events are Records or queries over Records. An agent is an executor, not a new business primitive.

```
App / Channel / Schedule
           |
      Action or Flow
           |
     code / agent / human
           |
        Gateway -----> Records + saved result
           |                    |
     delivery intent       next step / wait / done
           |
     provider adapter ----> external service
```

- One logical writer = one authorized commit path, not one global lock.
- Every business mutation and external effect passes through that path.
- One contract serves the app, agents, channels and background work.

### 1.1. ANY BUSINESS = SAME CORE + COMPOSABLE CAPABILITIES

Pizza and SaaS are examples, not separate products or limits. A Space can start blank, use a template, or combine compatible capabilities. Templates set useful defaults; they do not lock the workspace to an industry.

| Business pattern | Records | Typical Flow |
|---|---|---|
| Retail / food | product, order, payment | sell -> prepare -> deliver |
| Services / agency | client, project, task | request -> quote -> deliver -> invoice |
| Appointments / rentals | resource, booking, contact | enquire -> reserve -> attend / return |
| Education / membership | course, enrolment, subscription | join -> onboard -> participate -> renew |
| Field work / production | job, asset, material | schedule -> assign -> inspect -> complete |
| Internal operations | request, employee, expense | submit -> review -> approve -> fulfil |

```text
Describe business / choose template / start blank
  -> reuse schemas + Actions + queries + interfaces
  -> configure Records + Flows + Blocks + team
  -> preview -> activate -> adapt as business changes
```

| Extension | Who supplies it | Boundary |
|---|---|---|
| Labels, fields, states, forms | user or AI draft | versioned schema configuration; keys follow §2.3 |
| Flows, Home, role defaults | user or AI draft | compose registered capabilities; validate before publication |
| New custom Record type | schema configuration through Gateway | data-only schema; bounded fields, references, transitions and migrations |
| Filter / list / board / calendar | registered view + typed settings | same Records; no separate feature database or generated executable UI |
| New invariant, integration, computation | reviewed pack / adapter code | registered Action or query plus tests; AI may help develop it, never install it from a business prompt |

Generic schema configuration supports ordinary tracking and approvals. Inventory, accounting, capacity booking, payroll and similar rules need appropriate domain Actions; renaming fields does not implement their invariants. Industry-specific requirements must be validated before claiming support. The core is extensible across businesses, not a promise that every capability already exists.

Reuse shared types such as contact, product and task. Pack dependency resolution checks schema/Action versions and reports conflicts; it never silently replaces another pack's meaning. Custom definitions remain workspace-scoped, use stable IDs, and migrate through versioned contracts. Existing Runs retain their definitions.

============================================================
## 2. STORAGE — TWO AUTHORITIES
============================================================

| Store | Holds | Boundary |
|---|---|---|
| **Control / D1** | identity, membership, grants, workspace routing | shared; workspace-scoped rows carry `workspace` |
| **Workspace / Turso** | searchable facts, transactions, relationships, pending work | one isolated database per workspace |
| **Objects / R2** | media, documents, large outputs, verified history archives | S3-compatible object storage; immutable content referenced by DB |
| **Durable runtime** | execution checkpoints, sleeps, retries | execution metadata; business state stays in Turso |
| **Device / local Turso** | permitted cached facts, drafts, pending commands, preferences | fast local experience; rebuildable cache is not business authority (§8.1) |

Control holds access and routing data, not orders, stock or conversations. The workspace connection decides the tenant; workspace rows need no `workspace`.

**One logical Record model. Start with one workspace `records` table.**

Each Record is one row. Common fields are columns; small type-specific facts go into `data`. Large content is stored as objects, not embedded in every row.

```
records
  id            text pk
  type          text
  title         text
  state         text
  data          json
  owner         text null
  assignee      text null
  due           int null
  version       int
  created / updated / archived
```

| Rule | Meaning |
|---|---|
| Extend | new business capability reuses Records and registered schemas |
| Validate | each type has a schema, transitions and writable fields |
| Concurrency | compare expected version inside transaction; require one affected row |
| History | published revisions, events and completed operation results are immutable |
| Archive | soft delete for business removal; retention/purge is a separate controlled operation |
| Storage | physical splits require measured query, retention or operational benefit |
| Migration | existing tables may remain behind the same contract while migrated |

**Hot filters are columns; small type-specific fields and object references live in `data`.**

```sql
CREATE INDEX recordstype ON records(type, state, updated DESC)
  WHERE archived IS NULL;
CREATE INDEX tasksassignee ON records(assignee, state, updated DESC)
  WHERE type='task' AND archived IS NULL;
CREATE UNIQUE INDEX operationkey ON records(json_extract(data,'$.key'))
  WHERE type='operation';
CREATE INDEX deliveriesdue ON records(state, due)
  WHERE type='delivery' AND state IN ('pending','retry');
CREATE UNIQUE INDEX openregister ON records(type)
  WHERE type='register' AND state='open' AND archived IS NULL;
```

Registered packs supply reviewed indexes and migrations. Creating a Block never runs DDL. If tenants are later pooled, `workspace` leads every tenant key and relevant index and scopes every query.

Reserved system types:

| type | meaning |
|---|---|
| `flow` | immutable published revision: trigger + executable steps |
| `schema` | versioned custom type/field/transition configuration; protected publication |
| `run` | pinned definition + business cursor + outputs + execution identity |
| `operation` | stable key + input hash + saved outcome |
| `delivery` | committed external intent + destination + retry/reconciliation state |
| `event` | append-only audit entry |
| `archive` | verified history-batch manifest; introduced only when archiving is enabled |
| `bot` | versioned bundle + Flow references + optional agent instructions |
| `canvas` / `block` | ordered home screen and its units |
| `channel` / `message` | provider connection and inbound/outbound item |
| `link` | additional relation: `{ from, to, relation }` |

Definitions have logical IDs plus immutable revision IDs. Large attachments stay in R2; Records store references. Generic CRUD cannot manufacture or rewrite system history. System schemas require non-null dedupe keys; type-specific indexes enforce occurrence and delivery uniqueness.

============================================================
## 2.1 DB + R2 — FACTS AND CONTENT
============================================================

**Split by use, not by Record type.** Keep facts needed for transactions, filtering and normal screens in the DB. Fetch large content only when opened or requested by an agent.

| Record | Keep in DB | Put in R2 |
|---|---|---|
| `product` | price, stock, reserved, units, SKU | photos, videos, long descriptions |
| `contact` | name, verified handles, relationships | attachments, imported source documents |
| `order` | items, price snapshots, totals, states, references | receipt PDFs, attachments |
| `task` | assignment, state, due date, short instructions | large supporting documents |
| `payment` | amount, method, provider reference, state | receipt files, bulky provider payloads |
| `reservation` / `movement` / `register` | operational and reconciliation facts | exports; verified history archives later |
| `message` | sender, conversation, time, short body, status | media, large bodies, raw webhook payloads |
| `channel` | configuration, capabilities, credential reference | usually nothing; secrets stay in secret storage |
| `run` | cursor, pinned revisions, required outputs, budget | large tool results, transcripts, artifacts |
| `operation` / `delivery` | keys, hashes, outcomes, references, pending state | large immutable payloads |
| `event` | compact audit facts and lookup references | detailed payloads, older compressed history |

```
product row
  id: p_123, type: product, state: active
  data:
    price: 24900
    stock: 40
    reserved: 6
    image:
      object: ws42/assets/imagehash.webp
      hash: <content hash>
      bytes: <verified size>
      mime: image/webp

List products -> DB facts -> render immediately
Open image   -> authorize reference -> load R2 object
Change stock -> DB transaction; image remains unchanged
```

| Placement rule | Default |
|---|---|
| Media / documents | R2 from the start; no base64 files in `data` |
| Short JSON / text | inline; avoid an object request for every tiny Record |
| Large JSON / text | 32 KB is an initial review threshold, not an automatic move rule |
| Transaction-critical facts | stay in DB regardless of size; split into related DB rows if warranted |
| Search | keep needed metadata/excerpts in DB; an R2 reference is not a searchable body |
| Definition snapshots | small definitions in DB; large supporting instructions may use pinned object refs |
| Access | private by default; check workspace/record/field policy on every content request |

Use workspace-prefixed immutable keys; the prefix is organization, not authorization. Public product media must be explicitly published. Private content uses authorized delivery or short-lived signed URLs. Never give an agent broad bucket credentials.

============================================================
## 2.2 OBJECT LIFECYCLE — NO UNSAFE DOUBLE WRITE
============================================================

```
Authorize upload -> write new immutable object -> verify hash/size/type
                 -> Gateway commits DB reference with version check
                 -> object is attached and visible

DB commit fails  -> upload remains unattached -> clean after grace period
Object changes   -> new object key -> commit new reference -> retain old as needed
```

- DB and R2 do not share a transaction. A committed reference points only to a verified object.
- Reserve upload ownership before transfer; cleanup cannot race an attachment commit.
- Uncertain commit -> check the saved operation/reference before removing anything.
- Receipt generation after checkout uses a committed job intent; a missing PDF does not roll back a sale.
- Active Runs may reference verified large outputs; retain those objects until recovery/replay no longer needs them.

**Archive after measured growth; start with attachments and large outputs.**

```
Select terminal history at a stable cutoff
  -> export compressed batch per workspace/time range
  -> verify checksum + record count + schema version
  -> commit archive manifest + lookup references
  -> prune eligible DB payloads after retention/grace checks
```

| Archive rule | Guarantee |
|---|---|
| Eligibility | completed immutable history only; never unfinished work or active reservations |
| Format | bounded compressed JSONL batches initially; no object per tiny event |
| Manifest | protected `archive` Record: key, hash, schema version, range/count, verification state |
| Lookup | searchable summaries + record-to-batch references remain in DB |
| Idempotency | retain keys, hashes and result references for the promised replay window |
| Old keys | expired keys are rejected or checked against retained evidence; never silently treated as new |
| Reconciliation | retain DB movement facts initially; later archival needs verified checkpoints + full history access |
| Immutability | relocation preserves original payload/hash; generic CRUD cannot replace audit evidence |
| Retention | referenced objects, active definitions, restore points and retention holds prevent premature cleanup |

Archive access is an explicit historical read; normal screens stay DB-only. Archiving is not a backup: keep DB recovery and referenced-object retention aligned and test restoring them together.

============================================================
## 2.3 QUANTITY — WHERE NUMBERS LIVE
============================================================

| Quantity | Home | Rule |
|---|---|---|
| Price, tax | `product.data` | money in minor units; rates in basis points |
| Sale lines | `order.data.items[]` | snapshot price, tax, units and rounding at acceptance |
| On hand | movements + `product.data.stock` | movements are truth; stock is a cache |
| Reserved | active reservations + `product.data.reserved` | accepted work claims stock before payment |
| Available | derived | `stock - reserved`; respect product availability policy |

**Naming is strict:** every column and JSON key is one lowercase ASCII word: `owner`, `created`, `price`, `contact`. No underscores, hyphens, dots, suffixes or abbreviations that join words. Context supplies meaning: money values are always integer minor units; rates are always integer basis points; timestamps are UTC milliseconds; IDs are stored in context-named fields such as `order` or `product`.

```
product.data     = { kind, price, currency, tax, stock, reserved,
                     low, sku, unit, scale, station, available }
order.data       = { number, contact, service, items[], total,
                     currency, kitchen, payment, day }
order.items[]    = { line, product, title, quantity, unit, scale,
                     price, tax, total, status }
movement.data    = { product, delta, balance, reason, reference }
reservation.data = { order, items[], expires }
```

```
Accept    -> validate + reserve + order + kitchen task, one transaction
Fulfill   -> consume reservation + movements + stock caches, one transaction
Cancel    -> release unconsumed reservation; account for prepared/wasted stock
Reconcile -> sum(movement.delta) = stock; active reservations = reserved
Low stock -> threshold crossing creates one open reorder task per product
Shortage  -> reject whole acceptance; never sell from a stale cached read
```

- Use integer base units: pieces, grams, millilitres; scales and rounding are explicit.
- Money and quantity arithmetic must stay within safe numeric bounds.
- One `product` type covers menu items, ingredients and supplies via `kind`.
- Recipes, when needed, map sold items to ingredient quantities; pin them at acceptance.
- A pack defines consumption at preparation or fulfillment; never blindly at payment.

============================================================
## 3. ACTIONS — ONE CONTRACT
============================================================

| kind | executor | behavior |
|---|---|---|
| `app` | trusted code / connector | registered operation through Gateway |
| `agent` | model + allowed tools | proposes tool calls and observes saved results |
| `human` | authorized person | answer or approval through Inbox |

```
Action = id + version + kind
       + input + output
       + roles + scope + effect + approval
       + retry + timeout + cost

effect = read | internal | external

                 Action registry
                /       |       \
          App form   Agent tool   Channel command
                \       |       /
           execute(action, input, key)
```

Core catalog:

```
record.get     record.search   record.create   record.update   record.archive
record.link    task.create     task.complete   approval.request
flow.start     flow.publish    bot.install     bot.remove
channel.reply  channel.send    channel.publish
agent.extract  agent.draft     agent.summarize agent.resolve
```

| Rule | Behavior |
|---|---|
| Meaningful tools | `order.place`, `stock.receive`, `pos.checkout`; one business intent each |
| Atomic domain work | trusted handler coordinates related records and invariants |
| Generic CRUD | approved types/fields only; cannot bypass stock, payment, access or history rules |
| Credentials / SQL | trusted adapters/storage code only; never exposed to models |
| One definition | schemas drive validation, tool descriptions and default app forms |
| Rich UI | custom interfaces invoke the same Action |

Vertical packs add schemas, Actions, queries and Flow templates. Adding a provider may require adapter code and testing, not merely a catalog entry.

============================================================
## 3.1 AGENTS — BOUNDED AUTONOMY
============================================================

**Agents propose; policy authorizes; Gateway commits.** A proposal does not automatically require a human.

```
Read authorized context -> choose allowed Action -> Gateway policy
                                                       |
                                    +------------------+--------------+
                                    |                  |              |
                                 execute          ask in Inbox       deny
                                    |                  |
                               saved result      approve exact input
                                    |                  |
                                    +----- observe / continue / finish
```

| Setting | Purpose |
|---|---|
| `allowed` | finite tool set; discover relevant permitted tools on demand |
| `grant` | principal, workspace, scope, expiry; never model-supplied authority |
| `steps`, `deadline`, `budget` | bounded execution and spend |
| `completion` | observable success condition; not the agent saying “done” |
| `approval` | execute within grant; ask where permitted; otherwise deny |

| Capability | Use in TAR |
|---|---|
| Extraction | text, image, receipt or voice -> validated structured proposal |
| One tool-using agent | ambiguous requests, customer support, exceptions |
| Fixed Flow | predictable orders, reminders, approvals, stock |
| Multiple agents | optional independent research/content jobs; shared budget, narrower grants |
| Retrieval / memory | scoped Records with sources/timestamps; summaries are replaceable |
| Code / browser | optional isolated adapter; restricted network/tools; effects still authorized |

- Messages, retrieved documents and tool responses are data, never authority.
- Agents cannot widen grants or edit policy, trusted tools or published instructions.
- Approval binds Action version, input hash, affected versions and expiry; changes require revalidation.
- Known routine work uses code. Combine extraction/classification when evaluations support it.
- Persist a key per tool operation; a new proposal is a new operation.
- Missing facts -> ask. Exhausted budget -> visible wait/failure. Never loop silently.

### 3.2. AI THROUGHOUT TAR — WHEN IT SAVES WORK

One contextual assistant is available from Home, Inbox, Records and the Flow editor. It receives the current Space, selected Records and permitted capabilities. Forms, taps and text/voice requests invoke the same contracts. Ordinary navigation and business operation never require an LLM response.

| Moment | AI contribution | Code / human boundary |
|---|---|---|
| Setup | suggest template, fields, team routing and initial Flows from a business description | reuse registered capabilities; preview concrete configuration before activation |
| Import | extract documents, map columns, propose matches and missing fields | stage data; code validates units, types and duplicates; ambiguous identity merges need review |
| Daily entry | turn text, image or voice into a filled form | show interpreted intent; Action policy determines confirmation |
| Search / questions | resolve intent, retrieve allowed facts, summarize with source links and freshness | indexed queries calculate totals; incomplete local data is never presented as a complete answer |
| Inbox | summarize context, draft replies, suggest next Action | deterministic assignment, urgency and dedupe first; human owns exceptions and required approvals |
| Content | generate messages, proposals, product copy and requested media | reusable templates first; external sends use delivery policy; large artifacts use R2 |
| Flow customization | turn plain language into a draft or explain a proposed change | compile into the same typed Flow; missing capabilities are reported, not invented |
| Operations | investigate anomalies and propose recovery or improved rules | scheduled checks detect known conditions; versioned review before changing live processes |

```text
Need = deterministic? -> code / saved template
       interpretation? -> one structured model call
       uncertain sequence? -> bounded agent + relevant tools
       judgement / approval? -> human task in Inbox
```

| Control | Default |
|---|---|
| Automation | per Flow: `manual`, `assist`, `auto`; all obey Action policy and grants |
| Human balance | `assist` prepares work for review; `auto` runs authorized routine steps and hands off exceptions |
| Model routing | cheapest model passing task evaluations; stronger model on measured failure, not every request |
| Context | scoped retrieval, current versions, compact outputs, pinned relevant skill; never sync or prompt the whole workspace for AI |
| Reuse | cache drafts/extraction by content hash + model/instruction revision + access scope; revalidate facts and authority before effects |
| Cost | dedupe input events; batch independent imports; generate on demand; no model per render, keystroke, sync event or routine retry |
| UI generation | select and configure trusted Blocks, forms and views; save the definition once; render locally without regeneration |
| Device AI | optional measured OCR, transcription or search assistance where the device supports it; lazy model download, bounded battery/storage, normal form fallback |
| Learning | record accepted/corrected outcomes with provenance; suggest improvements; no automatic policy changes or cross-workspace memory |
| Service failure | preserve draft and saved progress; retry within budget or hand off; manual business Actions remain available |

Model confidence alone never grants permission. Device-generated output is a proposal like typed input; the server checks current facts before commitment. AI execution and reusable skills stay inside registered agent Actions; no separate agent per screen, employee, or business type is required.

============================================================
## 4. FLOWS AND RUNS
============================================================

A Flow contains executable steps, not just Action names:

```yaml
type: flow
title: Customer follow-up
data:
  flow: customer.followup
  revision: 1
  trigger: manual
  steps:
    - id: create
      action: task.create
      input:
        title: "Follow up with customer"
        assignee: "$input.assignee"
      next: await
    - id: await
      wait:
        task: "$steps.create.output.task"
        state: done
        timeout: 7d
        fallback: failed
      next: done
```

`$input` and `$steps` are validated references, not arbitrary code. Publish validates schemas, bindings, transitions and termination paths.

```
ready -> running -> done
           |
           +-> waiting -> running
           +-> failed / cancelled

run = definition snapshot + cursor + persisted outputs
    + principal/grant + budget + runtime
```

| Rule | Behavior |
|---|---|
| Sequence | linear default; explicit branch/wait; bounded loops only |
| Pin | preserve Flow snapshot and Action versions; new publications affect new Runs |
| Resume | complete task + business transition + resume intent atomically |
| Dedupe | one trigger occurrence; stable operation key per step/tool call |
| Recovery | reuse completed results; an uncommitted model call may repeat |
| Concurrency | compare-and-set cursor; lease/fencing for claimed delivery work |
| Cancel | stop future work; reconcile in-flight effects; compensation is a new Action |
| Remove template | stop its new triggers through existing installation contracts; active Runs retain pinned definitions |

**One durable runner.** Target: prototype Cloudflare Workflows before building a custom scheduler.

```
Cloudflare Workflows -> durable sleep, retries, wakeups, execution checkpoints
TAR Run Record      -> business progress, pinned inputs, outputs, audit references
Gateway             -> sole authority for business transitions
Delivery worker     -> sends committed intents; does not invent business progress
```

Runtime checkpoints are execution metadata, not a second business database. Wakeups can repeat: re-read saved state and apply each business transition once. Reconcile missed runtime starts/signals from committed intents. Never operate two competing Run schedulers.

============================================================
## 5. GATEWAY — ONE COMMIT PATH
============================================================

One entry: `execute(action, input, key)`.
Four internal mutation verbs: `create`, `update`, `transition`, `link`. Archive is a controlled transition.

```
authenticate -> authorize -> validate -> compare versions -> commit -> saved result
                                                          |
                          ONE workspace transaction -------+
                          business Records + Run transition
                          operation result + audit + delivery intents
```

| Boundary | Guarantee |
|---|---|
| Operation | workspace-scoped key + canonical input hash + actor/Action identity |
| Replay | same key/input returns saved result after access check; different input conflicts |
| Local commit | unique key and checked writes prevent duplicate local effects |
| External delivery | may repeat; stable provider key where supported; reconcile uncertainty |
| Approval | re-check policy, principal and approved payload before execution |
| Retry | bounded transient retries; stale input needs a new decision |
| Audit | append-only; generic update/archive cannot alter it |
| Access change | Control and workspace commits are separate; recover by stable operation identity |

```
delivery: pending -> sending -> confirmed
                       |
                       +-> retry -> sending
                       +-> unknown -> reconcile -> confirmed / failed
```

- A timeout does not prove external failure. No universal “exactly once” delivery promise.
- `access.grant` commits an idempotent result in Control, then updates workspace progress; recovery bridges the gap.
- No D1 + Turso + provider transaction exists. Each boundary needs saved intent/result and reconciliation.
- R2 follows the verified-object/reference protocol in §2.2; content relocation never bypasses Gateway authority.
- Authorization covers reads, rows, fields and effects; hiding a Block is never access control.
- Automatic writes and provider callbacks use restricted service grants, not customer membership.

============================================================
## 6. CANVAS AND BLOCKS
============================================================

**Space** is the workspace boundary. **Home** is its Canvas; **Inbox** is its work queue. A **Block** is the Canvas's only unit.

```text
Space = people + permissions + Records
  Home  -> Canvas -> metrics, shortcuts, saved views
  Inbox -> tasks  -> work requiring human attention
                    -> source Record + authorized Actions
```

| Block kind | Shows | Tapping it |
|---|---|---|
| `metric` | registered query result | opens authorized source Records |
| `entry` | named operation or saved view | opens a form, starts work, or opens existing Records/Inbox |

```
Block = { kind, title, target, roles[] }

metric target = { query, params }
entry  target = { action, input? } OR { flow, input? } OR { query, params }

Exactly one target per entry. Query targets open existing work without starting a Run.
Users add a Block named New sale or Kitchen queue; target kinds stay internal.

Query = id + input + output + access + implementation
```

| Registered query | Definition |
|---|---|
| `sales.today` | sum completed order totals for business day; group by currency |
| `payments.today` | confirmed payment totals for business day; group by currency |
| `stock.low` | count eligible products where available quantity <= low-stock threshold |
| `kitchen.queue` | eligible kitchen tasks with permitted order fields |

Queries own joins, aggregation, date ranges and reviewed indexes. Blocks store typed parameters; no user SQL, arbitrary query language or per-Block DDL. Read-only queries do not create write operations.

For frequently refreshed totals, use scoped daily summary Records when measurement justifies them. Update exact summaries with the business transaction; asynchronous summaries expose freshness. Summaries are rebuildable and never bypass row/field permissions.

```
eligible Block = owner/admin OR viewer.roles intersects block.roles
visible Block  = eligible AND selected by role defaults or member preference
usable data = query policy + row scope + permitted fields
```

- One Canvas serves everyone; server filters and computes, app renders.
- Owner/admin can choose from all Blocks; default Home shows only a few relevant ones. Source data still follows access policy.
- Store member layout preferences as ordered Block references, not copied Canvases or query results; hidden Blocks never widen permissions.
- Build is the same Canvas in edit mode: add, remove, reorder.
- Generate a Home layout once from trusted Blocks, then edit/save it like any layout; no model call when opening Home.
- Reports reuse registered queries; a new computation needs a query implementation.

### 6.1. INBOX = ONE VIEW OF TASKS

```text
task = title + assignee + state + due
     + data { record, roles[], action, run?, step? }
record = source Record ID; standalone work may omit it
```

Tasks own human assignment and completion. Tickets own case lifecycle; conversations own messages. Their displayed handler is derived from the relevant open task, not separately editable assignment. A ticket may remain open while a response task is done; closing the case uses its domain Action and reconciles remaining tasks. Record `owner` remains business ownership, not the task assignee. Different responsibilities may have separate tasks; dedupe each responsibility.

| Rule | Implementation |
|---|---|
| One source | query existing `task` Records; no `inbox` Record, duplicate queue, or separate workflow engine |
| Assignment | `assignee` selects a person; `data.roles[]` selects eligible roles for shared work; `owner` is not assignment |
| Filters | Mine = assigned to me; Unassigned = eligible and unclaimed; Team = permitted team work |
| Saved views | Kitchen, Sales, Support = registered queries + typed parameters, using the same Inbox |
| Layout | kitchen may use large task tiles; sales may use a list; both use the same task contract |
| Entry | a Canvas Block opens a filtered Inbox; members can choose a permitted queue as their landing screen |
| Context | open the linked order, deal, ticket, or conversation with permitted fields and available Actions |
| Claim | Gateway atomically claims eligible unassigned work; concurrent claims cannot both succeed |
| Completion | execute the domain Action; merely reading or dismissing a notification never completes work |
| History | completed tasks remain available through history; routine events and agent progress do not fill Inbox |

```text
Flow -> automatic Actions -> done
             |
             +-> human needed -> task -> Inbox -> authorized Action
                                                   |
                                      commit result + resume intent
                                                   |
                                            resume same Run
```

- A human wait creates or reuses one task per Run step occurrence, using a stable operation key. The task holds `data.run`, `data.step`, and `data.record` as its source reference; standalone tasks need no Run.
- Approval tasks retain the approval binding from §3. Completing a task cannot bypass the required authority or domain validation. Duplicate completion and resume signals are harmless.
- A new customer conversation creates or updates one open response task when human attention is required. Additional messages attach to the same conversation and task; automated handling creates no human task unless it hands off.
- Claiming, completing, and reopening work checks current versions. A reply resolves only the messages it actually covers; a later inbound message keeps or makes the conversation actionable.
- Actionable failures become assigned tasks with a recovery Action; routine retries remain in Run history. Notifications point to existing work and do not create another task.
- Use indexed task filters, bounded pagination, and refresh changed rows. Inbox counts use the same authorized queries. No AI calls are needed to list, sort, or route deterministic work.

============================================================
## 7. CHANNELS — THREE FAMILIES, ONE ENVELOPE
============================================================

```
Channel = { family, provider, account, direction: in | out | both,
            capabilities[], credential }
Message = { channel, provider, conversation,
            contact, direction, body?, content?, attachments[] }
```

| Family | Who | Target adapters | In / out |
|---|---|---|---|
| **team** | your people | Slack, Discord, Google Chat, Telegram | requests / notifications |
| **customer** | buyers and contacts | website/chat, email; Zernio where supported | conversations / replies and sends |
| **social** | public audiences | Zernio where supported | comments, mentions / publishing |

Provider lists describe intended coverage, not guaranteed parity. Adapters advertise verified capabilities, limits and delivery status.

| Action | Does |
|---|---|
| `channel.reply` | reply in an existing conversation |
| `channel.send` | start an outbound message to an allowed recipient |
| `channel.publish` | one delivery intent per social destination |

```
Verify webhook -> dedupe by provider + account + event ID
               -> persist Message + trigger intent
               -> acknowledge -> execute under a restricted grant
```

- Team channel: one shared destination per workspace; members verify identity once.
- Linking a chat identity grants no business authority; membership decides.
- Customer conversations remain Records; conversations needing human attention appear through linked Inbox tasks (§6.1). Policy decides who or what may respond.
- Contacts have verified handles; never merge people from guessed identities.
- Family belongs to the connection: Telegram group can be team; DM can be customer.
- Check recipient, content, attachments and capability before delivery.
- Short message text stays inline; large bodies/media use verified references. Acknowledge webhooks only after required input is durably saved; enforce payload limits.

============================================================
## 8. TEMPLATES, SPACE, ACCESS
============================================================

```
Business template = initial schemas + Flows + Blocks + role defaults
Install = one setup -> validate dependencies + pin revisions + configure workspace
Customize = adjust installed Flows and Home; preserve member choices on upgrade
Remove = disable its triggers + archive installation; preserve Records + Runs/history
```

One business template starts a Pizza Store or SaaS CRM workspace. Users choose their team and connect needed channels once. AI is optional within a Flow; no separate Kitchen, Stock, or Shift Bot installation is required. Start blank or add another template when needed.

Templates are a setup experience over registered packs and existing `bot.install` / `bot.remove` contracts; they add no runner or business primitive. Existing `bot` bundles may remain internal installation metadata. Agent instructions load only for relevant agent Actions; they cannot install trusted code, widen grants or rewrite policy. Template updates preview changes and preserve customized Flow revisions unless explicitly adopted.

```
Google sign-in -> Personal workspace (free, always there)
                    `-> Work workspace -> members + shared Records
```

| Item | Rule |
|---|---|
| Workspace | isolated database + membership + timezone + currency/business-day settings |
| Base roles | `owner`, `admin`, `member`, `guest` |
| Vertical roles | additional labels: `kitchen`, `cashier`, `stock`; members hold `roles[]` |
| Own scope | `owner = actor`; assignment separately permits task access |
| Team scope | records explicitly shared with permitted team roles |
| All scope | all permitted records within this workspace, never cross-tenant |
| Field access | server projects allowed fields for app, query and agent reads |
| Delegation | bounded by delegator authority and workspace policy |
| Revocation | subsequent authorization checks deny work; in-flight effects reconcile |

App renders from local Turso facts and drafts first; synchronization runs behind the screen. Business writes remain Gateway commands. Cached reads, optimistic previews and authoritative confirmation are distinct (§8.1–§8.4). Never show an offline payment as confirmed.

### 8.1. LOCAL FIRST — VERIFIED BASELINE

Checked 2026-09-11: `tarapp` declares `@tursodatabase/sync-react-native` with range `^0.6.1`; installed version is `0.6.1`. Its SDK types expose pull, push and experimental partial sync. However, `src/lib/db.ts` opens local databases without a remote URL; `syncPull()` and `scheduleSyncPush()` are empty. Workspace screens currently fetch through `src/lib/harness.ts`. Local storage exists; working workspace synchronization is planned, not implemented.

Turso partial sync lazily fetches database **pages**; prefix or query bootstrap chooses the initial pages. This is a bandwidth optimization, not TAR row/field authorization: a query filter does not prevent later page reads or unrelated data sharing a page. Missing pages require connectivity. The documented API is experimental. [Turso partial sync](https://docs.turso.tech/sync/partial)

Turso's default write conflict policy is last push wins, with pending local changes replayed during pull. TAR therefore sends business commands through Gateway rather than pushing client SQL to authoritative Records. [Turso conflict resolution](https://docs.turso.tech/sync/conflict-resolution)

### 8.2. ONE LOCAL DATA LAYER

```text
UI -> local Turso -> render immediately
         |
         +-> confirmed cache <--- authorized sync <--- Gateway / Turso
         |
         +-> draft + command ---> Gateway Action ---> committed result
                                                        |
                                              cache update + refresh

Cloud: canonical Records + invariants + agent/Flow execution
Device: permitted working set + drafts + pending intent + local search
```

| Data / interaction | Device behavior | Server behavior |
|---|---|---|
| Home, registry, forms | cache permitted definitions; render known UI immediately | refresh changed definitions by revision |
| Inbox | open tasks + permitted source summaries; local filters and instant navigation | assignment, completion and exact queue membership remain authoritative |
| Catalog / CRM | active products, recent/assigned accounts and linked facts; local search | broader search and uncached detail on demand |
| Metrics | last confirmed value + freshness; local totals only for a known complete set | registered query computes authoritative totals |
| Drafts / preferences | save every meaningful edit locally; no network required | optional explicit cross-device save through the same authorized path |
| Business edits | local preview + durable pending command | validate permission, input, versions and domain invariants |
| Media | thumbnails and explicitly downloaded attachments within a cache budget | private content authorized; large bodies stay in R2 |
| AI | input/draft capture works offline; optional device assistance | cloud execution only when connected; required human handoff uses Inbox |
| History / audit / traces | fetch permitted detail when opened | retain canonical history; no default replication of runtime or provider payloads |

- One data repository serves all screens. Scope every cache, draft, command and subscription by account + workspace; avoid per-screen fetch/sync loops. An optional All Spaces Inbox merges authorized local summaries without merging databases or authority.
- Keep mutable drafts/commands in the existing device database, separate from replaceable confirmed cache or native replicas. A cache rebuild must never erase pending work. Key cached queries by workspace, permission revision, query revision and parameters.
- Open the last permitted working set first. New installation, new workspace or missing data shows setup / online-required state, never an invented empty business. Local results disclose when they cover downloaded data only.
- Default working set = Home + current Inbox + linked summaries + recent/pinned Records. Fetch inactive workspaces and old history lazily. Bound rows, bytes and image cache; preserve unsent drafts and pending-command dependencies during eviction.
- Render stable layouts with reactive local queries. Notify affected views after a local transaction; preserve scroll, filters and typed input during refresh. Start embeddings or device models only when their feature is used.

### 8.3. SYNC — AUTHORIZE FIRST, TRANSFER LESS

| Mode | Use | Decision |
|---|---|---|
| Scoped Gateway sync | normal team/customer workspace with row and field restrictions | default: filtered snapshots/deltas into local Turso |
| Turso native partial sync | a dataset whose entire physical content is allowed for every recipient | optional read replica after compatibility, permission and offline tests |

**Default delivery = application-level selective sync.** Add a versioned read endpoint to the existing harness; reuse its authorized queries. Start with bounded snapshots and revision checks, then use incremental deltas for active work. This requires neither a new Worker project nor one remote database per member.

```text
open / foreground / reconnect / invalidation
  -> authorize account + workspace + permission revision
  -> bootstrap snapshot OR continue scoped cursor
  -> response { revision, cursor, records, removed, more }
  -> local transaction: apply rows + removals + cursor
  -> notify affected views
```

- Bootstrap uses a consistent snapshot and matching committed watermark. Pages share that boundary. A later change is delivered after the watermark; timestamps alone are not a safe cursor.
- Maintain a compact indexed `changes` log with `sequence`, `record`, `version`, `kind`, committed with business writes. It is internal sync metadata, not a new business primitive or full duplicate payload. Feed order must follow committed visibility; recheck current access when projecting records.
- Bind cursors to workspace, principal, permission revision, schema and registered view parameters. Deltas include removals for deletion, reassignment and leaving the subscribed set. Retain enough membership metadata to calculate removals, or replace the bounded view atomically when its membership changes. Evict a Record only when no other authorized cached view/detail still needs it.
- Joins and metric dependencies invalidate their registered views. Refresh bounded query results and remove obsolete fields; never merge a new restricted projection into an old wider row. Share cached rows only between compatible permission projections.
- If access changes or a cursor expires, discard the obsolete confirmed scope and bootstrap it again. Keep private unsent drafts separate, but quarantine commands referencing revoked access. Retain the change log for the supported offline window; older devices rebuild rather than silently miss changes.
- One sync coordinator per active account manages workspace work, with one in-flight sync per dataset. Coalesce duplicate requests; foreground/connectivity events and server invalidations prompt pulls. Use backoff with jitter, a modest foreground fallback poll, and platform-supported background opportunities. Background delivery is not guaranteed.
- Notifications carry invalidation hints, not business truth. The persisted cursor recovers missed signals. Update visible workspace work first; synchronize inactive Spaces only for requested summaries or pending commands.

**Native partial sync = optional transport, same repository and command path.** Use it only for a dedicated dataset containing solely replicable fields (for example, a sanitized catalog). A shared workspace `records` database includes restricted facts and system history, so never expose its page endpoint or database token to members based on UI filtering.

- Do not add a projection database per user by default. If a shared safe projection proves cheaper than Gateway deltas, maintain it from committed changes; it is rebuildable, exposes freshness, and remains subordinate to canonical Records.
- Pin and test the React Native SDK, native build, database engine and cloud protocol together. Current harness uses `@libsql/client/web` and `libsql://` connections; do not infer modern sync compatibility from the Turso brand or change URL schemes without validation.
- Use query bootstrap for the small startup working set, then tune batched fetch/prefetch against measured bytes and latency. Preload exact offline screen queries and dependencies; verify offline readiness after updates. A partial file by itself never proves an offline screen is complete.
- Native replica credentials or its serving boundary must enforce read-only access to the entire safe dataset; disabling `push()` in UI is not enforcement. Verify that the chosen server/SDK supports this. If it does not, retain scoped Gateway sync.
- Select one transport per dataset. Do not apply Gateway deltas and native page replication to the same local cache tables. Native replicas contain no locally edited business rows; the separate device database stores pending commands.

### 8.4. OFFLINE WRITES + HUMAN EXPERIENCE

```text
user edit -> local draft + durable command -> immediate pending preview
                          |
                reconnect / send when allowed
                          |
                 Gateway: reauthorize + validate + commit
                          |
                 confirmed result / needs attention
```

```text
command = { key, action, input, base, state, created, expires, after? }
base = expected Record versions; after = prerequisite command key
```

| Action offline policy | Experience |
|---|---|
| `draft` | prepare form/content locally; explicit submission when online |
| `queue` | persist and retry intent, showing Pending until server acceptance |
| `online` | current server confirmation required before the operation is reported complete |

Add optional `offline` metadata to versioned Action descriptions; legacy Actions default to `online`. Ordinary notes and eligible task updates may queue. Stock reservation, shared task claims, resource booking, payment confirmation, access changes and approval execution require current validation; disconnected input may be a draft but cannot claim success. Offline sale acceptance with guaranteed inventory would require a separately designed allocation capability, not a generic cache flag.

- Persist a cryptographically random operation key and exact payload before the first attempt. Retry unknown outcomes with that same key; check saved results. Editing a submitted intent creates a new key. Do not coalesce commands already attempted.
- Serialize dependent commands per business entity; allow independent work to progress. Client-generated IDs and dependency keys link queued creation to later edits. A rejected prerequisite pauses dependents for review.
- Store the authorized Action result in the confirmed cache immediately; keep it if later sync delivers older versions. Acknowledge the command and remove its preview atomically with applying the confirmed result. Read responses return enough permitted changed facts, or retain the preview until the matching confirmed versions arrive.
- On conflict, preserve the draft and show current server facts with a focused choice. Auto-merge only explicitly independent fields through a new validated Action; never last-write-wins stock, money, approvals or assignment. A cancelled task cannot become done because an old offline tap was replayed.
- Show three useful states: Saved on device, Pending, Needs attention. Confirmed business state uses ordinary labels such as Paid or Ready. A queue timeout never masquerades as success; expose detailed sync diagnostics only on demand.
- Use OS-protected files and secure credential storage; configure and test encryption for datasets requiring it. Offline access follows a finite workspace policy. Revocation blocks future sync and effects; already downloaded data cannot be recalled from a disconnected device. Purge revoked cache, attachments and derived search data on reconnect or logout, with explicit handling for unsent private drafts.
- Empty and partial local results are not authoritative absence. Online confirmation and server-side calculations remain required wherever a decision depends on globally current data.

============================================================
## 9. COST, EFFICIENCY, PROOF
============================================================

```
Monthly = 100 credits per active owned work workspace
Usage   = declared chargeable Action executions
Total   = monthly + usage
```

Manual reads and ordinary record edits cost 0. Show charges and approval requirements before consequential work. Reserve budget before chargeable work; meter retries internally without duplicating the user charge for the same operation.

| Efficiency rule | Implementation |
|---|---|
| Few model calls | code for calculations/validation; combine compatible extraction steps |
| Small context | relevant Records, compact outputs, tool discovery; no workspace dumps |
| Model choice | least expensive model meeting measured quality; escalate as needed |
| Reuse | saved step results, versioned instructions, scoped caches |
| Credentials | reuse valid scoped Turso tokens until refresh; avoid minting per request |
| App requests | local first render; batch initial reads, paginate lists, refresh changed data through one coordinator |
| Object storage | small DB facts + on-demand R2 content; batch old history instead of tiny objects |
| Query cost | indexed filters; measured daily summaries instead of repeated full-history scans |
| Background work | durable wakeups and committed deliveries; one Run scheduler |
| Memory | sourced facts with scope/version; summaries never override current Records |

**Proof before more machinery:**

| Evaluation | Must demonstrate |
|---|---|
| Duplicate webhook / double tap | one local business effect; same saved result |
| Concurrent stock change | no oversell; related writes commit together or none do |
| Crash / lost signal | completed work survives; pending work resumes |
| Payment timeout | no blind resend; provider result reconciles |
| Revoked role / stale approval | deny execution or require fresh authorization |
| Injected customer instruction | no wider tool access, data exposure or authority |
| Ambiguous order / budget limit | asks or stops visibly; does not invent required facts |
| Offline launch / missing pages | cached screens render; missing data is explicit; no false empty queues or complete totals |
| Reconnect / duplicate command | stable key yields one effect; draft survives crash and rejected submission |
| Concurrent claim / changed booking | one winner; other device sees conflict, not false confirmation |
| Permission change / device switch | no cross-account cache; removed rows/fields leave cache; commands reauthorize |
| Snapshot / expired cursor | no lost committed changes; bounded rebuild preserves unsent drafts |
| Native partial sync | prove safe dataset access, read-only enforcement, cold/warm/offline behavior on supported devices |
| Generated schema / Flow / UI | valid registered capabilities; no executable injection, invented tools or policy changes |

Measure verified completion, cost per completed job, p95 latency, retries and unnecessary human interruptions. Include DB bytes/indexes, rows scanned/written, sync volume, R2 bytes/requests and archive processing. Evaluate before changing models, prompts, tools or autonomy policies.

```
Storage bill = DB plan + storage/operation overages
             + R2 storage + object requests + processing

Rollout      = bulky content first -> measure -> archive terminal history if useful
```

Object storage has cheaper bytes, but extra requests and processing can erase savings for tiny frequently read objects. Compare the whole workload, including plan allowances; do not promise a fixed savings percentage. Keep vendor rates in pricing references, not execution rules.

### 9.1. DELIVERY ORDER — EVOLVE THE EXISTING HARNESS

| Phase | Concrete change | Proof before expansion |
|---|---|---|
| 1 | local repository + scoped snapshot cache + durable command queue; reuse current Action endpoints | warm Home/Inbox without network; restart preserves drafts and command keys |
| 2 | transactional change cursor, removals, registered view invalidation, one sync coordinator | correct multi-device changes and revocation; fewer transferred bytes than repeated snapshots |
| 3 | composable templates, custom schema configuration, assisted Flow/Block generation | a third business works without a fork or rewritten core; generated drafts pass normal validation |
| 4 | optional Turso native partial read projection and device AI | measurable improvement on target devices after SDK/cloud/access checks; retain supported fallback |

Native sync and generated configuration are additive capabilities behind versioned adapters. Keep existing Action IDs, Gateway authorization, operation replay and durable Run ownership. Migrate legacy card/task fields and local caches separately from user drafts; never run destructive legacy cleanup on a replica or pending-command store. Remove redundant polling/fetch paths only after the repository covers their screens.

Measure cold start, warm render, p95 local query time, sync delay, bytes per active user, reconnect recovery, command conflicts, disk/battery use, AI cost per completed task and human corrections. Establish budgets on representative low-end devices and production-sized data; avoid invented zero-latency or universal savings promises.

============================================================
## 10. FOREVER RULES
============================================================

```
1. One logical Record model; DB facts + object content; storage follows evidence.
2. One Gateway for business authority; one durable Run scheduler.
3. One Action contract for humans, agents and channels.
4. Agents propose; policy authorizes; Gateway commits.
5. Generic CRUD never bypasses domain invariants or system history.
6. Same operation key + same input = same saved local result.
7. External uncertainty is reconciled; never blindly resent.
8. Published definitions and completed evidence are immutable.
9. Reuse Flows, queries and context; add machinery only when measured.
10. Integer money and scaled quantities; explicit units and rounding.
11. Local reads and drafts are immediate; business confirmation comes from Gateway.
12. Templates configure one core; AI assists through its existing contracts.
```

============================================================

# PART B — A PIZZA STORE, END TO END

============================================================
## B1. THE STORE
============================================================

```
Slice House — one Work workspace
  People  : Muthu (owner), Malar (manager), Iniya (cashier), Velan (kitchen)
  Sell    : dine-in, takeaway, delivery
  Settings: Asia/Kolkata, INR, configured business-day cutoff
  Channels: Website chat + WhatsApp (customer)
            Slack (team), Instagram + Google Business (social)
```

Connections require an adapter advertising the needed capability.

============================================================
## B2. INSTALL
============================================================

| Step | Result |
|---|---|
| Create workspace | isolated database + membership + settings |
| Choose Pizza Store template | installs `order.take`, `kitchen.prepare`, `stock.receive`, `stock.count`, `shift.close` together |
| Configure team | assign roles; choose relevant Home defaults and Inbox landing |
| Connect channels | 2 customer, 1 team, 2 social |
| Seed Records | products + opening movements + 1 Canvas + 7 Blocks |

| Person | roles[] |
|---|---|
| Muthu | `owner` |
| Malar | `admin`, `cashier`, `stock` |
| Iniya | `member`, `cashier` |
| Velan | `member`, `kitchen` |

Customer intake uses a grant for public menu reads, confirmed order acceptance and replies in that conversation. It cannot grant access, change prices or confirm payment.

============================================================
## B3. RECORDS AND RELATIONS
============================================================

Each entry is a separate DB row. `state`, `assignee` and other common fields are columns; remaining facts below live in `data`. All names follow §2.3. Large content uses the references in §2.1.

| Type | Key fields |
|---|---|
| `product` | kind, price, stock, reserved, low, unit, scale |
| `contact` | name, verified handles[] |
| `order` | contact, items[], total, kitchen, payment |
| `task` | data.record, data.roles[], assignee, state |
| `payment` | order, amount, method, reference, state |
| `reservation` | order, items[], expires, state |
| `movement` | product, delta, balance, reason, reference |
| `register` | opened, opening, expected, counted, variance |
| `message` / `channel` | conversation and connection |
| `run` / `operation` / `delivery` / `event` | progress, replay, intent, audit |

```
order.data.contact         -> contact
order.data.items[].product -> product     -- historical line snapshot
payment.data.order         -> order
task.data.record            -> order
reservation.data.order     -> order
movement.data.product      -> product
message.data.contact       -> contact
```

Direct references connect ordinary relationships. Link Records express additional relations, such as `contact --referrer--> contact`. Do not duplicate every reference as a Link.

```
Product photo  -> R2; product.data.image -> verified object
Receipt PDF    -> R2; order.data.receipt -> verified object
Order lines    -> DB; checkout/kitchen never fetch files to validate the order
Agent trace    -> R2 when large; Run keeps cursor, required outputs and references
```

============================================================
## B4. HOME + INBOX BY ROLE
============================================================

| Block | Kind | Target | roles[] |
|---|---|---|---|
| Sales today | `metric` | `sales.today` | owner, admin |
| New sale | `entry` | `pos.open` | owner, admin, cashier |
| Kitchen queue | `entry` | `kitchen.queue` opens existing Inbox tasks | owner, admin, kitchen |
| Low stock | `metric` | `stock.low` | owner, admin, stock |
| Close shift | `entry` | `shift.close` | owner, admin, cashier |
| Post special | `entry` | `channel.publish` | owner, admin |
| Today's payments | `metric` | `payments.today` | owner, admin |

```
role          Home / Canvas                 Inbox
owner/admin   Sales today, Low stock,      approvals + permitted team work
              Today's payments
cashier       New sale, Close shift        handovers + assigned shift work
kitchen       Kitchen queue shortcut       eligible preparation tasks
                                           ^ default landing for kitchen
```

Same Canvas; all 7 Blocks are available to owners/admins, with only selected defaults shown. Server filters Blocks and source fields. Kitchen receives items, quantities and service details; prices and customer phone numbers never enter its response.

Kitchen queue lives in Inbox. Its Home Block opens the same tasks; it never copies them. `order.place` creates the kitchen task once; claiming and completing it updates the order through the domain Action. Human handover or shift steps create their own tasks only when attention is required.

Local working set = permitted menu + current preparation tasks + order summaries + Home metrics. Velan can read downloaded kitchen work offline; shared claim requires connection. Ready may queue only if its Action allows it, stays Pending, and must pass current order/version checks. Iniya can prepare a cart offline; stock acceptance and payment confirmation remain online. Reconnect updates the same local rows without reopening the screen.

============================================================
## B5. FLOWS
============================================================

```
order.take       message -> interpret -> confirm quote -> order.place
                        -> await kitchen -> await payment -> await fulfillment
kitchen.prepare  select existing task -> start -> ready -> complete task
stock.receive    delivery -> movements -> stock caches -> low-stock check
stock.count      physical count -> explained adjustment movements
shift.close      count -> variance -> approval if needed -> close register
```

| Order step | Executor | Result |
|---|---|---|
| Interpret request | agent | structured items + missing facts; no price invention |
| Resolve menu / quote | code + customer response | valid IDs, price snapshot, confirmed intent |
| `order.place` | app through Gateway | order + reservation + kitchen task + audit, atomic |
| Wait for kitchen | durable runner | resume after committed completion; duplicate signals harmless |
| `pos.checkout` | cashier + trusted adapter | payment intent, then independently verified result |
| `order.fulfill` | cashier confirms handover through Gateway | consume reservation + movements + complete order + receipt intent |
| Deliver receipt | adapter | confirmed, retry, or visible uncertainty |

Payment may arrive before kitchen readiness; check saved facts before waiting. Ready + paid does not prove handover. Kitchen/cashier work updates the same order; `order.take` observes those facts and owns its Run progression.

============================================================
## B6. A REAL ORDER, TRACED
============================================================

**11:42 — WhatsApp request**

```
message m_01: "2 margherita + 1 coke, takeaway"
key: provider + account + event ID
Gateway saves Message + Run-start intent; webhook is acknowledged.
```

**11:42 — interpret, quote, accept**

```
agent.extract -> intent=order, items=[margherita x2, coke x1], service=takeaway
code          -> resolve menu IDs + compute quote
customer      -> confirms INR 558.00 (tax-inclusive prices in this example)
order.place   -> order + reservation + task + operation + audit, atomic

order o17: number=1042, kitchen=queued, payment=unpaid, version=1
  items = [pmarg x2 at 24900 minor, pcoke x1 at 6000 minor]
  total=55800, currency=INR
reservation r17: pmarg=2, pcoke=1, state=active
task t88: "Order 1042", record=o17, roles=[kitchen], state=open
```

This example tracks prepared menu units. Ingredient kitchens reserve pinned recipe quantities instead. Available stock falls immediately; on-hand stock changes at consumption.

**11:45 / 11:51 — Start, then Ready**

```
kitchen.start -> order preparing, task claimed by Velan; order version=2
kitchen.ready -> order ready, task done, resume intent; order version=3
```

Each Action commits related changes together. Replaying its operation key returns the saved result. The Flow resumes by checking persisted state.

**11:52 — payment and handover**

```
pos.checkout -> payment pay31: amount=55800, method=upi, state=pending
provider confirmation -> payment confirmed + order payment=paid, version=4
order.fulfill -> reservation consumed + movements + stock caches
              + order state=completed, version=5 + receipt delivery intent

movement mv11: pmarg, delta=-2, reason=sale, reference=o17
movement mv12: pcoke, delta=-1, reason=sale, reference=o17
```

Fulfillment decrements reserved and on-hand quantities together. Low-stock checks create one open reorder task per product, not one per retry.

**11:52 — receipt**

```
committed channel.reply intent -> WhatsApp conversation -> delivery confirmed
order o_17: completed, INR 558.00 paid, 10 minutes
```

A failed receipt does not reopen the order. Only delivery retries or awaits reconciliation; no second payment, stock deduction or order.

If a PDF is requested, the saved receipt job renders the committed order snapshot into R2, verifies it and attaches its reference through the Gateway. Payment and stock facts remain in the DB.

============================================================
## B7. WHAT EACH PERSON SEES
============================================================

```
TEAM       one shared workspace destination; verified identity + membership
CUSTOMER   guest conversations; permitted staff/automation answer in Inbox
```

| Person | Canvas | Inbox | Customer conversations |
|---|---|---|---|
| Muthu | Sales today, Low stock, Today's payments | approvals, reorder | all permitted conversations |
| Malar | Sales today, New sale, Low stock | reorder, shift review | all permitted conversations |
| Iniya | New sale, Close shift | assigned/eligible work | WhatsApp, website chat |
| Velan | Kitchen queue | kitchen tasks | none; no guest contact data |

Everyone shares the one team channel. WhatsApp is a customer connection here. A linked identity, visible Block or task assignment never grants unrestricted record access.

============================================================
## B8. STOCK AND SHIFT
============================================================

```
stock.receive -> movement + on-hand cache, one transaction
stock.count   -> counted minus recorded -> adjustment movement with reason
order.cancel  -> release reservation; prepared waste is a separate movement
expiry        -> release/escalate by policy; never blindly expire active kitchen work
reconcile     -> on hand from movements; reserved from active reservations
```

```
shift.close
  -> expected = opening + confirmed cash sales - cash refunds
  -> human counts -> variance = counted - expected
  -> within policy: close register
  -> outside policy: approval task binds count + register version
  -> approved and still current: close register + saved report
```

============================================================
## B9. SOCIAL
============================================================

```
Muthu -> channel.publish
  destinations: instagram, google-business
  content: "Friday: 2 for 1 margherita"

Gateway -> validate capability + permission + content -> intent per destination
adapter -> instagram: confirmed; google-business: retry / unknown / confirmed
```

Each destination succeeds or fails independently. Persist destination results; retry only unresolved work. Reconcile uncertain publication before posting again. Agent-written promotions follow publishing approval policy.

============================================================
## B10. FAILURE CASES
============================================================

| Situation | Behavior |
|---|---|
| Duplicate webhook | same occurrence -> same Message/Run, no duplicate order |
| Double-tap Pay | stable payment operation -> saved result |
| Payment timeout | pending/unknown -> reconcile; never blind resend |
| Concurrent stock change | version/availability check rejects whole acceptance |
| Order changes mid-prep | versioned amendment + reservation delta + kitchen delta task |
| Kitchen offline | persisted task remains; reconnect refreshes authoritative state |
| Staff removed | subsequent checks deny work; grants/approvals revalidated |
| Crash after commit, before wakeup | reconcile intent; start/signal existing Run |
| Template removed during Run | no new triggers; active Run retains pinned revision |
| Customer says “ignore rules” | message is data; grants remain unchanged |
| Agent exhausts budget | stops visibly with saved progress |
| Receipt fails | order stays complete; only delivery retries/reconciles |
| Upload succeeds, DB commit fails | unattached object is reclaimed after reference check/grace period |
| Archive verification fails | keep source history in DB; do not prune |

============================================================
## B11. WHAT THE STORE COST
============================================================

```
Slice House        1 work workspace                   100 credits / month
Ordinary manual    reads, kitchen, cashier             0 TAR usage credits
Agent Actions      interpretation + optional drafts   declared usage
Provider services  channel/payment charges            disclosed separately
Retries/replays    same chargeable operation          no duplicate user charge
```

Agent budget limits do not block already accepted manual work.

============================================================
## B12. WHY IT STAYS SIMPLE
============================================================

```
Add a pizza      -> product Record
Add a connection -> supported adapter + Channel Record
Add a promo      -> channel.publish
Add a report     -> Block bound to a registered query
Add a process    -> versioned Flow using registered Actions
Add autonomy     -> bounded grant + agent Action
Add permission   -> policy/role update through Gateway
```

These simplifications change presentation and configuration, not the Action/Flow/Gateway contracts. Existing card layouts and task source fields are adapted at the boundary during migration; do not duplicate rows or drop existing work. New schema names use `block` and `data.record`; migrate stored references with versioned adapters before retiring old fields.

Evolve `tarharness`; reuse `tarapp`. Migrate behind versioned contracts. Prove one complete order path with crash/retry/permission tests before expanding packs or autonomy.

============================================================
# PART C — A SAAS SALES + CRM TEAM, END TO END
============================================================

## C1. WORKSPACE

```text
Orbit = one Work workspace
people = Thenmozhi owner | Marudhan sales | Kayalvizhi success | Vetrivel support
sell = selfserve + demo + annual contract
channels = website form + email for customers | chat for team
setup = choose SaaS CRM template -> assign team -> connect channels -> ready
```

## C2. RECORDS + RELATIONS

| Type | Key fields |
|---|---|
| `account` | name, domain, stage, owner, plan, renewal |
| `contact` | name, email, account, role, consent |
| `lead` | contact, source, score, stage, owner, next |
| `deal` | account, contacts, value, currency, stage, close, owner |
| `ticket` | account, contact, priority, category, owner, state |
| `subscription` | account, plan, seats, start, renewal, state |
| `task` | title, owner, assignee, due, state, data |

```text
lead.contact        -> contact
contact.account     -> account
deal.account        -> account
deal.contacts[]     -> contact
ticket.account      -> account
subscription.account -> account
```

All field names remain one lowercase word. An ID lives under its context name: `account`, `contact`, `owner`; it never needs an `id` suffix.

### SPACE / CANVAS / INBOX

```text
Orbit Space
  Home  = shared Canvas, filtered by role
  Inbox = shared task model, filtered by assignment and access
  Record detail = account / lead / deal / ticket / conversation
```

| Person | Home / Canvas | Inbox |
|---|---|---|
| Thenmozhi — owner | revenue, pipeline, renewals | approvals, escalations, permitted team work |
| Marudhan — sales | leads, deals, New deal | qualification, followups, proposal review |
| Kayalvizhi — success | customers, onboarding, renewals | setup tasks, kickoff, renewal reviews |
| Vetrivel — support | ticket overview, customer lookup | eligible unassigned tickets, assigned replies |

Home uses metric and entry Blocks, with a few relevant defaults per role. Totals and lists use registered queries; create buttons use Actions or Flows. Queue shortcuts open filtered Inbox views. Account and deal screens show their linked tasks and conversations, using the same Records. A ticket with several messages has one open response task per handling responsibility, not one task per message. Task assignment uses `assignee`; eligible shared work uses `data.roles[]`. Every source uses `task.data.record`, whether a lead, deal, ticket or conversation; one task detail screen resolves its type and permitted Actions.

Local working set = assigned tasks + recent accounts/deals + selected conversations + Home summaries. Marudhan writes meeting notes offline; Kayalvizhi checks downloaded onboarding work; Vetrivel drafts a reply. Queued edits revalidate on reconnect; sending or claiming work follows its Action policy. Company-wide pipeline totals come from a confirmed query, not a sum of one salesperson's cached deals.

## C3. THE FLOW SET

```text
website form / email
        |
        v
lead.capture -> dedupe -> score -> route -> task
        |                         |
        |                         +--> sales owner
        v
lead.qualify -> nurture | disqualify | deal.progress
                                      |
                                      v
                           discovery -> proposal -> contract -> won/lost
                                                              |
                                                              v
customer.onboard -> setup -> kickoff -> success

customer message -> support.resolve -> ticket -> reply -> close
renewal due      -> renewal.manage -> review -> quote -> renew/churn
```

| Flow | Trigger | Important Actions | Result |
|---|---|---|---|
| `lead.capture` | form, email | `contact.find`, `account.find`, `lead.create`, `task.create` | one routed lead; no duplicate contact |
| `lead.qualify` | sales task | `lead.update`, `deal.open`, `message.send` | nurture, reject, or active deal |
| `deal.progress` | sales update | `proposal.draft`, `proposal.send`, `contract.create`, `deal.update` | approved proposal and a won/lost deal |
| `customer.onboard` | deal won | `subscription.create`, `task.create`, `message.send` | owner, kickoff, and setup checklist |
| `support.resolve` | customer message | `ticket.create`, `ticket.update`, `message.send` | owned ticket and auditable reply |
| `renewal.manage` | schedule | `subscription.find`, `deal.open`, `message.send` | renewal, expansion, or churn record |

## C4. ONE LEAD, SAFELY

```text
Poongodi submits a demo form
  -> Gateway validates public input and rate limits it
  -> lead.capture finds or creates account + contact
  -> optional agent Action extracts company and intent into a draft
  -> code scores, creates lead, assigns Marudhan, creates task
  -> Marudhan qualifies -> deal.progress opens a deal
  -> agent Action may draft a proposal; Marudhan approves `proposal.send`
  -> won -> customer.onboard creates subscription + success tasks
```

The agent can read the submitted message and use only its granted Actions. This sales Flow permits drafting; external sends require its specified approval, prices come from trusted facts, and access changes are outside its grant. Direct SQL is never a model tool. Other Flows may authorize routine sends under their own policy (§3.2). A `skill` is pinned guidance inside that agent Action; the Flow still controls sequence and authority.

## C5. USER BUILT FLOWS

Start from a template. The default editor exposes Who, When, Conditions, and Message, with a readable step list and preview. Advanced opens the full step editor for branches, waits and registered Actions. Both editors save the same Flow definition and use the same validation and publishing path; there is no second execution language.

Users may add flows for their own team operations and customer operations. A user flow composes registered Actions; it is not arbitrary code, SQL, credentials, or new permissions.

```text
draft -> build -> validate -> test -> publish -> run
                         |                 |
                         v                 v
                 schemas + grants     immutable revision
```

| Stage | Rule |
|---|---|
| `draft` | user names the flow, audience, trigger, inputs, steps, and outcomes |
| `build` | each step selects a registered Action, bindings, condition, next step, or wait |
| `validate` | Gateway checks schemas, references, cycles, Action availability, grants, and approval rules |
| `test` | simulated records and preview deliveries only; no payment, message, or access effect |
| `publish` | owner or admin approves public or sensitive flows; Gateway creates an immutable revision |
| `run` | each Run pins its revision; edits create the next revision without changing live Runs |

Human step = title + person or eligible roles + source + required Action + optional due time. The runner creates its task automatically and waits for its committed outcome. Users do not build a second Inbox integration. Publishing may optionally add a Canvas shortcut; automatic steps need no Block or Inbox item. Customer steps stay in the customer channel or form; a team handoff appears in the team's Inbox.

| Audience | Safe boundary |
|---|---|
| `team` | member trigger -> role and grant checks -> registered internal Actions |
| `customer` | public trigger -> validation, consent, and rate limits -> restricted public Actions -> internal task or approval |
| `both` | customer input starts a limited Run; team steps continue under member authority |

Customer flows can collect a demo request, update preferences, start onboarding, answer allowed status questions, or open support tickets. Team flows can route leads, run handoffs, collect approvals, schedule reviews, and chase renewals. Neither can directly expose records, select credentials, grant access, confirm payment, or send to an arbitrary recipient unless a registered Action and its policy explicitly allow it.

## C6. COMPACT FLOW EXAMPLE

```text
name     = trial.followup
audience = both
trigger  = form

1 capture  = lead.capture(input)
2 wait     = 1 day
3 draft    = message.draft(lead)
4 approve  = sales approval
5 send     = message.send(draft)
6 wait     = customer reply, at most 3 days
7 branch   = interested ? lead.qualify : task for sales review -> end
```

`message.draft` may be an agent Action. `message.send` remains a separately policy checked Action, so making the draft smarter never makes the external effect less safe.

============================================================
## DESIGN REFERENCES
============================================================

| Topic | Basis |
|---|---|
| Workflows and bounded agents | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |
| Durable steps and waits | [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/) |
| One-table constraints | [SQLite partial indexes](https://sqlite.org/partialindex.html) |
| DB and object costs | [Turso pricing](https://turso.tech/pricing), [usage accounting](https://docs.turso.tech/help/usage-and-billing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Local sync and its boundaries | [Turso sync usage](https://docs.turso.tech/sync/usage), [partial sync](https://docs.turso.tech/sync/partial), [conflict resolution](https://docs.turso.tech/sync/conflict-resolution) |
| Object API | [R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/) |
| Context and tool efficiency | [Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [tool discovery](https://www.anthropic.com/engineering/advanced-tool-use) |
| Optional multi-agent execution | [Multi-agent research experience](https://www.anthropic.com/engineering/multi-agent-research-system) |
| Verified outcomes | [Agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |

Sources inform the design. TAR contracts and policies above are architectural decisions, not claims of implemented behavior.

============================================================

> **Records hold truth. Actions do work. Flows order work. Agents choose within policy. Blocks show work by role. Channels carry it. The Gateway commits.**
