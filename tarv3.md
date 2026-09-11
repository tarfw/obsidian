# TAR v3 — Architecture

> Records hold truth. Actions do work. Flows order work. Blocks show work. Channels carry it. Gateway commits.

============================================================
# PART A — THE SYSTEM
============================================================

~~~text
USER                 ENGINE                       STORAGE
Space                Record = stored fact         D1 = identity + access
  Home = Blocks      Action = capability          Turso = business facts
  Inbox = tasks      Flow = ordered steps         R2 = large content
  Orders, Customers  Gateway = authority          Device = cache + drafts
  Flows              Agent = bounded executor     Runtime = checkpoints
~~~

Use business labels such as Orders and Customers in the app. Record is the internal term; artifact means a generated document, image or other output. Execution details appear when needed for investigation.

~~~text
1 Core + business types   4 Flows + customization   7 Templates + access
2 Records + storage      5 Home + Inbox            8 Local first + sync
3 Actions + AI           6 Channels                9 Delivery + proof
~~~

Target = easy daily use + low cost + reliable completion. This is the target architecture; implementation gaps and rollout are in §9.

============================================================
## 1. ONE CORE FOR EVERY BUSINESS
============================================================

~~~text
App / channel / schedule
  -> Action or Flow -> code / agent / human
  -> Gateway -> business Records + saved result + committed intents
  -> next step / human task / provider delivery / done
~~~

- All business writes and external effects use the same authorized path.
- One logical writer means one commit contract, not a global lock.
- Canvas, Blocks, tasks, messages and runtime history reuse Records.
- A template configures the core; it does not create a separate application.

| Business | Typical Records | Typical Flow |
|---|---|---|
| Retail / food | product, order, payment | sell -> prepare -> deliver |
| SaaS / sales | account, lead, deal, subscription | qualify -> sell -> onboard -> renew |
| Services | client, project, task | request -> quote -> deliver -> invoice |
| Appointments / rentals | resource, booking, contact | reserve -> attend / return |
| Education / membership | course, enrolment, subscription | join -> participate -> renew |
| Field work / production | job, asset, material | assign -> execute -> inspect |
| Internal operations | request, employee, expense | submit -> review -> fulfil |

| Extension | Configuration or implementation? |
|---|---|
| Labels, fields, forms, ordinary states | user/AI drafts a versioned schema |
| Home, routing, timing, Flows | compose existing registered capabilities |
| Lists, boards, calendars, reports | registered views + typed settings over the same Records |
| New business invariant, provider or computation | reviewed pack/adapter code + registered Action/query + tests |

Start blank, describe the business, or combine compatible templates. Reuse contact/product/task types; check dependencies and schema versions before installation. Custom definitions are workspace-scoped. Inventory, booking capacity, payroll and accounting require their domain rules; generic fields alone do not implement them.

============================================================
## 2. RECORDS + STORAGE
============================================================

| Store | Holds | Authority |
|---|---|---|
| Control / D1 | identity, membership, grants, workspace routing | access; rows carry `workspace` |
| Workspace / Turso | transactions, searchable facts, relations, pending work | one isolated business database per workspace |
| Objects / R2 | media, documents, large outputs, optional history archives | immutable content referenced by DB |
| Device / local Turso | permitted cache, drafts, commands, preferences | local experience; server confirms business effects |
| Durable runtime | execution checkpoints, sleeps, retries | scheduling; business state stays in Turso |

The workspace connection determines its tenant; its business rows need no `workspace`. Existing tables may remain behind adapters during migration. Start with one `records` table; add physical structures only for a demonstrated query, sync or retention need.

### 2.1. SCHEMA + NAMING

~~~text
records
  id        text primary key
  type      text
  title     text
  state     text
  data      json
  owner     text null
  assignee  text null
  due       integer null
  version   integer
  created   integer
  updated   integer
  archived  integer null
~~~

| Rule | Meaning |
|---|---|
| Names | every TAR column and JSON key = one semantic lowercase ASCII word |
| Examples | `owner`, `created`, `price`, `contact`; no underscores, hyphens or joined suffixes |
| Notation | `data.contact` is a path; `roles[]` means an array; neither punctuation belongs to the key |
| Units | money = integer minor units + currency; rates = basis points; time = UTC milliseconds |
| Identity | `contact` stores a contact ID; `owner` is business ownership; `assignee` is human task assignment |
| Extension | small type-specific facts go in `data`; hot common filters remain columns |
| Validation | type schema defines fields, transitions, references and writable scope |
| Concurrency | expected version checked inside transaction; require the intended affected rows |
| Removal | archive business Records; protected definitions/audit follow their own retention rules |

Action IDs such as `order.place` are namespaced identifiers, not column names. Display labels may be normal language. All example people use pure Tamil names.

| System type | Purpose |
|---|---|
| `schema`, `flow` | versioned definitions; published revisions immutable |
| `run` | pinned definition, business cursor, required outputs, execution identity |
| `operation` | stable key, input hash, saved outcome |
| `delivery` | external intent, destination, retry/reconciliation state |
| `event` | immutable audit facts |
| `canvas`, `block` | Home layout and its units |
| `channel`, `message` | connection and conversation items |
| `link` | additional relation: `{ from, to, relation }` |
| `bot` | existing internal installation metadata; UI calls it a business template |
| `archive` | verified batch manifest; only when archival is introduced |

Use direct references for ordinary relations; do not also create a Link for every reference. Generic CRUD cannot alter protected history or bypass domain rules. Occurrence, operation and delivery keys must be non-null and uniquely constrained.

Reviewed indexes cover type/state, task assignment, pending delivery due time and domain uniqueness. Packs own indexes/migrations; creating a Block never runs DDL.

### 2.2. DB FACTS + R2 CONTENT

| Keep in DB | Put in R2 |
|---|---|
| Prices, units, stock, reservations, order lines, payment facts | images, video, receipts, attachments |
| Assignment, status, short messages, searchable metadata | long documents, large message bodies |
| Flow definitions, required Run outputs, replay keys, compact audit | large traces/tool results; old history batches when justified |

~~~text
product.data.image = { object, hash, bytes, mime }

List products -> local/DB facts
Open image    -> authorize reference -> R2 content
Change stock  -> DB transaction
~~~

Small text/JSON stays inline. Review large payloads around 32 KB; this is not an automatic cutoff. Transaction-critical facts stay in DB, with related rows if needed. Keep searchable excerpts/metadata when content moves to R2. Credentials remain in secret storage.

~~~text
authorize upload -> reserve ownership -> immutable upload -> verify hash/size/type
                 -> Gateway commits reference -> visible

failed commit -> unattached object -> grace period + reference check -> cleanup
replacement   -> new object + new reference; retain old content while needed
~~~

DB and R2 have no shared transaction. Cleanup must not race attachment; uncertain commits are checked before deletion. Private reads require authorization; public media requires explicit publication. Prefixes organize objects, not permissions.

A missing receipt PDF never rolls back a sale: a committed job generates, verifies and attaches it later.

### 2.3. OPTIONAL ARCHIVAL

~~~text
terminal immutable history at stable cutoff
  -> compressed batch -> verify hash + count + schema
  -> commit manifest + lookup references -> prune eligible payloads
~~~

Keep active work, replay evidence and operational reconciliation facts in DB. Retain keys for the promised replay window; expired keys are rejected or checked against history, never treated as new. Keep referenced objects for active Runs, recovery and retention holds. Archives preserve original evidence; they are not backups. Test DB restoration together with object retention.

============================================================
## 3. ACTIONS + AI + GATEWAY
============================================================

~~~text
Action = id + version + kind + input + output
       + roles + scope + effect + approval
       + retry + timeout + cost + offline?

kind    = app | agent | human
effect  = read | internal | external
offline = draft | queue | online       -- legacy default = online

execute(action, input, key)
~~~

| Executor | Role |
|---|---|
| Code / adapter | calculations, validation, transactions, integrations |
| Agent | interpret ambiguity, propose permitted tool calls, observe results |
| Human | judgement, missing facts, required approval through Inbox |

Schemas drive tools and default forms; custom interfaces call the same Action. Generic CRUD is limited to approved fields/types. Trusted handlers own SQL and credentials.

~~~text
record.get / search / create / update / archive / link
task.create / complete        approval.request
flow.start / publish          bot.install / remove
channel.reply / send / publish
agent.extract / draft / summarize / resolve
~~~

These are catalog families; business packs add meaningful Actions such as `order.place`. Existing IDs remain supported through versioned adapters.

### 3.1. COMMIT + REPLAY

~~~text
authenticate -> authorize -> validate -> check versions -> commit
                                                 |
                       one workspace transaction:
                       business changes + Run transition
                       + operation result + audit + intents
~~~

| Boundary | Rule |
|---|---|
| Replay | workspace + key + actor/Action identity + canonical input hash; same request returns saved result after access check |
| Conflict | same key with different input fails; unique key and checked writes prevent duplicate business effects |
| Approval | bind Action version, input hash, affected versions and expiry; recheck authority at execution |
| Reads | project permitted rows/fields; Block visibility and device filtering are not access control |
| Retry | bounded transient retries; stale input requires a new decision |
| External effect | committed delivery intent; stable provider key where supported; reconcile uncertain outcomes |
| Separate stores | D1, Turso, R2 and providers have no common transaction; bridge with durable intent and saved results |

~~~text
delivery: pending -> sending -> confirmed
                       +-> retry -> sending
                       +-> unknown -> reconcile -> confirmed / failed
~~~

A timeout does not prove failure; never promise universal exactly-once external delivery. Control changes such as access grants save an idempotent result in D1, then reconcile workspace progress. Automatic callbacks run under restricted service grants.

### 3.2. ONE CONTEXTUAL ASSISTANT

~~~text
deterministic work -> code / saved template
interpretation     -> one structured model call
uncertain sequence -> bounded agent + relevant tools
human judgement    -> Inbox task
~~~

| Use | AI helps | Trusted boundary |
|---|---|---|
| Setup / customization | draft template, schema, Flow and Home | reuse registered capabilities; preview + validate |
| Import / entry | map columns; extract text, image or voice into forms | validate units/types; review ambiguous identity matches |
| Search / analysis | retrieve and explain with sources/freshness | queries calculate totals; disclose incomplete data |
| Inbox / content | summarize, draft reply/proposal/media, suggest next Action | Action policy governs sends and approvals; artifacts use R2 |
| Exceptions / improvement | investigate and propose recovery or better rules | code detects known conditions; review changes to live processes |

| Control | Default |
|---|---|
| Automation | Flow mode `manual`, `assist` or `auto`; policy still governs every Action |
| Bounds | `allowed`, `grant`, `steps`, `deadline`, `budget`, observable `completion` |
| Skills | pinned guidance inside agent Actions; no extra executor or permissions |
| Context | relevant Records + source/version + compact outputs; messages/tool output are data, not authority |
| Models | cheapest evaluated model that meets quality; stronger model for measured failure |
| Reuse | cache by content hash, model/instruction revision and access scope; revalidate before effects |
| Cost | dedupe triggers, batch suitable imports; no model per render, keystroke, sync event or routine retry |
| UI | generate trusted Block/form/view configuration once; render locally |
| Learning | record corrections with provenance; propose changes, never silently rewrite policy |
| Failure | save progress; bounded retry or human handoff; ordinary manual work remains available |

One assistant serves the current Space and screen. Confidence does not grant authority; AI cannot widen grants or install executable code. Missing facts are requested; exhausted limits end in visible wait/failure. Device AI, multiple agents and isolated code/browser tools are optional upgrades (§9).

============================================================
## 4. FLOWS + USER CUSTOMIZATION
============================================================

~~~text
Flow = revision + trigger + audience + mode + input + steps
step = id + Action/input bindings + next / condition / wait
Run  = pinned definition + cursor + outputs + principal/grant + budget + runtime

ready -> running -> done
           +-> waiting -> running
           +-> failed / cancelled
~~~

Linear steps are the default; branches and loops require bounded termination. Bindings are typed references, not arbitrary code.

| User experience | Engine behavior |
|---|---|
| Simple editor | Who, When, Conditions, Message + readable steps |
| Advanced editor | registered Actions, bindings, branches and waits |
| Human step | title + person/eligible roles + source + required Action + optional due time |
| Both editors / AI drafts | same Flow definition, validator and publishing path |

~~~text
draft -> configure -> validate -> simulate -> publish -> run
                           |                   |
              schemas, references, grants   immutable revision
~~~

- Simulation uses test data and preview deliveries; it performs no real external effect.
- Public or sensitive publication requires the appropriate owner/admin authority.
- New publications affect new Runs; active Runs retain their definition and Action versions.
- A human step creates/reuses its task and waits for committed completion; no extra Inbox integration.
- Automatic steps need no Home Block. Publishing may optionally add a Block.

| Audience | Entry and authority |
|---|---|
| `team` | member -> role/grant checks -> permitted Actions |
| `customer` | public form/channel -> validation, consent, rate limits -> restricted service grant |
| `both` | limited customer entry -> explicitly authorized team handoff |

User Flows compose existing capabilities. New trusted code, providers or domain invariants require a reviewed implementation (§1).

### 4.1. ONE DURABLE RUNNER

~~~text
Cloudflare Workflows = target prototype for sleep / retry / wakeup
TAR Run              = business progress + pinned inputs/outputs
Gateway              = commits business transitions
Delivery worker      = sends committed intents
~~~

| Requirement | Rule |
|---|---|
| Resume | complete task + business transition + resume intent atomically |
| Dedupe | stable key per trigger and step occurrence/tool call |
| Recovery | replay saved results; reconcile missed starts/signals; an uncommitted model call may repeat |
| Concurrency | checked Run cursor; lease/fencing where work is claimed |
| Cancellation | stop future steps; reconcile in-flight effects; compensation is a new Action |
| Template removal | stop its new triggers; preserve active Runs and history |

Wakeups may repeat: read saved state before advancing. Runtime checkpoints are not a second business database. Operate one Run scheduler.

============================================================
## 5. HOME + INBOX
============================================================

~~~text
Space
  Home  = Canvas of Blocks: overview + start work + open views
  Inbox = existing tasks: handle work needing attention
  Detail = source Record + context + available Actions
~~~

### 5.1. BLOCKS

| Internal kind | Target | Opens |
|---|---|---|
| `metric` | registered query + parameters | result and permitted source Records |
| `entry` | exactly one Action, Flow or query | form, new Run, or existing view/Inbox |

~~~text
Block = { kind, title, target, roles[] }
Query = id + input + output + access + implementation

eligible = owner/admin OR role match
visible  = eligible + selected role default/member preference
data     = query policy + row scope + permitted fields
~~~

One shared Canvas; member preferences store ordered Block references. Owners can choose all eligible Blocks but start with a few relevant ones. Edit Home in place: add, remove, reorder. Operational staff may land directly in their Inbox view.

Queries own joins, filters, aggregation and reviewed indexes. Blocks store typed parameters. Reports reuse queries; new computations need implementations. Opening a query Block does not start a Run.

### 5.2. TASKS ARE THE INBOX

~~~text
task = title + assignee + state + due
     + data { record?, roles[], action, run?, step? }

record = source Record ID
run/step = present when work belongs to a Flow
~~~

| Concern | One rule |
|---|---|
| Storage | Inbox queries existing tasks; no separate inbox Record or duplicate queue |
| Filters | Mine = assigned to me; Unassigned = eligible/unclaimed; Team = permitted team work |
| Views | Kitchen, Sales, Support are saved filters; layouts may be list or large task tiles |
| Claim | atomically assign eligible unclaimed work; concurrent claim has one winner |
| Complete | required domain Action commits the outcome; reading/dismissing is not completion |
| Ownership | task owns human assignment; ticket owns case lifecycle; conversation owns messages |
| Dedupe | one task per human step occurrence or handling responsibility, not one per message |
| Notifications | point to existing work; routine events/retries remain in history |

~~~text
Flow -> automatic steps -> human needed -> task -> Inbox
                                             -> authorized Action
                                             -> commit + resume same Run
~~~

Conversation handlers derive from open tasks. New messages update the linked response task; automated handling creates a human task only on handoff. A reply resolves only the messages it covers, so a later message remains actionable. Case closure reconciles remaining tasks.

Standalone tasks need no Run. Approval tasks retain §3.1 bindings. Failures create a task only when someone can act. Queries/counts are authorized, indexed and paginated; AI is unnecessary for routine listing and routing.

============================================================
## 6. CHANNELS
============================================================

| Family | Purpose | Target adapters |
|---|---|---|
| Team | staff requests and notifications | Slack, Discord, Google Chat, Telegram |
| Customer | private conversations and requests | website/chat, email, supported messaging adapters |
| Social | public comments, mentions and publishing | Zernio where supported |

~~~text
Channel = { family, provider, account, direction, capabilities[], credential }
Message = { channel, provider, conversation, contact,
            direction, body?, content?, attachments[] }

verify webhook -> dedupe(provider + account + event)
  -> save Message + trigger intent -> acknowledge -> execute
~~~

- Adapters advertise verified capabilities/limits; listed providers are intended coverage, not guaranteed parity.
- One shared team destination per workspace initially; verified identity still needs membership.
- Family belongs to the connection. Contacts use verified handles; never merge guessed identities.
- `channel.reply` answers a conversation; `channel.send` contacts an allowed recipient; `channel.publish` creates an intent per destination.
- Check recipient, content, attachments and capability before delivery. Save required input before webhook acknowledgement and enforce payload limits.
- Human attention appears through Inbox tasks (§5.2); short bodies stay inline and large content follows §2.2.

============================================================
## 7. TEMPLATES + ACCESS
============================================================

~~~text
Google sign-in -> Personal Space (free)
              -> Work Space -> members + shared Records

template = schemas + Flows + Blocks + role defaults
install  = resolve dependencies + pin revisions + configure once
edit     = customize Flows/Home
upgrade  = preview; preserve customizations unless adopted
remove   = disable triggers + archive installation; preserve work/history
~~~

Choose one business template, connect channels, assign team, and begin. AI is an optional step within Flows; users need no separate Kitchen/Stock/Shift Bot setup. Templates reuse registered packs and existing installation contracts.

| Access | Rule |
|---|---|
| Workspace | isolated database + membership + timezone, currency and business-day settings |
| Base roles | `owner`, `admin`, `member`, `guest` |
| Work roles | additional labels such as kitchen/sales/support; member holds `roles[]` |
| Scope | own = ownership; team = explicitly permitted roles; all = permitted workspace data |
| Assignment | permits defined task access, not unrestricted source-record access |
| Fields | Gateway projects allowed fields for app, query and agent |
| Delegation | bounded by delegator and workspace policy |
| Revocation | subsequent access denied; in-flight effects reconciled; offline cache rules in §8 |

============================================================
## 8. LOCAL FIRST + SYNC
============================================================

### 8.1. DEVICE EXPERIENCE

~~~text
UI -> local Turso -> render known data immediately
       |
       +-> confirmed cache <--- authorized sync <--- Gateway
       +-> draft + command ---> Gateway Action ---> confirmed result

cloud  = business truth + rules + agent/Flow execution
device = permitted working set + drafts + pending intent
~~~

| Local first | Online authority |
|---|---|
| Home, forms, registry, Inbox summaries | current definitions, permissions and queue membership |
| Assigned/recent/pinned Records + local search | uncached detail, broad search, complete reports |
| Drafts, cart preparation, notes, preferences | accepted business mutations |
| Cached metrics + freshness | authoritative totals over complete data |
| Thumbnails/downloaded files | authorized R2 access |
| AI input and draft capture | cloud inference and its resulting Actions |

- One repository serves all screens; one coordinator manages sync. Scope cache, commands and drafts by account + workspace.
- Keep drafts/commands in the mutable device database, separate from replaceable cache/native replicas. Cache reset never erases pending work.
- Default download = Home + active Inbox + linked summaries + recent/pinned Records. Bound rows/bytes; preserve unsent drafts and pending-command dependencies.
- Render local changes reactively; preserve scroll and typed input. Fetch inactive Spaces/history lazily. Optional All Spaces Inbox combines permitted summaries only.
- New/missing data shows setup or online-required state. Downloaded search results are marked partial; an empty cache is not an empty business.
- Lazy-load models, embeddings and large content only when used.

### 8.2. DEFAULT = SCOPED GATEWAY SYNC

~~~text
open / foreground / reconnect / invalidation
  -> authorize -> snapshot OR scoped delta
  -> { revision, cursor, records, removed, more }
  -> local transaction: rows + removals + cursor
  -> notify affected views
~~~

Start with bounded snapshots/revision checks. Add incremental sync through the existing harness as needed; no new Worker or per-member remote database is required.

| Correctness requirement | Implementation |
|---|---|
| Bootstrap | consistent snapshot + matching committed watermark across pages |
| Change order | compact indexed `changes` log: `sequence`, `record`, `version`, `kind`; commit with business writes in committed visibility order |
| Cursor | bind to workspace, principal, permission/schema/query revisions and parameters; timestamps alone are insufficient |
| Membership | include deletions/reassignment/view exits; track membership or replace the bounded view atomically |
| Projection | recheck access; replace obsolete fields; share cached rows only across compatible projections |
| Dependencies | joins/metrics invalidate registered views; refresh bounded results |
| Expiry/access change | reset affected confirmed scope; preserve drafts, quarantine unauthorized commands |
| Scheduling | one in-flight sync per dataset; coalesce, back off with jitter, modest foreground polling fallback |
| Recovery | persisted cursor survives missed notifications; background delivery is not guaranteed |

Retain the change log for the supported offline window; older devices bootstrap. Evict a Record only when no other authorized cached view/detail needs it. Invalidation notifications are hints, not business truth.

### 8.3. TURSO NATIVE PARTIAL SYNC = OPTIONAL

Verified on 2026-09-11: partial sync fetches database **pages** lazily, with prefix/query bootstrap; missing pages need network. It is experimental and does not provide TAR row/field filtering. Turso's documented write conflict default is last push wins. [Partial sync](https://docs.turso.tech/sync/partial), [conflicts](https://docs.turso.tech/sync/conflict-resolution)

| Use it only when | Required check |
|---|---|
| Entire physical dataset is allowed to every recipient | safe dedicated projection, e.g. sanitized catalog; no raw workspace `records` replica |
| It improves measured cost/startup | compare with scoped deltas; avoid one projection database per member |
| SDK/native build/cloud engine are compatible | test together; existing `libsql://` connection does not prove compatibility |
| Server enforces read-only access | hiding/disabling push in the app is insufficient |
| Offline screens are hydrated | preload exact queries/dependencies and verify after updates |

One transport per dataset: never write scoped deltas into the same tables as a native replica. Rebuild projections from committed canonical changes, show freshness, and keep drafts elsewhere. Tune query bootstrap, batching and prefetch only after measurement; retain scoped Gateway sync if these checks fail.

### 8.4. COMMANDS + CONFLICTS

~~~text
command = { key, action, input, base, state, created, expires, after? }
base = expected Record versions
after = prerequisite command key

edit -> persist draft/command -> Pending preview
  -> send when allowed -> Gateway revalidates -> confirmed / Needs attention
~~~

| Offline policy | Behavior |
|---|---|
| `draft` | prepare locally; explicitly submit online |
| `queue` | durable intent; retry and show Pending until accepted |
| `online` | live confirmation needed; legacy default |

Notes and eligible task updates may queue. Stock reservation, shared claims, booking, payment confirmation, access changes and approval execution require current validation. Offline carts are drafts; guaranteed offline sale acceptance needs a separately designed inventory allocation capability.

| Rule | Guarantee |
|---|---|
| Identity | persist random operation key + exact payload before first attempt; unknown outcome retries the same key |
| Changed intent | new key after editing an attempted command; never coalesce already attempted work |
| Ordering | serialize dependent commands; independent work may proceed; failed prerequisite pauses dependents |
| Confirmation | atomically apply permitted result and acknowledge/remove preview; never let older sync overwrite newer confirmed versions |
| Delayed facts | keep preview until required confirmed versions arrive if result lacks changed facts |
| Conflict | preserve draft, show server facts; merge only independent fields through a newly validated Action |
| User feedback | Saved on device / Pending / Needs attention; business labels such as Paid require confirmation |
| Device protection | OS-protected storage, secure credentials, tested encryption where required, finite offline-access policy |

Already downloaded data cannot be recalled from a disconnected device. On revocation/reconnect or logout, purge unauthorized cache, files and search derivatives; explicitly handle unsent private drafts. Reauthorization applies to every queued effect. Money, stock and assignment never use blind last-write-wins.

============================================================
## 9. DELIVERY + COST + PROOF
============================================================

### 9.1. BUILD NOW / ADD WHEN MEASURED

| Build as the baseline | Defer until it earns its cost |
|---|---|
| Existing harness + shared Action contracts | new infrastructure/service boundaries |
| One task Inbox + small role-based Home | multiple specialized agent installations |
| Local repository + scoped snapshots + durable commands | native partial projections and device AI |
| Deterministic logic + one bounded agent | multiple agents for independent research/content |
| DB facts + R2 attachments | compressed history archival |
| Indexed queries + bounded views | daily summary caches and broader sync machinery |

Summary caches remain rebuildable: exact totals update with the business transaction; asynchronous totals expose freshness. Optional isolated code/browser tools retain scoped tools/network and Gateway effects. None of these optimizations adds a business primitive.

| Phase | Deliver | Verify |
|---|---|---|
| 1 | local cache/command repository over existing endpoints | warm Home/Inbox offline; restart preserves drafts/keys |
| 2 | change cursor, removals, view invalidation | no missed updates/access leaks; less transfer than snapshots |
| 3 | composable templates, custom schema, AI-assisted configuration | third business without rewriting core |
| 4 | selected optional upgrades | measurable benefit on supported devices/workloads |

Evolve `tarharness` and reuse `tarapp`. Preserve Action IDs, Gateway authority, replay and Run ownership behind versioned adapters. Migrate old card/task fields to `block`/`data.record` without duplicating work. Keep destructive legacy cleanup away from replicas and draft/command storage; retire old fetch loops after repository coverage.

**Implementation baseline checked 2026-09-11:** app SDK `@tursodatabase/sync-react-native` is installed at `0.6.1` (declared `^0.6.1`). Its types expose sync/experimental partial sync, but `src/lib/db.ts` opens local-only databases and its sync helpers are empty. Workspace screens use harness HTTP reads; functioning workspace sync remains to be built. Harness storage uses `@libsql/client/web`.

### 9.2. COST

~~~text
Monthly TAR = 100 credits per active owned Work Space
Usage       = declared chargeable Action executions
Manual reads / ordinary edits = 0 usage credits
Provider charges = disclosed separately
~~~

Show charges before consequential work; reserve budget for chargeable execution. Retries of the same operation do not duplicate user charges. Budget exhaustion must not block already accepted manual work.

Reuse scoped valid Turso tokens instead of minting each request. Measure complete cost: DB storage/indexes/operations + sync bytes + R2 storage/requests + processing + model calls. Moving tiny hot items to R2 can increase cost.

### 9.3. ACCEPTANCE CHECKS

| Scenario | Must hold |
|---|---|
| Duplicate webhook, double tap, reconnect retry | one committed effect and saved result |
| Concurrent stock, booking or claim | invariants hold; conflict is visible |
| Crash, missed signal, cancelled Run | saved progress recovers; only intended future work proceeds |
| Provider timeout / receipt failure | reconcile; no duplicate payment or business rollback |
| Revoked role / stale approval / injected input | no wider access, tools or authority |
| Missing facts / AI budget or service failure | preserve progress; ask, stop or hand off |
| Offline launch / missing pages | downloaded screens work; gaps/totals are not misrepresented |
| Snapshot, cursor expiry, reassignment | no missed changes; removals work; drafts survive rebuild |
| Account switch / field revocation | no cache leakage; unauthorized fields/files are removed |
| Generated schema / Flow / UI | valid capabilities and bounded execution |
| Object/archival failure | no dangling committed reference or premature source deletion |

Track completed jobs, human corrections/interruptions, cost/job, cold/warm render, p95 query/Action latency, sync delay/bytes, conflicts and disk/battery use. Test on representative devices and data. Optimize against these measures rather than promising zero complexity or universal savings.

============================================================
# PART B — A PIZZA STORE, END TO END
============================================================

## B1. SETUP

~~~text
Slice House = one Work Space
Muthu = owner | Malar = admin/cashier/stock
Iniya = cashier | Velan = kitchen
sell = dine-in / takeaway / delivery
settings = Asia/Kolkata + INR + business-day cutoff

Pizza Store template
  -> order.take + kitchen.prepare + stock.receive/count + shift.close
  -> products + opening movements + one Canvas + seven available Blocks
  -> connect customer, team and social channels with supported adapters
~~~

Customer intake grant = public menu, order acceptance and conversation reply; no price changes, access grants or payment confirmation.

## B2. RECORDS + CONTENT

Common fields are columns; remaining facts live in `data` (§2). Each type instance is its own Record.

| Type | Key facts |
|---|---|
| `product` | kind, price, currency, tax, stock, reserved, low, unit, scale |
| `contact` | name, verified handles |
| `order` | number, contact, items, total, currency, service, kitchen, payment |
| `task` | record, roles, action; assignee/state/due are common columns |
| `payment` | order, amount, method, reference; state |
| `reservation` | order, items, expires; state |
| `movement` | product, delta, balance, reason, reference |
| `register` | opened, opening, expected, counted, variance |
| `message`, `run`, `operation`, `delivery`, `event` | shared system types |

~~~text
order.data.contact         -> contact
order.data.items[].product -> product
task.data.record           -> order
payment.data.order         -> order
reservation.data.order     -> order
movement.data.product      -> product

order line = { line, product, title, quantity, unit, scale, price, tax, total, status }
photo / receipt PDF -> R2 reference
order lines / stock / payment facts -> DB
~~~

Pin price, tax, units and rounding at acceptance. Use integer base quantities and safe arithmetic bounds. Ingredients and supplies reuse product `kind`; recipes, when used, are pinned at acceptance.

## B3. HOME + INBOX

| Available Block | Kind | Target | Roles |
|---|---|---|---|
| Sales today | metric | `sales.today` | owner/admin |
| New sale | entry | `pos.open` Action | owner/admin/cashier |
| Kitchen queue | entry | `kitchen.queue` query -> Inbox | owner/admin/kitchen |
| Low stock | metric | `stock.low` | owner/admin/stock |
| Close shift | entry | `shift.close` Flow | owner/admin/cashier |
| Post special | entry | `channel.publish` Action | owner/admin |
| Today's payments | metric | `payments.today` | owner/admin |

| Person | Home defaults | Inbox |
|---|---|---|
| Muthu | Sales today, Low stock, Today's payments | approvals, reorder |
| Malar | Sales today, New sale, Low stock | reorder, shift review |
| Iniya | New sale, Close shift | handover, shift work |
| Velan | Kitchen queue | preparation tasks; default landing |

Kitchen Block opens the same Inbox tasks. Velan receives items/quantities/service details, not prices or customer phone numbers. Sales/payment queries use the business day and group by currency.

Local set = permitted menu + active tasks/order summaries + Home values. Velan reads downloaded work offline; claims need connection and eligible Ready updates may remain Pending. Iniya prepares carts offline; accepted stock/payment still requires the server.

## B4. FLOWS + INVENTORY

~~~text
order.take = interpret -> quote -> customer confirms -> order.place
           -> wait kitchen/payment -> cashier handover -> order.fulfill -> receipt

kitchen.prepare = existing task -> claim/start -> ready -> task done
stock.receive   = delivery -> movements -> stock cache -> low-stock check
stock.count     = physical count -> explained adjustment movement
shift.close     = count -> compare -> approval if needed -> close
~~~

| Transition | Atomic business changes |
|---|---|
| Accept | validate availability + reserve + order + kitchen task |
| Prepare | checked order/task transitions; ready commits task outcome + resume intent |
| Fulfil | consume reservation + movements + stock caches + completed order + receipt intent |
| Cancel | release unconsumed reservation; prepared waste is an explicit movement |
| Low stock | one open reorder task per product/threshold occurrence |
| Reconcile | sum movements = on-hand; active reservations = reserved |

Available = stock - reserved. Reject insufficient acceptance atomically. Pack policy defines consumption at preparation or fulfilment; payment alone never consumes stock. Reservation expiry follows work state and policy.

Kitchen and payment may finish in either order. The Run checks saved facts before waiting; ready + paid still requires actual handover.

## B5. ONE ORDER

~~~text
11:42  customer: "2 margherita + 1 coke, takeaway"
       verify/dedupe -> save Message + Run-start intent -> acknowledge
       agent.extract -> code resolves menu and quote -> customer confirms

       order o17: total=55800, currency=INR, kitchen=queued, payment=unpaid
       items: pmarg x2 at 24900 + pcoke x1 at 6000 (tax-inclusive)
       reservation r17: pmarg=2, pcoke=1
       task t88: record=o17, roles=[kitchen], state=open
       acceptance commits together

11:45  Velan: kitchen.start -> claimed task + preparing order
11:51  Velan: kitchen.ready -> ready order + done task + resume intent
11:52  pos.checkout -> pending payment -> verified provider confirmation
       Iniya hands over -> order.fulfill -> stock/movements/order/receipt intent
       channel.reply -> confirmed receipt delivery
~~~

A duplicate tap returns the saved result. A payment timeout reconciles with the provider. Receipt failure retries delivery only; an optional PDF is generated and attached using §2.2. Mid-preparation amendments use checked reservation changes and a kitchen delta task.

## B6. SHIFT + SOCIAL

~~~text
expected cash = opening + confirmed cash sales - cash refunds
variance      = counted - expected
within policy -> close register
otherwise     -> approval bound to count/register version -> recheck -> close

Muthu -> channel.publish("Friday: 2 for 1 margherita")
      -> one intent per permitted destination
      -> confirmed / retry / unknown; reconcile each independently
~~~

One open register is enforced for this store model. Agent-written promotions obey publishing policy. Shared reliability checks and billing are in §9.

============================================================
# PART C — A SAAS SALES + CRM TEAM, END TO END
============================================================

## C1. SETUP + RECORDS

~~~text
Orbit = one Work Space
Thenmozhi = owner | Marudhan = sales
Kayalvizhi = success | Vetrivel = support
SaaS CRM template -> assign team -> connect website/email + team chat
sell = selfserve + demo + annual contract
~~~

| Type | Key facts |
|---|---|
| `account` | name, domain, stage, plan, renewal; owner |
| `contact` | name, email, account, role, consent |
| `lead` | contact, source, score, stage, next; owner |
| `deal` | account, contacts, value, currency, stage, close; owner |
| `ticket` | account, contact, priority, category; owner/state |
| `subscription` | account, plan, seats, start, renewal; state |
| `task` | shared §5.2 contract; source in `data.record` |

~~~text
lead.data.contact      -> contact
contact.data.account   -> account
deal.data.account      -> account
deal.data.contacts[]   -> contact
ticket.data.account    -> account
subscription.data.account -> account
task.data.record       -> lead / deal / ticket / conversation
~~~

## C2. HOME + INBOX

| Person | Home defaults | Inbox |
|---|---|---|
| Thenmozhi | revenue, pipeline, renewals | approvals, escalations |
| Marudhan | leads, deals, New deal | qualification, followups, proposal review |
| Kayalvizhi | customers, onboarding, renewals | setup, kickoff, renewal reviews |
| Vetrivel | tickets, customer lookup | unassigned tickets, assigned replies |

Metrics use registered queries; entry Blocks open Actions, Flows or existing views. Account/deal screens reuse their linked tasks and conversations. No duplicate support queue or separate response assignment.

Local set = assigned tasks + recent accounts/deals + selected conversations + Home summaries. Marudhan writes notes offline; Vetrivel drafts replies. Queued work revalidates on reconnect. Company-wide totals come from confirmed queries, not one person's cached deals.

## C3. BUSINESS FLOWS

~~~text
form/email -> lead.capture -> lead.qualify
                              +-> nurture / disqualify
                              +-> deal.progress -> won / lost
                                                    |
                                             won -> customer.onboard

customer message -> support.resolve
renewal due      -> renewal.manage
~~~

| Flow | Steps / outcomes |
|---|---|
| `lead.capture` | validate -> match/create contact/account -> lead -> route task |
| `lead.qualify` | review facts -> qualified deal / nurture / disqualified |
| `deal.progress` | discovery -> proposal draft -> approved send -> contract -> won/lost |
| `customer.onboard` | won -> subscription/setup -> owner -> kickoff -> success tasks |
| `support.resolve` | conversation -> ticket/response task -> reply -> case resolution |
| `renewal.manage` | schedule -> usage/risk review -> quote -> renew/expand/churn |

Packs supply the corresponding registered Actions. Qualification and pricing use validated facts. Subscription activation and paid status follow billing evidence; a won deal alone does not prove payment.

## C4. ONE LEAD

~~~text
Poongodi submits demo request
  -> Gateway validates public input and dedupes
  -> optional extraction -> code creates/routes lead to Marudhan
  -> qualification task -> qualified deal
  -> AI drafts proposal -> Marudhan approves -> permitted channel send
  -> signed/won -> onboarding + Kayalvizhi's tasks
~~~

This Flow requires proposal approval. Another Flow may allow routine sends under its grant. Changing the draft invalidates an approval that was bound to the previous input.

## C5. CUSTOM INTERNAL + CUSTOMER FLOWS

Users customize Who, When, Conditions and Message, or open Advanced for steps (§4). A human step automatically appears in the correct Inbox; customer inputs remain in their form/channel.

| Example | Audience | Configuration |
|---|---|---|
| Expense review | team | amount threshold -> manager task -> finance Action |
| Demo request | customer | form -> validated lead -> sales task |
| Trial followup | both | signup -> timed draft -> approval/send -> reply handoff |
| Onboarding | both | customer checklist -> internal setup -> progress reply |

~~~text
trial.followup
  audience = both
  trigger  = form

  validate/capture lead
    -> wait 1 day
    -> agent.draft
    -> sales approval
    -> channel.send
    -> wait for reply, maximum 3 days
    -> interested: qualification task
       otherwise: sales review task
    -> end after committed handoff
~~~

No background loop without a limit. Draft, review, send and reply handling use the same Records, Actions and task model as the rest of TAR.

============================================================
## DESIGN REFERENCES
============================================================

| Topic | Sources |
|---|---|
| Agents and context | [Effective agents](https://www.anthropic.com/engineering/building-effective-agents), [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [tool discovery](https://www.anthropic.com/engineering/advanced-tool-use) |
| Durable execution | [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/) |
| Storage | [SQLite partial indexes](https://sqlite.org/partialindex.html), [Turso pricing](https://turso.tech/pricing), [usage](https://docs.turso.tech/help/usage-and-billing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/) |
| Sync | [Usage](https://docs.turso.tech/sync/usage), [partial sync](https://docs.turso.tech/sync/partial), [conflicts](https://docs.turso.tech/sync/conflict-resolution) |
| Optional agents / evaluation | [Multi-agent research](https://www.anthropic.com/engineering/multi-agent-research-system), [agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |

Sources inform the design. TAR policies are architectural decisions; the document does not claim all capabilities are implemented.
