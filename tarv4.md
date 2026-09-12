# TAR v4 — Architecture

> One harness. One record. One gateway. Three surfaces: Inbox, Space, Bots.

TAR v4 is one execution harness over one record table, with one commit authority and three screens. Reads are local, truth is in the cloud, blobs never sync. This is the target architecture; implementation status is in §12.

============================================================
# PART A — THE SYSTEM
============================================================

| Intent | Harness | Truth |
|---|---|---|
| human · channel · schedule | context + tools + policy | Records — business facts |
| assistant · bot trigger | code \| model \| human | Events — audit + replay |
| every step | bounded by policy + budget | Gateway — one commit contract · Blobs — large content |

~~~text
intent ( human · channel · schedule )
  -> Harness ( context + tools + policy )
  -> code | model | human
  -> Gateway ( one transaction )
       -> Records + Event + next step
       -> Inbox task when a person is needed ( Run waits )
       -> Delivery when the outside world is touched
~~~

**Design rules**

1. One writer — every official effect goes through the Gateway.
2. Deterministic first — code unless interpretation is genuinely needed.
3. One human queue — all human work is an Inbox task.
4. Three surfaces — Inbox, Space, Bots. No fourth screen.
5. Bots are packages, not processes — installing one configures; it does not start an agent.
6. Local reads, cloud truth — blobs never sync.

## 1. VOCABULARY

Four primitives, two packages and three views. Nothing else is user-facing.

| Kind | Concept | Meaning | Internal name |
|---|---|---|---|
| Primitive | **Record** | Any stored fact — contact, order, task, message, run, bot install, site | `records` row |
| Primitive | **Action** | A registered, versioned capability: `app`, `agent` or `human` | tool |
| Primitive | **Gateway** | The only authority that commits a Record or external change | `executeGateway` |
| Primitive | **Harness** | The one execution engine: context + tools + policy + loop | run loop |
| Package | **Bot** | Capability pack: records + Actions + Flows + Space cards + Inbox work + roles | `definitions` rows |
| Package | **Flow** | An ordered process made of steps; optional — simple work is one Action | playbook |
| View | **Space** | The role's workbench of cards | view over `definitions` |
| View | **Inbox** | Every task a person must act on | view over `type='task'` |
| View | **Channel** | An inbound/outbound connection | `type='channel'` record |

A **Run** is a Record (`type='run'`); so are a site, a message and a bot install. Every first-class object is one row in one table. `artifact`, primitive, tool, skill, model, MCP and sandbox are engineering terms; users see Records, Flows, Actions, Bots.

## 2. THE HARNESS — ONE AGENTIC ENGINE

The Harness is the one agentic engine behind the assistant, every Flow, every Automation and every Bot.

~~~text
run(intent)
  brief   = permitted Records + Bot guidance + relevant memory + available Actions
  policy  = member role + Bot grants + approval rules + budget + bounds
  loop    = plan -> propose -> commit -> observe -> repeat   (bounded)
  commit  = Gateway (one transaction)
~~~

| Step mode | Used for | Authority |
|---|---|---|
| **code** | calculations, validation, transactions, integrations, known rules | may commit through Gateway |
| **model** | one structured call, or a bounded tool-using loop within a step budget | proposes only |
| **human** | judgement, missing facts, required approval | replies through Inbox; Gateway validates |

It picks the cheapest sufficient mode: `code -> model -> human`. An **agent** is not a fourth mode — it is a model step that may use tools within a step budget. The loop runs under a per-Bot **strategy**: `single` (default), `verify` (a second pass checks a proposal before commit) or `parallel` (independent sub-steps fan out). Strategy is configuration, not a second engine.

| Guarantee | Rule |
|---|---|
| One engine | Assistant, Flows, Automations and Bots all call the same harness |
| Bounds | `actions`, `steps`, `deadline`, `budget`, `allowedTools`, `outputSchema`, `contextBudget` |
| Context is data | Records, messages and tool output are data, never authority |
| Compaction | tool output and history are summarized to the context budget; the budget is enforced, not advisory |
| Proposals | model output is a schema-validated proposal; a commit performs the effect |
| Durable | each step checkpoints on the Run; a wakeup reads saved state before advancing; a stable key per trigger and step prevents repeats |
| Cancellation | stop future steps; reconcile in-flight effects; compensation is a new Action |
| Failure | save progress; bounded retry or Inbox handoff; manual work stays available |
| Learning | record corrections with provenance; propose changes, never silently rewrite policy |

**One assistant.** The Space assistant is the harness surfaced in the UI. It can answer, draft, set up records, install Bots and run Flows; it cannot widen grants, install executable code or change policy.

| Assistant use | Harness step |
|---|---|
| Setup | model drafts Bot picks, schema, Flow and Space cards; preview + validate |
| Import | model maps, extracts and drafts into forms; ambiguous identity is reviewed |
| Search | code runs queries and totals; model explains with sources |
| Inbox | model summarizes/drafts; Actions govern sends and approvals |
| Exceptions | code detects; model proposes recovery; human approves process change |

A **sandbox** is a tool, not an identity: `sandbox.run` gets an ephemeral, region-pinned machine with declared limits, and its outputs commit through the Gateway. No Bot owns a persistent computer. Device AI, parallel loop strategies, MCP servers and sandboxes are optional upgrades behind adapters (§12); none adds a second engine.

## 3. RECORDS + STORAGE

| Store | Holds | Authority |
|---|---|---|
| Control / D1 | identity, membership, grants, workspace routing | access; rows carry `workspace` |
| Workspace / Turso | all business Records, Flows, Runs, Events, Deliveries | one isolated database per workspace |
| Objects / R2 | media, documents, large outputs, site releases | immutable content referenced by DB |
| Device / local SQLite | permitted working set + drafts + command queue | local experience; server confirms effects |

One table holds everything; the workspace connection is the tenant, so business rows carry no `workspace`.

~~~text
records
  id        text primary key
  type      text            -- contact | order | task | message | run | bot | site | ...
  title     text
  state     text
  data      json            -- type-specific facts
  owner     text null       -- business ownership
  assignee  text null       -- human task assignment
  due       integer null
  version   integer         -- optimistic concurrency
  created   integer
  updated   integer
  archived  integer null
~~~

| Rule | Meaning |
|---|---|
| Names | one lowercase ASCII word per column and JSON key; no underscores, hyphens or joined suffixes |
| Notation | `data.contact` is a path; `roles[]` is an array |
| Units | money = integer minor units + currency; rates = basis points; time = UTC milliseconds |
| Identity | `contact` stores a contact ID; `owner` is business ownership; `assignee` is human assignment |
| Extension | type-specific facts live in `data`; hot common filters stay columns |
| Validation | the type schema defines fields, transitions, references and writable scope |
| Concurrency | expected version checked inside the transaction; require the intended affected rows |
| Removal | archive Records; protected definitions and audit keep their own retention |

Every first-class object is a Record — `run`, `message`, `bot`, `site`, `channel` — so lists, links, search and views reuse one projection. Action IDs such as `order.place` are namespaced identifiers, not column names.

| Keep in DB | Put in R2 |
|---|---|
| prices, stock, reservations, order lines, payment facts | images, video, receipts, attachments |
| assignment, status, short messages, searchable metadata | long documents, large message bodies, site releases |
| Flow definitions, Run outputs, replay keys, compact audit | large traces and tool results |

~~~text
product.data.image = { object, hash, bytes, mime }

list products -> DB facts
open image    -> authorize reference -> R2 content
~~~

Small text and JSON stay inline; review payloads around 32 KB. DB and R2 share no transaction: authorize upload, verify hash/size/type, then commit the reference. Cleanup never races attachment. Credentials live in secret storage, never in Records.

## 4. GATEWAY — ONE COMMIT CONTRACT

~~~text
authenticate -> authorize -> validate -> check versions -> commit
                                                          |
                                     one workspace transaction:
                                     business changes + Run transition
                                     + Event (audit + replay result)
                                     + Delivery intent (external effects)
~~~

| Boundary | Rule |
|---|---|
| Replay | workspace + key binds actor, Action ID/version and a canonical input hash; the same request returns the saved result after an access check |
| Conflict | same key with changed input or explicit version fails; unique key and checked writes prevent duplicate effects |
| Approval | bind Action version, input hash, affected versions and expiry; recheck authority at execution |
| Reads | project permitted rows and fields; screen visibility is not access control |
| Retry | bounded transient retries; stale input requires a new decision |
| External effect | commit a Delivery intent; use a stable provider key; reconcile uncertain outcomes |
| Separate stores | D1, Turso, R2 and providers share no transaction — bridge with a durable intent and a saved result |

~~~text
delivery: pending -> sending -> confirmed
                       +-> retry -> sending
                       +-> unknown -> reconcile -> confirmed / failed
~~~

A timeout is not proof of failure; TAR never promises exactly-once external delivery. Control changes such as access grants save an idempotent result in D1, then reconcile. A completed Action returns its saved result even if its implementation has retired. Access, secret and definition-management Actions are owner/admin-only and never agent-controlled. Money, stock, assignment and approvals never use last-write-wins.

## 5. BOTS — THE CAPABILITY SYSTEM

A Bot is a package of business capability — the records it owns, the Actions it adds, the Flows it ships, the cards it puts on the Space, the work it puts in the Inbox and the roles it expects. It is not a running agent: installing it configures the workspace, deterministic steps stay code and only reasoning steps call a model.

~~~yaml
Bot:
  id: pos
  version: 3.1.0
  title: POS Bot
  category: Retail
  guidance: "Set up your store, add products, open the register."
  records:  [product, order, payment, register, movement, customer]
  actions:  [pos.open, pos.order.save, pos.checkout, pos.refund, pos.stock.adjust, pos.register.open]
  flows:    [sell, orders, stock, customers, register]
  space:                       # cards per role
    owner:   [sales-today, new-sale, low-stock]
    cashier: [new-sale, close-shift]
    kitchen: [kitchen-queue]
  inbox:                       # human work this Bot generates
    - prepare order   roles: [kitchen]
    - approve refund  roles: [owner, admin]
  roles:    [cashier, kitchen, stock]
  triggers: [channel, schedule]
  strategy: single         # single | verify | parallel
  sandbox:  false          # may use ephemeral sandbox tools
  deps:     [{ bot: contacts, version: ">=1" }]
~~~

| Part | Means | Surfaces as |
|---|---|---|
| `records` | types and schemas it introduces | records lists, forms, search |
| `actions` | registered tools it adds | Space entries, Flow steps, assistant tools |
| `flows` | template processes it ships, each a set of steps (§8) | Space cards, Run history |
| `space` | role → cards contributed | **Space** |
| `inbox` | human work templates | **Inbox** |
| `roles` | work roles it expects | assignment, card visibility |
| `strategy` | loop strategy for its Flows | single · verify · parallel |
| `sandbox` | whether it may use ephemeral sandbox tools | declared limits + region |
| `deps` | required Bots/capabilities | install preview, upgrade checks |

**Two more, same shape**

~~~yaml
Sales Bot:
  records: [contact, account, lead, deal]
  actions: [lead.capture, lead.qualify, deal.progress, quote.create, quote.send]
  flows:   [lead-capture, qualify, deal-progress, follow-up]
  space:   owner: [revenue, pipeline]
           sales: [leads, deals, new-lead]
  inbox:   [qualify lead · sales, review proposal · owner]
  roles:   [sales]
  strategy: single
  deps:    [{ bot: contacts }]

Support Bot:
  records: [contact, account, ticket, conversation]
  actions: [ticket.create, ticket.assign, channel.reply, ticket.resolve, ticket.escalate]
  flows:   [support-resolve, escalation]
  space:   owner: [open tickets, sla]
           support: [my tickets, lookup]
  inbox:   [reply to customer · support, escalate · owner]
  roles:   [support]
  strategy: verify
  deps:    [{ bot: contacts }]
~~~

Their Flow templates expand like `sell`:

~~~text
lead-capture     validate -> match/create contact/account -> lead -> route task
qualify          review facts -> qualified deal / nurture / disqualify
deal-progress    discovery -> proposal draft -> approval -> send -> won / lost
follow-up        wait -> model draft -> sales approval -> send -> wait reply -> task
support-resolve  conversation -> ticket + response task -> reply -> resolve
escalation       priority -> owner task -> decision
~~~

Both reuse `contacts` instead of duplicating it, and a Bot's `strategy` matches its risk: POS and Sales run `single`; Support runs `verify` because a customer reply is consequential. The end-to-end SaaS team using Sales + Onboarding + Support is in Part C.

**Lifecycle.** `author -> review -> publish (immutable revision) -> install (resolve deps, pin versions, preview) -> configure -> upgrade (preview; keep customizations) -> remove (archive, keep work)`.

| Stage | Who | Rule |
|---|---|---|
| Author | TAR or a reviewed pack | declares records, Actions, Flows, cards, roles |
| Review | catalogue owner | executable code and new invariants are reviewed and tested |
| Publish | catalogue | revision is immutable; later changes are a new version |
| Install | owner/admin | resolve deps, pin revisions, preview every change |
| Configure | user/assistant | select Flows and triggers, map roles, connect channels |
| Upgrade | owner/admin | preview; preserve customizations unless adopted |
| Remove | owner/admin | archive definitions and triggers; preserve Records, Runs and history |

**Five ways capability arrives**

| Kind | What it is | Adds code? | Example |
|---|---|---|---|
| Core | always present | built in | contacts, tasks, files, search, assistant, Inbox |
| Marketplace Bot | reviewed pack + starter config | sometimes, via a pack | POS, Sales, Support, Inventory, Site, Team |
| Template | a curated set of compatible Bots | no | Pizza Store = POS + Inventory + Kitchen |
| Custom Bot | user composes existing records/Actions into new Flows | no | "Expense review" from Team + Money tools |
| Pack | reviewed code adding a new Action or invariant | yes | a payment provider adapter, a tax rule |

A Custom Bot never writes code; a Pack is the only route to new executable capability, and it always goes through review.

**How a Bot gives features.** Installing changes all three surfaces at once, through the Gateway, with no separate setup screens.

~~~text
Marketplace -> Add Sales Bot -> preview -> Add to Space
  records:  reuse Contacts, add lead/deal
  actions:  enable lead.capture, deal.progress
  flows:    install lead.capture, deal.progress + first cards
  Space:    add Pipeline (metric), New lead (entry), Deals (view)
  Inbox:    qualification and follow-up tasks already flow here
~~~

| Surface | What the Bot adds |
|---|---|
| Space | role-appropriate cards: metrics, record views, entry points |
| Inbox | human work templates become tasks when a Run reaches them |
| Bots | installed state, its Flows, guidance and custom-Flow builder |

Adding Support later reuses the same Contacts and adds ticket handling; it never creates a second customer database. Bots share the core Records instead of duplicating them, `deps` are checked before activation, and removal cannot delete shared Contacts, break another Bot's dependency or erase active Runs and history.

**Creating a Bot — from prompt to pack**

~~~text
describe the business
  -> harness identifies Records and relationships
  -> harness discovers registered Actions
  -> harness drafts Flows, Space cards and role defaults
  -> harness flags access, approvals and high-risk effects
  -> user reviews a compact preview
  -> Gateway publishes the Bot
~~~

| Request | Result |
|---|---|
| "Track restaurant orders and stock" | installs POS + Inventory, adds sales/low-stock cards, kitchen role |
| "Follow up with leads and send proposals" | installs Sales, adds pipeline card, sales approval step |
| "Review expenses above ₹10,000" | Custom Bot over Team + Money tools, manager approval step |
| "Connect Razorpay payments" | requires a Pack: no user content becomes executable code |

AI can enrich, extract, draft and review. Only a human approval plus deterministic Gateway Actions may create membership, grant access or publish executable capability.

**Guardrails.** User prompts and imported content are never executable code; only reviewed Packs add Actions; the Gateway governs every effect whatever Bot requested it; cards, Flows and triggers bind to registered IDs, never arbitrary SQL or JavaScript; removal is archival by default and destructive deletion is a separate reviewed Action.

## 6. SPACE — THE ROLE-BASED SCREEN

Space answers one question: given my role and the installed Bots, what can I see and do here?

~~~text
Space(role) = core cards + installed-Bot cards, filtered by role and grant, ordered by use
eligible = owner/admin OR role match
visible  = eligible + the member's default/pinned selection
data     = query policy + row scope + permitted fields
~~~

| Card kind | Binds to | Opens |
|---|---|---|
| **metric** | a registered query + parameters | the result and its permitted source Records |
| **view** | a registered view (list / board / calendar) over a Record type | the filtered records |
| **entry** | exactly one Action, Flow or query | a form, a new Run, or an existing view |

| Rule | Meaning |
|---|---|
| One resolver | Role decides eligibility; the member pins/reorders within it |
| No new execution | opening a query card never starts a Run |
| Reviewed queries | queries own joins, filters, aggregation and indexes; cards store typed parameters |
| In-place edit | owners add, remove and reorder cards directly |
| Operational landing | staff roles such as kitchen or support may land in their Inbox instead |
| One workspace | one shared Space definition; personal pinning is a preference, not a fork |

## 7. INBOX — ALL HUMAN WORK

Inbox is the single queue for everything that needs a person: every human step becomes an Inbox task, whatever produced it.

~~~text
task = title + assignee + state + due
     + data { record?, roles[], action, run?, step?, kind }
~~~

| Becomes an Inbox task when | Source |
|---|---|
| a Run reaches a human step | Flow |
| the harness cannot proceed without a decision or missing fact | model handoff |
| an Action requires approval before its effect | approval |
| work failed and a person can act | failure recovery |
| a conversation needs a reply | unanswered message |
| code detected a condition a person must judge | review / exception |

| Concern | One rule |
|---|---|
| Storage | Inbox queries existing `type='task'` records; no separate queue |
| Filters | Mine = assigned to me; Unassigned = eligible/unclaimed; Team = permitted team work; Approvals |
| Claim | atomically assign eligible unclaimed work; one winner |
| Complete | the required domain Action commits the outcome; dismissing is not completion |
| Ownership | the task owns assignment; the case owns its lifecycle; the conversation owns its messages |
| Dedupe | one task per human responsibility, not one per message |
| Notifications | point to existing work; routine events and retries stay in history |

~~~text
Flow -> automatic steps -> human needed -> task -> Inbox
                                             -> authorized Action
                                             -> commit + resume the same Run
~~~

Conversation handlers derive from open tasks; a reply resolves only the messages it covers, so a later message stays actionable. Case closure reconciles remaining tasks. Standalone tasks need no Run. Failures create a task only when someone can act.

## 8. FLOWS — ORDERED WORK

~~~text
Flow = revision + trigger + audience + mode + input + steps
step = id + Action/input bindings + next / condition / wait
Run  = pinned Flow + cursor + outputs + principal/grant + budget + checkpoints

ready -> running -> done
           +-> waiting -> running
           +-> failed / cancelled
~~~

A Flow template is authored inside its Bot, then materialised on install:

~~~text
flows:                         # in the Bot definition
  - id: sell
    title: New sale
    description: Start an order; continue from Inbox; checkout
    records: [Order, Payment]
    steps: [pos.order.save, "human: confirm in Inbox", pos.checkout]
        |
        v
definitions                    # workspace DB, kind='flow', state='published'
        |
        v
run                            # records row, type='run', when started
~~~

The title is the label; steps bind only to registered Actions. A human step creates an Inbox task and the Run waits. A Custom Flow is authored through `flow.publish` into the same `definitions` table.

| User experience | Engine behavior |
|---|---|
| Simple editor | Who, When, Conditions, Message + readable steps |
| Advanced editor | registered Actions, bindings, branches and waits |
| Human step | title + person/eligible roles + source + required Action + optional due time |
| AI draft | same Flow definition, validator and publishing path |

~~~text
draft -> configure -> validate -> simulate -> publish -> run
                           |                   |
              schemas, references, grants   immutable revision
~~~

- Linear steps are the default; branches and loops require bounded termination.
- Bindings are typed references, never arbitrary code.
- Simulation uses test data and preview deliveries, with no real external effect.
- New publications affect new Runs; active Runs keep their pinned Flow and Action versions.
- A human step creates or reuses its Inbox task and waits for committed completion.

The Harness is the runner: Cloudflare Workflows is the target prototype for sleep/retry/wakeup, TAR owns business progress and pinned inputs/outputs, the Gateway commits transitions and a delivery worker sends committed intents. Resume completes the step, business transition and resume intent atomically; wakeups may repeat, so read saved state before advancing; cancellation stops future steps and reconciles in-flight effects. Checkpoints are not a second business database.

| Audience | Entry and authority |
|---|---|
| `team` | member -> role/grant checks -> permitted Actions |
| `customer` | public form/channel -> validation, consent, rate limits -> restricted grant |
| `both` | limited customer entry -> explicitly authorized team handoff |

## 9. CHANNELS

| Family | Direction | Adapters | What arrives | What the team sends |
|---|---|---|---|---|
| Team | in + out | Slack · Discord · Google Chat · Telegram | staff requests and replies | reply, send |
| Customer | in + out | website chat · email · supported messaging | conversations and requests | reply, send |
| Social | out (in where supported) | Zernio where supported | comments and mentions | publish, one intent per destination |

~~~text
channel      = { family, provider, account, direction, capabilities[], credential }
conversation = { channel, reference, contacts[] }
message      = { channel, conversation, contact, direction, body?, content?, attachments[] }

verify webhook -> dedupe(provider + account + event)
  -> resolve/create Conversation + save Message + trigger intent
  -> acknowledge -> harness executes
~~~

Conversation is a lightweight Record, unique by channel + the adapter's stable thread reference; messages store its internal ID and task sources point to the same Record. Handlers derive from tasks, and related threads may link to the same contact without merging automatically.

- Adapters advertise verified capabilities and limits; listed providers are intended coverage, not guaranteed parity.
- Family belongs to the connection. Contacts use verified handles; never merge guessed identities.
- `channel.reply` answers a conversation; `channel.send` contacts an allowed recipient; `channel.publish` creates one intent per destination.
- Check recipient, content, attachments and capability before delivery; save required input before acknowledgement and enforce payload limits.
- Human attention appears through Inbox tasks (§7); short bodies stay inline, large content follows §3.

## 10. MEMBERS + ACCESS

~~~text
Google sign-in -> Personal Space (free, device-local)
              -> Work Space -> members + shared Records
~~~

| Access | Rule |
|---|---|
| Workspace | isolated database + membership + timezone, currency and business-day settings |
| Base roles | `owner`, `admin`, `member`, `guest` |
| Work roles | labels such as kitchen, sales, support; a member holds `roles[]` |
| Scope | own = ownership; team = explicitly permitted roles; all = permitted workspace data |
| Assignment | permits defined task access, not unrestricted source-record access |
| Fields | the Gateway projects allowed fields for app, query and model |
| Delegation | bounded by the delegator and workspace policy |
| Revocation | subsequent access denied; in-flight effects reconciled; device cache rules in §11 |

Contacts use roles such as customer, vendor, partner and lead. A contact role never grants access: membership and access rules do.

## 11. LOCAL-FIRST + SYNC

One repository, one sync path, one command queue.

~~~text
UI -> local SQLite -> render known data immediately
       |
       +-> confirmed cache <--- authorized sync <--- Gateway
       +-> draft + command ---> Gateway Action ---> confirmed result

cloud  = business truth + rules + harness execution
device = permitted working set + drafts + pending commands
~~~

| Local first | Online authority |
|---|---|
| Space cards, forms, Inbox summaries | current definitions, permissions and queue membership |
| assigned/recent/pinned Records + local search | uncached detail, broad search, complete reports |
| drafts, notes, preferences | accepted business mutations |
| cached metrics + freshness | authoritative totals over complete data |
| thumbnails and downloaded files | authorized R2 access |
| AI input capture and drafts | cloud inference and its resulting Actions |

- One repository serves all screens; sync is scoped by account + workspace. Drafts and commands live in a mutable device database separate from replaceable cache, so a cache reset never erases pending work.
- Default download = Space + active Inbox + linked summaries + recent/pinned Records; bound rows and bytes. Missing data shows a setup or online-required state; an empty cache is not an empty business.

**Sync**

~~~text
open / foreground / reconnect / invalidation
  -> authorize -> snapshot OR scoped delta
  -> { revision, cursor, records, removed, more }
  -> local transaction: rows + removals + cursor
  -> notify affected views
~~~

A snapshot gives a consistent watermark; a compact indexed change log, committed with business writes in visibility order, gives ordered deltas. Cursors bind workspace, principal, permission/schema revisions and parameters. Recheck access on projection; reset affected scope on expiry or access change; keep one in-flight sync per dataset and coalesce; a persisted cursor survives missed notifications. Turso native partial sync is an optional measurement, not a design branch.

**Commands + conflicts**

~~~text
command = { key, action, version, input, base, state, created, expires }

edit -> persist draft/command -> Pending preview
  -> send when allowed -> Gateway revalidates -> confirmed / Needs attention
~~~

| Policy | Behavior |
|---|---|
| `draft` | prepare locally; submit online explicitly |
| `queue` | durable intent; retry and show Pending until accepted |
| `online` | live confirmation; the default for money, stock, assignment, approvals |

Persist key + Action version + exact payload before the first attempt, and retry an unknown outcome with the same key. A changed intent gets a new key. Serialize dependent commands; a failed prerequisite pauses dependents. Never let an older sync overwrite a newer confirmed version. On conflict, preserve the draft, show server facts and merge only independent fields through a newly validated Action. On revocation or logout, purge unauthorized cache, files and search derivatives; handle unsent private drafts explicitly.

## 12. DELIVERY + COST + PROOF

| Build now | Defer until it earns its cost |
|---|---|
| Harness + shared Action contracts + Gateway | new infrastructure or service boundaries |
| Three surfaces: Inbox, Space, Bots | per-Bot persistent processes |
| Local repository + scoped deltas + durable commands | Turso native partial projections and device AI |
| Deterministic logic + one bounded model step | multiple parallel loop strategies |
| DB facts + R2 attachments | compressed history archival |
| Indexed queries + bounded views | daily summary caches |

| Phase | Deliver | Verify |
|---|---|---|
| 1 | Harness loop, Gateway, one record table, Inbox + Space + Bots | a Flow with a human step completes and resumes |
| 2 | local cache/command repository | warm Space/Inbox offline; restart preserves drafts and keys |
| 3 | Bot catalogue + custom Bots + templates + AI configuration | a third business without rewriting the core |
| 4 | selected optional upgrades | measurable benefit on supported devices and workloads |

Evolve `tarharness` and reuse `tarapp`; preserve Action IDs, Gateway authority, replay and Run ownership behind versioned adapters. The harness already has the Gateway, record table, D1 control plane and bot directory — the unified harness loop and the local repository are the main new work.

**Cost**

~~~text
Monthly TAR                   = 100 credits per active owned Work Space
Usage                         = declared chargeable Action executions
Manual reads / ordinary edits = 0 usage credits
Provider charges              = disclosed separately
~~~

Show charges before consequential work; retries of the same operation do not duplicate user charges; budget exhaustion never blocks already accepted manual work. The harness controls cost: dedupe triggers, route by task, cap context, batch imports, cache by content hash, and never call a model per render, keystroke, sync event or routine retry. [techstack.md](techstack.md) holds the per-user envelope.

**Acceptance**

| Scenario | Must hold |
|---|---|
| Duplicate webhook, double tap, reconnect retry | one committed effect and saved result |
| Bot upgrade with offline commands | pinned version executes or needs review; completed commands replay without re-execution |
| Repeated thread intake | one conversation per channel/reference; messages and response tasks share the source |
| Concurrent stock, booking or claim | invariants hold; conflict is visible |
| Crash, missed signal, cancelled Run | saved progress recovers; only intended future work proceeds |
| Provider timeout / receipt failure | reconcile; no duplicate payment or business rollback |
| Revoked role / stale approval / injected input | no wider access, tools or authority |
| Missing facts / AI budget or service failure | preserve progress; ask, stop or hand off |
| Offline launch / missing pages | downloaded screens work; gaps and totals are not misrepresented |
| Snapshot, cursor expiry, reassignment | no missed changes; removals work; drafts survive rebuild |
| Account switch / field revocation | no cache leakage; unauthorized fields and files are removed |
| Generated schema / Flow / card | valid capabilities and bounded execution |
| Harness step bounds | a Run cannot exceed its actions, steps, budget or deadline |

Track completed jobs, human corrections, cost per job, p95 query and Action latency, sync delay and bytes, conflicts and disk/battery use.

============================================================
# PART B — A PIZZA STORE, END TO END
============================================================

~~~text
Slice House = one Work Space
Muthu = owner | Malar = admin/cashier/stock
Iniya = cashier | Velan = kitchen

Pizza Store template = POS + Inventory + Kitchen Bots
  -> products + opening movements + one Space + seven cards
  -> connect customer, team and social channels
~~~

Bots the template installs — all reuse `contacts`; deterministic work stays `single`:

~~~yaml
POS Bot:
  records: [product, order, payment, register, movement, customer]
  actions: [pos.open, pos.order.save, pos.checkout, pos.refund, pos.register.open, pos.register.close]
  flows:   [order-take, orders-returns, shift-close]
  space:   owner: [sales-today, new-sale, payments-today]
           cashier: [new-sale, close-shift]
  inbox:   [approve refund · owner/admin]
  roles:   [cashier]   strategy: single

Inventory Bot:
  records: [product, movement]
  actions: [pos.product.save, pos.stock.adjust]
  flows:   [stock-receive, stock-count]
  space:   owner: [low-stock]
           stock: [low-stock]
  inbox:   [reorder · stock, count variance · owner]
  roles:   [stock]   strategy: single

Kitchen Bot:
  records: [order, task]
  actions: [kitchen.start, kitchen.ready]
  flows:   [kitchen-prepare]
  space:   kitchen: [kitchen-queue]
  inbox:   [prepare order · kitchen]
  roles:   [kitchen]   strategy: single
~~~

| Space card | Kind | Target | Roles |
|---|---|---|---|
| Sales today | metric | `sales.today` | owner/admin |
| New sale | entry | `pos.open` | owner/admin/cashier |
| Kitchen queue | view | open kitchen tasks | kitchen |
| Low stock | metric | `stock.low` | owner/admin/stock |
| Close shift | entry | `shift-close` Flow | owner/admin/cashier |
| Post special | entry | `channel.publish` | owner/admin |
| Today's payments | metric | `payments.today` | owner/admin |

| Person | Space defaults | Inbox |
|---|---|---|
| Muthu | Sales today, Low stock, Payments today | approvals, reorder |
| Malar | Sales today, New sale, Low stock | reorder, shift review |
| Iniya | New sale, Close shift | handover, shift work |
| Velan | Kitchen queue | preparation tasks; default landing |

Flow templates expand like §5:

~~~text
order-take       interpret -> quote -> customer confirms -> order.place
                 -> wait kitchen/payment -> cashier handover -> order.fulfill -> receipt
kitchen-prepare  existing task -> claim/start -> ready -> task done
stock-receive    delivery -> movements -> stock cache -> low-stock check
stock-count      physical count -> explained adjustment movement
shift-close      count -> compare -> approval if needed -> close
orders-returns   find order -> refund or exchange

Accept  -> validate availability + reserve + order + kitchen task   (one commit)
Prepare -> kitchen ready commits task outcome + resume intent
Fulfil  -> consume reservation + movements + stock + completed order + receipt intent
Cancel  -> release unconsumed reservation; prepared waste is an explicit movement
~~~

Available = stock - reserved. Reject insufficient acceptance atomically. Payment alone never consumes stock. A duplicate tap returns the saved result; a payment timeout reconciles with the provider; a receipt failure retries delivery only. Velan receives items and quantities, not prices or phone numbers.

============================================================
# PART C — A SAAS SALES + CRM TEAM, END TO END
============================================================

~~~text
Orbit = one Work Space
Thenmozhi = owner | Marudhan = sales
Kayalvizhi = success | Vetrivel = support

SaaS CRM template = Sales + Onboarding + Support Bots
  -> assign team -> connect website/email + team chat
~~~

Bots the template installs — Sales and Onboarding stay `single`; Support runs `verify` because a reply is consequential:

~~~yaml
Sales Bot:
  records: [contact, account, lead, deal]
  actions: [lead.capture, lead.qualify, deal.progress, quote.create, quote.send]
  flows:   [lead-capture, qualify, deal-progress, follow-up]
  space:   owner: [revenue, pipeline, renewals]
           sales: [leads, deals, new-lead]
  inbox:   [qualify lead · sales, review proposal · owner]
  roles:   [sales]   strategy: single

Onboarding Bot:
  records: [account, subscription, task]
  actions: [subscription.create, customer.onboard]
  flows:   [customer-onboard, renewal-manage]
  space:   owner: [renewals]
           success: [customers, onboarding]
  inbox:   [kickoff · success, renewal review · success]
  roles:   [success]   strategy: single

Support Bot:
  records: [contact, account, ticket, conversation]
  actions: [ticket.create, ticket.assign, channel.reply, ticket.resolve, ticket.escalate]
  flows:   [support-resolve, escalation]
  space:   owner: [open tickets, sla]
           support: [my tickets, lookup]
  inbox:   [reply to customer · support, escalate · owner]
  roles:   [support]   strategy: verify
~~~

| Type | Key facts |
|---|---|
| `account` | name, domain; owner |
| `contact` | name, email, consent; organizations through references or links |
| `lead` | contact, source, score, stage, next; owner |
| `deal` | account, contacts, value, currency, stage, close; owner |
| `ticket` | account, contact, priority, category; owner/state |
| `subscription` | account, plan, seats, start, renewal; state |

Flow templates expand like §5:

~~~text
lead-capture     validate -> match/create contact/account -> lead -> route task
qualify          review facts -> qualified deal / nurture / disqualify
deal-progress    discovery -> proposal draft -> approval -> send -> won / lost
follow-up        wait -> model draft -> sales approval -> send -> wait reply -> task
customer-onboard won -> subscription + setup -> owner -> kickoff -> success tasks
renewal-manage   schedule -> usage/risk review -> quote -> renew / expand / churn
support-resolve  conversation -> ticket + response task -> reply -> resolve
escalation       priority -> owner task -> decision
~~~

| Person | Space defaults | Inbox |
|---|---|---|
| Thenmozhi | revenue, pipeline, renewals | approvals, escalations |
| Marudhan | leads, deals, New deal | qualification, followups, proposal review |
| Kayalvizhi | customers, onboarding, renewals | setup, kickoff, renewal reviews |
| Vetrivel | tickets, customer lookup | unassigned tickets, assigned replies |

~~~text
Poongodi submits a demo request
  -> Gateway validates public input and dedupes
  -> harness extracts and creates/routes the lead to Marudhan
  -> qualification task -> qualified deal
  -> model drafts a proposal -> Marudhan approves -> permitted channel send
  -> signed/won -> onboarding + Kayalvizhi's tasks
~~~

Lead and deal stages belong to the deal, support state belongs to the ticket, and plan and renewal belong to the subscription. Contact and account screens show permitted related work without copying those process fields onto the person or organization. Changing a draft invalidates an approval bound to the previous input.

A Custom Bot over existing tools, no code:

~~~text
Expense review (Custom Bot in the Team family)
  audience = team
  trigger  = form
  steps    = capture expense
           -> wait manager task (amount > 10000)
           -> approve
           -> finance Action
~~~

No background loop without a limit. Draft, review, send and reply reuse the same Records, Actions, Inbox and harness as everything else.

============================================================
# DESIGN REFERENCES
============================================================

| Topic | Sources |
|---|---|
| Agents and context | [Effective agents](https://www.anthropic.com/engineering/building-effective-agents), [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [tool discovery](https://www.anthropic.com/engineering/advanced-tool-use) |
| Durable execution | [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/) |
| Storage | [SQLite partial indexes](https://sqlite.org/partialindex.html), [Turso pricing](https://turso.tech/pricing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Sync | [Turso sync](https://docs.turso.tech/sync/usage), [partial sync](https://docs.turso.tech/sync/partial), [conflicts](https://docs.turso.tech/sync/conflict-resolution) |
| Evaluation | [Multi-agent research](https://www.anthropic.com/engineering/multi-agent-research-system), [agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |

Sources inform the design. TAR policies are architectural decisions; the document does not claim all capabilities are implemented.

> **Intents start work. The Harness executes work. Actions perform effects. Bots package capability. The Gateway commits truth. Inbox holds human work. Space shows the role what matters.**
