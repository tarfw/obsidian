# TAR v12 = One Core, Shared Judgments, Every Domain

> Local speed. Shared truth. Understand once, reuse across the business.

**Status (2026-09-23): final target architecture.** This document supersedes
`tarv6.md` through `tarv11.md`, `TAR v11 = One Core, One Call, Every Domain.md`,
and `techstack.md` for architecture and build decisions. Those files record the
evolution and may be retired after their remaining inbound links are updated.
No earlier version is required to interpret this one. Provider references and
implementation source files remain evidence, not a second target plan.

**Scope of the claim:** final means one chosen design, not complete deployment.
The existing gateway, catalog, Turso workspace schema, D1 membership, POS and
site paths are implementation; the shared Jev adapter, reusable assessment
pipeline, full domain packages, and measured economics are target work. A
working feature is established by code and tests, never by an example screen or
cost table in this document.

### Final decisions carried through the evolution

| Concern | Decision | Sections |
| --- | --- | --- |
| Business model | One shared core covers discovery through retention; domain packages add rules, records, actions and views. | 1, 10 |
| Authority | One gateway checks identity, policy, state versions and replay before committing workspace truth. External effects are durable and reconciled. | 3–4, 17 |
| Offline | Device SQLite renders permitted projections and stores drafts; only the server accepts shared changes. | 2–4, 11, 15 |
| AI | Code handles exact rules. Bounded TypeSafe judgments interpret meaning, reuse valid assessments, and escalate by consequence; prose generation is separate. | 5–8, 18–19 |
| Product | Space, Inbox, Bots, POS, channels, site publishing, Flows and memory use one interaction and execution grammar. | 11–18 |
| Economics | Credits are a product allowance. Provider spend, full workflow cost and margin are measured independently. | 8–9, 13, 19 |

The superseded versions' useful decisions are restated in these sections.
Their provider prices, universal one-call rule, automatic margin claims,
full-graph orchestration assumption and runtime site personalization are not
adopted as requirements. Changes to this architecture should update this file
and name the decision being revised.

| Historical input | Decision preserved here | Decision revised or retired here |
| --- | --- | --- |
| v6 | Durable commands, replay, runs, effects and recovery (4, 17). | Keep the runtime bounded; avoid implying that every proposed flow is shipped. |
| v7 | Decision first routing with code owned authority (5–6). | Model output remains a proposal, never a permission. |
| v8 | Fast local screens with server accepted business state (2–4, 11). | Device data is a permitted projection and draft store, not independent workspace truth. |
| v9 | Cost gates, offline conflicts and release proofs (6–9, 19). | Costs require matched outcomes and current prices. |
| v10 | One core and full commerce domain coverage (1, 10). | Domain work is sequenced by evidence, not assumed implemented. |
| v11 | Channels, POS, sites, Flows, memory and full concept screens (11–18). | Semantic work can have dependent stages; public site views have no mandatory inference. |
| Tech stack study | Expo, Worker, D1, Turso, R2 and a cost envelope (2, 9). | Browser and compute vendors remain workflow choices; historical margins are unproven. |

~~~text
+-------------------+-----------------------------------------------------------------------+
| Document status   | Final target architecture; not a shipped-implementation claim        |
+===================+=======================================================================+
| Inputs            | v6–v11, tech stack study, Jev research and current source code       |
+-------------------+-----------------------------------------------------------------------+
| Implementation    | Existing and proposed behavior are identified in sections 4 and 19  |
+-------------------+-----------------------------------------------------------------------+
| Provider snapshot | Jev 1.13.0 docs checked 2026-09-23; account terms need verification  |
+-------------------+-----------------------------------------------------------------------+
| Claim discipline  | Facts, proposed policies and illustrative costs stay distinct         |
+-------------------+-----------------------------------------------------------------------+
| Proof             | No production accuracy, capacity or saving is claimed without data    |
+-------------------+-----------------------------------------------------------------------+
~~~

~~~text
+--------------------+-------------------------------+-----------------------------------------------+
| Read sections      | Purpose                       | Main format                                   |
+====================+===============================+===============================================+
| 1–4                | Scope, app/worker, commit     | Architecture tables and flows                 |
+--------------------+-------------------------------+-----------------------------------------------+
| 5–8                | Jev, routing, reuse, budgets  | Decision tables and hard boundaries           |
+--------------------+-------------------------------+-----------------------------------------------+
| 9–10               | Cost and domain workflows     | Cost ledger and end-to-end matrices           |
+--------------------+-------------------------------+-----------------------------------------------+
| 11–18              | Screens and domain packages   | ASCII screens, state tables and rules         |
+--------------------+-------------------------------+-----------------------------------------------+
| 19–20              | Delivery, proof and risks     | Rollout, complexity and risk tables           |
+--------------------+-------------------------------+-----------------------------------------------+
~~~

## 1. Purpose = the whole business cycle, understood once

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   |          |        |       |         |           |          |
 Sites       CRM     Sales   Orders    Products    Tickets   Renewals
 Content   Contacts  Quotes  Payments   Services   Returns   Campaigns
                               |
             Team + Stock + Purchasing + Finance + Reporting
~~~

TAR = one architecture for the entire cycle. A cafe, shop, agency, repair business or
subscription service enables different capabilities within the same system.

~~~text
+------------+-----------------------------------------------------------------------+
| Domain     | Work covered                                                          |
+============+=======================================================================+
| Sites      | Content, catalog, forms, enquiries, checkout, reviewed publication    |
+------------+-----------------------------------------------------------------------+
| CRM        | People, companies, relationships, consent, communication history      |
+------------+-----------------------------------------------------------------------+
| Sales      | Leads, opportunities, quotes, conversion, follow-ups                  |
+------------+-----------------------------------------------------------------------+
| Products   | Catalog, variants, prices, stock, purchasing, reservations            |
+------------+-----------------------------------------------------------------------+
| Services   | Offerings, resources, availability, bookings, assignments, completion |
+------------+-----------------------------------------------------------------------+
| Commerce   | Orders, invoices, payments, fulfillment, subscriptions, refunds       |
+------------+-----------------------------------------------------------------------+
| Support    | Tickets, conversations, priorities, returns, resolution               |
+------------+-----------------------------------------------------------------------+
| Operations | Suppliers, purchases, receiving, shipping, team, approvals            |
+------------+-----------------------------------------------------------------------+
| Finance    | Postings, reconciliation, balances, reporting, exports                |
+------------+-----------------------------------------------------------------------+
~~~

**Rule = known work is code, meaning is a bounded judgment, prose is optional generation, and authority is
explicit.**

**Rule = Jev improves judgment; the runtime preserves truth.** A model proposes typed interpretations. Code
computes money, validates state, and applies the existing gateway. Consequential effects use the configured
approval policy; confidence never grants permission.

- Every domain shares capture, retrieve, assess, compose, validate, commit, and trace.
- Explicit structured actions need no inference. Independent judgments share a request; dependent evidence creates another stage.
- A useful assessment serves many features and is refreshed only when its dependencies change.
- Costs and latency are measured per correctly completed workflow. No per-turn or margin claim is treated as proven by a planning spreadsheet.

### Direction = capability without another agent per domain

TAR has a common action catalog, a mutation gateway, domain packages, and explicit business rules. Jev can
make this foundation accessible through everyday language without giving each domain its own agent, prompt
stack, routing system, or planner.

~~~text
+----------+------------------------------------------------+------------------------------------------------+
| Priority | Change                                         | What becomes simpler                           |
+==========+================================================+================================================+
| First    | Compile bounded action questions from the      | One action definition serves forms, chat,      |
|          | existing catalog                               | voice transcripts, and Bots                    |
+----------+------------------------------------------------+------------------------------------------------+
| First    | Extract candidate spans, then ask Jev which    | Less generative JSON extraction and fewer      |
|          | role each plays                                | invented values                                |
+----------+------------------------------------------------+------------------------------------------------+
| First    | Assess incoming work once and reuse its        | Inbox, CRM, routing, search filters, and       |
|          | dimensions                                     | review share results                           |
+----------+------------------------------------------------+------------------------------------------------+
| First    | Retrieve a small authorized shortlist before   | Smaller state, fewer options, lower latency,   |
|          | asking semantic questions                      | clearer failures                               |
+----------+------------------------------------------------+------------------------------------------------+
| Next     | Select approved workflow recipes and           | Avoid a new model-driven graph planner for     |
|          | compatible bindings                            | common business processes                      |
+----------+------------------------------------------------+------------------------------------------------+
| Next     | Build evidence-linked briefs and replies from  | Less prose generation, easier verification and |
|          | selected source blocks                         | correction                                     |
+----------+------------------------------------------------+------------------------------------------------+
| Next     | Precompute site variants by segment and page   | Personalization without a model call on every  |
|          |                                                | page view                                      |
+----------+------------------------------------------------+------------------------------------------------+
| Next     | Consolidate memory incrementally by entity and | Less full-history reading and fewer            |
|          | fact                                           | unnecessary pack rebuilds                      |
+----------+------------------------------------------------+------------------------------------------------+
| Later    | Turn validated judgments into predictive       | Business predictions from a small classical    |
|          | features                                       | model, where labels justify it                 |
+----------+------------------------------------------------+------------------------------------------------+
~~~

~~~text
+----------------------+--------------------------------------------------------------+
| Architecture measure | Rule                                                         |
+======================+==============================================================+
| Product objective    | Completed correct work per rupee and per second              |
+----------------------+--------------------------------------------------------------+
| Explicit action      | 0 Jev calls                                                  |
+----------------------+--------------------------------------------------------------+
| Shared evidence      | Batch only independent questions                             |
+----------------------+--------------------------------------------------------------+
| Missing next state   | Use another bounded stage                                    |
+----------------------+--------------------------------------------------------------+
| Acceptance           | Evaluate task outcome, latency, cost and correction together |
+----------------------+--------------------------------------------------------------+
~~~

## 2. Division = app and worker

~~~text
+--------------------------------+   +--------------------------------+
| TAR APP (phone)                |   | TAR WORKER (cloud)             |
+--------------------------------+   +--------------------------------+
| SHELL    Space Inbox Bots      |   | INGRESS  chat site pos email   |
| LOCAL    sqlite render drafts  |   | KERNEL   gateway runtime log   |
| CAPTURE  forms pos voice scan  |   | JUDGMENT Jev router traces     |
| CONFIRM  approval card         |   | WORK     executor scheduler    |
| SYNC     push and pull deltas  |   | STORAGE  turso d1 r2 outbox    |
+--------------------------------+   +--------------------------------+
~~~

The line between the two sides is **who may decide what**.

~~~text
+------------------+----------------------------------------+--------------------------------------+
| Question         | App (on device)                        | Worker (cloud)                       |
+==================+========================================+======================================+
| What is shown    | decides locally from synced data       | publishes views and role filters     |
+------------------+----------------------------------------+--------------------------------------+
| What is legal    | never decides                          | policy + authority, deterministic    |
+------------------+----------------------------------------+--------------------------------------+
| What it means    | captures text, offers local candidates | bounded semantic stages              |
+------------------+----------------------------------------+--------------------------------------+
| What is true     | drafts and queued turns only           | the only place a record is committed |
+------------------+----------------------------------------+--------------------------------------+
| Keys and secrets | no provider secrets                    | stores provider credentials          |
+------------------+----------------------------------------+--------------------------------------+
~~~

**Rule = the app never holds an AI provider key and never commits shared workspace truth directly.** It
renders, captures, decides the deterministic half locally, queues turns offline, and
confirms exactly what the worker commits.

### Platform decisions and deployment boundary

| Layer | V12 decision | Status and condition |
| --- | --- | --- |
| Native app | Expo / React Native with local SQLite for permitted projections, recent reads and drafts. | App code exists; a fully proven offline sync protocol is still target work. |
| API and authorization | Cloudflare Worker hosts the gateway and current D1 identity and membership control plane. | Existing `tarharness` path; keep provider credentials server side. |
| Workspace truth | One Turso database per workspace holds business records, definitions, runs and events. | Existing schema and provisioning; all new domain storage must honor the same authority and migration rules. |
| Files and releases | R2 stores large objects and immutable release assets; committed records hold references and hashes. | Existing POS and site paths; no blob replication through device sync. |
| Async work | Persist intent and effect state, then dispatch with bounded retries, scheduled recovery and reconciliation. | Required architecture; do not describe queue or cron wiring as complete until verified in code. |
| Semantic provider | Jev via a server adapter for typed, bounded judgments; other models only for justified generation or escalation. | Proposed integration, gated by route evaluation and current account terms. |
| Browser and heavy compute | Add a browser service or isolated compute only for a measured workflow that needs it. | No fixed `browser-use`, `box` or Containers commitment from the historical cost study. |
| Channels | Native site chat and email adapters; evaluate the proposed aggregator against required networks and current fees. | Provider selection is conditional, as section 12 specifies. |

The platform can scale by adding capacity and domain packages without changing
the authority split. Neither a per-workspace database nor a cheap unit-price
estimate proves million-seat capacity, data residency, sync reliability or
end-to-end margin. These require load tests, provider agreements and measured
workloads before a commercial promise.

## 3. App side = capture, confirm, keep working offline

~~~text
+----------------------------------------------------------------+
| APP = capture + decide locally + draft + confirm + sync        |
+----------------------------------------------------------------+
| SHELL   | Space role canvas | Inbox decisions | Bots install   |
| LOCAL   | sqlite: inbox, projections, drafts, recent reads     |
| CAPTURE | forms, POS, voice note, photo scan, chat message     |
| CONFIRM | approval card: the exact effect, amount and versions |
| SYNC    | deltas push/pull; queued turns while offline         |
+----------------------------------------------------------------+
~~~

- Space is the role-aware home; Inbox is every decision that needs a person; Bots is how
  capability is installed and configured.
- The Inbox carries proposed decisions, consequential ambiguities, and blocked or failed work. Harmless preference ambiguity can use a safe default without creating a review task.
- The deterministic half works offline: totals, stock shown, permission hints cached, drafts
  saved. A queued turn is a draft, never an accepted shared change.
- Every screen shares the same states:

~~~text
+---------+---------+----------+--------+-----------+------+
| offline | pending | conflict | denied | ai paused | done |
+---------+---------+----------+--------+-----------+------+
~~~

- When the budget is exhausted or Jev is unreachable, the app says "ai paused" and keeps
  every manual control usable.

- Cached permissions and stock support local presentation, never final authorization or availability. The worker checks current facts at commit.
- Manual checkout remains usable when optional AI is paused. While disconnected it remains a queued draft under this shared-truth model; the UI must not claim a server-confirmed order or verified electronic payment.
- Source-linked drafts show the particular missing or ambiguous field. Users correct that field rather than repeating the entire request.

## 4. Worker side = one commit path, five sections

~~~text
+----------------------------------------------------------------+
| WORKER = ingress + kernel + judgment + work + storage          |
+----------------------------------------------------------------+
| INGRESS  | channels chat/site/pos/email; verify; enqueue       |
| KERNEL   | gateway: authorize, validate, replay, commit        |
| JUDGMENT | Jev bundles, router ladder, traces, budgets         |
| WORK     | executor, scheduler, outbox, effects, recovery      |
| STORAGE  | turso truth, d1 identity, r2 files, queue + cron    |
+----------------------------------------------------------------+
~~~

**Rule = one mutation path.** Every accepted change passes the gateway, in order:

~~~text
request
  |
  v
+----------------+   +----------------+   +----------------+   +----------------+
| AUTHORIZE      |   | VALIDATE       |   | REPLAY CHECK   |   | COMMIT         |
| identity, role,|-->| fields, types, |-->| same key + hash|-->| state + log +  |
| policy         |   | laws, versions |   | = stored answer|   | task + trace   |
+----------------+   +----------------+   +----------------+   +----------------+
  |
  v
dispatch: queue -> EXECUTOR, cron -> SCHEDULER, effect -> provider
~~~

- D1 holds identity, membership and budget reservations. One Turso database per
  workspace holds records, definitions, runs, events and its transactional command log.
  R2 holds files and releases. Cross-store coordination uses durable reservation and
  outbox records; do not imply a transaction spanning D1, Turso and R2.
- A judgment call never sits inside a transaction. Reserve, judge, then commit.
- Recovery is bounded: retry with the same key, resume unfinished work on cron, deduplicate
  accepted commands and dispatch with provider idempotency where available. Ambiguous
  provider completion is reconciled before another non-idempotent effect is sent.

### Judgment module = extend the existing boundary

The server owns a TypeSafe adapter, versioned question compiler, result validation, dependency-aware reuse,
budgets and trace hooks. Begin inside the existing runtime. No separate inference service, second action
catalog or general agent framework is required.

The action catalog provides descriptions, field schemas, outputs, roles and effects. Domain packages add
candidate retrieval, semantic rubrics and templates. They do not redefine authority. Section 19
distinguishes these proposed additions from inspected implementation.

## 5. Judgment = one semantic core, bounded evidence stages

These are application patterns around the three provider primitives, not seven new services or new model
capabilities.

~~~text
+-----------+-------------------+------------------------------------+------------------------------------+
| Operation | Primitive         | Meaning                            | Shared consumers                   |
+===========+===================+====================================+====================================+
| `route`   | Choice            | Which supported intent or handler  | Inbox, command bar, channels, Bots |
|           |                   | fits?                              |                                    |
+-----------+-------------------+------------------------------------+------------------------------------+
| `select`  | Choice            | Which candidate record, span,      | POS, CRM, documents, workflows,    |
|           |                   | offering, or template is intended? | search                             |
+-----------+-------------------+------------------------------------+------------------------------------+
| `tag`     | Independent Nouls | Which properties independently     | Exceptions, topics, evidence       |
|           |                   | hold?                              | checks, preferences                |
+-----------+-------------------+------------------------------------+------------------------------------+
| `rate`    | Score             | How much of a clearly described    | Priority, fit, relevance,          |
|           |                   | property is supported?             | readiness                          |
+-----------+-------------------+------------------------------------+------------------------------------+
| `relate`  | Choice            | How do two supplied items relate?  | Duplicates, memory,                |
|           |                   |                                    | reconciliation, contradictions     |
+-----------+-------------------+------------------------------------+------------------------------------+
| `check`   | Noul or Choice    | Does supplied evidence support a   | Extraction, replies, publications, |
|           |                   | specified claim or condition?      | proposals                          |
+-----------+-------------------+------------------------------------+------------------------------------+
| `shape`   | Choice plus Nouls | Which approved structure should    | Briefs, forms, sites, imports      |
|           |                   | present existing content?          |                                    |
+-----------+-------------------+------------------------------------+------------------------------------+
~~~

Keep the question library small by sharing these shapes, not by forcing every domain to share vague wording.
A sales-readiness rubric and a support-urgency rubric have different meanings and need separate versions.

**Use the primitive that matches the answer.** Choice is a competing set, Score is degree on an ordered
rubric, and Noul is probability of a yes/no proposition. A Noul of 0.5 is not “medium urgency.” Score
divided by its maximum index can normalize an intensity for weighting; it does not become a probability of a
business outcome. See [primitives](https://docs.typesafe.ai/primitives.md) and [composite
scoring](https://docs.typesafe.ai/patterns/composite-scoring.md).

### Runtime = one module inside the existing server

~~~text
event / command
  -> authenticate + resolve tenant + deterministic rules
  -> retrieve authorized candidates and current facts
  -> choose the needed question bundle
  -> reuse valid assessments or evaluate the missing judgments
  -> compose proposal in code
  -> validate types, permissions, versions, amounts, and effects
  -> execute / show draft / clarify / escalate
  -> retain provenance, actual usage, and observed outcome
~~~

The module needs an adapter, bundle compiler, result validator, reuse policy, and trace hook. It does not
initially need its own deployment, database, general agent framework, prompt marketplace, vector service, or
workflow engine.

Question definitions should declare their inputs, candidate source, version, output meaning, consumers, and
budget. The compiler deduplicates identical questions needed by several consumers. It batches questions only
where shared state is relevant and safe; do not combine unrelated tenant records merely to reduce request
count.

The existing catalog supplies admissible actions. Domain adapters supply descriptions and candidates;
business code supplies eligibility. A customer request does not unlock an action that the authenticated
actor cannot perform.

### Decision = distinguish inference from execution

1. Code narrows to valid actions and candidate values.
2. Jev interprets intent within those candidates.
3. Code reconstructs typed arguments and checks cross-field relationships.
4. The existing gateway applies the action with ordinary authorization and concurrency checks.

For an unsupported request, return an explicit unsupported or missing-input outcome. A prose model may
explain or help form a draft; it must not bypass the same gateway.

The [function-calling cookbook](https://docs.typesafe.ai/cookbooks/function_calling.md) supports closed-set
functions, enum arguments, and boolean/multiple-label selections. Its demonstration does not solve arbitrary
text, numbers, or dates. TAR must find or obtain these values separately and preserve their source. Do not
silently accept a cookbook default for an unstated payment amount or booking date.

### Candidate generation before model selection

~~~text
+----------------------+-----------------------------------------+--------------------------------------------+
| Step                 | Owner                                  | Required result                            |
+======================+=========================================+============================================+
| Find                 | Code: IDs, aliases, search, screen      | Authorized candidates with version/source   |
|                      | context and typed filters                | offsets                                     |
+----------------------+-----------------------------------------+--------------------------------------------+
| Select role          | Jev: choose supplied candidate/span      | Recipient, delivery contact, amount role,   |
|                      |                                         | item or other semantic role                 |
+----------------------+-----------------------------------------+--------------------------------------------+
| Normalize            | Code                                  | Copy selected source span; parse/validate   |
+----------------------+-----------------------------------------+--------------------------------------------+
| No match             | Code                                  | Widen retrieval, request input or escalate  |
+----------------------+-----------------------------------------+--------------------------------------------+
| Measure              | Evaluation                            | Candidate recall before selection accuracy  |
+----------------------+-----------------------------------------+--------------------------------------------+
~~~

Keep source offset and record version with every candidate. Equal-looking values may have different roles:
two “500” spans can be a deposit and a balance. A confident Choice cannot recover an omitted candidate. See
[pre-parsed extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md).

### Small contextual state

~~~text
+--------------------------+-----------------------------------------------------------+
| State item               | Include when needed                                        |
+==========================+===========================================================+
| Actual request           | Always for natural-language interpretation                 |
+--------------------------+-----------------------------------------------------------+
| Roles and source time    | Identity, speaker/subject, locale and timezone matter      |
+--------------------------+-----------------------------------------------------------+
| Current facts            | Live catalog, policy excerpt, selected record and versions |
+--------------------------+-----------------------------------------------------------+
| Conversation reference   | “that one”, “last time” or other dependent language        |
+--------------------------+-----------------------------------------------------------+
| Exclusions/relationships | Negation, modifier scope and record relationship           |
+--------------------------+-----------------------------------------------------------+
| Calendar arithmetic      | Code resolves after intended reference is selected         |
+--------------------------+-----------------------------------------------------------+
~~~

### Retrieval as progressive disclosure

~~~text
all authorized records -> code shortlist -> Jev compare -> code validates -> proposal
                                  |
                     >255 options -> category -> item -> none / clarify
~~~

- Measure category recall because a wrong first branch hides the correct item.
- Bot suggestions are recommendations only; no suggestion installs a capability.
- [Hierarchy](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md) and
  [skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md) provide patterns, not TAR
  accuracy guarantees.

### Call plans = stage dependencies explicitly

~~~text
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Scenario                                       | Sensible call plan                             | Why                                          |
+================================================+================================================+==============================================+
| Explicit button with valid fields              | Zero                                           | Meaning is already structured                |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Natural request with all candidates present    | One request with the necessary questions       | Shared evidence; arguments can be speculated |
|                                                |                                                | for a few branches                           |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Request whose intent determines a large        | Route, retrieve, then select                   | Second-stage state does not exist yet        |
| candidate search                               |                                                |                                              |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Brief assembled verbatim from known records    | One selection/importance stage, sometimes zero | Code can render without prose generation     |
|                                                | with saved assessments                         |                                              |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Generated reply needing evidence checking      | Optional ingress stage, prose generation, then | Verification reads the completed output      |
|                                                | Jev verification                               |                                              |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Scanned invoice                                | OCR/extraction, Jev field checks, targeted     | Jev cannot read the image itself             |
|                                                | escalation if needed                           |                                              |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Unstructured text into a document              | Line-boundary decisions, then block            | Block state depends on the first result      |
|                                                | classification if needed                       |                                              |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
| Returning visitor with ready segment/page plan | Zero during page rendering                     | Serve a previously approved choice           |
+------------------------------------------------+------------------------------------------------+----------------------------------------------+
~~~

Speculate only branches that are both plausible and cheap. If a route has ten unrelated actions with many
arguments, routing first may save more tokens than avoiding the second network round trip. State the
speculative premise in each question; questions cannot refer to sibling answers. See
[fan-out](https://docs.typesafe.ai/patterns/fan-out.md) and [structure
recovery](https://docs.typesafe.ai/cookbooks/autoformat.md).

Use confidence to choose useful behavior. If two harmless hero variants are both acceptable, select a
default. If two customer records are plausible recipients of a private invoice, clarify. The desired
decision is consequence-dependent; one global threshold creates unnecessary reviews and unsafe exceptions.

### Question assets = versioned code first

Question IDs are local routing keys, not model instructions. Put complete meaning in instructions and
criteria, with explicit state paths and role descriptions. Compile only the relevant union of questions,
deduplicating identical judgments needed by different consumers.

Start bundles as reviewed code assets. The current definitions schema allows `flow`, `record_type`, `bot`
and `kit`; adding another kind requires a deliberate migration. Existing API spellings are preserved behind
adapters. New internal names remain one semantic lowercase word, qualified through structure.

### Never delegated = the execution boundary

~~~text
+-----------------------------------------------------------+---------------------------------------------------------+
| Work                                                      | Owner                                                   |
+===========================================================+=========================================================+
| Identity, roles, access, consent and effect authority     | Deterministic policy and verified evidence              |
+-----------------------------------------------------------+---------------------------------------------------------+
| Arithmetic, tax, balances, stock and calendar comparisons | Domain code                                             |
+-----------------------------------------------------------+---------------------------------------------------------+
| Payment success and settlement                            | Verified provider evidence or authorized cash recording |
+-----------------------------------------------------------+---------------------------------------------------------+
| Refund amount, destination and approval                   | Domain rules and configured human approval              |
+-----------------------------------------------------------+---------------------------------------------------------+
| Options, handlers and compatible bindings                 | Published catalog plus code retrieval                   |
+-----------------------------------------------------------+---------------------------------------------------------+
| Prose, arbitrary code and original copy                   | Optional generation stage                               |
+-----------------------------------------------------------+---------------------------------------------------------+
| Pixel/layout inspection                                   | Rendered checks and appropriate visual tools            |
+-----------------------------------------------------------+---------------------------------------------------------+
| Effect execution and replay                               | Existing gateway and runtime                            |
+-----------------------------------------------------------+---------------------------------------------------------+
~~~

## 6. Router = cheapest useful path, consequence-aware gates

~~~text
request -> CODE      exact action, rule, lookup or template
        -> REUSE     completed assessment with valid dependencies
        -> JEV       bounded semantic questions over relevant evidence
        -> CLARIFY   missing value, conflicting intent, ambiguous recipient
        -> GENERATE prose / code / stronger extraction when useful
        -> REVIEW   unresolved consequential choice or required approval
~~~

**Rule = optimize total useful work, not a fixed number of calls.** A single Jev judgment may replace one
useful classification call; a broad speculative bundle may cost more than two narrow stages. Compare the
actual alternative, including retrieval, latency, verification, corrections and review.

**Rule = budget judgment as well as generation.** Set route ceilings for tokens, candidate counts, question
count, concurrency, retries and elapsed time. Extra questions are billed input. Uncertain answers cost the
inference that produced them and may require additional work.

The fallback depends on the failure. Missing candidates need retrieval; missing source evidence needs
capture; an ambiguous customer needs clarification; a provider outage needs a usable draft or manual path. A
prose model is not a universal fallback for a typed action resolver.

### Verification = after the relevant output exists

For generated replies, check exact values and references in code first, then use Jev for contextual support,
contradiction, and unresolved customer questions. Check the completed draft before the authorized send step.

The [citation cookbook](https://docs.typesafe.ai/cookbooks/citation_check.md) combines exact quote matching
with a semantic support check. Apply that pattern to quotes, invoices, policy explanations, and supplier
comparisons: a quoted passage can exist while failing to support the claim.

Use independent flags for serious failures; do not average a wrong recipient or unsupported price away with
good tone and relevance. Conversely, do not run a generic semantic guard on every deterministic effect when
the existing invariants already establish correctness.

An effective escalation ladder is:

~~~text
exact rule or valid saved result
  -> bounded semantic judgment
  -> better evidence or a focused user clarification
  -> targeted stronger extraction / generation / reasoning if useful
  -> review when the unresolved consequence requires it
~~~

Changing models is not the only recovery. Often the cheapest correction is selecting the right customer or
supplying the missing date. Track which failure class each fallback actually fixes.

### Acceptance = apply the full route policy

An accepted proposal must satisfy current access, required fields, source coverage, model-result validation,
domain constraints and the evaluated acceptance policy. Use only consumed answers; ignore uncertainty on
unused speculative branches. Check serious violations independently and apply explicit precedence. A
desirable relevance or tone score cannot offset an invalid recipient or unsupported amount.

The ordinary user sees the missing fact, evidence and next action. Raw distributions remain available in
diagnostic detail; they are not proof of overall correctness.

## 7. Trace and reuse = assessments as records

**Rule = retain evidence and reuse valid completed work.** A turn can have several assessment stages and
provider attempts; an accepted action can consume several assessments.

~~~text
+---------+------------------------------------------------------------------+
| Field   | Meaning                                                          |
+=========+==================================================================+
| id      | Assessment identity                                              |
+---------+------------------------------------------------------------------+
| tenant  | Workspace or personal scope                                      |
+---------+------------------------------------------------------------------+
| task    | Work item served                                                 |
+---------+------------------------------------------------------------------+
| stage   | Evidence stage within the task                                   |
+---------+------------------------------------------------------------------+
| attempt | Provider attempt, including ambiguous completion                 |
+---------+------------------------------------------------------------------+
| model   | Exact served model version                                       |
+---------+------------------------------------------------------------------+
| bundle  | Question definition version                                      |
+---------+------------------------------------------------------------------+
| source  | Evidence references, offsets and versions                        |
+---------+------------------------------------------------------------------+
| pack    | Memory pack revision and live overlay references                 |
+---------+------------------------------------------------------------------+
| hash    | Canonical dependency fingerprint                                 |
+---------+------------------------------------------------------------------+
| answers | Typed values, distributions and consumed branches                |
+---------+------------------------------------------------------------------+
| usage   | Actual tokens and reservation reference                          |
+---------+------------------------------------------------------------------+
| cost    | Actual or unresolved estimated provider spend                    |
+---------+------------------------------------------------------------------+
| latency | Provider and end-to-end durations                                |
+---------+------------------------------------------------------------------+
| status  | Pending, completed, failed or unresolved inference               |
+---------+------------------------------------------------------------------+
| outcome | Accepted, corrected, reviewed or rejected proposal and resulting |
|         | action                                                           |
+---------+------------------------------------------------------------------+
~~~

### Assess a changed record once

When a new enquiry arrives, derive topic, urgency, purchase readiness, missing details, and relation to an
existing record. Store those dimensions with evidence and versions. Then:

- Inbox weights urgency and waiting time.
- CRM groups expressed needs and buying stage.
- Sales prioritizes qualified opportunities.
- Search filters on the same tags.
- Review shows missing evidence and unusual requests.
- Reporting counts validated categories over time.

Changing a UI weight should not cause another model request. Normalize compatible Score rubrics and compose
the ranking in code. Apply hard deadlines and contractual obligations before preference weighting so an
urgent mandatory task cannot be averaged away.

This is a materialized assessment: an ordinary stored result refreshed when its dependencies change. Avoid
building a general feature platform initially.

### What can and cannot be reused

~~~text
+-------------------------------+---------------------------------------------------------------+
| Judgment                      | Reuse boundary                                                |
+===============================+===============================================================+
| Topic expressed in a message  | Same message and question version                             |
+-------------------------------+---------------------------------------------------------------+
| Fit to a particular offering  | Same message, offering, and rubric versions                   |
+-------------------------------+---------------------------------------------------------------+
| Relevance to a search query   | Same query-candidate pair; a new query needs a new judgment   |
+-------------------------------+---------------------------------------------------------------+
| Current refund eligibility    | Recompute business rules from current order and policy; never |
|                               | infer from a stale tag                                        |
+-------------------------------+---------------------------------------------------------------+
| Preferred presentation        | Same permitted preference evidence and approved variant set   |
+-------------------------------+---------------------------------------------------------------+
| Stock or booking availability | Live authoritative code check before commitment               |
+-------------------------------+---------------------------------------------------------------+
~~~

Use dependencies rather than only a TTL: tenant, access scope, source versions, candidate list and order,
model version, question version, relevant policy, locale, and time assumptions. Store actual resolved model
IDs. Share an in-flight identical request where practical, but distinguish completed, pending, and failed
results.

An uncertain completed answer can be reused when inputs are identical; that does not make it useful or
correct. A user correction becomes new evidence. A provider timeout may have consumed inference even if TAR
never received the answer. Retrying must preserve effect idempotency while accounting for possible repeated
inference cost.

### Policy changes = distinguish composition from interpretation

A changed UI weight or acceptance threshold can recompute policy over unchanged raw judgments. A changed
clause, question meaning, candidate set, source evidence, time assumption or model requires re-evaluation of
affected judgments. Access is checked before reuse and again before execution.

Duplicate taps replay accepted command results. Stored inference avoids repeated provider work where
available; a crash between provider completion and durable storage can still cause repeated billing. Do not
promise exactly-once inference.

## 8. Budget and limits = reserve, measure, degrade usefully

**Rule = reserve, then spend, then reconcile.** Reserve bounded spend against the actor and workspace,
record the attempt durably, and reconcile actual usage. If completion is unknown, retain the unresolved
reservation until reconciliation or a documented conservative expiry policy resolves it. Do not prematurely
return potentially spent budget.

~~~text
+------------------+----------------------------------------------+------------------------------------------------+
| Limit            | Current provider contract or proposed TAR    | Handling                                       |
|                  | policy                                       |                                                |
+==================+==============================================+================================================+
| Model            | jev-1.13.0, checked 2026-09-23               | Pin and evaluate upgrades                      |
+------------------+----------------------------------------------+------------------------------------------------+
| Total request    | 64k tokens                                   | State plus all questions and framing           |
+------------------+----------------------------------------------+------------------------------------------------+
| Longest question | 32k tokens with state                        | Check separately from total                    |
+------------------+----------------------------------------------+------------------------------------------------+
| Choice           | At most 255 options                          | Retrieve, narrow, or use measured staged       |
|                  |                                              | selection                                      |
+------------------+----------------------------------------------+------------------------------------------------+
| Score            | 2–10 described levels                        | Normalize by maximum index only for comparable |
|                  |                                              | intensity                                      |
+------------------+----------------------------------------------+------------------------------------------------+
| Input            | Text, structured text objects/arrays         | OCR or transcription before judgment           |
+------------------+----------------------------------------------+------------------------------------------------+
| Request quota    | 1,200 per minute, dynamic                    | Bounded concurrency and account capacity       |
|                  |                                              | planning                                       |
+------------------+----------------------------------------------+------------------------------------------------+
| Token quota      | 250,000 per second, dynamic                  | Budget tokens as well as calls                 |
+------------------+----------------------------------------------+------------------------------------------------+
| State target     | Small and sufficient, route-specific         | No universal 2k cap that silently drops        |
|                  |                                              | evidence                                       |
+------------------+----------------------------------------------+------------------------------------------------+
| Questions        | Only needed and useful speculative questions | Per-route token, option and latency budgets    |
+------------------+----------------------------------------------+------------------------------------------------+
| Memory excerpt   | Start near 300 tokens where adequate         | Expand/retrieve when evaluated coverage        |
|                  |                                              | requires it                                    |
+------------------+----------------------------------------------+------------------------------------------------+
| Memory pack      | Initial 8k planning cap per scoped pack      | Preserve sources and critical live overlays    |
+------------------+----------------------------------------------+------------------------------------------------+
| Public page view | 0 Jev calls                                  | Default or saved release plan only             |
+------------------+----------------------------------------------+------------------------------------------------+
| Site release     | Max 16,800 input tokens per lean plan        | 4 public segments × 3 key pages × 1,400 tokens|
+------------------+----------------------------------------------+------------------------------------------------+
| Site experiment  | Disabled unless merchant enables an allowance | Separate budget; never funded by page views    |
+------------------+----------------------------------------------+------------------------------------------------+
~~~

The [model page](https://docs.typesafe.ai/models.md) owns changing provider limits; TAR values above are
design starting points, not provider requirements.

~~~text
+--------------------------+----------------------------------------------------------------+
| Operating condition      | Required behavior                                              |
+==========================+================================================================+
| 401 / 422                | Correct credentials/request; do not retry blindly              |
+--------------------------+----------------------------------------------------------------+
| 429 / 529                | Bounded exponential backoff within route deadline              |
+--------------------------+----------------------------------------------------------------+
| Budget/external outage   | Serve site default, preserve draft and keep manual work usable |
+--------------------------+----------------------------------------------------------------+
| Tenant contention        | Protect interactive work from imports and consolidation        |
+--------------------------+----------------------------------------------------------------+
| Data sent to provider    | Server-side credentials; authorized evidence; retention policy |
+--------------------------+----------------------------------------------------------------+
| Trace retention          | Retain necessary evidence only; replay is not blanket storage  |
+--------------------------+----------------------------------------------------------------+
~~~

Source: [HTTP API](https://docs.typesafe.ai/api.md), [models and data
handling](https://docs.typesafe.ai/models.md).

## 9. Cost = transparent workload scenarios, measured outcomes

As checked on 2026-09-21, `jev-1.13.0` costs **USD 0.042 per million input tokens**, with free output
tokens. Current limits are **64k total request tokens**, **32k state plus longest question**, **1,200
requests/minute**, and **250,000 tokens/second**. Limits are dynamic. Jev accepts text, not
images/audio/video. [Model source](https://docs.typesafe.ai/models.md).

Use INR 95/USD only as this scenario's planning assumption, not a current exchange-rate claim.

~~~text
billed input = state + every question's instructions and criteria + framing
Jev cost = actual input tokens / 1,000,000 × USD 0.042
workflow cost = Jev + OCR/transcription + generation + retries
              + storage/compute + channel fees + review effort
~~~

### Table A = per user per month

~~~text
+---------------------------------+------------------------------------------+-----------------------------+
| Scenario                        | Explicit assumptions                     | Jev-only INR / seat / month |
+=================================+==========================================+=============================+
| Every-intent baseline           | 1,500 calls × 2,000 total input tokens   | 11.97                       |
+---------------------------------+------------------------------------------+-----------------------------+
| Same calls with questions added | 2,000 state + 30 questions × 60 tokens = | 22.74                       |
|                                 | 3,800, before extra framing              |                             |
+---------------------------------+------------------------------------------+-----------------------------+
| Selective illustrative workload | The breakdown below; 2.172 million input | 8.67                        |
|                                 | tokens                                   |                             |
+---------------------------------+------------------------------------------+-----------------------------+
~~~

Selective example assumptions, not measured savings:

- 1,500 interactions, 40% needing semantics, 10% valid reuse: 540 paid primary calls × 3,000 tokens.
- 25% of those need a dependent second stage: 135 × 2,000 tokens.
- 20% need a generated-output check: 108 × 1,500 tokens.
- 60 background consolidation calls × 2,000 tokens.

Total = 843 calls and 2.172 million tokens. This excludes site visitors, bulk imports, additional event
assessments, prose, infrastructure, channel charges, and review. Add them explicitly for a complete budget.
Reuse rates and semantic demand must be observed, and event-driven work must not be double-counted as both
ingress and a new background assessment.

### Table A1 = per user, with Jev and no Jev

~~~text
+---------------------------+------------------------------+------------------------------+-------------------------------------------+
| Per user / month scenario | With Jev                     | No Jev                       | Comparison rule                           |
+===========================+==============================+==============================+===========================================+
| Semantic interpretation   | INR 11.97                    | INR 42.73 historical model  | Same 1,500 user intents; no-Jev number is |
| at 1,500 intents          | 1,500 × 2,000 input tokens   | baseline, including generic  | an illustration, not a current quote      |
|                           |                              | model, guard and retry mix   |                                           |
+---------------------------+------------------------------+------------------------------+-------------------------------------------+
| Selective whole workflow  | INR 8.67                     | Measure against the same     | Same capture, response, review and outcome |
|                           | 843 stages; 2.172M tokens    | route before claiming saving | must be included on both sides            |
+---------------------------+------------------------------+------------------------------+-------------------------------------------+
| Explicit structured work  | INR 0 semantic cost          | INR 0 semantic cost          | Buttons, rules, totals and lookups use     |
|                           |                              |                              | code in both architectures                |
+---------------------------+------------------------------+------------------------------+-------------------------------------------+
| Common generation, OCR,   | Add actual provider cost      | Add actual provider cost      | Compare the same output and evidence path  |
| storage and review        | outside the Jev line         | outside the baseline line     | rather than crediting it to Jev            |
+---------------------------+------------------------------+------------------------------+-------------------------------------------+
~~~

The INR 42.73 row is retained only as a historical illustrative generative-model baseline. Its provider
prices and workload have not been revalidated. The INR 11.97 and INR 8.67 rows are Jev input-cost scenarios,
not product-total cost. The meaningful comparison is a matched completed workflow, which the next table
defines.

### Table A2 = end-to-end cost ledger per user

~~~text
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Cost line                 | With Jev                       | No Jev                         | Record for both                         |
+===========================+================================+================================+========================================+
| Capture                   | Actual OCR/transcription cost  | Same capture cost              | Source quality, failures and retries    |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Retrieve and validate     | Deterministic code             | Deterministic code             | Candidate recall and live-rule checks   |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Interpret natural input   | Actual Jev tokens × INR rate   | Actual baseline model or       | Model/version, tokens, latency, route   |
|                           |                                | manual-review cost             | and accepted outcome                    |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Compose proposal          | Code and templates; generation | Same code/templates; generation| Generated output only when needed       |
|                           | only when needed               | only when needed               |                                        |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Verify output             | Targeted semantic check where  | Equivalent evidence check      | Unsupported claims and review minutes    |
|                           | it adds value                  |                                |                                        |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Commit and effects        | Same gateway, outbox and       | Same gateway, outbox and       | Provider fees, reconciliation and        |
|                           | provider fees                  | provider fees                  | duplicate-effect prevention              |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Reuse and background work | Valid assessments, packs and   | Equivalent cache/background    | Invalidations, saved calls and stale     |
|                           | scheduled consolidation        | processing                     | evidence                                 |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
| Total per completed task  | Sum actual rows / completed    | Sum actual rows / completed    | Compare cost, p95 latency, correction and |
|                           | accepted task                  | accepted task                  | review rate on matched traffic           |
+---------------------------+--------------------------------+--------------------------------+----------------------------------------+
~~~

This table is the release ledger. It prevents a cheaper interpretation call from being presented as an
end-to-end saving when capture, output, provider effects or human correction become more expensive.

### Site economics reveal the bigger opportunity

~~~text
+------------------------+---------------------------------+--------------------------+--------------------------+
| Planning item          | Formula                         | Jev INR                  | V12 use                  |
+========================+=================================+==========================+==========================+
| Jev input rate         | INR 95 × USD 0.042 / 1M         | INR 0.00000399 / token   | Planning rate only       |
+------------------------+---------------------------------+--------------------------+--------------------------+
| Lean plan per release  | 4 segments × 3 pages × 1,400    | INR 0.067032              | Standard site plan       |
|                        | tokens = 16,800 tokens           |                          |                          |
+------------------------+---------------------------------+--------------------------+--------------------------+
| Lean plan, four        | 4 × 16,800 = 67,200 tokens       | INR 0.268128 / month      | Four meaningful releases |
| releases per month     |                                 |                          |                          |
+------------------------+---------------------------------+--------------------------+--------------------------+
| Wide plan, retired     | 8 × 10 × 5,600 = 448,000 tokens  | INR 1.78752 / rebuild     | Do not use by default    |
+------------------------+---------------------------------+--------------------------+--------------------------+
| Per-visit layout plan  | 6,800 tokens × every visit       | INR 2,713.20 / 100k views | Forbidden normal path    |
+------------------------+---------------------------------+--------------------------+--------------------------+
~~~

~~~text
PUBLISH
  business brief + approved content
      -> CODE: choose 4 fixed public segments and 3 key pages
      -> JEV: one coherent composition per segment/page
      -> CODE: validate, save, cache, publish

VISIT
  default / explicit language / selected category -> CODE: serve saved page
  no visitor history inference
  no session inference
  no page or slot inference
~~~

~~~text
+---------------------------+-----------------------------------------+-----------------------------------------+
| Site event                | Action                                  | Jev budget                              |
+===========================+=========================================+=========================================+
| Normal page view          | Serve cached default or saved variant   | 0                                       |
+---------------------------+-----------------------------------------+-----------------------------------------+
| Language/category choice  | Select deterministic ready page         | 0                                       |
+---------------------------+-----------------------------------------+-----------------------------------------+
| Price, stock or hours     | Read live workspace record              | 0                                       |
+---------------------------+-----------------------------------------+-----------------------------------------+
| Content release           | Rebuild only its affected plan          | Max 16,800 input tokens / release       |
+---------------------------+-----------------------------------------+-----------------------------------------+
| Merchant asks to redesign | Create a draft in the workspace flow    | Separate explicit build allowance        |
+---------------------------+-----------------------------------------+-----------------------------------------+
| Visitor asks a question   | Use channel/chat budget, not site-view  | Separate optional assistance allowance   |
+---------------------------+-----------------------------------------+-----------------------------------------+
~~~

**Hard site rule = Jev never runs because somebody opened a page.** A merchant changes content, requests a
new design, or explicitly enables a separately budgeted experiment before a site Jev call is allowed.

The affordable baseline for 100,000 views is therefore **INR 0.27/month for four lean plan rebuilds**, plus
ordinary hosting and any separately chosen build/chat work. The INR 2,713.20 design is retained only as a
rejected anti-pattern; it must never become a default route.

~~~text
PUBLISH
  content + approved variants
      -> code validates eligibility and components
      -> Jev selects coherent segment/page plans once
      -> save plan by segment + page + locale

VISIT
  explicit locale/category -> saved plan or default -> render
  visitor question         -> normal channel/chat budget, not page-view budget
~~~

~~~text
+----------------------------+----------------------------------------+----------------------------------------------+
| Event                      | Cheapest valid action                  | Do not pay for                               |
+============================+========================================+==============================================+
| Price, stock or hours      | Read current workspace record          | Re-selecting a layout                        |
+----------------------------+----------------------------------------+----------------------------------------------+
| New content/release        | Rebuild only affected segment/page plan| Rebuilding all visitors' plans               |
+----------------------------+----------------------------------------+----------------------------------------------+
| Explicit language/category | Select deterministic ready variant     | Session classification                       |
+----------------------------+----------------------------------------+----------------------------------------------+
| Ambiguous visitor intent   | Serve the default page                 | Session, slot or page model calls            |
+----------------------------+----------------------------------------+----------------------------------------------+
| Visitor requests something | Use normal channel/chat route          | Charging site-view budget or using history   |
| unique                     |                                        | without permission                           |
+----------------------------+----------------------------------------+----------------------------------------------+
~~~

This is Jev inference cost only. Add generation, rendering, hosting, review and any merchant-selected build
work to Table A2. The saving comes from treating public page views as deterministic delivery, not AI work.

### Table B = full scale and capacity

At one million seats × 1,500 monthly requests, a 30-day average is roughly **579 requests/second**, versus
the currently published 20/second equivalent request quota. At 2,000 input tokens each it is approximately
**1.16 million tokens/second**, also above the published token quota. Peaks and background work make the gap
larger.

Before promising that scale, obtain appropriate provider capacity, reduce unnecessary inference, serve valid
saved assessments, schedule background work, and set tenant fairness. The optimized example still needs
about 325 requests/second at one million seats; optimization does not eliminate capacity planning.

Use bounded concurrency, deadline-aware backoff, and meaningful degradation. A timeout should preserve a
manual form or draft, serve a default site, or queue background work. It should not automatically send every
failure to a prose model that lacks the required action contract. The [API](https://docs.typesafe.ai/api.md)
distinguishes validation/authentication failures from retryable throttling and overload.

~~~text
+-----------+---------------------+-------------------+------------------------+-------------------------+
| Seats     | Baseline requests/s | Selective example | Baseline Jev INR/month | Selective Jev INR/month |
|           |                     | requests/s        |                        |                         |
+===========+=====================+===================+========================+=========================+
| 1,000     | 0.58                | 0.33              | 11,970                 | 8,666.28                |
+-----------+---------------------+-------------------+------------------------+-------------------------+
| 10,000    | 5.79                | 3.25              | 119,700                | 86,662.80               |
+-----------+---------------------+-------------------+------------------------+-------------------------+
| 100,000   | 57.87               | 32.52             | 1,197,000              | 866,628.00              |
+-----------+---------------------+-------------------+------------------------+-------------------------+
| 1,000,000 | 578.70              | 325.23            | 11,970,000             | 8,666,280.00            |
+-----------+---------------------+-------------------+------------------------+-------------------------+
~~~

Thirty-day averages; baseline = 1,500 calls/seat and selective = 843. Peaks, site traffic and omitted work
are additional. These are workload scenarios, not a controlled proof of equal behavior or guaranteed saving.

### Intelligence everywhere = reuse more than you call

A session can consume hundreds of decisions without making hundreds of new requests. Stored record
assessments, explicit actions and precomputed variants make that possible. If 300 new requests of 1,200
total tokens run in each of 30 monthly sessions, Jev alone costs INR 43.09 per seat under the planning
exchange rate. That workload is different from the 1,500-interaction scenario and still excludes the rest of
the stack.

Cost per user depends on activity, reuse, background work and traffic. It is not inherently flat. Track
actual fully loaded cost and contribution margin; the INR 100 cost envelope is a target, not a demonstrated
property at every scale.

## 10. End to end = every domain, one execution grammar

~~~text
capture -> exact rules -> authorized evidence -> reuse / judgment stages
        -> typed proposal -> validation -> approval when required
        -> gateway commit -> outbox effects -> outcome + assessment reuse
~~~

### Domain coverage = the complete commerce cycle

P0 means foundation/pilot; P1 means expansion after the pilot; P2 means dependent on mature data or
infrastructure. These are priorities, not claims of current implementation.

~~~text
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Area               | Jev opportunity and        | Deterministic composition  | Measure                    | Phase |
|                    | evidence                   | / complexity removed       |                            |       |
+====================+============================+============================+============================+=======+
| Command bar        | Select supported action    | One resolver replaces      | Correct completed          | P0    |
|                    | from utterance and active  | per-screen language        | commands; clarification    |       |
|                    | screen                     | routers                    | rate                       |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Inbox              | Rate urgency and tag       | Shared assessments replace | Missed urgent work; time   | P0    |
|                    | intent from message +      | separate triage prompts    | to resolution              |       |
|                    | relevant obligation        |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Channels           | Interpret email, chat, and | One semantic layer behind  | Accuracy by channel and    | P1    |
|                    | voice transcripts through  | channel adapters           | transcript quality         |       |
|                    | the same bundles           |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| CRM capture        | Select contact/company     | Typed drafts replace       | Field precision and        | P0    |
|                    | spans and requested field  | freeform record generation | candidate recall           |       |
|                    | roles                      |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| CRM duplicates     | Relate plausible pairs     | Shortlist + review         | False merge suggestions;   | P1    |
|                    | using identifiers and      | replaces unconstrained     | duplicate recall           |       |
|                    | supplied history           | record matching            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| CRM timeline       | Select commitments,        | Evidence-linked timeline   | Useful-event recall; stale | P1    |
|                    | changes, and unresolved    | without rewriting every    | statements                 |       |
|                    | issues                     | event                      |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Lead qualification | Rate expressed need,       | Configurable ranking from  | Accepted leads and missed  | P1    |
|                    | timing, and fit            | one assessment             | opportunities              |       |
|                    | independently              |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Sales follow-up    | Select relevant next-step  | Code schedules against     | Reply rate; unwanted       | P1    |
|                    | template and missing       | consent and last contact   | follow-ups                 |       |
|                    | detail                     |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Quotes             | Match requirements to      | Code prices and assembles  | Correction rate; draft     | P0    |
|                    | eligible offerings and     | quote lines                | completion time            |       |
|                    | source spans               |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Catalog import     | Classify products; select  | Shared import pipeline     | Attribute precision;       | P1    |
|                    | attribute spans and        | across supplier formats    | import review time         |       |
|                    | categories                 |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Catalog search     | Rate candidate relevance   | Search + rerank replaces   | Recall@k; successful       | P0    |
|                    | to natural requirements    | many bespoke synonym rules | selections                 |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Substitutions      | Rate fit among             | Rank allowed stock;        | Accepted substitutes;      | P1    |
|                    | code-eligible alternatives | deterministic              | invalid suggestions        |       |
|                    |                            | compatibility exclusions   |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| POS orders         | Select items, modifiers,   | Existing cart engine       | Whole-order correctness;   | P0    |
|                    | quantities by source role  | handles totals and         | counter latency            |       |
|                    |                            | inventory                  |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Services           | Match expressed job to     | Scheduling solver handles  | Booking corrections;       | P1    |
|                    | offerings and required     | slots, capacity, travel    | missed constraints         |       |
|                    | resources                  |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Assignment         | Rate task-skill fit from   | Code respects availability | Completion quality and     | P1    |
|                    | explicit work evidence     | and access                 | reassignment rate          |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Fulfillment        | Tag delay reasons and      | Existing order state       | Exceptions resolved; wrong | P1    |
|                    | interpret exception        | machine handles            | state proposals            |       |
|                    | messages                   | transitions                |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Returns            | Classify reason and find   | Policy code determines     | Correct draft remedies;    | P1    |
|                    | referenced order/item      | available remedies         | escalation rate            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Support            | Select relevant articles   | Shared retrieval and       | First-contact resolution;  | P0    |
|                    | and relation to known      | routing replace a separate | retrieval recall           |       |
|                    | incidents                  | agent                      |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Support replies    | Check claim support and    | Targeted verification      | Unsupported claims;        | P1    |
|                    | unresolved customer        | instead of full repeated   | unnecessary escalations    |       |
|                    | questions                  | generation                 |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Suppliers          | Interpret quote            | Code compares price,       | Missed conditions; buyer   | P1    |
|                    | differences and supplier   | dates, stock, and terms    | review time                |       |
|                    | conditions                 |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Purchasing         | Match requisitions to      | Common candidate selection | Correct matches; useful    | P1    |
|                    | catalog items and          | with purchasing            | alternatives               |       |
|                    | equivalent offers          | constraints                |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Receiving          | Relate delivery notes to   | Code computes shortages    | Match accuracy; unresolved | P1    |
|                    | purchase lines             | and overages               | discrepancies              |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Finance capture    | Select amount roles,       | Exact arithmetic, ledger   | Amount-role errors; review | P1    |
|                    | references, and narrative  | rules, source-linked       | minutes                    |       |
|                    | categories                 | drafts                     |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Reconciliation     | Rank ambiguous             | Exact references first;    | False proposed matches;    | P1    |
|                    | remittance/invoice matches | code enforces balances     | unmatched reduction        |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Collections        | Classify dispute versus    | Schedule and send only     | Wrong follow-up rate;      | P1    |
|                    | promise versus missing     | under configured authority | resolved disputes          |       |
|                    | invoice                    |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Retention          | Tag stated cancellation    | Reuse support signals in   | Useful intervention rate;  | P1    |
|                    | reasons and service        | permitted renewal          | complaint rate             |       |
|                    | friction                   | workflows                  |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Campaigns          | Select approved content    | Consent, frequency, and    | Incremental conversion;    | P2    |
|                    | variant for expressed      | audience rules stay        | unsubscribe rate           |       |
|                    | interest                   | explicit                   |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Sites              | Match a permitted segment  | Precompute layouts; code   | Conversion lift; latency;  | P1    |
|                    | to approved page           | renders                    | accessibility              |       |
|                    | compositions               |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Reporting          | Classify open-text reasons | SQL computes totals;       | Category stability; false  | P1    |
|                    | and select supporting      | evidence-backed            | causal claims              |       |
|                    | examples                   | explanation                |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Knowledge          | Recover document structure | Source spans become        | Retrieval recall;          | P1    |
|                    | and tag supported facts    | searchable reusable blocks | preservation of meaning    |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Bots / Flows       | Select recipe, bindings,   | Existing actions and       | Valid useful flows; repair | P1    |
|                    | and semantic guard         | compiler replace freeform  | effort                     |       |
|                    | interpretation             | orchestration              |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Product quality    | Flag semantic              | Advisory semantic checks   | Actionable findings; false | P2    |
|                    | inconsistencies in         | beside deterministic CI    | alarms                     |       |
|                    | descriptions and help text |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
| Predictions        | Convert validated text     | Small downstream model     | Held-out improvement and   | P2    |
|                    | assessments into labeled   | when simpler rules plateau | calibration                |       |
|                    | features                   |                            |                            |       |
+--------------------+----------------------------+----------------------------+----------------------------+-------+
~~~

This extends the possibilities in the [TypeSafe use-case
map](https://docs.typesafe.ai/concepts/use-case-map.md). A possible use is not a reason to ship it
immediately. Each row must beat the current or deterministic baseline on a meaningful outcome.

### Worked paths = bounded interpretation, ordinary execution

~~~text
+----------------+-------------------------------+----------------------------------+----------------------------------+
| Flow           | Capture and Jev                | Code, approval and outcome       | Reuse and measurement            |
+================+===============================+==================================+==================================+
| Natural order  | Select menu, contact and       | Parse quantities; validate       | Reuse order facts; measure whole |
|                | modifier roles from supplied   | modifier scope, stock, tax and   | cart correctness and counter     |
|                | candidates                     | payment evidence                 | latency                          |
+----------------+-------------------------------+----------------------------------+----------------------------------+
| Catering quote | Select date, covers, diet and  | Resolve year; price eligible     | Reuse requirements in order,     |
|                | offering candidates             | package; show missing facts      | purchasing, delivery             |
+----------------+-------------------------------+----------------------------------+----------------------------------+
| Meeting brief  | Reuse or rate source-block      | Render linked decisions, changes | Measure useful evidence recall;  |
|                | relevance                       | and actions; prose is optional   | do not regenerate stable facts   |
+----------------+-------------------------------+----------------------------------+----------------------------------+
| Invoice photo  | Check extracted field roles and | OCR/vision supplies source;      | Escalate only suspect fields;    |
|                | missing evidence                | code verifies arithmetic          | measure source and field errors  |
+----------------+-------------------------------+----------------------------------+----------------------------------+
| Refund ticket  | Classify message and select     | Ledger proves duplicate; policy  | Approval binds amount/destination |
|                | narrative evidence if ambiguous  | creates remedy and provider       | before provider reconciliation    |
|                |                                 | evidence confirms execution      |                                  |
+----------------+-------------------------------+----------------------------------+----------------------------------+
~~~

Examples: “Two oat cappuccinos, one without sugar, and the sandwich from yesterday”; “Lunch for 40 on
4 October, under INR 12,000, half vegetarian”; and “Charged twice for A-104, refund the duplicate.”

Each follows the same sequence: retrieve authorized evidence, select or assess only the ambiguous part,
compose in code, clarify missing evidence, then use the existing gateway. No row promises a fixed price before
token use and workload quality are measured.

## 11. Concept screens = what the person sees

The chosen grammar is one card, one primary action and native back. Jev adds
two surfaces of its own: the review card, and the paused state when judgment is off.

These are target concept screens, not a fresh audit of shipped UI.
The target folds Records and Memory into Space as saved views; verify remaining app
layout differences during implementation.

~~~text
+-------------------------------------------+
| Slice House                    Sync   Me  |
+-------------------------------------------+
|                                           |
|                ( content )                |
|                                           |
+-------------------------------------------+
|   Space   |   Inbox   |   Bots            |
+-------------------------------------------+
~~~

~~~text
+----------+-----------------------------------------------------+----------------------------------------+
| surface  | shows                                               | never shows                            |
+==========+=====================================================+========================================+
| Space    | permitted records, metrics, common actions          | fields outside the field policy        |
+----------+-----------------------------------------------------+----------------------------------------+
| Inbox    | decisions, exceptions, waits, failures              | an action the user cannot perform      |
+----------+-----------------------------------------------------+----------------------------------------+
| Review   | one consequential ambiguity, evidence, alternatives | the whole state sent to Jev            |
+----------+-----------------------------------------------------+----------------------------------------+
| Bots     | installed and available capabilities                | internal runtime detail                |
+----------+-----------------------------------------------------+----------------------------------------+
| Channels | team channel state and customer queues              | provider tokens and raw payloads       |
+----------+-----------------------------------------------------+----------------------------------------+
| My Agent | one identity's private work                         | workspace data without live permission |
+----------+-----------------------------------------------------+----------------------------------------+
~~~

### Space = permitted facts first

~~~text
+-------------------------------------------+
| [ Slice House v ]              Sync   Me  |
| * Slice House                             |
+-------------------------------------------+
| Sales  Rs.18,420       Open orders    4   |
| Kitchen 2 preparing    1 ready    [Open]  |
+-------------------------------------------+
| [globe] Site Studio                       |
| Draft, preview and publish      >         |
| [bag]   Sell                            > |
+-------------------------------------------+
| [ New order ]   [ New lead ]   [ Ask ]    |
+-------------------------------------------+
~~~

### Inbox = decisions and exceptions

~~~text
+------------------------------------------+
| [ All areas v ]                          |
| NOW                                      |
+------------------------------------------+
| Confirm catering menu               Done |
| * Slice House                            |
+------------------------------------------+
| Check order #1044  Needs detail  Review  |
| #T7-4F9A21                               |
| 2 x Margherita        Start    ( )       |
| 1 x Garlic Bread      Ready    ( )       |
| Payment - Rs.651.00   Collect            |
+------------------------------------------+
| NEXT                                     |
| Chase the deposit for T7            Done |
+------------------------------------------+
~~~

- A durable forget arrives as a Review card: the row, its sources, and what recall
  immediately stops using (sec 18).

### Review = one unsure judgment, in the open

~~~text
+------------------------------------------+
| REVIEW  order #1044                      |
+------------------------------------------+
| Which item did "that" mean?              |
| Margherita or Garlic Bread               |
| Evidence  two close menu matches         |
| [ Open source ]     [ Technical detail ] |
| Your choice updates this draft           |
+------------------------------------------+
| [ Accept Margherita ]    [ Ask Priya ]   |
+------------------------------------------+
~~~

### Bots = capabilities

~~~text
+-----------------------------------------+
| Bots                             Manage |
+-----------------------------------------+
| [A] My Agent                     pinned |
| your private work                       |
+-----------------------------------------+
| [P] POS                      installed  |
| orders, payments, stock                 |
+-----------------------------------------+
| [S] Sales                    installed  |
| leads, quotes, follow-up                |
+-----------------------------------------+
| [R] Support                  available  |
| tickets, returns                        |
+-----------------------------------------+
~~~

### Bot detail = what a bot owns and does

~~~text
+------------------------------------------+
| < POS                                    |
| [P] orders, payments, stock and register |
+------------------------------------------+
| Flows                                    |
| [x] Take an order           3 Actions    |
| [x] Adjust stock            2 Actions    |
| [ ] Custom Flow             1 Action     |
+------------------------------------------+
| + New Flow                               |
| [        Save        ]   Remove Bot      |
+------------------------------------------+
~~~

### My Agent = private, ask first

~~~text
+-------------------------------------------+
| My Agent                         Private  |
+-------------------------------------------+
| Ask  [ Plan my week, watch a price... ]   |
+-------------------------------------------+
| Renew insurance       waiting approval    |
| Track laptop price    next check tomorrow |
+-------------------------------------------+
| Goals | Tasks | Files | Apps | Activity   |
+-------------------------------------------+
~~~

- The ask box is a capture router: a bounded bundle interprets a line or transcript as a task,
  note, reminder or idea; code resolves dates. Missing evidence creates a retrieval
  or clarification stage, while an explicit selection needs no model.

### Record card = one card, morphs by state

~~~text
+-------------------------------------------+
| ORDER #1044   new             [ Accept ]  |
| ORDER #1044   preparing       [  Ready ]  |
| ORDER #1044   paid            [Hand over] |
| ORDER #1044   handed over      complete   |
+-------------------------------------------+
~~~

### Record detail = one record in full

~~~text
+----------------------------------------+
| ORDER                                  |
| Order #1044                         x  |
| (ready) v7                             |
| PRICE  Rs.651   2 items                |
| ORDER ITEMS                            |
| 2 x Margherita             Rs.440.00   |
| 1 x Garlic Bread           Rs.180.00   |
| Total                      Rs.651.00   |
| CONTACT DETAILS                        |
| [call] Priya  [mail] priya@example.com |
| RECORD DATA                            |
| Record ID   ord_1044                   |
| Owner       Iniya                      |
| [ Mark Done ] [ Open in POS ] [ Edit ] |
+----------------------------------------+
~~~

### Action form and confirmation = input, then consequence

~~~text
+---------------------------------------+
| < Refund #1038                        |
+---------------------------------------+
| Order          #1038                  |
| Amount         [ Rs.250        ]      |
| Reason         [ item unavailable v ] |
+---------------------------------------+
| This refund is irreversible.          |
| It is recorded against your name.     |
+---------------------------------------+
| [             Confirm             ]   |
| Cancel                                |
+---------------------------------------+
~~~

- The form takes typed input; the confirmation names the consequence; the approval authorizes the exact proposal; the gateway revalidates and commits it.

### Approval = the exact effect

~~~text
+-------------------------------------------+
| Refund #1038                              |
+-------------------------------------------+
| Order          #1038     Amount Rs.250    |
| Destination    original payment           |
| Reason         item unavailable           |
| Requested by   Malar                      |
+-------------------------------------------+
| Expires in 6h      [ Reject ] [ Approve ] |
+-------------------------------------------+
~~~

### States = empty, offline, denied and paused are first class

~~~text
+------------------------------------------+
| OFFLINE  showing saved data              |
| 2 turns waiting            [ Retry now ] |
+------------------------------------------+
| AI PAUSED  manual work continues         |
| Orders, checkout and stock still work    |
| Budget resumes next month    [ Detail ]  |
+------------------------------------------+
~~~

~~~text
+-------------------------------------+
| EMPTY  no orders yet                |
| Take the first order to see it here |
| [ New order ]                       |
+-------------------------------------+
| DENIED  you cannot refund here      |
| Ask an owner to reassign this task  |
+-------------------------------------+
~~~

~~~text
+-------------------+------------------------------------------+-------------------------+
| state             | shows                                    | next action             |
+===================+==========================================+=========================+
| Empty             | purpose plus one starter action          | create or install       |
+-------------------+------------------------------------------+-------------------------+
| Loading           | cached content and a freshness label     | wait                    |
+-------------------+------------------------------------------+-------------------------+
| Offline           | cached read plus a draft badge           | save draft or reconnect |
+-------------------+------------------------------------------+-------------------------+
| Pending           | accepted intent not yet confirmed        | check status            |
+-------------------+------------------------------------------+-------------------------+
| Conflict          | draft preserved, changed facts explained | review                  |
+-------------------+------------------------------------------+-------------------------+
| Denied            | the unavailable action, no hidden data   | request access          |
+-------------------+------------------------------------------+-------------------------+
| Failed            | a specific recoverable reason            | retry or resolve        |
+-------------------+------------------------------------------+-------------------------+
| Approval required | the exact proposed effect                | review                  |
+-------------------+------------------------------------------+-------------------------+
| AI paused         | manual controls stay usable              | continue manually       |
+-------------------+------------------------------------------+-------------------------+
~~~

### Screen rules

~~~text
+-----------------------------------------+----------------------------------------------------+
| rule                                    | reason                                             |
+=========================================+====================================================+
| One primary action per screen           | a general user should not choose between equals    |
+-----------------------------------------+----------------------------------------------------+
| A card is a projection                  | visibility is never authorization                  |
+-----------------------------------------+----------------------------------------------------+
| A card is also the action surface       | the common path completes without navigating away  |
+-----------------------------------------+----------------------------------------------------+
| Cards morph by step                     | state first, then the single action for that state |
+-----------------------------------------+----------------------------------------------------+
| Actions come from the manifest          | the UI never invents an action                     |
+-----------------------------------------+----------------------------------------------------+
| Show evidence and concrete alternatives | technical detail is available when useful          |
+-----------------------------------------+----------------------------------------------------+
| Consequential ambiguity lands in Inbox  | harmless preferences may use a safe default        |
+-----------------------------------------+----------------------------------------------------+
| No sparkle, gradient or mascot          | a calm operational tool, not a chatbot             |
+-----------------------------------------+----------------------------------------------------+
| Native back, no in-app close            | the hardware back already closes the screen        |
+-----------------------------------------+----------------------------------------------------+
| Autocomplete over typing                | the user is general population, not an operator    |
+-----------------------------------------+----------------------------------------------------+
| Policy-hidden fields are absent         | not greyed out, simply not sent                    |
+-----------------------------------------+----------------------------------------------------+
~~~

### Home per domain

~~~text
+------------+-----------------------------+----------------------------+--------------------------+
| domain     | home                        | row shows                  | primary action           |
+============+=============================+============================+==========================+
| Sites      | pages and releases          | page, state, live release  | publish reviewed release |
+------------+-----------------------------+----------------------------+--------------------------+
| CRM        | contacts                    | name, stage, next step     | open relationship        |
+------------+-----------------------------+----------------------------+--------------------------+
| Sales      | leads and quotes            | lead, value, due date      | send or request approval |
+------------+-----------------------------+----------------------------+--------------------------+
| Products   | catalog and stock           | item, price, sellable      | edit or adjust           |
+------------+-----------------------------+----------------------------+--------------------------+
| Services   | resources and bookings      | slot, resource, state      | confirm booking          |
+------------+-----------------------------+----------------------------+--------------------------+
| Commerce   | orders and invoices         | order, payment, fulfilment | the state action         |
+------------+-----------------------------+----------------------------+--------------------------+
| Support    | tickets and returns         | ticket, priority, age      | reply or resolve         |
+------------+-----------------------------+----------------------------+--------------------------+
| Operations | purchases and shipments     | supplier, expected, state  | receive or dispatch      |
+------------+-----------------------------+----------------------------+--------------------------+
| Finance    | postings and reconciliation | entry, source, mismatch    | reconcile                |
+------------+-----------------------------+----------------------------+--------------------------+
~~~

### Screen catalog = complete

~~~text
+----+-------------------+---------------------------------------+----------------------+
| #  | screen            | job                                   | primary action       |
+====+===================+=======================================+======================+
| 1  | Boot              | load database and identity            | -                    |
+----+-------------------+---------------------------------------+----------------------+
| 2  | Sign in           | establish identity                    | Continue with Google |
+----+-------------------+---------------------------------------+----------------------+
| 3  | First run         | create or join a workspace            | Create workspace     |
+----+-------------------+---------------------------------------+----------------------+
| 4  | Space             | permitted facts, metrics, actions     | a block action       |
+----+-------------------+---------------------------------------+----------------------+
| 5  | Inbox             | work needing a person                 | the item action      |
+----+-------------------+---------------------------------------+----------------------+
| 6  | Review            | one unsure judgment with its evidence | Accept or ask        |
+----+-------------------+---------------------------------------+----------------------+
| 7  | Bots              | installed and available capabilities  | Install              |
+----+-------------------+---------------------------------------+----------------------+
| 8  | Bot detail        | what a bot owns and does              | Install              |
+----+-------------------+---------------------------------------+----------------------+
| 9  | My Agent          | private work for one identity         | Ask                  |
+----+-------------------+---------------------------------------+----------------------+
| 10 | Record card       | the step state plus its legal actions | the step action      |
+----+-------------------+---------------------------------------+----------------------+
| 11 | Record detail     | one record in full                    | the record action    |
+----+-------------------+---------------------------------------+----------------------+
| 12 | Action form       | schema-driven input                   | Submit               |
+----+-------------------+---------------------------------------+----------------------+
| 13 | Confirmation      | review a consequential action         | Confirm              |
+----+-------------------+---------------------------------------+----------------------+
| 14 | Approval          | one decision bound to one proposal    | Approve              |
+----+-------------------+---------------------------------------+----------------------+
| 15 | POS sale          | take an order                         | Accept order         |
+----+-------------------+---------------------------------------+----------------------+
| 16 | Receipt           | payment recorded, lines, return       | Share or done        |
+----+-------------------+---------------------------------------+----------------------+
| 17 | Register          | the day cash facts                    | Open or close        |
+----+-------------------+---------------------------------------+----------------------+
| 18 | Stock adjust      | correct a quantity                    | Save                 |
+----+-------------------+---------------------------------------+----------------------+
| 19 | Product form      | details, inventory, more              | Save                 |
+----+-------------------+---------------------------------------+----------------------+
| 20 | Site Studio       | draft, preview, publish               | Publish              |
+----+-------------------+---------------------------------------+----------------------+
| 21 | Members and chat  | access, roles, team channel           | Invite or link       |
+----+-------------------+---------------------------------------+----------------------+
| 22 | Channel link      | connect a provider identity           | Confirm link         |
+----+-------------------+---------------------------------------+----------------------+
| 23 | Plans and credits | balance, packs, agents                | Pay                  |
+----+-------------------+---------------------------------------+----------------------+
| 24 | Search            | find records and actions              | Open                 |
+----+-------------------+---------------------------------------+----------------------+
| 25 | Settings          | theme, models, account                | -                    |
+----+-------------------+---------------------------------------+----------------------+
| 26 | Offline           | local reads, queued turns             | Retry now            |
+----+-------------------+---------------------------------------+----------------------+
| 27 | AI paused         | manual work continues                 | Continue manually    |
+----+-------------------+---------------------------------------+----------------------+
~~~

### Further surfaces = shared judgments enable useful views

~~~text
+---------------------+--------------------------------------------+-------------------------------------------+
| Surface             | Shared assessment use                      | Guard                                     |
+=====================+============================================+===========================================+
| Attention queue     | Combine urgency, commitments and context   | Due dates and contractual duties override |
|                     | with deterministic waiting/order signals   | preference weighting                      |
+---------------------+--------------------------------------------+-------------------------------------------+
| Natural-language    | Map request to a permitted view and        | Bound background scope, budget and access |
| view                | existing semantic tags                     | before assessing unprocessed records       |
+---------------------+--------------------------------------------+-------------------------------------------+
| Exception library   | Assign known category or relate shortlisted | Preserve rare/high-impact cases; classify  |
|                     | cases for templates, training and reports  | before adding clustering                   |
+---------------------+--------------------------------------------+-------------------------------------------+
| Vocabulary loop     | Turn corrections into reviewed aliases,    | Tenant changes never modify shared         |
|                     | option descriptions and rubric proposals   | definitions without evaluation             |
+---------------------+--------------------------------------------+-------------------------------------------+
| Prediction          | Join validated text features to numerical   | Temporal/customer splits and simple        |
|                     | features after labels exist                 | baselines before a classical model         |
+---------------------+--------------------------------------------+-------------------------------------------+
| Semantic quality    | Advisory checks for contradictory help,     | Type, arithmetic, access and schema checks |
|                     | examples and action descriptions            | remain normal deterministic tests           |
+---------------------+--------------------------------------------+-------------------------------------------+
~~~

The [feature-discovery cookbook](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md)
demonstrates offline question refinement on a different dataset. It justifies experiments, not a TAR
prediction claim. Cache unchanged features, hold out outcome data, and measure each surface separately.

## 12. Channels = one inbox and two families

A channel brings messages into the same workspace runtime. Team channels identify team participants and one
configured shared destination; customer conversations remain separate Inbox queues. Native adapters cover
website chat and email. Channel identity does not confer business authority.

~~~text
provider event -> verify signature + deduplicate + persist
               -> resolve actor and tenant + retrieve authorized evidence
               -> exact handler / saved assessment / bounded Jev stages
               -> gateway record or task
               -> template or generated reply -> checks -> outbox -> reconcile
~~~

~~~text
+---------+-----------------------+-----------------------------------------------+
| Step    | Owner                 | Work                                          |
+=========+=======================+===============================================+
| Inbound | Ingress               | Verify, persist, resolve sender, prevent      |
|         |                       | duplicate processing                          |
+---------+-----------------------+-----------------------------------------------+
| Capture | Adapter               | Normalize message roles; transcribe or OCR    |
|         |                       | when needed                                   |
+---------+-----------------------+-----------------------------------------------+
| Assess  | Shared module         | Reuse intent, urgency, record relation and    |
|         |                       | field-selection bundles                       |
+---------+-----------------------+-----------------------------------------------+
| Compose | Code                  | Build valid action or response from accepted  |
|         |                       | evidence                                      |
+---------+-----------------------+-----------------------------------------------+
| Reply   | Template / generation | Prefer a template when it communicates the    |
|         |                       | facts adequately                              |
+---------+-----------------------+-----------------------------------------------+
| Verify  | Code + targeted Jev   | Check completed output, exact values and      |
|         |                       | evidence support                              |
+---------+-----------------------+-----------------------------------------------+
| Send    | Outbox                | Enforce current authority, consent, recipient |
|         |                       | and channel rules                             |
+---------+-----------------------+-----------------------------------------------+
| Observe | Runtime               | Record delivery result, actual cost,          |
|         |                       | correction and reconciliation                 |
+---------+-----------------------+-----------------------------------------------+
~~~

Channel-specific descriptions and capture uncertainty may change the relevant bundle. Preserve who said
what; do not flatten quoted customer text into trusted instructions. Apply each provider's current
messaging-window and template requirements through its adapter rather than a universal 24-hour rule.

### Cost = message stages plus delivery

A 2,000-total-token Jev request costs INR 0.00798 at the section 9 assumptions. That is judgment only. Add
dependent selection, post-generation verification, OCR/transcription, generation, retries, provider delivery
and connected-account fees where applicable. Typed responses reduce parsing work but do not eliminate
semantic failures or network retries.

### Team channel linking

~~~text
+------------------------------------------+
| Members & chat                    Close  |
| Slice House                              |
+------------------------------------------+
| Team chat                                |
| One team destination.                    |
| Slack - #slice-house                     |
| [ Join team channel ]                    |
| [ Connect my account ]                   |
+------------------------------------------+
| Send this command to TAR in your channel |
| link K7Q2-M4                             |
| Expires after 10 minutes                 |
| [ Confirm link ]  [ Refresh connection ] |
+------------------------------------------+
~~~

### Customer channels

~~~text
+--------------------------------------+
| Channels                             |
| Customer                             |
| WhatsApp    +91 98xx xx21  connected |
| Instagram   @slicehouse    connected |
| Telegram    @slicehouse    connected |
| Website chat               native    |
| Email       hello@slice     native   |
| Team channel                         |
| Slack       #slice-house   linked    |
+--------------------------------------+
~~~

- A provider outage degrades to the Inbox; already received messages remain durable. Reconcile provider gaps after recovery; do not claim delivery for messages never received.

### Channel vendor = retained selection, verified before integration

~~~text
+---------------------+-------------------------------------------------------------------+
| Decision            | V12 treatment                                                     |
+=====================+===================================================================+
| Aggregator          | Evaluate Zernio as the proposed selection, subject to integration  |
|                     | verification                                                      |
+---------------------+-------------------------------------------------------------------+
| Capability          | Verify exact networks, inbound/outbound features and team-channel |
|                     | support needed by TAR                                             |
+---------------------+-------------------------------------------------------------------+
| Native gaps         | Keep website chat and email adapters; add a direct adapter for    |
|                     | unsupported required behavior                                     |
+---------------------+-------------------------------------------------------------------+
| Pricing             | Obtain current account, outbound and pass-through fees before     |
|                     | launch budgeting                                                  |
+---------------------+-------------------------------------------------------------------+
| Isolation           | Scope OAuth credentials, mappings and queues to the correct       |
|                     | workspace                                                         |
+---------------------+-------------------------------------------------------------------+
| Recovery            | Reconcile webhooks, refresh failures and ambiguous sends; retain  |
|                     | durable message state                                             |
+---------------------+-------------------------------------------------------------------+
| Publishing fallback | Evaluate an alternative only against demonstrated publishing      |
|                     | requirements and total operating cost                             |
+---------------------+-------------------------------------------------------------------+
~~~

Earlier detailed vendor prices, network counts and refresh-success statistics are not carried forward as
verified facts. The adapter boundary and measured fee line are retained. Selecting a vendor does not
establish that every required channel is supported.

## 13. Plans and credits = the meter the person sees

The envelope is sold as credits, so the whole cost model stays visible in one screen. The proposed
credit value is Rs.0.10; the paid plan includes a thousand credits a month. Optional AI
draws from the product meter, while actual provider cost is tracked separately (sec 8–9).

~~~text
+--------------------+-------------------+------------------+------------------------+
| item               | price             | credits          | note                   |
+====================+===================+==================+========================+
| India plan         | Rs.500 / month    | 1,000 / month    | 1 credit = Rs.0.10     |
+--------------------+-------------------+------------------+------------------------+
| Top-Up Starter     | Rs.100            | 1,000            | credit face value      |
+--------------------+-------------------+------------------+------------------------+
| Top-Up Growth      | Rs.500            | 5,000            | credit face value      |
+--------------------+-------------------+------------------+------------------------+
| Top-Up Scale       | Rs.1,000          | 10,000           | credit face value      |
+--------------------+-------------------+------------------+------------------------+
| Owned workspace    | -                 | 100 / month each | from included credits  |
+--------------------+-------------------+------------------+------------------------+
| Joined workspace   | free              | -                | member access          |
+--------------------+-------------------+------------------+------------------------+
| Personal workspace | free              | -                | one identity, private  |
+--------------------+-------------------+------------------+------------------------+
| Manual actions     | free              | -                | no model call          |
+--------------------+-------------------+------------------+------------------------+
| Public browsing    | free              | -                | no usage credit charge |
+--------------------+-------------------+------------------+------------------------+
| Expiry             | none while active | -                | -                      |
+--------------------+-------------------+------------------+------------------------+
~~~

~~~text
+---------------------------+--------------------+
| agent                     | credits per query  |
+===========================+====================+
| Workspace Agent           | 2                  |
+---------------------------+--------------------+
| Messaging and CRM         | 2-5                |
+---------------------------+--------------------+
| Sales and Growth          | 10-50              |
+---------------------------+--------------------+
| Operations and Finance    | 3-20               |
+---------------------------+--------------------+
| Site Builder              | 0 within allowance |
+---------------------------+--------------------+
| Research and Intelligence | 2-100              |
+---------------------------+--------------------+
~~~

~~~text
+-------------------------------------------+
| Credits & Agents                    x     |
| [ Credits ]   Workspace    Agents         |
+-------------------------------------------+
| 10,000                                    |
| credits                                   |
| ( - )  +1,000  ( + )                      |
| [ Pay Rs.1,000 ]                          |
+-------------------------------------------+
| Credit Packs                              |
| Work Pack        Rs.500/mo  1,000 credits |
| Top-Up Starter   Rs.100     1,000 credits |
| Top-Up Growth    Rs.500     5,000 credits |
| Top-Up Scale     Rs.1,000  10,000 credits |
| Expiry           None while active        |
+-------------------------------------------+
~~~

- Credits meter optional AI; manual work, checkout and public reads do not draw usage credits. Connected-provider fees are a separately disclosed pass-through or product charge, not hidden AI usage.
- Exhaustion pauses optional AI first (sec 8).
- Credits are the product's own unit; tokens and dollars never appear in the app.

### Product allowance = explicit, bounded, separate from cost

These are proposed product prices and allowances, not a live billing contract. The owned-workspace
allocation is drawn from the included grant rather than creating an additional unlimited grant. Per-query
ranges must become published route prices or estimates before billing, with a maximum charge shown where
work can expand.

Site Builder's zero-credit entry is a subsidized product allowance, not zero inference or hosting cost.
Configure an explicit build, rebuild and traffic allowance with a disclosed next step before exceeding it.
Do not promise unlimited free generation or per-visit inference. Track its cost against the workspace/plan
envelope even when the customer-facing credit charge is zero.

No credits for duplicate accepted commands. Model attempts, retries and uncertain completion remain internal
cost records; customer charging follows the published successful-work/refund policy. Budget exhaustion
preserves drafts and manual controls. Check the fully loaded margin with real usage before affirming the
INR 400 margin floor.

## 14. Restaurant end to end = every screen in one day

One cafe, one day, eleven stages. The stage grid names the screens; each screen is drawn
once in this document, so this walkthrough references it and never repeats it.

~~~text
+------------+---------+----------------------------+---------------------------------+----------------------+
| stage      | role    | screens                    | Jev decides                     | code commits         |
+============+=========+============================+=================================+======================+
| 1 Open     | owner   | Create workspace, Space    | -                               | workspace and roles  |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 2 Install  | owner   | Bots, Bot detail           | -                               | bots and flows       |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 3 Setup    | owner   | POS, Product form          | attribute selection             | product and register |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 4 Sell     | cashier | POS sale                   | items, quantity, modifiers      | order and payment    |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 5 Receive  | cashier | Receipt                    | -                               | payment and receipt  |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 6 Prepare  | kitchen | Inbox order row            | -                               | item states          |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 7 Handover | cashier | Record card, Record detail | -                               | fulfilment           |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 8 Message  | owner   | Inbox, Review              | intent and item, uncertain band | order draft          |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 9 Refund   | manager | Approval, Action form      | reason and urgency              | refund on approval   |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 10 Close   | owner   | Space, Register            | -                               | day totals           |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 11 Check   | owner   | Plans and credits          | -                               | credit spend         |
+------------+---------+----------------------------+---------------------------------+----------------------+
~~~

Stages six to nine use the Inbox order row, Record card, Review, Action form and Approval from section 11.
The setup, register, site and settings screens are already represented in the screen catalog; the sale and
receipt remain here because they complete the daily commerce loop.

### The sale

~~~text
+------------------------------------------+
| < POS  Slice House                   ... |
| Register open                            |
| Sell  Orders  Stock  Customers  Register |
| [ Search products or barcode ]           |
+------------------------------------------+
| [M] Margherita   [G] Garlic Bread        |
| [C] Chai         [L] Lemon Soda          |
+------------------------------------------+
| Cart - 3                         Clear   |
| [icon] Add customer   Priya              |
| 2 x Margherita  Rs.440.00     - 2 +      |
| 1 x Garlic Bread Rs.180.00    - 1 +      |
| Discount % [0]                           |
| Subtotal Rs.620  Tax Rs.31  Total Rs.651 |
| [ Order details ]  [ Cash ]  [ UPI ]     |
+------------------------------------------+
~~~

### The receipt

~~~text
+------------------------------------------+
| Payment recorded                         |
| Order #1044                              |
+------------------------------------------+
| 2 x Margherita             Rs.440.00     |
| 1 x Garlic Bread           Rs.180.00     |
| Total                      Rs.651.00     |
| Method                     Cash          |
| Change                     Rs.49.00      |
+------------------------------------------+
| [ Share receipt ] [Return sale] [ Done ] |
+------------------------------------------+
~~~

- Every screen above shares the states strip and the review band rules of sec 11.
- The cashier sees ordinary cart fields and any needed clarification. Technical
  model details are optional; kitchen price visibility follows role policy.

The natural order assessment can later support the delivery checklist, contact timeline and exception queue
without another identical request. Final stock, payment and fulfillment checks still read current
authoritative records. All screen figures are illustrative data.

## 15. POS = every screen, two ways

The POS interface and draft calculations run deterministically in the app, and the same actions are reachable
agentically from a team channel, a customer channel, the website chatbot or a voice note.
Both paths converge on the same gateway actions. The sale and receipt are drawn in section 14. This section
adds the remaining POS screens and the deterministic/natural-language comparison.

~~~text
cashier taps                    channel, chatbot or voice
     |                                    |
     v                                    v
CODE, deterministic                 BOUNDED JEV STAGES
     |                                    |
     +----------------+-------------------+
                      v
        RUNTIME  the same actions, the same log
~~~

### Every POS screen, by flow

~~~text
+----------+---------------+---------------+------------------+----------------------+
| flow     | step          | screen        | lane             | commits              |
+==========+===============+===============+==================+======================+
| SETUP    | store details | Setup         | CODE             | store settings       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | first product | Product form  | CODE + JEV draft | product record       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | opening stock | Stock adjust  | CODE             | stock movement       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | open the till | Register      | CODE             | register session     |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | pick items    | POS sale      | CODE             | cart, then order     |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | take payment  | POS sale      | CODE             | order + payment      |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | hand over     | Receipt       | CODE             | fulfilment           |
+----------+---------------+---------------+------------------+----------------------+
| RETURN   | select lines  | Return sale   | CODE             | return + refund path |
+----------+---------------+---------------+------------------+----------------------+
| CUSTOMER | add a person  | Customer form | CODE             | contact record       |
+----------+---------------+---------------+------------------+----------------------+
| REGISTER | close the day | Register      | CODE             | day totals           |
+----------+---------------+---------------+------------------+----------------------+
~~~

**Setup**

~~~text
+-------------------------------------------+
| Set up your store                         |
| Three steps, about a minute               |
+-------------------------------------------+
| 1  Store details            done          |
| 2  First product        [ Add product ]   |
| 3  Register             [ Open register ] |
+-------------------------------------------+
| [ Continue ]                              |
+-------------------------------------------+
~~~

**Product form**

~~~text
+----------------------------------+
| < Product                        |
| [ Details ]   Inventory   More   |
+----------------------------------+
| Name        [ Margherita       ] |
| Price       [ Rs.220           ] |
| Category    [ Pizza v          ] |
+----------------------------------+
| Details     [ Suggest fields ]   |
| [ Save ]                         |
+----------------------------------+
~~~

**Stock adjust**

~~~text
+---------------------------------+
| < Adjust Margherita             |
+---------------------------------+
| On hand          24             |
| [ - ]  [ 2 ]  [ + ]             |
| Reason  [ damaged stock     v ] |
| New on hand      22             |
+---------------------------------+
| [ Update stock ]                |
+---------------------------------+
~~~

**Customer**

~~~text
+----------------------------------+
| < Add customer                   |
+----------------------------------+
| Name     [ Priya               ] |
| Phone    [ +91 98xx xx21       ] |
| Note     [ regular, no onions  ] |
+----------------------------------+
| [ Save customer ]                |
+----------------------------------+
~~~

**Return sale**

~~~text
+---------------------------------+
| < Return sale                   |
+---------------------------------+
| Order #1044         paid Rs.651 |
| [x] 2 x Margherita   Rs.440.00  |
| [ ] 1 x Garlic Bread Rs.180.00  |
| Reason  [ damaged item  v ]     |
+---------------------------------+
| [ Return selected ]             |
+---------------------------------+
~~~

### The same sale, two ways

~~~text
+----------+-------------------+-----------------------------------+------------+
| step     | in the app        | from a channel                    | lane       |
+==========+===================+===================================+============+
| Start    | tap New order     | send a message or ask the chatbot | -          |
+----------+-------------------+-----------------------------------+------------+
| Items    | tap product tiles | JEV item CHOICE over the menu     | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Quantity | - 2 + stepper     | JEV span; CODE parses             | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Modifier | note field        | JEV modifier NOULs                | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Customer | pick a contact    | JEV over recalled contacts        | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Payment  | tap Cash or UPI   | JEV pay CHOICE                    | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Commit   | pos.order.save    | pos.order.save                    | RUNTIME    |
+----------+-------------------+-----------------------------------+------------+
| Receipt  | the same receipt  | the same receipt                  | CODE       |
+----------+-------------------+-----------------------------------+------------+
~~~

### Inputs that drive the same actions

~~~text
+------------------+---------------------------------+-------------------------+--------------------------+
| input            | path                            | example                 | extra cost               |
+==================+=================================+=========================+==========================+
| tap              | CODE, local, no model           | cashier takes the order | none                     |
+------------------+---------------------------------+-------------------------+--------------------------+
| team channel     | command to the gateway          | start T1-3F             | none                     |
+------------------+---------------------------------+-------------------------+--------------------------+
| customer channel | ingress, semantic stages        | WhatsApp order          | actual stage usage       |
+------------------+---------------------------------+-------------------------+--------------------------+
| website chat     | native adapter, semantic stages | the chatbot on the site | actual stage usage       |
+------------------+---------------------------------+-------------------------+--------------------------+
| voice note       | transcription, semantic stages  | the owner dictates      | usage plus transcription |
+------------------+---------------------------------+-------------------------+--------------------------+
~~~

- Both paths commit the same action ids through the same gateway; an order tapped in the app
  and one placed from WhatsApp share the action contract. The log still records actor,
  channel, source evidence, assessments and approvals for provenance.
- The app path is fully deterministic: no model call for a price, a stock count, a total or
  a payment.
- The natural-language path fills the same fields through typed selections. Count
  transcription, dependent retrieval, clarification and any generated-output check
  separately; a one-stage request is a useful case, not an invariant.
- Agentic inputs can be switched off per workspace; POS keeps working while optional AI is
  paused.

### Draft correctness = preserve line relationships

- Preserve mention offsets and quantity/modifier scope; identical values at different positions may have different roles.
- Include a no-match result and widen candidate retrieval when coverage fails. A fixed top-five shortlist is a starting point to evaluate, not an accuracy guarantee.
- Code validates modifier compatibility, merges only identical lines, computes totals and rechecks current availability.
- A product suggestion selects known categories and source attributes. New marketing copy needs a separate optional generation stage; Jev does not write it.
- “Cash” or “UPI” selects a payment method, not payment success. Offline drafts are never shown as confirmed shared orders.

## 16. Site bot = a chat, approved compositions, ready variants

The Site Bot captures build and change requests, selects reviewed design candidates and produces a release
draft. Generation creates new code or copy where required. Jev interprets text and selects from supplied
options. Code validates, renders and publishes an authorized release; Jev never grants publication
authority.

### The chat is the front door

~~~text
+------------------------------------------+
| Site bot                          Draft  |
+------------------------------------------+
| You  make a landing page for farmers,    |
| warm and simple                          |
| Bot  Done. Warm counter design, hero,    |
| menu, hours and contact. Draft is        |
| ready for preview and review.            |
| [ Preview ]   [ Publish ]                |
+------------------------------------------+
| [ Ask for a change...              ] [>] |
+------------------------------------------+
| [ Change design ]   [ Add a page ]       |
+------------------------------------------+
~~~

A change produces a draft. An explicit publish button needs no semantic call; natural-language publication
intent is interpreted without replacing the release-bound authorization. Preserve the previous release for
rollback under the configured retention policy.

### The build = design.md to validated manifest to release

~~~text
+-------------+-----------------------------------------------+---------------------------------------------+
| Asset       | Owner                                         | Purpose                                     |
+=============+===============================================+=============================================+
| design.md   | Curated library or owner                      | Human-readable design source                |
+-------------+-----------------------------------------------+---------------------------------------------+
| design.json | Parser or optional generated draft, then code | Typed rules pinned to the design source     |
|             | validation                                    | revision                                    |
+-------------+-----------------------------------------------+---------------------------------------------+
| components  | Reviewed implementation                       | Valid building blocks and constraints       |
+-------------+-----------------------------------------------+---------------------------------------------+
| variants    | Reviewed content and compositions             | Coherent approved experiences               |
+-------------+-----------------------------------------------+---------------------------------------------+
| decisions   | Versioned code bundles                        | Jev selection and textual-support questions |
+-------------+-----------------------------------------------+---------------------------------------------+
| data        | Workspace records                             | Current products, prices, hours and stock   |
+-------------+-----------------------------------------------+---------------------------------------------+
| release     | Runtime                                       | Immutable published artifact with hash and  |
|             |                                               | approval                                    |
+-------------+-----------------------------------------------+---------------------------------------------+
~~~

Recompile the manifest when its source changes, not blindly “once forever.” Deterministic structured input
needs no generation. A generated manifest is a draft subject to schema checks and review. Rendering has
compute cost even when no new inference occurs.

### The design library = design.md files

Each design is one design.md in a documented TAR design shape. The site bot ships a curated
library and an owner may upload their own; code parses and validates every file before it
can be chosen. Jev selects one with a Choice over the identifier and its descriptors.

~~~text
+----------+--------------------------------------+---------------------------------------------+
| part     | holds                                | used by                                     |
+==========+======================================+=============================================+
| tokens   | colors, type, corners, spacing, name | code compiles CSS; Jev sees the descriptors |
+----------+--------------------------------------+---------------------------------------------+
| sections | allowed cards, order rules, variants | code validates; Jev selects valid layouts   |
+----------+--------------------------------------+---------------------------------------------+
| tone     | two lines of voice and examples      | the copy call and the check call            |
+----------+--------------------------------------+---------------------------------------------+
| proof    | one example release that shipped     | the owner in the picker                     |
+----------+--------------------------------------+---------------------------------------------+
~~~

Use the approved components and design manifest above. Let Jev interpret the merchant's brief, select an
appropriate approved composition, and assess supplied copy against explicit textual criteria. Use
deterministic checks for tokens, contrast rules where computable, broken links, schemas, and performance;
render the page to assess actual layout.

### Personalization without per-slot runtime inference

~~~text
+-------+-----------------------------------------------+----------------------------------------------+
| Stage | Work                                          | Owner                                        |
+=======+===============================================+==============================================+
| 1     | Define a small set of permitted segments      | Product and consent policy                   |
|       | such as first visit, returning, enquiry       |                                              |
+-------+-----------------------------------------------+----------------------------------------------+
| 2     | Use explicit locale, selected category and    | Code; no model when facts already decide     |
|       | other available context                       |                                              |
+-------+-----------------------------------------------+----------------------------------------------+
| 3     | Build coherent approved composition per       | Jev selection where useful; component rules  |
|       | segment, page and locale                      | and eligibility in code                      |
+-------+-----------------------------------------------+----------------------------------------------+
| 4     | Render the ready default immediately; use     | Edge/app reads saved plan; optional later    |
|       | ambiguous session intent only when proven     | session assessment after measured benefit    |
+-------+-----------------------------------------------+----------------------------------------------+
| 5     | Invalidate plan when content, eligibility or  | Dependency-aware reuse policy                |
|       | rubric changes                                |                                              |
+-------+-----------------------------------------------+----------------------------------------------+
| 6     | Randomize reviewed variants and measure lift  | Code owns assignment, control and analysis   |
+-------+-----------------------------------------------+----------------------------------------------+
~~~

~~~text
+----------------------+--------------------------------------------------------------+
| Site policy          | V12 rule                                                     |
+======================+==============================================================+
| Public page view     | Never runs Jev; serve default or saved approved variant      |
+----------------------+--------------------------------------------------------------+
| Price/stock/hours    | Live code data; no semantic route                            |
+----------------------+--------------------------------------------------------------+
| Personal history     | No visitor inference; consent is never inferred              |
+----------------------+--------------------------------------------------------------+
| Experiment           | Merchant-enabled, separately budgeted and control-measured   |
+----------------------+--------------------------------------------------------------+
| Design improvement   | Precompute on release; persistent assignment and control     |
+----------------------+--------------------------------------------------------------+
~~~

### Every judgment, mapped = semantic choices inside valid boundaries

~~~text
+-------------+------------------------------------------------+------------------------------------------------+
| Area        | Jev may judge                                  | Code or reviewer owns                          |
+=============+================================================+================================================+
| Request     | Build, revise, compare, add page, publish      | Allowed registered action                      |
|             | intent                                         |                                                |
+-------------+------------------------------------------------+------------------------------------------------+
| Readiness   | Unclear goal, audience or missing narrative    | Required fields and assets                     |
|             | evidence                                       |                                                |
+-------------+------------------------------------------------+------------------------------------------------+
| Template    | Fit of supplied designs to the merchant brief  | Available validated designs                    |
+-------------+------------------------------------------------+------------------------------------------------+
| Composition | Fit of approved section combinations           | Coherence, required sections and schema        |
+-------------+------------------------------------------------+------------------------------------------------+
| CTA         | Fit of an eligible next action to expressed    | Offer and action eligibility                   |
|             | intent                                         |                                                |
+-------------+------------------------------------------------+------------------------------------------------+
| Copy        | Support, contradiction, tone and relevance     | Exact prices, source matches and publication   |
|             |                                                | review                                         |
+-------------+------------------------------------------------+------------------------------------------------+
| Visuals     | Meaning of textual design descriptions         | Rendered layout, image/vision review,          |
|             |                                                | accessibility and performance                  |
+-------------+------------------------------------------------+------------------------------------------------+
| Session     | Permitted intent among non-sensitive supported | Consent, access and explicit preference        |
|             | segments                                       |                                                |
+-------------+------------------------------------------------+------------------------------------------------+
| Language    | Ambiguous language intent when necessary       | Explicit choice, locale and ready translations |
+-------------+------------------------------------------------+------------------------------------------------+
| Catalog     | Relevant products within an eligible shortlist | Stock, compatibility, price and restrictions   |
+-------------+------------------------------------------------+------------------------------------------------+
| Lead        | Expressed need, timing and fit                 | Sales policy and measured prioritization       |
+-------------+------------------------------------------------+------------------------------------------------+
| Chat        | Intent, source selection and response support  | Template selection rules and safe execution    |
+-------------+------------------------------------------------+------------------------------------------------+
| Revision    | Content or structural change requested         | Rebuild dependencies and release version       |
+-------------+------------------------------------------------+------------------------------------------------+
| Experiment  | Classify feedback; select candidate variants   | Randomization, exposure, metrics and causal    |
|             | for review                                     | analysis                                       |
+-------------+------------------------------------------------+------------------------------------------------+
~~~

### Runtime = no mandatory model in rendering

~~~text
BUILD  design + data -> valid compositions -> review -> published variants
                                     |
PRECOMPUTE  segment + page + locale -> Jev selection where useful -> saved plan
                                     |
VISIT  explicit context / valid saved segment -> ready plan or default -> render
                                     |
MEASURE  exposure + outcome -> controlled experiment -> reviewed update
~~~

Approved slots may include hero text, hero layout, section order, proof, CTA, background and optional
presence. Select a coherent valid composition or validate constrained selections; independent slot winners
can conflict. Eligibility gates are code. Six to ten slots can be an initial design bound, not a model or
usability law.

Do not infer health or other sensitive personas from browsing. Product-category interest can select an
appropriate category view without asserting a personal trait. Personal history is retrieved only under
explicit access and consent policy. Defaults remain useful with no history and no inference.

### Screens

**Pick a design**

~~~text
+----------------------------------------+
| Pick a design                          |
| Matched to a cafe, warm and simple     |
+----------------------------------------+
| [*] Warm counter     cafe, warm, dense |
| [ ] Clean slate      minimal, airy     |
| [ ] Night kitchen    dark, bold, food  |
| [ ] Market stall     playful, bright   |
| [ ] Atelier          editorial, quiet  |
| [ ] Grid             technical, sharp  |
+----------------------------------------+
| [ Use this design ]   [ See it live ]  |
+----------------------------------------+
~~~

**Site plan**

~~~text
+------------------------------------------+
| Site plan                                |
| Slice House - from workspace facts       |
+------------------------------------------+
| Sections                                 |
| [x] hero        warm line from the brief |
| [x] menu        12 products, six shown   |
| [x] about       three-line story         |
| [x] hours       from the hours record    |
| [ ] gallery     no photos yet            |
| [x] contact     address, phone, email    |
+------------------------------------------+
| Copy check  4 of 4 grounded, no claims   |
| [ Publish ]   [ Edit sections ]          |
+------------------------------------------+
~~~

- The Site Studio entry is drawn in sec 14; the chat is drawn above; visitor previews use the approved segment/page plans
  in this section.

### Cost = build separately from traffic

Section 9 sets the public-view Jev cost to zero. Four lean release-plan rebuilds cost an illustrative
INR 0.27/month; the INR 2,713.20 per-visit design is forbidden. Add generation, source changes, hosting,
review and merchant-selected build work to the end-to-end ledger instead of charging them to page views.

Site Builder's product allowance is bounded under section 13. No new model call is required merely because a
visitor sees another ready variant.

## 17. Workflow builder = a sentence, a recipe, a reviewed flow

### Registered actions = current callable boundary

The current harness registers the 28 actions below. A Flow can only contain these registered
IDs after the Bot is installed. `flow.publish` accepts an ordered list and `flow.start`
creates a Run at its first action; it does not yet execute a general multi-step graph. The
catalog is the implementation source of truth at `tarharness/src/registry/catalog.ts` and
`tarharness/src/pos/catalog.ts`.

| Area | Registered actions |
|---|---|
| Flow and Bots | `flow.publish`, `flow.start`, `directory.install`, `directory.remove` |
| Records and tasks | `record.create`, `record.update`, `task.create`, `task.complete` |
| POS setup and products | `pos.open`, `pos.setup`, `pos.product.save`, `pos.product.content.save`, `pos.product.draft`, `pos.stock.adjust` |
| POS customers and orders | `pos.customer.save`, `pos.order.save`, `pos.order.item.update`, `pos.order.cancel`, `pos.checkout`, `pos.refund` |
| POS register | `pos.register.open`, `pos.register.close` |
| Sites | `site.generate`, `site.update`, `site.compile`, `site.publish`, `site.rollback`, `site.refresh` |
| Web research | `web.search` |

The existing templates cover POS sales, orders and returns, stock, customers and register;
Sales follow-up and review; Team onboarding and review; Operations requests and review; and
Site building and preview. Missing Sales, CRM, service, support, purchasing, finance and
messaging actions are target capabilities, not callable actions today.

~~~text
+----------------------+----------------------------------------------------------+
| Workflow layer       | Owner                                                    |
+======================+==========================================================+
| Repeated business    | Published parameterized recipes: quote→order→delivery,   |
| outcome              | invoice→collection and support→resolution                |
+----------------------+----------------------------------------------------------+
| Jev                  | Select recipe, supplied records/source values and        |
|                      | approved variation among compatible choices              |
+----------------------+----------------------------------------------------------+
| Compiler             | Types, dependencies, required inputs, capabilities,      |
|                      | permissions, effect order and bounded recovery           |
+----------------------+----------------------------------------------------------+
| Runtime              | Current authority, versions, execution, outbox and trace |
+----------------------+----------------------------------------------------------+
~~~

~~~text
+----------------------------------------------------------------+-----------------------------------------------------------------+
| Request                                                        | Preferred treatment                                             |
+================================================================+=================================================================+
| “Remind me about unpaid invoices every Friday”                 | Match a reminder recipe; code resolves schedule and invoice     |
|                                                                | predicate                                                       |
+----------------------------------------------------------------+-----------------------------------------------------------------+
| “After a quote is accepted, create an order and tell the team” | Bind an approved acceptance recipe to existing actions          |
+----------------------------------------------------------------+-----------------------------------------------------------------+
| “Use this contact as the delivery contact”                     | Role-aware record selection within compatible fields            |
+----------------------------------------------------------------+-----------------------------------------------------------------+
| Novel branching process                                        | Produce a reviewable draft through constrained planning or a    |
|                                                                | generative step, then compile and validate                      |
+----------------------------------------------------------------+-----------------------------------------------------------------+
| Unsupported action                                             | Explain the missing capability; do not invent a callable action |
+----------------------------------------------------------------+-----------------------------------------------------------------+
~~~

Do not ask Jev to discover cycles or compare schema types. Do not wire each new node only to the last five
nodes: that arbitrary window can exclude a valid producer. Compute compatible bindings from the actual
graph, then shortlist semantically where needed.

Start with the current ordered Flow representation where it satisfies the use case. Add durable branching
semantics only for demonstrated product requirements. Jev reduces authoring friction; it does not remove the
need for a correct execution engine.

### The flow model = explicit execution, minimal first release

~~~text
+----------+----------------------------------------------+------------------------------------------------+
| Part     | Meaning                                      | Owner                                          |
+==========+==============================================+================================================+
| trigger  | Manual request, record event or schedule     | Approved trigger set; code time resolution     |
+----------+----------------------------------------------+------------------------------------------------+
| steps    | Existing actions in an ordered recipe        | Catalog and recipe definition                  |
+----------+----------------------------------------------+------------------------------------------------+
| args     | Literal, record field or compatible prior    | Compiler with semantic binding selection only  |
|          | output                                       | where ambiguous                                |
+----------+----------------------------------------------+------------------------------------------------+
| needs    | Dependencies if branching is required        | Validated graph; no arbitrary last-five window |
+----------+----------------------------------------------+------------------------------------------------+
| guard    | Published condition                          | Approved operators compiled and evaluated in   |
|          |                                              | code                                           |
+----------+----------------------------------------------+------------------------------------------------+
| wait     | Provider or human signal                     | Durable runtime state                          |
+----------+----------------------------------------------+------------------------------------------------+
| recovery | Retry, reconcile, skip if allowed, or review | Declared bounded policy                        |
+----------+----------------------------------------------+------------------------------------------------+
~~~

Keep ordered recipes where sufficient. The graph form is a target extension requiring durable scheduling,
recovery and validation; an existing list of actions is not evidence of a complete graph engine. New
internal names follow the one-word convention; preserve existing external interfaces.

### Composition pipeline

~~~text
sentence -> retrieve eligible recipes -> select recipe and source values
         -> bind compatible fields -> compile and validate
         -> review exact effects -> publish version -> run through gateway
~~~

Selection can be one stage if candidates are ready. A large capability catalog may require route, retrieve,
then inspect. Novel requirements can use constrained planning or a generated draft, followed by the same
compiler and review; measure that path independently.

### Every composition judgment, mapped

~~~text
+--------------+----------------------------------------------+------------------------------------------------+
| Area         | Semantic work                                | Deterministic work                             |
+==============+==============================================+================================================+
| Goal         | Interpret intended outcome                   | Supported goal/recipe catalog                  |
+--------------+----------------------------------------------+------------------------------------------------+
| Trigger      | Interpret user-stated condition              | Event and schedule validation                  |
+--------------+----------------------------------------------+------------------------------------------------+
| Reuse        | Match an existing recipe                     | Version, scope and dependency checks           |
+--------------+----------------------------------------------+------------------------------------------------+
| Binding      | Select intended record/span among compatible | Required fields, type compatibility and source |
|              | candidates                                   | reconstruction                                 |
+--------------+----------------------------------------------+------------------------------------------------+
| Variation    | Select an approved optional step or guard    | Allowed graph/recipe transformation            |
+--------------+----------------------------------------------+------------------------------------------------+
| Completeness | Check narrative goal coverage where not      | Bound inputs, action existence, cycles and     |
|              | mechanically provable                        | permissions                                    |
+--------------+----------------------------------------------+------------------------------------------------+
| Result       | Assess a supplied narrative outcome where    | Actual effect status from runtime/provider     |
|              | useful                                       | evidence                                       |
+--------------+----------------------------------------------+------------------------------------------------+
~~~

### The gate and the run

The compiler rejects missing capabilities and invalid structure. Consequential steps receive the configured
approval gates; publishing a recipe does not bypass authority at run time. Each step rechecks relevant
roles, record versions and business conditions. An explicit judgment step may invoke Jev; it cannot invent
the next action outside the published definition.

### The workflow canvas

~~~text
+-------------------------------------------+
| Workflow lab                       Draft  |
| "brief me before the 10am call"           |
+-------------------------------------------+
| Recipe: meeting brief       [ Change ]    |
| [1] Read permitted records                |
|      |                                    |
| [2] Select relevant source blocks         |
|      |                                    |
| [3] Render evidence-linked brief          |
+-------------------------------------------+
| Inputs bound; no financial effect         |
| [ Run once ]  [ Publish ]  [ Edit ]       |
+-------------------------------------------+
~~~

The labels describe proposed recipe steps; implementation must bind actual registered actions before
enabling them. They are not invented callable IDs.

### Cost and limits

~~~text
+-----------------------------------------------+--------------------------------------------------------+
| Path                                          | Inference                                              |
+===============================================+========================================================+
| Exact published recipe + structured arguments | Zero if no semantic step is declared                   |
+-----------------------------------------------+--------------------------------------------------------+
| Natural-language recipe selection             | Bounded selection and argument stages                  |
+-----------------------------------------------+--------------------------------------------------------+
| Exact valid saved assessment                  | Reuse without another inference call                   |
+-----------------------------------------------+--------------------------------------------------------+
| Novel process                                 | Budgeted planner/generation plus validation and review |
+-----------------------------------------------+--------------------------------------------------------+
| Execution                                     | Only explicit judgment steps incur model usage         |
+-----------------------------------------------+--------------------------------------------------------+
~~~

A twelve-step cap can be an initial product limit, but dependency candidates come from all compatible
producers. Reuse keys include recipe, catalog, evidence and authority context; identical text alone does not
establish an identical safe run. Competing approaches can also cache: compare fair implementations rather
than assuming every non-Jev path regenerates.

## 18. Memory = scoped facts, incremental packs, live corrections

Memory is derived, source-linked context in the existing workspace store. It supports continuity without
replacing authoritative orders, balances, permissions or stock. Models propose; the gateway accepts changes.

### One record type

~~~text
+------------+--------------------------------------------------------------------+
| kind       | holds                                                              |
+============+====================================================================+
| profile    | identity, context, autonomy calibration, communication style       |
+------------+--------------------------------------------------------------------+
| preference | what the person or the workspace prefers                           |
+------------+--------------------------------------------------------------------+
| person     | a member, customer or supplier worth remembering                   |
+------------+--------------------------------------------------------------------+
| fact       | a sourced assertion: hours, an arrangement, a standing instruction |
+------------+--------------------------------------------------------------------+
| recap      | what happened in a period, composed in code from records           |
+------------+--------------------------------------------------------------------+
| pack       | the compiled revision the next turn reads                          |
+------------+--------------------------------------------------------------------+
~~~

- Memory is read-only to every agent, bot and model: only the authorized gateway accepts proposed changes.
- Rows live in the workspace database, so authority, versions, replay and traces
  apply unchanged.

### The memory record

~~~text
+------------+----------------------------------------------------------+
| field      | rule                                                     |
+============+==========================================================+
| kind       | one word: profile, preference, person, fact, recap, pack |
+------------+----------------------------------------------------------+
| aliases    | the words that must find it: names, spellings, synonyms  |
+------------+----------------------------------------------------------+
| links      | the other memory rows and records it relates to          |
+------------+----------------------------------------------------------+
| source     | the turn or event id the row came from                   |
+------------+----------------------------------------------------------+
| state      | fresh, superseded or forgotten                           |
+------------+----------------------------------------------------------+
| expires    | set for ephemeral facts; swept in code                   |
+------------+----------------------------------------------------------+
| importance | drives excerpt ranking; a person can raise it            |
+------------+----------------------------------------------------------+
| confidence | assessment reference, not proof of truth                 |
+------------+----------------------------------------------------------+
| version    | versioned correction subject to retention policy         |
+------------+----------------------------------------------------------+
~~~



~~~text
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Memory concern         | Jev may help with                             | Code/policy owns                              |
+========================+===============================================+===============================================+
| Stable context         | Relate supplied facts                         | Authoritative money, stock, bookings, access  |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| New event              | Duplicate/update/contradiction/independent    | Subject, source, scope, time and authority    |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Explicit correction    | Select related prior fact plus none           | Conservative supersede; preserve conflict     |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Preference             | Contextual, lasting or unknown                | Scope, expiry and user correction             |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Critical restriction   | Relevance only                                | Never discard because it is old/uncertain     |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Retrieval              | Rerank supplied candidates where useful       | Access first; IDs/aliases/text then measure   |
+------------------------+-----------------------------------------------+-----------------------------------------------+
| Forget/retention       | Nothing grants authority                      | Immediate recall exclusion and data lifecycle |
+------------------------+-----------------------------------------------+-----------------------------------------------+
~~~

- Refresh only the affected entity scope.
- Keep an immediate correction overlay until its pack rebuilds.
- Treat a pack as retrieval acceleration, never as source-of-truth replacement.
- Add broader retrieval only after measured evidence coverage requires it.

### Pack and excerpt = accelerators over the source records

~~~text
new event -> authorized related-fact shortlist -> relation assessment if needed
          -> gateway accepted update -> immediate recall overlay
          -> rebuild affected entity/pack -> versioned bytes + hash

turn -> access filter -> aliases / text lookup -> relevant facts + live overlay
     -> bounded excerpt + source references -> judgment only where needed
~~~

~~~text
+---------------------+----------------------------------------------+----------------------------------------------+
| Memory component    | Initial bound                                | Rule                                         |
+=====================+==============================================+==============================================+
| Scoped pack         | Up to 8k tokens                              | Tunable retrieval aid, never source of truth |
+---------------------+----------------------------------------------+----------------------------------------------+
| Turn excerpt        | About 300 tokens where coverage allows       | Expand/retrieve when evidence is missing     |
+---------------------+----------------------------------------------+----------------------------------------------+
| Background compaction| 25 events or 24h with changes               | Batch non-urgent work                        |
+---------------------+----------------------------------------------+----------------------------------------------+
| Immediate overlay   | Correction, withdrawal, critical commitment  | Affects recall before pack rebuild           |
+---------------------+----------------------------------------------+----------------------------------------------+
| Retrieval rank      | Relevance + importance + recency             | Critical constraints have explicit priority  |
+---------------------+----------------------------------------------+----------------------------------------------+
| Candidate competition| Optional semantic rerank                    | Model only sees supplied candidates          |
+---------------------+----------------------------------------------+----------------------------------------------+
~~~

### Every memory judgment, mapped

~~~text
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| Question                                     | Shape                                      | Accepted behavior                              |
+==============================================+============================================+================================================+
| Relationship between same-scoped statements  | Choice:                                    | Code applies source, time and authority policy |
|                                              | duplicate/update/contradiction/independent |                                                |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| Which existing fact is explicitly corrected? | Choice over related facts plus none        | Verify identity and scope before superseding   |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| What kind of context is supported?           | Choice over memory kinds                   | Store a proposed sourced assertion, not model  |
|                                              |                                            | truth                                          |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| Is the preference contextual or lasting?     | Choice with unknown                        | Set conservative scope and expiry defaults     |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| How useful is this supplied fact for this    | Score                                      | Rank under critical-fact precedence rules      |
| purpose?                                     |                                            |                                                |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
| Does supplied context conflict?              | Choice or Noul                             | Surface conflict; do not automatically favor   |
|                                              |                                            | latest text                                    |
+----------------------------------------------+--------------------------------------------+------------------------------------------------+
~~~

- No probability cutoff deletes or supersedes a fact automatically.
- A contradiction can describe a different subject or time period.
- Preserve unresolved evidence; review consequential conflicts.

### Forgetting = immediate exclusion with an explicit lifecycle

~~~text
+---------------------------------------------+
| FORGET  saved preference                    |
+---------------------------------------------+
| Source    the note and its supporting event |
| Effect    exclude from recall immediately   |
| Retention follows the workspace data policy |
+---------------------------------------------+
| [ Forget ]                         [ Keep ] |
+---------------------------------------------+
~~~

Expiry removes ephemeral facts from recall in code. A user can correct or forget durable context; update
cached excerpts and invalidate affected packs immediately. Retained history, deletion and exports follow the
applicable data lifecycle rather than a blanket “never delete” rule. Do not silently forget critical
restrictions based on model uncertainty.

### Screens = memory is readable and correctable

Memory is a saved view in Space, not a fourth surface (sec 11). The view shows rows
with their kind, source turn and state; the actions are raise importance, open the
source turn, and forget. Durable forgets arrive in the Inbox as a Review card.

~~~text
+-----------------------------------------------+
| MEMORY                                        |
+-----------------------------------------------+
| Allergy note    person       fresh, 2 sources |
+-----------------------------------------------+
| Prep time       fact         fresh, 1 source  |
+-----------------------------------------------+
| Deposit         preference   fresh, 1 source  |
+-----------------------------------------------+
| [ Raise ]   [ Open source ]   [ Forget ]      |
+-----------------------------------------------+
~~~

### Cost = marginal tokens, without double counting

At section 9 prices, adding 300 tokens to 1,500 paid requests costs INR 1.7955; 60 consolidation requests at
2,000 tokens cost INR 0.4788. Together that is INR 2.2743 before any additional questions or work. These are
illustrative marginal costs, not a mandatory addition to every scenario.

The selective example already includes 60 consolidations and 3,000-token primary requests. If those include
memory, do not add the same memory cost again. Reuse unchanged facts, rebuild affected scopes and measure
cost against improved task outcomes.

### Limits and existing infrastructure

Retain the gateway, records, queue, cron, R2 hash/pointer pattern and Inbox. Procedures stay in Flows.
Markdown can render or export memory but is not its transactional store. Start with aliases and text
retrieval; add other retrieval infrastructure only when measured recall justifies it. Reuse semantic
questions only when their meaning and evidence match, never as a substitute for consent checks.

## 19. Adoption and proof = implement, evaluate, expand

**Rule = enable each route on demonstrated whole-workflow results.**

~~~text
off -> offline evaluation -> sampled shadow -> reviewed drafts -> enabled route
                         route-level metrics, canary and rollback throughout
~~~

~~~text
+------------------+---------------------------------------------------------------------+
| Dataset element  | Preserve and cover                                                  |
+==================+=====================================================================+
| fixed trace      | Original request, authorized evidence, candidate list and versions  |
+------------------+---------------------------------------------------------------------+
| expected result  | Desired action or response, accepted outcome and deterministic      |
|                  | checks                                                              |
+------------------+---------------------------------------------------------------------+
| human label      | Reviewer decision against the same named rubric                     |
+------------------+---------------------------------------------------------------------+
| operating slice  | Domain, channel, role, language, transcript quality and consequence|
+------------------+---------------------------------------------------------------------+
| language         | Indian regional languages, transliteration, mixed messages,         |
|                  | abbreviations, noisy transcripts, locale-sensitive dates and money  |
+------------------+---------------------------------------------------------------------+
~~~

English is currently the strongest documented language; no equal-quality claim applies to every TAR
language slice. [Models](https://docs.typesafe.ai/models.md).

~~~text
+-------------+------------------------------------------------------------------+
| Layer       | Required evidence                                                |
+=============+==================================================================+
| Retrieval   | Correct candidate is present; inaccessible candidates are absent |
+-------------+------------------------------------------------------------------+
| Judgment    | Correct intent/value/relationship, including none and ambiguous  |
|             | cases                                                            |
+-------------+------------------------------------------------------------------+
| Composition | Arguments and cross-field relationships form the correct whole   |
|             | proposal                                                         |
+-------------+------------------------------------------------------------------+
| Acceptance  | Error rate among automatically accepted cases, coverage, and     |
|             | review burden                                                    |
+-------------+------------------------------------------------------------------+
| Execution   | Same gateway invariants and idempotent effects as manual actions |
+-------------+------------------------------------------------------------------+
| Economics   | Actual token usage, number of stages, fallback cost, p50/p95     |
|             | latency                                                          |
+-------------+------------------------------------------------------------------+
| Product     | Completion time, corrections, missed obligations, and user       |
|             | acceptance                                                       |
+-------------+------------------------------------------------------------------+
~~~

### Jev as judge = evaluate a frozen route, never authorize a live effect

~~~text
fixed trace + human label
          |
          v
deterministic assertions ---> Jev atomic bundle ---> policy metrics ---> route decision
schema / access / effect        same evidence       agreement, repeatability   ship, revise,
and outcome checks              for every run       coverage, cost, latency    shadow or disable
          |                            |                    |
          +----------------------------+--------------------+
                    no evaluator result can execute an effect
~~~

~~~text
+----------------+----------------------------------------------+-----------------------------+---------------------------+
| Assessment     | Frozen state                                 | Typed Jev question          | Release use               |
+================+==============================================+=============================+===========================+
| support        | Proposal, cited source spans and offsets     | Noul: does evidence support | Detect unsupported prose  |
|                |                                              | the claim?                  | or draft                  |
+----------------+----------------------------------------------+-----------------------------+---------------------------+
| match          | Request, selected action and expected action | Choice: match, mismatch or  | Find route/action errors  |
|                |                                              | insufficient evidence       |                           |
+----------------+----------------------------------------------+-----------------------------+---------------------------+
| quality        | Request, response, rubric and expected help  | Score: 1..5 concrete        | Compare useful responses  |
|                |                                              | usefulness levels           | only after calibration    |
+----------------+----------------------------------------------+-----------------------------+---------------------------+
| search         | Request, retrieved evidence and tool events  | Choice: appropriate,        | Improve retrieval and     |
|                |                                              | unnecessary or failed       | tool-routing policy       |
+----------------+----------------------------------------------+-----------------------------+---------------------------+
| result         | Provider receipts, commit state and outcome  | Code only                   | Verify effect completion  |
+----------------+----------------------------------------------+-----------------------------+---------------------------+
~~~

Question identifiers remain one lowercase semantic word under `assessment`; question instructions define
the full rubric. `insufficient evidence` is a review outcome, never a pass. Independent rows share one
frozen state and one Jev request; a dependent retrieval or evidence expansion is a later bounded stage.

~~~text
+----------------+------------------------------------------------------+------------------------------------------+
| Measure        | Computation                                          | Interpretation                           |
+================+======================================================+==========================================+
| agreement      | Jev verdict versus human label                       | Correctness against the chosen rubric    |
+----------------+------------------------------------------------------+------------------------------------------+
| repeatability  | Same frozen trace judged repeatedly                  | Stability; low variance is not accuracy  |
+----------------+------------------------------------------------------+------------------------------------------+
| coverage       | Auto-pass cases / relevant cases, by operating slice | Review load and safe automation reach    |
+----------------+------------------------------------------------------+------------------------------------------+
| economics      | Tokens, calls, p50/p95, review and fallback cost     | Cost per correctly completed workflow    |
+----------------+------------------------------------------------------+------------------------------------------+
| outcome        | Accepted effect, correction and user result          | Whole-route value against the baseline    |
+----------------+------------------------------------------------------+------------------------------------------+
~~~

The LangChain study used five fixed weather traces, human labels, two signals, and repeated judging to
separate agreement from variance. TAR reuses that experimental shape, not its reported quality, latency,
or price: each TAR route needs its own labeled slices and calibration.

~~~text
+----------------+--------------------------------------------------------------------+
| Ablation       | Compare                                                            |
+================+====================================================================+
| routing        | Deterministic baseline, every-interaction Jev and selective Jev    |
+----------------+--------------------------------------------------------------------+
| bundle         | Narrow versus broad speculative bundles; reuse versus recompute    |
+----------------+--------------------------------------------------------------------+
| composition    | Template versus generated output                                   |
+----------------+--------------------------------------------------------------------+
| retrieval      | Lexical retrieval versus an added method only where recall warrants|
+----------------+--------------------------------------------------------------------+
~~~

~~~text
+----------------+--------------------------------------------------------------------+
| Policy rule    | Meaning                                                            |
+================+====================================================================+
| threshold      | Route, model, question version, evidence quality and consequence  |
+----------------+--------------------------------------------------------------------+
| acceptance     | Evaluate the composed final policy, not confidence alone           |
+----------------+--------------------------------------------------------------------+
| correlation    | Never multiply probabilities to claim workflow accuracy            |
+----------------+--------------------------------------------------------------------+
| promotion      | Beat baseline on predeclared error, coverage, latency and cost     |
+----------------+--------------------------------------------------------------------+
| release path   | Drafts may ship before automatic execution meets its stricter bar  |
+----------------+--------------------------------------------------------------------+
| control        | Pin model, canary, roll back and disable per route                 |
+----------------+--------------------------------------------------------------------+
~~~

~~~text
+----------------+--------------------------------------------------------------------+
| Sample rule    | Meaning                                                            |
+================+====================================================================+
| starting set   | 1,000 examples is a useful start, not a release certificate       |
+----------------+--------------------------------------------------------------------+
| zero errors    | 1,000 independent relevant trials imply about 0.3% 95% upper bound|
|                | by the rule of three                                               |
+----------------+--------------------------------------------------------------------+
| consequence    | Evaluate accepted subset and important slices; expand targeted     |
|                | samples as consequence requires                                    |
+----------------+--------------------------------------------------------------------+
~~~


### Build order = the smallest useful sequence

~~~text
+-------------------------+----------------------------------------------+------------------------------------------------+
| Phase                   | Deliverable                                  | Exit condition                                 |
+=========================+==============================================+================================================+
| P0a: foundation         | Server adapter, versioned bundles, actual    | Contract/error checks pass; no keys in         |
|                         | usage traces, candidate provenance,          | clients; costs observable                      |
|                         | effect-safe retry handling                   |                                                |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P0b: one vertical slice | Support/inbox routing plus natural command   | Whole-route evaluation beats baseline;         |
|                         | drafts through the catalog                   | missing-input behavior works                   |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P0c: commercial proof   | POS or quote draft using span selection and  | Less correction/time at an acceptable latency  |
|                         | real catalog candidates                      | and cost                                       |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P1a: reuse              | Stored record assessments consumed by Inbox, | A changed screen/filter does not repeat        |
|                         | CRM, and search                              | unchanged inference                            |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P1b: documents          | Import extraction, evidence-linked briefs,   | Reduced generation/review work without losing  |
|                         | selective draft verification                 | evidence                                       |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P1c: composition        | Approved Flow recipes and precomputed site   | Fewer bespoke prompts/planning paths; measured |
|                         | variants                                     | product benefit                                |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P1d: memory             | Incremental scoped facts, provenance,        | Better retrieval with less history and no      |
|                         | immediate corrections                        | stale critical facts                           |
+-------------------------+----------------------------------------------+------------------------------------------------+
| P2: prediction          | Labeled feature experiment and controlled    | Held-out or randomized improvement over        |
|                         | personalization trials                       | simpler baselines                              |
+-------------------------+----------------------------------------------+------------------------------------------------+
~~~

Start question bundles in code. Introduce editable stored definitions only after versioning, validation,
tenant isolation, review, and migration requirements are understood. The existing schema does not currently
accept an arbitrary question kind.

Use the native HTTP contract or a verified compatible SDK in the existing runtime. The JavaScript SDK
documents Node.js 20+; validate compatibility before adopting it in a different runtime. Do not create a
separate Node service merely to use an SDK if a small HTTP adapter suffices. See [JavaScript
SDK](https://docs.typesafe.ai/sdk/javascript.md) and [HTTP API](https://docs.typesafe.ai/api.md).

### Existing implementation = integrate before adding infrastructure

The repository contains useful integration points already:

Open the [action catalog](tarharness/src/registry/catalog.ts),
[gateway actions](tarharness/src/gateway/actions.ts),
[database schema](tarharness/src/db/schema.ts) and [app AI helpers](tarapp/src/lib/ai.ts)
for the implementation evidence summarized below.

~~~text
+----------------------------------------------------------------+-------------------------------------------------------------------+
| Local evidence                                                 | Consequence for this plan                                         |
+================================================================+===================================================================+
| [Action catalog](tarharness/src/registry/catalog.ts) has       | Derive semantic selection from these definitions; do not maintain |
| descriptions, fields, outputs, roles, and effects              | a second competing tool catalog                                   |
+----------------------------------------------------------------+-------------------------------------------------------------------+
| [Gateway actions](tarharness/src/gateway/actions.ts) contain   | Route accepted proposals through this path; full graph            |
| existing Flow publication and execution handling               | orchestration is not established merely by having Flow records    |
+----------------------------------------------------------------+-------------------------------------------------------------------+
| [Database schema](tarharness/src/db/schema.ts) restricts       | Adding a question-definition kind would require a                 |
| definition kinds to `flow`, `record_type`, `bot`, and `kit`    | deliberate migration; begin with versioned code assets            |
+----------------------------------------------------------------+-------------------------------------------------------------------+
| [App AI helpers](tarapp/src/lib/ai.ts) already distinguish app | Keep credentials and paid inference in the server boundary        |
| helpers from remote model work                                 |                                                                   |
+----------------------------------------------------------------+-------------------------------------------------------------------+
~~~

The inspected `tarharness/src` did not show a Jev/TypeSafe integration. This is a design plan, not a claim
that the adapter, cache, evaluations, or new workflows already exist.

Use one semantic lowercase word for new internal identifiers, qualified through structure:
`assessment.model`, `assessment.source`, `question.version`. Preserve existing external and database
spellings until a deliberate migration. Provider fields such as `input_tokens` stay intact at the adapter
boundary.

### Complexity budget = what the implementation should remove

~~~text
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Replace or defer                           | Keep instead                                   | Revisit when                                  |
+============================================+================================================+===============================================+
| Separate language agent per domain         | Shared operations plus domain rubrics          | A domain genuinely requires a different       |
|                                            |                                                | execution architecture                        |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Generative JSON for every extraction       | Source candidates, typed selection,            | Candidate generation demonstrably misses      |
|                                            | normalizers                                    | essential values                              |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Prompt-based schema/type/permission checks | Existing code and compiler                     | These remain deterministic                    |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Full prose regeneration of every brief     | Selected source blocks and templates           | Users need synthesis that selection cannot    |
|                                            |                                                | provide                                       |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| A model call per site slot and view        | Approved precomputed compositions              | Measured incremental benefit pays for session |
|                                            |                                                | inference                                     |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Freeform planner for every Flow            | Recipe selection and deterministic compilation | Valid novel workflows become a significant    |
|                                            |                                                | demand                                        |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Reclassifying every record on every screen | Versioned assessments refreshed on dependency  | The question itself depends on new            |
|                                            | changes                                        | screen/query context                          |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Full-history memory rebuild per event      | Entity-scoped retrieval and incremental        | Evaluation shows a broader context is         |
|                                            | consolidation                                  | necessary                                     |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| A new vector/feature platform from day one | Existing storage, text search, and trace       | Measured recall or modeling needs justify the |
|                                            | records                                        | addition                                      |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
| Generic model guard before every effect    | Deterministic invariants plus targeted         | An effect depends on a claim requiring        |
|                                            | semantic verification                          | semantic support                              |
+--------------------------------------------+------------------------------------------------+-----------------------------------------------+
~~~

**Acceptance criterion for the architecture:** adding a domain should mostly add catalog entries, rubrics,
templates, and tests. If it requires another agent loop, parallel source of truth, or general planner, first
check whether the common operations and existing runtime can express it.

Test prompt-injection attempts, unsupported actions, ambiguity, inaccessible records, stale evidence,
malformed responses, provider timeouts and concurrent updates. Shadow mode records proposals without
changing accepted business behavior. Human-reviewed drafts can establish value while automatic acceptance
remains disabled.

## 20. Risks, coverage and references

~~~text
+------------------------------------------------------------+-------------------------------------------------------------------+
| Unknown                                                    | How to resolve                                                    |
+============================================================+===================================================================+
| Actual Jev latency for TAR's state and question sizes      | Benchmark representative bundles and concurrency; record p95      |
|                                                            | end-to-end                                                        |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Reliable acceptance thresholds across domains/languages    | Labeled route-specific evaluation with consequence-aware policies |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Candidate recall for real catalogs and colloquial requests | Separate retrieval study; include missing and near-duplicate      |
|                                                            | items                                                             |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Savings from shared assessments                            | Trace downstream consumption and avoided calls, including         |
|                                                            | invalidations                                                     |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Visual quality of generated sites                          | Rendered inspection and visual evaluation; textual Jev checks     |
|                                                            | alone are insufficient                                            |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Safe benefit of automatic actions                          | Compare final accepted effects under existing authority and       |
|                                                            | rollback constraints                                              |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Provider capacity and commercial terms at scale            | Verify current account quotas and obtain the necessary capacity   |
+------------------------------------------------------------+-------------------------------------------------------------------+
| Predictive or personalization lift                         | Held-out outcomes or controlled experiments, not confident        |
|                                                            | judgments                                                         |
+------------------------------------------------------------+-------------------------------------------------------------------+
~~~

### Risks = explicit limits on the design

~~~text
+-----------------------------------------+-----------------------------------------------------------------+
| Risk                                    | Treatment                                                       |
+=========================================+=================================================================+
| Confident wrong answer                  | Validate whole routes and retain evidence; typed output is not  |
|                                         | truth                                                           |
+-----------------------------------------+-----------------------------------------------------------------+
| Untrusted text changes behavior         | Limit candidates, scope state, test attacks, and retain         |
|                                         | deterministic authorization                                     |
+-----------------------------------------+-----------------------------------------------------------------+
| Correlated mistakes                     | Evaluate composed actions rather than multiplying confidence    |
|                                         | values                                                          |
+-----------------------------------------+-----------------------------------------------------------------+
| Missing source/candidate                | Measure retrieval recall; capture or widen evidence             |
+-----------------------------------------+-----------------------------------------------------------------+
| Multilingual/transcript errors          | Evaluate actual languages and capture conditions                |
+-----------------------------------------+-----------------------------------------------------------------+
| Stale facts                             | Dependency invalidation, immediate corrections and live commit  |
|                                         | checks                                                          |
+-----------------------------------------+-----------------------------------------------------------------+
| Provider limits/outages                 | Capacity agreement, bounded queues, manual/default paths        |
+-----------------------------------------+-----------------------------------------------------------------+
| Hidden cost                             | Trace every stage and background job; include review and        |
|                                         | infrastructure                                                  |
+-----------------------------------------+-----------------------------------------------------------------+
| Visual overclaim                        | Render and inspect; text-only judgments do not verify pixels    |
+-----------------------------------------+-----------------------------------------------------------------+
| Memory loss                             | Conservative scoped relations and explicit retention/deletion   |
|                                         | policy                                                          |
+-----------------------------------------+-----------------------------------------------------------------+
| Complexity returns through new services | Prefer the existing catalog, gateway and storage until evidence |
|                                         | justifies more                                                  |
+-----------------------------------------+-----------------------------------------------------------------+
| Provider terms and data handling change | Verify current account contract before production integration   |
+-----------------------------------------+-----------------------------------------------------------------+
~~~

### Sources = local basis and live primary documentation

This document incorporates the historical v6–v11 architecture sequence and
the tech stack study. They are provenance, not normative dependencies. The
[Jev research reference](jev/jev.md) and implementation links in section 19
support particular claims; the decisions themselves are stated here. The
model, API and confidence pages were refreshed 2026-09-23. Other linked
patterns and cookbooks were reviewed in the preceding draft; recheck their
current text before translating an example into an implementation:

~~~text
+--------+-----------------------------------+------------------------------------------------+
| Group  | Sources                           | Guidance used                                  |
+========+===================================+================================================+
| S1     | Index, use-case map, build guide  | Scope, decomposition and question design       |
+--------+-----------------------------------+------------------------------------------------+
| S2     | Models, API, confidence           | Contract, price, limits and response semantics |
+--------+-----------------------------------+------------------------------------------------+
| S3     | Function calling, extraction,     | Typed commands and independent questions       |
|        | fan-out                           |                                                |
+--------+-----------------------------------+------------------------------------------------+
| S4     | Reranking, hierarchy, skill       | Bounded retrieval and progressive disclosure   |
|        | suggestion                        |                                                |
+--------+-----------------------------------+------------------------------------------------+
| S5     | Composite scoring, feature        | Reuse and offline predictive experiments       |
|        | discovery                         |                                                |
+--------+-----------------------------------+------------------------------------------------+
| S6     | Autoformat, citations, cascade    | Structure preservation and verification        |
+--------+-----------------------------------+------------------------------------------------+
| S7     | LangChain Jev-as-a-Judge article  | Frozen-trace evaluation and human calibration  |
+--------+-----------------------------------+------------------------------------------------+
~~~

S1: [index](https://docs.typesafe.ai/llms.txt), [use-case map](https://docs.typesafe.ai/concepts/use-case-map.md), [building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md).

S2: [models](https://docs.typesafe.ai/models.md), [API](https://docs.typesafe.ai/api.md), [confidence](https://docs.typesafe.ai/confidence.md).

S3: [function calling](https://docs.typesafe.ai/cookbooks/function_calling.md), [pre-parsed extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md), [fan-out](https://docs.typesafe.ai/patterns/fan-out.md).

S4: [reranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md), [hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md), [skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md).

S5: [composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md), [feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md).

S6: [autoformat](https://docs.typesafe.ai/cookbooks/autoformat.md), [citation checking](https://docs.typesafe.ai/cookbooks/citation_check.md), [extraction cascade](https://docs.typesafe.ai/cookbooks/sde_cascade.md).

S7: [Jev-as-a-Judge for Agent Evals](https://x.com/LangChain/article/2101454284927959080). The article is
the basis for the frozen-trace, human-oracle and repeatability method in section 19; its five-weather-trace
result and reported cost/latency are not TAR performance evidence. Live TypeSafe documentation governs
primitive semantics and API contracts.

Several cookbook examples use Jev 1.12 or small/synthetic datasets. Their reported results demonstrate a
pattern on that workload, not expected TAR accuracy on 1.13. The original social post is background context
in [sources.md](jev/sources.md); it is not used here as evidence for API contracts, throughput, or measured
savings.

Historical prices and implementation claims are not automatically current facts.
Screen figures are concept examples; provider facts are dated, and performance
or savings require TAR measurements. Retiring the earlier architecture files
does not change the authority, workflow or product decisions in this document.

**TAR = reusable core + domain rules + shared semantic assessments. Jev proposes; code composes; the runtime
validates and commits; evidence makes the result reviewable.**
