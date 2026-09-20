# TAR v10 = One Core + Every Commerce Domain

> Local speed + shared truth + configurable work + selective intelligence.

**Status = target architecture.** First release proves the core; domain packages extend it across commerce. Each package still needs implemented rules and integrations. Basis = [v8](tarv8.md) + [v9](tarv9.md) + TypeSafe guidance.

## 1. Purpose = the complete business cycle

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   |          |        |       |          |          |         |
 Sites       CRM     Sales   Orders    Products    Tickets   Renewals
 Content   Contacts  Quotes  Payments   Services   Returns   Campaigns
                               |
             Team + Stock + Purchasing + Finance + Reporting
~~~

**TAR = one architecture for the entire cycle.** A cafe, shop, agency, repair business or subscription service enables different capabilities within the same system.

| Domain | Work covered |
|---|---|
| Sites | Content, catalog, forms, enquiries, checkout, reviewed publication |
| CRM | People, companies, relationships, consent, communication history |
| Sales | Leads, opportunities, quotes, conversion, follow-ups |
| Products | Catalog, variants, prices, stock, purchasing, reservations |
| Services | Offerings, resources, availability, bookings, assignments, completion |
| Commerce | Orders, invoices, payments, fulfillment, subscriptions, refunds |
| Support | Tickets, conversations, priorities, returns, resolution |
| Operations | Suppliers, purchases, receiving, shipping, team, approvals |
| Finance | Postings, reconciliation, balances, reporting, exports |

Industry rules, tax configuration and provider integrations belong to their packages. Shared architecture does not make those rules interchangeable.

## 2. Core = a few responsibilities

~~~text
PERSON / SITE / MESSAGE / TIMER / PROVIDER
                    |
                    v
              ACTION REQUEST <---- optional AI proposal
                    |
                    v
          RUNTIME = authorize + validate + commit
                    |
         +----------+----------+
         |          |          |
       STATE       LOG        TASKS
    current facts history  unfinished work
         +----------+----------+
           one workspace transaction
                               |
                    Queue -> EXECUTOR
                    Cron  -> SCHEDULER
                               |
                       action / provider
~~~

| Name | Meaning |
|---|---|
| State | Authoritative domain records |
| Action | Registered operation with typed input and rules |
| Runtime | Shared authorization and commit path |
| Policy | Deterministic access, approval and business constraints |
| Task | Work owed to a person, handler or provider |
| Log | Ordered accepted changes |
| Registry | Published schemas, actions, templates and views |
| Executor | Performs one bounded piece of work |
| Scheduler | Finds due work and recovers interrupted attempts |
| Router | Selects code, Jev, a generative model or a person |

These are responsibilities inside the application, not separate services.

## 3. Dynamic = compose capabilities

~~~text
BOT = SCHEMA + ACTIONS + POLICY + TEMPLATES + VIEWS
                         |
                  configure + publish
                         |
              shared Runtime + shared UI

Retail = CRM + Catalog + Stock + Sales + Payments + Shipping + Support
Agency = CRM + Sales + Services + Booking + Billing + Support
Cafe   = Catalog + POS + Kitchen + Stock + Payments
~~~

| Extension | Mechanism |
|---|---|
| Business | Enable packages; configure currency, location, channel and access |
| Field | Version a validated extension schema; promote frequently queried fields |
| Screen | Compose approved list, form, detail, calendar and summary components |
| Automation | Configure trigger + conditions + action + timing + authority |
| Integration | Add a provider adapter using the durable effect contract |
| Domain | Register its schema, code, constraints and views; reuse core services |

**Configuration changes behavior within published limits. New invariants require code.** Models cannot publish executable definitions or grant permissions.

Cross-package work invokes the owning package's action. Related changes inside one workspace may share one transaction. Across workspaces/providers, use separate idempotent actions and explicit compensation.

Start templates as bounded handlers. Add complex orchestration when a real process requires it; choose one checkpoint owner. Managed Workflows and a separate SQL engine must not independently advance the same workflow.

## 4. Naming = one word, one meaning

**New tables, columns and internal identifiers = one lowercase semantic word.** No spaces, underscores, hyphens or joined multiword identifiers. Qualify through structure: **tasks.owner**, **orders.version**. External APIs retain required spelling behind adapters.

### Core tables

| Table | Purpose | Principal columns |
|---|---|---|
| registry | Published definitions | id, tenant, kind, name, revision, schema, config |
| tasks | Jobs, effects, human work | id, tenant, kind, subject, action, revision, actor, authority, input, result, status, due, owner, epoch, expiry, attempts, version, key |
| log | Accepted history | id, tenant, sequence, kind, subject, version, actor, command, task, data, created |
| commands | Replay protection | id, tenant, actor, key, action, revision, hash, result, created |
| traces | AI evidence and usage | id, tenant, task, attempt, model, revision, context, questions, answer, usage, cost, latency, status |

### Domain tables = add as packages ship

| Area | Tables |
|---|---|
| Access / CRM | members, roles, contacts, companies, relationships, consents |
| Sales | leads, opportunities, quotes |
| Products / supply | products, variants, prices, stock, reservations, suppliers, purchases |
| Services | services, resources, bookings |
| Commerce | orders, lines, invoices, payments, postings, subscriptions, shipments, returns, refunds |
| Support / sites | tickets, messages, pages, releases |

~~~text
tenant   = workspace boundary       subject  = typed reference {kind, id}
actor    = accountable principal    owner    = task lease holder
revision = published definition     version  = mutable row version
epoch    = lease fencing counter    expiry   = task lease expiration
key      = stable operation identity
hash     = canonical request fingerprint
~~~

Common domain columns = **id, tenant, version, created, updated**. Add meaningful fields such as **location, channel, currency, amount, status**. References require tenant checks and database constraints.

Task revision pins its handler; trace revision pins its question/configuration bundle, with the exact model identifier in model. Each kind has a validated payload and lifecycle.

Use relational tables for constrained data such as money and stock; validated JSON for extensions. State is a concept, not a universal JSON table. Migrate existing storage incrementally.

## 5. Execution = one safe transition

~~~text
REQUEST -> authenticate + resolve tenant + canonicalize
  |
  BEGIN
    current authority
      -> replay lookup
      -> schema + approval + rules + versions
      -> lease check for background execution
      -> update STATE + append LOG + update TASKS + save COMMAND
  COMMIT
  |
  return result + signal background work
~~~

| Law | Enforcement |
|---|---|
| Replay | Unique (tenant, actor, key); hash covers action, revision, input and expected versions. Same request returns saved result; changed request conflicts |
| Authority | Current permission before replay disclosure; replay before mutable business guards |
| Atomicity | Related order, stock, posting and task changes commit together inside one workspace |
| Stock / capacity | Conditional reservations and affected-row checks; overlapping bookings obey resource capacity |
| Money | Integer minor units + currency; immutable postings; corrections/refunds create new evidence |
| Payment | Verified provider evidence or authorized cash recording; browser/model claims cannot establish settlement |
| Approval | Bind exact action, payload, destination, amount, versions and expiry; consume once |
| Independence | Payment, preparation, fulfillment and receipt have separate states |
| Publication | Publish an approved immutable release; rollback selects a reviewed release |

**Model = proposal. Runtime = accepted change.** No transaction spans a provider/model call. Workspace membership shares the Turso transaction boundary with business commits.

## 6. Durability = finish accepted work

~~~text
JOB     ready -> running -> succeeded
                   |----> retry -> ready
                   '----> failed / cancelled

EFFECT  saved -> dispatched -> confirmed
                    '------> unknown -> reconcile -> confirmed / rejected
                                              '----> human

HUMAN   waiting -> approved / rejected / completed / expired
~~~

| Mechanism | Rule |
|---|---|
| Creation | Trigger creates owed work atomically; each effect has a stable provider key |
| Claim | Atomic lease + increasing epoch + database time; stale workers cannot commit |
| Recovery | Bounded due/expired/unknown scans; limited retries with backoff |
| Provider | Unknown outcome requires provider evidence or human review before another attempt |
| Human | Cron never approves work; approval atomically consumes the decision and creates/wakes its effect |
| Cancellation | Stops future work; dispatched effects still need reconciliation or compensation |
| Versions | Retain old handlers until pending work finishes or is explicitly migrated |

Database fencing cannot prevent duplicate remote calls; provider idempotency/reconciliation remains necessary. Narrow service authority records already-dispatched outcomes after requester revocation without authorizing new effects.

Launch triggers create tasks directly; timed handlers recheck current facts. Future event subscriptions require durable cursors, atomic task creation, deduplication and protection against events arriving before wait registration.

## 7. Jev = judgment that code can use

~~~text
KNOWN RULE ----------------------> CODE
MEANING / SELECTION --------------> JEV --------+
DRAFT / EXPLANATION / REASONING --> MODEL ------+--> proposal --> RUNTIME
MISSING FACT / APPROVAL ----------> HUMAN ------+

Choice = select an option
Score  = rate against described levels
Noul   = probability that a condition holds
~~~

| Domain | Jev helps with | Final control |
|---|---|---|
| CRM | Contact matches, tags, relevant history | Scope checks; review consequential merges |
| Sales | Enquiry routing, lead priority, follow-up intent | Published routing and consent |
| Products | Select catalog candidates from customer language | Actual catalog, availability and prices |
| Services | Match requests to offerings, skills or resources | Capacity and customer confirmation |
| Commerce | Select source values for drafts; flag missing/conflicting details | Totals, stock, payment and approvals |
| Support | Ticket routing, urgency, relevant answers | Service policies and authorized resolution |
| Sites | Submission classification, content ranking, unsupported claims | Reviewed content and publication |
| Operations | Exception priority and relevant context | Registered actions and permissions |

**Pattern = find candidates -> ask Jev -> copy evidence -> validate.** Missing candidates require clarification or another extraction method. Jev cannot invent missing facts, authorize access or establish payment success.

| Efficiency | Rule |
|---|---|
| Batch | Ask independent questions over shared permitted context together; use relevant branches only |
| Abstain | Include no-match choices; uncertainty routes to clarification/model/human |
| Measure | Choice/Score confidence describes distribution concentration; Noul has no separate confidence. Fit thresholds on TAR examples |
| Reuse | Save source/question/model versions; invalidate reuse when evidence or access changes |
| Bound | Limit tokens, attempts, time and spend; persist decisions before effects |

Enable Jev where measured quality and complete-task cost beat alternatives. No mandatory Jev call before every model. A crash before saving may repeat inference, but must not repeat business effects.

## 8. Experience + infrastructure

~~~text
SPACE = work and records    INBOX = decisions and exceptions    BOTS = capabilities

LOCAL SQLite = permitted cache + drafts + cursor
WORKER       = Runtime + queries + bounded execution
TURSO        = workspace truth + authority + tasks + history
D1           = identity directory + AI budget reservations
QUEUE / CRON = wakes + recovery
R2           = files + immutable releases
~~~

Sync = authorized bootstrap + ordered deltas + removals + atomic local cursor update. Cursor binds identity, tenant and permission epoch. Rebootstrap clears stale projections; offline revocation cannot recall downloaded data.

Offline drafts replay stable keys and revalidate access, prices and versions. No confirmed offline shared checkout. Show workspace context, one primary action and clear pending/conflict/denied/offline states. Poll active screens with backoff.

Business log and private AI traces have different access/retention; never sync raw logs. Private My Agent gets separate isolation. Begin reporting with indexed SQL; add search/replicas only for measured need.

## 9. Delivery = prove once, expand by package

| Stage | Deliver | Gate |
|---|---|---|
| Foundation | Inventory, backup, authority, commands, tasks, log and sync | Replay, concurrency, revocation, isolation, recovery |
| Commerce | Onboarding, catalog, POS, kitchen, reservations, payment, receipt/refund | Complete sale and return with verified money/stock |
| Relationships | CRM, Sales, Team, Inbox, follow-ups and reminders | Enquiry through quote/send/follow-up; invite/offboard |
| Domains | Services, support, purchasing/shipping, subscriptions, sites | Each business cycle uses the same core contracts |
| Intelligence | Model adapters, Jev evaluation, traces, budgets | Held-out quality, latency, cost and safe fallback |
| Expansion | Industry packages; advanced orchestration as needed | Proven rules, integrations and operating cost |

Reuse the [gateway](tarharness/src/gateway/actions.ts), [POS store](tarharness/src/pos/store.ts) and [jobs](tarharness/src/channels/jobs.ts). Current [sync hooks](tarapp/src/lib/db.ts) are incomplete. Authority migration, reservations, verified settlement and broader packages remain implementation work.

Pilot = approximately **10 businesses / 100 paid seats**. Targets = **INR 100 technical cost per paid seat/month** and deterministic operation **p95 below 300ms** in the pilot region. Measure before promising.

~~~text
COST = platform + storage + sync + jobs + AI + retries + logs + backups
       + communication + integration charges + applicable taxes

SEAT COST = COST / paid seats
JEV VALUE = avoided downstream cost - Jev cost - added fallback/review cost
~~~

Reserve AI budget before calls; reconcile actual usage. D1 and Turso do not share a transaction. Exhaustion pauses AI, never manual commerce. Evaluate representative held-out cases, then shadow and monitor enabled routes.

| Release proof | Expected |
|---|---|
| Duplicate / changed request | Saved result / conflict |
| Last unit / last slot | Capacity respected; no partial losing order |
| Stale worker / lost wake | Commit rejected / durable recovery |
| Unknown charge / expired approval | Reconcile / deny |
| Hidden fields / AI outage | No leakage / manual work continues |
| Cancellation / old handler / restore | Explicit outcomes and reconciled evidence |

Migration = backup -> pause/drain one workspace writer -> transform -> reconcile -> enable -> observe. Preserve identities, money, keys and pending effects. Rollback accounts for newly accepted writes.

## 10. Concept screens

~~~text
SHELL
+-------------------------------------------+
| Slice House                    Sync   Me  |
+-------------------------------------------+
|                                           |
|                ( content )                |
|                                           |
+-------------------------------------------+
|   Space    |    Inbox    |    Bots        |
+-------------------------------------------+
~~~

| Surface | Shows | Never shows |
|---|---|---|
| Space | permitted records, metrics and common actions | fields outside the field policy |
| Inbox | decisions, exceptions, waits and failures | an action the user cannot perform |
| Bots | installed and available capabilities | internal runtime detail |
| My Agent | one identity's private work | workspace data without live permission |

### Space = role aware home

~~~text
+-------------------------------------------+
| Slice House               Today, 19 Sep   |
+-------------------------------------------+
| Sales   Rs.18,420        Open orders   4  |
| Kitchen 2 preparing      1 ready   [Open] |
| Sales   3 follow-ups due           [Open] |
| Site    1 enquiry unread           [Open] |
+-------------------------------------------+
| [ New order ] [ New lead ] [ Ask ]        |
+-------------------------------------------+
~~~

### Inbox = decisions and exceptions

~~~text
+-------------------------------------------+
| Inbox                            6 open   |
+-------------------------------------------+
| APPROVE  Refund #1038  Rs.250     [Open]  |
| DUE      Follow up Priya          [Open]  |
| FAILED   Receipt #1042            [Retry] |
| CONFLICT Draft order changed     [Review] |
| WAIT     Catering quote reply     [Open]  |
+-------------------------------------------+
| Completed today                   [View]  |
+-------------------------------------------+
~~~

### Bots = capabilities

~~~text
+-------------------------------------------+
| Bots                             Manage   |
+-------------------------------------------+
| (M) My Agent                      private |
| (P) POS          orders, stock  installed |
| (S) Sales        leads, quotes  installed |
| (T) Team         members, jobs  installed |
| (C) CRM          contacts       installed |
| (R) Support      tickets       available  |
+-------------------------------------------+
| [ Add a capability ]                      |
+-------------------------------------------+
~~~

### Record card = one card, morphs by state

~~~text
+-------------------------------------------+
| ORDER #1042   new           [ Accept ]    |
+-------------------------------------------+
| ORDER #1042   preparing     [ Mark ready ]|
+-------------------------------------------+
| ORDER #1042   ready, paid   [ Hand over ] |
+-------------------------------------------+
| ORDER #1042   handed over   complete      |
+-------------------------------------------+
~~~

### Approval = the exact effect

~~~text
+-------------------------------------------+
| Refund #1038                              |
+-------------------------------------------+
| Order          #1038     Amount   Rs.250  |
| Destination    original payment method    |
| Reason         item unavailable           |
| Requested by   Malar                      |
+-------------------------------------------+
| Expires in 6h       [ Reject ] [ Approve ]|
+-------------------------------------------+
~~~

### Shared states

| State | Shows | Next action |
|---|---|---|
| Empty | purpose plus one starter action | create or install |
| Loading | cached content and a freshness label | wait |
| Offline | cached read plus a draft badge | save draft or reconnect |
| Pending | accepted intent not yet confirmed | check status |
| Conflict | draft preserved, changed facts explained | review |
| Denied | the unavailable action, no hidden data | request access |
| Failed | a specific recoverable reason | retry or resolve |
| Approval required | the exact proposed effect | review |
| AI paused | manual controls stay usable | continue manually |

### Home per domain

| Domain | Home | Row shows | Primary action |
|---|---|---|---|
| Sites | pages and releases | page, state, live release | publish reviewed release |
| CRM | contacts | name, stage, next step | open relationship |
| Sales | leads and quotes | lead, value, due date | send or request approval |
| Products | catalog and stock | item, price, sellable | edit or adjust |
| Services | resources and bookings | slot, resource, state | confirm booking |
| Commerce | orders and invoices | order, payment, fulfilment | the state action |
| Support | tickets and returns | ticket, priority, age | reply or resolve |
| Operations | purchases and shipments | supplier, expected, state | receive or dispatch |
| Finance | postings and reconciliation | entry, source, mismatch | reconcile |

## 11. Worked examples = restaurant to every domain

One grammar, seven stages, one cafe. Only the domain words change.

~~~text
SEE permitted facts -> CHOOSE one action -> RUNTIME validates and commits
                                              |
                             record + log + task + optional effect
~~~

Names = Muthu (owner), Malar (cashier and sales), Iniya (cashier), Velan (kitchen),
Priya (customer).

### 1 DISCOVER = Sites and Content

~~~text
+-------------------------------------------+
| Site - Slice House            Live: R17   |
+-------------------------------------------+
| Submission: "Catering for 40 on 4 Oct"    |
| Classified: catering enquiry      [Open]  |
+-------------------------------------------+
| [ Edit ] [ Preview ] [ Publish R18 ]      |
+-------------------------------------------+
~~~

- Jev classifies the submission (enquiry / question / spam). Missing candidates need
  clarification, not invention.
- Publish binds approval to the previewed immutable release; rollback selects a release.

### 2 RELATE = CRM and Contacts

~~~text
+-------------------------------------------+
| Priya                          Customer   |
+-------------------------------------------+
| Consent  marketing yes, since 19 Sep      |
| Owner    Malar                            |
| Timeline enquiry -> quote -> order        |
+-------------------------------------------+
| [ Add note ] [ Create lead ] [ Merge ]    |
+-------------------------------------------+
~~~

- Jev proposes a contact match and tags; a consequential merge stays a reviewed action.
- Consent is a record, not a checkbox in the UI. No consent blocks later sending.

### 3 SELL = Sales and Quotes

~~~text
+-------------------------------------------+
| Quote Q18 - catering 40          Draft    |
+-------------------------------------------+
| 40 x Margherita                 Rs.10,000 |
| Service charge                     Rs.500 |
| TOTAL                           Rs.10,500 |
+-------------------------------------------+
| Expires 26 Sep    [ Save draft ] [ Send ] |
+-------------------------------------------+
~~~

- The model drafts the wording. Every price and total is computed by code.
- Sending is a human action; a follow-up task is created on send, not by a timer guess.

### 4 COMMIT = Orders and Payments

~~~text
+-------------------------------------------+
| Checkout #1042                            |
+-------------------------------------------+
| Total     Rs.651        Due      Rs.651   |
| [ Cash ]   [ Connected payment provider ] |
+-------------------------------------------+
| Cash 700            Change       Rs.49    |
| [ Record cash payment ]                   |
| Provider: pending confirmation            |
+-------------------------------------------+
~~~

- Verified provider evidence or an authorized cash recording establishes payment.
  A browser or model claim never does.
- Stock and capacity are reserved by conditional update inside the same transaction.

### 5 DELIVER = Products and Services

~~~text
+-------------------------------------------+
| Kitchen                   3 new   2 prep  |
+-------------------------------------------+
| #1042   4 min   2 Margherita / 1 Garlic   |
| Note: no onions                           |
| [ Start preparation ]     [ Mark ready ]  |
+-------------------------------------------+
~~~

- Kitchen sees items and preparation only. No prices, payment or customer phone.
- Payment, preparation, fulfilment and receipt are independent states. A failed receipt
  never blocks an otherwise permitted handover.

### 6 SUPPORT = Tickets and Returns

~~~text
+-------------------------------------------+
| Ticket T7 - cold on arrival     Priority 2|
+-------------------------------------------+
| Evidence   #1042, delivered 12:40         |
| Proposed   refund Rs.250   (approval)     |
+-------------------------------------------+
| [ Open evidence ]   [ Reject ] [ Approve ]|
+-------------------------------------------+
~~~

- Jev routes the ticket and reads urgency. It never decides the refund.
- An approval binds the exact action, amount, destination and versions, and is consumed
  once. A changed request needs fresh approval.

### 7 RETAIN = Renewals and Campaigns

~~~text
+-------------------------------------------+
| Campaign - repeat diners         Template |
+-------------------------------------------+
| When     order delivered                  |
| Wait     14 days                          |
| Only if  marketing consent AND no return  |
| Action   send approved template           |
| Limit    20/day       Owner     Muthu     |
+-------------------------------------------+
| [ Preview with example ]       [ Activate]|
+-------------------------------------------+
~~~

- Conditions are rechecked at execution time, not at activation time.
- The countdown runs even when the app is closed, because the wait is durable.

### Every case, one table

| Stage | Domain | Slice House | Same stage elsewhere |
|---|---|---|---|
| DISCOVER | Sites, Content | catering enquiry from the site | shop: product question; agency: brief; repair: booking request |
| RELATE | CRM, Contacts | Priya becomes a consented customer | shop: loyalty contact; agency: client company; repair: asset owner |
| SELL | Sales, Quotes | quote Q18 for 40 covers | shop: bulk order; agency: retainer proposal; repair: estimate |
| COMMIT | Orders, Payments | order #1042 paid Rs.651 | shop: counter sale; agency: deposit invoice; repair: work order |
| DELIVER | Products, Services | kitchen prepares, then handover | shop: pack and ship; agency: delivery milestone; repair: service done |
| SUPPORT | Tickets, Returns | cold order, refund Rs.250 | shop: return and exchange; agency: scope dispute; repair: rework |
| RETAIN | Renewals, Campaigns | 14-day repeat diner campaign | shop: restock reminder; agency: renewal; repair: service due |

### What each stage commits

| Stage | Records | Log | Task | Effect |
|---|---|---|---|---|
| DISCOVER | message, contact | submission.received | triage | none |
| RELATE | contact, consent | contact.consented | none | none |
| SELL | lead, quote | quote.sent | follow-up due | message |
| COMMIT | order, lines, payment, posting | order.accepted, payment.confirmed | receipt | receipt |
| DELIVER | order fulfilment, booking | order.fulfilled | none | notify |
| SUPPORT | ticket, return, refund | refund.approved | none | refund |
| RETAIN | campaign, activity | message.sent | next run | message |

### The same failure grammar at every stage

~~~text
duplicate  -> replay returns the saved result
conflict   -> version check; draft preserved, user reviews
denied     -> authority rechecked; nothing hidden is revealed
unknown    -> reconcile with provider evidence before any retry
~~~

## 12. References

| Source | Guidance |
|---|---|
| [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md) | Typed judgments within software workflows |
| [Building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) / [extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook) | Code owns flow; selection from evidence |
| [Confidence](https://docs.typesafe.ai/confidence) / [batching](https://docs.typesafe.ai/patterns/fan-out) | Uncertainty and independent questions |
| [Queue delivery](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) / [durable waits](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/) | Duplicate delivery and orchestration |

**TAR = reusable core + domain rules + configurable experiences. Jev improves judgment; Runtime preserves truth.**
