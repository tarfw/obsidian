# Tools & Flows - Architecture & Vocabulary

## Idea in one line

People write plain text. Jev (TypeSafe System One) answers narrow yes/no
questions about it. Code decides, the owner confirms, and the result is saved.
Jev suggests; it never grants or publishes on its own.

```text
 PLAIN TEXT  ->  JEV JUDGES  ->  CODE CHECKS  ->  OWNER CONFIRMS  ->  SAVED
 (brief or       (Noul/Choice/    (rules, limits,   (one tap, edit      (Turso rows,
  description)    Score, ~100ms)   thresholds)       if wanted)         R2 files)
```

---

## Terms

| Term   | Meaning                                    | Example                  | Identifier |
| :----- | :----------------------------------------- | :----------------------- | :--------- |
| Tools  | The screen / chip with everything you use  | `[ Tools ]`              | `tools`    |
| Tool   | One standalone app                         | Point of sale            | `tool`     |
| Flow   | A reusable multi-step process              | Store Closing            | `flow`     |
| Run    | One live, resumable use of a flow          | Closing, step 2 of 4     | `run`      |
| Step   | One stage inside a flow                    | Count cash               | `step`     |
| Brief  | Owner's plain text about a person or org   | "Kanimozhi runs the counter" | `brief`    |
| Access | The tools and flows a person can open      | Kanimozhi: POS, Closing      | `access`   |
| Member | A person authorized in a workspace         | Cashier, Manager         | `member`   |

Changes from prior drafts:

| Before                  | Now      | Why                                                 |
| :---------------------- | :------- | :-------------------------------------------------- |
| Grant                   | Access   | Plain word; owners already say "give access"        |
| Resolver, Security Floor| (removed)| Jev is the engine, code is the rule; no new nouns   |
| "Noul" called a typo    | Noul     | Noul is a real TypeSafe yes/no probability question |

Jev question types used:

| Type   | Answer            | Used for                                  |
| :----- | :---------------- | :---------------------------------------- |
| Noul   | Chance of yes 0-1 | Does this person need this tool?          |
| Choice | One of a set      | Which step kind fits this step?           |
| Score  | Degree on levels  | Lead fit, risk level                      |

---

## Complete Tools Catalog & Kinds

Work in TAR is shared between software (**`tool`**), people (**`human`**), communication (**`channel`**), checklists (**`flow`**), and the online store (**`site`**).

Safety rule: Any step or tool touching **`money`** or **`customer`** **always asks the owner first** before acting.

| Tool | Kind | What it does |
| :--- | :--- | :--- |
| **`pos`** (Point of sale) | `tool` | Fast counter sales, cart items, barcode scan, instant receipt |
| **`register`** (Cash drawer) | `tool` | Open shift, log cash in/out, count physical cash, close drawer |
| **`item`** (Products) | `tool` | Add/edit products, photos, variants, units, and prices |
| **`inventory`** (Stock) | `tool` | Count stock, record damage/wastage, and branch transfers |
| **`order`** (Orders) | `tool` | Take customer orders, reserve stock, track delivery status |
| **`invoice`** (Billing) | `tool` | Issue commercial bills or GST-ready invoices |
| **`payment`** (Payments) | `tool` | Record Cash/UPI/Card received or issue customer refunds |
| **`expense`** (Expenses) | `tool` | Log daily shop expenses (tea, packing materials, travel, fuel) |
| **`purchase`** (Purchases) | `tool` | Create supplier purchase orders and request quotes |
| **`members`** (Team) | `tool` | Manage staff, roles (cashier, packer), and tool permissions |
| **`contact`** (Contacts) | `tool` | Save customer, supplier, and vendor phone numbers |
| **`human`** (You do / Person) | `human` | Physical or manual work (count cash, pack box, call customer, lock shop) |
| **`flow`** (Checklist) | `flow` | Run or create repeatable shop routines (Opening, Closing, Handover) |
| **`site`** (Online store) | `site` | Autopilot storefront, live catalog sync, and WhatsApp orders |
| **`inbox`** (Team feed) | `channel` | Native zero-cost task feed for owner and staff (Mine, Available, Waiting) |
| **`chat`** (WhatsApp Chat) | `tool` | Manual 1-tap chat on phone, pre-filled text or bill link via `wa.me` (₹0.00) |
| **`whatsapp`** (WhatsApp API) | `channel` | Automated customer invoices, tracking & alerts via Meta Cloud API (Utility ₹0.115+GST) |
| **`telegram`** (Team alerts) | `channel` | Free internal shop notifications, low-stock pings, and closing reports |

### Tool & Work Kinds Explained

| Kind | Shown as | Who acts | Role in business |
| :--- | :--- | :--- | :--- |
| **`human`** | **You do** | Person | Physical or subjective actions (pack parcel, lock shutter, count cash, call) |
| **`tool`** | **App does** | Code / App | Atomic software transactions (record sale, adjust stock, issue invoice) |
| **`channel`** | **Send** | Gateway | Communication router (WhatsApp for customers; Inbox/Telegram for team) |
| **`flow`** | **Checklist** | Member + App | Step-by-step operational process connecting human and app steps |
| **`site`** | **Store** | AI + Edge | Public customer-facing storefront served at edge ($0/visit) |

---

## Access Hierarchy & Brief Resolution

Access is resolved in two clean tiers using Jev:

```text
 1. WORKSPACE LEVEL (On creation or update)
    Owner writes business brief -> Jev activates Tools & Flows for workspace
                                    |
                                    v
 2. MEMBER LEVEL (When inviting or managing a member)
    Owner writes member brief   -> Jev suggests member Access from workspace pool
                                    |
                                    v
    Owner confirms with [ Save ] -> Deterministic Access stored
```

Note on Workspaces:
- **Personal workspace**: Created automatically on signup (1 per user). Holds private tools and notes.
- **Work workspaces**: Created by owners as needed. Holds shared tools, flows, and team members.
- **Members**: A standard tool (`members`) in Tools & Flows that owners use to manage the team and role briefs.

### Member Access Resolution

One request, many small Noul questions, all run in parallel (~100ms).
One question per tool or flow active in the workspace:

```text
state:    { brief: "Kanimozhi handles counter sales, takes payments,
                    closes the drawer at night." }
question: "Does `brief` say this person needs {tool.description}?"
```

Code reads each answer with two thresholds:

| Noul value | Meaning  | Shown to owner          |
| :--------- | :------- | :---------------------- |
| >= 0.80    | On       | Pre-ticked              |
| 0.20-0.80  | Unsure   | "Ask me", unticked      |
| <= 0.20    | Off      | Hidden under "More"     |

```text
 Kanimozhi - Cashier                     [ Save ]
 [x] Point of sale          0.97
 [x] Cash drawer & shift    0.93
 [x] Store Closing (flow)   0.91
 [ ] Members & chat (tool)  0.55   ask me
     More: Supplier invoices, Settings ...
```

Rules kept in code:
- Sensitive tools (money out, settings, owner data) are never pre-ticked.
- The owner's Save is what writes `access`. Jev's number is a suggestion.
- Raw Noul values are saved, so changing a threshold needs no new Jev call.
- Role (owner/admin/member/guest) limits what Jev may even suggest.

---

## Create a Flow (simple)

Principle: **start from something that exists.** Jev only picks from the owner's
own list of tools. Nothing is written by AI. The owner sees a plain checklist,
fixes any line, and taps Save.

Three ways to start (the first is what most people use):

| Way               | Owner does                         | Jev / code does                              |
| :---------------- | :--------------------------------- | :------------------------------------------- |
| Ready flow        | Taps "Closing the shop"            | Nothing. Ready flows are stored, no AI call  |
| Say your steps    | Speaks or types, one step per line | 1 Jev request matches each line to a tool    |
| Copy a flow       | Taps a flow they already have      | Nothing. Edit the copy                       |

Ready flows are suggested when a workspace is created, from the same business
brief that picks its tools. A baker sees "Opening", "New order", "Closing".

```text
  1 SAY        Owner speaks or types the steps. Any language, one per line.
                 "Count the cash"
                 "Check the stock"
                 "Send the day report to owner"
                       |
  2 SPLIT      Code: one line = one step. Order is exactly as written.
    (code)     A single run-on paragraph is cut at full stops and line breaks;
               the owner sees the cut and can fix it.
                       |
  3 MATCH      Jev, ONE request, ONE Choice per line:
    (Jev)        "Which of these does this line?"  your tools,
                 plus  "a person does this"  and  "nothing fits"
                       |
           top >= 0.80          -> App step
           person / nothing     -> "You do" step, owner's own words
           otherwise            -> two big buttons: top 2 tools + "I'll do it"
                       |
  4 CHECK      Code: tools exist, <= 12 steps, straight list (no loops),
    (code)     steps that contact a customer or spend money get "Asks you first".
                       |
  5 SAVE       Owner checks the list, taps [ Save and use ]. Done.
```

How Jev decides from the owner's list:

```text
state:     { line: "send the day report to owner",
             tools: { whatsapp: "Send a WhatsApp message",
                      email:    "Send an email",
                      stock:    "Check stock levels", ... } }
question:  Choice  "Which entry performs `line`?"
options:   one per tool, plus  person: "A person does this by hand"
                          and  none:   "Nothing listed does this"
answer:    whatsapp 0.86  email 0.09  person 0.03  none 0.02
code:      top >= 0.80   -> use it
           top <  0.80   -> ask: top 2 tools + "I'll do it"
           person / none -> "You do" step
```

Simple on purpose:
- **No AI writing.** A line nothing matches is kept as the owner's own words.
  No gap-filling model call, no second check, no invented steps.
- **One question per line.** Every line runs in parallel in one request (~100ms),
  so 3 lines or 12 cost about the same.
- **Numbers stay hidden.** Owners never see 0.86. They see an app name or two buttons.
- **Safety is a rule, not a guess.** Each tool has a fixed `reach` set by us:
  `none`, `customer`, `money` or `data`. `customer` and `money` tools always
  ask the owner first. Jev cannot change this.
- **Only tools this team may use** are in the list (access first).
- **Large lists:** Choice the area first, then the tool.
- **Edit re-asks only changed lines.** Raw answers are saved (`assessments`).
- **No Jev or no key:** every line becomes a "You do" step. The flow still works.

What each part does:

| Part  | Does                                   | Never does                        |
| :---- | :------------------------------------- | :-------------------------------- |
| Code  | Splits lines, limits, safety asks      | Interpret meaning                 |
| Jev   | Picks the tool for each line           | Write text, invent a tool, save   |
| Owner | Fixes a line, picks, saves             | -                                 |

### How Step Inputs and Outputs Work (No LLM Plumbing)

**Are LLMs used to plan inputs and outputs between tools? NO.**

Having an LLM guess or write dynamic JSON mapping between steps is fragile, slow (~2s), and prone to hallucinations. Instead, TAR uses **Deterministic Typed Slots**:

```text
  Step 1 (POS Tool)      ──writes──►  run.data.expected = 142000
  Step 2 (You do: count) ──writes──►  run.data.actual   = 142000
  Step 3 (Check Cash)    ──reads───►  compares actual vs expected (pure code)
  Step 4 (Day Summary)   ──reads───►  packs summary into Inbox / notification
```

1. **Shared Run Context (`run.data`)**: Every flow run has an active typed record stored in Turso (`runs`). 
2. **Standard Records**: Tools read and write directly to canonical workspace records (`item`, `order`, `shift`, `cash`). They do not wire proprietary APIs to each other.
3. **No Schema Hallucinations**: Because code binds known slots, flows never break due to unexpected field renames or model drift.

### Channel Rule: Customer vs Team (Cost Control)

WhatsApp has two distinct paths:
1. **`chat` (Manual WhatsApp)**: **₹0.00 cost**. Opens merchant's phone WhatsApp app via `wa.me` deep-link. Manual 1-on-1 customer or vendor communication.
2. **`whatsapp` (Official Meta API)**: **Utility: ₹0.115 + GST / msg**; **Service: first 1,000 free / month**. Pre-approved transactional templates only (PDF bills, tracking).

| Audience | Allowed Channels | Why |
| :------- | :--------------- | :-- |
| **Customers** | **`whatsapp`** (API), **`chat`** (Manual), SMS | High trust, high open rate; ₹0.115 pays for itself in order conversion |
| **Team / Internal** | **`tarapp` Inbox** (default), **Telegram**, **Discord**, **Slack** | **₹0.00 cost**. Native Inbox keeps tasks organized by role. Telegram bots & Discord/Slack webhooks provide free push notifications without per-message bills |

---

Step kinds in v1 (three, in the owner's words):

| Kind  | Shown as    | Who acts                                  |
| :---- | :---------- | :---------------------------------------- |
| event | Starts when | Tap, a time of day, or a tool signal      |
| human | You do      | A person does it and taps Done            |
| tool  | App does    | A tool does a fixed action                |

Later, not in v1 (add when real owners ask): `typesafe` steps (a Jev judgment
inside a run) and `agent` steps (open-ended AI work). Each needs its own
question, thresholds and review, which is the complexity v1 avoids.

Cost per new flow:

| Call      | Count      | When                                    |
| :-------- | :--------- | :-------------------------------------- |
| Jev match | 1 request  | Only when the owner says their own steps|
| LLM       | 0          | Not used in v1                          |

---

## Flow Examples

Straight lists, 3 to 7 steps, plain words.

### 1. Closing the shop

```text
+---+------------------------+----------+------------------------------+
| # | Step                   | Kind     | Note                         |
+---+------------------------+----------+------------------------------+
| 1 | Count the cash drawer  | human    | Type the amount              |
| 2 | Check the stock        | tool     | Stock                        |
| 3 | Send the day report    | tool     | Inbox / Telegram             |
| 4 | Lock the shop          | human    | Tap Done                     |
+---+------------------------+----------+------------------------------+
```

### 2. New order (bakery, restaurant)

```text
+---+------------------------+----------+------------------------------+
| # | Step                   | Kind     | Note                         |
+---+------------------------+----------+------------------------------+
| 1 | Order arrives          | event    | Customer order               |
| 2 | Accept the order       | human    | Accept or reject             |
| 3 | Prepare and pack       | human    | Kitchen                      |
| 4 | Hand over / deliver    | human    | Counter or courier           |
| 5 | Take payment           | tool     | Point of sale                |
+---+------------------------+----------+------------------------------+
```

### 3. Sales follow-up

```text
+---+------------------------+----------+------------------------------+
| # | Step                   | Kind     | Note                         |
+---+------------------------+----------+------------------------------+
| 1 | Enquiry arrives        | event    | Lead form or WhatsApp        |
| 2 | Call the customer      | human    | Notes                        |
| 3 | Send the price         | tool     | WhatsApp - asks you first    |
| 4 | Book a visit           | tool     | Calendar                     |
| 5 | Note the result        | human    | Won or lost                  |
+---+------------------------+----------+------------------------------+
```

---

## Storage: reuse the current schema

No new tables. See [schema.ts](tarharness/src/db/schema.ts).

| Concept          | Stored in                   | How                                          |
| :--------------- | :-------------------------- | :------------------------------------------- |
| Person / member  | `records` type=`party`      | `data`={kind,role,workrole,brief,access}     |
| Flow             | `definitions` kind=`flow`   | `data`={slug,kind,steps}; draft until publish|
| Published flow   | `editions`                  | Frozen copy; runs pin `flow_version`         |
| Run              | `runs`                      | `record_id`=party; `action_id`=current step  |
| Step history     | `steps` + `events`          | Existing append-only trail                   |
| Jev answers      | `assessments`               | kind=`access` or `flow`; raw Noul values     |
| Consent          | `consents`                  | Already exists                               |

`assessments` already holds `evidence`, `questions`, `answers`, `model`,
`expires`, so Jev results are cached, auditable and re-thresholdable.

Turso vs R2:

| Data                                  | Where | Why                               |
| :------------------------------------ | :---- | :-------------------------------- |
| People, flows, runs, access, answers  | Turso | Small, queried, synced            |
| Briefs, flow descriptions (short)     | Turso | Inside `data`                     |
| Briefing docs, transcripts, files     | R2    | Large, write-once, rarely queried |

R2 pointer: `records` type=`artifact`, `data`={key,hash,size,mime},
tied to a run or party by `links`. Key: `workspace/run/hash`.

Legacy columns (`flow_id`, `record_id`) break the one-word rule; leave them.
New names stay one word (`access`, `workrole`).

---

## Screen Previews

### 1. Workspace Switcher & Settings

```text
+--------------------------------------------------+
| Workspaces                                   [X] |
+--------------------------------------------------+
| WORK WORKSPACES                                  |
|  [*] Northstar Restaurant                        |
|      Role: Owner                                 |
|                                                  |
|  [ ] Valley Supply Co                            |
|      Role: Member                                |
|                                                  |
| PERSONAL (Default, 1 per user)                   |
|  [ ] Kayalvizhi                                  |
|                                                  |
|--------------------------------------------------|
| [ + Create new workspace ]                       |
+--------------------------------------------------+
```

### 2. New Workspace (preview)

```text
+--------------------------------------------------+
| New workspace                             [Cancel]|
+--------------------------------------------------+
| Name: [ Northstar Cafe                         ] |
|                                                  |
| Describe what this business does:                |
| "A small bakery cafe serving espresso, pastry,   |
|  and take-out breakfast sandwiches."             |
|                                      [ Setup ]   |
|--------------------------------------------------|
| Suggested Tools & Flows (Jev System One):        |
|  [x] Point of sale                     0.98      |
|  [x] Cash drawer & shift               0.95      |
|  [x] Store Closing (flow)              0.92      |
|  [x] Stock & ingredients               0.88      |
|  [x] Members (tool)                    0.85      |
|  [ ] Table reservations                0.45      |
|--------------------------------------------------|
|                         [ Edit ]  [ Create ]     |
+--------------------------------------------------+
```

### 3. Members List (Opened via Tools -> Members)

```text
+--------------------------------------------------+
| Members                                     [ + ]|
+--------------------------------------------------+
| SEARCH: [ Search members...                    ] |
|--------------------------------------------------|
| Kayalvizhi (Owner)                               |
|  Full access - 8 tools, 3 flows                  |
|                                                  |
| Kanimozhi (Cashier)                              |
|  Counter sales - 2 tools, 1 flow                 |
|                                                  |
| Elilarasi (Kitchen lead)                         |
|  Orders & inventory - 3 tools                    |
|                                                  |
| Valarmathi (Pending invite)                      |
|  Brief: "Weekend pastry chef"                    |
|--------------------------------------------------|
| [ + Add member ]                                 |
+--------------------------------------------------+
```

### 4. Member Access & Brief (preview)

```text
+--------------------------------------------------+
| Member: Kanimozhi                         [Cancel]|
+--------------------------------------------------+
| Name: Kanimozhi       Role: Member               |
| Email: kanimozhi@example.com                     |
| Workrole: cashier                                |
|                                                  |
| Role Brief:                                      |
| "Kanimozhi handles counter sales, takes payments,|
|  and closes the cash drawer at night."           |
|                                     [ Re-eval ]  |
|--------------------------------------------------|
| SUGGESTED ACCESS (from workspace pool via Jev)   |
|  [x] Point of sale                     0.97      |
|  [x] Cash drawer & shift               0.93      |
|  [x] Store Closing (flow)              0.91      |
|  [ ] Members (tool)                    0.25  off |
|                                                  |
|  [v] Show 5 unassigned workspace tools & flows   |
|--------------------------------------------------|
|                         [ Discard ]  [ Save ]    |
+--------------------------------------------------+
```

### 5. Inbox Screen

```text
+--------------------------------------------------+
| Inbox                                            |
+--------------------------------------------------+
| UP NEXT                                          |
|  Prepare next order                              |
|  Shift handover checklist                        |
|                                                  |
|                    [ Tools ]                     |
+--------------------------------------------------+
| Ask TAR...                                     > |
+--------------------------------------------------+
```

### 6. Tools Screen

```text
+--------------------------------------------------+
| Tools                                        ... |
+--------------------------------------------------+
| [A] Aambal Neyvagam                          v |
|     Cashier                                      |
+--------------------------------------------------+
| ACTIVE FLOWS                                     |
|  > Store Closing - Step 2 of 4 (Count Cash)      |
+--------------------------------------------------+
| TOOLS                                            |
|  Point of sale                                   |
|  Members                                         |
+--------------------------------------------------+
| AVAILABLE FLOWS                                  |
|  Sales Flow 01                                   |
|  [ + New flow ]                                  |
+--------------------------------------------------+
```

### 7. New Flow (preview) - two screens

7a. Start

```text
+--------------------------------------------------+
| New flow                                  [Cancel]|
+--------------------------------------------------+
| START WITH A READY ONE                           |
|  [ Closing the shop ]   [ Opening the shop ]     |
|  [ New order ]          [ Daily stock check ]    |
|--------------------------------------------------|
| OR SAY YOUR STEPS, ONE PER LINE            [Mic] |
|  Count the cash                                  |
|  Check the stock                                 |
|  Send the day report to owner                    |
|                                      [ Next ]    |
+--------------------------------------------------+
```

7b. Check and save (one screen: match, fix, save)

```text
+--------------------------------------------------+
| Closing the shop                       [ Rename ]|
+--------------------------------------------------+
| 1  Count the cash            You do          [..]|
| 2  Check the stock           App: Stock      [..]|
| 3  Send the day report       App: Telegram       |
|                              (or Inbox)      [..]|
| 4  "update the register"     Pick one:           |
|     [ Stock ]  [ Cash book ]  [ I'll do it ]     |
| 5  Lock the shop             You do          [..]|
|                                                  |
| [ + Add a step ]                                 |
|--------------------------------------------------|
|                [ Save and use ]                  |
+--------------------------------------------------+
```

Each `[..]` lets the owner edit the words, move the line, or remove it. Save
publishes the flow at once; editing later makes the next version quietly, and
runs already started keep the version they began with.

### 8. Live Flow Run (preview)

```text
+--------------------------------------------------+
| Store Closing - Run #142                  [Pause]|
+--------------------------------------------------+
| Flow: Store Closing (v1)   Actor: Kanimozhi      |
| Started: 21:40            Status: Active         |
|--------------------------------------------------|
| [x] Step 1: Register snapshot (tool: pos)        |
|                                                  |
| [*] Step 2: Count physical cash (human)          |
|     Drawer expected: ₹14,200                     |
|     Actual count:   [₹14,200       ]             |
|     [ Submit & Next Step ]                       |
|                                                  |
| [ ] Step 3: Check the cash (tool)                |
| [ ] Step 4: Lock register & summary (tool)       |
+--------------------------------------------------+
```
