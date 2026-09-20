# TAR v9 - Decision-First Business OS

> Code owns the flow. System One decides, System Two writes, only through one gateway.

**Status:** conceptual target, not yet an implemented or benchmarked system. Numbers are
planning estimates rechecked at build time.

```text
+-----------------------------------------------------------+
| INTENT    person | channel | schedule | webhook           |
+-----------------------------------------------------------+
        |
        v
+-----------------------------------------------------------+
| ROUTER    cache -> DECIDE -> WRITE -> HUMAN               |
+-----------------------------------------------------------+
        |
        v
+-----------------------------------------------------------+
| HARNESS   context | tools | sandbox | hooks | limits      |
+-----------------------------------------------------------+
        |
        v
+-----------------------------------------------------------+
| GATEWAY   authenticate - authorize - validate - replay    |
+-----------------------------------------------------------+
        |
        v
+-----------------------------------------------------------+
| COMMIT    records + events + checkpoint + effect (atomic) |
+-----------------------------------------------------------+
        |
        +--> log ------> wake Runs / Inbox / metrics
        |
        '--> effects --> provider -> result event
```

**Architecture type:** one commit path over one typed fact store, typed decisions on the
hot path only where they pay, durable Runs for work spanning time, people or systems.

**Claim:** a business OS does not need an LLM in its hot path. Most AI steps in business
software are decisions (route, classify, gate, score), not writing. Decisions are now a
separate, cheaper model class - but only where they beat the cheapest viable model.

**Priority:** POS, Sales, Team, automations. Compact flows, explicit authority.

============================================================
## 0. DESIGN BASIS - WHAT THE 2026 STACK MAKES POSSIBLE
============================================================

Every choice traces to a shipped capability, not to fashion.

| Concept | What it gives | Lands as | Ref |
|---|---|---|---|
| System One models (Jev) | typed probabilistic decisions, no text, output free | executor DECIDE | [S4] |
| Choice / Score / Noul | three question types, one parallel call | decide contract | [S5] |
| Confidence-gated routing | confidence as a second decision axis | Router gate | [S6] |
| Model router pattern | cascade, classifier, bandit, cost-quality scoring | Router | - |
| Agent harness layers | context, tools, sandbox, durability, memory, hooks, observability | Harness | [S10] |
| Code Mode | one typed API plus code execution instead of N tool schemas | tool surface (later) | [S9] |
| Durable execution | journal and replay; never restart a long run | Run checkpoint | [S11] |
| Event-driven agents | events as system of record; publish/subscribe wake | Event log | [S12] |
| MCP + A2A | tool layer and agent-coordination layer | Bot capability (later) | [S13] |
| Brain/Hands isolation | sandbox has no credentials, no network | isolate sandbox | [S14] |
| Portable agent definition | AGENTS.md identity plus SKILL.md methods | Bot package | [S14] |
| Exact cheap models | Gemma-4, DeepSeek-V4-Flash with checked rates | Write | [S1][S2] |

### Honest limits of the decision model [S7]

| Limit | Consequence for TAR |
|---|---|
| Writes no text, no code, no summary | Write still needs System Two; most installs run both |
| Options are fixed per request | Open-ended extraction cannot use Decide |
| Text input only | Images, audio, screenshots need a model in front |
| 64k context, accuracy falls before it | Chunk or retrieve first; irrelevant state is a distractor |
| Closed weights, no VPC or self-host | Data-residency work cannot use it |
| Below top frontier; vendor scores agreement, not truth | Signal generator queried broadly, not an oracle |
| Confidence thresholds are earned, not copied | Every threshold measured on labelled data |
| Launch pricing is not a contract | Model unit economics with headroom |
| Two vendors, two outages | A Write-only fallback must exist and be exercised |

### Sources [S1]-[S14]

| Ref | Source | Used for |
|---|---|---|
| S1 | DeepSeek-V4-Flash on DeepInfra | exact Write model, rates |
| S2 | Gemma-4-E4B-it on DeepInfra | cheap Write model, rates |
| S3 | DeepInfra caching, reasoning, structured output | cache hits, output billing |
| S4 | TypeSafe System One and Jev launch | typed decisions, pricing |
| S5 | TypeSafe docs, introduction | Choice, Score, Noul |
| S6 | TypeSafe patterns | confidence-gated routing |
| S7 | jev-agent.com limitations and pricing | honest limits, measured cost |
| S8 | openchamber launch-window measurements | real vs claimed multipliers |
| S9 | Cloudflare Code Mode | one typed API, isolate sandbox |
| S10 | turion agent harness | harness layers |
| S11 | agentmarketcap durable execution | journal and replay |
| S12 | turion event-driven agents | events as system of record |
| S13 | zylos MCP, A2A | tool and coordination layers |
| S14 | dev.to agent stack | brain/hands, portable definition |

============================================================
## 1. PRIMITIVES - FEWEST POSSIBLE
============================================================

Seven names, three storage shapes, one commit path.

| Primitive | One line | Absorbs |
|---|---|---|
| Record | current truth: typed, versioned, one row per fact | orders, contacts, tasks, definitions, runs, effects |
| Event | append-only accepted fact; wakes work; audit; the change feed | audit log, timeline, queue message |
| Action | the only registered way to read or change truth | tools, mutations, commands, APIs |
| Flow | versioned process definition | flows, transitions, step graphs |
| Run | one durable occurrence of a Flow | workflows, jobs, sessions, leases |
| Effect | one act outside TAR, with reconciliation | outbox, provider calls, retries |
| Gateway | the single commit path | auth, policy, idempotency, version, transaction |

```text
records         current truth, mutable, versioned
events          append-only accepted facts, monotonic per tenant
action_results  replay ledger for idempotency
---------------------------------------------------------------
Definitions are records (type=flow|action|bot|skill|view)
Runs are records (type=run)     Effects are records (type=effect)
Everything else - timelines, metrics, search, Inbox - is a projection.
```

Why this is efficient: one version scheme, one policy path, one projection engine, one
sync surface. Adding a business object is data, not schema or code.

### Authority

| Component | May decide | May not decide |
|---|---|---|
| UI | intent and presentation | authorization |
| Router | which executor runs | business truth |
| Decide model | a typed judgment | shared state |
| Harness | proposed next Action | permission |
| Gateway | whether an Action is accepted | undeclared work |
| Event log | which consumer wakes | meaning of state |
| Effect worker | attempt an authorized act | invent an act |

============================================================
## 2. KERNEL - FACTS, LOG, COMMIT
============================================================

```text
records
  id - tenant - type - state - data - version
  owner? - due? - updated_at - archived_at?

events
  id - tenant - seq - kind - subject - actor
  action_result_id - run? - data - created_at

action_results
  id - tenant - actor - action - action_version
  idempotency_key - request_hash - result - created_at
```

| Rule | Decision |
|---|---|
| Current truth | read the latest Record |
| Common filters | promoted to columns; the rest validated JSON |
| Concurrency | integer version; compare-and-set |
| Removal | archive by default |
| Ordering | monotonic tenant sequence; subject version inside data |
| Payload | IDs and compact facts; never documents, secrets or instructions |
| Correction | append a correcting Event; never rewrite history |
| Large bytes | immutable R2 object referenced by the Record |
| Retention | keep Events that active waits and consumers still need |

### One commit path

```text
Action request
     |
     v
authenticate identity
resolve tenant and membership
resolve registered Action version
check access, job, subject and fields
validate input and canonicalize
replay lookup (actor, action, version, idempotency key)
     |
     v
BEGIN
  recheck replay, invariants and expected versions
  apply the deterministic transition
  append Event(s)
  checkpoint the Run when present
  save the Effect (delivery intent) when present
  save the Action result
COMMIT  - all or nothing
dispatch happens after commit
```

| Risk | Protection |
|---|---|
| Duplicate request | stable idempotency key returns the saved result |
| Reused key, different body | request hash mismatch fails closed |
| Concurrent update | expected version and affected-row check |
| Model mistake | typed proposal, then deterministic validation |
| Partial write | records, events, checkpoint and effect share one transaction |
| Cross-tenant id | resolved inside the authorized tenant only |
| Replay after state moved on | replay is returned before mutable-state validation |

Protected lifecycles - money, stock, access, publication - never accept a generic Record
write. A successful retry of a completed command returns the saved result.

### Cross-store rules

| Rule | Reason |
|---|---|
| D1 = identity, membership, routing, AI budget reservations | control plane |
| Turso = business truth per workspace | data plane |
| R2 = blobs and releases | objects |
| Device SQLite = projections, drafts, pending intents | cache |
| D1 reservation and Turso write are not one transaction | reserve AI spend first, then settle or release with reconciliation |
| D1 membership -> Turso authority is a migration | never assume it is done |

============================================================
## 3. DECIDE - SYSTEM ONE, SYSTEM TWO, ROUTER
============================================================

### Four executors

| Executor | Does | Latency | Cost per call | May change shared truth |
|---|---|---|---|---|
| CODE | known math, validation, integration | ms | ~0 | yes, through the Gateway |
| DECIDE | a typed judgment: choose, score, gate | 70-500ms | ~$0.00002 | no |
| WRITE | prose, code, plan, summary | seconds | $0.001-0.05 | no |
| HUMAN | judgment, approval, missing fact | minutes | - | yes, through the Gateway |

### Decide contract [S5]

```text
state + questions
  CHOICE  options[]        -> choice - probabilities[] - confidence
  SCORE   levels[]         -> score   - probabilities[] - confidence
  GATE    statement        -> noul (0..1)
  -> all questions in one call, evaluated in parallel
```

| Rule | Reason |
|---|---|
| Code owns control flow | a Decide answer is a value, never an instruction |
| Atomic questions | decompose, then combine with weights in code |
| One call, many questions | state is paid once; extra questions are near free |
| Measure every threshold | a 0.34 winner is a coin flip with extra steps |
| Low confidence escalates | never guess on a business outcome |
| Save the decision | answer, probabilities and confidence are logged |
| Never recompute on replay | a saved decision is replayed, not re-decided |
| Decisions do not replace guards | arithmetic and invariants stay in CODE |
| Never for authorization, arithmetic, settlement | those stay deterministic |

### Router - cheapest first, with a cost gate

```text
                 +--> cache hit?  -----------------> reuse
intent ----------+
                 +--> DECIDE confident AND cheaper? > act
                 +--> DECIDE unsure or not cheaper? > WRITE
                 +--> WRITE unsure? ---------------> HUMAN
                 '--> consequential + no rule? ----> HUMAN
```

| Layer | Policy |
|---|---|
| Semantic cache | a repeated decision reuses the stored answer with a TTL |
| Decide | default only where it beats the cheapest viable model for real sizes |
| Write | only when text or code must be produced, or Decide fails the gate |
| Human | money, access, publication, and any unresolved ambiguity |
| Fallback | a DECIDE outage routes to WRITE, never to a bypass |
| Efficiency | no model call for a button, arithmetic, stock or authorization |

The cost gate is v8's correction. Jev beats a cheap model only when the cheap model's
output is long enough to matter; for a short classify call it can cost more.

```text
route to DECIDE only when:  Cl > Cj / p
  Cj = one Decide call cost      p = fraction of Write calls avoided
  Cl = one Write call cost       (otherwise Decide adds cost)
```

### Where Decide earns its place

| Use | Question type | Replaces |
|---|---|---|
| Inbound message triage | CHOICE over intents | an LLM classify call |
| Bot and flow routing | CHOICE over handlers | an LLM router call |
| Urgency and priority | NOUL, or SCORE over levels | an LLM tag call |
| Outbound guardrail before an Effect | NOUL: does this match the approved intent? | a human spot check |
| Provider-timeout reconciliation | CHOICE: delivered, absent, inconclusive | blind retry |
| Decide if an expensive investigation is needed | NOUL | skipping whole DeepSeek jobs |

### Adoption ladder

```text
off -> offline evaluation -> sampled shadow -> enable winning routes only
```

============================================================
## 4. HARNESS - ONE BOUNDED TURN
============================================================

```text
+-----------------------------------------------------------+
| HARNESS - one bounded turn                                |
| wake       command, event, timer, approval, effect result |
| context    permitted Records + Run checkpoint + Skill     |
| decide     System One, System Two, or a human             |
| tools      typed allowlist of Actions and projections     |
| sandbox    isolate, no network, no keys, bindings only    |
| hooks      pre and post policy, outside the model control |
| output     result or a schema-checked Action proposal     |
| limits     steps, turns, time, cost, retries, cycle stop  |
+-----------------------------------------------------------+
```

### Tool surface - allowlist now, Code Mode later

Ship first: a small typed allowlist of registered Actions and permitted read projections,
each schema-checked. No unrestricted SQL, code execution or arbitrary URLs as defaults.

```text
pilot:    model -> proposed registered Action -> Gateway

later:    definitions -> generated typed API -> one run(code) tool
          -> isolate (no network, no keys) -> bindings -> Gateway
```

Code Mode is kept as the upgrade path for genuine multi-tool orchestration [S9]. It is
deferred, not rejected: arbitrary model-executed code is a real risk at pilot scale.

| Rule | Reason |
|---|---|
| Tool list fixed by the published step | policy, not the model's choice |
| Read binding returns a permitted projection | never raw state |
| Action binding returns a proposal | the Gateway accepts or rejects |
| Sandbox has no network, no keys | the model cannot leak a secret |
| Untrusted content is data | a prompt, file, Event or tool result cannot widen authority |

### Hooks are policy, not suggestions

Pre-tool and post-tool checks run in code, outside the model's control. The model cannot
skip, edit or argue past them. The Gateway and the Effect worker are the enforcement
surface; the harness merely reports to them.

### Limits - every turn is bounded

| Limit | Required |
|---|---|
| Steps per wake | fixed maximum |
| Model turns | fixed maximum |
| Wall clock | deadline |
| Spend | per-turn and per-Run budget |
| Retries | bounded policy with backoff |
| Repetition | cycle detection or a monotonic checkpoint |

============================================================
## 5. RUNS AND EFFECTS - DURABLE WORK
============================================================

### Run

```text
type=run
  flow_id - flow_version - subject? - authority_ref
  state - step - wait_kind? - wait_match?
  context - attempts - lease_owner? - lease_epoch - lease_until?
  wait_after_seq? - version - wake_at? - finished_at?
```

```text
ready --> running --> waiting --> running --> completed
            |           |          |
            +-----------+----------+--> failed
            +-----------+----------+--> cancelled
```

| Rule | Decision |
|---|---|
| Definition | pins the immutable Flow and Action versions it started with |
| Journal | one checkpoint per accepted transition; resume, never restart |
| Context | keep continuation facts; reload authoritative Records |
| Claim | version compare-and-set, lease epoch, expiry in database time |
| Fencing | a worker that loses the lease cannot commit, by epoch and version |
| Authority | every resumed Action rechecks current permission |
| Drift | a new Flow version applies to new Runs; migration is an explicit Action |
| Terminal | final state plus a final Event |

| Wait | Resumes on |
|---|---|
| Event | a matching committed Event |
| Time | a durable timer |
| Human | a completed Inbox decision |
| Effect | a provider result Event |
| Retry | a backoff deadline |

Durability is owned by TAR in the Run record. Queue and a scheduled sweep drive wakes at
pilot scale; a managed Workflow is an optional wake driver for genuine multi-step waits,
never a second source of truth [S11].

### Effect

```text
type=effect
  kind - provider - destination_ref - payload_ref
  state - attempt - next_attempt_at - provider_key
  provider_result_ref? - lease_owner? - lease_epoch? - lease_until? - authority_ref
```

```text
atomic save: business change + effect.requested + Effect record
        |
        v
effect worker -> provider with a stable provider key
        |
        +--> confirmed -> effect.succeeded
        +--> rejected  -> effect.failed
        '--> unknown   -> reconcile before any retry
```

| Rule | Reason |
|---|---|
| Providers are called outside transactions | never hold a lock across a network call |
| Approval binds destination, payload and operation | a later send cannot widen it |
| Duplicate callbacks dedupe on provider identity | a provider may deliver twice |
| Ambiguous outcome is reconciled, never blind-retried | avoid a duplicate charge or send |
| Provider cannot disambiguate | keep unknown and ask a human; Decide may propose the class |
| Honest wording | an acknowledgement is not physical delivery |

### Recovery

| Scan | Finds | Action |
|---|---|---|
| Runnable | ready Run, or running with an expired lease | claim, bump epoch, execute |
| Timer | wake_at <= now | emit a timer wake |
| Event cursor | undelivered committed Events | redeliver |
| Effect | due pending or failed Effect | retry or reconcile |
| Projection | cursor behind the Event sequence | fold the missing Events |
| Object | old unreferenced upload | delete after a grace period |

At-least-once wake-up is assumed. Exactly-one business result comes from the idempotency
ledger, version checks and one atomic commit.

============================================================
## 6. DEFINITIONS - FLOWS, ACTIONS, BOTS, PROTOCOLS
============================================================

### Action contract

| Field | Purpose |
|---|---|
| id and version | immutable once published |
| input and output schema | validated at the Gateway |
| kind | read or write |
| annotations | readOnly, destructive, idempotent, openWorld |
| required access | role, job, record scope, field policy |
| idempotency | required for every write |

Annotations drive policy automatically: auto-approve readOnly, confirm destructive,
require a decision for openWorld.

### Flow

```yaml
flow: pos.food-order
version: 1
subject: order
start: accept-order
steps:
  accept-order: { action: pos.order.accept@1, next: wait-kitchen }
  wait-kitchen: { waitFor: order.item-ready, match: { subject: "$run.subject" },
                  guard: all-items-ready, action: pos.order.mark-ready@1,
                  next: wait-payment }
  wait-payment: { action: pos.checkout@1, guard: ready-and-paid, next: wait-handover }
  wait-handover: { action: pos.order.hand-over@1, guard: paid-and-ready, next: complete }
```

| Transition field | Purpose |
|---|---|
| from | required step and state |
| trigger | command, Event, time, approval or effect result |
| guard | deterministic condition over permitted current facts |
| action | registered Action version |
| to | next step |
| wait | optional persisted resume condition |
| onFailure | retry, compensate, human review or fail |

Each command Action applies its declared Run transition in the same transaction as its
business changes and Events. A single Action appends an Event; it does not create a
completed Run.

### Bot - a capability package

```text
BOT
  Records it owns or references
  Actions it registers
  Flows it publishes
  Skills (methods the harness may load)
  Views and Inbox rules
  Guidance for setup
```

A Bot is defined portably: an AGENTS.md identity plus SKILL.md methods plus the
registered Action and Flow definitions. Definition is readable data; execution is
infrastructure. Installing a Bot enables capabilities and views; it adds no new runtime.

### Protocols - portable now, mesh later

| Layer | Standard | In TAR |
|---|---|---|
| Tool annotations | readOnly, destructive, idempotent, openWorld | drive approval policy now |
| Tools | MCP over Streamable HTTP | expose Actions as tools when useful |
| Authorization | OAuth 2.1 + PKCE + Resource Indicators | per-Action, short-lived tokens |
| Agent coordination | A2A task lifecycle | only for real cross-company work |
| Discovery | Agent Card at /.well-known/agent.json | when agents need to be found |
| Events | internal publish/subscribe | Queue plus the Event log |

A receiving Bot reads facts or invokes the owning Bot's registered Action. It never
rewrites another Bot's Records directly. Agent meshes are deferred until a genuine
cross-organization need exists [S13].

### Supply chain

| Rule | Reason |
|---|---|
| Bot and Skill packages are signed and versioned | a community registry shipped 1,184 malicious skills |
| Code never receives credentials | loaded code runs in an isolate with bindings only |
| Publish checks every referenced Bot and Action | a Flow cannot cite a missing Action |
| Removal archives definitions | Records, Runs and Events are never destroyed |
| Imported prompt text is data | never execute imported SQL or JavaScript |

============================================================
## 7. TRUST - IDENTITY, ACCESS, TENANCY, BUDGET
============================================================

```text
verified identity
     |
     +--> private identity tenant --> My Agent
     |
     '--> workspace membership --> access + job + record and field policy
```

| Layer | Controls |
|---|---|
| Identity | who is acting |
| Tenant | which private or work database is addressed |
| Access | owner, admin, member, guest |
| Job | cashier, kitchen, stock, or a Bot-defined operating role |
| Record scope | own, team, all |
| Field policy | which fields the UI, harness and tools may receive |
| Assignment | access to one work item, not every source field |
| Budget | per-identity AI spend reservation and ceiling |

| Non-negotiable | Meaning |
|---|---|
| A contact label is not membership | `customer` or `employee` never grants login |
| The UI is not policy | a hidden button secures nothing |
| Revocation is immediate online | later reads, wakes and Actions recheck membership |
| Run authority is not permanent | every resumed transition rechecks permission |
| IDs are tenant-local | never accept a host or tenant id from untrusted input |
| Secrets stay separate | never in a Record, Event or model context |
| Untrusted text is data | an instruction inside content cannot widen authority |
| Prompt injection is structural | output schemas, isolated context, and hooks outside the model |
| Budget exhaustion pauses optional AI | checkout and business operations continue |

============================================================
## 8. OFFLINE AND SYNC
============================================================

```text
OPEN SCREEN -> render local permitted data immediately
                          |
                          v
                GET authorized changes(cursor)
                          |
                 upserts + tombstones
                          |
                local transaction + cursor

OFFLINE EDIT -> local draft -> reconnect -> typed API command
                                              |
                          +-------------------+------------------+
                          |                   |                  |
                       accepted            conflict           denied
```

| Situation | Behavior |
|---|---|
| Read while offline | show cached records and the last-updated time |
| Create order offline | save a draft; no confirmed stock, payment or number claim |
| Reconnect | replay immutable command keys; show the server result |
| Record changed | compare relevant changes; the user resolves the meaningful conflict |
| Permission changed | invalidate the affected cache; fetch the fresh projection |
| Cursor expired | re-bootstrap the permitted dataset |
| Logout or removal | clear local protected data and pending access |

Sync is a small authorized API, never a raw whole-database replica.

| Rule | Reason |
|---|---|
| Bootstrap only permitted rows and fields | a raw sync token would leak prices and customer data |
| Server creates a monotonic change sequence per commit | the cursor is the durable progress |
| Cursor is bound to identity, workspace and permission epoch | a permission change invalidates the old projection |
| Delta includes deletions and visibility removals | never filter only inserts |
| Apply each batch and its cursor atomically | no partial local state |
| Offline revocation cannot recall downloaded facts | minimize cached sensitive fields |
| Polling: kitchen 5s, POS 10s, others 30-60s | pilot defaults, not freshness guarantees |
| Stop background polling; refresh on foreground | cost control |
| Consequential writes are online-only | money, stock, access, approval, publication |

============================================================
## 9. SURFACES AND SCREENS
============================================================

### 9.1 Shell - three tabs, one pinned entry

| Item | Current app | Target prototype |
|---|---|---|
| Tabs | Space, Inbox, Records, Bots | Space, Inbox, Bots |
| Records | its own tab | folded into Space as a saved view |
| Workspace switcher | header chevron and Edit | removed; one surface, no mode switch |
| My Agent | separate screen | pinned first row of Bots |
| Back | in-app close buttons | native back only |

```text
+---------------------------------------------+
| Slice House                                 |
+---------------------------------------------+
|                                             |
|                ( content )                  |
|                                             |
+---------------------------------------------+
|  Space   |   Inbox   |   Bots               |
+---------------------------------------------+
```

### 9.2 Design tokens and primitives

| Token or component | Use |
|---|---|
| tokens.color.ink / inkMuted | text and secondary text |
| tokens.color.borderSoft / surfaceSunk | hairline and sunk surfaces |
| tokens.radius.pill | buttons, chips, avatars |
| tokens.type.heading / bodySm / label | one type scale |
| WorkspaceHeader | title and subtitle, left aligned |
| ContentCard | one card, content only, no decorative chrome |
| PrimaryButton | exactly one per screen |
| SecondaryTextAction | the quiet second action |
| EmptyState, FirstAction | nothing yet, and the one thing to do |
| InlinePrompt | ask one question in place |
| NativeTabs | the three-tab bar |

### 9.3 Screen catalog - complete

| # | Screen | Component or route | Job | Primary action |
|---|---|---|---|---|
| 1 | Boot | TarLogoLoader | load database and identity | - |
| 2 | First run | app/index | create or join a workspace | Create workspace |
| 3 | Sign in | app/auth | establish identity | Continue with Google |
| 4 | Space | (tabs)/canvas | permitted facts, metrics and actions | block defined |
| 5 | Inbox | (tabs)/inbox | work needing a human | the item action |
| 6 | Bots | (tabs)/bots | installed and available capabilities | Install |
| 7 | Records | (tabs)/records | browse by type; folds into Space | Open record |
| 8 | My Agent | pinned Bots row | private work for one identity | Ask |
| 9 | Bot detail | BotDirectory | what a bot owns and does | Install |
| 10 | Bot install | BotBuilder | configure, preview, activate | Activate |
| 11 | Artifact card | PipelineCard | current step plus its legal actions | the step action |
| 12 | Record detail | RecordDetailModal | one record in full | the record action |
| 13 | Entity details | EntityDetailsModal | record plus its links | Edit |
| 14 | Contact | ContactDetailsModal | a person, roles and consent | Contact |
| 15 | Action form | ActionFormInterface | schema-driven input | Submit |
| 16 | Confirmation | ConfirmationInterface | review a consequential action | Confirm |
| 17 | Approval | InboxFeed | one decision bound to one proposal | Approve |
| 18 | POS sale | PosSaleScreen | take an order | Accept order |
| 19 | Stock adjust | StockAdjustScreen | correct a quantity | Save |
| 20 | Task compose | TaskComposeScreen | a new task | Create |
| 21 | Contact compose | ContactComposeScreen | a new person | Save |
| 22 | Item compose | ItemComposeModal | a new line item | Add |
| 23 | Flow view | FlowInterface | a process and its runs | Start |
| 24 | Flow builder | FlowBuilderInterface | author steps | Publish |
| 25 | Run progress | WorkflowFlow | durable progress and the wait | the wait action |
| 26 | Search | ExploreOverlay | find records and actions | Open |
| 27 | Create workspace | CreateWorkspace | name and start | Create |
| 28 | Team roster | TeamRosterModal | members and jobs | Invite |
| 29 | Onboard member | OnboardMemberModal | access and job | Send invite |
| 30 | Offboard member | OffboardMemberModal | revoke and reassign | Remove |
| 31 | Action picker | RegisteredActionPicker | choose a legal action | Run |
| 32 | Mention picker | ContactMentionPicker | link a person | Insert |
| 33 | Settings | app/settings | account and device | - |
| 34 | Plans | components/plans | credits | Buy |
| 35 | Offline | inline banner | local reads, queued intents | Retry now |
| 36 | Denied | inline notice | no permission | - |

### 9.4 Core prototypes

**Space** - permitted facts first, actions in reach

```text
+----------------------------------------------+
| Slice House                                  |
+----------------------------------------------+
| Today                        Tue 19 Sep      |
| Sales   Rs.18,420                +12%        |
| Orders  62                       open 4      |
+----------------------------------------------+
| Kitchen inflow                               |
| 12 orders waiting                            |
+----------------------------------------------+
| Quick actions                                |
| [ New order ] [ New task ] [ Add contact ]   |
+----------------------------------------------+
|  Space   |   Inbox   |   Bots                |
+----------------------------------------------+
```

**Inbox** - every item is a projection that carries its own next action

```text
+---------------------------------------------+
| Slice House                    12 open      |
+---------------------------------------------+
| Refund 88, Priya             due today      |
| approval needed              [ Approve ]    |
+---------------------------------------------+
| Order 1042, kitchen                         |
| all items ready              [ Checkout ]   |
+---------------------------------------------+
| Message from Priya                          |
| needs triage                 [ Triage ]     |
+---------------------------------------------+
|  Space   |   Inbox   |   Bots               |
+---------------------------------------------+
```

**Bots** - chat-list shape: field, avatar initial, name, one line, divider

```text
+---------------------------------------------+
| Slice House                                 |
+---------------------------------------------+
| Search bots                                 |
+---------------------------------------------+
| (M) My Agent                     pinned     |
| your private agent                          |
+---------------------------------------------+
| (P) POS                                     |
| orders, payments, stock                     |
+---------------------------------------------+
| (C) CRM                                     |
| customers, consent, tags                    |
+---------------------------------------------+
| (S) Sales                                   |
| leads, quotes, follow-up                    |
+---------------------------------------------+
| (T) Team                     installed      |
| members, jobs, assignment                   |
+---------------------------------------------+
| + Add a bot                                 |
+---------------------------------------------+
|  Space   |   Inbox   |   Bots               |
+---------------------------------------------+
```

**Artifact card** - one card, it morphs by step, the action sits on the card

```text
STEP 1, waiting kitchen
+---------------------------------------------+
| ORDER 1042                        Takeaway  |
| 2 x Margherita                     pending  |
| 1 x Garlic Bread                   pending  |
| [ Start ]                       [ Start ]   |
+---------------------------------------------+

STEP 2, ready to pay
+---------------------------------------------+
| ORDER 1042                        Takeaway  |
| 2 x Margherita                       ready  |
| 1 x Garlic Bread                     ready  |
| TOTAL                             Rs.651    |
| [              Checkout              ]      |
+---------------------------------------------+

STEP 3, paid, waiting handover
+---------------------------------------------+
| ORDER 1042                        Takeaway  |
| PAID                              Rs.651    |
| [             Hand over             ]       |
+---------------------------------------------+
```

**Record detail** - facts, lines, then the one action

```text
+---------------------------------------------+
| < Order 1042                        Edit    |
+---------------------------------------------+
| Preparation        ready                    |
| Payment            paid                     |
| Fulfilment         waiting handover         |
+---------------------------------------------+
| Items                                       |
| 2 x Margherita      Rs.500         ready    |
| 1 x Garlic Bread    Rs.120         ready    |
+---------------------------------------------+
| Tax                 Rs.31                   |
| TOTAL               Rs.651                  |
+---------------------------------------------+
| [              Hand over             ]      |
+---------------------------------------------+
```

**Action form and confirmation** - schema input, then an explicit review

```text
+---------------------------------------------+
| < Refund                                    |
+---------------------------------------------+
| Order          1042                         |
| Amount         [ Rs. 651           ]        |
| Reason         [ damaged item      v ]      |
+---------------------------------------------+
| This refund is irreversible.                |
| It is recorded against your name.           |
+---------------------------------------------+
| [              Confirm              ]       |
| Cancel                                      |
+---------------------------------------------+
```

**My Agent** - private, ask first, running work below

```text
+---------------------------------------------+
| My Agent                          Private   |
+---------------------------------------------+
| Ask  [ Plan my week, watch a price ... ]    |
+---------------------------------------------+
| Renew insurance        waiting approval     |
| Track laptop price     next check tomorrow  |
+---------------------------------------------+
| Goals | Tasks | Files | Apps | Activity     |
+---------------------------------------------+
|  Space   |   Inbox   |   Bots               |
+---------------------------------------------+
```

**States** - offline, denied and empty are first-class screens

```text
OFFLINE
+---------------------------------------------+
| Offline, showing saved data                 |
| 2 changes waiting            [ Retry now ]  |
+---------------------------------------------+

DENIED
+---------------------------------------------+
| You do not have access to refund            |
| Ask an owner to reassign this task.         |
+---------------------------------------------+

EMPTY
+---------------------------------------------+
| No orders yet                               |
| Take the first order to see it here.        |
| [             New order             ]       |
+---------------------------------------------+
```

### 9.5 Block registry - complete

The Space surface is composed from these blocks. A bot ships a layout; the renderer
places the blocks and never crashes on an unknown type.

| Block | Purpose | Typical bot |
|---|---|---|
| QuickPos | fastest path to a new order | POS |
| StockSheet | stock on hand and adjustment | POS |
| TaskInbox | tasks that need a human | Team |
| InboxFeed | approvals and decisions | any |
| TimelineFeed | one record's history | CRM |
| ExploreFeed | discovery and search | any |
| MetricCard | one permitted metric | any |
| PipelineCard | a step and its actions | POS |
| QuickActions | the common registered actions | any |
| EntityDirectory | a list of records by type | CRM, HR |
| EntityNavigator | move between linked records | any |
| ContentCard | generic content | Site |
| DataTable | tabular records | Finance |
| BookingGrid | time slots | Booking |
| CatalogGrid | product catalogue | POS |
| ContactCard | a person at a glance | CRM |
| ActionConfirm | confirm before commit | any |

### 9.6 Other surfaces

| Surface | Page | Job |
|---|---|---|
| Tarapp | (tabs) canvas, inbox, bots | the product itself |
| Architecture site | architecture-v6 index | visual walkthrough of this document |
| Architecture site | architecture-v6 architecture | intent to commit, end to end |
| Architecture site | architecture-v6 glossary | every term, visually explained |
| Branding site | brandingsite | capabilities, pricing, bot list |
| Device | SQLite replica | offline reads and queued Action intents |

### 9.7 Screen rules

| Rule | Reason |
|---|---|
| One primary action per screen | a general user should not choose between equals |
| One question per setup step | never ask for a business description, industry or modules |
| A card is a projection | visibility is never authorization |
| A card is also the action surface | the common path completes without navigating away |
| Cards morph by step | state, then the single action for that state |
| Actions come from the manifest | the UI never invents an action |
| No sparkle, gradient or mascot | a calm operational tool, not a chatbot |
| Native back, no in-app close | the hardware back already closes the screen |
| Title left aligned | the title is the first element of the header row |
| Autocomplete over typing | the user is general population, not a technical operator |
| Policy-hidden fields are absent | not greyed out, simply not sent |

### 9.8 Every screen shares these states

| State | Visible behavior | Next action |
|---|---|---|
| Empty | explain purpose with one starter action | Create or install |
| Loading | keep valid cached content with a freshness label | Wait or refresh |
| Offline | cached read plus a draft badge | Save draft or reconnect |
| Pending | accepted intent not yet confirmed | Check status |
| Conflict | preserve the draft and explain changed facts | Review |
| Denied | explain the unavailable action without revealing hidden data | Request access |
| Failed | a specific recoverable reason | Retry or resolve |
| Approval required | show the exact proposed effect | Review |
| AI unavailable or budget paused | keep manual controls usable | Continue manually |

### 9.9 Complete launch journeys

```text
OWNER   = sign in -> create -> enable Bots -> configure access -> Space
CASHIER = Space -> POS -> accept order -> checkout -> handover
KITCHEN = Space -> kitchen -> preparing -> ready
SALES   = enquiry -> lead -> draft quote -> review/send -> follow-up
TEAM    = invite -> role -> assignment -> completion
AUTO    = template -> preview -> activate -> work detail -> result
ISSUE   = Inbox -> evidence -> approve / resolve / retry -> record
OFFLINE = cached screen -> draft -> reconnect -> accepted / conflict
```

============================================================
## 10. COST - THE RS.100 ENVELOPE
============================================================

techstack.md owns the full model. This section states the discipline. Planning rate:
Rs.95 = $1. Standard user: 1,500 model calls per seat per month [S1][S2][S3].

| Line | Calls | Basis | Rs./seat/mo |
|---|---|---|---|
| WRITE (Gemma-4, short) | 1,200 | 1,000 in / 150 out | ~0.14 |
| WRITE (DeepSeek, medium) | 270 | 3,000 in / 500 out | ~0.65 |
| WRITE (DeepSeek, long) | 30 | 8,000 in / 1,500 out | ~0.19 |
| Cache (60% DeepSeek input hits) | - | billed at the cached rate | -0.30 |
| **Model total, no Decide** | **1,500** | | **~16.9** |
| DECIDE (optional, winning routes only) | 300 | adds cost unless it replaces calls | +1.3 |

| Discipline | Reason |
|---|---|
| No model call for a button, arithmetic, stock, authorization | deterministic work is free |
| Short, relevant context; SQL aggregates over raw dumps | context is the bill |
| Stable instructions first, changing facts last | enables prefix caching |
| One useful structured result per call | avoid a second explain-the-JSON call |
| Cache prefixes and reuse reported hits | the largest dependable saving |
| Decide only on measured winning routes | v8's break-even, not a universal saving |

```text
fixed cost warning
  at 100 seats: Workers base + Turso + AI ~= Rs.28/seat/mo, inside Rs.100
  at 10 seats:  the same fixed lines become ~Rs.110/seat before AI
  seat count is essential to the envelope
```

| Enforcement | |
|---|---|
| One atomic budget reservation per paid identity | workspace ceilings are additional |
| Reserve worst permitted spend before a model call | reconcile actual token usage after |
| Track uncached input, cached input, output and reasoning | cost per completed task |
| Budget exhaustion pauses optional AI | checkout and paid business operations continue |

============================================================
## 11. BUILD ORDER, INVARIANTS, PROOFS
============================================================

### Build order

| Stage | Deliver | Must prove |
|---|---|---|
| 1 | Turso authority, typed operations, local projections | permissions, transactions, replay, sync |
| 2 | POS, kitchen, checkout, stock | concurrent orders, verified payment |
| 3 | Sales, Team, contacts, Inbox | field access, exact approvals |
| 4 | Template automations, recovery | retry, lost dispatch, cancellation |
| 5 | Gemma and DeepSeek actions | endpoint compatibility, quality, spend caps |
| 6 | Optional Decide evaluation | lower cost per correct completed task |
| Later | Private My Agent, broader Bots, Site | isolation and explicit external authority |

### Invariants

| Area | Invariant |
|---|---|
| Records | one accepted version wins each concurrent transition |
| Events | every accepted change has an Event in the same transaction |
| Runs | every accepted transition advances one version or returns replay |
| Decisions | a saved decision is replayed, never recomputed |
| Wakes | duplicate or lost wake-ups cannot duplicate a business result |
| Waits | time, Event, human and effect waits survive restart and deploy |
| Permission | every resumed Action uses current identity and membership |
| Models | a model decision alone never becomes shared truth |
| Effects | every external act has an Effect, a stable key and a result |
| Bots | cross-Bot change calls the owning Bot's registered Action |
| Tenancy | private and work data never cross without an authorized projection |
| Offline | reconnect revalidates authority and versions |
| Budget | a model call is reserved, measured and reconciled |

### Acceptance checks

| Proof | Expected |
|---|---|
| Two workers resume one Run | one transition wins |
| Same command delivered twice | one result and one set of changes |
| Same key, changed input | conflict, no mutation |
| Successful checkout retried after paid | the saved result is returned |
| Stale worker commits after a reclaim | fencing rejects it |
| Event lands just before wait registration | fact check or retained scan still advances |
| Consumer crashes before progress | changes and marker both roll back |
| Permission revoked during a wait | resumed Action is denied or reassigned |
| Flow changes mid-Run | the Run keeps its pinned version |
| Provider times out after success | reconciliation prevents a duplicate effect |
| Event payload carries an instruction | treated as data; authority unchanged |
| Decide returns low confidence | escalates to Write or a human |
| Decide service is down | the Write fallback runs; nothing is bypassed |
| Workspace owner opens a member My Agent | denied |
| Two orders reserve the last unit | one reservation succeeds |
| Membership revoked between proposal and execution | the resumed Action is denied |
| No customer fields in the kitchen API, local DB or change feed | field policy holds |
| AI budget exhausted | manual business operations continue |

### Migration - reuse first, replace carefully

```text
inventory current schema and pending work
  -> export and backup
  -> pilot workspace migration
  -> reconcile records and permissions
  -> enable new sync and operations
  -> monitor
```

| Rule | Reason |
|---|---|
| Keep one authoritative writer per workspace | no casual dual writes |
| Preserve idempotency identities, financial evidence, pending work | nothing silently lost |
| Rollback reconciles new accepted writes | not a naive restore to stale data |
| Move membership authority explicitly | avoid contradictory D1 and Turso permissions |

============================================================
## 12. FOOD ORDER - END TO END
============================================================

| Member | Access | Job | Main Actions |
|---|---|---|---|
| Muthu | Owner | general | configure, approve, refund, review |
| Malar | Admin | cashier | accept order, checkout, close register |
| Iniya | Member | cashier | save order, checkout |
| Velan | Member | kitchen | start item, mark ready |

```text
customer message (WhatsApp)
      |
      v
ROUTER: DECIDE CHOICE [new-order, complaint, status, other]   <- typed, no LLM
      |
      +-- not new-order --> own flow (complaint, status)
      |
      v
WRITE: System Two extracts items from free text  <- options cannot be enumerated
      |
      v
HUMAN: cashier confirms the draft order
      |
      v
GATEWAY: pos.order.accept  ->  Order + items + reservations + Run + Events (atomic)
      |
      v
RUN wait-kitchen  ->  kitchen Inbox  ->  Velan marks items ready (CODE)
      |
      v
GATEWAY: pos.order.mark-ready  ->  order.ready  ->  Run wait-payment
      |
      v
GATEWAY: pos.checkout  ->  payment, stock consumption, receipt Effect  (atomic)
      |
      v
RUN wait-handover (the receipt delivers independently)
      |
      v
GATEWAY: pos.order.hand-over  ->  order.fulfilled  ->  Run completed
```

| # | Trigger | Executor | Action | Run | Event | Effect |
|---|---|---|---|---|---|---|
| 1 | Message arrives | DECIDE | triage | none | message.classified | none |
| 2 | Is a new order | WRITE | draft extract | none | none | none |
| 3 | Cashier confirms | HUMAN | pos.order.accept | waiting / wait-kitchen | order.accepted, stock.reserved | none |
| 4 | Velan taps ready | CODE | pos.order.item.update | unchanged | order.item-ready | none |
| 5 | Last item ready | CODE | pos.order.mark-ready | waiting / wait-payment | order.ready | cashier alert |
| 6 | Cashier checks out | HUMAN | pos.checkout | waiting / wait-handover | payment.confirmed, stock.consumed | receipt |
| 7 | Cashier hands over | HUMAN | pos.order.hand-over | completed | order.fulfilled | none |
| 8 | Provider confirms | CODE | effect result | unchanged | receipt.delivered | done |

Decide is used exactly twice: to triage the message and to classify an ambiguous provider
outcome. Extraction stays with Write because the answer set cannot be enumerated. Payment
and handover stay with a human. That split is the whole design in one example.

### Failure cases

```text
crash before commit         -> rollback, nothing changed
crash after commit, no wake -> recovery scan redelivers the same Event id
duplicate checkout          -> one winner; the retry returns the saved result
receipt provider timeout    -> Effect stays unknown; Decide proposes the class;
                               a human settles anything inconclusive
stock race on the last unit -> one reservation wins by conditional update
AI budget exhausted         -> POS and checkout keep working; drafting pauses
```

============================================================
## 13. ONE-SCREEN SUMMARY
============================================================

```text
INTENT
  person | channel | schedule | webhook
     |
     v
ROUTER          cache -> Decide -> Write -> Human   (confidence + cost gates)
     |
     v
HARNESS         context - tools - sandbox - hooks - limits
     |
     v
GATEWAY         authenticate - authorize - validate - replay - versions
     |
     v
COMMIT          records + events + checkpoint + effect   (atomic)
     |
     +--> log ------> wake Runs, Inbox, metrics
     |
     '--> effects --> provider -> result Event -> resume

Records        = current truth        (one typed table)
Events         = accepted history and wake-ups   (one append-only log)
Runs           = durable progress     (states, lease fencing, waits)
Flows          = versioned process rules
Actions        = the only way in or out
Effects        = the outside world, with reconciliation
Bots           = portable capability packages
Decide         = typed judgment, cheap, fast, confidence-gated, cost-gated
Write          = prose and code only
My Agent       = private system Bot
```
