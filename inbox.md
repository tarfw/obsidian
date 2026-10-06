# TAR Screen — complete adaptive Now

## Decision

| Invariant | Rule |
| --- | --- |
| Coverage | Now = one logical ordered list of every eligible work unit when sources are current; otherwise show partial. Chef lines keep quantity and state. |
| Jev | Ranks safe ties and suggests references; code owns coverage, deadlines and state. |
| Open | Row -> typed Action, Flow Book, Artifact, detail or tool at source; mutations use its Gateway. |
| Scope | One per-user DB; Mine, Available and Waiting share the list. Change affects context, never authority. |
| Navigation | Now is the sole top-level mobile screen. Workspace management opens from Tools; Ask TAR opens from the flat bottom row. No Space/Now/Ask bottom tabs. |

| Fixed control | Use |
| --- | --- |
| Context | Workspace, role, owner, routine/hold, Change |
| Tools | Authorized POS, KDS, Site Studio, catalog, reports and more |
| Find | Search Now; optional workspace or state filters appear only when chosen |
| Ask TAR | Request help or review a proposed registered Action |

## Complete concept: Now, Space and Tools by role

The source workspace declares which capabilities are enabled and which roles may
use them. The app builds Tools from those declarations and the person's current
membership; it does not ship a fixed POS/KDS/site menu for every workspace.
Personal has personal tools unless a business capability was deliberately enabled
there. Global controls such as Settings and workspace management are separate.

~~~text
PERSON'S AUTHORIZED WORKSPACES (1..n)
  Personal + Northstar Restaurant + My Delivery Work
       | each source owns facts, capabilities, role grants,
       | membership, registered interfaces and Gateway
       |
       +-- concrete actor steps -> per-user Inbox DB -> NOW
       |                           source refs + state   all eligible rows
       |
       +-- enabled capability + person's role grant
       |   + working interface -> TOOLS by source
       |
       +-- source Gateway <- Now row tap or Tool tap
                              fresh facts + access check

  SPACE -> current workspace/role/owner header; may order Tools.
           Changing Space does not change access or hide Now work.
  Jev   -> optional safe-tie rank or Ask TAR Tool match, after eligibility.
  Code/source -> permission, coverage, final visibility and commits.
~~~

One person can be in Personal while restaurant work remains in Now and restaurant
launchers remain in Tools. Opening a tool keeps the current Space; Back restores
the same Now context and scroll. A generic launcher is never counted as Inbox work.

~~~text
+----------------------------------------------+
| NOW / 07:00                  Find > Tools >   |
| Personal / Individual / Owner: You           |
| Morning / Auto                     Change >   |
|----------------------------------------------|
| [A] Call home                     DUE 07:10 > |
|     Personal / family reminder               |
| [A] 2x Chicken tikka              DUE 09:11 > |
|     Northstar / Chef / Order #41              |
| Ask TAR...                                 >  |
+----------------------------------------------+
| TOOLS / available to this person             |
| Personal: Create task, Add routine           |
| Northstar / Chef: Kitchen display            |
| My Delivery Work / Courier: Delivery tool    |
| (only registered, enabled, granted tools)    |
+----------------------------------------------+
  Tap Chicken -> Northstar Gateway -> prep Action
  Tap Kitchen display -> Northstar source Tool
  Back -> Personal Now; context and scroll retained
~~~

Restaurant example: Northstar enables only the capabilities it actually uses.
The source grants each person one or more roles. The rows below are examples of
different people's projections of the same restaurant, not one universal menu.

~~~text
+------------+----------------------------+-----------------------------+
| Role       | Now: concrete work         | Tools: enabled + granted    |
+------------+----------------------------+-----------------------------+
| Owner      | Approve refund #18         | Reports, catalog, Site      |
|            | Accept order #41           | Studio, POS if granted      |
| Chef       | 2x Chicken tikka / #41     | Kitchen display if granted  |
| KDS lead   | Handoff ticket #40         | Kitchen display             |
| Cashier    | Record payment #41         | POS, orders, register       |
| Server     | Serve table 12             | Floor tool if registered    |
| Courier    | Collect order #41          | Delivery tool if registered |
| Customer   | Receive order #41          | Customer tool if registered |
+------------+----------------------------+-----------------------------+

NOW / Northstar / Chef / 09:10    TOOLS / Northstar / Chef
  [A] 2x Chicken tikka / #41       Kitchen display >
  [S] 1x Salad ready / #41         (no POS or owner reports)
  [A] Call home / Personal

NOW / Northstar / Cashier / 12:00 TOOLS / Northstar / Cashier
  [A] Record payment #41           Open POS >
  [F] Close register / step 1/4    Orders >  Register >
  [A] Call home / Personal         (no kitchen or owner tools)
~~~

Jev can suggest or order tools only after code forms this authorized set. A clear
request such as "open the register" may select Northstar's registered POS
launcher; an ambiguous request asks the person to choose. Jev never enables a
capability, grants a role, creates a Now row or commits an Action.

## Name and data path

| Name | Meaning |
| --- | --- |
| **Now** | User-facing ordered work list; partial cue if a source is stale |
| **Inbox** | Human-action queue in the per-user DB, fed by authorized workspaces |
| **Inbox:Now** | Ordered view over Inbox and linked active status/reference pointers in that DB; screen title stays `Now` |
| **Source** | Workspace database that owns the record, facts, permission and Action |

### Standard architecture (any domain and role)

~~~text
ANY AUTHORIZED WORKSPACE (1..n)
  source owns facts + permission + Gateway
       | concrete actor step / source event
       v
@user DB = Inbox Actions + linked status/ref pointers
           source/version + minimal display; no raw records
       | code: eligibility + due + dependency
       | Jev: one Next within safe ties; never creates a row
       v
NOW = every eligible row; Space -> context header
+--------------------------------------------+
| NOW / <time>                Find > Tools > |
| <workspace> / <role> / <owner>             |
| <routine/hold>                    Change > |
|--------------------------------------------|
| [A] <specific step>             <status> > |
|      <source> / <parent> / <due>           |
|--------------------------------------------|
| ... more eligible rows on same scroll      |
|--------------------------------------------|
| Ask TAR...                               > |
+--------------------------------------------+
  row tap -> source Gateway -> typed flow -> Back to Now
  Tools   -> registered core verbs; no Inbox row
  Change  -> workspace context; no Inbox row
  Ask     -> Jev selects a registered verb for an
             explicit request; user chooses, Gateway checks
             source creates a step only if workflow requires
~~~

### Example (one person's chef shift)

~~~text
EXAMPLE SOURCES: Personal + Restaurant + Delivery + Sales
                  | concrete actor steps / source events
                  v
+--------------------------------------------+
| @USER DB                                   |
| Inbox Actions + linked status/ref pointers |
| Source refs + version; no raw records/mail |
+--------------------------------------------+
                  | code: due + eligibility
                  | Jev: Next among equal due chef steps
                  v
+--------------------------------------------+
| NOW / CHEF / 09:10          Find > Tools > |
| Northstar / Chef / Owner: Restaurant       |
| Kitchen shift / Auto              Change > |
|--------------------------------------------|
| [A] 2x Chicken tikka                OPEN > |
|     Northstar / #41 / 09:11 / Next         |
|--------------------------------------------|
| [A] 1x Rice                         OPEN > |
|     Northstar / #41 / hot / due 09:11      |
|--------------------------------------------|
| [A] Call home                  DUE 09:12 > |
|     Personal / family reminder             |
|--------------------------------------------|
| [A] Reply to Arun              DUE 09:25 > |
|     Employer Sales / Mail #19              |
+--------------------------------------------+
  tap Call home -> Personal Gateway: recheck
+--------------------------------------------+
| PERSONAL / ACTION / Call home              |
| Source: Personal / due 09:12               |
| [Call]   [Done]   [Snooze]                 |
| < Back: same Chef Now + scroll             |
+--------------------------------------------+
  Tools > Kitchen display = launcher, not Inbox work
  Change > Personal = context, same cross-workspace list
  Ask "open kitchen display" -> Jev selects KDS Tool
      -> tap -> Gateway; no new Inbox row
~~~

**Entry** = source link + role + typed target + item/quantity + state + due + source version.  
**Inbox:Now** = Inbox actions + linked active status + selected Artifact pointers.

| Case | Rule |
| --- | --- |
| Source | Full facts and permissions stay there. Tap -> Gateway -> fresh facts and access check. |
| Sync | Source events idempotently upsert/retract entries. Completion or access change refreshes/removes them. No raw records or mail are copied. |
| One order | Separate chef lines and role entries for owner, cashier, courier and customer. A ready line stays as status until handoff, not a second obligation. |
| Delay | Keep known rows, mark Now partial/stale, never claim all-clear. |
| Context | Space supplies the header and may prioritize tools; source capabilities and roles decide tool eligibility. Switching context keeps all authorized work in Now; due Personal and office Actions can interleave. |
| Mail | Unread mail stays at source. Only an assigned, created or pinned reply enters Now; `Tools >` opens the authorized mailbox from any context. |

## Chef: order lines directly in Now

~~~text
+--------------------------------------------+
| NOW / 09:10                 Find > Tools > |
| Northstar / Chef / Owner: Restaurant       |
| Kitchen shift - Auto              Change > |
+--------------------------------------------+
| [A] 2x Chicken tikka             IN PREP > |
|     Northstar / #41 / hot / due 09:11      |
|--------------------------------------------|
| [A] Call home                  DUE 09:12 > |
|     Personal / family reminder             |
|--------------------------------------------|
| [A] 1x Rice                    NOT START > |
|     Northstar / #41 / hot / due 09:15      |
|--------------------------------------------|
| [S] 1x Salad                       READY > |
|     Northstar / #41 / cold / handoff       |
|--------------------------------------------|
| [A] 1x Soup                    NOT START > |
|     Northstar / #42 / hot / due 09:20      |
|--------------------------------------------|
| [A] Reply to Arun              DUE 09:25 > |
|     Employer Sales / Mail #19              |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+
~~~

`[A]` line -> prep Action; `[S]` ready line -> handoff status;
Chicken Action -> allergen Artifact. Source and parent stay in each row.

## Unit by role

| Person | Now row unit | Compact facts |
| --- | --- | --- |
| Individual | Personal task or reminder | Promise, due time, next Action |
| Chef | Order line or prep batch | Quantity, item, station, due, prep state |
| KDS operator | Ticket line or handoff | Ticket, course, station, time, readiness |
| Courier | Delivery step | Reach, collect, deliver, location, blocker |
| Cashier | Checkout, payment, register step | Order, amount/state, next Action |
| Floor service | Table or course handoff | Table, item/request, readiness, due |
| Restaurant owner | Decision or exception | Order/refund/purchase, impact, deadline |
| Customer | Order decision or receipt step | Order, receive/rate state, document |
| Salesperson | Lead, quote or follow-up | Party, promise, approval, due |
| Marketer | Campaign review or launch step | Draft, channel, policy gate, result |
| Retail seller | Checkout, return or register step | Cart, payment, stock, receipt |
| Supermarket receiver | Purchase line or expiry check | Quantity, location, batch, due |
| Taxi driver | Trip step | Pickup, route, fare state, settlement |
| Service technician | Booking or milestone | Visit, findings, acceptance, due |
| Warehouse picker | Order line or pack step | Quantity, bin, picked state |
| Buyer | Quote or purchase decision | Supplier, terms, approval, receipt |
| Finance worker | Invoice, payment or posting review | Amount, reference, balance, source |
| Support agent | Ticket response or escalation | Request, owner, deadline, guide |

**Unit** = one role-relevant line, step or decision; source owns the parent and
permissions. **Ready** = status until handoff; **closed** = history.

## Ordering with Jev

~~~text
time + routine + membership + source facts
                    |
      code: authorize role-specific units
                    |
      code: due, state, dependency, blocker
                    |
      Jev: soft rank within safe priority ties
           + relevant Artifact suggestion
                    |
      code: stable order + safe parent adjacency
                    |
            every unit in Now
~~~

| Decision | Authority |
| --- | --- |
| What exists, type, quantity, state, Action, permission | Source and code |
| Time zone, routine, hold, deadline, urgency, dependency | Code |
| Equal-priority fit to stated or recent intent | Jev Score judgment |
| Useful guide/report beside current work | Jev suggestion, source validation |
| Final order, labels, grouping, visibility | Code |

| When | Rule |
| --- | --- |
| Priority | Code orders overdue/due-now work and dependencies; Jev scores bounded ties using time, role, request, flow and recent activity. |
| Allowed | Mark an existing row **Next** or suggest a source-validated Artifact. |
| Never | Hide work, invent a target, set due time, grant access or commit an Action. |
| Fallback | Clear order -> skip Jev. Timeout/uncertainty -> stable code order. Cache by source version + context; freeze while reading/editing. |
| Scale | Full-set urgency + bounded tie scoring + progressive load on one logical scroll. |

TypeSafe: [State](https://docs.typesafe.ai/concepts/state),
[Score](https://docs.typesafe.ai/primitives/score),
[Confidence](https://docs.typesafe.ai/confidence).

### Core actions and Jev suggestions

| Candidate | Place in Now |
| --- | --- |
| Specific work with an actor and source instance: `Close register #4`, `Approve refund #18` | Inbox Action or Flow row; source owns state, due time and completion |
| Generic core verb: `Create invoice`, `Open POS`, `Switch workspace` | Authorized launcher in `Tools` or header; no Inbox obligation or work count |
| User-pinned generic verb | Shortcut in `Tools`; pinning a shortcut does not create work |
| Jev-proposed action from a request or current work | One optional suggestion; only a registered, permitted source Action may be opened or created after user choice and Gateway validation |

| Jev judgment | Visible result |
| --- | --- |
| Which equally urgent existing row best fits the person's current intent? | Mark one **Next**; retain all rows and code priority |
| Which registered core action matches an explicit request? | Offer one typed action/launcher with required fields; ask if ambiguous |
| Which authorized reference helps the active row? | Show one linked Artifact; never count it as work |

**Rule:** A core action enters Inbox only when it becomes a concrete human step in a source workflow. Jev never creates an Inbox row, deadline, assignment or workspace switch by itself. No clear benefit or low confidence -> show the stable list with no suggestion. Cache judgments by source version and context; refresh after a relevant change.

## List and navigation rules

| Case | Behavior |
| --- | --- |
| Many orders or tasks | Show every active line or step; keep siblings adjacent only when time priority allows |
| Other workspace urgent | Sort by time; show source and role; opening keeps current Space |
| Mine / Available / Waiting | All visible by default, each with state and blocker |
| Future dependent step | Visible as Waiting; opens status until eligible |
| Ready line in active order | Visible as status; no duplicate completion Action |
| Supporting Artifact | Adjacent reference row; excluded from work count |
| Partial load | Known rows persist, count marked incomplete, Retry visible |
| No work | Clear state only when every source loaded |
| Back | Same context, chosen filter and scroll position |
| Offline or stale | Last updated shown; commits needing fresh state disabled |

| Row type | Opens |
| --- | --- |
| `[A]` Action | Source Action form with exact facts and permitted verbs |
| `[F]` Flow | Saved Flow Book step, progress, blocker and result |
| `[#]` Artifact | Versioned viewer, source link, allowed share/export |
| `[S]` Status | Live detail, blocker and related authorized Actions |
| `[T]` Tool | Registered POS, KDS, mail or other source interface |

| Control | Rule |
| --- | --- |
| Row | `[type] title ... STATUS >` + source/parent/station/due/blocker line + divider; header and Ask stay reachable. |
| Find | Default = all authorized work. Applied filter = `Filtered: ... / Clear`; no context switch. |
| Scroll | Stable-key virtualization, progressive load, full-set urgency; due work crosses workspace boundaries. |
| Commit | Recheck at source Gateway; [commerce.md](commerce.md) owns its contract. |
| Payment | Customer self-pay waits for a verified adapter; cashier-recorded payment can advance receipt. |

## Now screens by person and time

Chef = detailed screen above. Other views:

~~~text
+--------------------------------------------+
| NOW / 15:05                 Find > Tools > |
| My Delivery Work / Courier / Owner: You    |
| Delivery run - Auto               Change > |
+--------------------------------------------+
| [A] Reach pickup #41             DUE NOW > |
|     My Delivery Work / #41 / 15:10         |
|--------------------------------------------|
| [S] Collect order #41               WAIT > |
|     My Delivery Work / #41 / shop prep     |
|--------------------------------------------|
| [S] Deliver order #41               WAIT > |
|     My Delivery Work / #41 / after pickup  |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 19:30                 Find > Tools > |
| Northstar / Customer / Owner: Restaurant   |
| Chosen until 20:00                Change > |
+--------------------------------------------+
| [A] Receive order #41            DUE NOW > |
|     Northstar / #41 / delivered            |
|--------------------------------------------|
| [S] Rate order #41                  WAIT > |
|     Northstar / #41 / after receipt        |
|--------------------------------------------|
| [#] Receipt #41                   ISSUED > |
|     Northstar / #41 / paid                 |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 08:20                 Find > Tools > |
| Northstar / Owner / Owner: Restaurant      |
| Morning review - Auto             Change > |
+--------------------------------------------+
| [A] Accept order #41             DUE NOW > |
|     Northstar / #41 / customer waits       |
|--------------------------------------------|
| [A] Review refund #18             REVIEW > |
|     Northstar / #18 / evidence ready       |
|--------------------------------------------|
| [A] Approve purchase #22           TODAY > |
|     Northstar / Purchase #22               |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 12:05                 Find > Tools > |
| Northstar / KDS lead / Owner: Restaurant   |
| Pass station - Auto               Change > |
+--------------------------------------------+
| [A] Fire mains #41               DUE NOW > |
|     Northstar / #41 / table 12             |
|--------------------------------------------|
| [A] Handoff ticket #40             READY > |
|     Northstar / #40 / pass station         |
|--------------------------------------------|
| [S] Ticket #42                      WAIT > |
|     Northstar / #42 / cold station         |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 14:40                 Find > Tools > |
| Northstar / Cashier / Owner: Restaurant    |
| Counter shift - Auto              Change > |
+--------------------------------------------+
| [A] Record payment #41           DUE NOW > |
|     Northstar / #41 / verified cash        |
|--------------------------------------------|
| [A] Checkout order #45              NEXT > |
|     Northstar / #45 / 3 lines              |
|--------------------------------------------|
| [F] Close register              STEP 1/4 > |
|     Northstar / counter / 20 min left      |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 12:30                 Find > Tools > |
| Northstar / Server / Owner: Restaurant     |
| Lunch floor - Auto                Change > |
+--------------------------------------------+
| [A] Serve table 12                 READY > |
|     Northstar / #52 / 2 dishes             |
|--------------------------------------------|
| [A] Deliver drinks / table 7        NEXT > |
|     Northstar / #57 / drinks ready         |
|--------------------------------------------|
| [A] Clear table 8                   OPEN > |
|     Northstar / table 8 / guests left      |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 20:30                 Find > Tools > |
| Personal / Individual / Owner: You         |
| Evening - Auto                    Change > |
+--------------------------------------------+
| [A] Pay electric bill            DUE NOW > |
|     Personal / Bill #6                     |
|--------------------------------------------|
| [A] Reply to Kayalvizhi        DUE 20:45 > |
|     Employer Sales / Mail #18              |
|--------------------------------------------|
| [S] Quote #12 approval              WAIT > |
|     Employer Sales / Lead #12 / manager    |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+
~~~

## Other business kinds

| Contract part | Rule |
| --- | --- |
| Parent | Order, lead, campaign, trip, booking, purchase, invoice or ticket |
| Work unit | Line, stop, decision, milestone, check or response |
| Projection | Eligible actor, permitted facts, state, blocker and due time |
| Destination | Registered Action, Flow Book, Artifact, detail or tool |
| Reference | Optional authorized evidence adjacent to the work |
| Renderer | Same flat Now rows, time order and source Gateway for any domain; examples below are sample data, not profession templates |

~~~text
+--------------------------------------------+
| NOW / 10:20                 Find > Tools > |
| Employer Sales / Seller / Owner: Employer  |
| Sales shift - Auto                Change > |
+--------------------------------------------+
| [A] Follow up lead #12             TODAY > |
|     Employer Sales / #12 / promised        |
|--------------------------------------------|
| [A] Send quote #12                 DRAFT > |
|     Employer Sales / #12 / prices ready    |
|--------------------------------------------|
| [#] Contract draft #12               REF > |
|     Employer Sales / #12 / current         |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 11:00                 Find > Tools > |
| Agency / Marketer / Owner: Employer        |
| Campaign work - Auto              Change > |
+--------------------------------------------+
| [A] Review campaign copy          REVIEW > |
|     Agency / Campaign #8 / approval        |
|--------------------------------------------|
| [F] Launch campaign             STEP 2/4 > |
|     Agency / Campaign #8 / checks          |
|--------------------------------------------|
| [#] Week performance report          REF > |
|     Agency / Campaign #8 / current         |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 14:05                 Find > Tools > |
| My Shop / Seller / Owner: You              |
| Counter shift - Auto              Change > |
+--------------------------------------------+
| [A] Checkout order #31           DUE NOW > |
|     My Shop / #31 / customer waits         |
|--------------------------------------------|
| [A] Process return #28            REVIEW > |
|     My Shop / #28 / inspected              |
|--------------------------------------------|
| [F] Close register              STEP 1/4 > |
|     My Shop / counter / shift end          |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 07:30                 Find > Tools > |
| Northstar Market / Stock / Owner: Market   |
| Receiving shift - Auto            Change > |
+--------------------------------------------+
| [A] Expiry check / aisle 4       DUE NOW > |
|     Northstar Market / before opening      |
|--------------------------------------------|
| [A] 12x Flour bags               RECEIVE > |
|     Northstar Market / #73 / dock A        |
|--------------------------------------------|
| [A] 8x Milk cartons              RECEIVE > |
|     Northstar Market / #73 / chilled       |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 18:10                 Find > Tools > |
| My Taxi Work / Driver / Owner: You         |
| Taxi shift - Auto                 Change > |
+--------------------------------------------+
| [A] Reach pickup #144            DUE NOW > |
|     My Taxi Work / #144 / passenger        |
|--------------------------------------------|
| [S] Start trip #144                 WAIT > |
|     My Taxi Work / #144 / after pickup     |
|--------------------------------------------|
| [S] Complete trip #144              WAIT > |
|     My Taxi Work / #144 / after ride       |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 09:45                 Find > Tools > |
| Field Service / Tech / Owner: Firm         |
| Visit #51 - chosen                Change > |
+--------------------------------------------+
| [A] Arrive at booking #51        DUE NOW > |
|     Field Service / #51 / customer         |
|--------------------------------------------|
| [F] Inspection #51              STEP 2/5 > |
|     Field Service / #51 / findings         |
|--------------------------------------------|
| [S] Customer signoff #51            WAIT > |
|     Field Service / #51 / after work       |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 06:50                 Find > Tools > |
| Fulfilment / Picker / Owner: Firm          |
| Pick shift - Auto                 Change > |
+--------------------------------------------+
| [A] 2x Blue mugs                 TO PICK > |
|     Fulfilment / #64 / bin B12             |
|--------------------------------------------|
| [A] 1x Kettle                    TO PICK > |
|     Fulfilment / #64 / bin C03             |
|--------------------------------------------|
| [S] Pack order #64                  WAIT > |
|     Fulfilment / #64 / after picks         |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 10:00                 Find > Tools > |
| Employer Ops / Buyer / Owner: Employer     |
| Buying work - Auto                Change > |
+--------------------------------------------+
| [A] Compare supplier quotes       REVIEW > |
|     Employer Ops / Purchase #22            |
|--------------------------------------------|
| [A] Approve purchase #22           TODAY > |
|     Employer Ops / Purchase #22            |
|--------------------------------------------|
| [S] Supplier confirmation           WAIT > |
|     Employer Ops / Purchase #22            |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 16:15                 Find > Tools > |
| Employer Ops / Finance / Owner: Employer   |
| Finance close - Auto              Change > |
+--------------------------------------------+
| [A] Issue invoice #88              READY > |
|     Employer Ops / #88 / fulfilled         |
|--------------------------------------------|
| [A] Match payment #72             REVIEW > |
|     Employer Ops / #72 / bank ref          |
|--------------------------------------------|
| [#] Cash report / today              REF > |
|     Employer Ops / source postings         |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+

+--------------------------------------------+
| NOW / 13:20                 Find > Tools > |
| Service Desk / Agent / Owner: Employer     |
| Support shift - Auto              Change > |
+--------------------------------------------+
| [A] Reply to customer #34      DUE 13:30 > |
|     Service Desk / #34 / due               |
|--------------------------------------------|
| [F] Escalation #34              STEP 1/3 > |
|     Service Desk / #34 / if unresolved     |
|--------------------------------------------|
| [#] Troubleshooting guide            REF > |
|     Service Desk / #34 / current           |
+--------------------------------------------+
| Ask TAR...                               > |
+--------------------------------------------+
~~~

## Acceptance

| Check | Expected result |
| --- | --- |
| Chef order with three lines | All three quantities and states visible, including ready line |
| Same order in another role | Only that role's steps and permitted fields visible |
| Work from several workspaces | One per-user Inbox feeds Now; each row keeps its source |
| Personal due during work | It interleaves by due time; active work context stays in header |
| Office mail during Personal time | Actionable reply appears in Now; full mailbox opens through Tools |
| Default view | No workspace filter bar; every eligible source is represented |
| Chosen filter | Visible cue and Clear; no change to source authorization |
| New business kind | Registered source units render without a new profession screen |
| 100+ work units | Complete one-scroll list, progressively loaded |
| Jev unavailable | Deterministic full list remains stable |
| Equal routine priority | Context chooser asks; cross-workspace work remains usable |
| Partial source | Known work stays; no false all-clear |
| Open and Back | Typed destination, source owner, restored list position |

**Current** = one Now screen, with Workspace in Tools and a flat Ask TAR row.
**Build** = source-event projection + Space composition + agent-targeted
eligibility + Jev tie rank.

**Opened screens below** = full facts/forms/controls + source owner;
Back -> prior Now context and scroll position.

## Opened screens for the examples

~~~text
DELIVERY / ACTION
+--------------------------------------------+
| < Now  Reach pickup #41                    |
| My Delivery Work / Courier                 |
| Owner: You                                 |
|--------------------------------------------|
| Pickup: Northstar / due 15:10              |
| Handoff not yet verified                   |
|--------------------------------------------|
| [Confirm arrival]                          |
| Route / next step                     >    |
+--------------------------------------------+

CHEF / ACTION
+--------------------------------------------+
| < Now  2x Chicken tikka / #41              |
| Northstar / Chef                           |
| Owner: Restaurant                          |
|--------------------------------------------|
| Hot station / due 09:11                    |
| State: preparing                           |
| Allergen guide #41                   >     |
|--------------------------------------------|
| [Mark ready]                               |
+--------------------------------------------+

CHEF / ARTIFACT
+--------------------------------------------+
| < Chicken  Allergen guide #41              |
| Northstar / Chef                           |
| Owner: Restaurant                          |
|--------------------------------------------|
| Verified guide / version 3                 |
| Source: recipe and product records         |
|--------------------------------------------|
| [Preview guide]                            |
| Order #41                            >     |
+--------------------------------------------+

CUSTOMER / ARTIFACT
+--------------------------------------------+
| < Now  Receipt #41                         |
| Northstar / Customer                       |
| Owner: Restaurant                          |
|--------------------------------------------|
| Issued after verified payment              |
| Version 1 / source invoice #41             |
|--------------------------------------------|
| [Open receipt]                             |
| Order status                         >     |
+--------------------------------------------+

OWNER / ACTION
+--------------------------------------------+
| < Now  Review refund #18                   |
| Northstar / Owner                          |
| Owner: Restaurant                          |
|--------------------------------------------|
| Payment and refundable balance   >         |
| Reason / source evidence         >         |
|--------------------------------------------|
| [Approve]  [Reject]                        |
| Result opens refund record           >     |
+--------------------------------------------+

OWNER / ARTIFACT
+--------------------------------------------+
| < Reports  Yesterday's sales               |
| Northstar / Owner                          |
| Owner: Restaurant                          |
|--------------------------------------------|
| Report / version 2                         |
| Source: orders, payments, postings         |
|--------------------------------------------|
| [Preview report]  [Export]                 |
| Live source totals                   >     |
+--------------------------------------------+

KDS / ACTION
+--------------------------------------------+
| < Now  Fire mains #41                      |
| Northstar / KDS lead                       |
| Owner: Restaurant                          |
|--------------------------------------------|
| Ticket #41 / table 12 / due now            |
| Course: mains / pass station               |
|--------------------------------------------|
| [Fire mains]                               |
| Kitchen display                      >     |
+--------------------------------------------+

KDS / TOOL
+--------------------------------------------+
| < Tools  Kitchen display                   |
| Northstar / KDS lead                       |
| Owner: Restaurant                          |
|--------------------------------------------|
| Pass station / 3 tickets                   |
| #40 READY / handoff                >       |
|--------------------------------------------|
| #41 Mains / due now               >        |
|--------------------------------------------|
| #42 Waiting / cold station        >        |
+--------------------------------------------+

CASHIER / FLOW
+--------------------------------------------+
| < Now  Close register                      |
| Northstar / Cashier                        |
| Owner: Restaurant                          |
|--------------------------------------------|
| Step 1 of 4 / count cash                   |
| Counted amount [             ]             |
| Expected total from register source        |
|--------------------------------------------|
| [Continue step]                            |
| Saved steps and result               >     |
+--------------------------------------------+

FLOOR / ACTION
+--------------------------------------------+
| < Now  Serve table 12                      |
| Northstar / Server                         |
| Owner: Restaurant                          |
|--------------------------------------------|
| Order #52 / 2 dishes ready                 |
| Table 12 / service due now                 |
|--------------------------------------------|
| [Confirm served]                           |
| Table and order details              >     |
+--------------------------------------------+
~~~

## Cross-context openings

| From Now | Opens |
| --- | --- |
| `Call home` during Chef | Personal Action; Back returns to Chef context and scroll |
| `Reply to Kayalvizhi` during Personal | Employer Sales Action for Mail #18; source checks access |
| `Tools > Office mail` during Personal | Full Employer Sales mailbox; ordinary mail stays at source |

~~~text
PERSONAL / ACTION
+--------------------------------------------+
| < Now  Call home                           |
| Personal / Individual / Owner: You         |
|--------------------------------------------|
| Due 09:12 / family reminder                |
| [Call]  [Done]  [Snooze]                   |
+--------------------------------------------+

OFFICE / ACTION
+--------------------------------------------+
| < Now  Reply to Kayalvizhi                 |
| Employer Sales / Seller / Owner: Employer  |
|--------------------------------------------|
| Mail #18 / due 20:45 / thread at source    |
| Draft reply [                       ]      |
| [Review and send]                          |
+--------------------------------------------+

TOOLS / CROSS-WORKSPACE
+--------------------------------------------+
| < Now  Tools                               |
| Personal / Individual / Owner: You         |
|--------------------------------------------|
| [T] Office mail                          > |
|     Employer Sales / full mailbox          |
|--------------------------------------------|
| [T] Shop POS                             > |
|     My Shop / authorized tool              |
+--------------------------------------------+

OFFICE MAIL / SOURCE TOOL
+--------------------------------------------+
| < Tools  Office mail                       |
| Employer Sales / Seller / Owner: Employer  |
|--------------------------------------------|
| Search mail / folders / unread           > |
| Mail #18 / Kayalvizhi                    > |
| Other mail stays in this source mailbox    |
+--------------------------------------------+
~~~

## Opened screens across business kinds

~~~text
SALES / ACTION
+--------------------------------------------+
| < Now  Send quote #12                      |
| Employer Sales / Seller                    |
| Owner: Employer                            |
|--------------------------------------------|
| Lead #12 / draft quote / version 2         |
| Prices resolved from active records        |
|--------------------------------------------|
| [Review and send]                          |
| Issued quote Artifact                 >    |
+--------------------------------------------+

MARKETING / ARTIFACT
+--------------------------------------------+
| < Now  Week performance report             |
| Agency / Marketer                          |
| Owner: Employer                            |
|--------------------------------------------|
| Week report / version 4                    |
| Source: verified campaign metrics          |
|--------------------------------------------|
| [Preview report]                           |
| Campaign #8                         >      |
+--------------------------------------------+

RETAIL / ACTION
+--------------------------------------------+
| < Now  Checkout order #31                  |
| My Shop / Seller                           |
| Owner: You                                 |
|--------------------------------------------|
| Cart: 3 lines / live server prices         |
| Stock and tax checked at commit            |
|--------------------------------------------|
| [Take payment]                             |
| Receipt Artifact                     >     |
+--------------------------------------------+

SUPERMARKET / ACTION
+--------------------------------------------+
| < Now  12x Flour bags                      |
| Northstar Market / Stock                   |
| Owner: Market                              |
|--------------------------------------------|
| Purchase #73 / dock A                      |
| Ordered 12 / received 0                    |
|--------------------------------------------|
| Received [12]  Location [Dock A]           |
| [Receive lines]                            |
+--------------------------------------------+

TAXI / ACTION
+--------------------------------------------+
| < Now  Reach pickup #144                   |
| My Taxi Work / Driver                      |
| Owner: You                                 |
|--------------------------------------------|
| Pickup / passenger waiting                 |
| Route and fare state from trip source      |
|--------------------------------------------|
| [Confirm pickup]                           |
| Settlement steps                    >      |
+--------------------------------------------+

SERVICE / FLOW
+--------------------------------------------+
| < Now  Inspection #51                      |
| Field Service / Tech                       |
| Owner: Firm                                |
|--------------------------------------------|
| Step 2 of 5 / inspect equipment            |
| Record findings [               ]          |
|--------------------------------------------|
| [Continue step]                            |
| Customer signoff                    >      |
+--------------------------------------------+

WAREHOUSE / ACTION
+--------------------------------------------+
| < Now  2x Blue mugs                        |
| Fulfilment / Picker                        |
| Owner: Firm                                |
|--------------------------------------------|
| Order #64 / bin B12                        |
| Picked 0 of 2                              |
|--------------------------------------------|
| Quantity [2]                               |
| [Confirm pick]                             |
+--------------------------------------------+

PROCUREMENT / ACTION
+--------------------------------------------+
| < Now  Compare supplier quotes             |
| Employer Ops / Buyer                       |
| Owner: Employer                            |
|--------------------------------------------|
| Purchase #22 / two source quotes           |
| Terms and prices checked at source         |
| Supplier quotes #22                  >     |
|--------------------------------------------|
| [Record comparison]                        |
| Approve purchase #22                >      |
+--------------------------------------------+

PROCUREMENT / ARTIFACT
+--------------------------------------------+
| < Compare  Supplier quotes #22             |
| Employer Ops / Buyer                       |
| Owner: Employer                            |
|--------------------------------------------|
| Two source quotes / versioned              |
| Terms and prices verified at source        |
|--------------------------------------------|
| [Compare documents]                        |
| Approve purchase #22                >      |
+--------------------------------------------+

FINANCE / ACTION
+--------------------------------------------+
| < Now  Match payment #72                   |
| Employer Ops / Finance                     |
| Owner: Employer                            |
|--------------------------------------------|
| Invoice #88 / bank reference found         |
| Amount and currency from source            |
|--------------------------------------------|
| [Review match]                             |
| Posting result                      >      |
+--------------------------------------------+

SUPPORT / ACTION
+--------------------------------------------+
| < Now  Reply to customer #34               |
| Service Desk / Agent                       |
| Owner: Employer                            |
|--------------------------------------------|
| Customer message / due 13:30               |
| Troubleshooting guide              >       |
|--------------------------------------------|
| Reply [                         ]          |
| [Send response]                            |
+--------------------------------------------+
~~~

## Inbox:Now sync cost (Turso Scaler)

One remote Inbox DB per user; Now reads locally. Illustrative monthly usage across all of a user's devices. **All usage is charged from the first unit in this estimate:** Scaler's included quotas are ignored as requested.

| User pattern | Stored | Writes / remote reads | Sync | Variable / user / mo | 1M users / mo* |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dormant | 0.5 MB | 0 / 0 | 0 MB | $0.00025 / ₹0.0240 | $274.92 / ₹26,363 |
| Personal (1 change/day) | 0.5 MB | 30 / 300 | 1 MB | $0.000524 / ₹0.0503 | $549.16 / ₹52,660 |
| Shift worker (10/day) | 2 MB | 300 / 3,000 | 10 MB | $0.003742 / ₹0.3589 | $3,767.32 / ₹3,61,255 |
| Busy, multiple devices (100/day) | 10 MB | 3,000 / 30,000 | 100 MB | $0.032424 / ₹3.1092 | $32,448.92 / ₹31,11,585 |
| Mixed: 20% / 50% / 25% / 5% above | — | — | — | $0.002869 / ₹0.2751 | **$2,893.84 / ₹2,77,496** |

*1M total includes the [Scaler](https://turso.tech/pricing) annual-billing base of $24.92/mo (₹2,390/mo). Mixed all-in cost = **$0.002894 / ₹0.2775 per user/mo** at 1M users. Scaler rates used: $0.50/GB stored, $0.80/billion rows read, $0.80/million rows written, $0.25/GB synced; unlimited DBs. Decimal GB; 1 MB = 0.001 GB. INR uses ₹95.8918/USD, the [25 Sep 2026 RBI reference rate](https://www.msei.in/markets/currency/historical-data/rbireferenceratearchives); before tax, FX fees and other services. Sync MB is an estimate to measure in a pilot; source workspace and Artifact costs are outside this Inbox estimate.
