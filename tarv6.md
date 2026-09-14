# TAR v6 — Durable Architecture

> Records hold current truth. Events say what happened. Runs remember what happens next.

```text
Action or Event
      |
      v
load Record + Run
      |
      v
derive enabled transition
      |
      v
ACTION GATEWAY
      |
      v
ATOMIC SAVE
|-- changed Records
|-- Run checkpoint
|-- resulting Event(s)
'-- Delivery intent, when needed
```

**Architecture type:** hybrid state + Event log + durable state machine.

**Not full event sourcing:** current business state is read from Records. It is not rebuilt from the complete Event history for every request.

===============================================================================

## 0. PRODUCT MODEL

```text
+=============================================================================+
| TAR                                                                         |
+=============================================================================+
| SPACE              INBOX              MY AGENT              BOTS            |
| what matters       work needing       private general       installed       |
| now                attention          agent                 capabilities    |
+=============================================================================+
```

| Surface | One job |
|---|---|
| Space | Show permitted facts, metrics and common Actions |
| Inbox | Show work, waits, approvals, failures and conversations |
| My Agent | Plan and perform private or permitted work for one person |
| Bots | Install and configure business capabilities |

```text
MY AGENT                         WORKSPACE: SLICE HOUSE
private                         shared
   |                               |
   |                               +--> Space
   |                               +--> Inbox
   |                               '--> Bots: POS · Sales · Team · Site
   |
   '--> may enter Slice House only with the member's live permissions
```

There is no Personal workspace in the UI. My Agent has a private identity tenant underneath.

===============================================================================

## 1. CORE RULES

| # | Rule |
|---:|---|
| 1 | Records are authoritative current business state |
| 2 | Every accepted state change appends one or more compact Events |
| 3 | A Run exists only for work spanning Actions, people, systems or time |
| 4 | Events wake Runs; they never bypass permissions or business rules |
| 5 | Every authoritative private or shared write passes through the Action Gateway |
| 6 | Record changes, Run checkpoints and Events save atomically |
| 7 | External effects begin with a durable Delivery intent |
| 8 | At-least-once wake-ups are safe through idempotency and version checks |
| 9 | Views show permitted projections; UI visibility is never authorization |
| 10 | Models propose; registered code and policy decide shared effects |

### Vocabulary

| Word | Meaning | User sees it as |
|---|---|---|
| Record | Current fact such as Order, Contact, Task or Payment | Row, card, form, detail |
| Action | Registered operation that reads or changes facts | Button, form, command |
| Event | Immutable statement that an accepted fact changed | Timeline, audit, trigger |
| Flow | Versioned process definition | Automation |
| Run | One durable occurrence of a Flow | Progress or history |
| Transition | One allowed move in a Run | Usually hidden |
| Delivery | Durable request for an external effect | Sending/retry status |
| Bot | Installable business capability | Bot |
| My Agent | Private built-in agent for one identity | My Agent or custom name |
| Runner | Bounded agentic harness for code/model/tool/human steps | Internal |
| Skill | Instructions and methods loaded by the Runner | Internal |
| Tool | Callable read or registered Action interface | Internal |
| Action Gateway | Authentication, policy and transaction boundary | Internal |

===============================================================================

## 2. SYSTEM TOPOLOGY

```text
 PERSON / CHANNEL / SCHEDULE / WEBHOOK
                    |
                    v
        +===========================+
        | CLOUDFLARE WORKER API     |
        | identity · routing · HTTP |
        +===========================+
                    |
          +---------+----------+
          |                    |
          v                    v
+===================+   +=======================+
| READ SERVICE      |   | ACTION GATEWAY        |
| policy projection |   | auth · validate · save|
+===================+   +=======================+
          |                    |
          |                    v
          |          +=======================+
          +--------->| TURSO TENANT DATABASE |
                     | Records · Runs · Events|
                     | Definitions · Delivery|
                     +=======================+
                                  |
                           committed Event
                                  v
                     +=======================+
                     | EVENT ROUTER          |
                     | cursor · dedupe · wake|
                     +=======================+
                         |               |
                         v               v
                +===============+  +================+
                | RUN ENGINE    |  | PROJECTIONS    |
                | transition    |  | Inbox · metrics|
                +===============+  +================+
                         |
                         +--> Cloudflare Workflow: wait · timer · retry
                         +--> Queue: wake-up and delivery work
                         +--> Runner: bounded code/model/human step

CONTROL: D1 = identity · membership · tenant routing · connectors · command ledger
FILES:   R2 = attachments · long content · immutable releases
DEVICE:  SQLite = permitted cache · drafts · pending commands
```

### Authority boundaries

| Component | May decide | May not decide |
|---|---|---|
| UI | User intent and presentation | Authorization |
| Runner/model | Proposed next Action and structured draft | Shared truth |
| Run engine | Which declared transition is eligible | Business permission |
| Action Gateway | Whether an Action is accepted | Undeclared arbitrary work |
| Tenant transaction | Winning version and atomic result | External provider outcome |
| Event router | Which consumers to wake | Meaning of business state |
| Delivery worker | Attempt an authorized effect | Invent a new effect |

===============================================================================

## 3. RECOMMENDED EXECUTION MODEL

### 3.1 One durable turn

```text
WAKE: command, Event, timer, retry or approval
      |
      v
LOAD: Flow version + Run checkpoint + permitted Records
      |
      v
DERIVE: enabled transitions
      |
      v
EXECUTE one bounded transition
      |
      v
ACTION GATEWAY
      |
      v
ATOMIC SAVE: Records + Run + Event(s) + optional Delivery
      |
      +--> another transition is immediately safe? --> another bounded turn
      |
      '--> completed / failed / cancelled / waiting
```

| Limit | Required |
|---|---|
| Steps per wake | Fixed maximum |
| Model turns | Fixed maximum |
| Runtime | Deadline |
| Cost | Budget |
| Retries | Bounded policy |
| Repeated transition | Cycle detection or monotonic checkpoint |

### 3.2 Run states

```text
ready -> running -> waiting -> running -> completed
            |           |          |
            +-----------+----------+--> failed
            +-----------+----------+--> cancelled
```

| State | Meaning |
|---|---|
| ready | Eligible to execute |
| running | One worker owns the current lease |
| waiting | Needs a time, Event, person or external result |
| completed | Terminal success |
| failed | Terminal or manually recoverable failure |
| cancelled | Explicitly stopped |

### 3.3 Wait types

| Wait | Resume signal | Example |
|---|---|---|
| Event | Matching committed Event | `order.ready` |
| Time | Durable timer | Follow up tomorrow |
| Human | Completed Inbox Task | Refund approved |
| Delivery | Provider result Event | Email delivered |
| Retry | Backoff deadline | Provider temporarily unavailable |

### 3.4 Event folding in the hybrid model

```text
AUTHORITATIVE DECISION STATE
current Record + current Run + Flow definition

EVENT FOLDING
Event stream -> timeline / metric / search index / Inbox projection
```

| Use Events to | Do not use Events to |
|---|---|
| Wake matching Runs | Skip Record version checks |
| Build timelines and metrics | Grant authority |
| Rebuild disposable projections | Recreate every Record on every request |
| Explain why state changed | Treat an attempted command as accepted |
| Reconcile deliveries | Claim an external effect succeeded before confirmation |

===============================================================================

## 4. ACTION GATEWAY

### Action request

```json
{
  "actionId": "pos.order.item.update",
  "actionVersion": 1,
  "idempotencyKey": "order-1042-item-1-ready",
  "expected": {
    "recordVersion": 4,
    "runVersion": 7
  },
  "input": {
    "orderId": "order_1042",
    "itemId": "item_1",
    "status": "ready"
  }
}
```

### Acceptance path

```text
authenticate identity
   -> resolve private ownership or workspace membership
   -> find registered Action version
   -> check role, job, subject and fields
   -> validate input schema and business invariants
   -> find idempotent replay
   -> open transaction
      -> recheck current Record + Run versions
      -> apply deterministic transition
      -> append compact Event(s)
      -> update Run checkpoint when present
      -> append Delivery intent when required
   -> commit all or commit nothing
```

### Required guarantees

| Risk | Protection |
|---|---|
| Duplicate request | Stable idempotency key returns saved result |
| Concurrent update | Expected version and affected-row check |
| Stale Run wake | Run version check; losing worker reloads |
| Model mistake | Structured proposal + schema + deterministic validation |
| Partial transaction | Records, Run and Event use one tenant transaction |
| Unauthorized field | Type policy projects reads and validates writes |
| Cross-tenant ID | Resolve inside the authorized tenant only |

===============================================================================

## 5. RECORDS, EVENTS, RUNS, AND DELIVERY

### Records

```text
records
id · type · title · state · data JSON
owner? · assignee? · due?
version · created_at · updated_at · archived_at?
```

| Rule | Decision |
|---|---|
| Current truth | Read directly from the latest Record |
| Common filters | Columns |
| Type-specific facts | Validated JSON |
| Concurrency | Integer version |
| Removal | Archive by default |
| Large content | Immutable R2 object reference |

### Events

```text
events
id · kind · subject_type · subject_id
action_id · actor_id · run_id?
input_hash · idempotency_key · data JSON
sequence · created_at
```

| Event rule | Decision |
|---|---|
| Meaning | Past-tense accepted fact: `order.ready` |
| Append point | Same transaction as the fact it describes |
| Ordering | Monotonic tenant sequence; subject version in data |
| Payload | IDs and compact facts, never full documents or secrets |
| Mutation | Append a correction Event; never rewrite history |
| Consumer safety | Cursor + Event ID dedupe |

### Runs

```text
runs
id · flow_id · flow_version · subject_id?
state · step_id · wait_kind? · wait_match?
context JSON · attempts · lease_until?
version · started_at · wake_at? · finished_at?
```

| Run rule | Decision |
|---|---|
| Definition | Pin immutable Flow and Action versions |
| Checkpoint | Save after every accepted transition |
| Context | Keep continuation facts; reload authoritative Records |
| Wake | Event router, timer, approval, delivery result or retry |
| Claim | Versioned lease; one winning transition |
| Completion | Terminal state + final Event |
| Runtime driver | Workflow/Queue may wake execution; the Run row is TAR's authoritative checkpoint |

### Delivery intents

```text
deliveries
id · kind · provider · destination_ref
payload_ref · state · attempt · next_attempt_at
provider_key · provider_result_ref? · version
```

```text
Atomic Save: business change + delivery.requested Event + Delivery intent
                                      |
                                      v
Delivery worker -> provider with stable provider key
        |
        +--> confirmed -> delivery.succeeded Event
        +--> rejected  -> delivery.failed Event
        '--> unknown   -> reconcile before retry
```

===============================================================================

## 6. FLOWS AND TRANSITIONS

### Flow definition

```yaml
flow: pos.food-order
version: 1
subject: order
start: accept-order

steps:
  accept-order:
    action: pos.order.accept
    next: wait-kitchen

  wait-kitchen:
    waitFor: order.ready
    next: wait-payment

  wait-payment:
    waitFor: payment.confirmed
    next: request-receipt

  request-receipt:
    action: pos.receipt.request
    next: wait-receipt

  wait-receipt:
    waitFor: receipt.delivered
    next: wait-handover

  wait-handover:
    waitFor: order.handed-over
    next: complete
```

### Transition contract

| Field | Purpose |
|---|---|
| `from` | Required Run step and state |
| `trigger` | Command, Event, time, approval or delivery result |
| `guard` | Deterministic condition over permitted current facts |
| `action` | Registered Action version |
| `to` | Next step/state |
| `wait` | Optional persisted resume condition |
| `onFailure` | Retry, compensate, human review or fail |

### Publication

| Situation | Rule |
|---|---|
| New Flow version | Applies to new Runs |
| Active Run | Keeps pinned version |
| Migration | Explicit reviewed Action |
| Single Action | Append an Event; do not create a completed Run |
| Cross-Bot Flow | Declare Bot and Action dependencies before publish |

===============================================================================

## 7. RUNNER, SKILLS, AND TOOLS

```text
+=============================================================================+
| RUNNER                                                                      |
| Input     trigger + Run checkpoint                                          |
| Context   permitted Records + messages + Tool results                       |
| Skills    instructions and methods for the step                             |
| Executor  CODE | MODEL | HUMAN                                              |
| Tools     explicit read and Action allowlist                                |
| Output    result or schema-checked Action proposal                          |
| Limits    tools · turns · time · cost · retry · stop                        |
+=============================================================================+
```

| Executor | Best use | Shared-write rule |
|---|---|---|
| Code | Known calculation, validation and integration | Registered Action through Gateway |
| Model | Interpret, classify, extract, plan or draft | Proposal only |
| Human | Judgment, missing fact or required approval | Inbox decision through Gateway |

```text
Read Tool   -> permitted projection -> Runner
Action Tool -> proposed registered Action -> Action Gateway
```

| Guarantee | Rule |
|---|---|
| Context is data | Prompt, message or file cannot grant permission |
| Tool list | Fixed by published step and policy |
| Output | Schema checked before use |
| Generated code | Isolated sandbox; no direct database credentials |
| Failure | Saved checkpoint, bounded retry or human handoff |

===============================================================================

## 8. BOTS

### Bot model

```text
BOT
|-- Features       views and business areas
|-- Records        owned or referenced types
|-- Actions        registered operations
|-- Jobs           operational defaults
|-- Flows          durable automations
|-- Inbox rules    attention projections
'-- Guidance       setup and safe usage
```

### Bot directory

| Bot | Owns | Example Flow |
|---|---|---|
| CRM | Customer timeline, consent, tags, segments | Refresh customer segment |
| Sales | Lead, Deal, quote, follow-up | Enquiry to cashier handoff |
| Support | Ticket, conversation, resolution | Complaint to resolution/refund request |
| POS | Product, Order, Payment, stock, register | Food Order to handover |
| HR | Candidate, employee profile, hiring, onboarding | Candidate to employee |
| Team | Membership, Job, assignment | Invite and assign Kitchen job |
| Finance | Invoice, expense, collection, reconciliation | Supplier invoice approval |
| Operations | Checklist, incident, recurring work | Store opening and closing |
| Site | Page, release, publish history | Draft to approved release |

### Ownership rule

```text
Sales confirms demand
      |
      v
POS owns Order and Payment
      |
      +--> CRM receives timeline projection
      |
      '--> Finance receives accounting projection
```

A receiving Bot reads facts or invokes the owning Bot's registered Action. It never directly rewrites another Bot's Records.

### Installation

```text
discover -> configure -> dependency check -> preview -> activate
                                                   |
                                                   v
 definitions + cards + Inbox rules + Flow versions + Event
```

| Safety rule | Enforcement |
|---|---|
| Bot package is reviewed | Directory signature and version |
| Prompt/import is data | Never execute imported SQL or JavaScript |
| Flow references exist | Registered Bot/Action IDs checked at publish |
| Removal preserves truth | Archive definitions; retain Records, Runs and Events |

===============================================================================

## 9. MY AGENT

My Agent is a system Bot for one identity. It is not a shared workspace and cannot be installed, removed or shared.

```text
+=============================================================================+
| MY AGENT                                                   PRIVATE          |
+=============================================================================+
| Ask... [ Plan my week, watch a price, or handle a task                   ] |
|                                                                             |
| Renew insurance      Waiting for approval                    [ Review ]     |
| Track laptop price   Next check tomorrow                      [ Open ]       |
| Plan family trip     4 of 7 steps complete                    [ Open ]       |
|                                                                             |
| [ Goals ] [ Tasks ] [ Files ] [ Connected apps ] [ Activity ]              |
+=============================================================================+
```

| Concern | Decision |
|---|---|
| Storage | Separate private identity tenant |
| Memory | Private Records, files and Events |
| Background work | Durable Runs |
| Connected apps | Explicit per-connector permission |
| Sensitive Action | Inbox approval |
| Workspace use | Live member permissions and field projections apply |
| Owner/Admin access | Never grants access to a member's private tenant |
| Friendly name | User may rename My Agent; internal type stays stable |

===============================================================================

## 10. SPACE AND INBOX

### Space

```text
installed Bot cards
       + member Access and Jobs
       + permitted fields
       + member pins/order
                   |
                   v
                 SPACE
```

| Card | Opens |
|---|---|
| Metric | Permitted aggregate and source facts |
| View | Filtered Records |
| Action | Registered form or confirmation |
| Automation | New Run or existing Run progress |

### Inbox

```text
Task -----------+
Order ----------+
Conversation ---+--> COMMON INBOX ITEM --> permitted Action
Approval -------+
Failure --------+
Flow wait ------+
```

| Inbox item shows | Rule |
|---|---|
| Title and source | Always |
| State, assignee and due time | When relevant |
| Next Actions | Server-authorized only |
| Sensitive fields | Type-policy projection only |
| Claim/complete | Registered Action with version check |

An Inbox item is a projection. A Task Record is created only when the work needs its own assignee, due date, claim or approval decision.

===============================================================================

## 11. IDENTITY, ACCESS, AND TENANCY

```text
verified identity
      |
      +--> private identity tenant -> My Agent
      |
      +--> workspace membership -> Access + Jobs + Record/field policy
```

| Layer | Controls |
|---|---|
| Identity | Who is acting |
| Tenant | Which private or work database is addressed |
| Access | Owner, Admin, Member, Guest management authority |
| Job | Cashier, Kitchen, Stock or Bot-defined operating role |
| Record scope | Own, Team, All |
| Field policy | Which fields the UI, Runner and Tool may receive |
| Assignment | Access to one work item, not every source field |

### Non-negotiable rules

| Rule | Meaning |
|---|---|
| Contact label is not membership | `customer` or `employee` never grants login |
| UI is not policy | Hidden buttons do not secure an Action |
| Revocation is immediate online | Later reads, wakes and Actions recheck membership |
| Run authority is not permanent | Every resumed transition rechecks permission |
| IDs are tenant-local | Never accept a database host or tenant ID from untrusted input |
| Secrets stay separate | Connector credentials are never Records, Events or model context |

===============================================================================

## 12. STORAGE

```text
+====================+  +======================+  +====================+
| D1 CONTROL         |  | TURSO TENANT DB      |  | R2 OBJECTS         |
| identity           |  | Records              |  | attachments        |
| membership         |  | Definitions          |  | long content       |
| tenant routing     |  | Runs                 |  | immutable releases |
| connector metadata |  | Events · Deliveries  |  | large results      |
| command ledger     |  | projection cursors   |  |                    |
+====================+  +======================+  +====================+
                                |
                         permitted cache
                                v
                       +====================+
                       | DEVICE SQLITE      |
                       | cache · drafts     |
                       | pending commands   |
                       +====================+
```

| Store | Authority |
|---|---|
| D1 control | Identity, membership, routing and connector control Actions |
| Turso tenant | Business/private truth and durable process state |
| R2 | Immutable bytes referenced by accepted Records |
| Device SQLite | Non-authoritative cache and offline intent |

### Object protocol

```text
validate metadata
   -> upload unique/content-hash object key
   -> Action Gateway verifies size, type and hash
   -> Atomic Save Record reference
   -> later delete unreferenced object
```

No concurrent writer may overwrite an object key derived only from a mutable Record version.

===============================================================================

## 13. CHANNELS AND CONNECTORS

### Channel families

| Family | Direction | Examples | Creates |
|---|---|---|---|
| Team | in + out | Slack, Discord, Google Chat | Commands, notifications |
| Customer | in + out | Website chat, email, messaging | Conversations, leads, tickets |
| Social | in + out | Social publishing/replies | Posts, replies, leads |
| System | in | Webhook, schedule, provider callback | Verified Events |

### Inbound

```text
provider request
   -> verify signature and timestamp
   -> normalize sender + thread + command/Event
   -> save command ledger entry
   -> resolve identity/contact and tenant
   -> apply rate and permission policy
   -> Action Gateway
   -> committed Event reaches Event router
```

### Outbound

```text
accepted Action
   -> Atomic Save Delivery intent
   -> queue wake
   -> provider call with stable key
   -> result Event
   -> waiting Run resumes
```

| Rule | Reason |
|---|---|
| Verify before parsing intent | Untrusted input cannot become authority |
| Allowlisted commands only | Channel text is data |
| Stable provider/thread references | Safe dedupe and conversation continuity |
| No secrets in Events | Audit and model context stay safe |
| Unknown delivery outcome reconciles first | Avoid duplicate sends or charges |

===============================================================================

## 14. OFFLINE AND RECOVERY

### Offline command

```text
offline edit
   -> Device SQLite pending command + idempotency key
   -> reconnect
   -> recheck identity, membership, versions and business rules
   -> accept + Event OR stale/conflict/denied
```

### Recovery loops

| Recovery scan | Finds | Action |
|---|---|---|
| Ready Run | Unclaimed or expired lease | Claim by version and execute |
| Waiting time | `wake_at <= now` | Emit timer wake |
| Event cursor | Undelivered committed Events | Redeliver to consumer |
| Delivery | Due pending/failed intent | Retry or reconcile |
| Projection | Cursor behind Event sequence | Fold missing Events |
| Object | Old unreferenced upload | Delete after grace period |

At-least-once wake-up is expected. Exactly-once business results come from idempotency, versions and atomic acceptance.

===============================================================================

## 15. HTTP AND INTERNAL MESSAGES

### Public HTTP

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/v1/workspaces` | Real work workspaces available to the identity |
| `GET` | `/v1/workspaces/:slug/space` | Permitted Space projection |
| `GET` | `/v1/workspaces/:slug/inbox` | Permitted Inbox projection |
| `GET` | `/v1/workspaces/:slug/bots` | Installed and available workspace Bots |
| `GET` | `/v1/me/agent` | My Agent projection |
| `GET` | `/v1/workspaces/:slug/records/:type/:id` | Permitted work Record projection |
| `GET` | `/v1/workspaces/:slug/runs/:id` | Permitted work Run progress |
| `POST` | `/v1/workspaces/:slug/actions` | Execute a registered work Action |
| `GET` | `/v1/me/records/:type/:id` | Private My Agent Record projection |
| `GET` | `/v1/me/runs/:id` | Private My Agent Run progress |
| `POST` | `/v1/me/actions` | Execute a registered private Action |
| `POST` | `/v1/uploads/request` | Request authorized immutable upload |
| `POST` | `/v1/uploads/accept` | Validate object and save Record reference |
| `POST` | `/v1/channels/:provider` | Verified provider ingress |

### Internal message envelope

```json
{
  "kind": "event.wake",
  "tenantId": "tenant_slice_house",
  "eventId": "evt_2048",
  "consumer": "run-engine",
  "attempt": 1
}
```

| Message rule | Decision |
|---|---|
| Payload | Stable IDs and routing facts only |
| Truth | Reload from the tenant database |
| Delivery | At least once |
| Dedupe | Consumer cursor/Event ID |
| Permission | Rechecked before every Action |
| Failure | Retry with backoff, then Inbox/recovery state |

===============================================================================

## 16. FOOD ORDER — END TO END

### 16.1 People and permissions

| Member | Access | Job | Main Actions |
|---|---|---|---|
| Muthu | Owner | General | Configure, approve, refund, review |
| Malar | Admin | Cashier | Accept Order, checkout, close register |
| Iniya | Member | Cashier | Save Order, checkout |
| Velan | Member | Kitchen | Start item, mark ready |

### 16.2 Flow overview

```text
CUSTOMER / CASHIER
Create Order
      |
      v
EVENT: order.accepted
      |
      v
RUN: wait_for_kitchen
      |
      v
KITCHEN INBOX
prepare items -> mark ready
      |
      v
EVENT: order.ready
      |
      v
RUN: wait_for_payment
      |
      v
CASHIER
checkout -> payment + stock movement
      |
      v
EVENT: payment.confirmed
      |
      v
RUN: request receipt -> wait_for_handover
      |
      v
EVENT: order.handed-over
      |
      v
RUN: completed
```

### 16.3 Order screen

```text
+=============================================================================+
| < Space                              NEW ORDER                              |
+=============================================================================+
| Margherita                         ₹250 x 2                    ₹500           |
| Garlic Bread                       ₹120 x 1                    ₹120           |
|                                                                             |
| Customer       [ Priya ]           Type [ Takeaway v ]                      |
| Tax                                                        ₹31              |
| TOTAL                                                      ₹651             |
|                                                                             |
|                                                   [ Accept Order ]          |
+=============================================================================+
```

### 16.4 Every durable transition

| # | Trigger | Action | Records saved | Run checkpoint | Event appended | Delivery |
|---:|---|---|---|---|---|---|
| 1 | Cashier accepts | `pos.order.accept` | Order `accepted`, unpaid items `pending` | `waiting / wait-kitchen` | `order.accepted` | None |
| 2 | Velan starts item | `pos.order.item.update` | Item `preparing` | Still `wait-kitchen` | `order.item-preparing` | None |
| 3 | Velan marks first item ready | `pos.order.item.update` | Item 1 `ready` | Still `wait-kitchen` | `order.item-ready` | None |
| 4 | Velan marks final item ready | `pos.order.item.update` | Final item `ready` | Still `wait-kitchen` | `order.item-ready` | None |
| 5 | Runtime handles final item Event | `pos.order.mark-ready` | Order preparation `ready` | `waiting / wait-payment` | `order.ready` | Optional cashier alert intent |
| 6 | Cashier confirms payment | `pos.checkout` | Order `paid`, Payment, stock movements | `ready / request-receipt` | `payment.confirmed` | None |
| 7 | Runtime requests receipt | `pos.receipt.request` | Delivery `pending` | `waiting / wait-receipt` | `receipt.requested` | Receipt intent |
| 8 | Receipt provider confirms | internal delivery result Action | Delivery `succeeded` | `waiting / wait-handover` | `receipt.delivered` | Completed |
| 9 | Cashier hands over | `pos.order.hand-over` | Order `fulfilled` | `completed` | `order.fulfilled` | None |

Every row is one Action Gateway acceptance. Every row saves all listed database changes in one transaction.

### 16.5 First transaction

```text
COMMAND: Accept Order #1042
             |
             v
ACTION GATEWAY
authenticate Iniya
authorize Cashier job
validate prices, tax, products and stock visibility
check idempotency key
             |
             v
BEGIN TENANT TRANSACTION
|-- insert Order #1042       state=accepted version=1
|-- insert Order items       state=pending
|-- insert Run #700          state=waiting step=wait-kitchen version=1
|-- append Event #2048       kind=order.accepted run=#700
'-- commit
             |
             v
EVENT ROUTER wakes projections and matching Runs
```

### 16.6 Kitchen Inbox projection

```text
+=============================================================================+
| Slice House                                  Space | INBOX | Bots            |
+=============================================================================+
| KITCHEN                                                                    |
|                                                                             |
| ORDER #1042 · TAKEAWAY                                      Accepted        |
| 2 x Margherita          pending                            [ Start ]         |
| 1 x Garlic Bread        pending                            [ Start ]         |
|                                                                             |
| Customer phone, price and payment fields are not projected.                |
+=============================================================================+
```

### 16.7 How `order.ready` resumes the Run

```text
Event #2071: order.item-ready
        |
        v
Event router finds Run #700 waiting for kitchen
        |
        v
Run engine reloads Order and sees every item ready
        |
        v
registered Action: pos.order.mark-ready
        |
        v
ATOMIC SAVE
|-- Order preparation = ready
|-- Run #700 step = wait-payment, state = waiting, version = 6
|-- Event #2072 = order.ready
'-- optional cashier Delivery intent
        |
        v
cashier Inbox shows [ Checkout ]
```

The Event does not change the Order by itself. It wakes the Run; the registered Action performs the next accepted transition through the Gateway.

### 16.8 Checkout transaction

```text
COMMAND: Cash checkout Order #1042
                  |
                  v
validate register open · payment amount · current product versions · stock
                  |
                  v
ATOMIC SAVE
|-- Order #1042       paid
|-- Payment #900      cash · ₹651 · confirmed
|-- Stock movements   ingredient/product deductions
|-- Run #700          ready / request-receipt
|-- Event             payment.confirmed
'-- commit
                  |
                  v
Run engine resumes -> pos.receipt.request
                  |
                  v
ATOMIC SAVE
|-- Run #700          waiting / wait-receipt
|-- Event             receipt.requested
'-- Delivery intent   print/share receipt
```

If any write fails, none of them are accepted.

### 16.9 Crash recovery

#### Crash before commit

```text
worker crashes
      |
      '--> transaction rolls back
           Order, Run and Event remain unchanged
```

#### Crash after commit but before wake-up

```text
transaction committed
queue wake lost
      |
      v
recovery scan finds Event cursor behind / ready Run
      |
      v
redeliver same Event ID
      |
      v
consumer dedupes and resumes once
```

#### Duplicate checkout request

```text
same idempotency key
      |
      +--> accepted earlier -> return stored result
      '--> racing request   -> one version update wins
```

#### Unknown receipt outcome

```text
provider timed out after request
      |
      v
Delivery = unknown
      |
      v
query provider using stable provider key
      |
      +--> already delivered -> append receipt.delivered
      '--> absent            -> retry safely
```

### 16.10 Event log and Run together

| Event log says | Run says |
|---|---|
| Order #1042 was accepted | Waiting for kitchen |
| Margherita became ready | Still waiting for remaining item |
| Order became ready | Waiting for payment |
| Payment was confirmed | Requesting receipt |
| Receipt was delivered | Waiting for handover |
| Order was fulfilled | Completed |

```text
Event = evidence and wake-up
Run   = checkpoint and next wait
Record = current business truth
```

### 16.11 Cross-Bot entry

```text
Sales Bot
Priya accepts catering quote
      |
      v
sales.handoff-ready Event
      |
      v
Cashier Inbox: [ Create POS Order ]
      |
      v
POS Action accepts explicit Order data
      |
      v
Food Order Run begins
      |
      +--> CRM timeline projection
      '--> Finance accounting projection after payment
```

Sales Bot never writes POS Order or Payment state directly.

===============================================================================

## 17. REQUIRED INVARIANTS

| Area | Invariant |
|---|---|
| Records | One accepted version wins each concurrent state transition |
| Events | Every accepted state change has one or more Events in the same transaction |
| Runs | Every accepted transition advances one version or returns replay |
| Wakes | Duplicate and lost wake-ups cannot duplicate business results |
| Waits | Time, Event, human and delivery waits survive deployment/restart |
| Permissions | Every resumed Action uses current identity/membership policy |
| Models | Model output alone never becomes shared truth |
| Delivery | External effect has durable intent, stable key and result/reconciliation |
| Bots | Cross-Bot changes call the owning Bot's registered Action |
| Tenancy | Private and work data never cross without an authorized projection |
| Files | Accepted Record references immutable validated objects |
| Offline | Reconnect revalidates authority and versions |

### Minimum proof before release

| Test | Expected result |
|---|---|
| Two workers resume one Run | One transition wins |
| Same command delivered twice | One Event and one business result |
| Crash before transaction commit | No partial state |
| Crash after commit before queue wake | Recovery resumes from saved checkpoint |
| Permission revoked during wait | Resumed Action is denied or reassigned |
| Flow definition changes mid-Run | Active Run keeps pinned version |
| Provider times out after success | Reconciliation prevents duplicate effect |
| Projection cursor is deleted | Projection rebuilds from Events |
| Event payload contains an instruction | Treated as data; cannot widen Tools or authority |
| Workspace Owner opens member My Agent | Access denied |

===============================================================================

## 18. ONE-SCREEN SUMMARY

```text
INTENT
person · channel · schedule · webhook
   |
   v
RUNNER
Skills · Context · Code/Model/Human · Tools · Limits
   |
   v
ACTION GATEWAY
authenticate · authorize · validate · idempotency · versions
   |
   v
ATOMIC SAVE
Records + Run checkpoint + Event(s) + optional Delivery intent
   |
   +--> EVENT ROUTER --> wake Run / update Inbox and metrics
   |
   +--> DELIVERY WORKER --> provider result Event
   |
   '--> WAIT --> Event / time / human / delivery / retry
                      |
                      '---------------------------> resume safely

Records = current truth
Events  = accepted history and wake-ups
Runs    = durable progress
Flows   = versioned process rules
Bots    = installable business capabilities
My Agent = private system Bot
```
