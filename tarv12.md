# TAR v12 = Architecture handbook

> One core. One action boundary. Shared judgments. Full commerce cycle.

| Document | Meaning |
| --- | --- |
| Status | Chosen target architecture, reviewed 2026-09-24. It is not a claim that every part is built. |
| Scope | App, worker, data, Action Gateway, Jev, Bots, Flows, sites, POS, channels, memory, economics, delivery. |
| Authority | This is TAR's sole consolidated architecture target. Older architecture files and techstack.md are historical inputs. |
| Proof | Code and tests establish implementation; measured outcomes establish accuracy, capacity and economics. |
| Naming | New internal tables, columns and identifiers use one semantic lowercase word. Qualify through structure, such as tasks.owner. Keep existing external spellings behind adapters until migrated. |

| Read for | Sections |
| --- | --- |
| System and implementation status | 0 to 2 |
| Gateway, Jev, reuse and money | 3 to 6 |
| Bots, Flows and communication | 7 to 9 |
| Screens and domain paths | 10 to 14 |
| Proof, build order and risks | 15 to 16 |

## 0 = Read this first

### 0.1 = The system in one diagram

~~~text
+--------------------------------------------------------------+
| TAR APP = Expo / React Native                                |
|--------------------------------------------------------------|
| Space | Inbox | Bots | POS | Site Studio | forms | chat      |
| SQLite = permitted projections + drafts + offline queue      |
+--------------------------------------------------------------+
                               |
                               | authenticated request / sync
                               v
+--------------------------------------------------------------+
| CLOUDFLARE WORKER                                            |
|--------------------------------------------------------------|
| Ingress -> identity + tenant -> Action Gateway               |
|              |                                               |
|              +-> Judgment = Jev + assessments                |
|              +-> Flow runner = durable steps + waits         |
|              +-> Direct action = authorized read or commit   |
|              +-> Provider = outbox + reconciliation          |
|              +-> Turso truth | D1 control | R2 assets        |
+--------------------------------------------------------------+

CATALOG = one versioned list of TAR-callable capabilities.
BOT     = installed, versioned grants + guidance + channels + Flows.
FLOW    = compiled, published sequence of catalog actions.
JEV     = typed judgments; CODE owns rules, authority and effects.
LLM     = optional draft of new prose, code or novel composition.
~~~

### 0.2 = What exists, what is planned

| Area | Built or present in repository | Target or unproven |
| --- | --- | --- |
| Worker | Cloudflare Worker; D1 identity and membership; Turso workspace schema; R2 patterns; gateway action path. | Full cross-domain coverage, durable effect reconciliation and load proof. |
| Actions | 29 registered action IDs across the [shared catalog](tarharness/src/registry/catalog.ts) and [POS catalog](tarharness/src/pos/catalog.ts). | Versioned schemas and contracts for reads, external tools, human waits and AI steps. |
| Gateway | Registered action lookup, eligibility and typed-command replay in [gateway actions](tarharness/src/gateway/actions.ts). | Actor-scoped replay before paid interpretation; unified effect and trace contracts. |
| Flows | flow.publish stores an ordered action list; flow.start creates a Run at its first action. | Durable runner that advances the whole list, waits, resumes and reconciles effects; branching later. |
| Bots | Bot/directory definitions and installation path. | Immutable published versions, grants review, Jev/LLM-assisted designer and management lifecycle. |
| App | Expo app, POS and site paths, [app AI helpers](tarapp/src/lib/ai.ts). | Fully proven offline sync, shared concept screens and expanded domains. |
| Jev | No TypeSafe/Jev integration found in inspected tarharness/src. | Server adapter, reviewed question assets, assessments, reuse, evaluation and route gates. |
| Domains | POS and site paths plus template examples. | Complete Sales, CRM, Services, Support, Purchasing, Finance and messaging action packages. |
| Economics | Planning scenarios in this handbook. | Measured provider spend, capacity, conversion, corrections and full margin. |

### 0.3 = Rules that govern every chapter

| Rule | Operational meaning |
| --- | --- |
| Meaning = bounded judgment | Jev chooses or scores within supplied, authorized evidence. |
| Truth = authoritative record | Models never establish a payment, stock level, balance, permission or completed provider effect. |
| Authority = gateway | Every accepted mutation and consequential effect passes current policy and validation. |
| Structured input = zero inference | A valid button or typed form does not need Jev. |
| Reuse = dependencies | A completed assessment may serve several surfaces until evidence or question meaning changes. |
| Cost = complete outcome | Compare cost and latency per correctly completed workflow, including providers and human correction. |
| Proposal is not approval | A Bot, Flow, model answer or saved draft cannot expand a grant or preapprove a future effect. |

## 1 = Product and domain model

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   Sites      CRM     Sales   Commerce  Products   Support   Campaigns
   Content  Contacts  Quotes  Payments  Services   Returns   Renewals
                               |
                   Team + Stock + Purchasing + Finance + Reporting
~~~

| Package | Records and work | Shared core it uses |
| --- | --- | --- |
| Sites | Pages, content, forms, enquiries, checkout, releases. | Gateway, catalog, assessments, outbox. |
| CRM | People, companies, relationships, consent, timeline. | Identity, evidence, memory, search. |
| Sales | Leads, opportunities, quotes, follow-up, conversion. | Catalog, assessments, Flows, channels. |
| Products | Catalog, variants, stock, purchasing, reservations. | Domain rules, live commit checks. |
| Services | Offerings, resources, availability, bookings, completion. | Calendar code, gateway, Flows. |
| Commerce | Orders, invoices, payments, fulfilment, subscriptions, refunds. | Transactional records and effect receipts. |
| Support | Tickets, conversations, priorities, returns, resolution. | Inbox, retrieval, reply checks. |
| Operations | Suppliers, purchases, receiving, shipping, team, approvals. | Tasks, waits, outbox. |
| Finance | Postings, balances, reconciliation, reporting, exports. | Exact arithmetic and trace. |

**Domain package = records + business rules + catalog actions + candidate retrieval + Jev rubrics + recipes + views + tests.** A domain does not get a second gateway, model router, authority source or agent runtime.

| Workflow | Bounded judgment | Code and evidence | Outcome to measure |
| --- | --- | --- | --- |
| CRM capture and duplicates | Select source roles; relate plausible pairs. | Exact identifiers, source versions and review before merge. | Field precision and false merges. |
| Sales and quotes | Score need/timing/fit; select offering. | Consent, pricing, stock and quote arithmetic. | Accepted leads, quote correction and conversion. |
| Catalog and POS | Select product/modifier; rank allowed substitutes. | Compatibility, quantities, tax and current stock. | Whole-cart correctness and counter time. |
| Services and operations | Match job/resource; interpret supplier terms. | Calendar, capacity, purchasing and receiving rules. | Booking correction and shortage resolution. |
| Commerce and finance | Select amount roles or ambiguous matches. | Provider receipts, ledger arithmetic and approval. | Reconciliation errors and review time. |
| Support and retention | Classify issue/reason; select cited evidence. | Policy eligibility, exact claim checks and channel consent. | Resolution, unsupported claims and unwanted follow-up. |
| Sites and campaigns | Select approved variant/content for a permitted segment. | Publication, consent, experiment assignment. | Conversion lift, accessibility and unsubscribe rate. |
| Reporting and knowledge | Select supporting blocks and open-text categories. | SQL totals, source links and scenario labels. | Useful evidence recall and false causal claims. |

Investigation = code detects a measured signal -> domain rules test reviewed causes against data -> Jev may judge cause/action fit among eligible candidates -> code labels scenarios and commits only an authorized action. Start with ordinary records and relationships; add graph or predictive infrastructure only after measured need.

## 2 = Platform, data and offline boundary

| Layer | Choice | Boundary |
| --- | --- | --- |
| Phone | Expo / React Native + SQLite. | Permitted projections, recent reads, forms, drafts, offline queue. |
| API | Cloudflare Worker. | Identity, action gateway, Jev adapter, runner and channel ingress. |
| Control | D1. | Identity, membership, reservations and control-plane state. |
| Workspace | One Turso database per workspace. | Business records, definitions, runs, events and command log. |
| Objects | R2. | Files and immutable site assets; records store references and hashes. |
| Async | Durable intent + outbox + bounded queue/schedule recovery. | Provider result is reconciled before a non-idempotent retry. |
| Optional compute | Browser or isolated service only when a measured workflow needs it. | No permanent extra runtime chosen by this handbook. |

### 2.1 = Turso schema: physical state today

Source of truth for deployed workspace DDL = `tarharness/src/db/schema.ts`. Each workspace has its own Turso database. D1 holds `users`, `workspaces` and `members`; those are control-plane tables, not Turso workspace tables. The arrows below are application references, not declared SQL foreign keys.

~~~text
 D1 control plane                          Turso: one database / workspace
 +----------------------+                  +-------------------------------+
 | users | workspaces   | -- DB locator -->| definitions                   |
 | members              |                  | records                       |
 +----------------------+                  | runs -> definitions, records  |
                                           | events -> runs, records       |
                                           +-------------------------------+
                                                        |
                                                        v
                                           R2 object references and hashes
~~~

| Current table | Exact columns (SQL spelling) | Key and enforced rule | Role |
| --- | --- | --- | --- |
| `definitions` | `id TEXT`, `kind TEXT`, `name TEXT`, `version INTEGER`, `state TEXT`, `data TEXT`, `created_at INTEGER`, `updated_at INTEGER` | `id` primary; `kind` in `flow`, `record_type`, `bot`, `kit`; `data` valid JSON; required fields `NOT NULL`. | Versioned Flow, record type, Bot and kit definitions. |
| `records` | `id TEXT`, `type TEXT`, `title TEXT`, `state TEXT`, `data TEXT`, `owner TEXT`, `assignee TEXT`, `due INTEGER`, `version INTEGER`, `created INTEGER`, `updated INTEGER`, `archived INTEGER` | `id` primary; `data` valid JSON; identity/type/title/state/version/timestamps required. | Shared business records and typed domain data. |
| `runs` | `id TEXT`, `flow_id TEXT`, `flow_version INTEGER`, `occurrence TEXT`, `record_id TEXT`, `state TEXT`, `action_id TEXT`, `context TEXT`, `version INTEGER`, `started_at INTEGER`, `finished_at INTEGER`, `created_at INTEGER`, `updated_at INTEGER` | `id` primary; unique (`flow_id`, `occurrence`); `context` valid JSON; required flow, occurrence, state, version and timestamps. | Existing Flow run state and replay identity. |
| `events` | `id TEXT`, `kind TEXT`, `run_id TEXT`, `record_id TEXT`, `action_id TEXT`, `state TEXT`, `actor_id TEXT`, `input_hash TEXT`, `idempotency_key TEXT`, `data TEXT`, `created_at INTEGER`, `updated_at INTEGER` | `id` primary; unique `idempotency_key`; `data` valid JSON; kind/state/hash/key/timestamps required. | Command result, replay and action event evidence. |

| Current index group | Indexes and purpose |
| --- | --- |
| Core, provisioned with workspace | `records_by_type` on live record type/state/update; `tasks_by_assignee` on live task assignee/state/update; `events_by_run` on run/time. |
| POS, installed by POS activation | `pos_payment_day`, `pos_order_day`, `pos_payment_register`, `pos_customer_orders` accelerate JSON-backed day/register/customer lookups. |
| POS, unique | `pos_unique_reference` (payment reference), `pos_unique_barcode`, `pos_unique_sku` (live product), `pos_one_open_register`, `pos_unique_draft_key` (owner + draft key). These are partial indexes with the predicates in `tarharness/src/pos/store.ts`. |

`pos.settings`, `pos.product`, `pos.movement`, `pos.customer`, `pos.register`, `pos.order` and `pos.payment` are values of `records.type`, not separate physical tables. Current refunds write a negative `pos.payment` and update the `pos.order`; the schema has no `refunds` table. Existing spellings with underscores are retained at the adapter/database boundary. The one-word naming rule applies to new internal identifiers and deliberate migrations, not silent renaming of deployed columns or action IDs.

### 2.2 = Turso target: minimum durable additions

Do not create one table per Bot, Flow, tool or commerce domain. Reuse `definitions`, `records`, `runs` and `events` where their semantics and indexes fit. Add a physical table only when an independent lifecycle, transaction boundary or query/uniqueness requirement needs it. The following are proposed entities, not existing migrations or final DDL.

| Proposed table | Durable responsibility | Minimum invariant / boundary |
| --- | --- | --- |
| `proposals` | Canonical precommit action proposal, source spans, candidate/action version, expected record versions and approval state. | A proposal cannot become an effect until the gateway rechecks current authority and versions. |
| `assessments` | Reusable live Jev judgment bundle, evidence fingerprint, model/question version and typed answers. | Scoped to workspace, evidence and expiry; evaluator results have a distinct purpose and cannot authorize actions. |
| `attempts` | Provider/model request attempt, usage, latency, outcome and retry link. | Preserve uncertain outcomes and reconcile before repeating non-idempotent effects. |
| `steps` | Durable per-step runner state and resume cursor for ordered/branching Flows. | Unique step occurrence; advance only after committed receipt or explicit wait. |
| `effects` | Outbox intent and external receipt/reconciliation state. | Commit intent once; distinguish pending, confirmed, failed and unknown. |
| `approvals` | Human decision on an exact proposal/effect snapshot. | Expiry, actor authority and proposal version checked at acceptance. |

~~~text
CURRENT                           PROPOSED, MIGRATE ONLY WHEN NEEDED
definitions ----> runs            runs ----> steps ----> effects
records --------> events          proposals ---> approvals
events = replay/command log       assessments -> attempts
repo fixtures -> offline evaluator -> reports (outside live path)
~~~

Start with versioned fixtures in the repository and run output in the evaluation harness; add a Turso table only if workspace-visible evaluation history needs online queries. Use one-word lowercase names for any new physical tables and columns. Keep existing external JSON and action spellings behind adapters. Before implementation, specify keys, foreign references, deletion/retention, workspace isolation, indexes, migration order and recovery tests; add versioned migrations rather than treating `CREATE TABLE IF NOT EXISTS` as a schema upgrade plan. Money, stock and provider receipts continue to require exact transaction rules regardless of where domain payloads live.

~~~text
APP MAY: render cached permitted data | calculate a draft | queue offline intent
APP MAY NOT: hold model/provider secrets | confirm shared truth | grant permission
WORKER MUST: authenticate | read live authority | validate | commit | trace
~~~

| State | What the person sees | Allowed next step |
| --- | --- | --- |
| Empty | Purpose and starter action. | Create or install. |
| Loading | Cached content with freshness label. | Wait. |
| Offline | Saved data and queued draft badge. | Keep drafting or reconnect. |
| Pending | Accepted intent; completion unknown. | Check status. |
| Conflict | Draft retained and changed fact named. | Review and resubmit. |
| Denied | Unavailable action; no hidden field. | Request access. |
| Failed | Specific recoverable reason. | Resolve or retry safely. |
| Approval | Exact proposed effect. | Approve or reject. |
| AI paused | Manual work stays available. | Continue manually. |

Offline checkout remains a draft until the worker confirms it. Cached stock and roles are hints, never final availability or permission. A disconnected device cannot claim verified electronic payment or a shared order.

## 3 = Action Gateway and catalog

### 3.1 = One callable boundary

~~~text
+--------------------------------------------------------------+
| 1 CATALOG                                                    |
| One versioned contract per callable capability.              |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 2 ELIGIBILITY                                                |
| Intersect workspace, actor, record, Bot, Flow, connection    |
| and current policy; remove unavailable actions.              |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 3 SELECTION                                                  |
| Exact structured input -> code; ambiguous intent -> Jev      |
| over a small eligible shortlist with no-match.               |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 4 GATEWAY                                                    |
| Validate proposal, replay key, versions and approval.        |
| Dispatch read, commit, external effect or human wait.        |
+--------------------------------------------------------------+
~~~

| Action contract field | Purpose |
| --- | --- |
| id, version, description | Stable callable identity and semantic selection text. |
| input, output | Versioned typed fields and compatible bindings. |
| executor, effect | Read, transaction, provider effect, human wait or explicit AI operation. |
| scope, grants, connection | Record access, role/Bot/Flow permission and account scope. |
| approval | Exact effect and required human authority. |
| cost, budget | Maximum charge class, reservation and reconciliation. |
| timeout, retry, receipt | Recovery and provider completion policy. |
| source | Required evidence and provenance. |

**Eligibility = installed capability AND actor access AND record access AND Bot grant AND Flow grant AND connection scope AND current policy.** Catalog roles alone are insufficient. Recheck on every resumed consequential step.

| Execution path | Contract |
| --- | --- |
| Read | Apply access and evidence limits; do not create business truth. |
| Mutation | Validate types, domain rules, versions and replay; commit through workspace gateway. |
| External effect | Commit intent/outbox first; dispatch, record receipt and reconcile uncertain completion. |
| Human work | Persist a wait tied to exact proposal; resume only after authorized response. |
| AI step | Declare evidence, question/generation contract, budget and accepted outputs. |

Provider brokers such as treg or managed action catalogs may supply operations through adapters. Each operation needs a TAR contract, workspace connection, price cap and bounded grant. A provider's growing tool list cannot silently grant a Bot more actions. Credentials stay server-side. Internal helper functions and UI navigation are not automatically gateway actions.

### 3.2 = Commit and replay

~~~text
natural turn: resolve actor/workspace -> claim turn key BEFORE paid inference
             -> reuse saved proposal or assess -> store proposal
             -> gateway checks current authority + versions -> commit

typed action: authenticate -> authorize -> validate -> replay key + input hash
              -> commit record + command log -> dispatch durable effects
~~~

| Failure or replay | Required behavior |
| --- | --- |
| Same key, same input | Return stored proposal/result; concurrent requests join or wait. |
| Same key, changed input | Conflict. |
| Saved model proposal | Recheck current policy, consent, data versions and effect rules. |
| Crash after model response, before storage | Inference may be billed again; never promise exactly-once model billing. |
| Unknown provider effect | Reconcile before another non-idempotent send. |
| D1 + Turso + R2 | Use reservations and outbox; never imply one transaction spans all stores. |

## 4 = Jev judgment module

**Jev = one shared server module**, with provider adapter, versioned questions, result validation, assessment reuse, budget and traces. Domain packages supply candidate retrieval and rubrics. Routing, tagging, relating, extraction checks and layout selection are uses of the same three primitives.

| Primitive | Answer means | TAR uses | Important limit |
| --- | --- | --- | --- |
| Choice | One of supplied competing options; distribution and confidence. | Action, recipe, contact, source span, item, layout. | Include none/other if shortlist may miss; cannot pick omitted candidate. |
| Noul | Probability that one proposition is true. | Refund requested, urgency, topic, missing detail, claim support. | Use one per independently applicable label; no separate confidence field. |
| Score | Position on ordered concrete levels; distribution and confidence. | Severity, relevance, readiness, fit, coverage. | A level is not probability of business success; compare only common rubrics. |

Choice and Score confidence describe distribution concentration. It does not establish whole-workflow correctness or authorization. A Noul near 0.5 = uncertain yes/no, not medium intensity. [TypeSafe primitives](https://docs.typesafe.ai/primitives) and [confidence](https://docs.typesafe.ai/confidence).

### 4.1 = Build a question bundle

~~~text
+--------------------------------------------------------------+
| 1 AUTHORIZED STATE                                           |
| Actual request + roles + source spans + current facts.       |
| Code retrieves candidates and checks access first.           |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 2 SHARED JUDGMENT                                            |
| Reuse valid assessment or ask needed Choice/Noul/Score.      |
| Independent questions share state; dependencies stage.       |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 3 COMPOSITION                                                |
| Code consumes relevant typed answers and source values.      |
| Validate required fields, relationships and hard rules.      |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 4 DECISION                                                   |
| Exact action -> gateway; missing fact -> clarify;            |
| consequential ambiguity -> review; unsupported -> stop.      |
+--------------------------------------------------------------+
~~~

| Input to compiler | Required detail |
| --- | --- |
| State | Actual message, roles, subject, locale/timezone, current facts and versions, relevant policy and source offsets. |
| Candidates | Authorized IDs and source spans; a no-match option where coverage may fail. |
| Questions | Complete instructions and criteria; question ID alone is not model instruction. |
| Version | Question, candidate set, model, evidence, locale and time assumptions. |
| Budget | State tokens, option count, question tokens, deadline, concurrency and retry bound. |

| Need | Call plan |
| --- | --- |
| Valid button or typed form | Zero Jev. |
| All relevant evidence and candidates present | One bundle of independent questions over shared state. |
| Answer determines which records to fetch | First judgment, retrieval, second bounded judgment. |
| Several cheap plausible branches | State each premise; ask speculatively in one bundle and consume relevant answers only. |
| Too many options | Code shortlist; if necessary category then item; measure category recall. |
| Generated reply | Draft, exact checks, then targeted Jev support/contradiction check before send. |
| Scanned or spoken input | OCR/transcription first; preserve source uncertainty. |

Questions in one request are independent; one answer cannot feed another in that request. More questions still cost input tokens. Measure one broad bundle against two staged requests on actual workflows. [TypeSafe fan-out](https://docs.typesafe.ai/patterns/fan-out).

### 4.2 = Candidate and value discipline

| Stage | Owner | Output |
| --- | --- | --- |
| Find | IDs, aliases, screen context and search in code. | Authorized candidate IDs, versions, source offsets. |
| Judge | Jev Choice or Score. | Selected role/item or comparable ranking. |
| Normalize | Code copies selected source span. | Parsed dates/amounts/quantities, validated by domain rules. |
| Miss | Code widens retrieval or asks person. | Explicit missing-input outcome. |
| Evaluate | Offline labeled data. | Candidate recall separately from judgment accuracy. |

Two identical numbers may mean deposit and balance. Preserve span relationships and modifier scope. Never invent an unstated amount, date or recipient. Arithmetic, tax, ledger balance, stock, consent, payment evidence and calendar comparison remain in code.

### 4.3 = Route and acceptance

~~~text
CODE exact rule -> REUSE valid assessment -> JEV bounded judgment
               -> CLARIFY missing evidence -> optional GENERATE
               -> REVIEW consequential ambiguity -> GATEWAY
~~~

| Gate | Acceptance rule |
| --- | --- |
| Coverage | Required candidate and source are present. |
| Access | Current identity, record rights, consent, grant and connection permit it. |
| Validity | Typed output, required fields, source relationships and domain invariants pass. |
| Consequence | Threshold and review policy calibrated for this route and slice. |
| Effect | Exact recipient, amount and destination checked at dispatch. |

Use independent serious-failure flags; a good tone or relevance Score cannot offset a wrong recipient. Ignore uncertainty on unused speculative branches. A missing candidate needs retrieval, not a larger prose model. A missing field needs capture or clarification. An outage needs a useful manual/default path.

### 4.4 = Bounded interactive assistance

| Trigger | Shared state and questions | Code response |
| --- | --- | --- |
| User submits a free-text request or edited draft | Authorized message, active form, eligible actions and relevant facts; Choice for intended action, Noul for independent missing requirements. | Show a prefilled proposal and the specific missing field; person reviews before commit. |
| User selects a structured action with valid fields | No Jev call. | Validate and send to gateway. |
| Candidate set or relevant evidence changes | Reassess affected questions only. | Retain the draft, show changed fact and ask for review. |

Do not infer on every keystroke or every screen view. Prefer submit, explicit assist or a meaningful state change. Measure whether assistance reduces correct-task completion time after review, including network and correction time. The form never treats a high model probability as permission or proof of an external effect.

## 5 = Assessment, trace and reuse

**Assessment = completed, reusable judgment. Attempt = provider call. Proposal = composed candidate action. Command = accepted gateway effect.** Keep separate identities and link them.

| Stored item | Required fields |
| --- | --- |
| Assessment | tenant, task, stage, model, question bundle, source/version, candidate order, answers/distributions, dependency hash, access scope. |
| Attempt | request/response status, usage, reservation, latency, cost, timeout or unresolved completion. |
| Proposal | evidence and consumed assessments, selected arguments, missing fields, policy version and status. |
| Command/run | actor, channel, input hash, approvals, accepted state, effects, receipts and outcome. |

Reuse identity = tenant + access scope + evidence versions + candidate set/order + question meaning/version + served model + relevant policy + locale/time assumptions. A changed display weight or acceptance threshold can recompute over unchanged raw answers. Changed evidence, rubric, candidates, model or time assumption requires affected reassessment. Check access before reuse and again before execution.

~~~text
new enquiry -> assess topic + urgency + readiness + missing detail once
             -> Inbox | CRM | Sales | Search | Review | Reporting
changed UI ranking weight -> recompute in code; zero new inference
changed message or offering -> invalidate affected assessment
~~~

| Event assessment rule | Implementation boundary |
| --- | --- |
| At verified ingress | Persist/deduplicate the event, resolve workspace and access, then collect the smallest authorized state. |
| One shared pass when useful | Batch independent topic, urgency, intent and missing-detail questions; skip questions already answered exactly by structured input. |
| Reuse across surfaces | Inbox, CRM, Sales and reporting consume the same completed assessment with their own code policies; no surface gains new authority. |
| On changed facts | Recompute only affected judgments; check access again before reuse and current rules again at commit. |
| At scale | Compare selective, sampled and every-eligible-event assessment on real traffic; choose by correct outcomes, capacity and full cost. |

Do not make a universal cache from identical text alone. Pending and failed attempts are not completed assessments. An uncertain completed judgment may be reusable without being acceptable. Critical current facts such as stock and refund eligibility must be recomputed in code at commit.

## 6 = Budget, provider limits and economics

### 6.1 = Runtime budget

**Reserve -> record attempt -> spend -> reconcile actual usage.** Unknown completion retains a conservative reservation until reconciled or resolved by documented expiry policy.

| Limit | Planning value or rule | Handling |
| --- | --- | --- |
| Model snapshot | Jev 1.13.0 checked 2026-09-23. | Pin served version; verify current account terms at integration. |
| Request | 64k total input tokens; state + longest question <= 32k. | Bound both totals; retain needed evidence. |
| Choice | Up to 255 options. | Retrieve or stage; measure shortlist recall. |
| Score | 2 to 10 described levels. | Compare only same rubric. |
| Input | Text/structured text. | OCR/transcribe images/audio first. |
| Quota | 1,200 requests/min and 250,000 tokens/sec published snapshot. | Dynamic; secure capacity for scale. |
| Per route | Tokens, options, questions, retries, deadline, concurrency. | Interactive work gets priority over imports. |
| Site view | Zero Jev calls. | Serve saved default or approved plan. |
| 401/422 | Authentication/validation error. | Repair request; no blind retry. |
| 429/529 | Throttle/overload. | Bounded deadline-aware backoff. |

The [model page](https://docs.typesafe.ai/models) owns current provider limits; these values are a dated architecture snapshot.

### 6.2 = Cost ledger

~~~text
Jev input cost = actual input tokens / 1,000,000 * USD 0.042
Full workflow = Jev + OCR + transcription + generation + tool data
              + delivery + retries + storage/compute + human correction
Unit to optimize = cost and latency per correctly completed task
~~~

| Example assumption | Jev-only result | Interpretation |
| --- | --- | --- |
| USD 0.042/M input tokens, INR 95/USD planning conversion. | INR 0.00000399/input token. | Dated illustrative rate, not current price promise. |
| 1,500 monthly calls x 2,000 tokens. | INR 11.97/seat/month. | Simple every-intent scenario. |
| Same calls; 2,000 state + 30 x 60-token questions. | INR 22.74/seat/month before framing. | Batching does not make extra tokens free. |
| Selective: 540 x 3,000 primary; 135 x 2,000 dependent; 108 x 1,500 verification; 60 x 2,000 consolidation. | 843 calls; 2.172M tokens; INR 8.67/seat/month. | Assumed semantic demand and reuse; not measured saving. |
| 4 segments x 3 pages x 1,400 tokens x 4 site releases. | INR 0.268128/month Jev only. | Build-time plan selection, zero per public view. |
| Per-visit 6,800-token layout choice x 100,000 views. | INR 2,713.20 Jev only. | Rejected normal path. |

| Cost line | Record for every compared route |
| --- | --- |
| Capture | OCR/transcription quality, failures and retries. |
| Retrieval | Candidate recall, access filtering and live rule checks. |
| Interpretation | Model/version, billed input, stages, latency and accepted outcome. |
| Composition | Templates, generation, render and review cost. |
| Verification | Unsupported claims, false flags and review minutes. |
| Commit/effects | Provider charges, reconciliation, duplicates and delivery. |
| Background | Assessments, packs, imports, invalidations and storage. |
| Outcome | Correctly completed tasks, p50/p95, corrections and missed obligations. |

At one million seats and 1,500 calls/seat/month, a 30-day average is about 579 requests/sec and 1.16M input tokens/sec at 2,000 tokens/request, above the dated published quotas. The selective 843-call scenario is still about 325 requests/sec before peaks or background jobs. Capacity and margin require negotiated limits and real workload tests.

### 6.3 = Product credits

| Proposed product item | Customer-facing allowance |
| --- | --- |
| India paid plan | INR 500/month; 1,000 credits/month. |
| Credit face value | INR 0.10/credit. |
| Top-ups | INR 100/1,000; INR 500/5,000; INR 1,000/10,000 credits. |
| Owned workspace | 100 credits/month drawn from included grant. |
| Joined or personal workspace | No ownership charge under this proposal. |
| Manual actions and public browsing | Zero usage credits. |
| Workspace Agent | 2/query proposal. |
| Messaging/CRM | 2 to 5/query proposal. |
| Sales/Growth | 10 to 50/query proposal. |
| Operations/Finance | 3 to 20/query proposal. |
| Site Builder | Zero credits within explicit bounded allowance. |
| Research/Intelligence | 2 to 100/query proposal. |

These are proposed product prices, not a live billing contract. Publish route prices or a maximum before charging. Credits are separate from provider cost and connected-account fees. Exhaustion pauses optional AI, not manual work. No duplicate charge for replayed accepted commands. Zero-credit site builds still consume real resources; measure full margin before claiming a floor.

## 7 = Bots

**Bot = versioned capability configuration**, not a separate language agent. It defines purpose, permitted action subset, connectors/channels, memory scope, guidance, autonomy limits and published Flows. Directory and custom Bots use the same definition and gateway.

~~~text
describe job -> retrieve eligible actions/recipes
             -> Jev selects known fit and requirements
             -> LLM drafts only novel guidance/composition
             -> compiler checks grants, types, effects and coverage
             -> preview with recorded/sandboxed inputs
             -> review exact authority -> publish immutable version
             -> observe -> revise / pause / roll back / remove
~~~

| Jev question | Purpose | Code boundary |
| --- | --- | --- |
| Choice | Select known Bot template, goal, action, recipe or binding. | Candidate is eligible and versioned. |
| Noul | Detect independent requested channels, review needs or data sources. | Consent, required grants and connectivity are exact checks. |
| Score | Grade fit or coverage under named levels. | Fit never overrides missing capability or approval. |

| Lifecycle event | Rule |
| --- | --- |
| Install | Enable only explicitly selected, workspace-allowed capabilities. |
| Preview | No live external effects. Show scope, grants, channels, possible effects, approval and estimated usage. |
| Publish | Pin immutable version; existing runs retain their version. |
| Manage by language | Interpret request into reviewable config proposal, then gateway commit. |
| Pause/remove | Stop future invocations; preserve records, recovery obligations and audit history. |
| Open-ended personal work | Use bounded reasoning session only if a Flow cannot express the job; every action still goes through gateway. |

My Agent is the private, ask-first Bot view for one identity. Workspace facts remain subject to live permission; private status does not grant access to other workspace data.

## 8 = Flows and workflow authoring

### 8.1 = Current catalog and execution gap

| Registered area | Existing action IDs |
| --- | --- |
| Flows/Bots | flow.publish, flow.start, directory.install, directory.remove. |
| Records/tasks | record.create, record.update, task.create, task.complete. |
| POS setup/products | pos.open, pos.setup, pos.product.save, pos.product.content.save, pos.product.draft, pos.stock.adjust. |
| POS customers/orders | pos.customer.save, pos.order.save, pos.order.item.update, pos.order.cancel, pos.checkout, pos.refund. |
| POS register | pos.register.open, pos.register.close. |
| Sites | site.generate, site.update, site.compile, site.publish, site.rollback, site.refresh. |
| Web | web.search. |

Existing templates include POS, Sales follow-up/review, Team onboarding/review, Operations requests/review and Site build/preview. Missing Sales, CRM, service, support, purchasing, finance and messaging actions remain target capabilities. A template or canvas label does not make a missing action callable.

**Delivery gate = durable execution of the ordered list.** flow.start presently positions a Run at its first action; it does not execute all later steps. Complete this before branching.

### 8.2 = Flow contract

| Part | Definition | Owner |
| --- | --- | --- |
| trigger | Manual request, event or schedule. | Approved trigger set; code resolves time. |
| steps | Ordered registered actions first. | Published recipe and catalog. |
| args | Literal, source field or compatible prior output. | Compiler; Jev only for ambiguous semantic binding. |
| needs | Dependencies if branching becomes necessary. | Compiler validates full graph. |
| guard | Published condition. | Approved operators evaluated in code. |
| wait | Provider or human event. | Durable correlation and timeout. |
| recovery | Retry, reconcile, skip if allowed, or review. | Bounded declared policy. |

~~~text
+--------------------------------------------------------------+
| AUTHOR: describe goal                                        |
| Retrieve eligible catalog actions and approved recipes.      |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| SELECT OR DRAFT                                              |
| Jev selects known fit/bindings; LLM drafts only novel work.  |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| COMPILE + PREVIEW                                            |
| Code proves types, grants, effects, dependencies and waits.  |
| Test with recorded/sandboxed inputs; no live effect.         |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| REVIEW + PUBLISH                                             |
| Person reviews exact grants/effects; pin immutable version.  |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| RUN                                                          |
| Persist steps; recheck authority; invoke gateway; record     |
| output/receipt; wait, resume or reconcile as declared.       |
+--------------------------------------------------------------+
~~~

| Authoring question | Primitive | Compiler must still prove |
| --- | --- | --- |
| Which supported recipe/trigger/binding? | Choice. | ID, type compatibility, version and access. |
| Which independent requirement is stated? | Noul per condition. | Complete required fields and effects. |
| How well does a recipe cover a graded goal? | Score. | No missing capability, cycle or invalid authority. |
| Is graph valid, amount correct or provider done? | No Jev. | Code and verified receipts. |

Only compatible producers may bind an input; do not use an arbitrary last-five-node window. Branching requires a valid directed acyclic dependency graph, reachable completion/review, approved guards and recovery. An LLM can draft a novel graph but cannot publish it. A published Flow never preapproves a future refund, message or payment.

### 8.3 = Durable runner

~~~text
pin Bot/Flow/action versions -> persist step + input binding
  -> recheck authority, versions, budget, guard
  -> dispatch catalog action -> record accepted output/receipt
  -> advance successor or persist human/provider wait
  -> bounded recovery; reconcile ambiguous effects before retry
~~~

Cancellation stops new dispatch but does not erase completed effects. Stable replay keys deduplicate accepted commands. Provider semantics may prevent exactly-once external effects. An explicit Jev step uses published evidence and allowed outcomes; it cannot invent a new action edge at runtime. A reasoning session is a separate bounded mode over the same gateway.

| Route | Inference |
| --- | --- |
| Exact recipe + structured arguments | Zero unless an explicit semantic step exists. |
| Natural-language recipe selection | Bounded selection/binding stages. |
| Valid saved assessment | Reuse. |
| Novel workflow | Budgeted generation/planning, compiler, preview and review. |
| Published execution | Only declared judgment steps consume Jev. |

## 9 = Channels and communication

~~~text
+--------------------------------------------------------------------------------+
| CHANNEL INGRESS                                                                |
| Verify signature, deduplicate and persist event safely.                        |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| RESOLVE + ASSESS                                                               |
| Resolve sender/workspace; retrieve authorized evidence.                        |
| Use exact handler, saved assessment or bounded Jev.                            |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| COMPOSE + COMMIT                                                               |
| Gateway creates task/record; template or LLM drafts reply.                     |
| Code checks exact fields; Jev checks claim support when useful.                |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| SEND + RECONCILE                                                               |
| Outbox enforces consent/recipient; record provider receipt.                    |
| Reconcile unknown delivery before retry.                                       |
+--------------------------------------------------------------------------------+
~~~

| Family | Boundary |
| --- | --- |
| Team | One configured shared destination with participant identity; channel membership does not confer business role. |
| Customer | Separate conversation queues and consent per customer. |
| Native | Website chat and email adapters. |
| Proposed aggregator | Evaluate Zernio against exact required networks, inbound/outbound behavior, fees and recovery. |
| Other broker | Add direct adapter for a demonstrated gap; keep TAR contract and authority. |

Preserve speaker roles and quoted text; customer content is evidence, not trusted instructions. Provider-specific messaging windows and template requirements live in adapters. A provider outage leaves received messages durable in Inbox; reconcile delivery gaps without inventing a sent receipt. Charge and measure judgment, OCR/transcription, generation, delivery and account fees separately.

## 10 = Product screens and interaction grammar

~~~text
TOP:     current workspace | sync status | identity
BOTTOM:  Space             | Inbox       | Bots
DETAIL:  one record        | one primary legal action
REVIEW:  one ambiguity     | evidence    | concrete alternatives
~~~

| Surface | Job | Hard rule |
| --- | --- | --- |
| Space | Permitted facts, role home, records and Memory saved view. | Visibility is not authorization. |
| Inbox | Decisions, exceptions, waits, failed work, approvals. | Show only actions actor can perform. |
| Review | One consequential ambiguity and its source. | Do not expose full model state as a user task. |
| Bots | Installed/available capabilities and Flows. | Description cannot create a grant. |
| Record card | Current state and one primary action. | Morph with step state. |
| Action form | Typed fields from action contract. | Exact confirmation for consequences. |
| Approval | Exact amount, recipient, destination, actor, expiry. | Approval binds proposal and is rechecked at dispatch. |
| Channels | Team linking and customer queues. | No provider tokens or raw private payloads. |
| My Agent | Private tasks, goals and activity. | Ask first; live access still applies. |

| Screen group | Complete target screen inventory |
| --- | --- |
| Entry | Boot; Sign in; First run; Space; Inbox; Review. |
| Capability | Bots; Bot detail; My Agent; Search; Settings. |
| Record | Record card; Record detail; Action form; Confirmation; Approval. |
| POS | POS sale; Receipt; Register; Stock adjust; Product form. |
| Publishing | Site Studio. |
| Team | Members and chat; Channel link. |
| Commercial | Plans and credits. |
| System states | Offline; AI paused. |

| Design rule | Meaning |
| --- | --- |
| One primary action | The next step is evident on a card. |
| Native back | Avoid redundant in-app close controls. |
| Autocomplete first | Reduce typing for ordinary users. |
| Fields by policy | Hidden fields are absent from payload, not merely greyed out. |
| Review band | Put consequential ambiguity in Inbox; harmless preference may default. |
| Manual continuity | Budget/outage never disables ordinary POS and forms. |
| Visual language | Calm operational tool; no decorative mascot or sparkle. |

~~~text
+------------------+     +------------------+     +------------------+
| SPACE            |     | INBOX            |     | BOTS             |
| facts + domains  |     | work + waits     |     | capabilities     |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
  POS / Site Studio       Review / Record card     Bot detail / Flow
  CRM / Search / Memory          |                  canvas / Activity
                                v
                       Action form -> Confirm
                                         |
                                         v
                              Approval if required
                                         |
                                         v
                                 Gateway result

Shared overlays = Offline | Pending | Conflict | Denied | Failed | AI paused
~~~

### 10.1 = Screen atlas

**Status = target concepts.** The app must be checked against these during implementation. Each frame shows the main visible facts and primary action; it is not a pixel specification.

#### 10.1.1 = Entry, workspace and capability screens

~~~text
+------------------------------------------------+
| 01 BOOT                                        |
+------------------------------------------------+
| TAR                                            |
| Opening saved workspace...                     |
| [=====       ]                                 |
| Local database: ready                          |
| Identity: checking                             |
| Next = Sign in or Space                        |
+------------------------------------------------+

+------------------------------------------------+
| 02 SIGN IN                                     |
+------------------------------------------------+
| Welcome to TAR                                 |
| Continue with Google                           |
| [ Continue ]                                   |
| Your existing work stays on this device        |
| until your workspace is available.             |
+------------------------------------------------+

+------------------------------------------------+
| 03 FIRST RUN                                   |
+------------------------------------------------+
| Choose how to begin                            |
| [ Create a workspace ]                         |
| [ Join with an invitation ]                    |
| Personal space: private and ready              |
| Next = role-aware Space                        |
+------------------------------------------------+

+------------------------------------------------+
| 04 SPACE                                       |
+------------------------------------------------+
| Slice House                 Sync  Me           |
| Sales today: INR 18,420 | Open orders: 4       |
| Kitchen: 2 preparing | 1 ready                 |
| [ Site Studio ]  [ Sell ]                      |
| [ New order ] [ New lead ] [ Ask ]             |
| Space             Inbox              Bots      |
+------------------------------------------------+

+------------------------------------------------+
| 05 INBOX                                       |
+------------------------------------------------+
| All areas                         Filter v     |
| NOW  Order #1044       Needs detail            |
|      2 x Margherita      [ Review ]            |
|      Payment INR 651    [ Collect ]            |
| NEXT Chase deposit T7     [ Done ]             |
| Space             Inbox              Bots      |
+------------------------------------------------+

+------------------------------------------------+
| 06 REVIEW                                      |
+------------------------------------------------+
| Order #1044              Needs detail          |
| Question: what did 'that' mean?                |
| Options: Margherita | Garlic Bread             |
| Evidence: 2 close menu matches [ Open ]        |
| [ Accept Margherita ]  [ Ask Priya ]           |
+------------------------------------------------+

+------------------------------------------------+
| 07 BOTS                                        |
+------------------------------------------------+
| Bots                             Manage        |
| My Agent                 private               |
| POS                      installed             |
| Sales                    installed             |
| Support                  available             |
| [ Find a Bot ]                                 |
+------------------------------------------------+

+------------------------------------------------+
| 08 BOT DETAIL                                  |
+------------------------------------------------+
| POS | orders, payment, stock, register         |
| Installed actions: 14 available here           |
| Flows                                          |
| [x] Take an order       3 actions              |
| [x] Adjust stock        2 actions              |
| [ ] Custom Flow         draft                  |
| [ New Flow ]        [ Save ]                   |
+------------------------------------------------+

+------------------------------------------------+
| 09 MY AGENT                                    |
+------------------------------------------------+
| Private | Ask first                            |
| [ Plan my week or save a note... ]             |
| Renew insurance   waiting approval             |
| Track laptop      next check tomorrow          |
| Goals | Tasks | Files | Apps | Activity        |
+------------------------------------------------+
~~~

#### 10.1.2 = Record, decision and discovery screens

~~~text
+------------------------------------------------+
| 10 RECORD CARD                                 |
+------------------------------------------------+
| ORDER #1044   new          [ Accept ]          |
| same card -> preparing    [ Ready ]            |
| same card -> paid       [ Hand over ]          |
| same card -> complete         Done             |
| One current state; one legal next action.      |
+------------------------------------------------+

+------------------------------------------------+
| 11 RECORD DETAIL                               |
+------------------------------------------------+
| ORDER #1044                 ready v7           |
| 2 x Margherita         INR 440                 |
| 1 x Garlic Bread       INR 180                 |
| Tax                    INR 31                  |
| Total                  INR 651                 |
| Customer: Priya        [ Contact ]             |
| [ Mark done ]   [ Open in POS ]                |
+------------------------------------------------+

+------------------------------------------------+
| 12 ACTION FORM                                 |
+------------------------------------------------+
| Refund order #1038                             |
| Amount       [ INR 250          ]              |
| Reason       [ item unavailable v ]            |
| Destination  original payment                  |
| Source       order #1038                       |
| [ Continue to confirmation ]                   |
+------------------------------------------------+

+------------------------------------------------+
| 13 CONFIRMATION                                |
+------------------------------------------------+
| Confirm this refund                            |
| Order #1038 | amount INR 250                   |
| Original payment | requested by Malar          |
| Irreversible provider effect                   |
| Approval required from manager                 |
| [ Cancel ]             [ Request ]             |
+------------------------------------------------+

+------------------------------------------------+
| 14 APPROVAL                                    |
+------------------------------------------------+
| Refund #1038 | expires in 6 hours              |
| Amount INR 250 -> original payment             |
| Reason: item unavailable                       |
| Requested by Malar                             |
| Evidence: order + payment [ Open ]             |
| [ Reject ]             [ Approve ]             |
+------------------------------------------------+

+------------------------------------------------+
| 24 SEARCH                                      |
+------------------------------------------------+
| Search workspace                               |
| [ orders, contacts, actions...     ]           |
| Records | Actions | Help                       |
| Order #1044        paid  [ Open ]              |
| Priya              CRM   [ Open ]              |
| Search only permitted records.                 |
+------------------------------------------------+

+------------------------------------------------+
| 25 SETTINGS                                    |
+------------------------------------------------+
| Settings                                       |
| Workspace | Members | Connections              |
| Theme | Language | Notifications               |
| AI budget: available [ Detail ]                |
| Account and data [ Open ]                      |
| Saved changes go through gateway.              |
+------------------------------------------------+
~~~

#### 10.1.3 = POS screens

~~~text
+------------------------------------------------+
| 28 POS SETUP                                   |
+------------------------------------------------+
| Set up your store                              |
| 1 Store details             done               |
| 2 First product       [ Add product ]          |
| 3 Opening stock      [ Adjust ]                |
| 4 Register           [ Open ]                  |
| [ Continue ]                                   |
+------------------------------------------------+

+------------------------------------------------+
| 15 POS SALE                                    |
+------------------------------------------------+
| Slice House          Register open             |
| Sell | Orders | Stock | Customers              |
| [ Search item or scan barcode ]                |
| 2 x Margherita          INR 440                |
| 1 x Garlic Bread        INR 180                |
| Subtotal 620 | Tax 31 | Total 651              |
| [ Cash ] [ UPI ] [ Order details ]             |
+------------------------------------------------+

+------------------------------------------------+
| 16 RECEIPT                                     |
+------------------------------------------------+
| Payment recorded | order #1044                 |
| 2 x Margherita          INR 440                |
| 1 x Garlic Bread        INR 180                |
| Total                  INR 651                 |
| Method Cash | Change INR 49                    |
| [ Share receipt ] [ Return ] [ Done ]          |
+------------------------------------------------+

+------------------------------------------------+
| 17 REGISTER                                    |
+------------------------------------------------+
| Register | Slice House                         |
| Status: open | opened 09:00                    |
| Cash sales       INR 3,240                     |
| Expected cash    INR 3,740                     |
| Counted cash     [ INR ... ]                   |
| Difference       calculated by code            |
| [ Close register ]                             |
+------------------------------------------------+

+------------------------------------------------+
| 18 STOCK ADJUST                                |
+------------------------------------------------+
| Margherita | stock adjustment                  |
| On hand: 24                                    |
| [ - ]     2 units      [ + ]                   |
| Reason [ damaged stock v ]                     |
| New on hand: 22                                |
| [ Update stock ]                               |
+------------------------------------------------+

+------------------------------------------------+
| 19 PRODUCT FORM                                |
+------------------------------------------------+
| Product | Details Inventory More               |
| Name       [ Margherita ]                      |
| Price      [ INR 220    ]                      |
| Category   [ Pizza v    ]                      |
| On hand    24                                  |
| [ Suggest fields ]       [ Save ]              |
+------------------------------------------------+

+------------------------------------------------+
| 29 CUSTOMER FORM                               |
+------------------------------------------------+
| Add customer                                   |
| Name       [ Priya             ]               |
| Phone      [ +91 98xx xx21    ]                |
| Note       [ regular; no onion ]               |
| Consent    [ current status v ]                |
| [ Save customer ]                              |
+------------------------------------------------+

+------------------------------------------------+
| 30 RETURN SALE                                 |
+------------------------------------------------+
| Return order #1044 | paid INR 651              |
| [x] 2 x Margherita   INR 440                   |
| [ ] 1 x Garlic Bread INR 180                   |
| Reason [ damaged item v ]                      |
| Refund proposal: INR 440                       |
| [ Continue to approval ]                       |
+------------------------------------------------+
~~~

#### 10.1.4 = Site, channel and plan screens

~~~text
+------------------------------------------------+
| 20 SITE STUDIO                                 |
+------------------------------------------------+
| Slice House | Site Studio                      |
| Draft v4            Live release v3            |
| Pages: Home | Menu | Contact                   |
| Checks: 4/4 grounded; links valid              |
| [ Preview ] [ Edit ] [ Publish ]               |
| Rollback: release v2 [ View ]                  |
+------------------------------------------------+

+------------------------------------------------+
| 31 SITE BOT CHAT                               |
+------------------------------------------------+
| Site Bot                      Draft            |
| You: warm page for local families              |
| Bot: draft ready: hero, menu, hours            |
| Sources: products + hours + brief              |
| [ Preview ]       [ Request change ]           |
| [ Ask for a change... ]                        |
+------------------------------------------------+

+------------------------------------------------+
| 32 DESIGN PICKER                               |
+------------------------------------------------+
| Pick a design                                  |
| (*) Warm counter   cafe / friendly             |
| ( ) Clean slate    minimal / airy              |
| ( ) Night kitchen  dark / bold                 |
| ( ) Market stall   playful                     |
| [ See live ]    [ Use this design ]            |
+------------------------------------------------+

+------------------------------------------------+
| 33 SITE PLAN                                   |
+------------------------------------------------+
| Slice House | release plan                     |
| [x] Hero    from merchant brief                |
| [x] Menu    12 products; six shown             |
| [x] Hours   from current record                |
| [ ] Gallery no approved photos                 |
| Copy support: 4/4 checked                      |
| [ Edit sections ]   [ Publish ]                |
+------------------------------------------------+

+------------------------------------------------+
| 21 MEMBERS AND CHAT                            |
+------------------------------------------------+
| Members & chat | Slice House                   |
| Team destination: Slack #slice-house           |
| Owner: Iniya  Admin: Malar                     |
| Cashier: Priya | Kitchen: Arun                 |
| [ Invite member ]                              |
| [ Link team channel ]                          |
+------------------------------------------------+

+------------------------------------------------+
| 22 CHANNEL LINK                                |
+------------------------------------------------+
| Link team channel                              |
| Destination: Slack #slice-house                |
| Code: K7Q2-M4 | expires in 10 min              |
| Connection scope [ View ]                      |
| [ Confirm link ]                               |
| Refresh connection if code expires             |
+------------------------------------------------+

+------------------------------------------------+
| 35 CUSTOMER CHANNELS                           |
+------------------------------------------------+
| Customer channels                              |
| WhatsApp  +91 98xx xx21 connected              |
| Instagram @slicehouse connected                |
| Telegram  @slicehouse connected                |
| Website chat          native                   |
| Email hello@slice     native                   |
| [ Manage connections ]                         |
+------------------------------------------------+

+------------------------------------------------+
| 23 PLANS AND CREDITS                           |
+------------------------------------------------+
| Credits & Agents                               |
| Balance: 10,000 credits                        |
| Plan INR 500/mo | 1,000 credits                |
| Top-up 1,000 credits: INR 100                  |
| AI paused at limit; manual stays               |
| [ Buy top-up ] [ Usage detail ]                |
+------------------------------------------------+
~~~

#### 10.1.5 = Workflow, memory and system-state screens

~~~text
+------------------------------------------------+
| 34 WORKFLOW CANVAS                             |
+------------------------------------------------+
| Workflow Lab | Draft                           |
| Goal: brief me before 10am call                |
| Recipe: meeting brief [ Change ]               |
| [1] Read permitted records                     |
|        |                                       |
| [2] Select relevant source blocks              |
|        |                                       |
| [3] Render evidence-linked brief               |
| [ Test ] [ Publish ]                           |
+------------------------------------------------+

+------------------------------------------------+
| 36 MEMORY VIEW                                 |
+------------------------------------------------+
| Memory | saved view in Space                   |
| Allergy note   person   2 sources              |
| Prep time      fact     1 source               |
| Deposit        preference 1 source             |
| [ Raise ] [ Source ] [ Forget ]                |
+------------------------------------------------+

+------------------------------------------------+
| 37 FORGET REVIEW                               |
+------------------------------------------------+
| Forget saved preference?                       |
| Source: note + supporting event                |
| Effect: exclude from recall now                |
| Retention follows workspace policy             |
| [ Keep ]              [ Forget ]               |
+------------------------------------------------+

+------------------------------------------------+
| 26 OFFLINE                                     |
+------------------------------------------------+
| OFFLINE | showing saved data                   |
| 2 turns waiting to sync                        |
| Order draft #1045 is not confirmed             |
| [ Keep editing draft ]                         |
| [ Retry now ]                                  |
+------------------------------------------------+

+------------------------------------------------+
| 27 AI PAUSED                                   |
+------------------------------------------------+
| AI PAUSED | manual work continues              |
| Orders, checkout and stock available           |
| Cause: monthly AI budget reached               |
| Drafts remain saved                            |
| [ Continue manually ] [ Detail ]               |
+------------------------------------------------+

+------------------------------------------------+
| 38 EMPTY                                       |
+------------------------------------------------+
| No orders yet                                  |
| Take your first order to start                 |
| [ New order ]                                  |
+------------------------------------------------+

+------------------------------------------------+
| 39 PENDING                                     |
+------------------------------------------------+
| Order #1045 | pending                          |
| Request accepted; final result unknown         |
| Keep this reference: T7-4F9A21                 |
| [ Check status ]                               |
+------------------------------------------------+

+------------------------------------------------+
| 40 CONFLICT                                    |
+------------------------------------------------+
| Order draft changed while offline              |
| Stock: 3 -> 1 since your draft                 |
| Draft retained; quantities unchanged           |
| [ Review draft ]                               |
+------------------------------------------------+

+------------------------------------------------+
| 41 DENIED                                      |
+------------------------------------------------+
| Refund unavailable for this account            |
| No private order details displayed             |
| [ Request access ]                             |
+------------------------------------------------+

+------------------------------------------------+
| 42 FAILED                                      |
+------------------------------------------------+
| Message not delivered                          |
| Provider response: temporary outage            |
| Draft and recipient are preserved              |
| [ Retry safely ] [ Open Inbox ]                |
+------------------------------------------------+
~~~

Screen numbers 01-27 are the core catalog above. Numbers 28-42 complete the domain views and system states referenced elsewhere in this handbook. A card never grants authority merely because its button is visible.

## 11 = POS and restaurant path

**Two inputs, one action contract.** A cashier tapping products uses code; a customer message or voice note may need transcription and bounded Jev. Both commit the same POS action through the gateway.

~~~text
cashier taps -> deterministic cart -------+
                                          +-> pos.order.save -> gateway -> receipt
message/voice -> capture -> Jev draft ----+
~~~

| Stage | Role and screen | Jev, when needed | Code or gateway |
| --- | --- | --- | --- |
| Open | Owner, workspace/Space. | None. | Membership and roles. |
| Install | Owner, Bots. | None for explicit selection. | Bot/Flow installation. |
| Setup | Owner, POS/product/register. | Optional attribute selection. | Product, stock, register. |
| Sell | Cashier, POS sale. | None for taps; item/span selection for language. | Cart, tax, stock, order. |
| Receive | Cashier, Receipt. | None. | Verified cash recording or payment evidence. |
| Prepare | Kitchen, Inbox order row. | None. | Item states. |
| Handover | Cashier, Record card. | None. | Fulfilment. |
| Message | Owner, Inbox/Review. | Intent and ambiguous item. | Draft order or reply. |
| Refund | Manager, Approval/form. | Reason may be interpreted. | Amount, destination, policy, approved effect. |
| Close | Owner, Register. | None. | Day totals. |
| Check | Owner, Plans/credits. | None. | Usage ledger. |

| Natural order field | Semantic help | Deterministic requirement |
| --- | --- | --- |
| Item | Choice over current eligible menu. | Product exists and is sellable. |
| Quantity | Select source span/role. | Parse number; preserve line association. |
| Modifier | Noul per independent instruction or Choice among exclusive options. | Compatibility, scope and stock. |
| Customer | Choice over authorized contacts. | Identity/access check. |
| Method | Choice if ambiguous. | "Cash" or "UPI" is a method, not payment success. |
| Total | None. | Exact subtotal, discount, tax and final amount. |

Example = "Two oat cappuccinos, one without sugar, and the sandwich from yesterday." The draft must preserve which item has the modifier, find the historical sandwich candidate, and ask if no candidate matches. Identical lines merge only when their modifiers and source meaning agree. A voice note adds transcription cost and uncertainty; offline work stays a draft.

The POS sale, receipt, setup, stock, product, customer and return concepts are
drawn together in the section 10 screen atlas.

## 12 = Site Bot and publishing

~~~text
+--------------------------------------------------------------------------------+
| BUILD: merchant request                                                        |
| Site Bot reads validated design.md + workspace facts.                          |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| COMPOSE: reviewed candidates                                                   |
| Jev selects when meaning is ambiguous; optional LLM drafts new copy/code.      |
| Code validates design.json, components, claims and required sections.          |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| PUBLISH: exact release                                                         |
| Render, inspect, review and save immutable release in R2.                      |
+--------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------+
| VISIT: public request                                                          |
| Explicit locale/category or saved default selects a ready page.                |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| DELIVER: deterministic                                                         |
| Serve cached composition; fetch live price/stock/hours.                        |
| A page view alone makes ZERO Jev calls.                                        |
+--------------------------------------------------------------------------------+
~~~

| Asset | Owner and use |
| --- | --- |
| design.md | Curated or owner-uploaded design source: tokens, sections, tone and example proof. |
| design.json | Parsed/generated draft pinned to source revision; code validates schema. |
| components | Reviewed implementation and allowed layout constraints. |
| variants | Approved content and coherent page compositions. |
| decisions | Versioned Jev selection and support questions. |
| data | Live workspace products, prices, stock, hours and contact facts. |
| release | Immutable approved artifact with hash and rollback reference. |

| Semantic use | Code/reviewer boundary |
| --- | --- |
| Request type and missing goal | Registered site action and required fields. |
| Design, section and CTA fit | Available validated options and coherence rules. |
| Copy relevance and claim support | Exact prices, citation match, policy and publication review. |
| Product relevance | Stock, compatibility, price and restrictions. |
| Feedback classification | Randomized assignment and causal outcome analysis. |
| Textual visual intent | Rendered visual, accessibility and performance inspection. |

Precompute plans for a small set of permitted segment/page/locale combinations on meaningful releases. Default is useful with no personal history. Explicit language or category selection is deterministic. Consent is never inferred; do not derive sensitive personas from browsing. Experiments require merchant enablement, separate budget, persistent control assignment and measured lift. A site chat question uses the channel budget, not a page-view budget. Rebuild only plans affected by content, eligibility or rubric changes.

## 13 = Sales, GTM and staged external data

**Pattern = pay for evidence in stages.** This makes the shared catalog useful for discovery and retention without exposing arbitrary broker tools.

~~~text
signal -> cheap code filters -> small authorized source fetch
       -> Noul: relevant? / expressed buying signal?
       -> Choice: role or supported segment
       -> Score: fit/readiness under named rubric
       -> code applies threshold, consent, cost cap and quota
       -> paid enrichment ONLY for selected candidates
       -> reviewed follow-up or configured channel action
       -> record outcome, spend and false positives
~~~

| GTM step | Catalog contract | Gate |
| --- | --- | --- |
| Source | Search or permitted social/company data adapter. | Provider terms, scopes, rate and data provenance. |
| Verify | Email/domain or source verification. | Exact validity result, price cap and purpose. |
| Assess | Shared Jev bundle. | Candidate coverage, evidence quality and calibrated route policy. |
| Enrich | Approved person/company lookup. | Spend only after qualification; enforce per-hit cap. |
| Act | CRM lead, task, draft or outreach action. | Consent, frequency, recipient, approval and delivery receipt. |
| Learn | Store assessment and actual outcome. | Compare cost per qualified and accepted opportunity. |

The [Jev + treg GTM examples](https://treg.to/jev) illustrate staged lead qualification, signup triage and post research. Their vendor prices, availability, performance and synthetic examples are not TAR benchmarks. A Jev fraud probability alone cannot ban an account. TAR needs independent abuse evidence, consequence-aware review and an authorized account action. Social network access and outreach terms must be verified before selecting an adapter.

## 14 = Memory and knowledge

**Memory = sourced, scoped, derived context in workspace storage.** It accelerates continuity; it never replaces authoritative orders, balances, permissions, stock or service state.

| Kind | Holds |
| --- | --- |
| profile | Identity context and communication/autonomy preferences. |
| preference | Person or workspace preference. |
| person | Remembered member, customer or supplier context. |
| fact | Sourced assertion or standing instruction. |
| recap | Code-composed period summary. |
| pack | Versioned compiled retrieval aid. |

| Field | Rule |
| --- | --- |
| aliases, links | Names/synonyms and related rows/records. |
| source, version | Turn/event origin and correction history. |
| state, expires | Fresh, superseded or forgotten; code sweeps ephemeral facts. |
| importance | Retrieval rank; person may raise it. |
| confidence | Assessment reference, not proof of truth. |
| scope | Tenant, person/entity, access and time boundary. |

~~~text
+--------------------------------------------------------------------------------+
| MEMORY WRITE: new event                                                        |
| Access-filter related facts; judge relationship if ambiguous.                  |
| Gateway accepts sourced, scoped update.                                        |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| IMMEDIATE CORRECTION                                                           |
| Overlay affects recall now; rebuild only affected entity pack.                 |
+--------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------+
| MEMORY READ: new turn                                                          |
| Filter by current access; retrieve aliases/text + live overlay.                |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
| BOUNDED CONTEXT                                                                |
| Return source-linked excerpt; ask Jev only if a relationship or ranking        |
| still needs semantic judgment.                                                 |
+--------------------------------------------------------------------------------+
~~~

| Memory judgment | Primitive | Code rule |
| --- | --- | --- |
| Duplicate/update/contradiction/independent | Choice. | Compare subject, source, time and authority. |
| Which prior fact was corrected? | Choice with none. | Verify identity/scope before superseding. |
| Contextual or lasting preference? | Choice with unknown. | Conservative scope and expiry. |
| Usefulness to current task? | Score. | Critical restrictions take precedence. |
| Conflict supported? | Noul or Choice. | Preserve unresolved evidence for review. |

Initial planning bounds = pack about 8k tokens, excerpt about 300 where adequate, compaction after 25 changed events or 24 hours, immediate overlay for corrections and withdrawals. These are tunable, not laws. No probability cutoff silently deletes a critical fact. Forget excludes a row from recall immediately; retained data, deletion and exports follow applicable lifecycle policy. Memory is a saved Space view with source, correct and forget actions; durable forget can appear as an Inbox Review card. Begin with aliases/text search; add vector infrastructure only after measured recall warrants it.

## 15 = Evaluation, rollout and build order

### 15.1 = Route proof

~~~text
OFF -> fixed offline evaluation -> sampled SHADOW -> reviewed drafts
    -> route canary -> enabled route
    -> continuous labels, corrections, cost and rollback
~~~

| Layer | Measure |
| --- | --- |
| Retrieval | Correct candidate present; inaccessible candidates absent; recall by slice. |
| Judgment | Intent, source role, relationship, none/unknown and calibrated probabilities. |
| Composition | Whole proposal, argument scope and cross-field correctness. |
| Acceptance | Errors among automatic accepts, coverage and review burden. |
| Execution | Gateway invariants, replay, provider receipts and reconciliation. |
| Economics | Billed tokens, stages, p50/p95, provider fees, correction/review cost. |
| Product | Completion, missed obligations, conversion, user corrections. |

Dataset = frozen request + authorized evidence + candidate list/version + action contract + proposal + actual trace/receipts + expected result + human label + deterministic checks + operating slice. Capture model, served version, question bundle, thresholds and timestamps so a result can be reproduced or identified as version dependent. Include role, domain, channel, Indian languages and transliteration, mixed messages, noisy voice transcripts, regional dates and money. Do not claim equal Jev quality across language slices without labels.

~~~text
FROZEN TAR TRACE
request + authority + permitted evidence + eligible candidates + versions
                              |
                              v
                 route / Bot / Flow under test
                              |
                              v
          proposal + steps + gateway checks + receipts
                    /                         \
                   v                           v
       exact code assertions         human rubric + Jev judge
                   \                           /
                    v                         v
             slice report: errors | coverage | cost | latency
                              |
                              v
              review -> shadow -> route canary -> rollback
~~~

| Evaluation order | What it establishes |
| --- | --- |
| 1. Exact assertions | Authorization, amount math, state transitions, idempotency, receipt presence, schema validity and forbidden effects. These are code checks, not model opinions. |
| 2. Human reference | Reviewers label ambiguous intent, evidence support and usefulness against written rubrics; use additional reviewers/adjudication for consequential or disputed cases. |
| 3. Jev judge | Independent, atomic typed judgments on the frozen state; batch questions sharing the same state. Compare with human labels before using results for any promotion decision. |
| 4. Route report | Measure false passes, false alarms, coverage, disagreement, repeatability, latency and cost by slice and served model/question version. A stable score can still be wrong. |
| 5. Live shadow | Sample normal and targeted failure traces subject to data retention and consent rules; evaluator output stays outside the action gateway's authority path. |

| Evaluator question | Use |
| --- | --- |
| Noul: does cited evidence support a claim? | Draft support audit. |
| Choice: selected action matches expected action, mismatches or lacks evidence? | Routing audit. |
| Score: concrete usefulness levels. | Compare quality after calibration. |
| Choice: search/tool call appropriate, unnecessary or failed? | Retrieval/tool policy audit. |
| Code: did accepted effect actually complete? | Only receipts and records prove execution. |

For Noul, ask a single testable yes/no claim and retain its probability; do not read 0.5 as a medium quality score. For Choice, define exhaustive rubric options including unknown/none where possible. For Score, define ordered, observable levels and calibrate against human ratings. Separate question IDs and versions for live routing and retrospective evaluation even when the primitive is the same. A judged trace cannot write an approval, proposal, command or provider effect.

Jev evaluates frozen traces, never authorizes live effects. Human labels and exact assertions remain the reference. Agreement is distinct from repeatability, and score variance is distinct from score accuracy. A zero-error sample of 1,000 independent relevant cases still has about a 0.3% 95% upper error bound by the rule of three; important accepted subsets and slices may need more. Do not multiply separate probabilities to claim whole-workflow accuracy.

The [LangChain Jev-as-a-Judge article](https://x.com/LangChain/article/2101454284927959080) and its [experiment repository](https://github.com/danielgshea/jev-as-a-judge) are useful evidence for trying this evaluator pattern: five fixed weather-agent traces were judged 100 times each against one human review. Jev matched the reviewer's binary labels in 500/500 repeated decisions; its mean per-case continuous Score variance was 0.0000149. Five cases, one reviewer and score variance alone do not establish TAR's accuracy, language coverage, safety or current service behavior. The published experiment did not expose the hosted Jev service version. Reproduce on a larger, independently labeled TAR set; record every available model and bundle identifier, and rerun calibration when the served version cannot be pinned. Do not add LangSmith or Deep Agents as runtime dependencies for this: the needed parts are frozen traces, rubrics, exact assertions, a judge adapter and route reports. An external tracing tool is optional only if it measurably improves operations.

| Ablation | Comparison |
| --- | --- |
| Router | Deterministic baseline vs every-interaction vs selective Jev. |
| Architecture | Shared three-primitive compiler vs separate domain prompts/agents. |
| Bundle | Narrow vs speculative; staged vs single call; reuse vs recompute. |
| Output | Template vs generation. |
| Retrieval | Lexical baseline vs added method only if recall improves. |

| Robustness test | Failure it can expose |
| --- | --- |
| Permute eligible Choice option order; keep labels, evidence and policy fixed. | Decision or threshold changes caused by presentation order. |
| Add an irrelevant option; compare probabilities and chosen action. | Candidate-set sensitivity or a missing none/unknown route. |
| Rephrase one atomic question without changing its meaning. | Fragile rubric wording. |
| Add/remove an independent question in a shared request. | Unexpected bundle-composition effects. |
| Remove evidence, add contradictory text and test noisy language/transcription. | Confident unsupported decisions and unsafe fallback. |

The option-order and irrelevant-option probes are motivated by an [independent Jev API investigation](https://archerhume.com/posts/jevs-architecture-unmasked); its proposed model internals are hypotheses. Treat observed behavior as a reason to test TAR's actual requests, not as a fixed performance guarantee. Measure calibration and false acceptance on held-out cases, including slices with costly mistakes.

Thresholds depend on route, model, question version, evidence quality, language and consequence. Promote only when the composed policy beats predeclared baseline criteria for error, coverage, latency and cost. Pin model, canary, roll back and disable per route.

Smallest deciding experiment = freeze 100 to 200 permission-safe enquiries and command requests; label intended action, missing facts and forbidden effects; run exact-code baseline, bundled Jev route and applicable current generator. Report candidate recall, false automatic accepts, correct completed tasks, human review minutes, p50/p95 end-to-end latency and total cost including retries and corrections. Set route-specific go/no-go bounds before seeing results. This is an experiment design, not a measured TAR result.

### 15.2 = Build sequence

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| P0a | Extend existing action contract and eligible shortlist. | One catalog drives forms, Bot/Flow discovery and gateway validation. |
| P0b | Pre-inference turn replay; proposal/assessment/attempt links. | Duplicate turn repeats zero inference; accepted effects are reconstructible. |
| P0c | Server Jev adapter, reviewed bundles, support/Inbox and command-draft slice. | Contract and whole-route accuracy/latency/cost gates pass. |
| P0d | POS or quote draft from spans and real catalog candidates. | Candidate recall and whole-order correctness measured against manual entry. |
| P1a | Durable ordered Flow runner, waits, recovery and receipts. | Multi-step run completes, resumes and reconciles uncertainty. |
| P1b | Bot designer: selection, novel draft, compiler, preview, publish, manage. | Grants stay eligible; pause/revise/rollback work. |
| P1c | Assessment reuse across Inbox, CRM, Sales, search and reporting. | Weight/filter change adds zero inference while evidence remains valid. |
| P1d | External adapters, document handling, sites and scoped memory. | Actual provider spend/outcomes measured; no stale critical fact. |
| P2 | Branching graphs and predictive/personalization experiments. | Recovery/authority proof and controlled outcome lift. |

Use keyless offline fixtures plus separate live provider smoke checks. Start question bundles as versioned code assets; editable stored definitions require versioning, validation, review, tenant isolation and a migration. The current definitions schema accepts flow, record_type, bot and kit; no arbitrary question kind exists. An HTTP adapter inside the Worker is acceptable; the documented JavaScript SDK targets Node.js 20+, so verify runtime compatibility before adoption. [TypeSafe API](https://docs.typesafe.ai/api), [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript).

## 16 = Risks, limits and architecture test

| Risk | Control or evidence needed |
| --- | --- |
| Confident wrong judgment | Whole-route labels, consequence-aware gates and source-linked review. |
| Prompt injection from records/messages | Treat text as data; filter action candidates; keep authorization deterministic. |
| Missing candidate or source | Measure recall; widen retrieval or ask for input. |
| Stale state | Dependency invalidation, immediate correction overlay and live commit checks. |
| Correlated model errors | Evaluate composed outcomes; never multiply primitive probabilities as proof. |
| Language/transcript errors | Measure actual operating slices and capture quality. |
| Provider outage or quota | Reservation, bounded retry, manual/default path and capacity agreement. |
| Hidden costs | Full ledger: data, model, channel, rendering, storage, review and retries. |
| Visual overclaim | Render/inspect sites; text judgments cannot verify pixels. |
| Bad memory update | Scoped source relations, conservative correction and explicit deletion lifecycle. |
| Architecture sprawl | Reuse gateway, catalog, Turso and one Jev module until measured need. |
| External terms | Verify current provider access, data handling, pricing and permitted outreach. |

### 16.1 = Complexity budget

| Avoid by default | Use first |
| --- | --- |
| One language agent and prompt stack per domain. | Shared Jev compiler plus domain rubrics. |
| Second tool list for forms, Bots, Flows or providers. | Versioned eligible action catalog and adapters. |
| Separate runtime per Bot. | Bot grants over common runner and gateway. |
| Generative JSON for every extraction. | Source spans, Choice and code normalizers. |
| Prompt checks for schemas, money or permissions. | Deterministic compiler and domain rules. |
| Full prose rewrite of every brief. | Selected source blocks and templates. |
| Model call per site slot or visit. | Approved precomputed page plans. |
| Freeform planner for every Flow. | Recipe selection and compiler. |
| Reclassification on every screen. | Reusable assessments with dependency invalidation. |
| Full-history memory rebuild per event. | Entity-scoped retrieval, overlay and incremental packs. |
| Vector database or feature platform on day one. | Existing storage and text lookup until measured recall needs more. |
| Generic semantic guard on every effect. | Exact invariants and targeted support checks. |

**Architecture test = adding a domain mostly adds catalog contracts/adapters, domain rules, rubrics, recipes, templates and tests.** If it demands a new authority source, agent loop or general planner, first test whether the shared core already expresses it.

**TAR = reusable core + domain rules + shared semantic assessments. Jev proposes; code composes; the gateway validates and commits; evidence makes each outcome reviewable.**
