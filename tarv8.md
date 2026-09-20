# TAR v8 = Local Speed + Shared Business Truth + Selective AI

> SQLite makes screens fast. Turso owns shared facts. Code executes. AI interprets.

**Status:** conceptual target, not an implemented or benchmarked system.
**Updated:** September 20, 2026. Prices checked against provider pages.
**Priority:** POS + Sales + Team + automations. Compact flows, explicit authority.

===============================================================================

## 0. THE DECISION

```text
                     TAR
                      |
      +---------------+---------------+
      |               |               |
   LOCAL APP       BUSINESS API     BACKGROUND
   Expo/SQLite     Workers/Turso    Queue/Workflow
      |               |               |
   fast screens    accepted truth   finish later
   offline drafts  permissions      retry / wait
                      |
                 SELECTIVE AI
                 Gemma / DeepSeek
```

| Keep | Change | Defer |
|---|---|---|
| Expo + local SQLite | Turso replaces proposed workspace Durable Objects | Full offline shared checkout |
| Typed business operations | Two requested DeepInfra models | Arbitrary AI-created applications |
| Proven configurable Bots | Jev becomes measured, optional optimization | Autonomous agent teams |
| Approvals for sensitive work | API-filtered local sync | Code Mode / arbitrary execution |
| Private My Agent goal | Operations first; My Agent later | New database engine migration |

- Pilot = about 10 businesses / 100 paid seats.
- Target = INR 100 total technical cost per paid seat/month.
- Routine actions run within configured authority; sensitive actions bind approval.
- English first. Currency, tax, totals & stock calculations remain ordinary code.
- This is a simpler candidate architecture; "perfect" requires pilot evidence.

===============================================================================

## 1. WHAT HAPPENED TO TURSO & LOCAL SQLITE?

**The previous proposal removed Turso without proving a cost advantage. Restore it.**

Local inspection found:

| Existing component | Observed state | v8 direction |
|---|---|---|
| Worker harness | D1 control + Turso workspace databases + Queue + R2 | Reuse this foundation |
| App SQLite | Uses `@tursodatabase/sync-react-native` locally | Keep permitted projections & drafts |
| `syncPull()` | Empty compatibility hook | Implement authorized delta pull |
| `scheduleSyncPush()` | Empty compatibility hook | Send typed draft commands through API |
| Shared writes | App directs mutations through harness gateway | Preserve |
| Workspace membership | Existing control-plane model uses D1 | Target: workspace authority in Turso transaction boundary |

These are scoped observations, not a complete implementation audit.

```text
LOCAL SQLITE != another authoritative business database
LOCAL SQLITE  = permitted cache + pending drafts + sync cursor

TURSO         = accepted orders + stock + sales + team + audit
WORKER        = only shared-business write entrance
```

**Keep the current libSQL-compatible backend initially.** Turso's newer Rust
engine, Turso Sync and libSQL Embedded Replicas have different behavior.
Do not swap SDKs and assume identical transactions or sync guarantees. [S4][S5]

===============================================================================

## 2. STACK = FEW COMPONENTS, CLEAR JOBS

```text
EXPO APP
  local SQLite
  |-- permitted records
  |-- pending draft commands
  '-- change cursor
        |
        | HTTPS: commands / queries / changes
        v
CLOUDFLARE WORKER
  identity -> workspace -> current permission -> typed operation
        |
        +--> D1     = identity directory / workspace discovery / AI budgets
        +--> TURSO  = one libSQL database per workspace
        +--> R2     = attachments / exports / published artifacts
        |
        '--> committed outbox
                 |
                 +--> QUEUE    = short delivery / background task
                 '--> WORKFLOW = multi-step work with durable waits
```

| Component | Owns | Does not own |
|---|---|---|
| Local SQLite | Fast UI & pending intent | Final payment, stock or access decisions |
| Worker | Validation, authorization, operations & AI entry points | Long-lived in-memory task state |
| Turso workspace DB | Business records, local membership, audit, outbox | Other workspaces' private data |
| D1 | Directory + atomic AI budget reservations | Authoritative workspace permissions |
| Queue | Deliver work with retries | Business truth or exactly-once effects |
| Workflow | Persist steps & waits when actually needed | Ordinary order state transitions |
| R2 | Files referenced by records | Permission decisions |

- No TAR-managed Durable Object or Agents SDK instance per workspace/Bot.
- Managed Workflows remain a separate billed service; internal implementation is
  Cloudflare's concern. Removing application DOs does not mean "no Cloudflare."
- No Redis, vector database, separate message bus or agent framework required.
- Existing D1 membership -> Turso authority is a migration, not already completed.
- Keep transactions short. Never call an LLM/payment service inside a DB transaction.
- Keep the Worker/database round trip near the pilot region; measure placement.

### Why this alternative?

| Option | Fit | Decision |
|---|---|---|
| Workers + Turso + local SQLite | Matches existing app; serverless API; SQL transactions | Select |
| Workers + D1 only | Fewer database vendors; different migration/sync tradeoffs | Viable fallback |
| Durable Objects + SQLite | Useful for active shared sessions & coordination | Revisit only for measured need |
| Hosted Postgres | Strong relational ecosystem; another migration | Revisit for larger cross-business workloads |
| VPS + SQLite | Low predictable rent; backups, failover & patching become our work | Avoid for first managed pilot |

DOs are not inherently expensive: hibernated objects do not accrue active
duration. Active/non-hibernatable duration can add cost. Workers charge requests
& CPU, not network-wait wall time. Turso is selected for fit and avoiding
unnecessary active sessions, not a claim that every Turso workload costs less.
Storage, reads, writes & sync still cost money. [S6][S7][S8]

===============================================================================

## 3. ONE OPERATION CONTRACT

```text
BUTTON / SCHEDULE / WEBHOOK / AI PROPOSAL
                       |
                       v
            TYPED BUSINESS OPERATION
                       |
   authenticate -> authorize -> validate -> transact
                       |
       result + audit + change-feed + outbox
```

A command carries workspace, operation, input, idempotency key & expected record
version. Identity and permissions come from the server, never model text.

**One workspace transaction:**

1. Check current membership, capability & record version.
2. Return the prior result when the same command already committed.
3. Apply business invariants & conditional updates.
4. Save result, audit evidence, ordered change & delivery intent together.
5. Commit; dispatch delivery afterward.

- Concurrent last-unit purchases use conditional stock updates in the transaction.
- Money uses integer minor units & explicit currency.
- A payment webhook is verified & deduplicated; browser success is not settlement.
- A retry repeats the same intent/key. Changed intent needs a new command.
- A cross-workspace task uses separate authorized operations; no implied global transaction.
- D1 budget reservations and Turso writes are not one atomic transaction.
  Reserve AI spend first; settle/release separately with reconciliation.

===============================================================================

## 4. LOCAL-FIRST SCREENS, SERVER-ACCEPTED BUSINESS

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
                         |                   |                  |
                     sync result        resolve version    explain & refresh
```

| Situation | Behavior |
|---|---|
| Read while offline | Show cached records + last updated time |
| Create order offline | Save draft; no confirmed stock/payment/number claim |
| Reconnect | Replay immutable command keys; show server result |
| Record changed | Compare relevant changes; user resolves meaningful conflict |
| Permission changed | Invalidate affected cache; fetch fresh permitted projection |
| Cursor expired | Re-bootstrap permitted data |
| Logout / workspace removal | Clear local protected data & pending access |

**Sync implementation = small authorized API, not a raw whole-database replica.**

- Bootstrap only permitted rows & fields.
- Server creates a monotonic change sequence with each business transaction.
- Cursor is bound to identity, workspace & permission epoch.
- Delta includes deletions and visibility removals; membership changes invalidate
  the old projection. Never filter only inserts.
- Apply each local batch and its cursor atomically.
- Offline revocation cannot erase already downloaded facts until reconnection.
  Minimize cached sensitive fields; use platform secure storage for credentials.
- Suggested active polling: kitchen 5s, POS 10s, other screens 30-60s.
  Stop background polling; back off idle screens; refresh on foreground.
- Polling intervals are pilot defaults, not freshness guarantees. Budget requests.
- Push notifications may signal "refresh"; they do not carry authoritative records.

### Why not native Turso Sync everywhere?

Turso's documented sync can bootstrap a full database. Its newer sync describes
Last-Push-Wins behavior; partial sync is experimental and is not a row/field
authorization boundary. Giving a kitchen device a workspace database token is
incompatible with hiding customer details and prices. [S4][S5]

Use native sync later only for an exactly authorized dataset with evaluated write
rules. API-filtered local projections are the simpler launch choice. Local SQLite
still saves repeated screen reads and enables drafts; it does not eliminate the
network work needed for fresh shared facts.

===============================================================================

## 5. BOTS = CAPABILITIES, NOT ALWAYS-RUNNING AGENTS

```text
BOT PACKAGE
  records + screens + operations + permissions + automation templates
                                   |
                          optional AI actions
```

| Launch Bot | Core work | Optional AI |
|---|---|---|
| POS | Catalog, orders, payment, kitchen, handover | Explain exceptions |
| Sales | Leads, quotes, follow-ups, shared contacts | Extract enquiry, draft quote/message |
| Team | Members, roles, assignments, invitations | Summarize permitted workload |
| Automations | Event/schedule + conditions + approved action | Interpret free-text input when needed |

- Contacts are shared records with field permissions, not a separate duplicate Bot.
- Installing a Bot enables capabilities and views; no new runtime/container.
- One operation serves button, automation and AI. No parallel AI-only backend.
- Configure proven templates; arbitrary generated apps remain later work.

### Food-order example

```text
2 x Margherita @ INR 250 = 500
1 x Garlic bread         = 120
Tax                      =  31
TOTAL                    = 651

PREPARATION = new -> preparing -> ready
PAYMENT     = unpaid -> pending -> paid / failed / unknown
FULFILLMENT = unfulfilled -> handed over / cancelled
RECEIPT     = queued -> sent / retry needed
```

These are independent facts. Receipt failure does not undo payment or prevent
an otherwise permitted handover. Kitchen sees items and preparation state, not
customer phone or prices. Cancellation/refund uses explicit business rules.

===============================================================================

## 6. DURABILITY WITHOUT A CUSTOM ORCHESTRATOR

| Work | Execution |
|---|---|
| Mark ready, edit lead, add item | Direct transaction |
| One-shot summary / draft | Bounded Worker request; save result if needed |
| Receipt / notification delivery | Queue + idempotent delivery intent |
| Wait for approval, follow-up tomorrow, multi-step agent | Managed Workflow |
| Reconcile lost dispatch / pending provider outcome | Scheduled bounded sweep |

```text
BUSINESS COMMIT + OUTBOX
            |
            v
        dispatch job ---- crash? ----> scheduled outbox recovery
            |
            v
  stable delivery/job identity
            |
      call external provider
            |
   store verified result / retry / unknown
```

- Queue is a delivery mechanism. Duplicate delivery is expected.
- Use provider idempotency where available. Otherwise reconcile before retrying
  uncertain effects; never promise exactly-once delivery.
- A five-minute pilot recovery sweep handles missed dispatch; normal dispatch is
  immediate. Track due jobs & oldest undelivered age.
- Sweep workspace batches from D1 directory; paginate and bound work.
- Workflow owns durable checkpoints; do not recreate its engine in SQL.
- SQL owns business evidence and approvals; retain it beyond Workflow history.
- Approval stores exact action, recipient, payload, record versions and expiry.
  Resume rechecks authority and versions. Changed proposals need fresh approval.
- Cancellation stops future steps; completed external effects need compensation.
- Queue / Workflow consumption is metered; use them only where required. [S9][S10]

===============================================================================

## 7. TWO MODELS, ONE SMALL HARNESS

**Provider = DeepInfra. Exact requested IDs; standard rates in USD / 1M tokens.**

| Role | Model ID | Input | Output | Cached input |
|---|---|---:|---:|---:|
| Fast routine interpretation | `google/gemma-4-E4B-it` | 0.02 | 0.10 | Not listed |
| Complex reasoning / tool work | `deepseek-ai/DeepSeek-V4-Flash` | 0.09 | 0.18 | 0.018 |

These match the provider pages checked. Do not silently substitute a similarly
named version such as a dated suffix; feature support and prices can differ. [S1][S2]

```text
KNOWN ACTION / SQL / RULE --------------------------> CODE

KNOWN SIMPLE AI TASK ------------------------------> GEMMA
                                                       |
                                             invalid / task too hard
                                                       |
                                           one allowed escalation
                                                       v
KNOWN COMPLEX AI TASK -----------------------------> DEEPSEEK
                                                       |
                                                typed proposal
                                                       |
                                             business operation
```

**Routing is code by task type first.** No extra LLM call to classify every request.

| Task | Route |
|---|---|
| Totals, tax, inventory, permission, status transition | Code |
| Extract fields from a short enquiry | Gemma, validate fields |
| Short rewrite / permitted summary | Gemma |
| Ambiguous multi-record investigation | DeepSeek directly |
| Complex tool plan / longer instruction set | DeepSeek directly |
| Unsupported / missing business facts | Ask for facts; do not manufacture values |

### Harness = context + tools + limits + evidence

```text
load current permitted facts
       -> model
       -> validate output / proposed tool
       -> authorize business operation
       -> compact result
       -> stop or next bounded step
```

- Task gets a small allowlist of typed tools, not the whole backend.
- Fetch needed facts on demand; return IDs, versions & short results.
- Keep model transcript separate from durable business truth.
- Suggested starting limits: 1 normal drafting call, at most 1 escalation;
  complex job max 8 model calls with an explicit spend/time limit.
- Start output ceilings at 512 tokens for Gemma and 2,048 for DeepSeek;
  larger tasks need a declared allowance. Truncation means incomplete, not valid.
- Reasoning tokens count toward output charges. Disable/reduce thinking only
  when the exact endpoint supports that setting and evaluations pass. [S3]
- Gemma tool/structured-output behavior must pass endpoint contract tests.
  Do not assume strict JSON Schema support just from function-calling support.
- Validate every output server-side. Valid shape is not evidence of correct facts.
- No unrestricted SQL, code execution or arbitrary external URLs as default tools.
- A provider outage leaves drafts/jobs recoverable; normal POS continues.

### Cache & context = the largest dependable AI savings

1. Zero model calls for deterministic work.
2. Short relevant context; SQL aggregates replace raw transaction dumps.
3. Stable instructions/tool definitions first, changing facts last.
4. Reuse cached prefixes when the provider reports real hits.
5. Return one useful structured result; avoid a second "explain the JSON" call.
6. Save accepted drafts/results with source versions; recompute when facts change.
7. Measure complete successful tasks, including retries and reasoning output.

DeepSeek caching is automatic for eligible prefix reuse; bill only actual hit
tokens at the cached rate. Do not assume every repeated request hits, pad prompts
to chase caching, or invent a Gemma cached rate. Inspect reported cached-token
usage. Provider docs sometimes use another model revision; verify the selected
endpoint before relying on configuration knobs. [S3]

===============================================================================

## 8. HOW JEV CAN CUT COST - AND WHEN IT CANNOT

Jev is a typed decision model: Choice, Score & Noul-style outputs rather than
general prose. The checked `jev-1.13.0` price is USD 0.042 / 1M input tokens,
with free output. Input includes supplied state and questions. Early-access
behavior/pricing can change. [S11]

**At your model prices, Jev is optional, not the default first hop.**

| Same illustrative input = 1,000 tokens | Output tokens | USD / call |
|---|---:|---:|
| Gemma | 50 | 0.000025 |
| DeepSeek, cold input | 50 | 0.000099 |
| DeepSeek, all input cached | 50 | 0.000027 |
| Jev | Typed output, free | 0.000042 |

- Jev is 68% more expensive than this Gemma call.
- Jev is about 58% cheaper than this cold DeepSeek call.
- Fully cached DeepSeek is cheaper here too; full caching is an optimistic bound.
- These compare equal input counts; real prompts/tokenizers differ.

```text
Gemma   = (0.020 * I + 0.100 * O) / 1,000,000
DeepSeek= (0.090 * U + 0.018 * H + 0.180 * O) / 1,000,000
Jev     =  0.042 * J                       / 1,000,000

I = input; O = all billed output
U = uncached input; H = cached input; J = Jev input including questions
```

For equal input, Jev beats Gemma on token cost only when O > 0.22 * I.
With 1,000 input tokens, Gemma output must exceed 220 tokens.

### Useful Jev patterns

| Pattern | Why it may save | Required proof |
|---|---|---|
| Replace a long LLM decision explanation with a typed answer | No generated prose cost | Equal/better task accuracy |
| Batch several narrow semantic questions over the same facts | Avoid repeated context & calls | Actual billed input comparison |
| Decide whether an expensive investigation is needed | Avoid entire DeepSeek jobs | Enough jobs skipped correctly |
| Replace repeated LLM checks in a bounded harness | Fewer generative calls | Lower successful-task cost |

```text
Jev precheck cost = Cj
Downstream call cost = Cl
Fraction of calls completely avoided = p

NEW COST = Cj + (1 - p) * Cl
SAVING only when p > Cj / Cl
```

For the short examples above, a Jev precheck must avoid more than 42% of cold
DeepSeek calls. Against Gemma it would need to avoid 168%: impossible for a
single downstream call. Adding Jev before every model call wastes money.

**Adoption = off -> offline evaluation -> sampled shadow -> enable winning routes.**

- No production Jev call unless it replaces measurable work.
- Confidence is not a calibrated error guarantee.
- Never use Jev for authorization, arithmetic, final settlement or policy truth.
- Benchmark English business examples, ambiguous inputs, injection & abstention.
- No mandatory Jev -> Gemma -> DeepSeek chain. [S11][S12]

===============================================================================

## 9. COST MODEL = MEASURED CALLS + SHARED PLATFORM

### Illustrative monthly AI usage per paid seat

| Actual calls | Model | Input / call | Output / call | USD total |
|---:|---|---:|---:|---:|
| 1,200 | Gemma | 1,000 | 150 | 0.0420 |
| 270 | DeepSeek | 3,000 | 500 | 0.0972 |
| 30 | DeepSeek | 8,000 | 1,500 | 0.0297 |
| **1,500** | **Total, no cache** | | | **0.1689** |

- At a planning conversion of INR 100/USD = **INR 16.89 AI / seat / month**.
- This conversion is a budgeting assumption, not a quoted exchange rate.
- If 60% of DeepSeek input tokens actually hit cache: USD 0.12354 = INR 12.35.
- Optional 300 Jev calls at 1,000 input each add USD 0.0126 = INR 1.26
  unless they replace other calls.
- 1,500 calls != 1,500 tasks. A multi-step task may consume several calls.

### Platform envelope for 100 paid seats

| Cost | Planning treatment |
|---|---|
| Workers paid base | USD 5/month = INR 5/seat at the planning conversion |
| Turso | Allow USD 6/month initially = INR 6/seat; confirm billing term at purchase |
| Queue / Workflow | Allowances first, then actual operations, steps & state |
| D1 / R2 / logs / backups / sync | Meter actual usage and retention |
| AI baseline above | INR 16.89/seat without cache |
| SMS / WhatsApp / email / payment fees | Separate measured variable lines |
| Taxes / currency movement / support tooling | Include before accepting target |

Turso pricing displays Developer at USD 4.99/month with a billing-term saving.
The USD 6 allocation is a planning allowance, not a verified checkout quote.
Free-tier capacity may suit a pilot; production choice must include recovery
requirements. Read/write/sync quotas and overages matter more as usage grows. [S6]

```text
ILLUSTRATIVE SUBTOTAL = Workers 5 + Turso allowance 6 + AI 16.89
                     = INR 27.89 / paid seat / month at 100 seats

REMAINING TO INR 100  = INR 72.11 for other actual costs
```

This is not a total-cost promise. At 10 paid seats the same USD 11 fixed
allowance becomes INR 110/seat before AI. Paid seat count is essential.

Workers paid includes 10M requests & 30M CPU-ms; Queues includes 1M operations,
with a typical successful small message using write/read/delete operations.
Workflow step allowances are separate; never count one whole job as one step.
Polls, retries, fan-out, logs and long retention all contribute. [S7][S9][S10]

### Enforcement

- One atomic budget reservation per paid identity; workspace ceilings are additional.
- Reserve worst permitted spend before a model call; reconcile actual token usage.
- Track uncached input, cached input, output/reasoning, retries & provider rates.
- Cap job calls, input, output, elapsed time & total spend.
- Budget exhaustion pauses optional AI; checkout and paid business operations remain.
- Report cost per completed task, useful automation & paid seat.

===============================================================================

## 10. COMPLETE CONCEPT SCREENS

**Concept wireframes; sample values are illustrative.**
Phone = bottom navigation. Desktop = same four surfaces in a left sidebar.
Workspace actions always show workspace context. My Agent clearly shows Private.

```text
+---------------------------------------------------------+
| TAR   [Acme Cafe v]                Search   Sync   Me    |
|---------------------------------------------------------|
|                                                         |
|                    CURRENT SCREEN                       |
|                                                         |
|---------------------------------------------------------|
|      Space       Inbox       My Agent       Bots        |
+---------------------------------------------------------+
```

### A. Entry & setup

```text
+---------------------- WELCOME --------------------------+
| Sign in                                                 |
| [Email]                                  [Continue]     |
|---------------------------------------------------------|
| Your businesses                                         |
| Acme Cafe                                      [Open]   |
| [Create business]                         [Join invite]  |
+---------------------------------------------------------+

+------------------- CREATE BUSINESS ---------------------+
| Name [Acme Cafe]   Currency [INR]   Time zone [India]     |
| Start with: [x POS] [x Sales] [x Team]                    |
| Invite team now [Optional]                              |
|                                       [Review setup]    |
+---------------------------------------------------------+

+---------------------- REVIEW SETUP ---------------------+
| POS: catalog, orders, kitchen & checkout                 |
| Sales: leads, quotes & follow-ups                        |
| Team: members & role access                             |
| Automation: receipt after verified payment              |
| Sensitive actions: refund / role change -> owner         |
| [Back]                                     [Activate]   |
+---------------------------------------------------------+
```

- Currency/tax configuration is explicit; the app does not infer legal tax rules.
- Invite opens the exact business; joining does not create a personal workspace.
- Activation shows enabled behavior and who can approve it.

### B. Space = business home

```text
+--------------------- ACME CAFE -------------------------+
| Today                            Updated just now       |
| Sales INR 12,450     Open orders 8     Attention 3        |
|---------------------------------------------------------|
| [New order]  [New lead]  [Assign task]  [Ask this space]   |
|---------------------------------------------------------|
| POS       3 preparing / 2 ready                  [Open]  |
| Sales     4 follow-ups due                      [Open]  |
| Team      2 tasks need assignment               [Open]  |
|---------------------------------------------------------|
| Recent: Order #1042 paid / Quote Q18 approved            |
+---------------------------------------------------------+
```

Role-aware home: kitchen sees preparation workload; sales sees permitted leads;
owner sees financial overview. Hidden data is absent from API responses too.

### C. Inbox = one attention list

```text
+------------------------- INBOX -------------------------+
| [Mine] [Team]    Filter: All / Approvals / Failed / Due   |
|---------------------------------------------------------|
| APPROVE   Refund #1038, INR 250                  [Open]  |
| DUE       Follow up with Maya                   [Open]  |
| FAILED    Receipt for #1042                     [Retry] |
| CONFLICT  Draft order changed                   [Review]|
|---------------------------------------------------------|
| Completed today                                  [View]|
+---------------------------------------------------------+
```

- One item links to its business record; no duplicate chat-only task list.
- Retry appears only when the operation is safe and the user is authorized.

### D. Bots = install & configure

```text
+-------------------------- BOTS -------------------------+
| Installed: POS [Open]   Sales [Open]   Team [Open]       |
|---------------------------------------------------------|
| Available templates                                     |
| [Receipt after payment] [Quote follow-up] [Task reminder]|
| Later catalog: Support / HR / Finance / Operations / Site|
+---------------------------------------------------------+

+-------------------- BOT CONFIGURATION ------------------+
| Sales                                                   |
| Enabled: leads [x] quotes [x] follow-ups [x]              |
| Access: owner + sales team                               |
| Outbound channel: [Business email v]                     |
| Sending policy: [Approved templates automatically v]    |
| [Preview behavior]                               [Save] |
+---------------------------------------------------------+
```

No prompt editor is required to run the business. Advanced instructions cannot
expand permissions or bypass approval rules.

### E. POS = fast order entry

```text
+------------------------ NEW ORDER ----------------------+
| [Search item]                     Cart                  |
| Margherita       INR 250   [+]     Margherita x2     500 |
| Garlic bread     INR 120   [+]     Garlic bread x1   120 |
|                                   Tax               31 |
| Customer [Optional]               TOTAL            651 |
| Note [No onions]                                        |
| [Save draft]                            [Accept order]  |
+---------------------------------------------------------+
```

Accept checks current prices, stock & authority online. Offline button becomes
"Save offline draft"; it does not pretend the order has been accepted.

### F. Kitchen = preparation only

```text
+------------------------- KITCHEN -----------------------+
| New 3                 Preparing 2             Ready 1  |
|---------------------------------------------------------|
| #1042   4 min ago                                       |
| 2 Margherita / 1 Garlic bread                           |
| Note: No onions                                         |
| [Start preparation]                         [Mark ready]|
+---------------------------------------------------------+
```

No prices, payment controls, customer phone or sales totals. Actions depend on
current state; double taps safely reuse the same command.

### G. Checkout = explicit payment state

```text
+---------------------- CHECKOUT #1042 -------------------+
| Total INR 651                     Due INR 651          |
| Method: [Cash] [Connected payment provider]              |
|---------------------------------------------------------|
| Cash received [700]                 Change INR 49       |
|                                  [Record cash payment] |
|---------------------------------------------------------|
| Provider payment: Pending confirmation                  |
| [Check status]             Do not collect twice         |
+---------------------------------------------------------+
```

Cash recording follows role rules. Provider payments show Pending/Unknown until
verified. A retry checks/reuses the payment intent; it does not create a second
charge silently.

### H. Order detail = independent states

```text
+------------------------ ORDER #1042 --------------------+
| Preparation: Ready     Payment: Paid                    |
| Fulfillment: Waiting   Receipt: Retry needed            |
|---------------------------------------------------------|
| Items / allowed customer details / activity              |
| [Hand over]  [Retry receipt]  [Request refund]            |
+---------------------------------------------------------+
```

Handover follows configured payment/preparation policy. A failed receipt is a
separate issue. Refund opens an exact amount/reason approval flow when required.

### I. Catalog & stock

```text
+--------------------- CATALOG / STOCK -------------------+
| Search [                    ]              [Add item]   |
| Item             Price      On hand   Reserved   Sellable|
| Margherita       INR 250       20         3         17  |
| Garlic bread     INR 120       12         1         11  |
|---------------------------------------------------------|
| Item detail: price / tax category / availability         |
| [Edit] [Adjust stock] [View movement history]            |
+---------------------------------------------------------+
```

Stock adjustment captures reason, actor and any required approval. Invariant:
available stock comes from accepted changes, not a model estimate.

### J. Sales pipeline & lead

```text
+-------------------------- SALES ------------------------+
| [New lead]  [Search]  [Due today]                         |
| New 8       Qualified 4       Quoted 3       Won 2       |
| Maya / Catering / INR 12,000 estimate            [Open]  |
+---------------------------------------------------------+

+------------------------- MAYA --------------------------+
| Stage: Qualified     Owner: Arjun     Next: Tomorrow    |
| Contact / enquiry / permitted history                   |
|---------------------------------------------------------|
| [Draft quote] [Add note] [Schedule follow-up]            |
| AI draft -> review quantities, prices & recipient        |
| [Save draft]                 [Send / Request approval]  |
+---------------------------------------------------------+
```

Quote values use current catalog/business rules. AI can interpret the enquiry
but cannot invent a discount or send to an unverified destination.

### K. Shared contact

```text
+------------------------- CONTACT -----------------------+
| Maya                   Assigned to: Arjun              |
| Visible fields: name / permitted email / phone          |
|---------------------------------------------------------|
| Timeline: enquiry -> quote -> order -> follow-up         |
| [Update details]  [Create lead]  [View related orders]    |
+---------------------------------------------------------+
```

One contact identity across installed capabilities. A contact is not a member;
seeing a contact does not grant access to every related record.

### L. Team, roles & assignments

```text
+--------------------------- TEAM ------------------------+
| [Members] [Assignments] [Roles]               [Invite]   |
| Arjun    Sales       Active                     [Edit]  |
| Mira     Kitchen     Active                     [Edit]  |
|---------------------------------------------------------|
| Role: Kitchen                                           |
| Can: view item list / start preparation / mark ready     |
| Hidden: money / contact details / access settings        |
| [Preview access]                                 [Save] |
+---------------------------------------------------------+
```

Role changes show exactly what access changes. Revocation blocks new server
operations immediately; connected devices refresh their allowed projection.

### M. Automation = template form, not a graph builder

```text
+------------------- QUOTE FOLLOW-UP ---------------------+
| When: Quote sent                                        |
| Wait: [2 days]                                          |
| Only if: [No reply] & [Quote still open]                 |
| Action: [Send approved follow-up template]               |
| Channel: [Business email]                               |
| Daily limit: [20]      Owner: [Sales manager]            |
| [Preview with example]                      [Activate]  |
+---------------------------------------------------------+
```

Preview shows trigger, eligible records, destination, authority and approval
behavior. Runs recheck conditions at execution time. Edits are versioned.

### N. Work detail & recovery

```text
+--------------------- FOLLOW-UP TO MAYA -----------------+
| Waiting until tomorrow, 10:00                           |
| Done: quote sent / recipient verified                   |
| Next: check for reply, then send permitted template      |
|---------------------------------------------------------|
| [Open quote] [Cancel follow-up]                          |
| If failed: reason + [Retry when safe] / [Resolve]         |
+---------------------------------------------------------+
```

Users see work and outcomes, not queues or checkpoint machinery. A cancelled
job records what already happened; it cannot unsend a message.

### O. Approval = exact effect

```text
+-------------------- REFUND APPROVAL --------------------+
| Order #1038        Amount INR 250                       |
| Destination: original payment method                    |
| Reason: item unavailable                                |
| Requested by: Arjun                                    |
|---------------------------------------------------------|
| [Open evidence]                     [Reject] [Approve]  |
| If order/amount changed: Review updated request          |
+---------------------------------------------------------+
```

No "approve whatever the agent does next." Expired, changed or already applied
approvals cannot authorize a different effect.

### P. Ask this space = contextual assistance

```text
+---------------------- ASK ACME CAFE --------------------+
| Why are three orders delayed?                           |
|---------------------------------------------------------|
| Two await preparation; one awaits payment confirmation. |
| Evidence: [#1042] [#1044] [#1045]                        |
| Suggested: assign the two preparation orders to Mira.   |
| [Review assignment]                                    |
| [Ask another question]                                 |
+---------------------------------------------------------+
```

Answer uses current allowed facts and links to evidence. Proposed changes open
normal business controls. Chat is optional for operating POS/Sales/Team.

### Q. My Agent = private, later release

```text
+----------------------- MY AGENT ------------------------+
| PRIVATE                                                 |
| Goals / notes / personal tasks                          |
| [Ask] [Add task] [Connected apps]                        |
|---------------------------------------------------------|
| Workspace request: draft Acme Cafe sales summary         |
| Access: your current Acme Cafe permissions               |
| [Open in Acme Cafe]                                     |
+---------------------------------------------------------+
```

Private history is not copied into workspace history. Moving content or acting
in a business requires explicit workspace context and current authorization.
My Agent is a private surface, not an automatically created personal workspace.

### R. Connections & settings

```text
+------------------------ SETTINGS -----------------------+
| Business: currency / time zone / tax configuration       |
| Access: members / roles / approval policies              |
| Connections: email / payment / messaging                 |
| Storage: attachments / retention / export                |
| Usage: allowances / optional AI / billing                |
| Activity: authorized business history                    |
+---------------------------------------------------------+

+--------------------- BUSINESS EMAIL --------------------+
| Connected account: sales@example.com                    |
| Allowed use: approved sales templates                   |
| [Send test to myself] [Change permissions] [Disconnect]  |
+---------------------------------------------------------+
```

Store secrets server-side. Connecting an account does not grant every Bot
permission to use it. A test message is an explicit user action.

### S. Usage, sync & conflict

```text
+------------------------ USAGE --------------------------+
| Optional AI allowance: 38% used this month               |
| Completed: 210 drafts / 44 summaries                     |
| [Set allowance] [View activity]                          |
| If exhausted: AI paused; business operations available   |
+---------------------------------------------------------+

+--------------------- CONNECTION STATUS -----------------+
| Offline - last refreshed 10:42                           |
| 2 drafts saved on this device                           |
| [View drafts]                       [Retry connection]  |
|---------------------------------------------------------|
| Conflict: Garlic bread price changed 120 -> 130          |
| Your draft is preserved                                 |
| [Review latest total]                       [Keep draft]|
+---------------------------------------------------------+
```

Normal product screens show useful allowances and outcomes. Detailed token and
provider accounting belongs in owner/admin diagnostics.

### T. Later modules = same interaction grammar

| Module | Home | Record/detail | Main action | Attention |
|---|---|---|---|---|
| CRM | Contacts & relationship stages | Relationship timeline | Assign / update | Follow-up due |
| Support | Tickets by state | Conversation & evidence | Reply / resolve | SLA or escalation |
| HR | People requests | Leave / onboarding request | Submit / approve | Missing approval |
| Finance | Invoices & reconciliation | Invoice/payment evidence | Issue / reconcile | Mismatch |
| Operations | Work orders | Checklist & assignment | Assign / complete | Blocked work |
| Site | Pages & releases | Page preview | Publish reviewed release | Failed publish |

```text
+----------------------- SITE / LATER --------------------+
| Pages: Home / Menu / Contact                             |
| [Edit] [Preview]                                        |
| Preview release: R18                                    |
| [Publish this reviewed release]                         |
| History: R17 live / R16 previous     [Restore preview]   |
+---------------------------------------------------------+
```

Publishing binds approval to immutable release content. Restore switches to a
reviewed version; it does not ask the model to recreate an old page.

### U. Every screen shares these states

| State | Visible behavior | Next action |
|---|---|---|
| Empty | Explain purpose with one starter action | Create / install |
| Loading | Keep valid cached content with freshness label | Wait / refresh |
| Offline | Cached read + draft badge | Save draft / reconnect |
| Pending | Accepted intent not yet confirmed | Check status |
| Conflict | Preserve draft & explain changed facts | Review |
| Denied | Explain unavailable action without revealing hidden data | Request access |
| Failed | Specific recoverable reason | Retry / resolve |
| Approval required | Show exact proposed effect | Review |
| AI unavailable / budget paused | Keep manual controls usable | Continue manually |

### V. Complete launch journeys

```text
OWNER  = sign in -> create -> enable Bots -> configure access -> Space
CASHIER= Space -> POS -> accept order -> checkout -> handover
KITCHEN= Space -> kitchen -> preparing -> ready
SALES  = enquiry -> lead -> draft quote -> review/send -> follow-up
TEAM   = invite -> role -> assignment -> completion
AUTO   = template -> preview -> activate -> work detail -> result
ISSUE  = Inbox -> evidence -> approve / resolve / retry -> record
OFFLINE= cached screen -> draft -> reconnect -> accepted / conflict
```

===============================================================================

## 11. MODERN CONCEPTS: ADOPT THE USEFUL PART

| Concept | Adopt now | Defer / avoid |
|---|---|---|
| Harness architecture | One bounded loop around typed tools | One framework/runtime per Bot |
| Model routing | Static capability route + measured escalation | Classifier on every button |
| System-one decisions / Jev | Optional evaluated narrow decisions | Universal cost-saving claim |
| Context engineering | Scoped facts, compact tool results, prefix reuse | Full history every call |
| Procedural memory | Reviewed templates from repeated successful work | Self-modifying business authority |
| Durable execution | Managed waits/checkpoints where needed | Custom scheduler/checkpoint engine |
| Tool discovery / MCP | Adapters behind permissioned operations when useful | Hundreds of tools in every prompt |
| Agent interoperability | Keep operation contracts portable | Agent-to-agent mesh for simple workflows |
| Generative UI | Approved result components | Model-generated checkout logic |

These are architectural patterns, not evidence that a new launch is necessary.
Evaluate upcoming protocols or runtimes only against a real missing capability.
No speculative launch is a release dependency.

===============================================================================

## 12. BUILD ORDER & RELEASE PROOF

| Stage | Deliver | Must prove |
|---|---|---|
| 1 | Turso authority + typed operations + local projections | Permissions, transactions, replay, sync |
| 2 | POS / kitchen / checkout / stock | Concurrent orders & verified payment |
| 3 | Sales / Team / contacts / Inbox | Field access & exact approvals |
| 4 | Template automations + recovery | Retry, lost dispatch, cancellation |
| 5 | Gemma + DeepSeek actions | Endpoint compatibility, quality, spend caps |
| 6 | Optional Jev evaluation | Lower cost per correct completed task |
| Later | Private My Agent + broader Bots + Site | Isolation & explicit external authority |

### Acceptance checks

- Duplicate checkout; concurrent last-unit sale; stale record version.
- Membership revoked between proposal and execution.
- No customer fields in kitchen API, local database or changes feed.
- Cursor expiry, deleted records, permission changes & reconnect conflicts.
- Crash after commit/before enqueue; duplicate delivery; uncertain provider result.
- Approval early/twice/expired; changed amount/recipient; cancel during wait.
- Exact model IDs: tools, schema handling, truncation, caching & reasoning accounting.
- Prompt injection cannot widen tools, workspace, recipient or permissions.
- Provider outage and AI budget exhaustion leave manual business usable.
- Evaluate at least 1,000 representative English tasks with held-out cases;
  report quality, escalation, abstention, latency & total successful-task cost.
- Target deterministic-operation p95 below 300ms in the pilot region,
  excluding external provider work; measure before promising it.
- Restore a workspace backup and reconcile payment/outbox evidence.
- Measure real monthly cost including idle polling, logs, backups & communication.

### Migration = reuse first, replace carefully

```text
inventory current schema & pending work
 -> export / backup
 -> pilot workspace migration
 -> reconcile records & permissions
 -> enable new sync / operations
 -> monitor
```

- Keep one authoritative writer per workspace; no casual dual writes.
- Preserve idempotency identities, financial evidence & pending work.
- Rollback must reconcile new accepted writes, not simply restore stale data.
- Move membership authority explicitly; avoid contradictory D1/Turso permissions.
- No application code was changed for this conceptual revision.

===============================================================================

## 13. PRIMARY SOURCES & LIMITS

Research checked September 20, 2026. Vendor statements are not TAR benchmarks.
Rates, model versions, early-access APIs and allowances must be rechecked at implementation.

| Ref | Source | Used for |
|---|---|---|
| S1 | [DeepSeek-V4-Flash on DeepInfra](https://deepinfra.com/deepseek-ai/DeepSeek-V4-Flash) | Exact requested model & standard token prices |
| S2 | [Gemma-4-E4B-it on DeepInfra](https://deepinfra.com/google/gemma-4-E4B-it) | Exact requested model & standard token prices |
| S3 | [Prompt caching](https://docs.deepinfra.com/chat/prompt-caching), [reasoning](https://docs.deepinfra.com/chat/reasoning), [structured outputs](https://docs.deepinfra.com/chat/structured-outputs) | Actual cache hits, output billing & feature caveats |
| S4 | [Turso local-first guide](https://turso.tech/blog/building-local-first-apps-the-complete-guide-to-offline-first-database-sync) | Engine differences, full bootstrap, sync conflicts & experimental partial sync |
| S5 | [Turso Sync usage](https://docs.turso.tech/sync/usage), [TypeScript SDK reference](https://docs.turso.tech/sdk/ts/reference) | Sync behavior & client/backend distinction |
| S6 | [Turso pricing](https://turso.tech/pricing) | Plans, billing-term display & usage quotas |
| S7 | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Base charge, request/CPU billing & no duration charge |
| S8 | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) | Active duration vs hibernation; storage and operation costs |
| S9 | [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/) | Operations, retries & included allowance |
| S10 | [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/), [rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [retention change](https://developers.cloudflare.com/changelog/post/2026-09-10-paid-retention-default/) | Managed durability, step costs & separate business evidence |
| S11 | [TypeSafe models](https://docs.typesafe.ai/models), [Jev introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev) | Typed decisions, early access & token pricing |
| S12 | [Jev confidence](https://docs.typesafe.ai/confidence), [limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13) | Confidence interpretation & evaluation requirements |
| S13 | [Jev harness patterns](https://www.langchain.com/blog/building-a-harness-with-jev), [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Optional decision middleware & compact relevant context |
| S14 | [Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview), [WorkflowAgent](https://ai-sdk.dev/docs/agents/workflow-agent), [MCP roadmap](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/) | Alternative harness/protocol patterns; not required dependencies |

===============================================================================

## 14. ONE-SCREEN SUMMARY

```text
TAR = LOCAL SPEED + SHARED TRUTH + SELECTIVE INTELLIGENCE

UI          = Space / Inbox / My Agent / Bots
LOCAL       = SQLite permitted cache + drafts
SHARED      = Turso workspace SQL
API         = stateless Worker + typed operations
BACKGROUND  = Queue for delivery; Workflow for durable multi-step work
AI          = Gemma for simple tasks; DeepSeek for complex tasks
JEV         = optional, only where measured savings justify it
CONTROL     = current permissions + exact approvals + atomic spend reservations
EFFICIENCY  = no model for buttons, arithmetic, stock or authorization

SIMPLE FLOW
  see facts -> choose action -> validate -> commit -> show result
                                       |
                                       '-- finish later only when necessary
```
