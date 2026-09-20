# TAR v7 - Decision-First Business OS

> Code owns the flow. System One decides. System Two writes. One gateway commits.

```text
INTENT                                                  SURFACES
person | channel | schedule | webhook      Space | Inbox | My Agent
        |                                                  ^
        v                                                  |
+-----------------------------------------------------------+
| ROUTER    cache -> Decide -> Write -> Human               |
+-----------------------------------------------------------+
        |
        v
+-----------------------------------------------------------+
| HARNESS   context | decide | run(code) | sandbox | hooks  |
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
        '--> effects --> provider -----> result event
```

**Architecture type:** one commit path over one typed fact store, typed decisions on
the hot path, durable Runs for work spanning time, people or systems.

**Claim:** a business OS does not need an LLM in its hot path. Most "AI" steps in
business software are decisions (route, classify, extract-a-choice, gate, score), not
writing. Decisions are now a separate, cheaper, faster model class. Splitting Decide
from Write is the single largest efficiency change available to TAR.

**Status:** target architecture. Rules and guarantees below are requirements.

============================================================
## 0. DESIGN BASIS - WHAT THE 2026 STACK MAKES POSSIBLE
============================================================

Every choice in this document traces to a shipped capability, not to fashion.

| Concept | What it gives | Lands as | Source |
|---|---|---|---|
| System One models (Jev) | typed probabilistic decisions, no text, 70-500ms, output free | executor DECIDE | [typesafe.ai](https://typesafe.ai/blog/introducing-system-one-models-and-jev) |
| Choice / Score / Noul | three question types, all in one parallel call | decide contract | [docs.typesafe.ai](https://docs.typesafe.ai/introduction) |
| Confidence-gated routing | confidence as a second decision axis | Router gate | [patterns](https://docs.typesafe.ai/patterns) |
| Model Router pattern | cascade, classifier, bandit, kNN; cost-quality-latency scoring | Router | [appscale](https://appscale.blog/en/blog/ai-service-pattern-model-router-cost-quality-latency-aware-routing-2026) |
| Agent harness layers | context, tools, sandbox, durability, memory, hooks, observability | Harness | [turion](https://turion.ai/blog/agent-harness-production-infrastructure-2026/) |
| Code Mode | one typed API + code execution instead of N tool schemas | tool surface | [cloudflare](https://blog.cloudflare.com/code-mode/) |
| Durable execution | journal and replay; never restart a 40-step run from step 1 | Run checkpoint | [agentmarketcap](https://agentmarketcap.ai/blog/2026/04/10/durable-agent-execution-production-temporal-modal-event-sourced) |
| Event-driven agents | events as system of record; publish/subscribe wake | Event log | [turion](https://turion.ai/blog/event-driven-agent-architecture-2026/) |
| MCP + A2A | tool layer and agent-coordination layer, both Linux Foundation | Bot capability | [zylos](https://zylos.ai/research/2026-03-26-agent-interoperability-protocols-mcp-a2a-acp-convergence/) |
| Brain/Hands isolation | sandbox has no credentials, no network | isolate sandbox | [dev.to](https://dev.to/hieu_tran_80c388add84c060/the-agent-stack-in-2026-layers-harnesses-and-where-you-actually-build-2e5g) |
| Portable agent definition | AGENTS.md identity + SKILL.md methods | Bot package | [dev.to](https://dev.to/hieu_tran_80c388add84c060/the-agent-stack-in-2026-layers-harnesses-and-where-you-actually-build-2e5g) |
| Measured decision cost | $0.0000144 per real decision against $0.0004 vendor figure | cost model | [jev-agent](https://jev-agent.com/pricing) |

### Honest limits of the decision model

Adopt Decide with open eyes. These are properties of the class, not fixable by prompting.

| Limit | Consequence for TAR |
|---|---|
| Writes no text, no code, no summary | Write still needs System Two; most installs run both |
| Options are fixed per request | Open-ended extraction cannot use Decide |
| Text input only | Images, audio, screenshots need a model in front |
| 64k context, and accuracy falls before the limit | Chunk or retrieve first; irrelevant state is a distractor |
| Closed weights, no VPC, no self-host | Data-residency work cannot use it |
| Below the top frontier on accuracy; vendor scores agreement, not truth | Treat as a signal generator queried broadly, not an oracle queried once |
| Confidence thresholds are earned, not copied | Every threshold is measured on labelled data |
| Launch pricing is not a contract | Model unit economics with headroom |
| Two vendors, two outages | An LLM-only fallback must exist and be exercised |

============================================================
## 1. PRIMITIVES - FEWEST POSSIBLE
============================================================

Seven names, three storage shapes, one commit path.

| Primitive | One line | Absorbs |
|---|---|---|
| Record | current truth: typed, versioned, one row per fact | orders, contacts, tasks, definitions, runs, effects |
| Event | append-only accepted fact; wakes work; audit | audit log, timeline, queue message |
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

Why this is efficient: one version scheme, one policy path, one projection engine,
one sync surface. Adding a business object is data, not schema or code.

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
  update the Effect when present
  save the Action result
COMMIT  - all or nothing
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

Protected lifecycles - money, stock, access, publication - never accept a generic
Record write. A successful retry of a completed command returns the saved result.

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

### Decide contract

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

### Router - cheapest first

```text
                 +--> cache hit?  -----------------> reuse
intent ----------+
                 +--> DECIDE confident? ----------> act
                 +--> DECIDE unsure? -------------> WRITE
                 +--> WRITE unsure? --------------> HUMAN
                 '--> consequential + no rule? ---> HUMAN
```

| Layer | Policy |
|---|---|
| Semantic cache | a repeated decision reuses the stored answer with a TTL |
| Decide | the default for classify, route, extract-a-choice, gate, score, rank |
| Write | only when text or code must be produced |
| Human | money, access, publication, and any unresolved ambiguity |
| Fallback | a DECIDE outage routes to WRITE, never to a bypass |

Where Decide genuinely earns its place in TAR:

| Use | Question type | Replaces |
|---|---|---|
| Inbound message triage | CHOICE over intents | an LLM classify call |
| Bot and flow routing | CHOICE over handlers | an LLM router call |
| Urgency and priority | NOUL, or SCORE over levels | an LLM tag call |
| Outbound guardrail before an Effect | NOUL: does this match the approved intent? | a human spot check |
| Provider-timeout reconciliation | CHOICE: delivered, absent, inconclusive | blind retry |
| Rank candidates (search, Inbox order) | SCORE per candidate | an LLM rank call |

============================================================
## 4. HARNESS - ONE BOUNDED TURN
============================================================

```text
+-----------------------------------------------------------+
| HARNESS - one bounded turn                                |
| wake       command, event, timer, approval, effect result |
| context    permitted Records + Run checkpoint + Skill     |
| decide     System One, System Two, or a human             |
| tools      ONE tool: run(code) over a typed Action API    |
| sandbox    isolate, no network, no keys, bindings only    |
| hooks      pre and post policy, outside the model control |
| output     result or a schema-checked Action proposal     |
| limits     steps, turns, time, cost, retries, cycle stop  |
+-----------------------------------------------------------+
```

### Code Mode tool surface

Do not expose N tool schemas to a model. Generate one typed API from the tenant's
permitted Actions and read projections, and give the model one tool that runs code.

```text
definitions (Action registry + read projections)
        |
        v
generated typed API  (doc comments from the Action schema)
        |
        v
model writes one short script
        |
        v
isolate sandbox  ->  binding calls  ->  Gateway
        |
        v
only the final result returns to context
```

| Rule | Reason |
|---|---|
| One code tool, not N tool schemas | models are far better at writing code than at tool calls |
| Multi-step work inside the sandbox | tool results never round-trip through the model |
| Sandbox has no network | the only reachable surface is the granted bindings |
| Sandbox has no keys | bindings carry authorization; the model cannot leak a secret |
| Read binding | returns a permitted projection |
| Action binding | returns a proposal that the Gateway may accept or reject |
| Generated surface | derived from published definitions, so it cannot drift |
| Untrusted content is data | a prompt, file, Event or tool result cannot widen authority |

### Hooks are policy, not suggestions

Pre-tool and post-tool checks run in code, outside the model's control. The model
cannot skip, edit or argue past them. TAR's Gateway and Effect worker are the
enforcement surface; the harness merely reports to them.

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

At-least-once wake-up is assumed. Exactly-one business result comes from the
idempotency ledger, version checks and one atomic commit.

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

Annotations come from the tool-annotation convention and drive policy automatically:
auto-approve readOnly, confirm destructive, require a decision for openWorld.

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

Each command Action applies its declared Run transition in the same transaction as
its business changes and Events. A single Action appends an Event; it does not
create a completed Run.

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

A Bot is defined portably: an `AGENTS.md` identity plus `SKILL.md` methods plus the
registered Action and Flow definitions. Definition is readable data; execution is
infrastructure. Portability keeps the Bot independent of the runtime underneath.

### Protocols - do not invent

| Layer | Standard | In TAR |
|---|---|---|
| Tools | MCP over Streamable HTTP | every Bot Action is an MCP tool |
| Authorization | OAuth 2.1 + PKCE + Resource Indicators | per-Action, short-lived, scoped tokens |
| Agent coordination | A2A task lifecycle | cross-Bot and cross-company work |
| Discovery | Agent Card at /.well-known/agent.json | how a Bot is found and trusted |
| Events | internal publish/subscribe | Queues plus the Event log |

A receiving Bot reads facts or invokes the owning Bot's registered Action. It never
rewrites another Bot's Records directly. Adding a platform is one registry entry,
not a new engine.

### Supply chain

| Rule | Reason |
|---|---|
| Bot and Skill packages are signed and versioned | a community registry shipped 1,184 malicious skills |
| Code never receives credentials | loaded code runs in an isolate with bindings only |
| Publish checks every referenced Bot and Action | a Flow cannot cite a missing Action |
| Removal archives definitions | Records, Runs and Events are never destroyed |
| Imported prompt text is data | never execute imported SQL or JavaScript |

============================================================
## 7. TRUST - IDENTITY, ACCESS, TENANCY, SECRETS
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

============================================================
## 8. SURFACES AND SYNC - SPACE, INBOX, MY AGENT
============================================================

```text
+-----------------------------------------------------------+
| Slice House                        Space | INBOX | Bots   |
+-----------------------------------------------------------+
| INBOX                                                     |
| Order 1042        Kitchen    waiting        [ Mark ready ]|
| Message from Priya  needs triage            [ Triage ]    |
| Refund 88         approval   due today      [ Approve ]   |
+-----------------------------------------------------------+
```

| Surface | One job | Rule |
|---|---|---|
| Space | permitted facts, metrics and common Actions | cards are projections, never authorization |
| Inbox | work needing a human: waits, approvals, failures, messages | a card carries its legal next Actions on the same surface |
| My Agent | plan and perform private or permitted work for one identity | private tenant; a workspace owner cannot enter it |
| Bots | install and configure capabilities | one list, one entry point |

| Rule | Reason |
|---|---|
| One canonical name per concept | no synonyms for the same thing |
| A Task Record exists only when work needs assignee, due date, claim or approval | an Inbox item is otherwise a projection |
| Every Action shown is server-authorized | the UI never invents an Action |
| Actions derive from the step manifest | one tap is one typed Action through the Gateway |
| No workspace switcher | My Agent is a pinned entry, not a mode |

### Storage and sync

```text
+-----------------------------------------------------------+
| D1 CONTROL   identity, membership, tenant routing         |
|              connectors, control command ledger           |
+-----------------------------------------------------------+
| TURSO        one database per workspace                   |
|              records, events, action_results, projections |
+-----------------------------------------------------------+
| R2           blobs, releases, large results               |
+-----------------------------------------------------------+
                          |
                  replica and delta
                          v
+-----------------------------------------------------------+
| DEVICE SQLITE   reads, drafts, pending Action intents     |
+-----------------------------------------------------------+
```

| Rule | Reason |
|---|---|
| Reads are local | the cloud is never in the read path |
| Sync deltas only | sync bytes are the top recurring cost |
| Blobs never sync | store the R2 key, not the file |
| Writes are typed Action intents | revalidated at the Gateway on reconnect |
| Consequential writes are online-only | money, stock, access, approval, publication |
| Revocation clears cache | data already on a disconnected device cannot be recalled |

============================================================
## 9. COST - THE RS.100 ENVELOPE
============================================================

techstack.md owns the full model. This section states the efficiency claim of the
new design. Assumed rate: Rs.95 = $1.

Standard user: 1,500 model calls per month.

| Line | Calls | Basis | Rs./user/mo |
|---|---|---|---|
| DECIDE | 1,200 | ~500 tokens x $0.042/M, output free | 2.39 |
| Cache hits | -30% of Decide | repeated decisions reused | -0.72 |
| WRITE | 300 | mixed System Two profile | 7.86 |
| **Model total** | **1,500** | **vs Rs.39.27 with one model class** | **9.53** |

```text
Same call volume, split by executor: the model line falls from 39.27 to 9.53.
Whole stack: about Rs.41 -> about Rs.12 per user per month, inside the Rs.100 ceiling.
Headroom rises from 59% to about 88%. Margin floor of Rs.400 is exceeded.
```

| Caveat | Handling |
|---|---|
| Decide pricing is a launch price | model with headroom; keep the WRITE path priced independently |
| Vendor speed and cost multipliers are best-case | the 5x saving used here is the conservative quartile from launch reports |
| Every decision still costs | run cache and confidence gates before any model call |
| Context is the bill | never send the long window in the interactive path |

============================================================
## 10. INVARIANTS AND PROOFS
============================================================

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

| Proof | Expected |
|---|---|
| Two workers resume one Run | one transition wins |
| Same command delivered twice | one result and one set of changes |
| Same key, changed input | conflict, no mutation |
| Successful checkout retried after paid | authorized caller gets the saved result |
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

============================================================
## 11. FOOD ORDER - END TO END
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
ROUTER: Decide CHOICE [new-order, complaint, status, other]   <- typed, no LLM
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

Decide in this flow is used exactly twice: to triage the message and to classify an
ambiguous provider outcome. Extraction stays with System Two because the answer set
cannot be enumerated. Payment and handover stay with a human. That split is the
whole design in one example.

### Failure cases

```text
crash before commit         -> rollback, nothing changed
crash after commit, no wake -> recovery scan redelivers the same Event id
duplicate checkout          -> one winner; the retry returns the saved result
receipt provider timeout    -> Effect stays unknown; Decide proposes the class;
                               a human settles anything inconclusive
stock race on the last unit -> one reservation wins by conditional update
```

============================================================
## 12. SCREENS - TARAPP AND OTHER SURFACES
============================================================

Prototype of every surface. The tab set, design tokens and blocks below are the ones
the shipped app already uses.

### 12.1 Shell - three tabs, one pinned entry

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

### 12.2 Design tokens and primitives

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

### 12.3 Screen catalog - complete

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

### 12.4 Core prototypes

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

### 12.5 Block registry - complete

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

### 12.6 Other surfaces

| Surface | Page | Job |
|---|---|---|
| Tarapp | (tabs) canvas, inbox, bots | the product itself |
| Architecture site | architecture-v6 index | visual walkthrough of this document |
| Architecture site | architecture-v6 architecture | intent to commit, end to end |
| Architecture site | architecture-v6 glossary | every term, visually explained |
| Branding site | brandingsite | capabilities, pricing, bot list |
| Device | SQLite replica | offline reads and queued Action intents |

### 12.7 Screen rules

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

============================================================
## 13. ONE-SCREEN SUMMARY
============================================================

```text
INTENT
  person | channel | schedule | webhook
     |
     v
ROUTER          cache -> Decide -> Write -> Human
     |
     v
HARNESS         context - decide - run(code) - sandbox - hooks - limits
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
Runs           = durable progress
Flows          = versioned process rules
Actions        = the only way in or out
Effects        = the outside world, with reconciliation
Bots           = portable capability packages (MCP + A2A)
Decide         = typed judgment, cheap, fast, confidence-gated
Write          = prose and code only
My Agent       = private system Bot
```
