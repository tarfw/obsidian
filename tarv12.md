# TAR v12: Architecture handbook

> 🧠 Brain understands and coordinates. 🙌 Hands act through the Gateway. 🗃️ Files preserve truth, context and work.
>
> One business platform. One TAR assistant. One action boundary. Durable tasks and Flow Books.

| Document | Meaning |
| --- | --- |
| Status | Chosen target architecture, reviewed 2026-09-24. It is not a claim that every part is built. |
| Scope | App, Worker, Contacts and Relationships, Brain, Hands, Files, goals, tasks, Action Gateway, Jev, Flow Books, business domains, channels, memory, economics and delivery. |
| Authority | This is TAR's sole consolidated architecture target. Older architecture files and techstack.md are historical inputs. |
| Proof | Code and tests establish implementation; measured outcomes establish accuracy, capacity and economics. |
| Naming | Target Turso tables and columns use one semantic lowercase word. Qualify through structure, such as `records.owner`. Migrate deployed spellings deliberately; preserve external spellings behind adapters. |

## Start here: TAR in five minutes

**TAR helps a business finish work and show what happened.** A person can use a form, a domain screen or one TAR conversation. The same actions and permissions apply whichever entry point they choose. This is the target product; the status table in section 0.2 says which parts exist today.

Imagine a customer asks for a quote:

1. TAR finds the permitted customer, product and price records. Sales rules calculate the quote; a model may help interpret an ambiguous request, but it cannot set the price or grant permission.
2. TAR saves a draft and creates a task if someone must review it. The Inbox and conversation show the same work item.
3. The Action Gateway checks the current actor, data versions, consent and approval before sending. It stores the accepted effect and its provider receipt.
4. If the customer replies tomorrow, saved task state tells the runner what to do next. No computer or model has to stay awake overnight.

| Term | Plain meaning | Quote example |
| --- | --- | --- |
| Shared core | Common identity, records, action catalog, Gateway, tasks and recovery. | Checks who may read, approve and send. |
| Contacts and Relationships | Shared people, organizations and their time-bound roles; a contact is not automatically a lead. | Malar may be a buyer at one organization and a supplier contact at another. |
| Domain package | Exact records, rules, actions and views for a kind of work. | Sales defines quotes; Purchasing defines purchase orders. |
| TAR assistant | One conversational way to find evidence and request eligible work. | “Prepare a quote for Malar.” |
| Goal and task | An outcome to pursue and a bounded work item toward it. | Win the sale; get this quote reviewed. |
| Flow Book | A reusable, versioned process made from registered actions. | Follow up after an approved quote. |
| Run | One saved execution of a task or Flow Book. | This quote's follow-up, including its waits and receipts. |

**Example: turn business expertise into a customer experience.** A veterinary supplier contributes its product knowledge and meeting tips. TAR combines the relevant domain package and a reviewed Flow Book to offer attendees a customer-facing chat: “Who am I meeting?” can return a useful meeting brief. The supplier provides the expertise; TAR provides the shared platform and governed actions, so the supplier does not have to configure agent machinery. This is an illustrative product pattern, not a claim that this specific integration exists today.

~~~text
Vet supplier's knowledge
  (products, expertise, meeting tips)
              |
              v
        TAR domain package
        + Flow Book
              |
              v
      Customer-facing chat
              |
        attendee asks:
       "Who am I meeting?"
              |
              v
    TAR returns a useful brief
~~~

**The simple rule:** a contact identifies who is involved; a relationship says how they are connected; a business record holds what happened; a Flow Book describes how repeatable work proceeds. A known one-step action runs directly. An unfamiliar multi-step request may need a bounded plan. Every accepted change and external effect still goes through the Gateway. TAR first uses domain code, then a provider API, then a temporary browser for a website-only operation, and finally a temporary computer sandbox when real OS software is required. Browser and computer execution are planned capabilities, not current defaults.

**What exists now:** the Worker, workspace storage, an action catalog, a Gateway path, POS and site features, and basic Flow definitions. **What needs to be built or proven:** full durable step execution and recovery, ongoing goal/task supervision, Jev integration, more commerce domains, and governed browser/computer adapters. See section 0.2 for the precise status.

**Choose a reading path; you do not need the whole handbook:**

| If you want to understand... | Read |
| --- | --- |
| The product and one business journey | This guide, then sections 1 and 7. |
| How work runs and recovers | Sections 3 and 8. |
| What to build next | Sections 0.2 and 15.2. |
| The app experience | Sections 10.2 and 10.3; open [the mobile concepts](tar-mobile-concepts.pen) for screens. |
| Data, security, models or cost | Go directly to sections 2, 3, 4, 6 or 14. |

## 0. Architecture at a glance

### 0.1 The system in one diagram

**Brain / Hands / Files is TAR's reading map and ownership model.** These are logical boundaries in the existing platform; they do not require three services or three agents. Files includes databases and object storage. Identity, authority, recovery and measurement apply across all three. The goal is minimum necessary complexity, with measured cost and completion quality.

| Part | TAR responsibility | Default implementation |
| --- | --- | --- |
| 🧠 Brain | Understand a request, retain a goal, select the next eligible step, wait and resume. | Worker code + shared Jev judgments + optional LLM; one task/Flow runner backed by Cloudflare Workflows. |
| 🙌 Hands | Read permitted evidence and perform a validated action. | One Action Gateway and catalog; direct domain/provider adapters first, browser or isolated compute when required. |
| 🗃️ Files | Keep business truth, execution receipts, sourced context and reusable work after compute stops. | Turso per workspace + D1 control + R2 objects; versioned skills and source in repositories. |

~~~text
+--------------------------------------------------------------+
| TAR APP = Expo / React Native                                |
|--------------------------------------------------------------|
| Space | Inbox | Ask TAR | POS | Site Studio | forms                 |
| SQLite = permitted projections + drafts + offline queue      |
+--------------------------------------------------------------+
                               |
                               | authenticated request / sync
                               v
+--------------------------------------------------------------+
| CLOUDFLARE RUNTIME + SCOPED STORES                           |
|--------------------------------------------------------------|
| Ingress -> identity + tenant -> accepted request/event       |
|              |                                               |
| BRAIN: exact code / Jev / bounded planning                   |
|        goals + tasks + Flow Books -> durable runner          |
|              |                                               |
| HANDS: Action Gateway -> domain / provider / optional tool   |
|        outbox + receipts + reconciliation                    |
|              |                                               |
| FILES: Turso truth + context | D1 control | R2 assets        |
+--------------------------------------------------------------+

~~~

The user can ask, correct, pause and return later through the same assistant. Closing the app leaves accepted work durable. An idle goal needs stored state and a future event or due time; it does not need a live model loop or a permanent computer. Brain and background memory jobs access Files directly. Hands receive only the data and temporary execution resources needed for the current task.

**Target app core.** These are shared product surfaces, not separate agents or installations. Section 0.2 distinguishes the present app from the target.

| App surface | Always-available job | Opens when needed |
| --- | --- | --- |
| Space | Home for outcomes, records, Contacts and Flow Books. | Domain views such as POS, Sales or Site Studio when relevant. |
| Contacts | Find people and organizations; inspect relationships, current work and history; start an eligible action or Flow Book. | A relationship, opportunity, purchase, booking or member detail. |
| Inbox | Approvals, waits, exceptions, suggestions and conversations that need attention. | The same canonical task, proposal and receipt shown elsewhere. |
| Ask TAR | One main conversation plus named work conversations. | A bounded task, direct action or Flow Book request. |
| Search and Settings | Find permitted records; manage workspace, connections, budgets and access. | Contextual forms and domain configuration. |

Keep `Space | Inbox | Ask TAR` as mobile bottom navigation. Flow Books are opened from Space; they do not require a separate bottom tab. Contacts is prominent inside Space and available from search, the composer and relevant records. A walk-in sale or anonymous enquiry can begin without creating a contact.

**Target Worker core.** Each app entry point uses these same contracts; section 0.2 records what exists today.

| Worker capability | Shared responsibility |
| --- | --- |
| Identity and access | Authenticate members, resolve workspace and enforce current record and action scope. A business contact is not an authenticated member. |
| Contacts and records | Persist sourced people, organizations, relationships and domain records; validate versions, consent and exact business rules. |
| Action Registry and Gateway | Expose eligible typed actions; validate grants, approvals, replay keys and every accepted effect. |
| One harness and runner | Route exact commands or bounded judgments, supervise tasks, execute pinned Flow Books, wait and resume. |
| Model adapters | Use Jev for typed selection among permitted candidates and an LLM only for needed prose or novel plan drafts; code validates both. |
| Connections and effects | Keep credentials server-side; use domain/provider adapters first; persist outbox intent, receipts and reconciliation. |
| Durable Files | Use Turso workspace truth, D1 identity/control and R2 artifacts; search and memory read only permitted evidence. |
| Notifications and budgets | Dispatch due/event work, apply spending limits and report meaningful changes without keeping a computer running. |

### 0.2 What exists, what is planned

| Area | Built or present in repository | Target or unproven |
| --- | --- | --- |
| Worker | Cloudflare Worker; D1 identity and membership; Turso workspace schema; R2 patterns; gateway action path. | Full cross-domain coverage, durable effect reconciliation and load proof. |
| Actions | Shared catalog across the [Worker](tarharness/src/registry/catalog.ts) and POS packages; new person, organization, relationship and Flow Book actions use the Gateway. | Versioned schemas and contracts for reads, external tools, human waits and AI steps. |
| Gateway | Registered action lookup, eligibility and typed-command replay in [gateway actions](tarharness/src/gateway/actions.ts). Jev and web-search calls now claim a turn before paid work, so a concurrent request with the same key waits for the saved result. The legacy direct definition-publish route was removed. | Generalized claim/replay across every command and channel; unified effect and trace contracts. |
| Flows | Standalone `book.*` definitions no longer need a Bot. Each publication preserves an immutable edition. `flow.start` snapshots ordered actions; `flow.advance` saves manual progress. A local Cloudflare Workflow adapter and D1 dispatch intent now run reviewed internal steps with pinned literal input and current member checks. The app has a Flow Books tab with start, resume and running/blocked states. | Prove Workflow crash/replay/revocation and live dispatch; typed inputs and output mapping; durable human waits, approval and effect reconciliation; broader action support; branching later. |
| Ongoing agent | Record/task primitives and the assistant concept. | Goal/task contracts, bounded supervision, proactivity, task continuity and Workflows execution; these are new target additions. |
| Files and tools | Turso records/events, repository assets and R2 patterns. | Scoped memory maintenance, reviewed skills, artifact lifecycle, connection grants and isolated browser/computer execution. |
| Legacy Bots | Bot installation, directory routes and Bot UI are removed. New definitions permit only `flow` and `record_type`; an existing-workspace patch converts safe published recipes into manual Flow Books and archives remaining Bot/kit recipes while retaining history. | Review converted books with owners, validate grants, migrate useful recipes into maintained starter books and remove archived legacy rows only under a separately approved retention policy. |
| App | Expo app, POS and site paths, [app AI helpers](tarapp/src/lib/ai.ts). | Fully proven offline sync, shared concept screens and expanded domains. |
| Jev | A Worker HTTP adapter asks Jev to suggest one first step from six registered actions. The user reviews and accepts or discards it; Jev cannot run or publish the action. | Calibrated route thresholds, reusable assessments, labeled evaluation and measured latency/cost gates. |
| Contacts | `contact.create` and `organization.create` create separate identities. The workspace `links` table stores dated person-to-organization roles; record details show the timeline and can end an active role. Server-side contact search and pagination feed the Records contact view, and a contact can start a published Flow Book with that record linked. Explicit channel/purpose consent decisions with a source now have append-only history; no contact field implies consent. Existing databases receive schema patches on open. | Indexed verified-channel lookup, consent enforcement on future customer-message actions, duplicate review, and broader contact-started direct actions. |
| Domains | POS and site paths plus template examples. | Complete Sales, Services, Support, Purchasing, Finance and messaging action packages. |
| Economics | Planning scenarios in this handbook. | Measured provider spend, capacity, conversion, corrections and full margin. |

### 0.3 Rules that govern every chapter

| Rule | Operational meaning |
| --- | --- |
| Meaning = bounded judgment | Jev chooses or scores within supplied, authorized evidence. |
| Truth = authoritative record | Models never establish a payment, stock level, balance, permission or completed provider effect. |
| Authority = gateway | Every accepted mutation and consequential effect passes current policy and validation. |
| Structured input = zero inference | A valid button or typed form does not need Jev. |
| Reuse = dependencies | A completed assessment may serve several surfaces until evidence or question meaning changes. |
| Cost = complete outcome | Compare cost and latency per correctly completed workflow, including providers and human correction. |
| Proposal is not approval | A Flow Book, model answer or saved draft cannot expand a grant or preapprove a future effect. |
| Continuity = durable work | The task, evidence and next wake survive compute replacement; a chat transcript alone is insufficient. |
| Initiative = configured scope | A goal or watch has an owner, sources, limits and stop condition. Suggestions never create their own execution authority. |
| Capability = contract | A skill, model, browser or generated script cannot add a callable action or bypass the Gateway. |

## 1. Product and domain model

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   Sites    Contacts   Sales   Commerce  Products   Support   Campaigns
   Content  People +   Quotes  Payments  Services   Returns   Renewals
            relations
                               |
                   Team + Stock + Purchasing + Finance + Reporting
~~~

| Capability | Records and work | Shared core it uses |
| --- | --- | --- |
| Sites | Pages, content, forms, enquiries, checkout, releases. | Gateway, catalog, assessments, outbox. |
| Contacts and Relationships, shared | People, organizations, time-bound roles, channels, consent and source-linked activity. | Workspace records, access, search, evidence and Gateway. |
| Sales, when relevant | Opportunities, quotes, follow-up and conversion. A pipeline is an optional view of opportunity states. | Catalog, assessments, Flow Books and channels. |
| Products | Catalog, variants, stock, purchasing, reservations. | Domain rules, live commit checks. |
| Services | Offerings, resources, availability, bookings, completion. | Calendar code, gateway, Flows. |
| Commerce | Orders, invoices, payments, fulfilment, subscriptions, refunds. | Transactional records and effect receipts. |
| Support | Tickets, conversations, priorities, returns, resolution. | Inbox, retrieval, reply checks. |
| Operations | Suppliers, purchases, receiving, shipping, team, approvals. | Tasks, waits, outbox. |
| Finance | Postings, balances, reconciliation, reporting, exports. | Exact arithmetic and trace. |

**Contact-first record model.** Contact is the app's name for a `person` or `organization`, not a third identity table. These identities are stable within a workspace. A `relationship` links two permitted subjects, such as person to organization, organization to workspace, or person to workspace, with role, start/end, status and source. A job change closes the old relationship and creates a new one; historical quotes and purchases keep their original organization. A contact never has one global lead stage. Identity matching proposes candidates; uncertain merges require review and preserve source history. Do not infer consent from an address, relationship or Flow Book. Record it for the actual channel, purpose and workspace with evidence.

Use `records.type` values `person`, `organization` and `relationship` with validated payloads before adding physical tables. Relationship fields such as `subject`, `target`, `role`, `started`, `ended`, `state` and `source` each use one lowercase semantic word. Authenticated members remain D1 identities; onboarding may begin from a person contact, but only a verified invitation and authorized role assignment create membership. Walk-in work can remain unlinked to a person. Contacts never merge across workspaces merely because names or phone numbers match.

**Domain package = business records + exact rules + catalog actions + candidate retrieval + Jev rubrics + starter Flow Books + views + tests.** A domain does not get a second gateway, model router, authority source or agent runtime. Contacts and Relationships are shared capabilities; Sales, Purchasing, Services and other packages add the specific business truth. Flow Books coordinate their actions but cannot replace quotes, orders, memberships, consent or receipts.

| Question | TAR answer |
| --- | --- |
| Who is involved? | A person or organization contact. |
| How are they connected? | A sourced, time-bound relationship. |
| What business work exists? | A domain record such as opportunity, purchase, booking or ticket. |
| How should work proceed? | A direct action for one step or a reusable Flow Book for a process. |
| Where is a sales pipeline? | An optional Sales view of opportunity records; book runs may advance verified stages through registered actions. |

A workspace can publish a Sales pipeline recipe as a Flow Book when its stages form one bounded process. Longer journeys use small books linked by verified opportunity, quote and order events. The optional pipeline screen groups those records by current stage; it does not become the source of truth or a requirement for other businesses.

| Workflow | Bounded judgment | Code and evidence | Outcome to measure |
| --- | --- | --- | --- |
| Contact capture and duplicates | Select source roles; relate plausible pairs. | Exact identifiers, source versions and review before merge. | Field precision and false merges. |
| Sales and quotes | Score need/timing/fit; select offering. | Consent, pricing, stock and quote arithmetic. | Accepted leads, quote correction and conversion. |
| Catalog and POS | Select product/modifier; rank allowed substitutes. | Compatibility, quantities, tax and current stock. | Whole-cart correctness and counter time. |
| Services and operations | Match job/resource; interpret supplier terms. | Calendar, capacity, purchasing and receiving rules. | Booking correction and shortage resolution. |
| Commerce and finance | Select amount roles or ambiguous matches. | Provider receipts, ledger arithmetic and approval. | Reconciliation errors and review time. |
| Support and retention | Classify issue/reason; select cited evidence. | Policy eligibility, exact claim checks and channel consent. | Resolution, unsupported claims and unwanted follow-up. |
| Sites and campaigns | Select approved variant/content for a permitted segment. | Publication, consent, experiment assignment. | Conversion lift, accessibility and unsubscribe rate. |
| Reporting and knowledge | Select supporting blocks and open-text categories. | SQL totals, source links and scenario labels. | Useful evidence recall and false causal claims. |

Investigation = code detects a measured signal -> domain rules test reviewed causes against data -> Jev may judge cause/action fit among eligible candidates -> code labels scenarios and commits only an authorized action. Start with ordinary records and relationships; add graph or predictive infrastructure only after measured need.

## 2. Platform, data and offline boundary

| Layer | Choice | Boundary |
| --- | --- | --- |
| Phone | Expo / React Native + SQLite. | Permitted projections, recent reads, forms, drafts, offline queue. |
| API | Cloudflare Worker. | Identity, action gateway, Jev adapter, task supervisor and channel ingress. |
| Control | D1. | Identity, membership, reservations and control-plane state. |
| Workspace | One Turso database per workspace. | Business records, definitions, runs, events and command log. |
| Objects | R2. | Files and immutable site assets; records store references and hashes. |
| Async | Cloudflare Workflows behind one shared runner; durable intent/outbox in Turso; one bounded scheduled dispatcher. | Target choice, not an installed integration. Workflows owns execution checkpoints; Turso owns business/run evidence. Reconcile provider results before a non-idempotent retry. |
| Optional compute | Browser or isolated service only when a measured workflow needs it. | Temporary sessions; select an executor after workload and boundary tests. |

**Runtime decision:** retain the Cloudflare stack. Use Workflows for durable task episodes and Flow runs, and a scheduled Worker to dispatch due occurrences and repair missed dispatch. Direct reads and single transactions stay ordinary Worker requests. Add a queue only when measured throughput/backpressure requires it; do not introduce a second orchestration framework. Workflows can persist steps and wait for external events, but retries still require TAR's own effect identities and reconciliation. [Workflows](https://developers.cloudflare.com/workflows/), [retry rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/).

### 2.1 Turso schema: physical state today

The deployed workspace database has general tables including `definitions` for versioned definitions, `records` for business objects, `runs` for Flow execution state and `events` for accepted commands and receipts. D1 holds identity and membership; R2 holds referenced objects. POS data currently uses typed `records` and POS indexes, not a separate table per record kind. The authoritative deployed columns and indexes live in [`tarharness/src/db/schema.ts`](tarharness/src/db/schema.ts) and [`tarharness/src/pos/store.ts`](tarharness/src/pos/store.ts). Existing Bot and kit rows are archived on workspace open and retained for audit.

The deployed schema is not silently renamed by this handbook. The one-word vocabulary below is the **target for new internal DDL and deliberate migrations**. Preserve existing data, replay identities and external API spellings through adapters until a versioned migration is complete.

### 2.2 Turso target: minimum durable additions

Do not create one table per Flow, tool or commerce domain. Reuse `definitions`, `records`, `runs` and `events` where their semantics and indexes fit. Add a physical table only when an independent lifecycle, transaction boundary or query/uniqueness requirement needs it. The following are proposed entities, not existing migrations or final DDL. Historical `bot` and `kit` rows are archived for audit; no target runtime depends on them.

| Proposed table | Durable responsibility | Minimum invariant / boundary |
| --- | --- | --- |
| `proposals` | Canonical precommit action proposal, source spans, candidate/action version, expected record versions and approval state. | A proposal cannot become an effect until the gateway rechecks current authority and versions. |
| `assessments` | Reusable live Jev judgment bundle, evidence fingerprint, model/question version and typed answers. | Scoped to workspace, evidence and expiry; evaluator results have a distinct purpose and cannot authorize actions. |
| `attempts` | Provider/model request attempt, usage, latency, outcome and retry link. | Preserve uncertain outcomes and reconcile before repeating non-idempotent effects. |
| `steps` | Durable per-step input/output references and business status for task episodes and Flows. | Unique step occurrence; advance only after committed receipt or explicit wait. Engine checkpoints do not replace effect evidence. |
| `effects` | Outbox intent and external receipt/reconciliation state. | Commit intent once; distinguish pending, confirmed, failed and unknown. |
| `approvals` | Human decision on an exact proposal/effect snapshot. | Expiry, actor authority and proposal version checked at acceptance. |

| Proposed contract on existing storage | Minimum change before use |
| --- | --- |
| `records.type` values `person`, `organization`, `relationship` | Define verified contact channels, workspace access, source-linked relationship endpoints and role history. Validate relationship changes and preserve the old link when a role ends. Review uncertain matches; keep member authentication in D1. |
| `records.type` values `goal`, `task`, `watch`, `conversation`, `artifact`, `connection` | Reuse records for independent user-visible objects. Define each payload, access policy, lifecycle and required index; retain the existing task interface through an adapter. No new table per kind by default. |
| Common `runs` contract | Add a discriminator `kind` with `flow` or `task`, and a `task` reference where applicable. Existing rows migrate to `flow`; existing flow reference columns remain required for flow runs and may be absent only for task episodes. Preserve existing replay uniqueness and add uniqueness for task + occurrence; do not rely on nullable flow keys to deduplicate task runs. |
| Tasks and watches | Store goal/source links, due time, budget/grant references, status and revision in validated record data; index due active work. A leased claim and advancing epoch fence competing workers and obsolete task revisions. |
| Connection metadata | Store provider, owner, scope, status and a server secret reference. Keep credential material outside records, model context, logs and R2 task artifacts. |

These are proposed contracts, not permission to send new payloads through existing endpoints without schema and policy changes. A conversation links messages, tasks and receipts; a task may serve a goal; several Flow runs may serve a task. They all use the same catalog and authority boundary. Private records stay inside their owning workspace and access scope; shared identity does not permit retrieval across workspaces.

Before Contacts rollout, define indexed lookup for normalized, verified channels and source IDs, plus time-ordered relationship history. Names and unverified phone/email values are search hints, not unique identity keys. A merge preserves aliases, source links, consent evidence and historical business references; the preview names every record it will affect.

**Target Turso names.** Every listed table and column is one lowercase semantic word, with no spaces, underscores, hyphens or joined words. Qualification comes from the table, such as `runs.definition` or `events.replay`. This is a vocabulary and relationship plan, not deployed DDL.

| Table | Target columns |
| --- | --- |
| `definitions` | `id`, `kind`, `name`, `version`, `state`, `data`, `created`, `updated` |
| `records` | `id`, `type`, `title`, `state`, `data`, `owner`, `assignee`, `due`, `version`, `created`, `updated`, `archived` |
| `runs` | `id`, `kind`, `definition`, `edition`, `occurrence`, `task`, `record`, `state`, `action`, `context`, `version`, `started`, `finished`, `created`, `updated` |
| `events` | `id`, `kind`, `run`, `record`, `action`, `state`, `actor`, `digest`, `replay`, `data`, `created`, `updated` |
| `proposals` | `id`, `task`, `action`, `actor`, `input`, `evidence`, `state`, `version`, `expires`, `created`, `updated` |
| `assessments` | `id`, `task`, `model`, `question`, `evidence`, `answers`, `scope`, `expires`, `created`, `updated` |
| `attempts` | `id`, `task`, `provider`, `request`, `state`, `usage`, `cost`, `started`, `finished` |
| `steps` | `id`, `run`, `action`, `occurrence`, `state`, `input`, `output`, `version`, `created`, `updated` |
| `effects` | `id`, `step`, `provider`, `replay`, `state`, `receipt`, `created`, `updated` |
| `approvals` | `id`, `proposal`, `actor`, `decision`, `expires`, `created` |
| `messages`, if needed | `id`, `conversation`, `task`, `speaker`, `body`, `sequence`, `replay`, `created` |

`runs.definition` refers to a Flow Book definition; `runs.edition` pins its published version, while `runs.version` is the run's own concurrency version. A task run uses `runs.task`. `events.digest` is the input hash and `events.replay` is its unique replay key. A Flow occurrence must be unique per definition; a task occurrence must be unique per task. Conversation sequence and effect replay keys also require uniqueness. Exact foreign references, nullability, retention and indexes are specified with each migration.

Use versioned migrations: add and backfill target columns, verify records and uniqueness, switch validated adapters, then retire old fields only after historical runs and clients remain readable. Start evaluation history in repository fixtures; add live tables only for independent workspace-visible lifecycles. Exact money, stock and provider receipt rules remain domain code regardless of storage shape.

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

## 3. 🙌 Hands: Action Gateway and catalog

### 3.1 One callable boundary

~~~text
+--------------------------------------------------------------+
| 1 CATALOG                                                    |
| One versioned contract per callable capability.              |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
| 2 ELIGIBILITY                                                |
| Intersect workspace, actor, record, Flow, connection         |
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
| scope, grants, connection | Record access, actor role, Flow grant and account scope. |
| approval | Exact effect and required human authority. |
| cost, budget | Maximum charge class, reservation and reconciliation. |
| timeout, retry, receipt | Recovery and provider completion policy. |
| source | Required evidence and provenance. |

**Eligibility = registered capability AND workspace configuration AND actor access AND record access AND connection scope AND current policy.** A Flow adds its published action grant and run authority. Interactive actions use the person's live identity; event/scheduled runs use an explicit workspace automation identity, owner and grants. Catalog roles alone are insufficient. Recheck on every resumed consequential step.

| Execution path | Contract |
| --- | --- |
| Read | Apply access and evidence limits; do not create business truth. |
| Mutation | Validate types, domain rules, versions and replay; commit through workspace gateway. |
| External effect | Commit intent/outbox first; dispatch, record receipt and reconcile uncertain completion. |
| Human work | Persist a wait tied to exact proposal; resume only after authorized response. |
| AI step | Declare evidence, question/generation contract, budget and accepted outputs. |

Provider brokers such as treg or managed action catalogs may supply operations through adapters. Each operation needs a TAR contract, workspace connection, price cap and bounded grant. A provider's growing tool list cannot silently grant a Flow more actions. Credentials stay server-side. Internal helper functions and UI navigation are not automatically gateway actions.

### 3.2 Commit and replay

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

### 3.3 Connected apps and optional computer tools

**Choose the least expensive executor that can correctly complete the authorized action.** Tool choice cannot weaken a grant, a receipt requirement or a data boundary.

| Need | First executor | Escalate when |
| --- | --- | --- |
| Business read, calculation or mutation | Typed domain action in Worker code. | An external system owns required evidence or effect. |
| External evidence or effect | Scoped provider API adapter. | A required supported operation has no usable API. |
| Website interaction | Isolated browser session with a scoped action plan. | The task needs software beyond the browser. |
| File transformation or generated code | A bounded helper; isolated execution for untrusted code. | A real OS, package manager or native library is required. |
| Full computer | Temporary sandbox with explicit resource and data limits. | Persist only approved outputs; release compute when idle or finished. |

| Connection lifecycle | Required behavior |
| --- | --- |
| Connect | Authenticate the person and workspace; show actual provider read/write scopes and supported actions. The requested connection never enlarges their business role. |
| Use | Trusted adapter obtains only its own server credential. Inject credentials at the authorized service boundary; the model and generated code receive no raw secret. |
| Renew | Refresh or ask for reconnection; pause dependent dispatch when access expires. Persist task intent while disconnected. |
| Restrict or revoke | Check live grants before each new dispatch; invalidate cached eligibility, close dependent sessions and revoke provider access where supported. Already completed effects remain visible. |
| Inspect | Settings shows owner, allowed actions, scopes, expiry, recent usage and disconnect; sensitive changes use explicit structured controls. |

The browser/sandbox adapter is itself a governed executor. All network egress, including page loads, redirects, subresources, uploads and generated-code requests, must pass an enforcement boundary outside agent control. Bound destinations and permitted data; block private infrastructure access and recheck redirects/resolved destinations. A general browser grant cannot authorize a purchase, message, publication or private-data transfer. Those need the same exact effect proposal and policy as an API action. If the chosen service cannot enforce a required boundary, that route stays unavailable or hands the step to a person. A model's safety judgment alone is insufficient. This requirement is informed by [Muse's separation of runtime, credentials and egress authority](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse); TAR enforces its own rules through the Gateway and trusted adapters.

Each session has a workspace/task owner, permitted inputs, lifetime, cost ceiling and output manifest. Use isolated scratch space and a minimal approved tool image; never expose database credentials or another task's cookies/files. Logs redact secrets and private payloads. Browser login and verification use a secure user handoff outside chat; redact credential fields from captures. Files downloaded from sites and instructions found in repositories remain untrusted input. A sandbox can return evidence or a draft; saving, sharing, publishing and provider effects follow registered actions.

### 3.4 Autonomy controls

| User choice | Meaning |
| --- | --- |
| Suggest | Prepare evidence and proposals; the person initiates consequential work. |
| Ask | Carry out permitted reads and drafts; request any approval required by the action and workspace policy. |
| Act within limits | An explicit task or automation grant permits an exact action subset, account/recipient scope, budget and expiry; policy can still require approval for an individual effect. |

These are settings on the existing authority model. A chat request can authorize its stated scope where policy allows; accepted work does not repeatedly request the same permission. Inferred preferences and memory never grant authority. Pausing a goal or revoking a connection stops future dispatch even if an earlier plan or workflow checkpoint allowed it. An attempted effect with uncertain completion remains subject to reconciliation.

## 4. 🧠 Brain: Jev judgment module

**Jev = one shared server module**, with provider adapter, versioned questions, result validation, assessment reuse, budget and traces. Domain packages supply candidate retrieval and rubrics. Routing, tagging, relating, extraction checks and layout selection are uses of the same three primitives.

| Primitive | Answer means | TAR uses | Important limit |
| --- | --- | --- | --- |
| Choice | One of supplied competing options; distribution and confidence. | Action, recipe, contact, source span, item, layout. | Include none/other if shortlist may miss; cannot pick omitted candidate. |
| Noul | Probability that one proposition is true. | Refund requested, urgency, topic, missing detail, claim support. | Use one per independently applicable label; no separate confidence field. |
| Score | Position on ordered concrete levels; distribution and confidence. | Severity, relevance, readiness, fit, coverage. | A level is not probability of business success; compare only common rubrics. |

Choice and Score confidence describe distribution concentration. It does not establish whole-workflow correctness or authorization. A Noul near 0.5 = uncertain yes/no, not medium intensity. [TypeSafe primitives](https://docs.typesafe.ai/primitives) and [confidence](https://docs.typesafe.ai/confidence).

### 4.1 TAR's judgment contract

Code retrieves permitted evidence and a small eligible candidate set before Jev runs. Jev answers only the narrow semantic questions that code cannot settle exactly; independent questions may share one state. Code then validates fields, source relationships and business rules. Missing evidence causes retrieval or clarification, not an invented answer. [TypeSafe's building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) covers the general programming model.

| Situation | TAR response |
| --- | --- |
| Valid button, form, calculation or exact identifier | Use code; zero model calls. |
| Ambiguous action, contact, item or source span | Use Choice over authorized candidates with a no-match route; check shortlist recall. |
| Independent yes/no requirements or graded fit | Use targeted Noul or Score questions with versioned rubrics. |
| Answer changes what evidence is needed | Fetch that evidence, then make a second bounded judgment. |
| Scanned or spoken input | Preserve OCR/transcription uncertainty and source spans; normalize dates, amounts and quantities in code. |
| Evidence, candidate set, rubric or time assumption changes | Invalidate only affected assessments and recheck current access. |

Question assets and accepted assessments record their model, evidence, candidate order, scope and versions. A typed answer is a judgment, not a business fact, permission or receipt. [TypeSafe primitives](https://docs.typesafe.ai/primitives) and [confidence](https://docs.typesafe.ai/confidence) provide primitive-specific details.

### 4.2 Route and acceptance

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

### 4.3 Bounded interactive assistance

| Trigger | Shared state and questions | Code response |
| --- | --- | --- |
| User submits a free-text request or edited draft | Authorized message, active form, eligible actions and relevant facts; Choice for intended action, Noul for independent missing requirements. | Show a prefilled proposal and the specific missing field; person reviews before commit. |
| User selects a structured action with valid fields | No Jev call. | Validate and send to gateway. |
| Candidate set or relevant evidence changes | Reassess affected questions only. | Retain the draft, show changed fact and ask for review. |

Do not infer on every keystroke or every screen view. Prefer submit, explicit assist or a meaningful state change. Measure whether assistance reduces correct-task completion time after review, including network and correction time. The form never treats a high model probability as permission or proof of an external effect.

## 5. Assessment, trace and reuse

**Assessment = completed, reusable judgment. Attempt = provider call. Proposal = composed candidate action. Command = accepted gateway effect.** Keep separate identities and link them.

| Stored item | Required fields |
| --- | --- |
| Assessment | tenant, task, stage, model, question bundle, source/version, candidate order, answers/distributions, dependency hash, access scope. |
| Attempt | request/response status, usage, reservation, latency, cost, timeout or unresolved completion. |
| Proposal | evidence and consumed assessments, selected arguments, missing fields, policy version and status. |
| Command/run | actor, channel, input hash, approvals, accepted state, effects, receipts and outcome. |

For each Jev-assisted route, link these existing records into one inspectable decision trace: eligible candidate IDs and versions, selected ID or no-match, host acceptance or rejection reason, fallback used, and the resulting command/run outcome. Record a stale or invalid selection as rejected before fallback; never count the fallback or a worker's successful result as a Jev selection win. This is a trace contract across assessments, proposals, attempts and receipts, not a second action authority or a required new table.

Reuse identity = tenant + access scope + evidence versions + candidate set/order + question meaning/version + served model + relevant policy + locale/time assumptions. A changed display weight or acceptance threshold can recompute over unchanged raw answers. Changed evidence, rubric, candidates, model or time assumption requires affected reassessment. Check access before reuse and again before execution.

~~~text
new enquiry -> assess topic + urgency + readiness + missing detail once
             -> Inbox | Contacts | Sales | Search | Review | Reporting
changed UI ranking weight -> recompute in code; zero new inference
changed message or offering -> invalidate affected assessment
~~~

| Event assessment rule | Implementation boundary |
| --- | --- |
| At verified ingress | Persist/deduplicate the event, resolve workspace and access, then collect the smallest authorized state. |
| One shared pass when useful | Batch independent topic, urgency, intent and missing-detail questions; skip questions already answered exactly by structured input. |
| Reuse across surfaces | Inbox, Contacts, Sales and reporting consume the same completed assessment with their own code policies; no surface gains new authority. |
| On changed facts | Recompute only affected judgments; check access again before reuse and current rules again at commit. |
| At scale | Compare selective, sampled and every-eligible-event assessment on real traffic; choose by correct outcomes, capacity and full cost. |

Do not make a universal cache from identical text alone. Pending and failed attempts are not completed assessments. An uncertain completed judgment may be reusable without being acceptable. Critical current facts such as stock and refund eligibility must be recomputed in code at commit.

## 6. Budget, provider limits and economics

### 6.1 Runtime budget

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
| Per goal/task | One shared allowance for model calls, tools, compute, notifications and recovery; child work draws from it. | Reserve before dispatch, account for actual spend, stop optional work at the limit and show the next decision. |
| Background | Relevant events and due work only; coalesce repeated signals. | No relevant evidence/time/dependency change means zero model calls; memory maintenance reads only changed scopes. |
| Site view | Zero Jev calls. | Serve saved default or approved plan. |
| 401/422 | Authentication/validation error. | Repair request; no blind retry. |
| 429/529 | Throttle/overload. | Bounded deadline-aware backoff. |

The [model page](https://docs.typesafe.ai/models) owns current provider limits; these values are a dated architecture snapshot.

### 6.2 Cost ledger

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

**Illustrative heavy-use comparison (checked 2026-09-25).** The same monthly input volume is sent to either model; Flash returns an assumed 200 output tokens per call, while [Jev bills input only](https://docs.typesafe.ai/models). Use the INR 95/USD planning conversion above, with cache misses, no retries and no other workflow costs. [InferX's discounted `deepseek-v4-flash-0731` rate](https://inferx.net/models/deepseek-v4-flash-0731) is USD 0.042/M input, USD 0.084/M output and USD 0.0084/M cached input; this is a provider-specific snapshot, not TAR's chosen generator or DeepSeek's official `deepseek-flash` price.

| Per user per month | Input / Flash output | Jev input + output | Flash input | Flash output | Flash total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Heavy: 5,000 calls x 4,000 input | 20M / 1M tokens | INR 79.80 + 0 = **79.80** | INR 79.80 | INR 7.98 | **INR 87.78** |
| Very heavy: 10,000 calls x 8,000 input | 80M / 2M tokens | INR 319.20 + 0 = **319.20** | INR 319.20 | INR 15.96 | **INR 335.16** |

More Flash output raises its total; cache hits can lower its input cost. Select a route by measured correctness, latency and full cost per completed task, not this token-price comparison alone.

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

### 6.3 Product credits

| Proposed product item | Customer-facing allowance |
| --- | --- |
| India paid plan | INR 500/month; 1,000 credits/month. |
| Credit face value | INR 0.10/credit. |
| Top-ups | INR 100/1,000; INR 500/5,000; INR 1,000/10,000 credits. |
| Owned workspace | 100 credits/month drawn from included grant. |
| Joined or personal workspace | No ownership charge under this proposal. |
| Manual actions and public browsing | Zero usage credits. |
| TAR assistant | 2/query proposal. |
| Messaging/Sales | 2 to 5/query proposal. |
| Sales/Growth | 10 to 50/query proposal. |
| Operations/Finance | 3 to 20/query proposal. |
| Site Builder | Zero credits within explicit bounded allowance. |
| Research/Intelligence | 2 to 100/query proposal. |

These are proposed product prices, not a live billing contract. Publish route prices or a maximum before charging. Credits are separate from provider cost and connected-account fees. Exhaustion pauses optional AI, not manual work. No duplicate charge for replayed accepted commands. Zero-credit site builds still consume real resources; measure full margin before claiming a floor.

## 7. 🧠 Brain: TAR assistant, goals and ongoing work

**No target Bot system.** Business domains, the Action Registry, Inbox, approvals, Flow Books and one TAR assistant belong to every workspace. A business configures its products, services, people and connections; it does not install a Bot to acquire actions. The old Bot directory is migration input, not a target runtime, grant source, memory silo or product prerequisite.

~~~text
CONTACTS + RELATIONSHIPS -> who and context
DOMAIN PACKAGE -> exact business records, rules and actions
STARTER FLOW BOOK -> optional repeatable process
                                       |
PERSON / EVENT / SCHEDULE -> contact detail, form or TAR assistant
                                       |
                         eligible Action Registry
                              |              |
                        one action      Flow Book run
                              \              /
                               Action Gateway
                                      |
                         Turso + outbox + receipts
~~~

The app and Worker core tables in section 0.1 are the shared default. Business areas expose eligible actions without installing a Bot or creating a domain agent. A workspace configures its contacts, offerings, team and connections; an action or book becomes usable only when its required capability, scope and policy exist.

| Business area | Exact records and rules | Starter Flow Book examples |
| --- | --- | --- |
| Sites and acquisition | Site, page, form, enquiry, campaign; publication and consent. | Enquiry capture; site review and publish. |
| Contacts and team | Person, organization, relationship; verified member identity and roles. | Member onboarding; relationship review. |
| Sales, when relevant | Opportunity and quote; pricing, stage evidence and consent. | Enquiry to quote; follow-up. An optional pipeline view groups opportunity records. |
| Products and POS | Product, price, stock, register, cart; tax, stock and checkout. | Low stock review; order preparation. |
| Services | Offering, resource, slot, booking, job; capacity and time. | Booking confirmation; service completion. |
| Commerce and delivery | Order, invoice, payment, shipment, subscription, return; provider receipts. | Order fulfilment; return approval. |
| Support and retention | Conversation, ticket, resolution, renewal; consent and policy. | Support triage; renewal follow-up. |
| Purchasing and finance | Supplier relationship, purchase, receipt, posting, reconciliation; exact balances. | Supplier order; payment reconciliation. |
| Reporting | Report and sourced metrics; access and exact totals. | Daily exception review. |

These are target capabilities, not a claim that all actions or starter books already exist. Starter books are visible as examples and remain inactive until configured and published; unattended triggers need separate enablement. Manual single actions remain direct Gateway calls. The full cycle uses small books linked by verified events, not one book that owns the business.

| Ask surface | Scope and behavior |
| --- | --- |
| TAR assistant | One entry point; exact commands use code, ambiguous requests use bounded Jev over eligible actions, novel prose/composition may use an LLM. |
| Personal view | Private goals, notes and activity for one identity; current workspace access still governs every read/action. |
| Domain screen | Contacts, POS, Sales, Site Studio and other relevant views use the same contracts; a button never needs an assistant round trip. |

### 7.1 Goals and tasks

**Goal = an owned outcome. Task = a bounded piece of work. Flow Book = a reusable process. Run = one execution.** A request can use one action without creating a goal. Create ongoing work only when the person requests it or an enabled recipe explicitly defines it.

| Contract | Required meaning |
| --- | --- |
| Goal | Owner, scope, desired outcome, evidence of completion, deadline where relevant, budget, grant references, state and revision. Progress comes from observations or user acceptance; avoid invented percentages. |
| Task | Optional goal, conversation/source, bounded objective, current plan revision, next action or wait, result/artifact references, due time and stop reason. Reuse the existing task record with a deliberate contract migration. |
| Watch | An explicitly enabled source/condition with owner, linked goal/task, recurrence or event subscription, expiry, budget and notification policy. It observes within a grant; it cannot expand one. |
| Conversation | Persisted messages with speaker, workspace, access, source and task correlation. Main chat is private to its owner within the selected workspace; sharing requires an explicit audience. The active task can be resumed from another permitted channel without exposing unrelated conversations. See §10.3. |

Task lifecycle meanings are accepted work, active work, waiting, paused, completed, failed and cancelled. Map existing task/run state spellings through adapters during migration. Waiting records its dependency and due time; completed records its result and proof; failed names a recoverable reason. A goal can have several tasks and finishes only when its stated outcome is established or the owner accepts the result. A completed subtask never proves business success by itself.

Example: "Make sure today's enquiries are handled by closing time" creates a scoped goal, an enquiry watch and tasks that invoke eligible follow-up/quote books. TAR reports unanswered enquiries and verified replies. The goal does not authorize discounts, outreach to new recipients or a promise of conversion.

### 7.2 One bounded task supervisor

The supervisor is code in the shared harness. It routes to the same actions and runner used by forms and Flow Books. Use exact rules or a suitable recipe first; open-ended research or a novel task can use a bounded LLM plan. Jev selects or scores supplied candidates; it does not generate a plan, reply or script. See [TypeSafe's programming model](https://docs.typesafe.ai/concepts/system-one) and [typed function selection](https://docs.typesafe.ai/cookbooks/function_calling).

~~~text
request / relevant event / due wake
  -> persist + deduplicate -> claim task revision and budget
  -> retrieve current permitted evidence + task checkpoint
  -> exact action / existing Flow / bounded next-step proposal
  -> Gateway validates -> execute -> save result and receipt
  -> finish / next eligible step / durable wait / ask / pause
~~~

| Supervisor rule | Required behavior |
| --- | --- |
| Bounded plan | Persist the objective, evidence references, proposed steps and completion test. Validate every selected action/argument; unsupported capability becomes a visible limitation or human task. |
| Adaptive work | New evidence may produce a new task plan revision within existing grants. An active published Flow retains its pinned definition; changing a reusable book uses normal authoring/review. |
| Concurrent requests | Accept independent tasks while another waits. Use one active leased owner per task with a fencing epoch; mutations still validate shared record versions. Parallel reads may run within a shared cap. |
| Interruption | Correlate the message to its task; ask only if ambiguous. Persist correction/pause/cancellation and invalidate obsolete undispatched proposals. Late tool results stay evidence and cannot restart cancelled work. |
| Stop | Complete on evidence; wait on a named dependency; pause on missing authority, exhausted budget/deadline, repeated failure or no observable progress. Never spin an unbounded reasoning loop. |
| Explain | Show the next step, material plan changes, evidence, spend and receipts. Store concise decision summaries rather than hidden model reasoning. |

The task supervisor and Flow interpreter share one execution contract (§8.3). Multiple tasks are ordinary work items; they do not require a separate agent/persona per domain or a swarm. Add delegation only after independent parallel work shows a measured benefit; child tasks inherit narrower scope and the parent's remaining budget.

### 7.3 Proactivity and attention

**Observe -> test a configured condition -> propose or execute within grants -> report a meaningful result.** Prefer verified business events and webhooks. Use a bounded due scan for time-based checks or providers without events. Record the source cursor/version and occurrence so replayed events cannot produce repeated work or notifications.

| Decision | First mechanism | Semantic judgment only when needed |
| --- | --- | --- |
| Is a watch due or a deadline near? | Code, timezone and stored schedule. | None. |
| Has relevant evidence changed? | Versions, hashes, dependency links and current time conditions. | Noul for an ambiguous change in meaning. |
| Which enabled goal/action is relevant? | Exact source links and eligible candidates. | Choice with no-match. |
| Is a discretionary suggestion useful now? | Access, expiry, quiet hours, deduplication and frequency limits. | Score under a reviewed usefulness rubric. Required operational alerts use explicit rules. |

Default: keep ordinary progress in Activity; notify on completion, a meaningful exception or required input. The person controls sources, frequency, timezone, quiet hours, delivery channel, digest versus immediate delivery and pause. Mandatory service alerts and any quiet-hours exception require an explicit policy. Coalesce related changes; recheck freshness before delivery. Notification intent and delivery receipts use the same outbox as other messages. A muted notification does not cancel its task, and a cancelled task cannot keep generating discretionary reminders.

Start with business cases that have visible outcomes: missed enquiry, approaching booking, delayed delivery, low stock and unresolved payment. Onboarding suggests supported recipes based on explicit business setup and permitted evidence. Suggested watches start inactive; a suggestion or learned preference cannot enable unattended action.

The product target takes continuity, interruptible tasks, meaningful notifications and visible goals from [Muse's design](https://introducing.muse.ai/) and conversational follow-through from [Instinct](https://instinct.com/). These references establish product behavior, not TAR's implementation status or performance. TAR applies the pattern to the full commerce cycle through its shared domain packages.

## 8. 🧠 Brain: Flow Books and durable execution

### 8.1 Current catalog and execution gap

| Registered area | Existing action IDs |
| --- | --- |
| Flows | `flow.publish`, `flow.start`; Bot directory installation actions and routes have been retired. |
| Records/tasks | record.create, record.update, task.create, task.complete. |
| POS setup/products | pos.open, pos.setup, pos.product.save, pos.product.content.save, pos.product.draft, pos.stock.adjust. |
| POS customers/orders | pos.customer.save, pos.order.save, pos.order.item.update, pos.order.cancel, pos.checkout, pos.refund. |
| POS register | pos.register.open, pos.register.close. |
| Sites | site.generate, site.update, site.compile, site.publish, site.rollback, site.refresh. |
| Web | web.search. |

Useful legacy recipes should become maintained starter Flow Books and relevant record navigation. Shared contact/relationship actions and missing Sales, service, support, purchasing, finance and messaging actions remain target capabilities. A template or canvas label does not make a missing action callable.

**Delivery gate = durable execution of the ordered list.** flow.start presently positions a Run at its first action; it does not execute all later steps. Complete this before branching.

| Existing implementation | Deliberate target migration |
| --- | --- |
| `directory.install/remove` and Bot directory UI | Retired. Existing Bot/kit definitions are archived on workspace open, preserving audit rows. |
| `definitions.kind = bot` | Retired from the target schema and runtime; historical rows are archived for audit. |
| `definitions.kind = kit` | Canvas cards are derived from domain and Flow definitions; historical kit rows are archived for audit. |
| `definitions.kind = flow` | Evolve to validated Flow Book contract; publish without requiring an installed Bot. Existing IDs and run versions remain resolvable. |
| `flow.publish` and `flow.start` | `flow.publish` creates standalone Flow Books. The runner currently supports reviewed internal steps; complete authoring, recovery and external-effect reconciliation remain release gates. |

Migration must not silently activate an unattended trigger or broaden a grant. Show owners a preview of each converted book and require publication for new external effects.

### 8.2 Flow Book contract and authoring

**Flow Book = a versioned, compiled business process.** A book is a definition; a run is one durable execution of that definition. A recipe is a built-in starting definition. Publishing a book never preapproves a future payment, refund, message or publication.

**Starter cards in Flows and on a relevant contact.** A card explains the entry record, likely steps and required authority before anyone starts. These are proposed recipes; their names do not make missing actions callable. The app shows the same card in the library and as an eligible suggestion on contact detail.

~~~text
+------------------------------------------+
| MEMBER ONBOARDING           STARTER / OFF|
| From: person contact                     |
| Check role -> review access -> invite    |
| -> wait for acceptance -> confirm member |
| Truth: verified D1 member and receipt    |
| Needs: owner, role grant, invite channel |
| [ Preview ] [ Use for this person ]      |
+------------------------------------------+

+------------------------------------------+
| SUPPLIER ORDER              STARTER / OFF|
| From: supplier relationship              |
| Draft purchase -> approve spend -> send  |
| -> receive goods -> reconcile invoice    |
| Truth: purchase, receipt and postings    |
| Needs: supplier, catalog, spend grant    |
| [ Preview ] [ Use for this supplier ]    |
+------------------------------------------+

+------------------------------------------+
| SALES FOLLOW-UP             STARTER / OFF|
| From: contact + optional opportunity     |
| Qualify -> quote -> approve/send -> wait |
| -> follow up or close                    |
| Truth: quote, reply and opportunity state|
| Needs: offering, consent, channel grant  |
| [ Preview ] [ Use for this contact ]     |
+------------------------------------------+
~~~

`STARTER / OFF` means a visible template with no published workspace version or unattended trigger. To use it, a permitted person binds the contact or record, reviews the steps and publishes a version before a manual run. Enabling event or schedule starts is a separate reviewed choice. The member card never treats a contact as an authenticated member, the supplier card never treats an approved draft as received goods, and the Sales card does not place a stage on the contact. A pipeline, when useful, is a view of opportunity records changed by verified actions.

| Part | Definition | Owner |
| --- | --- | --- |
| trigger | Manual request, event or schedule. | Approved trigger set; code resolves time. |
| steps | Ordered registered actions first. | Published recipe and catalog. |
| args | Literal, source field or compatible prior output. | Compiler; Jev only for ambiguous semantic binding. |
| needs | Dependencies if branching becomes necessary. | Compiler validates full graph. |
| guard | Published condition. | Approved operators evaluated in code. |
| wait | Provider or human event. | Durable correlation and timeout. |
| recovery | Retry, reconcile, skip if allowed, or review. | Bounded declared policy. |
| owner | Workspace owner for policy, failures and revisions. | Identity and audit; not a model persona. |
| grants | Exact action subset, connection scopes and effect ceilings. | Gateway intersects them with current workspace policy. |
| version | Immutable published snapshot; draft may change. | Runs pin it; edits publish a new version. |

| User intent | Jev and LLM role | Code and person |
| --- | --- | --- |
| “Do this once for this contact” | Jev selects a supported recipe only if the request is ambiguous. No LLM for an exact match. | Bind the current record and run a published book with live authority, or use a bounded task episode if it is genuinely one-off; do not create a new book by default. |
| “Make this a reusable process” | Code retrieves eligible recipes and actions. Jev chooses a plausible recipe and missing requirements, with a no-match outcome. | Configure owner, inputs, waits, grants and costs; preview the exact steps. Publish a new immutable version after review. |
| “Change this recipe” | Jev selects compatible actions or bindings when meaning is unclear. An LLM drafts only the novel changed structure that the recipe cannot express. | Compiler checks the diff, types, graph, effects, recovery and current capability. Review and publish; old runs retain their pinned version. |
| “Create a new process” | Jev shortlists eligible actions and independent requirements; an LLM drafts trigger, steps, bindings and waits from that shortlist. | Compiler rejects invented actions, missing inputs, invalid graph/guard/grants and unsafe effects. Person reviews exact recipients, spend, connections and trigger before publishing. |

Authoring begins in Flows, Ask TAR, or a contact/record card. The app shows a step card with inputs, expected result, wait, approval, owner and estimated cost; missing requirements appear as specific questions. A person may also choose steps directly in the editor without either model. A draft may be saved without running. Publishing allows a manual run under the current actor's authority; a separate explicit switch enables an event or schedule trigger under scoped automation grants. A user correction creates a new draft revision, not a silent mutation of a published book. [TypeSafe function selection](https://docs.typesafe.ai/cookbooks/function_calling) informs the bounded Jev selection; the LLM is a draft writer and never the action catalog or authority source.

| Book state | Meaning and allowed use |
| --- | --- |
| Draft | Editable; no live run. |
| Published | Immutable version; manually callable only if actor and Gateway allow it. |
| Enabled | Approved event/schedule trigger may start runs within exact grant and budget. |
| Paused | No new triggered runs; existing waits and effects remain visible for recovery. |
| Archived | No new runs; definitions, receipts and pinned historical runs remain readable. |

If the automation owner loses authority, a connection expires, or a grant narrows, new dispatch pauses for reassignment or review. The book never inherits a departed person's permission indefinitely.

~~~text
contact / record / Flows / Ask TAR
    -> code retrieves eligible actions and starter recipes
    -> Jev selects fit or no-match when meaning is unclear
    -> reuse/configure recipe OR LLM drafts a novel structure
    -> code compiles types, waits, recovery, grants and budget
    -> person previews and publishes an immutable version
    -> manual run; separately enable event or schedule trigger
    -> durable runner rechecks each step through the Gateway
~~~

| Authoring question | Primitive | Compiler must still prove |
| --- | --- | --- |
| Which supported recipe/trigger/binding? | Choice. | ID, type compatibility, version and access. |
| Which independent requirement is stated? | Noul per condition. | Complete required fields and effects. |
| How well does a recipe cover a graded goal? | Score. | No missing capability, cycle or invalid authority. |
| Is graph valid, amount correct or provider done? | No Jev. | Code and verified receipts. |

Only compatible producers may bind an input; do not use an arbitrary last-five-node window. Branching requires a valid directed acyclic dependency graph, reachable completion/review, approved guards and recovery. An LLM can draft a novel graph but cannot publish it. A published Flow never preapproves a future refund, message or payment.

| Example book: enquiry to quote | Action and boundary |
| --- | --- |
| Trigger | Verified enquiry accepted through Gateway; deduplicate event. |
| Assess | Reuse or ask Jev for intent, need and missing details; no model-created facts. |
| Relate | Match permitted contact candidates; review uncertain merges. |
| Assign | Create follow-up task via Gateway; wait for person or customer reply. |
| Quote | Compose from current catalog, pricing and tax code; review exact terms. |
| Send | Gateway checks channel consent and approval; outbox sends and records receipt. |

The order, payment, delivery and support books start from their own verified events. Each book may be paused or revised without rewriting completed transactions.

### 8.3 Durable runner

~~~text
pin Flow Book/action versions -> persist step + input binding
  -> recheck authority, versions, budget, guard
  -> dispatch catalog action -> record accepted output/receipt
  -> advance successor or persist human/provider wait
  -> bounded recovery; reconcile ambiguous effects before retry
~~~

Cancellation stops new dispatch but does not erase completed effects or recall a provider request already in flight. Stable replay keys deduplicate accepted commands. Provider semantics may prevent exactly-once external effects. An explicit Jev step uses published evidence and allowed outcomes; it cannot invent a new action edge at runtime. Adaptive task work uses the bounded supervisor in §7.2 over this same execution contract.

**One runner, two modes:** a Flow run advances its pinned book; a task episode advances its persisted plan revision. Cloudflare Workflows supplies checkpoints, retries and waits. Turso supplies authoritative task status, approved intent and receipts. The engine can resume execution but cannot grant permission or declare a payment successful.

| Recovery point | Contract |
| --- | --- |
| Before starting the engine | Commit accepted task/run intent and occurrence in Turso. Dispatch using a stable engine instance identity derived from that occurrence. Recover a missed start from the durable intent; detect an existing instance before retrying creation. |
| Before each step | Claim a unique step occurrence under the current task/run revision and lease epoch. Read current authority, budget and versions at each uncommitted effect dispatch; never treat a cached checkpoint of approval as fresh permission. |
| After execution | Persist the output/receipt linked to the accepted effect. A crash between provider completion and checkpointing resolves through replay or reconciliation, including when a stale lease owner returns late. |
| While waiting | Persist correlation, expected responder/event, expiry and resume condition. Record an incoming reply/approval before notifying the engine; a missed or early engine wake is recoverable from that durable row. Engine events carry references, not authority. |
| Scheduled occurrence | Store timezone and explicit recurrence/missed-run policy; derive the next UTC due time in code. Deduplicate occurrence across clock changes, retries and overlapping dispatchers. Coalesce optional missed checks; surface missed business deadlines. |
| Deployment or engine limit | Pin definition/action/runner compatibility. Keep inputs and checkpoints small by using record/object references. Bound episode length; persist a continuation before approaching platform limits. Test old active runs through rollout; do not change their meaning silently. |
| Cancel, pause or revoke | Persist the control change first. Recheck it before future dispatch, settle in-flight outcomes, and keep uncertain effects visible. Resume requires current authority; compensation is a separate authorized action. |

The scheduled dispatcher submits due work and repairs dispatch gaps through the same runner. It does not independently execute a second copy of an effect. Use bounded indexed batches and per-workspace fairness; any control-plane scheduling index is a recoverable hint to Turso truth. Idle goals remain stored with a next wake; a task/Flow may wait inside its bounded execution window. Waiting or maintenance never holds a browser or sandbox open unnecessarily. Verify current platform limits, retention and workload cost before rollout. [Workflow events](https://developers.cloudflare.com/workflows/build/events-and-parameters/), [sleep and retry](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/).

| Route | Inference |
| --- | --- |
| Exact recipe + structured arguments | Zero unless an explicit semantic step exists. |
| Natural-language recipe selection | Bounded selection/binding stages. |
| Valid saved assessment | Reuse. |
| Novel workflow | Budgeted generation/planning, compiler, preview and review. |
| Published execution | Only declared judgment steps consume Jev. |
| Adaptive task episode | Use exact rules and valid assessments first; generation only for the novel step, within the task budget. |

## 9. Channels and communication

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

Each channel message retains a stable source identity and links to its conversation/task. A user can send new work, correct a pending plan or ask for status without losing the active task. Resolve identity and access again on channel changes; redact previews and notifications for their actual audience. Customer requests never acquire staff authority. Voice notes and attachments use bounded transcription/OCR and source references; material uncertainty routes to clarification. Live voice, outbound phone calls and device context are later adapters with explicit consent and measurable value, not prerequisites for the core assistant.

## 10. Product screens and interaction grammar

~~~text
TOP:     current workspace | sync status | identity
BOTTOM:  Space             | Inbox       | Flows
SPACE:   Contacts          | outcomes    | domain work
CONTACT: relationships     | activity    | eligible actions/books
DETAIL:  one record        | one primary legal action
REVIEW:  one ambiguity     | evidence    | concrete alternatives
~~~

| Surface | Job | Hard rule |
| --- | --- | --- |
| Space | Permitted facts, role home, records and Memory saved view. | Visibility is not authorization. |
| Contacts | People and organizations, their sourced relationships and current work; start an eligible action or Flow Book. | A contact is not a member, lead, customer or consent grant by default. |
| Inbox | Decisions, exceptions, waits, failed work, approvals. | Show only actions actor can perform. |
| Review | One consequential ambiguity and its source. | Do not expose full model state as a user task. |
| Flows | Built-in recipes, workspace drafts, published books and runs. | A visible recipe is inactive until configured and published. |
| Record card | Current state and one primary action. | Morph with step state. |
| Action form | Typed fields from action contract. | Exact confirmation for consequences. |
| Approval | Exact amount, recipient, destination, actor, expiry. | Approval binds proposal and is rechecked at dispatch. |
| Channels | Team linking and customer queues. | No provider tokens or raw private payloads. |
| TAR assistant | One ask surface for business and private work. | Ask first; live access still applies. |

| Screen group | Target screen inventory |
| --- | --- |
| Entry | Boot; Sign in; First run; Space; Contacts; Inbox; Review. |
| Capability | Flows; Flow Book detail; TAR assistant; Flow authoring; Search; Settings. |
| Record | Contact detail; Relationship detail; Record card/detail; Action form; Confirmation; Approval. |
| POS | POS sale; Receipt; Register; Stock adjust; Product form. |
| Publishing | Site Studio; site request; design picker; release plan. |
| Vertical domains | Sales and optional pipeline view; Services; Commerce; Delivery; Support; Purchasing; Finance; Campaigns; Reporting. |
| Flow work | Flow Book editor; preview; run; trigger and grants; failure/recovery. |
| Team | Members and chat; Channel link. |
| Commercial | Plans and credits. |
| System states | Offline; AI paused. |
| Ongoing work | Goal and task details, activity, connection/autonomy settings and artifact details inside the existing destinations; see §10.2. |

| Design rule | Meaning |
| --- | --- |
| One primary action | The next step is evident on a card. |
| Native back | Avoid redundant in-app close controls. |
| Autocomplete first | Reduce typing for ordinary users. |
| Fields by policy | Hidden fields are absent from payload, not merely greyed out. |
| Review band | Put consequential ambiguity in Inbox; harmless preference may default. |
| Manual continuity | Budget/outage never disables ordinary POS and forms. |
| Android layout | Status and gesture bars, a top app bar, three primary bottom destinations, tabs only for sibling content, and 16 dp compact margins. |
| Flat treatment | Tonal surfaces and dividers carry grouping; no elevation, drop shadows, decorative gradients or floating cards. |
| Touch and type | Target at least 48 dp for actual controls; use clear labels, supporting text and readable type hierarchy. |

The [mobile concepts](tar-mobile-concepts.pen) show the target screens. Native app implementation must verify insets, accessibility, touch targets and device sizes against [Android guidance](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility). The concepts do not establish implemented behavior.

~~~text
+------------------+     +------------------+     +------------------+
| SPACE            |     | INBOX            |     | FLOWS            |
| facts + domains  |     | work + waits     |     | books + runs     |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
  Contacts / POS / Site   Review / Record card     Book / Preview / Run
  Search / Memory                |                  grants / Activity
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

### 10.1 Screen map and design source

Use the screen inventory above for scope and [tar-mobile-concepts.pen](tar-mobile-concepts.pen) for the visual journeys, components and states. The interaction rules in this section govern implementation. Screen concepts are targets, not evidence that their business actions are built. The same canonical record, task, approval and receipt appears wherever it is opened.

### 10.2 Ongoing agent experience

Reuse Space, Contacts within Space, Inbox, Flows, the assistant and Settings. The following contracts extend the screen map; they do not add primary navigation destinations or imply those screens are built.

| Existing destination | Added behavior | What the person can control |
| --- | --- | --- |
| Space | Goals with observed progress, deadline, next check and linked tasks. | Change outcome/constraints, pause or stop; inspect why progress changed. |
| Contacts | Person/organization search, relationship history and relevant Flow Book cards. | Correct identity, end or add a sourced relationship, and start a permitted book for this contact. |
| Assistant | Private main conversation with task links and named work conversations (§10.3). Accept another request while work runs; show accepted, working, waiting and completed states accurately. | Interrupt, correct, attach evidence and resume the same task from another permitted channel. |
| Inbox | For you contains actionable exceptions, approvals and useful suggestions; Conversations contains permitted chat history. Routine execution detail stays in Activity. | Approve the exact effect, resolve a dependency, reopen a conversation, dismiss/snooze a suggestion or mute a watch. |
| Task/Activity detail | Current plan, next action/wait, changes, elapsed work, spend, outputs and receipts. | Inspect sources; pause/cancel future work; retry only through the recovery policy. |
| Flows | Reusable recipes and pinned runs linked to goals/tasks. | Review and publish adaptations; explicit enablement for unattended triggers. |
| Settings | Connected apps, scopes, autonomy, budgets, quiet hours and delivery preferences. | Restrict access, reconnect, revoke and stop background work. |
| Memory/artifact detail | Source, scope, revision, freshness, sharing and retention. | Correct/forget memory; inspect, revise, download or share an artifact within access. |

Onboarding asks for the business's first useful outcome, connects only the required source, and previews the proposed scope/cost. Begin with a bounded demonstration and offer a recurring watch after its value is clear. A goal card links to work; the person need not learn the infrastructure or Flow compiler to request an outcome. Structured approval and permission controls remain explicit even when most interaction is conversational.

Use 🧠, 🙌 and 🗃️ in architecture documentation and explanatory onboarding where useful. Use familiar action labels, status text and accessible names in operational screens; emoji never carries permission, status or meaning on its own.

### 10.3 TAR conversations: one assistant, organized work

**Target decision:** a familiar main TAR conversation plus a searchable list of named work conversations. Keep `Space | Inbox | Ask TAR` as primary navigation, and open Flow Books from Space. Chat is the natural request surface; POS, record forms and other direct business screens retain their efficient controls. This is a proposed UX and persistence contract, not an implemented chat system.

| Pattern from the references | Benefit | Decision for TAR |
| --- | --- | --- |
| Muse main chat, task updates and rich results | Easy to ask, interrupt and follow through. | Adopt one main chat per person and workspace; allow separate work conversations. |
| Role-based agent list in the supplied screenshots | Scan activity and reopen ongoing work. | Adopt the list structure with work titles, previews and statuses. Roles can be filters or recipe suggestions; they do not create separate agents, grants or memory stores. |
| Avatar/persona switcher | Recognizable identity and tone. | One consistent TAR identity at launch. Large persona carousels add a choice before useful work and are outside the initial scope. |

Muse itself describes a main conversation with side chats, background activity, artifacts and structured approvals. TAR adapts these interaction ideas to scoped business work. The supplied images are design references; they do not establish the implementation or identity of the last two screens. [Muse design](https://introducing.muse.ai/).

**Navigation and layout**

| Surface | Target behavior |
| --- | --- |
| Ask TAR | The dedicated bottom tab opens the user's main conversation in the current workspace. A consistently placed chat control on root screens provides the same shortcut. |
| Space | Home for outcomes, records, Contacts and Flow Books. Flow Books opens the reusable process library and its runs. |
| Contacts | Space opens the shared people/organization list. A contact shows sourced roles, current work, direct actions and eligible Flow Book cards; choosing a book binds this contact only after the person reviews that context. |
| Inbox | Two sibling tabs: For you and Conversations. For you stays the default and shows actionable work. Conversations offers search, New conversation, pinned chats and recent chats; the private main TAR conversation is pinned first. |
| Conversation list | Each row shows a work title, one useful latest update, time, unread marker and a text status when work is active or needs attention. Examples: Malar's quote, September stock review, Weekend staffing. Order pinned then recent; offer an explicit Needs you filter. |
| Conversation detail | Header shows title, workspace and audience. Short chat bubbles surround flat cards for drafts, approvals, records, files and results. A compact active-task strip opens task detail; full tool activity is available there. |
| Composer | Text, attachment and optional voice note; visible removable record/context chips. Voice notes use transcription through the same routing contract. Sending remains available while other tasks run. Each task has its own pause/stop control. |
| Record detail | Ask TAR about this opens or creates an explicitly linked work conversation with the record visible as context. Offer a permitted existing conversation when one already fits; do not silently merge audiences. |
| Larger screens | Show the conversation list beside the selected chat; optionally open the selected record or artifact in a detail pane. Mobile uses list, chat and detail as successive screens with native back behavior. |

~~~text
Space                 Inbox                         Ask TAR
Contacts / Flow Books For you | Conversations       Main and work chats
                             |
                      TAR                 pinned
                      Malar's quote       Needs you
                      Stock review        Working
                             |
                      conversation + task cards
                             |
                      exact approval -> receipt
~~~

Keep ordinary requests in the main conversation. New conversation creates a topic explicitly; TAR may suggest one for sustained work but does not create a chat for every message, action or run. A conversation can contain several tasks. Goals stay in Space, suggestions in For you, connections in Settings and execution details in Activity. Each object opens the same detail view wherever it is referenced. 🧠 Brain, 🙌 Hands and 🗃️ Files explain the architecture; they are not additional app tabs.

**Conversation behavior and authority**

| Contract | Required behavior |
| --- | --- |
| Task correlation | Replies, corrections and results carry their originating task/proposal references. When several tasks could match “send it,” ask which one. A new message can start independent work without overwriting the active task. |
| Approval | Chat and For you render the same canonical proposal and approval. Show the recipient, destination, amount where applicable, exact draft and expiry. Use the existing approval policy; ordinary conversation cannot bypass a required structured confirmation. Editing the draft invalidates an approval for the old revision. |
| Receipt | Confirm completion only from committed results or verified external receipts. Unknown delivery says awaiting confirmation. Approval through chat and Inbox concurrently still produces one accepted effect. |
| Background updates | Put an update in its originating conversation. For you surfaces the same object when action is needed; main chat may receive a concise linked summary when notification policy warrants it. Deduplicate notification delivery and actionable counts by the underlying event/object. |
| Browser and artifacts | Render file previews with source/access controls. Show Open browser only when an authorized live session exists; label expired sessions and keep their result evidence. Starting another session requires the normal grant and budget checks. |
| Audience and privacy | List/search/message streaming all enforce current workspace and conversation access on the server. A shared conversation receives only evidence its audience may see. Adding a participant requires checking historical content or opening a clean conversation; sharing never exposes private history implicitly. |
| Memory | Retrieve relevant permitted memory and current records per task. Sharing the TAR identity does not share all conversations or private memory. Removing a context chip changes future retrieval scope; it cannot undo an already completed action or previously shared message. |
| Archive and deletion | Archive hides history without cancelling tasks; explain this and keep active work discoverable in For you/Activity. Offer explicit task cancellation. Conversation deletion follows retention policy; forgetting durable memory is a separate visible control, with no silent resurrection from summaries. |
| Accessibility | Text accompanies status/color and icons; controls meet the existing touch-target rule. Announce meaningful updates without repeatedly interrupting screen-reader focus. New messages do not steal scroll position while the person reads older content. |

**Persistence and cost:** reuse the proposed conversation record for title, owner, audience and lifecycle. Persist messages separately from its growing record payload with conversation ordering, speaker, task/proposal/artifact references and a replay key. At the migration gate, reuse `events` only if message access, pagination and deletion/retention semantics fit its command-log contract; otherwise use a dedicated `messages` table for that independent lifecycle. Do not treat a UI transcript as a workflow checkpoint or an authorization source. Persist accepted messages before acknowledging them; reconnect by cursor and deduplicate retries. Track read cursors per participant. Local optimistic messages remain visibly pending until acknowledged.

Loading the list, searching permitted history, scrolling and viewing receipts use indexed queries and require zero inference. Model input uses the relevant task checkpoint, a bounded recent exchange and permitted retrieved evidence. Do not replay every conversation or run a model per chat row. The same harness, Action Gateway, durable runner and storage policies serve every conversation; no always-running computer is allocated per chat.

**First release:** main chat, conversation list/search, explicit work chats, persisted messages, task correlation, draft/approval/result cards and truthful reconnect states. Add richer browser cards and voice after the corresponding execution adapters pass their gates. Validate with an enquiry-to-quote journey: ask in main chat, continue in Malar's quote, review the same draft from Inbox, send once, close/reopen the app and see the confirmed receipt.

## 11. POS and restaurant path

**Two inputs, one action contract.** A cashier tapping products uses code; a customer message or voice note may need transcription and bounded Jev. Both commit the same POS action through the gateway.

~~~text
cashier taps -> deterministic cart -------+
                                          +-> pos.order.save -> gateway -> receipt
message/voice -> capture -> Jev draft ----+
~~~

| Stage | Role and screen | Jev, when needed | Code or gateway |
| --- | --- | --- | --- |
| Open | Owner, workspace/Space. | None. | Membership and roles. |
| Configure | Owner, Space/POS setup. | None for explicit selection. | POS is built in; configure store, roles and optional order Flow Books. |
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

The POS sale, receipt, setup, stock, product, customer and return concepts are grouped in [the mobile concepts](tar-mobile-concepts.pen).

## 12. Site Studio and publishing

~~~text
+--------------------------------------------------------------------------------+
| BUILD: merchant request                                                        |
| TAR assistant reads validated design.md + permitted workspace facts.           |
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

## 13. Sales, GTM and staged external data

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
| Act | Sales opportunity, task, draft or outreach action. | Consent, frequency, recipient, approval and delivery receipt. |
| Learn | Store assessment and actual outcome. | Compare cost per qualified and accepted opportunity. |

The [Jev + treg GTM examples](https://treg.to/jev) illustrate staged lead qualification, signup triage and post research. Their vendor prices, availability, performance and synthetic examples are not TAR benchmarks. A Jev fraud probability alone cannot ban an account. TAR needs independent abuse evidence, consequence-aware review and an authorized account action. Social network access and outreach terms must be verified before selecting an adapter.

## 14. 🗃️ Files: memory, skills, repositories and artifacts

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

### 14.1 Memory maintenance without a computer

Use the same scheduled dispatcher and runner to select changed entities, read authorized source records, expire temporary context, resolve supported updates and compile affected packs. A no-change scope needs no model call. Code performs exact expiry/deduplication/composition; Jev handles ambiguous relationships. Narrative generation, when required, has its own explicit budget. This job accesses Turso and R2 directly, so no browser, sandbox or Drive is needed.

Persist the input revision/cursor and publish a new pack only if its dependencies still match. Concurrent corrections or withdrawals invalidate stale output; retry only the affected scope. Forget immediately blocks recall through source rows, packs and caches, and a later rebuild must not recreate the forgotten fact from retained history. Persist the necessary exclusion until the underlying sources expire or are deleted. Keep deletion/retention policy explicit for source data, derived artifacts, logs, exports and backups.

Learning updates sourced context or proposes a recipe/skill improvement. It cannot change permissions, budgets, production code or published books. Private person context and shared business context have separate access scopes; using the same assistant across channels does not merge those scopes. Factual business answers still read current authoritative records.

### 14.2 Skills, files and reusable outputs

| Durable content | Default home | Lifecycle and access |
| --- | --- | --- |
| Business truth and receipts | Turso records/events/effects; D1 for control. | Transactions, versions and domain invariants; every accepted change is attributable. |
| Memory and context packs | Scoped record data with R2 references for large content. | Sources, expiry, correction and recall exclusions; bounded retrieval. |
| Skills and rubrics | Reviewed, versioned assets in the repository; optional workspace adaptation as a reviewed versioned definition. | Declare purpose, compatible action/schema versions, allowed evidence and tests. Load only relevant skills. A skill teaches usage and never grants access. |
| Flow Books | Versioned definitions and pinned runs. | Compiler, preview, publication and explicit unattended enablement. |
| User files and artifacts | R2 bytes; record metadata for owner, scope, hash, revision, source and retention. | Check access on upload/read/share/download. Scan and bound untrusted imports; immutable revisions with explicit publication. |
| Repositories | Authorized remote repository and pinned commit; temporary checkout for code tasks. | Record source/commit and patch; run untrusted code in isolation. Review/test a change before its authorized merge or deployment. Ordinary commerce work requires no repository. |
| Scratch, dependencies and browser state | Task-scoped execution storage; secrets/session material through the trusted connection boundary. | Defined lifetime and cleanup, no cross-tenant sharing; only permitted outputs return to durable storage. |

Trusted Worker jobs use shared scoped storage helpers; tool-facing file operations use catalog contracts, and accepted mutations pass the Gateway. A browser/computer receives an authorized input manifest and exports an output manifest; isolated task directories prevent concurrent edits to the same scratch files. Accept a new artifact revision using the expected current version, and reject conflicting overwrites. Stage large objects before committing references; sweep orphan objects after a grace period. R2 object storage is not a POSIX filesystem. Add a managed volume only for a demonstrated working-directory requirement, with explicit mount ownership, concurrency, backup and export rules.

Use ordinary records, templates and native views for reports first. Generated documents, spreadsheets, PDFs and sites become versioned artifacts with source links. Interactive generated views run on an isolated origin with restricted capabilities and permitted data; they cannot inherit the app's credentials or publish themselves. Downloading an output, sharing it with a recipient and publishing it publicly are distinct actions.

Restore and export are part of the data contract: define recovery objectives and retention per data class, test workspace restore with object references and receipts intact, and preserve revocation/forget exclusions through restoration. Do not claim an atomic backup or transaction across D1, Turso and R2. Reconcile storage mismatches before resuming affected effects.

## 15. Evaluation, rollout and build order

### 15.1 Route proof

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
| Ongoing work | Correct resumption after interruption, goal completion evidence, stuck work, useful notifications and unwanted interruptions. |
| Optional compute | Fraction of tasks needing it, active/idle duration, resource cost, boundary enforcement and artifact correctness. |

Dataset = frozen request + authorized evidence + candidate list/version + action contract + proposal + actual trace/receipts + expected result + human label + deterministic checks + operating slice. Capture model, served version, question bundle, thresholds and timestamps so a result can be reproduced or identified as version dependent. Include role, domain, channel, Indian languages and transliteration, mixed messages, noisy voice transcripts, regional dates and money. Do not claim equal Jev quality across language slices without labels.

~~~text
FROZEN TAR TRACE
request + authority + permitted evidence + eligible candidates + versions
                              |
                              v
                 route / assistant / Flow Book under test
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

External demonstrations are useful hypotheses, not TAR accuracy evidence. Before promotion, test TAR's frozen traces against independently labeled cases, including changed option order, irrelevant candidates, missing or contradictory evidence, question rephrasing and noisy language. Measure false acceptance, coverage, latency and cost by operating slice; preserve model and question versions.

Thresholds depend on route, model, question version, evidence quality, language and consequence. Promote only when the composed policy beats predeclared baseline criteria for error, coverage, latency and cost. Pin model, canary, roll back and disable per route.

Smallest deciding experiment = freeze 100 to 200 permission-safe enquiries and command requests; label intended action, missing facts and forbidden effects; run exact-code baseline, bundled Jev route and applicable current generator. Report candidate recall, false automatic accepts, correct completed tasks, human review minutes, p50/p95 end-to-end latency and total cost including retries and corrections. Set route-specific go/no-go bounds before seeing results. This is an experiment design, not a measured TAR result.

### 15.2 Build sequence

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| P0a | Extend existing action contract, eligible shortlist, task grants and connection policy. | One catalog drives forms, TAR assistant, Flow Book discovery and gateway validation. |
| P0b | Shared person, organization and relationship record contracts; contact search/detail and direct actions. | One person can change organizations without rewriting historical work; matching never merges across workspaces or grants consent. |
| P0c | Pre-inference turn replay; proposal/assessment/attempt links. | Duplicate turn repeats zero inference; accepted effects are reconstructible. |
| P0d | Extend the first-step Jev suggestion into reviewed candidate/recipe selection and a command-draft slice. | Whole-route accuracy, latency and cost gates pass; no-match and missing-capability cases stop safely. |
| P0e | Contact-started direct action and POS or quote draft from real candidates. | One-step work bypasses Flow creation; candidate recall and whole-order correctness beat the declared baseline. |
| P1a | Common run migration; Cloudflare Workflows adapter; ordered runner, durable ingress, waits, dispatcher and outbox reconciliation. | Crash/replay/revocation gates pass; old Flow runs remain readable; current authority governs every resumed effect. |
| P1b | Complete Flow Book authoring with typed inputs, output mapping, optional LLM drafting, compiler, preview and publication; migrate legacy Bot/kit recipes. Add goal/task views and §10.3 conversations. | Reuse an exact recipe with zero LLM; reject an invented action or unsafe trigger; publish only a reviewed version. Main/topic chats reconnect to the same task, approval and receipt. Converted books need reviewed grants. |
| P1c | Assessment reuse and scoped memory with correction, forgetting and incremental maintenance. | Changed display weights add zero inference; correction/forget wins over concurrent consolidation; no sandbox is needed. |
| P1d | Scoped connections, channel continuity, member and purchasing actions, other domain actions and versioned artifacts. | Prove contact-to-member and supplier-to-purchase journeys, then an enquiry-to-quote-to-order-to-delivery-to-support cycle. Apply action/rule/recovery gates to every package; measure real outcomes and provider spend. |
| P1e | Bounded task supervision, enabled watches, useful notifications and autonomy controls. | Complete a requested goal across interruptions and changed evidence within budget; paused/revoked work stops new dispatch; notification value is measured. |
| P2a | Browser/computer route for an observed API gap; richer documents or voice where needed. | Enforced egress/credential/file boundaries, human handoff, trustworthy receipts and acceptable cost per completed task. |
| P2b | Branching graphs, selective delegation and predictive/personalization experiments. | Independent measured need, shared budgets, recovery/authority proof and controlled outcome lift. |

Use keyless offline fixtures plus separate live provider smoke checks. Start question bundles as versioned code assets; editable stored definitions require versioning, validation, review, tenant isolation and a migration. New workspace schemas accept only `flow` and `record_type`; existing database constraints remain compatible while historical Bot/kit rows are archived. No arbitrary question kind exists. An HTTP adapter inside the Worker is acceptable; the documented JavaScript SDK targets Node.js 20+, so verify runtime compatibility before adoption. [TypeSafe API](https://docs.typesafe.ai/api), [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript).

### 15.3 Ongoing agent acceptance gates

| Scenario | Required observable result |
| --- | --- |
| App closes; worker restarts; deployment happens | Accepted task and next step remain discoverable; completed effects do not repeat. |
| Crash before engine start, after provider success, or before wait notification | Durable intent repairs missed dispatch; uncertain effects reconcile; early replies and approvals remain resumable. |
| Duplicate event, overlapping schedule, expired lease or late tool result | One accepted occurrence; stale owners cannot dispatch new effects; all results reconcile to their original intent. |
| User changes, pauses or cancels a task while a tool runs | Obsolete proposals cannot commit; in-flight outcomes are reported; completed effects remain visible. |
| Several tasks run in one chat; an ambiguous reply arrives | Ask which task/proposal is intended; corrections and cancellation affect only the selected work. |
| Same proposal is approved in chat and Inbox; client reconnects | One effect and one canonical receipt; messages replay without duplication; unknown external results never show Done. |
| Workspace switches, conversation audience changes or a chat is archived | No private history leaks through search, previews, streams or summaries; active work remains discoverable and archiving does not silently cancel it. |
| A person changes organizations or has two concurrent opportunities | End the old relationship without changing its history; keep each quote and stage tied to its own organization/opportunity. |
| Contact-started member onboarding or supplier ordering | A contact does not become a member until verified acceptance and authorized role assignment; a purchase does not become received or paid without exact records and receipts. |
| Jev chooses no recipe or an LLM drafts an unknown action | Show the missing capability or a reviewable draft; the compiler rejects unknown actions and unattended triggers remain off. |
| Role/connection/grant changes during a wait | Resume uses current authority and exact approval scope; unavailable work pauses with an actionable reason. |
| Task requests another tenant's context or forget races with consolidation | No unauthorized retrieval; obsolete or forgotten content cannot reappear through packs, artifacts or caches. |
| Malicious page, repository instruction or generated script | It cannot obtain credentials, broaden grants, contact forbidden destinations or bypass effect approval. Test the real executor, not only the model prompt. |
| Nothing meaningful changes during repeated watches | No unnecessary model calls or discretionary notifications; configured deadline alerts still occur. |
| Goal, budget or required provider is exhausted/unavailable | Work reaches an explicit result, wait, review or stop; manual work continues; no unbounded retries. |
| Proposed cost saving | Compare complete correct outcomes, latency and review effort against the simpler baseline; include storage, maintenance, tools and compute. |

The first ongoing-agent pilot should use an existing supported commerce path and a real bounded goal. Require evidence for completion and recovery before expanding autonomy or domain breadth. Product inspiration is not an accuracy, security or cost guarantee.

## 16. Risks and complexity budget

| Risk or temptation | Required response |
| --- | --- |
| Wrong or stale model judgment | Measure whole-route errors; link evidence; invalidate changed assessments; check live facts at commit. |
| Missing candidate or source | Measure retrieval recall, widen eligible search or ask for input. |
| Unauthorized or duplicated effect | One catalog and Gateway; exact grants, replay keys, outbox receipts and reconciliation. |
| Browser, computer or prompt injection | Isolate temporary sessions; enforce credentials and network egress outside generated code; require the same effect approval. |
| Provider outage, quota or hidden cost | Bounded retry and budget, manual path, full cost per correctly completed outcome. |
| Goal drift or noisy proactivity | Owned scope, stop condition, due/event wakes, meaningful notifications and no-progress limit. |
| Memory error or data leak | Sourced, scoped context; correction, forgetting and current access checks. |
| Contact or relationship conflation | Preserve person and organization identity, time-bound roles, consent evidence and history; review uncertain merges. |
| Architecture sprawl | Reuse the shared catalog, Jev module, runner and stores; add a service, table or agent loop only after measured need. |

**Architecture test:** adding a domain should mainly add actions, rules, rubrics, recipes, views and tests. A new business process should usually add a Flow Book. A new shared primitive belongs in the core only when several domains need it. TAR uses one assistant, one Action Gateway and one durable runner; business truth and receipts survive after compute stops.
