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
| Brief  | Owner's plain text about a person          | "Priya runs the counter" | `brief`    |
| Access | The tools and flows a person can open      | Priya: POS, Closing      | `access`   |

Changes from the last draft:

| Before                  | Now      | Why                                                 |
| :---------------------- | :------- | :-------------------------------------------------- |
| Grant                   | Access   | Plain word; owners already say "give access"        |
| Resolver, Security Floor| (removed)| Jev is the engine, code is the rule; no new nouns   |
| "Noul" called a typo    | Noul     | My mistake: Noul is a real TypeSafe yes/no question |

Jev question types used:

| Type   | Answer            | Used for                                  |
| :----- | :---------------- | :---------------------------------------- |
| Noul   | Chance of yes 0-1 | Does this person need this tool?          |
| Choice | One of a set      | Which step kind fits this step?           |
| Score  | Degree on levels  | Lead fit, risk level                      |

---

## Access from a Brief

One request, many small Noul questions, all run in parallel (~100ms).
One question per tool or flow in the catalog:

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
 [ ] Members & chat         0.55   ask me
     More: Supplier invoices, Settings ...
```

Rules kept in code:
- Sensitive tools (money out, settings, owner data) are never pre-ticked.
- The owner's Save is what writes `access`. Jev's number is a suggestion.
- Raw Noul values are saved, so changing a threshold needs no new Jev call.
- Role (owner/admin/member/guest) limits what Jev may even suggest.

---

## Create a Flow from a description

Owner types the process in plain words. An LLM drafts it, Jev checks it,
code enforces it, owner publishes.

```text
 1 DESCRIBE   "When a lead comes in, look up the company, score it,
               email them, book a call, then update the CRM."
                      |
 2 DRAFT      LLM (once) writes steps as JSON, using ONLY tools
   (LLM)      and step kinds from the catalog.
                      |
 3 VALIDATE   Code: schema ok, tool slugs exist, <= 20 steps,
   (code)     no loops, every step has an owner.
                      |
 4 CHECK      Jev, one parallel request (below).
   (Jev)
                      |
 5 PREVIEW    Owner sees steps + flags, edits in plain text.
                      |
 6 PUBLISH    Saved as a draft, then frozen as version 1.
```

Jev checks, all narrow and independent:

| Check            | Type   | Question (short form)                                     | Then code             |
| :--------------- | :----- | :-------------------------------------------------------- | :-------------------- |
| Step kind        | Choice | Which kind fits `step.name`: human, agent, tool, ...?     | Use if confident      |
| Right tool       | Noul   | Does `step.tool` perform `step.name`?                     | Flag if < 0.70        |
| Not invented     | Noul   | Is `step.name` stated or implied by `brief`?              | Flag if < 0.50        |
| Nothing missing  | Noul   | Is `sentence[i]` of `brief` covered by some step?         | Flag uncovered text   |
| Needs approval   | Noul   | Does `step.name` spend money or message a customer?       | Force a human step    |

Why this shape:
- LLM does the open-ended drafting once. Jev does the cheap, repeatable checking.
- The draft is limited to a closed catalog, so Jev selects instead of inventing.
- Coverage is checked per brief sentence, so missing steps are found by code.
- Edits re-run only the changed steps. Raw answers are saved with the draft.

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

---

## Flow example

```text
+---+--------------------+----------+------------------------------+
| # | Step               | Kind     | Mechanism                    |
+---+--------------------+----------+------------------------------+
| 1 | Signal Capture     | event    | Lead form / webhook          |
| 2 | Data Enrichment    | agent    | Company facts lookup         |
| 3 | Lead Qualification | typesafe | Fit Score 0..100             |
| 4 | Outreach Draft     | agent    | Tailored proposal draft      |
| 5 | Objection Handling | human    | Sales rep reviews, replies   |
| 6 | Meeting Scheduling | tool     | Calendar invite              |
| 7 | Pre-Call Brief     | agent    | Briefing document (R2)       |
| 8 | Post-Call Update   | human    | CRM summary, deal stage      |
+---+--------------------+----------+------------------------------+
```

An autonomous version is the same table with fewer `human` steps and a
`typesafe` gate (e.g. intent Score above a threshold) in front.

---

## Storage: reuse the current schema

No new tables. See [schema.ts](tarharness/src/db/schema.ts).

| Concept          | Stored in                   | How                                          |
| :--------------- | :-------------------------- | :------------------------------------------- |
| Person / party   | `records` type=`party`      | `data`={kind,role,workrole,brief,access}     |
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

## Screens

### Inbox

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

### Tools

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
|  Members & chat                                  |
+--------------------------------------------------+
| AVAILABLE FLOWS                                  |
|  Sales Flow 01                                   |
|  [ + New flow ]                                  |
+--------------------------------------------------+
```

### New flow (preview)

```text
+--------------------------------------------------+
| New flow                                  [Cancel]|
+--------------------------------------------------+
| Describe the process:                            |
| "When a lead comes in, look up the company..."   |
|                                      [ Draft ]   |
+--------------------------------------------------+
| 1 Signal Capture      event                      |
| 2 Data Enrichment     agent                      |
| 3 Lead Qualification  typesafe                   |
| 4 Send Offer          human   (approval added)   |
|   ! Not in your text: "Pre-Call Brief"           |
|   ! Not covered: "update the CRM"                |
+--------------------------------------------------+
|                         [ Edit ]  [ Publish ]    |
+--------------------------------------------------+
```
