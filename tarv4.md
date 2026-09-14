# TAR v4 — Architecture

> Records hold business facts. Actions change them. The Action Gateway checks them. Atomic Save makes them permanent.

| Product | Meaning |
|---|---|
| **Space** | What matters now and what this member can do |
| **Inbox** | Work that needs attention |
| **Bots** | Capability that can be installed or configured |

**Status language:** `Built` = works now · `Partial` = works with stated limits · `Planned` = design only.

===============================================================================

## 0. SCREEN CONCEPTS

### Space

```text
+=============================================================================+
| Scope: [ Slice House v ]                   SPACE | Inbox | Bots             |
+=============================================================================+
| Today                                                                       |
|                                                                             |
| Sales                    Low stock                  Open work               |
| ₹12,400                  3 items                    6                       |
|                                                                             |
| Actions: [ New sale ] [ Add product ] [ Close shift ]                      |
|                                                                             |
| Recent: Order #1042 accepted · Stock delivery recorded                     |
+=============================================================================+
```

### Inbox

```text
+=============================================================================+
| Scope: [ Slice House v ]                    Space | INBOX | Bots            |
+=============================================================================+
| [ Mine ] [ Unassigned ] [ Team ] [ Approvals ]                             |
|                                                                             |
| Prepare order #1042       Kitchen       Due now       [ Start ]             |
| Approve refund #1031      Owner         10:30         [ Review ]            |
| Reply to customer         Support       Today         [ Open ]              |
|                                                                             |
| One view over Tasks, Orders, conversations, approvals, and failures.        |
+=============================================================================+
```

### Bots

```text
+=============================================================================+
|                                             Space | Inbox | BOTS            |
+=============================================================================+
| MY BOT                                                                      |
|                                                                             |
| Personal Bot      Always available   Goals · Tasks · Apps · Background work |
|                                                     [ Open Personal Bot ]   |
|                                                                             |
| SLICE HOUSE BOTS                                      [ Search Bots... ]    |
|                                                                             |
| POS Bot          Installed     Customers · Orders · Stock · Register        |
| Sales Bot        Add           Leads · Deals · Follow-up                    |
| Team Bot         Add           Members · Onboarding · Assigned work         |
| Site Bot         Installed     Draft · Preview · Publish · History          |
|                                                                             |
| Selecting a Bot opens its features and configuration.                       |
+=============================================================================+
```

| Scope rule | Decision |
|---|---|
| Personal UX | Personal Bot in the Bots list; no Personal workspace selector |
| Personal Bot | System Bot: always available, private and not installable/removable |
| Work Bots | Listed under each workspace and installed by permitted members |
| Workspace switcher | Needed only when moving among real work workspaces |

===============================================================================

## 1. SYSTEM MODEL

```text
intent: person / channel / schedule
                   |
                   +---------------- direct Action ------------------+
                   |                                                 |
                   v                                                 |
+=============================================================================+
| RUNNER                                                                      |
| the agentic harness                                                        |
|                                                                             |
| Skills    instructions and methods loaded for this kind of work            |
| Context   permitted Records, messages, and previous results                |
| Model     interprets intent and chooses the next step                       |
| Code      executes known deterministic rules                               |
| Tools     read permitted data or request registered Actions                |
| Limits    allowed tools, turns, time, cost, and stopping condition          |
+=============================================================================+
                   |
                   +--> Read Tool --> permitted data --> Runner
                   |
                   +--> Action Tool --> registered Action -----------+
                                                                     |
                                                                     v
+=============================================================================+
| ACTION GATEWAY                                                              |
| authenticate -> authorize -> validate -> replay -> version check            |
+=============================================================================+
                   |
                   | one workspace transaction
                   v
+=============================================================================+
| ATOMIC SAVE                                                                 |
| all changes succeed together, or none are saved                            |
| business Records + Event/result + optional Task/Run change                  |
+=============================================================================+
                   |
                   +--> Inbox projection when a person is needed
                   |
                   +--> Delivery intent for an external effect       PLANNED
```

### Design rules

| # | Rule | Meaning |
|---:|---|---|
| 1 | One safe write path | Shared changes pass through the Action Gateway |
| 2 | Deterministic first | Use code for known rules; models interpret or draft |
| 3 | One work surface | Inbox presents everything requiring attention |
| 4 | One installation concept | Users install Bots; package mechanics remain internal |
| 5 | Runs only for durable process | A single Action needs an Event, not a duplicate Run |
| 6 | Large content in R2 | Records hold metadata and immutable object keys |
| 7 | Device cache, Gateway save | Offline work remains pending until accepted |
| 8 | Planned means planned | Future behavior is labeled where it is described |

### Vocabulary

| Term | Meaning | Visible to users? |
|---|---|---|
| **Record** | Business fact: contact, order, task, message, site | Yes |
| **Action** | Registered operation over Records or an integration | Yes |
| **Bot** | Installable business capability | Yes |
| **Flow** | Process spanning multiple Actions, people, or time | As Automation |
| **Run** | One durable occurrence of a Flow | As progress/history |
| **Channel** | Verified inbound or outbound connection | In settings |
| **Runner** | Agentic harness that supplies context and executes bounded steps | Internal |
| **Skill** | Instructions and methods the Runner loads for a kind of work | Internal |
| **Tool** | Callable capability exposed to the Runner | Internal |
| **Read Tool** | Returns permitted data without changing shared truth | Internal |
| **Action Tool** | Converts a tool request into a registered Action | Internal |
| **Action Gateway** | Permission, validation, replay, and safe-write boundary | Internal |
| **Atomic Save** | Makes related database changes permanent together | Internal |
| **Event** | Audit entry plus compact replay result | Internal/history |

```text
Runner proposes.
Skills guide the Runner.
Tools read data or request Actions.
Action Gateway validates.
Atomic Save makes the accepted change permanent.
Records hold truth.
Events preserve history.
```

===============================================================================

## 2. ACTION GATEWAY

### Action request

| Required input | Purpose |
|---|---|
| Action ID + version | Select a registered contract |
| Workspace | Select the isolated business database |
| Actor | Apply membership, job, scope, and field rules |
| Input | Validate business data |
| Idempotency key | Return the original result for a repeated request |
| Expected version | Reject stale changes |

### Atomic Save path

```text
request
  |
  +--> authenticate actor
  +--> authorize workspace + Action + Record type
  +--> validate input + protected lifecycle rules
  +--> fingerprint input + check saved replay
  +--> open workspace transaction
  |      +--> recheck replay/current state
  |      +--> require expected versions and affected rows
  |      +--> write business changes
  |      +--> write compact Event/result
  |      +--> write Task/Run/Delivery intent when required
  +--> ATOMIC SAVE succeeds -> return saved result
  +--> any write fails      -> save nothing
```

### Guarantees

| Boundary | Rule |
|---|---|
| Replay | Same workspace, actor, Action/version, key, and input return one result |
| Key conflict | Same key with different input fails |
| Concurrency | Expected version is checked inside the transaction; affected rows must match |
| Protected types | Generic editing cannot bypass Order, Payment, Task, Site, or access rules |
| Retry | Bounded retry uses the same key; a legitimate new occurrence uses a new key |
| Reads | Server projects permitted rows and fields; screen visibility is not access control |
| Numeric facts | Money and counts are integers; rates use basis points |

### Runtime

| Layer | Current choice |
|---|---|
| API and Action Gateway | Cloudflare Workers |
| Effects and errors | Effect v4 |
| Workspace SQL client | `@libsql/client` |
| Control data | Cloudflare D1 |
| Workspace data | Turso, one database per work workspace |
| Large objects/releases | Cloudflare R2 |
| Async wake-up | Cloudflare Queues and scheduled recovery |

### External effects — Planned

```text
workspace transaction                  delivery worker
+-----------------------------+        +------------------------------+
| business change             |        | claim pending intent         |
| delivery intent             | -----> | call provider with stable ID |
| Event                       |        | save result / reconcile      |
+-----------------------------+        +------------------------------+
```

| Situation | Rule |
|---|---|
| Payment/message/provider call | Save a durable intent with the business change before delivery |
| Queue duplicate | Consumer and provider operation must be idempotent |
| Lost queue wake-up | Recovery scan finds pending intents |
| Unknown provider outcome | Reconcile before another attempt |
| Current implementation | External effects are synchronous; durable delivery is not built |

### Immutable object write

```text
validate -> upload unique/content-hash key -> checked DB reference -> later cleanup
```

| Object rule | Reason |
|---|---|
| Never overwrite a version-derived key concurrently | Losing DB writer must not overwrite winning content |
| Verify type, size, and hash | Record references only accepted content |
| Delete old content after the new reference is saved | Cleanup must not race attachment |

===============================================================================

## 3. RECORDS AND STORAGE

```text
+==================+     +==================+     +==================+
| D1 CONTROL       |     | TURSO WORKSPACE  |     | R2 OBJECTS       |
| identity         |     | records          |     | media            |
| membership       |     | definitions      |     | attachments      |
| channel links    |     | runs             |     | site releases    |
| command ledger   |     | events           |     | long content     |
+==================+     +==================+     +==================+
                              |
                              v permitted projections
                       +==================+
                       | DEVICE SQLITE    |
                       | work cache       |
                       | drafts/pending   |
                       +==================+

 +=======================+
 | PRIVATE PERSONAL      |
 | TENANT                |
 | records · runs        |
 | events · file refs    |
 +=======================+
    only the identity
```

### Store ownership

| Store | Holds | Write boundary |
|---|---|---|
| D1 control | Identity, membership, invites, registry, Channel links and ledger | Control Actions |
| Turso workspace | Business Records, definitions, Runs and Events | Action Gateway |
| R2 | Immutable files and releases | Authorized object protocol |
| Private personal tenant | Personal Bot Records, Runs, Events and file references | Identity-scoped Action Gateway; never workspace Owner/Admin |
| Device SQLite | Permitted cache, drafts, preferences and pending commands | Local app; authoritative commands still need Gateway acceptance |

### Workspace schema

```text
+=============================================================================+
| records   common business facts                                             |
| id | type | title | state | data JSON | owner? | assignee? | due?           |
| version | created | updated | archived?                                      |
+=============================================================================+
| definitions   current Bot configuration and Flow definitions                |
| id | kind | name | version | state | data JSON                               |
+=============================================================================+
| runs   durable multi-step Flow occurrences                                  |
| id | flow_id | flow_version | occurrence | state | action_id | context JSON  |
| version | started_at? | finished_at?                                         |
+=============================================================================+
| events   audit and replay ledger                                             |
| id | kind | run_id? | record_id? | action_id | actor_id | input_hash        |
| idempotency_key UNIQUE | state | compact data JSON                           |
+=============================================================================+
```

| Data rule | Decision |
|---|---|
| Tenant boundary | The workspace database; business rows need no workspace column |
| Flexible fields | Type-specific facts live in `data` |
| Indexed/common fields | Keep as columns when used for filters or invariants |
| Time | UTC milliseconds; workspace stores timezone/business-day settings |
| Removal | Archive business Records; definitions and audit follow retention rules |
| Credentials | Secret storage only; never Records or Events |

### Database vs R2

| Keep in database | Put in R2 |
|---|---|
| Prices, stock, reservations, Order lines, payment facts | Images, video, receipts, attachments |
| Assignment, state, short messages, searchable metadata | Long documents and message bodies |
| Flow definitions and compact audit | Site releases, large traces and tool results |

### Core identity Records

| Record | Holds |
|---|---|
| `contact` | Person, handles, consent, business labels |
| `organization` | Company or group |
| `link` | Typed relationship between Records |

| Bot | Contact labels used | Produces |
|---|---|---|
| Sales | lead, customer | Deal, quote, follow-up |
| Support | customer | Ticket, conversation |
| Hiring | candidate, employee | Application, offer, onboarding Task |
| POS | customer | Order, payment |

Business labels never grant login or workspace access. Bots reference one Contact identity. Orders and receipts may retain historical snapshots such as the customer name used at purchase.

===============================================================================

## 4. RUNNER

The Runner is the agentic harness. It supplies context and executes one bounded step; every shared change is proposed as an Action to the Action Gateway.

```text
+=============================================================================+
| RUNNER                                                                      |
| input -> permitted context -> executor -> schema-checked output             |
|                                                                             |
| executor: CODE | MODEL | HUMAN                                              |
| limits: tools | turns | time | cost | stopping condition                    |
+=============================================================================+
                           |
                           +--> proposal/read result
                           +--> Action Gateway for a shared effect
```

### Executors

| Executor | Use | Shared-write ability |
|---|---|---|
| Code | Calculations, validation, known rules and integrations | Through Action Gateway |
| Model | Classification, extraction, interpretation, editable drafts | Proposes only |
| Human | Judgment, missing facts, required approval | Decision returns through Inbox and Gateway |

A required approval is a declared business rule, not a fallback after code or a model fails.

### Step contract

| Field | Meaning |
|---|---|
| Input schema | Facts the step accepts |
| Context sources | Permitted Records, messages, and tool results |
| Executor | Code, model, or human |
| Tools | Explicit allowlist |
| Output schema | Result or proposed Action shape |
| Limits | Turns, time, cost, retries, and stop condition |

| Guarantee | Rule |
|---|---|
| Context is data | Records, messages and tool output cannot grant authority |
| Model output | Schema-validated proposal only |
| Tool access | A prompt cannot widen its own tool list |
| Completion | Saved Action results are replayable |
| Failure | Bounded retry, saved progress, or human handoff |

### Current model use

| Action | Model | May propose | May not set |
|---|---|---|---|
| `pos.product.draft` | `@cf/meta/llama-3.1-8b-instruct-fast` | Editable catalog wording from entered facts | Price, tax, barcode, SKU, stock |

Current execution is single-step. Durable multi-step Runner behavior belongs to Flows and Runs and is still planned.

===============================================================================

## 5. BOTS AND CAPABILITY

### Bot manifest

```yaml
bot: pos
title: POS Bot
features: [customers, orders, stock, register]
records: [product, order, payment, register, movement]
actions: [pos.open, pos.order.save, pos.checkout, pos.refund]
jobs: [cashier, kitchen, stock]
automations: [shift-close]
```

| Bot part | Meaning | Surface |
|---|---|---|
| Features | Business areas and views | Space and Bot detail |
| Records | Types used by the capability | Lists, forms, search |
| Actions | Registered operations | Forms, buttons, Runner tools |
| Jobs | Operational defaults | Access, card visibility, assignment |
| Automations | Real multi-step Flows | Space, Inbox, Run history |
| Guidance | Setup instructions | Bot detail |

Customers, Orders, Stock, and Register are features. They are not Flows merely because they appear inside a Bot.

### Install lifecycle

```text
discover -> configure -> dependency check -> preview -> activate
                                                   |
                                                   v
                Space cards + Inbox rules + Bot state + Flow definitions

remove -> archive configuration -> preserve Records, Events, releases, active work
```

| Capability source | Adds executable code? | Example |
|---|---:|---|
| Core | Built in | Contacts, Tasks, files, search, Inbox |
| Directory Bot | Only through reviewed internal extension | POS, Sales, Team, Site |
| Workspace Automation | No; composes registered Actions | Shift close or lead follow-up |
| Reviewed extension | Yes; internal packaging boundary | Payment adapter or tax rule |

### Personal Bot — a private agent, not a workspace

```text
+=============================================================================+
| < Bots                           PERSONAL BOT                PRIVATE        |
+=============================================================================+
| Ask anything...  [ Plan my week, track a goal, or handle a task           ]|
|                                                                             |
| ACTIVE                                                                      |
| Renew insurance       Waiting for approval                    [ Review ]    |
| Track laptop price    Checking daily                           [ Open ]      |
| Plan family trip      4 of 7 steps complete                    [ Open ]      |
|                                                                             |
| [ New task ] [ Goals ] [ Files ] [ Connected apps ] [ Activity ]           |
+=============================================================================+
```

| Property | Decision |
|---|---|
| Product role | One persistent agent for the signed-in person |
| Display name | Starts as `Personal Bot`; the person may give it a friendly name |
| UI home | `Bots → Personal Bot`; no Personal workspace appears |
| Availability | Built-in system Bot; cannot be installed, removed or shared |
| Conversation | Main conversation plus optional task/goal threads |
| Memory | Private Records, files, preferences and Event history |
| Background work | Durable Flow/Run; resumes after waits or restarts |
| Apps | Explicit Connectors and Tools with per-connection permissions |
| Sensitive effects | Inbox approval before send, purchase, booking, disclosure or destructive Action |
| Work access | Only through the person's current workspace membership and field permissions |
| Audit | Shows completed, pending, blocked and proposed Actions |

```text
PERSONAL BOT UI
      |
      v
RUNNER = Skills + Context + Model/Code + Tools + Limits
      |
      +--> read private Records / connected apps
      |
      +--> FLOW + RUN --------------------------+
      |    plan · wait · resume · retry         |
      |                                         v
      +--> proposed Action -------------> ACTION GATEWAY
                                               |
                         +---------------------+---------------------+
                         |                                           |
                         v                                           v
                PRIVATE PERSONAL TENANT                    WORK WORKSPACE
                Records · Events · Files             member permissions apply
                         |
                         +--> Inbox approval when required
```

| Muse-like behavior | TAR component |
|---|---|
| Persistent conversational agent | Personal Bot + private Records |
| Skills chosen for a task | Runner Skills and registered Tools |
| Multi-step background work | Flows and durable Runs |
| Email, calendar, browser and other apps | Connectors, Channels and Tools |
| Permission before critical effects | Action Gateway + Inbox approval |
| Activity history | Events + Run history |
| Isolated execution | Bounded Runner execution; stronger sandbox required for generated tools |

The Personal Bot may help with work, but it never gains extra authority. “Summarize my Slice House sales” reads only fields that the member can read. “Refund Order #1031” still calls the registered POS Action, passes through the Action Gateway and follows the same approval rule.

### Safety rules

| Rule | Enforcement |
|---|---|
| Prompt/import is data | Never executable code |
| New executable capability | Reviewed extension only |
| Cards and Flows | Bind to registered IDs, never arbitrary SQL/JavaScript |
| Cross-Bot Automation | Dependencies shown before activation |
| Removal | Archive by default; destructive deletion is a separate reviewed Action |

===============================================================================

## 6. SPACE

```text
installed Bot definitions
          + member Access/Job
          + member pins/order
          + permitted data fields
                    |
                    v
                  SPACE
```

| Card | Binds to | Opens |
|---|---|---|
| Metric | Registered metric + typed parameters | Value and permitted source Records |
| View | Registered Record view | Filtered permitted Records |
| Action | One registered Action | Form or confirmation |
| Automation | Published Flow | New Run or existing progress |

| Rule | Meaning |
|---|---|
| Eligibility | Access/Job and server policy decide available cards |
| Personalization | Member pins and reorders eligible cards |
| Read behavior | Opening a Metric or View never starts a Run |
| Query safety | Cards contain typed parameters, not SQL |
| Operational landing | Kitchen/support may land in Inbox |

===============================================================================

## 7. INBOX

Inbox is one view over actionable work. Storage remains owned by the business object unless an independent Task is needed.

```text
Task -----------+
Order ----------+
Conversation ---+--> common Inbox item --> permitted domain Action
Approval -------+
Failure --------+
Flow wait ------+
```

### Sources

| Appears when | Source | Task Record required? |
|---|---|---:|
| Work has its own assignee, due date, or claim | Task | Yes |
| Order needs preparation | Order projection | No, unless separately assignable |
| Action needs human approval | Approval Task | Yes |
| Conversation needs a reply | Conversation projection or Task | Only when assigned/tracked separately |
| Failure requires judgment | Failure/recovery Task | Usually |
| Flow waits for a person | Human-step Task | Yes |

### Common Inbox item

```text
title + source + state + permitted next Action
optional: assignee + eligible Job + due time + Run/step reference
```

| Rule | Meaning |
|---|---|
| Claim | Atomically assign eligible unclaimed work; one winner |
| Complete | Execute the required domain Action; hiding is not completion |
| Assignment | Grants work access, not unrestricted source-Record access |
| Deduplication | One item per responsibility, not per notification/message |
| Notifications | Point to existing work; routine retries stay in history |

**Current:** Inbox returns Task Records and POS Order projections. `task.complete` currently changes only Task state. Claiming, approval Actions, and Run resumption are planned.

===============================================================================

## 8. FLOWS AND RUNS — PLANNED

```text
+=============================================================================+
| FLOW                                                                        |
| revision + trigger + audience + input schema + ordered steps               |
+=============================================================================+
                                  |
                                  | start
                                  v
+=============================================================================+
| RUN                                                                         |
| pinned Flow/Action versions + subject + cursor + context + checkpoints      |
+=============================================================================+

ready -> running -> waiting -> running -> done
            |           |          |
            +-----------+----------+--> failed / cancelled
```

| Step kind | Behavior |
|---|---|
| Action | Invoke a registered Action through the Gateway |
| Human | Create one Inbox Task and wait |
| Wait | Resume on time or a verified external event |
| Condition | Choose a declared next step from saved facts |

| Publication rule | Decision |
|---|---|
| New revision | Applies only to new Runs |
| Active Run | Keeps resolved Flow and Action versions |
| Retention | Snapshot the small resolved definition in the Run, or store immutable revisions; choose one |
| Single Action | Save an Event; do not create a duplicate completed Run |

**Current:** `flow.start` creates a ready Run and Event. It does not advance, wait, or resume. The first production Flow must prove retry, cancellation, permission recheck, human wait/resume, and exactly one accepted outcome before a general editor ships.

===============================================================================

## 9. CHANNELS

### Channel families

| Family | Direction | Adapters | Status |
|---|---|---|---|
| Team | In + out | Slack, Discord, Google Chat | **Built** |
| Customer | In + out | Website chat, email, messaging | **Planned** |
| Social | Out | Zernio | **Planned** |

A Channel is a verified connection, not a fourth screen.

```text
provider webhook
      |
      +--> verify signature
      +--> deduplicate provider + account + event
      +--> resolve verified sender -> TAR member
      +--> allowlisted command -> Action Gateway
      +--> acknowledge -> reply with result
```

| Rule | Detail |
|---|---|
| Identity | Verified account link binds Channel sender to a TAR member |
| Authorization | TAR workspace and Action permissions still apply |
| Commands | Allowlist only: currently `done`, `start`, `ready` |
| Ledger | Control database stores command state and bounded retries |
| Privacy | Shared rooms receive no private business payload, role detail, or payment data |
| Conversation | Lightweight Record keyed by Channel and stable provider thread reference |

===============================================================================

## 10. MEMBERS, ACCESS, PERSONAL BOT, AND HTTP

### Identity and scopes

```text
Google sign-in
      |
      +--> Personal Bot       private identity tenant; no workspace in UI
      |
      +--> Work workspace     membership + shared Records
```

### Access model

| Layer | Values | Controls |
|---|---|---|
| Access | Owner, Admin, Member, Guest | Management authority |
| Job | General, Cashier, Kitchen, Stock, Bot-defined later | Operational work and defaults |
| Record scope | Own, Team, All | Which permitted Records may be read |
| Fields | Type-policy projection | Which fields app/model may receive |
| Assignment | Task-specific | Access to the work item, not every source field |

| Access rule | Decision |
|---|---|
| Contact label | Never grants login or workspace access |
| Secrets and access Actions | Owner/Admin only |
| Revocation | Blocks later server access; device clears cached data after reconnect |
| UI visibility | Convenience only; server policy is authoritative |
| Multiple Jobs | Add only when a real staffing need requires it |

### Personal Bot data decision

| Property | Target behavior | Current alignment |
|---|---|---|
| UI | Personal Bot in Bots; no Personal workspace | **Not aligned:** Personal workspace is still provisioned |
| Server storage | Separate private tenant for cross-device memory and background Runs | Existing remote Personal must be reshaped and isolated |
| Device storage | Cache, drafts, preferences and pending commands | Partial |
| Members | None; exactly one identity owns it | Intended |
| Workspace Owner/Admin access | None | Intended |
| Work access | Uses the person's live membership and permissions | Must be enforced at every read and Action |
| Backup/device replacement | Private server tenant restores permitted data | Planned |
| Delete/export | Explicit identity-owned Actions | Planned |

Rename and constrain the existing remote Personal provisioning as the private Personal Bot tenant. It must never appear as a workspace, accept members, consume work-workspace authority or become readable by workspace Owner/Admin roles.

### Offline work

```text
offline edit -> local pending command -> reconnect -> Action Gateway
                                               |
                                               +--> accepted + saved result
                                               +--> stale/conflict/denied
```

| Offline capability | Rule |
|---|---|
| Reads | Permitted cached projections |
| Writes | Pending commands with stable idempotency keys |
| Reconnect | Recheck membership, fields, versions, stock, and business rules |
| Online-only authority | Payment, refund, approval, access and authoritative stock change |
| Cross-device outage | Not supported; one offline device cannot update another through server sync |

### HTTP surface

| Route | Purpose | Write path |
|---|---|---|
| `GET /health` | Liveness and provisioning status | Read |
| `GET /v1/actions` | Registered Action contracts | Read |
| `GET+POST /v1/workspaces` | List/create workspaces | Control Actions |
| `GET /v1/workspaces/:slug/canvas` | Space cards for member | Read projection |
| `GET /v1/workspaces/:slug/inbox` | Actionable work and permissions | Read projection |
| `GET /v1/workspaces/:slug/directory` | Bots and install state | Read |
| `GET /v1/workspaces/:slug/definitions` | Current definitions | Read |
| `PUT /v1/workspaces/:slug/definitions/:id` | Current direct definition mutation | **Must move behind Action Gateway** |
| `GET /v1/workspaces/:slug/{records,pos/*,site}` | Permitted business reads | Read projection |
| `POST /v1/workspaces/:slug/actions/:id` | Execute registered Action | Action Gateway + `Idempotency-Key` |
| `GET+POST+PUT .../members` | Membership operations | Control Actions |
| `GET+POST+PUT .../team-chat` | Channel links | Control Actions |
| `POST /v1/channels/{slack,discord,google-chat}/events` | Verified inbound event | Ledger -> Gateway |
| `GET /v1/sites/:slug` | Public site | Read R2 release |

===============================================================================

## 11. SITE BOT

### User journey

```text
Draft -> Preview -> Publish -> History -> Restore
```

### Internal Actions

| Action | Behavior | User-facing operation |
|---|---|---|
| `site.generate` | Create typed draft from title, prompt and theme | Draft |
| `site.update` | Apply typed Card/theme/locale changes | Edit Draft |
| `site.compile` | Produce hash and release metadata | Preview, internal |
| `site.publish` | Compile, write immutable R2 release, move live pointer | Publish |
| `site.rollback` | Move live pointer to retained release | Restore |
| `site.refresh` | Recompute permitted collection items without model | Automatic refresh |

### Release model

```text
typed Site Record
      |
      +--> Preview: compile reviewed definition + public-data snapshot
      |
      +--> Publish: verify same version -> R2 immutable release
                                      -> update live release pointer
                                      -> serve semantic HTML + CSS
```

| Guarantee | Rule |
|---|---|
| Typed pages | Fixed Card catalog, not arbitrary generated code |
| Preview binding | Publish the same definition version and public-data snapshot reviewed |
| Immutable release | Unique R2 keys for HTML and CSS |
| Small DB state | Definition, manifest metadata and live release ID; no page bytes |
| Restore | Checked pointer update to retained release |
| Deterministic | Same definition, data snapshot and renderer produce same bytes |

| Card families | Current themes |
|---|---|
| Navigation, hero, content, collection, features, proof | `editorial-chalk` |
| FAQ, hours, contact, form, call-to-action, footer | `streetwear-dark`, `minimal-clean` |

Site drafting currently uses reviewed templates, not a model. Preview HTML/CSS should use a read/preview path and stay out of saved Event results.

===============================================================================

## 12. BUILD STATUS

| Capability | Status | Current limit / required correction |
|---|---|---|
| Runner: single code/model step | **Built** | Only `pos.product.draft` uses a model |
| Action Gateway, replay, Events | **Built** | Feature Atomic Save implementations need consolidation |
| Version checks | **Partial** | Some paths omit affected-row checks or version predicates |
| Bot install/remove and custom definitions | **Built** | Direct definition PUT bypasses Gateway |
| Space | **Built** | Role/Job card policy remains limited |
| Inbox | **Built** | Claiming and approval behavior incomplete |
| Team Channels | **Built** | Customer/social families planned |
| POS | **Built** | Saved Orders check stock but do not reserve it |
| Site | **Built** | Preview storage and concurrency need cleanup |
| Multi-step Run advance/wait/resume | **Planned** | `flow.start` creates a ready Run only |
| Approvals | **Planned** | No approval Action registered |
| Durable delivery/reconciliation | **Planned** | External effects synchronous |
| Authorized offline cache | **Partial** | No cross-device offline operation |
| Personal Bot | **Not aligned** | Remote Personal exists, but UI, identity isolation and durable background Runs need the Personal Bot contract |

### Delivery order

| Order | Change | Proof of completion |
|---:|---|---|
| 1 | Shared Gateway transaction helper + type policy | Races produce one accepted write/Event |
| 2 | Move direct definition write behind Gateway | All official writes use one contract |
| 3 | Immutable object keys + compact Event results | Losing write cannot overwrite winner's content |
| 4 | One complete approval path | Duplicate/racing/stale decisions produce one valid result |
| 5 | Durable delivery for first real provider | Lost wake-up, duplicate, and unknown outcome recover safely |
| 6 | General Flow engine | Real process survives wait/resume and deployment changes |

===============================================================================

## 13. PRICING

**Commercial model:** subscription + included usage. Credits are usage units, not currency or a literal copy of provider charges.

| Item | Charge | Meaning |
|---|---:|---|
| Subscription | ₹500/month | Platform + 1,000 usage credits |
| Active owned work workspace | 100 credits/month | TAR commercial reservation from owner allowance |
| Joined workspace | 0 direct member credits | Usage belongs to workspace owner |
| Additional usage | ₹100 / 1,000 credits | Larger bundles use same rate |
| Deterministic Actions/site rendering | Included | Infrastructure internally metered |
| `pos.product.draft` | 0.02 credit/call | Current model Action |
| SMS, WhatsApp, domains, payment processing | Separate | Third-party pass-through where applicable |

| Billing rule | Decision |
|---|---|
| Payer | Workspace owner funds shared usage |
| Expensive async work | Reserve credits, then settle/release idempotently |
| New feature | Price only after implementation and measurement |
| Workspace reservation | Commercial allowance, not exact Turso database cost |
| Per-member alternative | Requires product copy and cost model to change together |

===============================================================================

## 14. PIZZA STORE — END TO END

### 14.1 Workspace and members

```text
+=============================================================================+
| SLICE HOUSE                                                                 |
| Currency: INR       Timezone: Asia/Kolkata       Bot: POS                  |
+=============================================================================+
| Muthu     Owner                                                  manages all |
| Malar     Admin  + Cashier                         sells and manages register |
| Iniya     Member + Cashier                                      takes orders |
| Velan     Member + Kitchen                                 prepares products |
+=============================================================================+
```

| Member | Access | Job | Default screen | Can see | Main Actions |
|---|---|---|---|---|---|
| Muthu | Owner | General | Space | Sales, stock, register, members | Configure, approve, refund |
| Malar | Admin | Cashier | Space | Sales, Orders, stock, register | Sell, checkout, close register |
| Iniya | Member | Cashier | Space | New Sale, permitted Orders | Save Order, checkout |
| Velan | Member | Kitchen | Inbox | Items and quantities for open Orders | Start item, mark ready |

### 14.2 Owner installs the POS Bot and Sales Bot

```text
+=============================================================================+
| Slice House                                  Space | Inbox | BOTS            |
+=============================================================================+
| Search Bots...                                                              |
|                                                                             |
| POS Bot          Not installed                                              |
| Retail sales, payments, stock, kitchen work and register                    |
|                                                               [ View Bot ]  |
|                                                                             |
| Sales Bot        Not installed                                              |
| Customer enquiries, leads, quotes and follow-up                             |
|                                                               [ View Bot ]  |
|                                                                             |
| Team Bot         Add              Site Bot        Add                       |
+=============================================================================+
```

#### Secondary screen — POS Bot detail

```text
+=============================================================================+
| < Bots                              POS BOT                                 |
+=============================================================================+
| Sell, take payments, manage products and keep stock current.                |
|                                                                             |
| FEATURES                                                                    |
| [x] New Sale       [x] Orders & Returns       [x] Products & Stock         |
| [x] Customers      [x] Register               [x] Kitchen queue            |
|                                                                             |
| JOBS: Cashier · Kitchen · Stock                                             |
| SPACE: New Sale · Sales today · Low stock · Kitchen queue · Register        |
|                                                                             |
| Changes: 6 features · 5 Space cards · 3 Job defaults                       |
|                                           [ Cancel ] [ Install POS Bot ]    |
+=============================================================================+
```

```text
Install POS Bot
      |
      +--> dependency and permission check
      +--> preview configuration
      +--> Action Gateway validates owner
      +--> Atomic Save: Bot definitions + Space cards + Event
      +--> Bots shows Installed
```

#### Secondary screen — Sales Bot detail

```text
+=============================================================================+
| < Bots                             SALES BOT                                |
+=============================================================================+
| Turn an enquiry into a customer, lead, quote or follow-up.                  |
|                                                                             |
| FEATURES                                                                    |
| [x] Leads          [x] Deals and quotes       [x] Follow-up Inbox           |
| [x] Customer view  [x] Channel reply drafts                                  |
|                                                                             |
| USE WHEN: "Do you cater a birthday party?" or "What is today's offer?"     |
| NOT FOR: payment, stock deduction, kitchen preparation or register closing  |
|                                                                             |
| SPACE: New leads · Deals to follow up · Quotes awaiting reply                |
|                                           [ Cancel ] [ Install Sales Bot ]  |
+=============================================================================+
```

| Bot | Primary purpose | Starts with | Produces | Does not own |
|---|---|---|---|---|
| Sales Bot | Turn interest into a sale opportunity | Enquiry or outbound campaign | Lead, Deal, quote, follow-up Task | Payment, stock, register, kitchen work |
| POS Bot | Complete an in-store or confirmed retail sale | Cashier starts a sale | Order, Payment, stock movement, receipt | Lead nurturing or campaign follow-up |

```text
Install Sales Bot
      |
      +--> configure customer channels, reply style and follow-up owner
      +--> Action Gateway validates owner
      +--> Atomic Save: Bot definitions + Space cards + Inbox rules + Event
      +--> Bots shows Installed
```

Sales Bot hands a qualified request to the cashier. The cashier creates the POS Order and POS Bot alone records payment and changes stock. This keeps one source of truth for each fact.

### 14.2a How every Bot fits together

The shared customer foundation is **Core**, not a Bot. A Contact, Organization, Link and permission record exist once. Bots add focused work on top of those facts.

```text
+=============================================================================+
| Slice House                                  Space | Inbox | BOTS            |
+=============================================================================+
| CRM Bot          Add       Customer history, consent, segments, timeline    |
| Sales Bot        Installed Lead, deal, quote, follow-up                     |
| Support Bot      Add       Ticket, conversation, resolution                  |
| POS Bot          Installed Order, payment, stock, receipt, register         |
|                                                                             |
| HR Bot           Add       Candidate, employee profile, onboarding           |
| Finance Bot      Add       Invoice, expense, collection, reconciliation     |
| Operations Bot   Add       Checklist, incident, recurring work               |
| Team Bot         Add       Members, jobs, assignment                         |
| Site Bot         Add       Website draft, preview, publish                   |
+=============================================================================+
```

```text
                         CORE RECORDS
        Contact · Organization · Link · Task · Event · Files
                                  |
          +-----------------------+------------------------+
          |                       |                        |
          v                       v                        v
       CUSTOMER                 PEOPLE                  BUSINESS
  CRM · Sales · Support · POS     HR · Team        Finance · Operations · Site
```

| Bot | What it owns | Pizza Store example | Must not own |
|---|---|---|---|
| CRM Bot | Customer timeline, consent, tags and segments | Priya's enquiries, quotes, purchases and support history in one view | Payment, deal stage, ticket resolution |
| Sales Bot | Leads, deals, quotes and follow-up | Catering enquiry → quote → cashier handoff | Stock, payment, register |
| Support Bot | Conversations, tickets and resolutions | "My order was wrong" → ticket → reply → resolved | Refund payment; it requests a POS refund Action |
| POS Bot | Orders, payments, stock, register and receipt | Counter sale or approved catering order | Lead nurturing, campaigns |
| HR Bot | Candidate and employee profiles, hiring and onboarding work | Hire a second kitchen worker | Workspace access; Team Bot assigns roles after approval |
| Team Bot | Workspace members, jobs and assignments | Give Velan the Kitchen job and tasks | HR employment history |
| Finance Bot | Invoices, expenses, collections and reconciliation | Supplier invoice and daily sales reconciliation | Directly alter POS payment facts |
| Operations Bot | Checklists, incidents, recurring work and handoffs | Opening checklist, fridge issue, closing checklist | Product price or stock adjustment without a registered Action |
| Site Bot | Website content, releases and publishing | Catering landing page and menu updates | Customer, order or payment records |

| Shared question | Correct home |
|---|---|
| "Who is Priya and what has she done with us?" | Core Contact + CRM Bot timeline |
| "Will Priya accept the catering quote?" | Sales Bot Deal |
| "Has Priya paid and did stock change?" | POS Bot Order and Payment |
| "Priya says garlic bread was missing." | Support Bot Ticket; POS Bot performs any approved refund |
| "Can Velan prepare orders?" | Team Bot membership/job; permissions enforce it |
| "Is the business profitable this week?" | Finance Bot reading POS facts; it does not rewrite them |

```text
Priya's journey across Bots

Website / WhatsApp enquiry
          |
          v
Sales Bot: Lead -> quote -> confirmed handoff
          |
          +--> CRM Bot: append relationship timeline
          v
POS Bot: Order -> payment -> stock -> receipt
          |
          +--> CRM Bot: append purchase history
          v
Support Bot: issue? -> Ticket -> resolution
          |
          +--> POS Bot: approved refund, if needed
```

**Planned:** CRM, Support, HR, Finance and Operations Bot workflows and their channel adapters. The diagram defines their boundaries so later Bot installs remain compatible with POS and Sales.

### 14.3 Initial setup and register

```text
+=============================================================================+
| POS SETUP — Owner/Admin                                                     |
+=============================================================================+
| Store name     [ Slice House                         ]                      |
| Currency       [ INR v ]                                                    |
| Timezone       [ Asia/Kolkata v ]                                           |
| Location       [ Anna Nagar                          ]                      |
| Receipt footer [ Thank you!                          ]                      |
|                                                                             |
|                                                [ Save store settings ]      |
+=============================================================================+
```

```text
+=============================================================================+
| OPEN REGISTER — Owner/Admin/Cashier                                         |
+=============================================================================+
| Opening cash       [ ₹2,000 ]                                               |
| Opened by          Malar                                                    |
|                                                                             |
| Action             pos.register.open                                        |
|                                         [ Cancel ] [ Open register ]         |
+=============================================================================+
```

### 14.4 Role-based Space screens

#### Muthu — Owner

```text
+=============================================================================+
| Slice House                                  SPACE | Inbox | Bots            |
+=============================================================================+
| Sales today       New leads          Low stock        Register              |
| ₹12,400           6                  3                Open                 |
|                                                                             |
| [ New sale ] [ Leads ] [ Deals ] [ Products ] [ Register ] [ Members ]     |
|                                                                             |
| Needs attention: 1 refund request · 3 low-stock products                    |
+=============================================================================+
```

#### Malar — Admin / Cashier

```text
+=============================================================================+
| Slice House                                  SPACE | Inbox | Bots            |
+=============================================================================+
| Sales today       Open Orders        New leads        Register              |
| ₹12,400           4                  6                Open                 |
|                                                                             |
| [ New sale ] [ Leads ] [ Orders ] [ Products ] [ Close register ]          |
|                                                                             |
| Ready for pickup: Order #104                   Shift review due at closing  |
+=============================================================================+
```

#### Iniya — Cashier

```text
+=============================================================================+
| Slice House                                  SPACE | Inbox | Bots            |
+=============================================================================+
| Register                    Open · Malar                                      |
| My Orders                   5 today                                           |
|                                                                             |
|                       [ + NEW SALE ]                                         |
|                                                                             |
| Recent: #1041 Paid · #1040 Paid · #1039 Refunded                            |
+=============================================================================+
```

#### Velan — Kitchen

```text
+=============================================================================+
| Slice House                                  Space | INBOX | Bots            |
+=============================================================================+
| Kitchen queue                                                               |
|                                                                             |
| #1042  2 Margherita · 1 Garlic Bread     New           [ Start ]            |
| #1041  1 Farmhouse                        Preparing     [ Open ]             |
| #1040  2 Pepperoni                        Ready         waiting pickup       |
|                                                                             |
| Customer, price, phone and payment fields are hidden.                       |
+=============================================================================+
```

### 14.5 Cashier starts a sale

```text
Iniya taps New Sale -> pos.open -> New Sale secondary screen
```

#### Secondary screen — New Sale

```text
+=============================================================================+
| < Space                              NEW SALE                               |
+=============================================================================+
| Search or scan product [ margherita________________ ] [ Scan ]              |
|                                                                             |
| Margherita                         ₹250 x 2                    ₹500          |
| Garlic Bread                       ₹120 x 1                    ₹120          |
|                                                                             |
| Customer       [ Walk-in v ]       Order type [ Takeaway v ]                |
| Discount       [ 0% ]              Tax                  ₹31                 |
| TOTAL                                                     ₹651              |
|                                                                             |
| [ Save Order ]                              [ Cash ] [ UPI ] [ Checkout ]   |
+=============================================================================+
```

| Button | Registered Action | Atomic Save |
|---|---|---|
| Save Order | `pos.order.save` | Open Order + Event |
| Cash checkout | `pos.checkout` | Paid Order + Payment + stock movements + Event |
| UPI checkout | `pos.checkout` | Same, after receipt confirmation and unique reference |

Current `Save Order` checks product versions and stock but does not reserve stock. The saved state is `open` and payment status is `unpaid`.

### 14.5a Sales Bot turns an enquiry into a cashier handoff

Sales Bot is useful before a POS sale: it prevents customer enquiries, party orders and quote requests from being lost in chat. It does not create a paid POS sale by itself.

```text
+=============================================================================+
| < Leads                           NEW CATERING ENQUIRY                      |
+=============================================================================+
| From            Priya · Website chat                                        |
| Message         "Need pizza for 25 people this Saturday."                   |
|                                                                             |
| Customer        [ Create / match contact ]                                  |
| Need            [ Catering v ]       Budget [ ₹8,000 ]                      |
| Next step       [ Send quote v ]     Owner  [ Malar v ]                      |
|                                                                             |
| [ Save lead ] [ Draft reply ]                 [ Create POS sale when ready ]|
+=============================================================================+
```

| Sales Bot step | Result | POS Bot involvement |
|---|---|---|
| Save enquiry | Lead + customer link + Event | None |
| Send or approve quote | Deal/quote + follow-up Task | None |
| Customer confirms | Cashier receives a handoff in Inbox | Cashier starts `pos.open` |
| Cashier checks out | Payment, Order and stock are saved together | `pos.checkout` |

Channel intake, reply drafts, lead records and Inbox handoff are **Planned** until the Sales Bot and its channel adapters are implemented. The role boundary above applies now: a Sales Bot must never bypass POS checkout.

### 14.6 Work appears in each Inbox

#### Velan — Kitchen Inbox

```text
+=============================================================================+
| Slice House                                  Space | INBOX | Bots            |
+=============================================================================+
| MINE (0)       UNASSIGNED (2)       TEAM (4)                                |
|                                                                             |
| ORDER #1042 · TAKEAWAY                                      Open            |
| 2 x Margherita          pending                            [ Start ]         |
| 1 x Garlic Bread        pending                            [ Start ]         |
|                                                                             |
| Details shown: product · quantity · preparation state                       |
+=============================================================================+
```

#### Malar / Iniya — Cashier Inbox

```text
+=============================================================================+
| Slice House                                  Space | INBOX | Bots            |
+=============================================================================+
| [ Sales handoffs ] [ Open Orders ] [ Ready ] [ Handover ]                   |
|                                                                             |
| Priya catering · 25 people · Saturday             [ Create POS sale ]       |
| #1042  Takeaway    Kitchen: preparing    Payment: unpaid   [ Open ]         |
| #1041  Counter     Kitchen: ready        Payment: unpaid   [ Checkout ]     |
| #1040  Takeaway    Paid                  Pickup pending    [ Hand over ]    |
+=============================================================================+
```

#### Muthu — Owner Inbox

```text
+=============================================================================+
| Slice House                                  Space | INBOX | Bots            |
+=============================================================================+
| [ Mine ] [ Team ] [ Approvals ]                                             |
|                                                                             |
| Refund request #1031     ₹250     Duplicate item       [ Review ]           |
| Low-stock review         3 items                        [ Open stock ]       |
| Register difference      ₹-50     Malar                [ Review ]           |
+=============================================================================+
```

Refund approval and automatic register-difference Tasks are **Planned**. Current refunds use direct role-checked confirmation.

### 14.7 Kitchen prepares the Order

#### Secondary screen — Order preparation

```text
+=============================================================================+
| < Inbox                      ORDER #1042 · KITCHEN                           |
+=============================================================================+
| TAKEAWAY                                                                    |
|                                                                             |
| Margherita             quantity 2                                          |
| pending -> [ Start preparing ] -> [ Mark ready ]                            |
|                                                                             |
| Garlic Bread           quantity 1                                          |
| pending -> [ Start preparing ] -> [ Mark ready ]                            |
|                                                                             |
| Order ready when every item is ready.                                       |
+=============================================================================+
```

```text
Start item -> pos.order.item.update(status=preparing)
Mark ready -> pos.order.item.update(status=ready)
Each tap   -> Action Gateway -> version check -> Atomic Save -> Event
```

### 14.8 Cashier checks out and hands over

#### Secondary screen — Checkout

```text
+=============================================================================+
| < Order #1042                         CHECKOUT                              |
+=============================================================================+
| Kitchen               Ready                                                  |
| Total                 ₹651                                                   |
| Payment method        [ UPI v ]                                              |
| UPI reference         [ 4312987654________________ ]                         |
| [x] Payment received                                                           |
|                                                                             |
|                     [ Back ] [ Confirm payment and complete sale ]          |
+=============================================================================+
```

```text
pos.checkout
     |
     +--> recheck Order/cart/product versions and total
     +--> require unique UPI reference and cashier confirmation
     +--> Atomic Save
            +--> Order state = paid
            +--> Payment Record
            +--> stock movements and reduced stock
            +--> Event/result
     +--> show receipt
```

#### Secondary screen — Receipt / handover

```text
+=============================================================================+
| SALE COMPLETE                                             ORDER #1042       |
+=============================================================================+
| 2 x Margherita                                                    ₹500      |
| 1 x Garlic Bread                                                  ₹120      |
| Tax                                                                ₹31      |
| TOTAL                                                             ₹651      |
| Payment: UPI · reference ending 7654                                        |
|                                                                             |
| [ Print receipt ] [ Share receipt ] [ Mark handed over ]                    |
+=============================================================================+
```

`Mark handed over` and a separate `fulfilled` Order state are target behavior. Current checkout finishes the implemented sale by setting the Order to `paid`.

### 14.9 Refund path

#### Secondary screen — Return and refund

```text
+=============================================================================+
| < Order #1031                       RETURN / REFUND                          |
+=============================================================================+
| Margherita             sold 2       return [ 1 ]                            |
| Reason                 [ Duplicate item v ]                                 |
| Restock usable item    [x]                                                   |
| Refund method          UPI                                                   |
| Refund reference       [ 98213476__________________ ]                       |
| [x] Money was returned to the customer                                      |
|                                                                             |
| Refund amount          ₹250                                                  |
|                                      [ Cancel ] [ Record refund ]           |
+=============================================================================+
```

| Current refund | Planned approval path |
|---|---|
| Authorized operator confirms money was returned | Cashier submits request |
| `pos.refund` validates quantities/reference | Owner receives Approval Inbox Task |
| Atomic Save updates Order, negative Payment and optional restock | Approval revalidates current Order/version |
| Manual confirmation is recorded honestly | Provider intent delivers/reconciles actual refund |

### 14.10 Close register

#### Secondary screen — Close Register

```text
+=============================================================================+
| < Register                         CLOSE REGISTER                           |
+=============================================================================+
| Opened by             Malar                                                  |
| Opening cash          ₹2,000                                                 |
| Expected cash         ₹8,450                                                 |
| Counted cash          [ ₹8,400 ]                                             |
| Difference            ₹-50                                                   |
|                                                                             |
|                         [ Cancel ] [ Review and close register ]            |
+=============================================================================+
```

```text
pos.register.close -> validate active register -> calculate difference
                   -> Atomic Save closed Register + Event
                   -> Owner review Task                         PLANNED
```

### 14.11 Complete cross-screen journey

```text
MUTHU · BOTS
Install POS Bot + Sales Bot
      |
      v
MUTHU/MALAR · POS SETUP
Store settings -> products -> open register
      |
      v
SALES BOT · CUSTOMER ENQUIRY                         PLANNED
Priya asks for catering -> Lead -> quote -> cashier handoff
      |
      v
INIYA · SPACE
Open handoff -> New Sale -> save open Order
      |
      v
VELAN · INBOX
Start items -> mark items ready
      |
      v
MALAR/INIYA · INBOX
Open ready Order -> confirm Cash/UPI -> checkout
      |
      v
ACTION GATEWAY · ATOMIC SAVE
Paid Order + Payment + stock movements + Event
      |
      v
CASHIER · RECEIPT
Print/share -> hand over                              TARGET explicit fulfil
      |
      +--> MUTHU · INBOX                              TARGET approvals
      |    review refund or register difference
      |
      +--> MALAR · CLOSE REGISTER
           count -> compare -> close
```

### 14.12 State and stock rules

| Model | Current implementation | Target business lifecycle |
|---|---|---|
| Order | `open -> paid` or `open -> cancelled` | `Draft -> Accepted -> Preparing -> Ready -> Fulfilled` |
| Item preparation | `pending -> preparing -> ready` | Same |
| Payment | `unpaid -> paid -> partially_refunded/refunded` | Separate Payment lifecycle |
| Stock | Check on save; consume at checkout | Reserve at acceptance if acceptance promises availability |

```text
TARGET RESERVATION
accept -> reserve stock
cancel -> release unused reservation
fulfil -> convert reservation to consumption

available = on-hand - reserved
```

### 14.13 Safety and visibility

| Concern | Rule |
|---|---|
| Duplicate tap/network retry | Same idempotency key returns saved result |
| Concurrent update | Expected version allows one accepted change |
| UPI sale | Require received confirmation and unique reference |
| UPI refund | Require returned confirmation and unique refund reference |
| Kitchen privacy | Product, quantity and preparation only |
| Cashier privacy | Operational customer/payment fields only as permitted |
| Owner access | Full permitted business view; never the member's Personal Bot tenant |
| Provider not integrated | Say “recorded manually,” never “provider completed” |

===============================================================================

## REFERENCES

| Topic | Source |
|---|---|
| Runner terminology | [OpenAI Agents SDK — Running agents](https://openai.github.io/openai-agents-js/guides/running-agents/) |
| Agent harness meaning | [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |
| Simple agent patterns | [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |
| Policy enforcement | [NIST — Policy Enforcement Point](https://csrc.nist.gov/glossary/term/policy_enforcement_point) |
| Durable steps and waits | [Cloudflare Workflows rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/) |
| Delivery guarantees | [Cloudflare Queues](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) |
| Transactional outbox | [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) |
| Sync and database access | [Turso Sync](https://docs.turso.tech/sync/usage), [authorization](https://docs.turso.tech/sdk/authorization) |
| Storage pricing | [Turso](https://turso.tech/pricing), [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) |

```text
TAR keeps business facts simple.
The Runner handles execution.
The Action Gateway protects shared changes.
Inbox keeps human work visible.
Bots add capability without becoming autonomous processes.
```
