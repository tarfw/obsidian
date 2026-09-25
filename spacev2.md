# Space: the right environment for the moment

> When my day changes, my Space changes with me.

| Item | Meaning |
|---|---|
| Status | Discussion proposal |
| Goal | Define Space, Inbox, switching, JEV, and the first proof |
| Architecture source | [tarv12.md](tarv12.md) remains the sole consolidated target |

## 1. The whole idea in one picture

~~~text
                         ONE PERSON
                             |
              +--------------+--------------+
              |                             |
        "What am I doing?"           "What needs me?"
              |                             |
      CONTEXT + WORKSPACE               SHARED WORK
              |                             |
              v                             v
     +-------------------+        +-------------------+
     |       SPACE       |        |       INBOX       |
     | tools for now     |        | my human actions  |
     | cards for now     |        | across my scopes  |
     | layout for now    |        | Mine / Available  |
     +-------------------+        +-------------------+
              |                             |
              +--------------+--------------+
                             |
                             v
                      +-------------+
                      |  ASK TAR /  |
                      |    CHAT     |
                      | request and |
                      | discuss     |
                      +-------------+
~~~

### Six small definitions

| Term | Compact meaning |
|---|---|
| Person | One human identity |
| Workspace | A governed place: personal, employer, business, team |
| Role | What the person may do inside that workspace |
| Context | What the person is doing now |
| Space | The tools and information useful in that context |
| Inbox | Human actions the person owns or may claim |

**Key rule:** context changes relevance. It never grants permission.

## 2. A day in Space

~~~text
05:00       09:00        12:00       15:00       18:00
Morning --> Kitchen --> Cashier --> Delivery --> Taxi
Personal    Restaurant   Restaurant   Independent   Independent

20:00                 22:00
Sales office -------> Sandwich shop
Employer              My business
~~~

| Time | Context | Workspace | Role | Owner | Space emphasizes | Inbox emphasizes |
|---|---|---|---|---|---|---|
| 05:00 | Morning | Personal | Individual | User | Routine, notes, yoga | Personal tasks and appointments |
| 09:00 | Kitchen | Northstar Restaurant | Chef | Restaurant operator | Station queue, recipe, stock | Assigned items, blockers, ready |
| 12:00 | Counter | Northstar Restaurant | Cashier | Restaurant operator | POS, bills, shift summary | Pay, correct, request approval |
| 15:00 | Delivery | My Delivery Work | Courier | User | Route, pickup, proof | Claim, reach, collect, deliver |
| 18:00 | Taxi | My Taxi Work | Driver | User | Requests, navigation, earnings | Accept, reach, start, finish |
| 20:00 | Sales | Employer's Sales Team | Sales employee | Employer | Leads, quotes, follow-ups | Reply, quote, seek approval |
| 22:00 | Shop | My Sandwich Shop | Owner / seller | User | Orders, POS, stock, close | Accept, prepare, buy, close |

### Ownership stays visible

~~~text
Northstar Restaurant
Role: Chef
Owner: Restaurant operator

My Sandwich Shop
Role: Owner / seller
Owner: You
~~~

A person may have many workspaces and roles. Records, authority, policies, and
money remain inside the workspace that owns them.

## 3. Concept screens

These are structure sketches, not final visual design.

### A. Morning Space

~~~text
+----------------------------------+
| 05:03  Morning             [v]   |
| Personal / Individual / You      |
|----------------------------------|
| Good morning                     |
|                                  |
| [ Start morning routine ]        |
|                                  |
| TODAY                            |
| 05:15  Yoga / 20 min      [Open] |
| 06:00  Prepare breakfast  [Done] |
| 08:30  Leave for work            |
|                                  |
| NOTE                             |
| Remember to order vegetables     |
|----------------------------------|
| Space        Inbox 2      Ask TAR|
+----------------------------------+
~~~

### B. Kitchen Space

~~~text
+----------------------------------+
| 09:07  Kitchen             [v]   |
| Northstar / Chef / Restaurant    |
|----------------------------------|
| GRILL STATION              4 open|
|                                  |
| Order 142 / due 09:12            |
| 2 burgers / item 2 no onion      |
| [Start] [Ready] [Problem]        |
|                                  |
| Order 145 / waiting for stock    |
| Order 146 / 1 grilled sandwich   |
|                                  |
| [Recipe] [Station stock]         |
|----------------------------------|
| Space        Inbox 4      Ask TAR|
+----------------------------------+
~~~

### C. One Inbox across authorized workspaces

~~~text
+----------------------------------+
| Inbox                            |
| [Mine 6] [Available 3] [Waiting] |
| Scope: Relevant now        [All] |
|----------------------------------|
| NOW / NORTHSTAR                  |
| Order 142 / Prepare grill items  |
| Due 09:12                 [Start]|
|                                  |
| LATER / EMPLOYER SALES           |
| Quote for Anaya Stores / 20:00   |
|                           [Open] |
|                                  |
| PERSONAL                         |
| Pay electricity bill / tomorrow  |
|                           [Open] |
|----------------------------------|
| Space        Inbox 6      Ask TAR|
+----------------------------------+
~~~

The default view follows the current context. **All** reveals every authorized
workspace. Urgent actions from another workspace may surface as a small alert,
but they do not replace the active Space.

### D. Customer order

~~~text
+----------------------------------+
| Order 142 / Northstar            |
|----------------------------------|
| Accepted                         |
| Preparing: grill + drinks        |
| Packing next                     |
|                                  |
| YOUR ACTION                      |
| Payment required / INR 420       |
| [Pay now]                        |
|                                  |
| Timeline                  [Chat] |
|----------------------------------|
| Space        Inbox 1      Ask TAR|
+----------------------------------+
~~~

## 4. One request becomes the right human steps

Restaurant is one example of the shared pattern for all commerce.

~~~text
CUSTOMER
Find restaurant -> order -> pay -> receive -> rate
                       |
                       v
                +--------------+
                | ORDER RECORD |
                +--------------+
                       |
       +---------------+----------------+
       |               |                |
       v               v                v
 ORDER DESK         KITCHEN          CUSTOMER
 accept/decline    make items        pay if due
                       |
              +--------+--------+
              |                 |
              v                 v
            GRILL             DRINKS
          make items         make items
              |                 |
              +--------+--------+
                       |
                       v
                    PACKING
                  pack + seal
                       |
                       v
                    COURIER
             claim -> reach -> collect
                    -> deliver
                       |
                       v
                    CUSTOMER
              confirm if needed -> rate
~~~

### The dependency path

~~~text
Order accepted
      |
      +--> Grill ready ----+
      |                    +--> Pack ready --+
      +--> Drinks ready ---+                 |
                                             +--> Pickup
Payment valid -------------------------------+      |
                                                    v
                                                 Deliver
                                                    |
                                                    v
                                           Receipt / rating
~~~

Payment timing is configured by the business or market. Rating is optional.

### Who sees what

| Participant | Inbox action | Sees |
|---|---|---|
| Owner / desk | Accept or decline | Full order and operating policy |
| Grill worker | Prepare grill items | Only required items and instructions |
| Drinks worker | Prepare drinks | Only required drinks and instructions |
| Packing worker | Pack and seal | Ready items and handoff details |
| Courier | Claim, reach, collect, deliver | Route and necessary handoff data |
| Customer | Pay, confirm when required, rate | Own order and progress |

### A microscopic work card

~~~text
+------------------------------------------------+
| Order 142 / Grill / Assigned to you            |
| Prepare: 2 burgers / no onion on item 2        |
| Due: 09:12 / Source: accepted order            |
|                                                |
| [Start]        [Mark ready]     [Report problem]|
+------------------------------------------------+
~~~

Split work only when the assignee, dependency, evidence, or completion rule
differs. The UI groups related steps so people see one clear job.

## 5. The Inbox model

> Inbox is the list of personal human actions that I am responsible for, or am
> allowed to claim.

~~~text
                      INBOX
                        |
          +-------------+-------------+
          |             |             |
        MINE        AVAILABLE       WAITING
   assigned to me   I may claim   blocked/pending
          |             |             |
          +-------> ACTIVE <-----------+
                        |
                 Done / cancelled
                        |
                     HISTORY
~~~

### One action contract

~~~text
Action
  subject       What this action is about
  workspace     Who governs it
  actor         Who may act
  state         waiting | ready | active | done
  prerequisite  What must be true first
  completion    Exact success condition
  evidence      Proof when required
  deadline      When it matters
  version       Prevent stale or duplicate action
~~~

| Rule | Behavior |
|---|---|
| Mine | Assigned directly to the person |
| Available | Claimable by an eligible pool; claim is atomic |
| Waiting | Visible when useful, but cannot be acted on yet |
| Cross-workspace | One list, grouped by workspace, with access checked per item |
| Customer / partner | Only actions for their transaction, never internal operations |
| Routine work | Preparation, delivery, approval, payment, and personal tasks belong here |
| Information | Status updates stay in timeline or chat unless a human action is required |
| Failure | Retry, reassign, escalate, compensate, or cancel using domain rules |
| Priority | Code handles deadlines and hard severity; JEV may rank semantic relevance |

The same action may appear in Space and Inbox. It is one action with two
projections, so completing either view updates both.

### The same core works across domains

| Domain | Example action chain |
|---|---|
| Supermarket | Accept -> pick aisles -> substitute -> pack -> deliver |
| Taxi | Accept -> reach rider -> start -> finish -> report issue |
| Sales | Qualify -> contact -> quote -> approve -> follow up |
| Service | Diagnose -> quote -> schedule -> perform -> verify |
| Return | Request -> approve -> collect -> inspect -> refund |
| Personal | Plan -> remind -> perform -> confirm |

## 6. How Space switches

Confirmed behavior: **switch automatically when clear; ask when uncertain**.

~~~text
time + schedule + location + activity + user choice
                         |
                         v
              +----------------------+
              | CONTEXT RESOLUTION   |
              | code + narrow JEV    |
              +----------------------+
                         |
             +-----------+-----------+
             |                       |
          CLEAR                    UNCERTAIN
             |                       |
             v                       v
       switch Space          ask one small question
             |                       |
             +-----------+-----------+
                         |
                         v
           show context + workspace + role
                         |
                         v
              [Change] [Hold this Space]
~~~

### Stability rules

| Situation | Behavior |
|---|---|
| User selects a Space | Immediate deterministic switch |
| Strong schedule or activity evidence | Automatic switch |
| Two plausible contexts | Ask once |
| User is editing, paying, or submitting | Do not interrupt |
| Signal flickers | Require stability before switching |
| Manual hold | Keep selected Space until released or expired |
| Draft exists | Preserve and restore it |
| Workspace changes | Recheck role and access before showing data |

## 7. JEV: judgment where code lacks common sense

~~~text
                         INPUT
          schedule + activity + visible facts
                           |
             +-------------+-------------+
             |                           |
        EXACT FACT?                SEMANTIC QUESTION?
             |                           |
             v                           v
           CODE                         JEV
 permissions, money,          choose / understand / score
 state, prerequisites                    |
             |                           |
             +-------------+-------------+
                           |
                           v
                  CODE validates result
                           |
                           v
                   render or commit
~~~

| Primitive | Best use in Space |
|---|---|
| Choice | Pick the most plausible context or relevant component |
| Noul | Turn user language into a typed condition, category, or intent |
| Score | Rank components or Inbox actions by semantic relevance |
| Code | Access, money, state transitions, deadlines, prerequisites, side effects |

### Example judgments

| Question | Mechanism |
|---|---|
| “The user tapped Kitchen” | Code |
| “Does this activity look like kitchen work?” | JEV Choice |
| “What kind of problem did the worker report?” | JEV Noul |
| “Which allowed cards are most relevant now?” | JEV Score |
| “May this chef view order 142?” | Code |
| “Is payment complete?” | Code |
| “Can this order move to pickup?” | Code |

JEV returns typed judgments and probabilities. Code owns authority and effects.
A known order can run from acceptance to delivery with zero additional JEV calls.

## 8. Compact backend

~~~text
request / event / schedule
           |
           v
       collect facts
           |
           v
 resolve context -----------+
 code first                 |
 JEV if ambiguous           |
           |                |
           v                |
 validate workspace + role  |
           |                |
           v                |
 load allowed components <--+
           |
           v
 rank only when useful
           |
           v
      compose Space
           |
           +--> Space projection
           +--> Inbox projection
           +--> timeline / chat
~~~

### Minimal shared objects

| Object | Purpose |
|---|---|
| Context | Current activity, workspace, role, evidence, confidence, hold |
| Component | Allowed reusable tool or card with typed inputs |
| Action | Human step contract shown in Inbox and Space |
| Process | Domain state and dependencies that create actions |
| Assessment | Cached JEV result with input version, confidence, and expiry |

### Efficiency rules

~~~text
known fact -> code
same input -> cached assessment
same composition -> no rebuild
ambiguous meaning -> one batched JEV call
confirmed result -> remember until evidence changes
offline -> last safe Space + deterministic actions
~~~

## 9. Example JEV cost per person

Assumptions:

- 30-day month using the day shown above.
- Price: **$0.042 per 1 million input tokens**.
- Example conversion: **$1 = INR 95.85**.
- Output and ordinary backend/database costs are excluded.

| Work | Calls / month | Input tokens | USD | INR |
|---|---:|---:|---:|---:|
| Known transitions handled by code | 0 | 0 | $0 | INR 0 |
| Ambiguous context decisions | 30 | 30,000 | $0.00126 | INR 0.121 |
| Changed Space compositions | 60 | 180,000 | $0.00756 | INR 0.725 |
| Ambiguous Inbox interpretation | 90 | 135,000 | $0.00567 | INR 0.543 |
| Ordinary Space / Inbox opens | 0 | 0 | $0 | INR 0 |
| **Estimated total** | **180** | **345,000** | **$0.01449** | **INR 1.39** |

Heavy example: **1,035,000 input tokens = $0.04347 = about INR 4.17**.

The economic design is simple: JEV resolves ambiguity once; deterministic code
reuses the result for every view and workflow step.

## 10. First proof

Build one thin end-to-end slice:

~~~text
Customer chat
     |
     v
Restaurant order
     |
     v
Owner accepts
     |
     +--> Grill action
     +--> Drinks action
             |
             v
        Packing action
             |
             v
        Courier actions
             |
             v
      Customer receives
~~~

Then prove one person can move through:

~~~text
Morning Personal -> Restaurant Kitchen -> Restaurant Cashier
        -> Independent Delivery -> Own Sandwich Shop
~~~

### Proof checks

| Check | Success |
|---|---|
| Relevance | Useful tools appear without manual hunting |
| Safety | No context switch expands access |
| Stability | Space does not flicker or interrupt active work |
| Completeness | Every required human step reaches the right Inbox |
| Microscopic work | Stations receive only the details needed |
| Cross-workspace | Personal and rare outside actions remain reachable |
| Recovery | Reassign, retry, escalation, and cancellation are visible |
| Cost | Most opens and known transitions use zero JEV |

## 11. Decisions captured

| Topic | Decision |
|---|---|
| Space | A context-driven composition of tools and information |
| Switching | Automatic when clear; ask when uncertain; visible override and hold |
| Inbox | One list of personal human actions across authorized scopes |
| Inbox views | Mine, Available, Waiting, History; current context first, All available |
| Routine work | Included when a human must act |
| Updates | Timeline or chat unless action is required |
| Conversations | Ask TAR / Chat |
| Workspace identity | Always show workspace, role, and owner |
| JEV | Narrow typed semantic judgments; batch and cache |
| Authority | Deterministic code validates access, state, money, and effects |
| First proof | Restaurant order through stations, courier, and customer |

### Product test

At any moment the user should understand three things in a few seconds:

1. **Where am I working?**
2. **What matters now?**
3. **What action needs me next?**
