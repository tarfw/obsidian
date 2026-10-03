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
| Brief  | Owner's plain text about a person or org   | "Priya runs the counter" | `brief`    |
| Access | The tools and flows a person can open      | Priya: POS, Closing      | `access`   |
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
state:    { brief: "Priya handles counter sales, takes payments,
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
 Priya - Cashier                         [ Save ]
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

## Create a Flow from a description

Principle: Jev selects from what exists. The LLM writes only what does not.
Code keeps order, limits and safety. Owner confirms.

```text
 1 DESCRIBE   "When a lead comes in, look up the company, score it,
               email them, book a call, then update the CRM."
                      |
 2 SPLIT      Code cuts the text into clauses, in the order written.
   (code)     6 clauses = 6 candidate steps. Order is never guessed.
                      |
 3 MATCH      Jev, ONE parallel request, per clause:
   (Jev)        - Choice over the catalog + "none"   -> which tool
                - Noul "waits for a person?"         -> human gate
                - Noul "spends money / contacts a customer?" -> approval
                      |
          confident (>= 0.80)  -> step done, no LLM
          close scores         -> owner picks from top 3
          "none" wins          -> GAP
                      |
 4 FILL       LLM, ONE call, only if gaps exist. Sees the gap clauses
   (LLM)      plus the matched steps for context. Writes step name,
              instructions, and (for judgments) the Jev question.
              It may NOT add tools. Unknown tool -> "request tool".
                      |
 5 VALIDATE   Code: schema ok, tools exist, <= 20 steps, no loops,
   (code)     approval steps inserted, steps have an owner.
                      |
 6 VERIFY     Jev, one parallel request, ONLY on LLM-written steps:
   (Jev)      grounded in the text? covered? right kind?
                      |
 7 REVIEW     Owner sees every step labelled by source.
                      |
 8 PUBLISH    Draft, then frozen as version 1.
```

How Jev decides from the available list:

```text
state:     { clause: "email them",
             catalog: { email:    "Send an email to a person",
                        proposal: "Send a priced proposal",
                        calendar: "Book a meeting", ... } }
question:  Choice  "Which catalog entry performs `clause`?"
options:   one per catalog key, plus  none: "Nothing listed does this"
answer:    email 0.52  proposal 0.41  calendar 0.02  none 0.05
code:      top >= 0.80      -> accept
           top < 0.80       -> ask owner with top 3
           none is top      -> gap
```

Efficiency rules:
- Catalog entries are one plain sentence each. Jev reads meaning, not names.
- Only tools the member's team may use are in the catalog (access first).
- Large catalogs: group by area, Choice the area first, then the tool.
- One Choice and two Nouls per clause, all in one request. Clauses run in
  parallel, so 6 or 20 clauses cost about the same time (~100ms).
- Jev answers are saved, so Edit text re-asks only changed clauses.
- The LLM call is skipped when nothing is a gap. It never sees the full
  catalog, only the gap clauses and the matched steps.

What each part does:

| Part | Does                                          | Never does                      |
| :--- | :-------------------------------------------- | :------------------------------ |
| Code | Splits, orders, limits, forces approvals      | Interpret meaning               |
| Jev  | Picks tool per clause, flags human/approval   | Write text or invent a tool     |
| LLM  | Writes missing steps and judgment questions   | Choose tools, set order, publish|
| Owner| Resolves close calls, edits, publishes        | -                               |

Every step in the preview carries its source:

| Source        | Meaning                                  |
| :------------ | :--------------------------------------- |
| matched       | Jev picked it, confident                 |
| picked by you | Scores were close, owner chose           |
| AI draft      | LLM wrote it to fill a gap               |
| safety rule   | Code added it (e.g. approval before email)|

Jev checks on LLM-written steps (narrow, independent):

| Check           | Type   | Question (short form)                             | Then code           |
| :-------------- | :----- | :------------------------------------------------ | :------------------ |
| Not invented    | Noul   | Is `step.name` stated or implied by `clause`?     | Flag if < 0.50      |
| Right kind      | Choice | Which kind fits `step.name`: human, agent, ...?   | Use if confident    |
| Nothing missing | Noul   | Is `clause[i]` covered by some step?              | Flag uncovered text |

Step kinds (one word each):

| Kind     | Who acts                          |
| :------- | :-------------------------------- |
| human    | A person reviews or decides       |
| event    | An outside signal arrives         |
| agent    | LLM does open-ended work          |
| typesafe | Jev gives a calibrated judgment   |
| tool     | A tool does a fixed action        |

A `typesafe` step carries its own question and thresholds, drafted by the
LLM and shown to the owner in the preview.

Cost per new flow:

| Call            | Count            | When                  |
| :-------------- | :--------------- | :-------------------- |
| Jev match       | 1 request        | Always                |
| LLM fill        | 0 or 1 call      | Only if gaps exist    |
| Jev verify      | 0 or 1 request   | Only if LLM wrote     |

---


## Flow Models Examples

### 1. Sales Flow 01 (Deterministic & Human-in-the-Loop)

```text
+---+--------------------+----------+------------------------------+
| # | Step               | Kind     | Mechanism                    |
+---+--------------------+----------+------------------------------+
| 1 | Signal Capture     | event    | Lead form / webhook          |
| 2 | Data Enrichment    | agent    | Company facts lookup         |
| 3 | Lead Qualification | typesafe | Jev Fit Score (0..100)       |
| 4 | Outreach Draft     | agent    | Tailored proposal draft      |
| 5 | Objection Handling | human    | Sales rep reviews, replies   |
| 6 | Meeting Scheduling | tool     | Calendar reservation invite  |
| 7 | Pre-Call Brief     | agent    | Briefing document (R2)       |
| 8 | Post-Call Update   | human    | CRM summary, deal stage      |
+---+--------------------+----------+------------------------------+
```

### 2. Sales Flow 02 (Autonomous Agentic Pipeline)

```text
+---+--------------------+----------+------------------------------+
| # | Step               | Kind     | Mechanism                    |
+---+--------------------+----------+------------------------------+
| 1 | Intent Detection   | typesafe | Jev signal scan & threshold  |
| 2 | Account Enrichment | agent    | Firmographic auto-synthesis  |
| 3 | Outreach Drafting  | agent    | Dynamic persona email draft  |
| 4 | Reply Negotiation  | agent    | Inbox negotiation dialogue   |
| 5 | Meeting Booking    | tool     | Calendar auto-booking        |
| 6 | Call Copilot       | agent    | Live battlecard assistance   |
| 7 | CRM Sync & Summary | tool     | Auto-transcript extraction   |
| 8 | Customer Handoff   | tool     | Success trigger, project init|
+---+--------------------+----------+------------------------------+
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
|  [ ] Alex Rivera                                 |
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
| Alex Rivera (Owner)                              |
|  Full access - 8 tools, 3 flows                  |
|                                                  |
| Priya Patel (Cashier)                            |
|  Counter sales - 2 tools, 1 flow                 |
|                                                  |
| Marcus Chen (Kitchen lead)                       |
|  Orders & inventory - 3 tools                    |
|                                                  |
| Sarah Jenkins (Pending invite)                   |
|  Brief: "Weekend pastry chef"                    |
|--------------------------------------------------|
| [ + Add member ]                                 |
+--------------------------------------------------+
```

### 4. Member Access & Brief (preview)

```text
+--------------------------------------------------+
| Member: Priya Patel                       [Cancel]|
+--------------------------------------------------+
| Name: Priya Patel     Role: Member               |
| Email: priya@example.com                         |
| Workrole: cashier                                |
|                                                  |
| Role Brief:                                      |
| "Priya handles counter sales, takes payments,    |
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
| [N] Northstar Restaurant                       v |
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

### 7. New Flow (preview) - four screens

7a. Describe

```text
+--------------------------------------------------+
| New flow                          1 of 4 [Cancel]|
+--------------------------------------------------+
| Describe the process in your own words:          |
|                                                  |
| "When a lead comes in, look up the company,      |
|  score fit, email them, book a call, then        |
|  update the CRM."                                |
|                                                  |
| Team that runs it: [ Sales            v ]        |
|                                      [ Match ]   |
+--------------------------------------------------+
```

7b. Match (Jev picks from your list)

```text
+--------------------------------------------------+
| Matching your words to what you have  2 of 4     |
+--------------------------------------------------+
| 1 "a lead comes in"                              |
|   > Lead form (tool)               0.94   OK     |
|                                                  |
| 2 "look up the company"                          |
|   > Company lookup (tool)          0.91   OK     |
|                                                  |
| 3 "score fit"                                    |
|   > Lead score (judgment)          0.88   OK     |
|                                                  |
| 4 "email them"                                   |
|   ( ) Email (tool)                 0.52          |
|   ( ) Send proposal (tool)         0.41          |
|   [ Pick one ]  asked because scores are close   |
|                                                  |
| 5 "book a call"                                  |
|   > Calendar (tool)                0.96   OK     |
|                                                  |
| 6 "update the CRM"                               |
|   x Nothing in your list fits      0.12   GAP    |
|--------------------------------------------------|
| 4 matched   1 asked   1 gap          [ Continue ]|
+--------------------------------------------------+
```

7c. Fill gaps (LLM drafts only what is missing)

```text
+--------------------------------------------------+
| Filling the gaps                          3 of 4 |
+--------------------------------------------------+
| Kept as matched (not changed):                   |
|  1 Lead form   2 Company lookup   3 Lead score   |
|  4 Email   5 Calendar                            |
|                                                  |
| Drafted for you (AI):                            |
|  6 Update CRM         step: human                |
|    "Sales rep logs call notes and deal stage."   |
|    ! No CRM tool yet. Using a person.            |
|    [ Request CRM tool ]                          |
|                                                  |
| Added by safety rule (code):                     |
|  4b Approve email     step: human                |
|    "Emails to customers need a person's OK."     |
|--------------------------------------------------|
|                         [ Back ]  [ Continue ]   |
+--------------------------------------------------+
```

7d. Review and publish

```text
+--------------------------------------------------+
| Review                                    4 of 4 |
+--------------------------------------------------+
| Sales Flow 03                      [ Rename ]    |
|                                                  |
| 1 Lead form          event      matched          |
| 2 Company lookup     tool       matched          |
| 3 Lead score         typesafe   matched          |
| 4 Email              tool       picked by you    |
| 4b Approve email     human      safety rule      |
| 5 Calendar           tool       matched          |
| 6 Update CRM         human      AI draft         |
|                                                  |
| Checks:  all steps tie to your words       OK    |
|          every sentence is covered         OK    |
|          2 steps need a person             OK    |
|--------------------------------------------------|
|              [ Edit text ]  [ Save draft ]       |
|                             [ Publish v1 ]       |
+--------------------------------------------------+
```

### 8. Live Flow Run (preview)

```text
+--------------------------------------------------+
| Store Closing - Run #142                  [Pause]|
+--------------------------------------------------+
| Flow: Store Closing (v1)   Actor: Priya Patel    |
| Started: 21:40            Status: Active         |
|--------------------------------------------------|
| [x] Step 1: Register snapshot (tool: pos)        |
|                                                  |
| [*] Step 2: Count physical cash (human)          |
|     Drawer expected: $1,420.00                   |
|     Actual count:   [$1,420.00     ]             |
|     [ Submit & Next Step ]                       |
|                                                  |
| [ ] Step 3: Variance check (typesafe)            |
| [ ] Step 4: Lock register & summary (tool)       |
+--------------------------------------------------+
```
