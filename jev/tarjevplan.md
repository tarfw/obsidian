# TAR + Jev = One Semantic Core, Many Useful Decisions

> Understand once. Reuse the judgment. Let code assemble and execute the work.

**Status = historical researched proposal, not implemented behavior.** Written 2026-09-21 during the v11 evolution. Its accepted decisions are consolidated in [tarv12.md](../tarv12.md), the sole target architecture. [jev.md](jev.md) remains the provider and programming reference.

**Recommendation = use Jev more broadly through fewer reusable mechanisms.** The largest gain is not calling Jev for every feature. It is turning ambiguous business language into a few typed, reusable assessments, then letting ordinary code use them throughout the commerce cycle.

Current TypeSafe contracts and cookbook patterns were researched live. Proposed TAR benefits below are hypotheses to measure, not provider benchmarks or achieved savings. No production Jev calls or TAR accuracy experiments were run for this document.

## 1. Direction = more capability with less machinery

TAR already has the right foundation: a common action catalog, a mutation gateway, domain packages, and explicit business rules. Jev can make this foundation accessible through everyday language without giving each domain its own agent, prompt stack, routing system, or planner.

| Priority | Change | What becomes simpler |
|---|---|---|
| First | Compile bounded action questions from the existing catalog | One action definition serves forms, chat, voice transcripts, and Bots |
| First | Extract candidate spans, then ask Jev which role each plays | Less generative JSON extraction and fewer invented values |
| First | Assess incoming work once and reuse its dimensions | Inbox, CRM, routing, search filters, and review share results |
| First | Retrieve a small authorized shortlist before asking semantic questions | Smaller state, fewer options, lower latency, clearer failures |
| Next | Select approved workflow recipes and compatible bindings | Avoid a new model-driven graph planner for common business processes |
| Next | Build evidence-linked briefs and replies from selected source blocks | Less prose generation, easier verification and correction |
| Next | Precompute site variants by segment and page | Personalization without a model call on every page view |
| Next | Consolidate memory incrementally by entity and fact | Less full-history reading and fewer unnecessary pack rebuilds |
| Later | Turn validated judgments into predictive features | Business predictions from a small classical model, where labels justify it |

**The architecture should optimize completed, correct work per rupee and per second.** Calls per turn is a diagnostic, not the product objective. Sometimes zero calls is ideal; sometimes two dependent calls are cheaper and more accurate than one enormous speculative request.

## 2. Reality = what is available and what is still proposed

The repository contains useful integration points already:

| Local evidence | Consequence for this plan |
|---|---|
| [Action catalog](../tarharness/src/registry/catalog.ts) has descriptions, fields, outputs, roles, and effects | Derive semantic selection from these definitions; do not maintain a second competing tool catalog |
| [Gateway actions](../tarharness/src/gateway/actions.ts) contain existing Flow publication and execution handling | Route accepted proposals through this path; full v11 graph orchestration is not established merely by having Flow records |
| [Database schema](../tarharness/src/db/schema.ts) restricts definition kinds to `flow`, `record_type`, `bot`, and `kit` | Adding the v11 question-definition kind would require a deliberate migration; begin with versioned code assets |
| [App AI helpers](../tarapp/src/lib/ai.ts) already distinguish app helpers from remote model work | Keep credentials and paid inference in the server boundary |

The inspected `tarharness/src` did not show a Jev/TypeSafe integration. This is a design plan, not a claim that the adapter, cache, evaluations, or new workflows already exist.

Use one semantic lowercase word for new internal identifiers, qualified through structure: `assessment.model`, `assessment.source`, `question.version`. Preserve existing external and database spellings until a deliberate migration. Provider fields such as `input_tokens` stay intact at the adapter boundary.

## 3. Corrections = strengthen v11 before expanding it

| v11 area | Proposed correction | Why it matters |
|---|---|---|
| Sections 1, 5: one call per turn | One call per independent evidence stage; count all stages | A question cannot read another answer in the same request |
| Section 5: presence Noul for every ambiguous Choice | Include `none` in selection; add presence only when independently useful | Avoid duplicating the same decision and introducing contradictory signals |
| Sections 5–6: weakest confidence decides everything | Gate only consumed answers and validate each whole route | Unused speculative answers do not matter; minimum confidence is not joint correctness |
| Section 6: no cap on judgments | Set route budgets for tokens, options, latency, and useful questions | Questions cost input tokens even inside one request |
| Section 6: must replace two cheap calls or one reasoning call | Compare end-to-end utility and cost | One Jev call can be worthwhile for one semantic task; a giant batch can be wasteful |
| Section 7: never pay twice | Reuse stored results; acknowledge ambiguous provider completion | Effect idempotency does not guarantee exactly-once inference billing |
| Section 7: semantic cache | Start with exact, dependency-aware reuse | Similar wording can hide different customers, quantities, permissions, or dates |
| Sections 8–9: 2k state implies 2k billed input | Count state plus all instructions, criteria, and framing | The 20–60 questions are additional input, not free output |
| Section 9: fixed per-seat total proves savings | Treat it as an unmeasured workload model | Include verification, site traffic, imports, memory, retries, and provider quotas |
| Section 12: outbound check before prose | Validate generated content after it exists | An ingress check cannot inspect a future reply |
| Section 16: Jev approves visual design | Use Jev for textual intent and structured descriptions | Jev is text-only; pixels require rendering, browser checks, or a vision model |
| Section 16: zero LCP cost for personalization | Serve a ready default or precomputed variant | Cold inference on the critical path still has latency |
| Section 17: infer workflow graph and validate its structure with Jev | Select recipes; compile and validate structure in code | Cycles, types, required inputs, and permissions are deterministic |
| Section 18: semantic suspicion supersedes a memory fact | Propose relationships; apply source and time rules conservatively | A newer statement may describe a different person, period, or circumstance |
| Section 19: 1,000 examples establishes safety | Size tests for the accepted population and consequence | Rare errors need targeted cases and confidence intervals |

These changes follow the current [building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md), [fan-out pattern](https://docs.typesafe.ai/patterns/fan-out.md), [confidence guidance](https://docs.typesafe.ai/confidence.md), and [model contract](https://docs.typesafe.ai/models.md).

## 4. Core = seven reusable semantic operations

These are application patterns around the three provider primitives, not seven new services or new model capabilities.

| Operation | Primitive | Meaning | Shared consumers |
|---|---|---|---|
| `route` | Choice | Which supported intent or handler fits? | Inbox, command bar, channels, Bots |
| `select` | Choice | Which candidate record, span, offering, or template is intended? | POS, CRM, documents, workflows, search |
| `tag` | Independent Nouls | Which properties independently hold? | Exceptions, topics, evidence checks, preferences |
| `rate` | Score | How much of a clearly described property is supported? | Priority, fit, relevance, readiness |
| `relate` | Choice | How do two supplied items relate? | Duplicates, memory, reconciliation, contradictions |
| `check` | Noul or Choice | Does supplied evidence support a specified claim or condition? | Extraction, replies, publications, proposals |
| `shape` | Choice plus Nouls | Which approved structure should present existing content? | Briefs, forms, sites, imports |

Keep the question library small by sharing these shapes, not by forcing every domain to share vague wording. A sales-readiness rubric and a support-urgency rubric have different meanings and need separate versions.

**Use the primitive that matches the answer.** Choice is a competing set, Score is degree on an ordered rubric, and Noul is probability of a yes/no proposition. A Noul of 0.5 is not “medium urgency.” Score divided by its maximum index can normalize an intensity for weighting; it does not become a probability of a business outcome. See [primitives](https://docs.typesafe.ai/primitives.md) and [composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md).

### 4.1 Runtime = one module inside the existing server

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

The module needs an adapter, bundle compiler, result validator, reuse policy, and trace hook. It does not initially need its own deployment, database, general agent framework, prompt marketplace, vector service, or workflow engine.

Question definitions should declare their inputs, candidate source, version, output meaning, consumers, and budget. The compiler deduplicates identical questions needed by several consumers. It batches questions only where shared state is relevant and safe; do not combine unrelated tenant records merely to reduce request count.

The existing catalog supplies admissible actions. Domain adapters supply descriptions and candidates; business code supplies eligibility. A customer request does not unlock an action that the authenticated actor cannot perform.

### 4.2 Decision = distinguish inference from execution

1. Code narrows to valid actions and candidate values.
2. Jev interprets intent within those candidates.
3. Code reconstructs typed arguments and checks cross-field relationships.
4. The existing gateway applies the action with ordinary authorization and concurrency checks.

For an unsupported request, return an explicit unsupported or missing-input outcome. A prose model may explain or help form a draft; it must not bypass the same gateway.

The [function-calling cookbook](https://docs.typesafe.ai/cookbooks/function_calling.md) supports closed-set functions, enum arguments, and boolean/multiple-label selections. Its demonstration does not solve arbitrary text, numbers, or dates. TAR must find or obtain these values separately and preserve their source. Do not silently accept a cookbook default for an unstated payment amount or booking date.

## 5. Evidence = the highest-leverage optimization

### 5.1 Candidate generation before model selection

Use identifiers, exact references, aliases, text search, current screen context, and typed filters to create candidates. Include source offsets and record versions. For amounts, emails, phone numbers, dates, and line items, code finds possible spans; Jev chooses their semantic role; code copies and normalizes the chosen span.

For example, “Use the accounts address for the invoice and my mobile for delivery” needs role-aware selection. A single generic contact picker loses the relationship between invoice, recipient, and delivery.

Preserve duplicate-looking spans with different locations when their roles differ. Two occurrences of “500” can be a deposit and a balance. Never use the literal value alone as its provenance.

The key metric is **candidate recall before selection accuracy**. An absent correct candidate cannot be recovered by a confident Choice. A `none` result should widen retrieval, request the missing value, or use a justified extraction fallback. See [pre-parsed extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md).

### 5.2 Small contextual state

State should contain the actual utterance, speaker and subject roles, source timestamps, relevant catalog descriptions, selected policy text, and current business facts. Preserve negations and relationships when trimming it. Do not assume 300 tokens always retain enough evidence.

“Cancel that one” may need the visible selection and preceding message. “Same as last time” needs the referenced order. “Tomorrow” needs the event time, locale, and timezone; code resolves calendar arithmetic after interpreting the intended reference.

### 5.3 Retrieval as progressive disclosure

Search broadly in code, then compare a bounded shortlist. Where catalogs exceed 255 options, narrow by category and then item, or use a measured beam over plausible branches. Measure category errors because they can exclude the correct item downstream. The [hierarchical cookbook](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md) demonstrates this decomposition; its small example is not proof of TAR-wide accuracy.

The [skill-suggestion cookbook](https://docs.typesafe.ai/cookbooks/skill_suggestion.md) also suggests a useful Bot pattern: shortlist capabilities, inspect only those, then decide whether to suggest any. Recommendations can be ignored; do not auto-install a Bot because it appears relevant.

## 6. Reuse = assessments as ordinary business data

### 6.1 Assess a changed record once

When a new enquiry arrives, derive topic, urgency, purchase readiness, missing details, and relation to an existing record. Store those dimensions with evidence and versions. Then:

- Inbox weights urgency and waiting time.
- CRM groups expressed needs and buying stage.
- Sales prioritizes qualified opportunities.
- Search filters on the same tags.
- Review shows missing evidence and unusual requests.
- Reporting counts validated categories over time.

Changing a UI weight should not cause another model request. Normalize compatible Score rubrics and compose the ranking in code. Apply hard deadlines and contractual obligations before preference weighting so an urgent mandatory task cannot be averaged away.

This is a materialized assessment: an ordinary stored result refreshed when its dependencies change. Avoid building a general feature platform initially.

### 6.2 What can and cannot be reused

| Judgment | Reuse boundary |
|---|---|
| Topic expressed in a message | Same message and question version |
| Fit to a particular offering | Same message, offering, and rubric versions |
| Relevance to a search query | Same query-candidate pair; a new query needs a new judgment |
| Current refund eligibility | Recompute business rules from current order and policy; never infer from a stale tag |
| Preferred presentation | Same permitted preference evidence and approved variant set |
| Stock or booking availability | Live authoritative code check before commitment |

Use dependencies rather than only a TTL: tenant, access scope, source versions, candidate list and order, model version, question version, relevant policy, locale, and time assumptions. Store actual resolved model IDs. Share an in-flight identical request where practical, but distinguish completed, pending, and failed results.

An uncertain completed answer can be reused when inputs are identical; that does not make it useful or correct. A user correction becomes new evidence. A provider timeout may have consumed inference even if TAR never received the answer. Retrying must preserve effect idempotency while accounting for possible repeated inference cost.

## 7. Calls = batch independent work, stage dependent work

| Scenario | Sensible call plan | Why |
|---|---|---|
| Explicit button with valid fields | Zero | Meaning is already structured |
| Natural request with all candidates present | One request with the necessary questions | Shared evidence; arguments can be speculated for a few branches |
| Request whose intent determines a large candidate search | Route, retrieve, then select | Second-stage state does not exist yet |
| Brief assembled verbatim from known records | One selection/importance stage, sometimes zero with saved assessments | Code can render without prose generation |
| Generated reply needing evidence checking | Optional ingress stage, prose generation, then Jev verification | Verification reads the completed output |
| Scanned invoice | OCR/extraction, Jev field checks, targeted escalation if needed | Jev cannot read the image itself |
| Unstructured text into a document | Line-boundary decisions, then block classification if needed | Block state depends on the first result |
| Returning visitor with ready segment/page plan | Zero during page rendering | Serve a previously approved choice |

Speculate only branches that are both plausible and cheap. If a route has ten unrelated actions with many arguments, routing first may save more tokens than avoiding the second network round trip. State the speculative premise in each question; questions cannot refer to sibling answers. See [fan-out](https://docs.typesafe.ai/patterns/fan-out.md) and [structure recovery](https://docs.typesafe.ai/cookbooks/autoformat.md).

Use confidence to choose useful behavior. If two harmless hero variants are both acceptable, select a default. If two customer records are plausible recipients of a private invoice, clarify. The desired decision is consequence-dependent; one global threshold creates unnecessary reviews and unsafe exceptions.

## 8. Coverage = the entire commerce cycle

P0 means foundation/pilot; P1 means expansion after the pilot; P2 means dependent on mature data or infrastructure. These are priorities, not claims of current implementation.

| Area | Jev opportunity and evidence | Deterministic composition / complexity removed | Measure | Phase |
|---|---|---|---|---|
| Command bar | Select supported action from utterance and active screen | One resolver replaces per-screen language routers | Correct completed commands; clarification rate | P0 |
| Inbox | Rate urgency and tag intent from message + relevant obligation | Shared assessments replace separate triage prompts | Missed urgent work; time to resolution | P0 |
| Channels | Interpret email, chat, and voice transcripts through the same bundles | One semantic layer behind channel adapters | Accuracy by channel and transcript quality | P1 |
| CRM capture | Select contact/company spans and requested field roles | Typed drafts replace freeform record generation | Field precision and candidate recall | P0 |
| CRM duplicates | Relate plausible pairs using identifiers and supplied history | Shortlist + review replaces unconstrained record matching | False merge suggestions; duplicate recall | P1 |
| CRM timeline | Select commitments, changes, and unresolved issues | Evidence-linked timeline without rewriting every event | Useful-event recall; stale statements | P1 |
| Lead qualification | Rate expressed need, timing, and fit independently | Configurable ranking from one assessment | Accepted leads and missed opportunities | P1 |
| Sales follow-up | Select relevant next-step template and missing detail | Code schedules against consent and last contact | Reply rate; unwanted follow-ups | P1 |
| Quotes | Match requirements to eligible offerings and source spans | Code prices and assembles quote lines | Correction rate; draft completion time | P0 |
| Catalog import | Classify products; select attribute spans and categories | Shared import pipeline across supplier formats | Attribute precision; import review time | P1 |
| Catalog search | Rate candidate relevance to natural requirements | Search + rerank replaces many bespoke synonym rules | Recall@k; successful selections | P0 |
| Substitutions | Rate fit among code-eligible alternatives | Rank allowed stock; deterministic compatibility exclusions | Accepted substitutes; invalid suggestions | P1 |
| POS orders | Select items, modifiers, quantities by source role | Existing cart engine handles totals and inventory | Whole-order correctness; counter latency | P0 |
| Services | Match expressed job to offerings and required resources | Scheduling solver handles slots, capacity, travel | Booking corrections; missed constraints | P1 |
| Assignment | Rate task-skill fit from explicit work evidence | Code respects availability and access | Completion quality and reassignment rate | P1 |
| Fulfillment | Tag delay reasons and interpret exception messages | Existing order state machine handles transitions | Exceptions resolved; wrong state proposals | P1 |
| Returns | Classify reason and find referenced order/item | Policy code determines available remedies | Correct draft remedies; escalation rate | P1 |
| Support | Select relevant articles and relation to known incidents | Shared retrieval and routing replace a separate agent | First-contact resolution; retrieval recall | P0 |
| Support replies | Check claim support and unresolved customer questions | Targeted verification instead of full repeated generation | Unsupported claims; unnecessary escalations | P1 |
| Suppliers | Interpret quote differences and supplier conditions | Code compares price, dates, stock, and terms | Missed conditions; buyer review time | P1 |
| Purchasing | Match requisitions to catalog items and equivalent offers | Common candidate selection with purchasing constraints | Correct matches; useful alternatives | P1 |
| Receiving | Relate delivery notes to purchase lines | Code computes shortages and overages | Match accuracy; unresolved discrepancies | P1 |
| Finance capture | Select amount roles, references, and narrative categories | Exact arithmetic, ledger rules, source-linked drafts | Amount-role errors; review minutes | P1 |
| Reconciliation | Rank ambiguous remittance/invoice matches | Exact references first; code enforces balances | False proposed matches; unmatched reduction | P1 |
| Collections | Classify dispute versus promise versus missing invoice | Schedule and send only under configured authority | Wrong follow-up rate; resolved disputes | P1 |
| Retention | Tag stated cancellation reasons and service friction | Reuse support signals in permitted renewal workflows | Useful intervention rate; complaint rate | P1 |
| Campaigns | Select approved content variant for expressed interest | Consent, frequency, and audience rules stay explicit | Incremental conversion; unsubscribe rate | P2 |
| Sites | Match a permitted segment to approved page compositions | Precompute layouts; code renders | Conversion lift; latency; accessibility | P1 |
| Reporting | Classify open-text reasons and select supporting examples | SQL computes totals; evidence-backed explanation | Category stability; false causal claims | P1 |
| Knowledge | Recover document structure and tag supported facts | Source spans become searchable reusable blocks | Retrieval recall; preservation of meaning | P1 |
| Bots / Flows | Select recipe, bindings, and semantic guard interpretation | Existing actions and compiler replace freeform orchestration | Valid useful flows; repair effort | P1 |
| Product quality | Flag semantic inconsistencies in descriptions and help text | Advisory semantic checks beside deterministic CI | Actionable findings; false alarms | P2 |
| Predictions | Convert validated text assessments into labeled features | Small downstream model when simpler rules plateau | Held-out improvement and calibration | P2 |

This extends the possibilities in the [TypeSafe use-case map](https://docs.typesafe.ai/concepts/use-case-map.md). A possible use is not a reason to ship it immediately. Each row must beat the current or deterministic baseline on a meaningful outcome.

## 9. Worked paths = make the proposal concrete

### 9.1 Natural POS order

Input: “Two oat cappuccinos, one without sugar, and the sandwich from yesterday.”

1. Code obtains the current menu, permitted modifiers, and a small authorized order-history shortlist.
2. Candidate extraction preserves item mentions, quantities, and modifier scopes. Jev selects menu entries and the intended historical item; quantity spans are copied and parsed.
3. Code checks that each modifier applies to the correct line, merges only genuinely identical lines, and validates availability.
4. Show the normal cart with source-linked ambiguous fields. Ask which drink is sugar-free if the available evidence cannot resolve it.
5. The ordinary checkout computes price, tax, payment, and stock effects.

This uses the normal cart UI and transaction path. It does not require a POS agent. If historical lookup depends on an initial interpretation, count the second stage. Speech transcription is a separate cost and failure source.

### 9.2 Catering quote

Input: “Lunch for 40 on 4 October, under INR 12,000, half vegetarian.”

Jev selects the event date span, guest-count span, dietary requirement, and relevant menu packages from supplied candidates. Code resolves the year if known, identifies missing delivery details, evaluates package quantities and budget, and computes a quote. If the year is ambiguous, ask; if no package meets the budget, present that result rather than inventing a discount.

Use a quote template for the usual response. Generate prose only when a custom explanation adds value. The same captured requirements can feed the order, purchasing plan, service assignment, and delivery checklist after acceptance.

### 9.3 Meeting brief without automatic prose generation

Retrieve open commitments, recent messages, outstanding invoices, and changes since the last meeting. Jev rates relevance and selects evidence blocks. Code renders “Open decisions,” “Recent changes,” and “Next actions,” preserving links and dates.

A narrative summary is optional. Selection-based briefs are cheaper to audit, support direct corrections, and avoid rewriting stable facts every time the screen opens.

### 9.4 Invoice photo with selective escalation

OCR or a document extractor supplies text and provenance. Code checks mandatory fields and arithmetic. Jev checks field roles, unsupported extracted values, and missed relevant spans. Escalate only suspicious fields with their source crop/text to a capable extractor or reviewer.

A Jev check against faulty OCR cannot establish what the original image says. Missing source evidence is not repaired simply by asking another text model. Use the image-capable stage where needed. The [cascade cookbook](https://docs.typesafe.ai/cookbooks/sde_cascade.md) supports the architecture, not a universal accuracy guarantee.

## 10. Sites = precompute the common experience

Keep v11's approved components and design manifest. Let Jev interpret the merchant's brief, select an appropriate approved composition, and assess supplied copy against explicit textual criteria. Use deterministic checks for tokens, contrast rules where computable, broken links, schemas, and performance; render the page to assess actual layout.

### 10.1 Personalization without per-slot runtime inference

1. Define a small set of useful, permitted segments: first visit, returning customer, service enquiry, product browsing, for example.
2. Use explicit context when available. Browser language or a selected category often needs no model.
3. At content publication, choose coherent page compositions for each segment and locale. Prefer a valid composition as the choice unit over eight independent slots that might conflict.
4. Render the ready default immediately. Classify ambiguous session intent only where measured benefit justifies it; apply the result on a suitable later navigation without moving content under the user.
5. Invalidate the affected segment/page plan when content, eligibility, or the rubric changes.

Price, inventory, offer eligibility, and consent remain current code checks. Jev cannot infer permission to use personal history. Avoid personalization that reveals private customer information on shared devices.

### 10.2 Experiments

Jev can classify merchant feedback and propose a selection among reviewed variants. Code randomizes eligible traffic and measures incremental conversion with a persistent assignment and a control group. A predicted “better” design is not evidence of causal lift. Preserve latency and accessibility as constraints, not merely weighted preferences.

Begin with precomputed variants. Add per-session inference only after demonstrating incremental benefit over explicit-context rules and the static default.

## 11. Flows = recipe selection before graph invention

The common business cycle contains repeated patterns: enquiry to quote, quote to order, order to delivery, invoice to collection, support to resolution. Publish these as parameterized recipes using existing actions.

Jev's job is to select the suitable recipe, identify records and source values, interpret the user's requested variation, and choose among compatible bindings. The compiler owns types, cycles, required inputs, installed capabilities, permissions, and effect ordering.

| Request | Preferred treatment |
|---|---|
| “Remind me about unpaid invoices every Friday” | Match a reminder recipe; code resolves schedule and invoice predicate |
| “After a quote is accepted, create an order and tell the team” | Bind an approved acceptance recipe to existing actions |
| “Use this contact as the delivery contact” | Role-aware record selection within compatible fields |
| Novel branching process | Produce a reviewable draft through constrained planning or a generative step, then compile and validate |
| Unsupported action | Explain the missing capability; do not invent a callable action |

Do not ask Jev to discover cycles or compare schema types. Do not wire each new node only to the last five nodes: that arbitrary window can exclude a valid producer. Compute compatible bindings from the actual graph, then shortlist semantically where needed.

Start with the current ordered Flow representation where it satisfies the use case. Add durable branching semantics only for demonstrated product requirements. Jev reduces authoring friction; it does not remove the need for a correct execution engine.

## 12. Memory = preserve provenance, update only what changed

Use memory for stable preferences, relationships, and useful commitments, while reading authoritative live records for money, stock, current bookings, and access.

An incoming event should retrieve only potentially related facts. Jev can classify the relationship as duplicate, update, contradiction, or independent, using subject, source, scope, and time. Code then applies a conservative update policy:

- Explicit corrections to the same scoped fact can supersede older statements.
- Conflicting sources remain visible until resolved according to authority or user correction.
- Context-specific preferences do not automatically become permanent global preferences.
- Critical restrictions are not discarded merely because a model finds them old or uncertain.

Refresh only the affected entity summary or pack. Maintain an immediate overlay of new commitments and corrections so a daily pack job does not hide fresh facts. A compact pack is a retrieval aid, not a substitute for the underlying sources.

Use exact identifiers, aliases, and text retrieval first. Measure missed evidence before committing to “no vectors ever.” If recall remains poor, add an appropriate retrieval method because the data demonstrates a need.

Consent and access checks happen before retrieval. A Noul about whether history seems appropriate is not an authorization check. Product forgetting and retention require an explicit lifecycle; “rows never delete” cannot stand in for that lifecycle.

## 13. Verification = inspect the evidence that exists

For generated replies, check exact values and references in code first, then use Jev for contextual support, contradiction, and unresolved customer questions. Check the completed draft before the authorized send step.

The [citation cookbook](https://docs.typesafe.ai/cookbooks/citation_check.md) combines exact quote matching with a semantic support check. Apply that pattern to quotes, invoices, policy explanations, and supplier comparisons: a quoted passage can exist while failing to support the claim.

Use independent flags for serious failures; do not average a wrong recipient or unsupported price away with good tone and relevance. Conversely, do not run a generic semantic guard on every deterministic effect when the existing invariants already establish correctness.

An effective escalation ladder is:

~~~text
exact rule or valid saved result
  -> bounded semantic judgment
  -> better evidence or a focused user clarification
  -> targeted stronger extraction / generation / reasoning if useful
  -> review when the unresolved consequence requires it
~~~

Changing models is not the only recovery. Often the cheapest correction is selecting the right customer or supplying the missing date. Track which failure class each fallback actually fixes.

## 14. Further opportunities = reuse enables new products

### 14.1 A business attention queue

Combine semantic urgency, stated commitments, unresolved objections, and relationship context with deterministic due dates, order value, and waiting time. Produce one queue across domains, with separate reasons and source links. Users can change priorities without re-running unchanged semantic dimensions.

### 14.2 A natural-language view builder

Map “show orders where the customer is unhappy about delivery” to a permitted view template plus existing complaint/delivery tags. Code constructs the query. New unsupported semantic filters can trigger bounded background assessment of an authorized subset, with an explicit scope and cost budget; never imply instant exhaustive classification of unprocessed records.

### 14.3 An exception library

Cluster through bounded relation judgments or assign known exception categories after deterministic candidate retrieval. Reuse the categories for resolution templates, training material, and operations reports. Preserve rare high-impact cases rather than allowing a popular category to swallow them. Start with classification; add clustering only if it solves an observed discovery need.

### 14.4 A self-improving vocabulary

User corrections reveal aliases, confusing option descriptions, and missing categories. Propose edits to the catalog or rubric for review and evaluation. Do not silently let one tenant's correction alter another tenant's definitions. Jev does not acquire customer-specific weights or retain cross-call memory; improvement lives in TAR's data, questions, and selection logic.

### 14.5 Predictive features after labels exist

For churn, late completion, lead conversion, or escalation risk, assess interpretable dimensions from text, then combine them with ordinary numerical features. Train a small downstream model only when labeled outcomes and sufficient volume exist. Use temporal and customer-aware splits, avoid future information, and compare against simple rules and numerical-only baselines.

The [feature-discovery cookbook](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md) demonstrates offline question refinement and classical modeling on a wine-review dataset. It supports trying the method; it does not establish TAR prediction performance. Cache unchanged features, budget re-evaluation of changed questions, and retain a holdout untouched by question selection.

### 14.6 Semantic quality checks during development

Check whether action descriptions match their documented effects, whether help text omits a consequential condition, and whether domain examples contradict a supplied policy. Keep these checks advisory until precision is established. Type checking, arithmetic, access control, and schema compatibility remain ordinary tests.

## 15. Economics = count tokens and whole workflows

As checked on 2026-09-21, `jev-1.13.0` costs **USD 0.042 per million input tokens**, with free output tokens. Current limits are **64k total request tokens**, **32k state plus longest question**, **1,200 requests/minute**, and **250,000 tokens/second**. Limits are dynamic. Jev accepts text, not images/audio/video. [Model source](https://docs.typesafe.ai/models.md).

Use INR 95/USD only as v11's planning assumption, not a current exchange-rate claim.

~~~text
billed input = state + every question's instructions and criteria + framing
Jev cost = actual input tokens / 1,000,000 × USD 0.042
workflow cost = Jev + OCR/transcription + generation + retries
              + storage/compute + channel fees + review effort
~~~

### 15.1 Correct the per-seat example

| Scenario | Explicit assumptions | Jev-only INR / seat / month |
|---|---|---:|
| v11 narrow baseline | 1,500 calls × 2,000 total input tokens | 11.97 |
| Same calls with questions added | 2,000 state + 30 questions × 60 tokens = 3,800, before extra framing | 22.74 |
| Selective illustrative workload | The breakdown below; 2.172 million input tokens | 8.67 |

Selective example assumptions, not measured savings:

- 1,500 interactions, 40% needing semantics, 10% valid reuse: 540 paid primary calls × 3,000 tokens.
- 25% of those need a dependent second stage: 135 × 2,000 tokens.
- 20% need a generated-output check: 108 × 1,500 tokens.
- 60 background consolidation calls × 2,000 tokens.

Total = 843 calls and 2.172 million tokens. This excludes site visitors, bulk imports, additional event assessments, prose, infrastructure, channel charges, and review. Add them explicitly for a complete budget. Reuse rates and semantic demand must be observed, and event-driven work must not be double-counted as both ingress and a new background assessment.

Do not describe INR 16.82 or the claimed 2.54× saving in v11 as achieved or all-in. Its alternative-model prices and workload mix were not independently revalidated in this plan.

### 15.2 Site economics reveal the bigger opportunity

If each of 100,000 visits uses 1,200 tokens for session interpretation and 5,600 for one page's slot decisions, that is 680 million input tokens: **INR 2,713.20**, not INR 500. More pages increase the amount.

An illustrative precompute of eight segments × ten pages × 5,600 tokens is 448,000 tokens: **INR 1.79 per rebuild**. This is only composition inference, not total site cost. It excludes segment assignment, content generation, changed-content rebuilds, and rendering. The large structural saving comes from reusing decisions across traffic rather than finding a slightly cheaper model.

### 15.3 Scale is a throughput problem too

At one million seats × 1,500 monthly requests, a 30-day average is roughly **579 requests/second**, versus the currently published 20/second equivalent request quota. At 2,000 input tokens each it is approximately **1.16 million tokens/second**, also above the published token quota. Peaks and background work make the gap larger.

Before promising that scale, obtain appropriate provider capacity, reduce unnecessary inference, serve valid saved assessments, schedule background work, and set tenant fairness. The optimized example still needs about 325 requests/second at one million seats; optimization does not eliminate capacity planning.

Use bounded concurrency, deadline-aware backoff, and meaningful degradation. A timeout should preserve a manual form or draft, serve a default site, or queue background work. It should not automatically send every failure to a prose model that lacks the required action contract. The [API](https://docs.typesafe.ai/api.md) distinguishes validation/authentication failures from retryable throttling and overload.

## 16. Evaluation = prove useful simplification

Create evaluation sets from the actual work and preserve original evidence, candidate lists, desired action, and accepted outcome. Cover Indian business language, regional languages, transliteration, mixed-language messages, abbreviations, noisy transcripts, and locale-sensitive dates/amounts. English is currently the strongest documented language; do not assume equal performance elsewhere. [Models](https://docs.typesafe.ai/models.md).

| Layer | Required evidence |
|---|---|
| Retrieval | Correct candidate is present; inaccessible candidates are absent |
| Judgment | Correct intent/value/relationship, including none and ambiguous cases |
| Composition | Arguments and cross-field relationships form the correct whole proposal |
| Acceptance | Error rate among automatically accepted cases, coverage, and review burden |
| Execution | Same gateway invariants and idempotent effects as manual actions |
| Economics | Actual token usage, number of stages, fallback cost, p50/p95 latency |
| Product | Completion time, corrections, missed obligations, and user acceptance |

Run ablations: deterministic baseline; Jev on every interaction; selectively routed Jev; narrow versus broad speculative bundles; saved assessments versus recomputation; template versus generated output; lexical retrieval versus an added retrieval method where needed.

Thresholds belong to a specific route, model, question version, evidence quality, and consequence. Evaluate the final policy, not just confidence calibration. Minimum or multiplied probabilities do not establish whole-workflow accuracy because mistakes can be correlated.

A thousand examples are a useful starting dataset, not a universal release certificate. Even zero errors in 1,000 independent relevant trials gives an approximate 95% upper error bound of 0.3% under the rule of three. Evaluate the accepted subset and important slices, with larger or targeted samples where consequences require them.

Promote a route only when its predeclared error tolerance, coverage, latency, and total-cost targets beat the baseline. Human-reviewed drafts can ship before automatic execution meets its stricter target. Keep model pinning, canary comparisons, rollback, and per-route disablement.

## 17. Delivery = the smallest useful sequence

| Phase | Deliverable | Exit condition |
|---|---|---|
| P0a: foundation | Server adapter, versioned bundles, actual usage traces, candidate provenance, effect-safe retry handling | Contract/error checks pass; no keys in clients; costs observable |
| P0b: one vertical slice | Support/inbox routing plus natural command drafts through the catalog | Whole-route evaluation beats baseline; missing-input behavior works |
| P0c: commercial proof | POS or quote draft using span selection and real catalog candidates | Less correction/time at an acceptable latency and cost |
| P1a: reuse | Stored record assessments consumed by Inbox, CRM, and search | A changed screen/filter does not repeat unchanged inference |
| P1b: documents | Import extraction, evidence-linked briefs, selective draft verification | Reduced generation/review work without losing evidence |
| P1c: composition | Approved Flow recipes and precomputed site variants | Fewer bespoke prompts/planning paths; measured product benefit |
| P1d: memory | Incremental scoped facts, provenance, immediate corrections | Better retrieval with less history and no stale critical facts |
| P2: prediction | Labeled feature experiment and controlled personalization trials | Held-out or randomized improvement over simpler baselines |

Start question bundles in code. Introduce editable stored definitions only after versioning, validation, tenant isolation, review, and migration requirements are understood. The existing schema does not currently accept an arbitrary question kind.

Use the native HTTP contract or a verified compatible SDK in the existing runtime. The JavaScript SDK documents Node.js 20+; validate compatibility before adopting it in a different runtime. Do not create a separate Node service merely to use an SDK if a small HTTP adapter suffices. See [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript.md) and [HTTP API](https://docs.typesafe.ai/api.md).

## 18. Complexity budget = what this should remove

| Replace or defer | Keep instead | Revisit when |
|---|---|---|
| Separate language agent per domain | Shared operations plus domain rubrics | A domain genuinely requires a different execution architecture |
| Generative JSON for every extraction | Source candidates, typed selection, normalizers | Candidate generation demonstrably misses essential values |
| Prompt-based schema/type/permission checks | Existing code and compiler | These remain deterministic |
| Full prose regeneration of every brief | Selected source blocks and templates | Users need synthesis that selection cannot provide |
| A model call per site slot and view | Approved precomputed compositions | Measured incremental benefit pays for session inference |
| Freeform planner for every Flow | Recipe selection and deterministic compilation | Valid novel workflows become a significant demand |
| Reclassifying every record on every screen | Versioned assessments refreshed on dependency changes | The question itself depends on new screen/query context |
| Full-history memory rebuild per event | Entity-scoped retrieval and incremental consolidation | Evaluation shows a broader context is necessary |
| A new vector/feature platform from day one | Existing storage, text search, and trace records | Measured recall or modeling needs justify the addition |
| Generic model guard before every effect | Deterministic invariants plus targeted semantic verification | An effect depends on a claim requiring semantic support |

**Acceptance criterion for the architecture:** adding a domain should mostly add catalog entries, rubrics, templates, and tests. If it requires another agent loop, parallel source of truth, or general planner, first check whether the common operations and existing runtime can express it.

## 19. Open questions = measure before promising

| Unknown | How to resolve |
|---|---|
| Actual Jev latency for TAR's state and question sizes | Benchmark representative bundles and concurrency; record p95 end-to-end |
| Reliable acceptance thresholds across domains/languages | Labeled route-specific evaluation with consequence-aware policies |
| Candidate recall for real catalogs and colloquial requests | Separate retrieval study; include missing and near-duplicate items |
| Savings from shared assessments | Trace downstream consumption and avoided calls, including invalidations |
| Visual quality of generated sites | Rendered inspection and visual evaluation; textual Jev checks alone are insufficient |
| Safe benefit of automatic actions | Compare final accepted effects under existing authority and rollback constraints |
| Provider capacity and commercial terms at scale | Verify current account quotas and obtain the necessary capacity |
| Predictive or personalization lift | Held-out outcomes or controlled experiments, not confident judgments |

## 20. Sources = provenance and reading order

Historical design inputs were v10 and v11. Their accepted decisions now live in [v12](../tarv12.md). See the [Jev reference](jev.md) and implementation links in section 2. Provider documentation checked 2026-09-21:

1. [Documentation index](https://docs.typesafe.ai/llms.txt), [use-case map](https://docs.typesafe.ai/concepts/use-case-map.md), and [building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md): scope, decomposition, and question design.
2. [Models](https://docs.typesafe.ai/models.md), [API](https://docs.typesafe.ai/api.md), [confidence](https://docs.typesafe.ai/confidence.md): current capabilities, pricing, limits, and response semantics.
3. [Function calling](https://docs.typesafe.ai/cookbooks/function_calling.md), [pre-parsed extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md), [fan-out](https://docs.typesafe.ai/patterns/fan-out.md): typed commands and independent questions.
4. [Reranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md), [hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md), [skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md): bounded retrieval and progressive disclosure.
5. [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md), [feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md): reusable judgments and offline predictive experiments.
6. [Autoformat](https://docs.typesafe.ai/cookbooks/autoformat.md), [citation checking](https://docs.typesafe.ai/cookbooks/citation_check.md), [extraction cascade](https://docs.typesafe.ai/cookbooks/sde_cascade.md): structure preservation and targeted verification.

Several cookbook examples use Jev 1.12 or small/synthetic datasets. Their reported results demonstrate a pattern on that workload, not expected TAR accuracy on 1.13. The original social post is background context in [sources.md](sources.md); it is not used here as evidence for API contracts, throughput, or measured savings.
