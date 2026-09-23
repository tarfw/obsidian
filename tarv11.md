# TAR v11 = One Core, One Call, Every Domain

> Local speed. Shared truth. One Jev call per turn.

**Status = target architecture.** The first release proves the core; domain packages extend it. Basis = v8, v9, v10 and the TypeSafe reference in jev/jev.md (model jev-1.13.0).

## 1. Purpose = the whole business cycle, decided cheap

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   |          |        |       |         |           |          |
 Sites       CRM     Sales   Orders    Products    Tickets   Renewals
 Content   Contacts  Quotes  Payments   Services   Returns   Campaigns
                               |
             Team + Stock + Purchasing + Finance + Reporting
~~~

TAR = one architecture for the entire cycle. A cafe, shop, agency, repair business or
subscription service enables different capabilities within the same system.

~~~text
+------------+-----------------------------------------------------------------------+
| Domain     | Work covered                                                          |
+============+=======================================================================+
| Sites      | Content, catalog, forms, enquiries, checkout, reviewed publication    |
+------------+-----------------------------------------------------------------------+
| CRM        | People, companies, relationships, consent, communication history      |
+------------+-----------------------------------------------------------------------+
| Sales      | Leads, opportunities, quotes, conversion, follow-ups                  |
+------------+-----------------------------------------------------------------------+
| Products   | Catalog, variants, prices, stock, purchasing, reservations            |
+------------+-----------------------------------------------------------------------+
| Services   | Offerings, resources, availability, bookings, assignments, completion |
+------------+-----------------------------------------------------------------------+
| Commerce   | Orders, invoices, payments, fulfillment, subscriptions, refunds       |
+------------+-----------------------------------------------------------------------+
| Support    | Tickets, conversations, priorities, returns, resolution               |
+------------+-----------------------------------------------------------------------+
| Operations | Suppliers, purchases, receiving, shipping, team, approvals            |
+------------+-----------------------------------------------------------------------+
| Finance    | Postings, reconciliation, balances, reporting, exports                |
+------------+-----------------------------------------------------------------------+
~~~

**Rule = known work is code, meaning is one Jev call, prose is a model, money is a human.**

**Rule = Jev improves judgment; the runtime preserves truth.** A model never authorizes,
computes money or updates a record by itself. Model = proposal. Runtime = accepted change.

- One semantic turn costs about INR 0.011 all-in; the AI line is INR 16.82 of the
  INR 100 envelope (sec 9).
- Jev answers are typed and stored; a turn is never paid for twice.
- Every domain above uses the same grammar: capture, one judgment call, code, commit.

## 2. Division = app and worker

~~~text
+--------------------------------+   +--------------------------------+
| TAR APP (phone)                |   | TAR WORKER (cloud)             |
+--------------------------------+   +--------------------------------+
| SHELL    Space Inbox Bots      |   | INGRESS  chat site pos email   |
| LOCAL    sqlite render drafts  |   | KERNEL   gateway runtime log   |
| CAPTURE  forms pos voice scan  |   | JUDGMENT Jev router traces     |
| CONFIRM  approval card         |   | WORK     executor scheduler    |
| SYNC     push and pull deltas  |   | STORAGE  turso d1 r2 outbox    |
+--------------------------------+   +--------------------------------+
~~~

The line between the two sides is **who may decide what**.

~~~text
+------------------+----------------------------------------+--------------------------------------+
| Question         | App (on device)                        | Worker (cloud)                       |
+==================+========================================+======================================+
| What is shown    | decides locally from synced data       | publishes views and role filters     |
+------------------+----------------------------------------+--------------------------------------+
| What is legal    | never decides                          | policy + authority, deterministic    |
+------------------+----------------------------------------+--------------------------------------+
| What it means    | captures text, offers local candidates | one Jev call per turn                |
+------------------+----------------------------------------+--------------------------------------+
| What is true     | drafts and queued turns only           | the only place a record is committed |
+------------------+----------------------------------------+--------------------------------------+
| Keys and secrets | holds none, by design                  | holds every provider key             |
+------------------+----------------------------------------+--------------------------------------+
~~~

**Rule = the app never holds an AI provider key and never writes workspace truth.** It
renders, captures, decides the deterministic half locally, queues turns offline, and
confirms exactly what the worker commits.

## 3. App side = capture, confirm, keep working offline

~~~text
+----------------------------------------------------------------+
| APP = capture + decide locally + draft + confirm + sync        |
+----------------------------------------------------------------+
| SHELL   | Space role canvas | Inbox decisions | Bots install   |
| LOCAL   | sqlite: inbox, projections, drafts, recent reads     |
| CAPTURE | forms, POS, voice note, photo scan, chat message     |
| CONFIRM | approval card: the exact effect, amount and versions |
| SYNC    | deltas push/pull; queued turns while offline         |
+----------------------------------------------------------------+
~~~

- Space is the role-aware home; Inbox is every decision that needs a person; Bots is how
  capability is installed and configured.
- The Inbox carries three kinds of arrival from Jev: a decision to accept, an uncertain
  answer to review, and a blocked or failed turn.
- The deterministic half works offline: totals, stock shown, permissions cached, drafts
  saved. A queued turn is a draft, never an accepted shared change.
- Every screen shares the same states:

~~~text
+----------------------------------------------------------------+
| offline | pending | conflict | denied | ai paused | done       |
+----------------------------------------------------------------+
~~~

- When the budget is exhausted or Jev is unreachable, the app says "ai paused" and keeps
  every manual control usable.

## 4. Worker side = one commit path, five sections

~~~text
+----------------------------------------------------------------+
| WORKER = ingress + kernel + judgment + work + storage          |
+----------------------------------------------------------------+
| INGRESS  | channels chat/site/pos/email; verify; enqueue       |
| KERNEL   | gateway: authorize, validate, replay, commit        |
| JUDGMENT | Jev bundles, router ladder, traces, budgets         |
| WORK     | executor, scheduler, outbox, effects, recovery      |
| STORAGE  | turso truth, d1 identity, r2 files, queue + cron    |
+----------------------------------------------------------------+
~~~

**Rule = one mutation path.** Every accepted change passes the gateway, in order:

~~~text
request
  |
  v
+----------------+   +----------------+   +----------------+   +----------------+
| AUTHORIZE      |   | VALIDATE       |   | REPLAY CHECK   |   | COMMIT         |
| identity, role,|-->| fields, types, |-->| same key + hash|-->| state + log +  |
| policy         |   | laws, versions |   | = stored answer|   | task + trace   |
+----------------+   +----------------+   +----------------+   +----------------+
  |
  v
dispatch: queue -> EXECUTOR, cron -> SCHEDULER, effect -> provider
~~~

- D1 holds identity, membership, budgets and the command log. One Turso database per
  workspace holds records, definitions, runs and events. R2 holds files and releases.
- A judgment call never sits inside a transaction. Reserve, judge, then commit.
- Recovery is bounded: retry with the same key, resume unfinished work on cron, never
  duplicate an accepted effect.

## 5. Judgment = one Jev call per turn

~~~text
message / tap / scan
        |
        v
+------------------------------------------------------------+
| ONE JEV CALL   state <= 2k tokens . 20-60 questions        |
|   state = message + the records the questions name         |
|           + published option sets + a policy excerpt       |
|           + the memory excerpt (sec 18)                    |
|   asks  = intent CHOICE . handler CHOICE . per-arg CHOICE  |
|           stated? NOUL . urgency SCORE . hazard NOULs      |
+------------------------------------------------------------+
        |
        v   typed answers + probabilities + confidence
+------------------------------------------------------------+
| CODE   assemble arguments . recompute money, tax, stock,   |
|        dates . apply the action gate . build the proposal  |
+------------------------------------------------------------+
        |
        v
   RUNTIME  authorize -> validate -> replay -> commit -> trace
~~~

**Rule = one turn, one call.** Every semantic judgment for a turn is asked together:
which intent, which handler, each closed-set argument, what was not stated, how urgent,
and whether any hazard applies. A second call happens only when the first answer must
fetch evidence, build new options, or pick the next option set (a two-stage choice past
255 candidates).

~~~text
+--------+-----------------------------------------+-------------------------------------+
| Type   | Answers with                            | Code does                           |
+========+=========================================+=====================================+
| Choice | one option + probabilities + confidence | branches on the option              |
+--------+-----------------------------------------+-------------------------------------+
| Score  | a position on ordered levels            | compares against a threshold        |
+--------+-----------------------------------------+-------------------------------------+
| Noul   | probability that a condition holds      | if / gate, with an uncertainty band |
+--------+-----------------------------------------+-------------------------------------+
~~~

Question design rules:

- Recall in code, precision in Jev: search, SQL and regex supply candidates; Jev selects.
  It cannot pick what was not offered, so candidate coverage sets the ceiling.
- Every ambiguous Choice carries a none / not stated option and is paired with an
  existence Noul; code branches on the Noul, not on the winner of the distribution.
- A decision built from several answers takes the weakest answer's confidence.
- Write questions about the role, not the parameter name: the same candidate list fills
  "the one measured" and "the yardstick" because the wording carries the role.
- Question bundles are published, versioned artifacts in the registry (kind = questions);
  weights, thresholds and display rules live in code.

**Jev never does these, at any confidence:**

~~~text
+---------------------------------------------------+-----------------------------------+
| Never                                             | Owner                             |
+===================================================+===================================+
| Authorization, roles, permissions                 | Policy, deterministic             |
+---------------------------------------------------+-----------------------------------+
| Arithmetic, totals, tax, counts, stock            | Code, deterministic               |
+---------------------------------------------------+-----------------------------------+
| Dates as ordered quantities                       | Code assembles and compares parts |
+---------------------------------------------------+-----------------------------------+
| Settlement, payment success, refund decision      | Verified evidence + Human         |
+---------------------------------------------------+-----------------------------------+
| Policy truth or legal interpretation              | Policy + Human                    |
+---------------------------------------------------+-----------------------------------+
| Enumerating its own options or widening authority | Registry, published only          |
+---------------------------------------------------+-----------------------------------+
| Generating text                                   | A WRITE model, gated              |
+---------------------------------------------------+-----------------------------------+
| Repeating a decision already stored               | Replay returns the trace          |
+---------------------------------------------------+-----------------------------------+
~~~

## 6. Router = cheapest first, gated

~~~text
                       cheapest first
intent --> CACHE ----- stored answer with a TTL -------> reuse
       --> CODE ------ buttons, totals, stock, rules ---> act
       --> JEV ------- typed judgment, gate passed ------> propose
       --> WRITE ----- prose or code must exist ---------> draft
       --> HUMAN ----- money, access, publication -------> decide
~~~

**Rule = a model call is never spent on what code can compute.** Buttons, arithmetic,
stock, permissions and status transitions are free and deterministic.

**Rule = memory recall is code.** SQL, aliases and importance shortlist the rows; Jev
ranks only when candidates genuinely compete, and one bounded excerpt rides the call
already being paid for.

**Rule = route to Jev only where it replaces measurable work.** A Jev call must replace
at least two cheap calls or one reasoning-class call:

~~~text
route to JEV only when   Cl > Cj / p
  Cj = one Jev call cost      Cl = one WRITE call cost
  p  = fraction of WRITE calls the judgment avoids
~~~

- Against a short classification call, Jev wins only when that call's output is long
  (the cheap model's output must exceed about 0.22 of its input to lose). A single
  short label does not justify a new hop.
- Against a reasoning-class call, one Jev call pays for itself by avoiding the call.
- Uncertain answers cost nothing extra: the band is code over the returned probability.

**Rule = ration prose, never judgment.** A Jev decision costs about INR 0.005 and is
stored and replayed, so TAR never caps judgment per turn. Only LLM prose and escalations
are rationed (sec 9).

Every proposed effect passes one outbound check before it acts:

~~~text
proposed effect
      |
      v
+------------------------------------------------------------+
| OUTBOUND JEV CHECK   one call . per effect                 |
|   hazard NOULs per policy + one severity SCORE             |
+------------------------------------------------------------+
      |
      v
code precedence:  support > block > review > pass
      |
      v
dispatch / hold / escalate      (can only narrow, never widen)
~~~

The check can hold or refuse what code already authorized. It can never widen an amount,
a recipient, a permission or a version.

## 7. Trace = decisions as records

**Rule = decisions are stored, not recomputed.**

~~~text
+---------+------------------------------------------------+
| Column  | Holds                                          |
+=========+================================================+
| id      | one row per judged turn                        |
+---------+------------------------------------------------+
| tenant  | workspace, or the personal scope               |
+---------+------------------------------------------------+
| task    | the work item the judgment serves              |
+---------+------------------------------------------------+
| attempt | retry counter, never a new decision            |
+---------+------------------------------------------------+
| model   | the exact served model id, not an alias        |
+---------+------------------------------------------------+
| bundle  | the pinned question-bundle revision            |
+---------+------------------------------------------------+
| pack    | the pinned pack revision the state read        |
+---------+------------------------------------------------+
| hash    | the state fingerprint the answer was made from |
+---------+------------------------------------------------+
| answers | value, probabilities, confidence, band, branch |
+---------+------------------------------------------------+
| usage   | input tokens and the reserved budget           |
+---------+------------------------------------------------+
| cost    | issued cost for this call                      |
+---------+------------------------------------------------+
| latency | end-to-end milliseconds                        |
+---------+------------------------------------------------+
| status  | proposed, accepted, reviewed, blocked, failed  |
+---------+------------------------------------------------+
| outcome | what the person or code finally did            |
+---------+------------------------------------------------+
~~~

- Replay returns the stored answer. A changed policy re-routes the stored answer with no
  new call; a changed threshold never re-runs inference.
- A decision is invalidated only when its evidence or the actor's access changes, and
  then it is re-asked, not guessed.
- Repeated identical turns reuse the stored answer under a TTL (semantic cache), so
  refreshes, retries and double taps cost nothing.

## 8. Budget and limits

**Rule = reserve, then spend, then reconcile.**

- Before a call, reserve the worst permitted spend for that identity atomically in D1;
  after the call, reconcile actual input tokens and release the remainder.
- A workspace ceiling sits on top of the identity budget. The monthly credit grant is
  the envelope: AI spend can never exceed what the plan sells.
- Exhaustion pauses optional AI first. Checkout, manual orders and every deterministic
  operation continue.

~~~text
+----------------+--------------------------+------------------------------------------+
| Limit          | Value                    | Handling                                 |
+================+==========================+==========================================+
| Context        | 64k per request          | keep state at 2k; filter in code         |
+----------------+--------------------------+------------------------------------------+
| Memory pack    | 8k tokens, one revision  | compiled by WORK; never enters a turn    |
+----------------+--------------------------+------------------------------------------+
| Memory excerpt | 300 tokens               | chosen in code; the cap rides the call   |
+----------------+--------------------------+------------------------------------------+
| Choice options | 255                      | two-stage choice over sections           |
+----------------+--------------------------+------------------------------------------+
| Score levels   | 10                       | coarse levels, exact math in code        |
+----------------+--------------------------+------------------------------------------+
| Rate           | 1,200 requests/min today | contract higher, fall back to WRITE      |
+----------------+--------------------------+------------------------------------------+
| Input          | text only                | OCR / Whisper cascade in front           |
+----------------+--------------------------+------------------------------------------+
| Language       | English first            | route low confidence to review           |
+----------------+--------------------------+------------------------------------------+
| Vendor         | single, early access     | price and behavior change without notice |
+----------------+--------------------------+------------------------------------------+
~~~

- Non-text input is a cascade: OCR or transcription first, Jev judges the text, flags
  aggregate by the maximum, and any flag over 0.7 escalates one bounded reasoning call.
- The router's fallback is a WRITE model, never a bypass of authority.

## 9. Cost = before Jev and after Jev

Two published baselines are reconciled here. The blended planning line (INR 39.27) and
the token floor (INR 16.89, a cheap-classify only mix) describe different products. The
auditable class model below is what TAR budgets: a generative-only build that delivers
the full product, against a Jev-first build that delivers the same behavior.

Rate = INR 95 per USD 1. Assumptions: 1,500 turns per user per month; one Jev call per
turn at 2,000 input tokens with free output; 20% of turns also need prose; 60% of
DeepSeek input hits cache; prices = Gemma-4 USD 0.02 / 0.10, DeepSeek V4 Flash USD
0.09 / 0.18 (cached 0.018), Jev USD 0.042 per 1M input; generative-only pays a
reasoning-class call per turn, a guardrail call at 0.3x turns, and a 20% retry pad.

### Table A = per user per month

~~~text
BEFORE  generative-only, product-complete

+----------------------------------+-------+---------+-----------+----------+--------+
| line                             | calls | model   | in / out  |      USD |    INR |
+==================================+=======+=========+===========+==========+========+
| understand + extract + arguments |  1500 | DS V4 F | 3000/500  |  0.54000 |  51.30 |
+----------------------------------+-------+---------+-----------+----------+--------+
| guardrail screen (0.3x turns)    |   450 | Gemma-4 | 1000/150  |  0.01575 |   1.50 |
+----------------------------------+-------+---------+-----------+----------+--------+
| retry and verify pad (+20%)      |   300 | DS V4 F | 3000/500  |  0.10800 |  10.26 |
+----------------------------------+-------+---------+-----------+----------+--------+
| long work                        |    30 | DS V4 F | 8000/1500 |  0.02970 |   2.82 |
+----------------------------------+-------+---------+-----------+----------+--------+
| subtotal                         |  2280 |         |           |  0.69345 |  65.88 |
+----------------------------------+-------+---------+-----------+----------+--------+
| cache credit (60% of DS input)   |       |         |           | -0.24365 | -23.15 |
+----------------------------------+-------+---------+-----------+----------+--------+
| NET (cached)                     |       |         |           |  0.44980 |  42.73 |
+----------------------------------+-------+---------+-----------+----------+--------+
~~~

~~~text
AFTER   Jev-first, product-complete

+--------------------------------------+-------+----------+-----------+----------+-------+
| line                                 | calls | model    | in / out  |      USD |   INR |
+======================================+=======+==========+===========+==========+=======+
| Jev batched turns, output free       |  1500 | Jev 1.13 | 2000 in   |  0.12600 | 11.97 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| Gemma short (rewrites, receipts)     |   300 | Gemma-4  | 1000/150  |  0.01050 |  1.00 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| DeepSeek medium (gated: 1500 -> 120) |   120 | DS V4 F  | 3000/500  |  0.04320 |  4.10 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| DeepSeek long                        |    20 | DS V4 F  | 8000/1500 |  0.01980 |  1.88 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| subtotal                             |  1940 |          |           |  0.19950 | 18.95 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| cache credit                         |       |          |           | -0.02246 | -2.13 |
+--------------------------------------+-------+----------+-----------+----------+-------+
| NET (cached)                         |       |          |           |  0.17704 | 16.82 |
+--------------------------------------+-------+----------+-----------+----------+-------+

DELTA   INR 42.73 -> INR 16.82 = 2.54x cheaper at equal product behavior.
        Per turn after: INR 0.0112.   The Jev layer alone: INR 0.0080.
~~~

~~~text
AI cost per user per month (1 mark = INR 2)

before  #####################  42.73
after   ########               16.82
~~~

The saving comes from three places: understanding, extraction, routing and guarding
become one designed call instead of per-turn reasoning calls; the expensive calls only
run where the answer is prose, gated by Jev; and every stored answer replays free.

### Table B = full scale

~~~text
+-------+-----------+----------+--------------+-------------+
| users | AI before | AI after | stack before | stack after |
+=======+===========+==========+==============+=============+
| 1K    |     42.73 |    16.82 |        65.73 |       39.82 |
+-------+-----------+----------+--------------+-------------+
| 10K   |     42.73 |    16.82 |        46.58 |       20.67 |
+-------+-----------+----------+--------------+-------------+
| 100K  |     42.73 |    16.82 |        44.66 |       18.75 |
+-------+-----------+----------+--------------+-------------+
| 1M    |     42.73 |    16.82 |        44.47 |       18.56 |
+-------+-----------+----------+--------------+-------------+

 stack = AI + INR 1.72 non-AI + fixed floor / users
 at 1M: AI INR 4.27 Cr/mo becomes INR 1.68 Cr/mo; INR 2.59 Cr/mo avoided
 ceiling INR 100 and the INR 400 / 80% margin floor hold in every row
~~~

### Intelligence everywhere = decisions per session

Hundreds of small decisions per user session are affordable on Jev and unaffordable on an
LLM per decision. This is the design case for a decision model in the core.

~~~text
+-----------------------------+---------------------+----------------------------+
| line                        | with Jev            | on an LLM per call         |
+=============================+=====================+============================+
| One decision                | INR 0.005, 1.2k in  | INR 0.034, 3k in / 500 out |
+-----------------------------+---------------------+----------------------------+
| A session, 300 decisions    | INR 1.50            | INR 10.20                  |
+-----------------------------+---------------------+----------------------------+
| A user, 30 sessions a month | INR 45              | INR 306                    |
+-----------------------------+---------------------+----------------------------+
| Against the envelope        | fits inside INR 100 | breaks it three times over |
+-----------------------------+---------------------+----------------------------+
~~~

**Rule = cost per user is flat.** It scales 1:1 with users, so the credit cap and the
gates are load-bearing, and every future route is enabled only with its own proof.

## 10. End to end at full scale

Four flows, one grammar: capture, recall, one Jev call, code, commit. Every row names
its lane, so each example shows exactly what goes to Jev, what a model writes, and what
deterministic code does.

~~~text
one turn
   |
   +--> CODE  : recall candidates . compute money, stock, dates . gate . assemble
   +--> JEV   : one call . state + questions -> typed answers           ~INR 0.008
   +--> WRITE : prose, or OCR before it; gated by Jev                   INR 0.001-0.034
   +--> HUMAN : money, access, publication, the uncertain band
   |
   v
RUNTIME  accepts: authorize -> validate -> replay -> commit -> trace
~~~

**F1 = cafe chat order.** "2 margherita, 1 garlic bread, no onions, deliver to Priya, cash"

~~~text
+----------+------------+-----------------------------------------------------------+
| step     | lane       | exact work                                                |
+==========+============+===========================================================+
| capture  | APP        | message text, channel, actor; offline draft if no net     |
+----------+------------+-----------------------------------------------------------+
| recall   | CODE       | menu candidates, top 5 contacts, policy excerpt, versions |
+----------+------------+-----------------------------------------------------------+
| intent   | JEV choice | order / change / complaint / status / other               |
+----------+------------+-----------------------------------------------------------+
| item x2  | JEV choice | menu candidates per line + not on menu                    |
+----------+------------+-----------------------------------------------------------+
| quantity | JEV choice | 1 / 2 / 3 / 4 / 5 / more; code keeps the sum              |
+----------+------------+-----------------------------------------------------------+
| modifier | JEV noul   | no onions, extra cheese, spicy: one per exclusion         |
+----------+------------+-----------------------------------------------------------+
| customer | JEV choice | the 5 matches + new guest                                 |
+----------+------------+-----------------------------------------------------------+
| pay      | JEV choice | cash / upi / card later                                   |
+----------+------------+-----------------------------------------------------------+
| fulfil   | JEV choice | dine in / takeaway / delivery                             |
+----------+------------+-----------------------------------------------------------+
| urgency  | JEV score  | walk-in / today / scheduled                               |
+----------+------------+-----------------------------------------------------------+
| allergen | JEV noul   | the message claims an allergy or intolerance              |
+----------+------------+-----------------------------------------------------------+
| assemble | CODE       | prices Rs.220 + Rs.180, tax, total Rs.651, stock, address |
+----------+------------+-----------------------------------------------------------+
| gate     | CODE       | stock + hours pass; else a review task, no order          |
+----------+------------+-----------------------------------------------------------+
| prose    | WRITE      | one short confirmation line (template fallback)           |
+----------+------------+-----------------------------------------------------------+
| commit   | RUNTIME    | order + lines, log event, kitchen task, trace             |
+----------+------------+-----------------------------------------------------------+
| cost     | -          | JEV 1.8k 0.007 + WRITE short 0.001 = INR 0.008            |
+----------+------------+-----------------------------------------------------------+
~~~

**F2 = support ticket with a refund request.** "charged twice for A-104, refund the duplicate"

~~~text
+------------------+------------+--------------------------------------------------------------+
| step             | lane       | exact work                                                   |
+==================+============+==============================================================+
| capture          | APP        | "charged twice for A-104, refund the duplicate"              |
+------------------+------------+--------------------------------------------------------------+
| recall           | CODE       | order A-104, captured charges, prior refunds, policy clauses |
+------------------+------------+--------------------------------------------------------------+
| intent           | JEV choice | refund / complaint / question / technical / other            |
+------------------+------------+--------------------------------------------------------------+
| refund_requested | JEV noul   | does the message ask for money back                          |
+------------------+------------+--------------------------------------------------------------+
| duplicate_charge | JEV noul   | do the matched charges show a duplicate                      |
+------------------+------------+--------------------------------------------------------------+
| order            | JEV choice | top 5 orders + none                                          |
+------------------+------------+--------------------------------------------------------------+
| amount           | JEV choice | regex spans + not stated                                     |
+------------------+------------+--------------------------------------------------------------+
| clause           | JEV choice | which published clause governs: duplicate / damaged / none   |
+------------------+------------+--------------------------------------------------------------+
| urgency          | JEV score  | low / normal / high                                          |
+------------------+------------+--------------------------------------------------------------+
| frustration      | JEV score  | calm / frustrated / angry                                    |
+------------------+------------+--------------------------------------------------------------+
| chargeback       | JEV noul   | threatens a dispute or chargeback                            |
+------------------+------------+--------------------------------------------------------------+
| abuse            | JEV noul   | abusive content, for a guardrail flag                        |
+------------------+------------+--------------------------------------------------------------+
| compute          | CODE       | duplicate Rs.620 from the ledger; the clause sets the cap    |
+------------------+------------+--------------------------------------------------------------+
| gate             | HUMAN      | approval binds amount, destination, versions; used once      |
+------------------+------------+--------------------------------------------------------------+
| prose            | WRITE      | none until approval; the reply stays a template              |
+------------------+------------+--------------------------------------------------------------+
| commit           | RUNTIME    | refund task + log + trace; effect after approval only        |
+------------------+------------+--------------------------------------------------------------+
| cost             | -          | JEV 2.2k = INR 0.009 (before 0.045)                          |
+------------------+------------+--------------------------------------------------------------+
~~~

**F3 = supplier invoice photo to expense.**

~~~text
+------------+------------+------------------------------------------------------------+
| step       | lane       | exact work                                                 |
+============+============+============================================================+
| capture    | APP        | photo from chat; hash, upload to R2                        |
+------------+------------+------------------------------------------------------------+
| read       | WRITE      | DeepSeek-OCR 2 returns text and boxes from the scan        |
+------------+------------+------------------------------------------------------------+
| recall     | CODE       | regex candidates per field; open purchase orders; versions |
+------------+------------+------------------------------------------------------------+
| document   | JEV choice | tax invoice / bill of supply / delivery note / other       |
+------------+------------+------------------------------------------------------------+
| supplier   | JEV choice | candidate suppliers + not listed                           |
+------------+------------+------------------------------------------------------------+
| invoice_no | JEV choice | regex spans + not stated                                   |
+------------+------------+------------------------------------------------------------+
| gst        | JEV choice | regex spans + not stated                                   |
+------------+------------+------------------------------------------------------------+
| total      | JEV choice | regex spans + not stated; code recomputes                  |
+------------+------------+------------------------------------------------------------+
| tax        | JEV choice | regex spans + not stated; code splits by rule              |
+------------+------------+------------------------------------------------------------+
| po         | JEV choice | open purchase orders + none                                |
+------------+------------+------------------------------------------------------------+
| duplicate  | JEV noul   | same supplier, number and amount seen before               |
+------------+------------+------------------------------------------------------------+
| flag x5    | JEV noul   | hallucinated / off target / wrong type per picked field    |
+------------+------------+------------------------------------------------------------+
| compute    | CODE       | totals, tax split, tolerance against the matched order     |
+------------+------------+------------------------------------------------------------+
| escalate   | WRITE      | only fields flagged over 0.7: one bounded reasoning call   |
+------------+------------+------------------------------------------------------------+
| gate       | CODE       | over the limit: approval task; otherwise accepted          |
+------------+------------+------------------------------------------------------------+
| commit     | RUNTIME    | expense + order link, log, task, trace                     |
+------------+------------+------------------------------------------------------------+
| cost       | -          | OCR 0.006 + JEV 2.5k 0.010 + escalate 0.007 = 0.023        |
+------------+------------+------------------------------------------------------------+
~~~

**F4 = lead enquiry to quote.** "can you do 40 covers on 4 Oct, need it under 12k"

~~~text
+------------+-----------------+-------------------------------------------------------------+
| step       | lane            | exact work                                                  |
+============+=================+=============================================================+
| capture    | APP             | "can you do 40 covers on 4 Oct, need it under 12k"          |
+------------+-----------------+-------------------------------------------------------------+
| recall     | CODE            | contact matches, service catalog, rate card, consent state  |
+------------+-----------------+-------------------------------------------------------------+
| intent     | JEV choice      | quote / question / spam / support / other                   |
+------------+-----------------+-------------------------------------------------------------+
| contact    | JEV choice      | 5 matches + new                                             |
+------------+-----------------+-------------------------------------------------------------+
| category   | JEV choice      | catering / group dine-in / workshop / other                 |
+------------+-----------------+-------------------------------------------------------------+
| item       | JEV choice      | items inside that category (stage 2, safe past 255)         |
+------------+-----------------+-------------------------------------------------------------+
| covers     | JEV choice      | 10 / 20 / 30 / 40 / 50 / more                               |
+------------+-----------------+-------------------------------------------------------------+
| date       | JEV noul+choice | stated? then day, month, year, each with not stated         |
+------------+-----------------+-------------------------------------------------------------+
| budget     | JEV noul+choice | stated? then regex spans + not stated                       |
+------------+-----------------+-------------------------------------------------------------+
| consent    | JEV noul        | may we contact about this enquiry                           |
+------------+-----------------+-------------------------------------------------------------+
| discount   | JEV noul        | asks below the rate card                                    |
+------------+-----------------+-------------------------------------------------------------+
| competitor | JEV noul        | comparing other quotes                                      |
+------------+-----------------+-------------------------------------------------------------+
| compute    | CODE            | assemble + validate the date, price 40 covers, margin floor |
+------------+-----------------+-------------------------------------------------------------+
| prose      | WRITE           | quote draft from code-computed facts (one gated call)       |
+------------+-----------------+-------------------------------------------------------------+
| gate       | CODE            | price over floor and consent verified; else saved, not sent |
+------------+-----------------+-------------------------------------------------------------+
| commit     | RUNTIME         | lead + quote draft + follow-up task + trace                 |
+------------+-----------------+-------------------------------------------------------------+
| cost       | -               | JEV 2.0k 0.008 + WRITE medium 0.034 = INR 0.042             |
+------------+-----------------+-------------------------------------------------------------+
~~~

~~~text
+------------------+---------------+-----------+-------------+-------------+-------------+
| flow             | jev questions | jev calls | model calls | INR now     | INR before  |
+==================+===============+===========+=============+=============+=============+
| F1 cafe order    | 10            | 1         | 1 short     | 0.008       | 0.034-0.048 |
+------------------+---------------+-----------+-------------+-------------+-------------+
| F2 refund ticket | 10            | 1         | none        | 0.009       | 0.045       |
+------------------+---------------+-----------+-------------+-------------+-------------+
| F3 invoice photo | 13            | 1         | 1 ocr + 0.2 | 0.023       | 0.134       |
+------------------+---------------+-----------+-------------+-------------+-------------+
| F4 lead to quote | 12            | 1-2       | 1 medium    | 0.008-0.042 | 0.067       |
+------------------+---------------+-----------+-------------+-------------+-------------+

 at 1M users: 1.5B turns/mo -> AI INR 1.68 Cr/mo, against INR 4.27 Cr/mo generative-only
~~~

## 11. Concept screens = what the person sees

The grammar follows tarv9 and tarv10: one card, one primary action, native back. Jev adds
two surfaces of its own: the review card, and the paused state when judgment is off.

Screens below match the shipped app layout and strings. One target delta: the app still
shows Records as a fourth tab, while the target folds Records and Memory into Space as
saved views (tarv9 sec 9.1, sec 18).

~~~text
+-------------------------------------------+
| Slice House                    Sync   Me  |
+-------------------------------------------+
|                                           |
|                ( content )                |
|                                           |
+-------------------------------------------+
|   Space   |   Inbox   |   Bots            |
+-------------------------------------------+
~~~

~~~text
+----------+----------------------------------------------------+----------------------------------------+
| surface  | shows                                              | never shows                            |
+==========+====================================================+========================================+
| Space    | permitted records, metrics, common actions         | fields outside the field policy        |
+----------+----------------------------------------------------+----------------------------------------+
| Inbox    | decisions, exceptions, waits, failures             | an action the user cannot perform      |
+----------+----------------------------------------------------+----------------------------------------+
| Review   | one unsure judgment: answer, probability, evidence | the whole state sent to Jev            |
+----------+----------------------------------------------------+----------------------------------------+
| Bots     | installed and available capabilities               | internal runtime detail                |
+----------+----------------------------------------------------+----------------------------------------+
| Channels | team channel state and customer queues             | provider tokens and raw payloads       |
+----------+----------------------------------------------------+----------------------------------------+
| My Agent | one identity's private work                        | workspace data without live permission |
+----------+----------------------------------------------------+----------------------------------------+
~~~

### Space = permitted facts first

~~~text
+-------------------------------------------+
| [ Slice House v ]              Sync   Me  |
| * Slice House                             |
+-------------------------------------------+
| Sales  Rs.18,420       Open orders    4   |
| Kitchen 2 preparing    1 ready    [Open]  |
+-------------------------------------------+
| [globe] Site Studio                       |
|         Draft, preview and publish      > |
| [bag]   Sell                            > |
+-------------------------------------------+
| [ New order ]   [ New lead ]   [ Ask ]    |
+-------------------------------------------+
~~~

### Inbox = decisions and exceptions

~~~text
+-------------------------------------------+
| [ All areas v ]                           |
| NOW                                       |
+-------------------------------------------+
| Confirm catering menu               Done  |
| * Slice House                             |
+-------------------------------------------+
| Check order #1044  Jev unsure    Review   |
| #T7-4F9A21                                |
|     2 x Margherita        Start    ( )    |
|     1 x Garlic Bread      Ready    ( )    |
|     Payment - Rs.651.00   Collect         |
+-------------------------------------------+
| NEXT                                      |
| Chase the deposit for T7            Done  |
+-------------------------------------------+
~~~

- A durable forget arrives as a Review card: the row, its sources, and what the next
  pack stops carrying (sec 18).

### Review = one unsure judgment, in the open

~~~text
+-------------------------------------------+
| REVIEW  order #1044                       |
+-------------------------------------------+
| asked     which item did "that" mean      |
| answer    Margherita            p 0.62    |
| band      uncertain -> a person decides   |
| evidence  2 close menu matches            |
| trace     saved, replay is free           |
+-------------------------------------------+
| [ Accept Margherita ]    [ Ask Priya ]    |
+-------------------------------------------+
~~~

### Bots = capabilities

~~~text
+-------------------------------------------+
| Bots                             Manage   |
+-------------------------------------------+
| [A] My Agent                     pinned   |
|     your private work                     |
+-------------------------------------------+
| [P] POS                      installed    |
|     orders, payments, stock               |
+-------------------------------------------+
| [S] Sales                    installed    |
|     leads, quotes, follow-up              |
+-------------------------------------------+
| [R] Support                  available    |
|     tickets, returns                      |
+-------------------------------------------+
~~~

### Bot detail = what a bot owns and does

~~~text
+-------------------------------------------+
| < POS                                     |
| [P] orders, payments, stock and register  |
+-------------------------------------------+
| Flows                                     |
| [x] Take an order           3 Actions     |
| [x] Adjust stock            2 Actions     |
| [ ] Custom Flow             1 Action      |
+-------------------------------------------+
| + New Flow                                |
| [        Save        ]   Remove Bot       |
+-------------------------------------------+
~~~

### My Agent = private, ask first

~~~text
+-------------------------------------------+
| My Agent                         Private  |
+-------------------------------------------+
| Ask  [ Plan my week, watch a price... ]   |
+-------------------------------------------+
| Renew insurance       waiting approval    |
| Track laptop price    next check tomorrow |
+-------------------------------------------+
| Goals | Tasks | Files | Apps | Activity   |
+-------------------------------------------+
~~~

- The ask box is a capture router: one Jev call turns a line or a voice note into a task, a
  note, a reminder or an idea, scores priority, and code assembles any dates.

### Record card = one card, morphs by state

~~~text
+-------------------------------------------+
| ORDER #1044   new             [ Accept ]  |
| ORDER #1044   preparing       [  Ready ]  |
| ORDER #1044   paid            [Hand over] |
| ORDER #1044   handed over      complete   |
+-------------------------------------------+
~~~

### Record detail = one record in full

~~~text
+-------------------------------------------+
| ORDER                                     |
| Order #1044                         x     |
| (ready) v7                                |
| PRICE  Rs.651   2 items                   |
| ORDER ITEMS                               |
|   2 x Margherita             Rs.440.00    |
|   1 x Garlic Bread           Rs.180.00    |
|   Total                      Rs.651.00    |
| CONTACT DETAILS                           |
|   [call] Priya  [mail] priya@example.com  |
| RECORD DATA                               |
|   Record ID   ord_1044                    |
|   Owner       Iniya                       |
| [ Mark Done ] [ Open in POS ] [ Edit ]    |
+-------------------------------------------+
~~~

### Action form and confirmation = input, then consequence

~~~text
+-------------------------------------------+
| < Refund #1038                            |
+-------------------------------------------+
| Order          #1038                      |
| Amount         [ Rs.250        ]          |
| Reason         [ item unavailable v ]     |
+-------------------------------------------+
| This refund is irreversible.              |
| It is recorded against your name.         |
+-------------------------------------------+
| [             Confirm             ]       |
| Cancel                                    |
+-------------------------------------------+
~~~

- The form takes typed input; the confirmation names the consequence; the approval commits it.

### Approval = the exact effect

~~~text
+-------------------------------------------+
| Refund #1038                              |
+-------------------------------------------+
| Order          #1038     Amount Rs.250    |
| Destination    original payment           |
| Reason         item unavailable           |
| Requested by   Malar                      |
+-------------------------------------------+
| Expires in 6h      [ Reject ] [ Approve ] |
+-------------------------------------------+
~~~

### States = empty, offline, denied and paused are first class

~~~text
+-------------------------------------------+
| OFFLINE  showing saved data               |
| 2 turns waiting            [ Retry now ]  |
+-------------------------------------------+
| AI PAUSED  manual work continues          |
| Orders, checkout and stock still work     |
| Budget resumes next month    [ Detail ]   |
+-------------------------------------------+
~~~

~~~text
+-------------------------------------------+
| EMPTY  no orders yet                      |
| Take the first order to see it here       |
| [ New order ]                             |
+-------------------------------------------+
| DENIED  you cannot refund here            |
| Ask an owner to reassign this task        |
+-------------------------------------------+
~~~

~~~text
+-------------------+------------------------------------------+-------------------------+
| state             | shows                                    | next action             |
+===================+==========================================+=========================+
| Empty             | purpose plus one starter action          | create or install       |
+-------------------+------------------------------------------+-------------------------+
| Loading           | cached content and a freshness label     | wait                    |
+-------------------+------------------------------------------+-------------------------+
| Offline           | cached read plus a draft badge           | save draft or reconnect |
+-------------------+------------------------------------------+-------------------------+
| Pending           | accepted intent not yet confirmed        | check status            |
+-------------------+------------------------------------------+-------------------------+
| Conflict          | draft preserved, changed facts explained | review                  |
+-------------------+------------------------------------------+-------------------------+
| Denied            | the unavailable action, no hidden data   | request access          |
+-------------------+------------------------------------------+-------------------------+
| Failed            | a specific recoverable reason            | retry or resolve        |
+-------------------+------------------------------------------+-------------------------+
| Approval required | the exact proposed effect                | review                  |
+-------------------+------------------------------------------+-------------------------+
| AI paused         | manual controls stay usable              | continue manually       |
+-------------------+------------------------------------------+-------------------------+
~~~

### Screen rules

~~~text
+------------------------------------------+----------------------------------------------------+
| rule                                     | reason                                             |
+==========================================+====================================================+
| One primary action per screen            | a general user should not choose between equals    |
+------------------------------------------+----------------------------------------------------+
| A card is a projection                   | visibility is never authorization                  |
+------------------------------------------+----------------------------------------------------+
| A card is also the action surface        | the common path completes without navigating away  |
+------------------------------------------+----------------------------------------------------+
| Cards morph by step                      | state first, then the single action for that state |
+------------------------------------------+----------------------------------------------------+
| Actions come from the manifest           | the UI never invents an action                     |
+------------------------------------------+----------------------------------------------------+
| Show the raw probability beside the band | a person sees why a decision was unsure            |
+------------------------------------------+----------------------------------------------------+
| An unsure judgment lands in Inbox        | never act silently on the uncertain band           |
+------------------------------------------+----------------------------------------------------+
| No sparkle, gradient or mascot           | a calm operational tool, not a chatbot             |
+------------------------------------------+----------------------------------------------------+
| Native back, no in-app close             | the hardware back already closes the screen        |
+------------------------------------------+----------------------------------------------------+
| Autocomplete over typing                 | the user is general population, not an operator    |
+------------------------------------------+----------------------------------------------------+
| Policy-hidden fields are absent          | not greyed out, simply not sent                    |
+------------------------------------------+----------------------------------------------------+
~~~

### Home per domain

~~~text
+------------+-----------------------------+----------------------------+--------------------------+
| domain     | home                        | row shows                  | primary action           |
+============+=============================+============================+==========================+
| Sites      | pages and releases          | page, state, live release  | publish reviewed release |
+------------+-----------------------------+----------------------------+--------------------------+
| CRM        | contacts                    | name, stage, next step     | open relationship        |
+------------+-----------------------------+----------------------------+--------------------------+
| Sales      | leads and quotes            | lead, value, due date      | send or request approval |
+------------+-----------------------------+----------------------------+--------------------------+
| Products   | catalog and stock           | item, price, sellable      | edit or adjust           |
+------------+-----------------------------+----------------------------+--------------------------+
| Services   | resources and bookings      | slot, resource, state      | confirm booking          |
+------------+-----------------------------+----------------------------+--------------------------+
| Commerce   | orders and invoices         | order, payment, fulfilment | the state action         |
+------------+-----------------------------+----------------------------+--------------------------+
| Support    | tickets and returns         | ticket, priority, age      | reply or resolve         |
+------------+-----------------------------+----------------------------+--------------------------+
| Operations | purchases and shipments     | supplier, expected, state  | receive or dispatch      |
+------------+-----------------------------+----------------------------+--------------------------+
| Finance    | postings and reconciliation | entry, source, mismatch    | reconcile                |
+------------+-----------------------------+----------------------------+--------------------------+
~~~

### Screen catalog = complete

~~~text
+----+-------------------+---------------------------------------+----------------------+
| #  | screen            | job                                   | primary action       |
+====+===================+=======================================+======================+
| 1  | Boot              | load database and identity            | -                    |
+----+-------------------+---------------------------------------+----------------------+
| 2  | Sign in           | establish identity                    | Continue with Google |
+----+-------------------+---------------------------------------+----------------------+
| 3  | First run         | create or join a workspace            | Create workspace     |
+----+-------------------+---------------------------------------+----------------------+
| 4  | Space             | permitted facts, metrics, actions     | a block action       |
+----+-------------------+---------------------------------------+----------------------+
| 5  | Inbox             | work needing a person                 | the item action      |
+----+-------------------+---------------------------------------+----------------------+
| 6  | Review            | one unsure judgment with its evidence | Accept or ask        |
+----+-------------------+---------------------------------------+----------------------+
| 7  | Bots              | installed and available capabilities  | Install              |
+----+-------------------+---------------------------------------+----------------------+
| 8  | Bot detail        | what a bot owns and does              | Install              |
+----+-------------------+---------------------------------------+----------------------+
| 9  | My Agent          | private work for one identity         | Ask                  |
+----+-------------------+---------------------------------------+----------------------+
| 10 | Record card       | the step state plus its legal actions | the step action      |
+----+-------------------+---------------------------------------+----------------------+
| 11 | Record detail     | one record in full                    | the record action    |
+----+-------------------+---------------------------------------+----------------------+
| 12 | Action form       | schema-driven input                   | Submit               |
+----+-------------------+---------------------------------------+----------------------+
| 13 | Confirmation      | review a consequential action         | Confirm              |
+----+-------------------+---------------------------------------+----------------------+
| 14 | Approval          | one decision bound to one proposal    | Approve              |
+----+-------------------+---------------------------------------+----------------------+
| 15 | POS sale          | take an order                         | Accept order         |
+----+-------------------+---------------------------------------+----------------------+
| 16 | Receipt           | payment recorded, lines, return       | Share or done        |
+----+-------------------+---------------------------------------+----------------------+
| 17 | Register          | the day cash facts                    | Open or close        |
+----+-------------------+---------------------------------------+----------------------+
| 18 | Stock adjust      | correct a quantity                    | Save                 |
+----+-------------------+---------------------------------------+----------------------+
| 19 | Product form      | details, inventory, more              | Save                 |
+----+-------------------+---------------------------------------+----------------------+
| 20 | Site Studio       | draft, preview, publish               | Publish              |
+----+-------------------+---------------------------------------+----------------------+
| 21 | Members and chat  | access, roles, team channel           | Invite or link       |
+----+-------------------+---------------------------------------+----------------------+
| 22 | Channel link      | connect a provider identity           | Confirm link         |
+----+-------------------+---------------------------------------+----------------------+
| 23 | Plans and credits | balance, packs, agents                | Pay                  |
+----+-------------------+---------------------------------------+----------------------+
| 24 | Search            | find records and actions              | Open                 |
+----+-------------------+---------------------------------------+----------------------+
| 25 | Settings          | theme, models, account                | -                    |
+----+-------------------+---------------------------------------+----------------------+
| 26 | Offline           | local reads, queued turns             | Retry now            |
+----+-------------------+---------------------------------------+----------------------+
| 27 | AI paused         | manual work continues                 | Continue manually    |
+----+-------------------+---------------------------------------+----------------------+
~~~

## 12. Channels = one inbox and two families

A channel is how a message reaches a workspace. Team channels carry the team's own traffic
and are exactly one shared destination per workspace. Customer channels carry guests: every
conversation lands in Inbox and is answered by whoever the roles allow.

~~~text
customer channel message           team channel command
        |                                  |
        v                                  v
INGRESS  verify the provider signature, resolve the sender
        |
        v
ONE JEV CALL  intent, arguments, urgency, hazards
        |
        +--> a record or task, committed through the gateway
        |
        +--> a reply drafted, checked, then sent
~~~

- Joining or verifying a team channel grants identity, never business authority.
- A customer conversation is a queue in Inbox; the workspace owns the record, no channel does.
- TAR-native adapters cover what the aggregator does not: website chat and email.

How Jev sits in the path - one battery per message, answered once:

~~~text
+----------+-------------+----------------------------------------------------------------------------------------------+
| step     | lane        | exactly                                                                                      |
+==========+=============+==============================================================================================+
| Inbound  | INGRESS     | verify the signature, resolve the sender, store the raw message                              |
+----------+-------------+----------------------------------------------------------------------------------------------+
| Build    | CODE        | the message + candidate records + channel config + a policy excerpt                          |
+----------+-------------+----------------------------------------------------------------------------------------------+
| One call | JEV         | intent CHOICE, record CHOICE, per-argument CHOICE, stated? NOUL, urgency SCORE, hazard NOULs |
+----------+-------------+----------------------------------------------------------------------------------------------+
| Commit   | RUNTIME     | a record or a task through the gateway                                                       |
+----------+-------------+----------------------------------------------------------------------------------------------+
| Reply    | JEV + WRITE | the outbound check runs first, then prose only when it is needed                             |
+----------+-------------+----------------------------------------------------------------------------------------------+
| Trace    | RUNTIME     | the call is stored; a channel never re-asks the same message                                 |
+----------+-------------+----------------------------------------------------------------------------------------------+
~~~

- The channel never changes the questions; it changes the candidate records and the reply route.
- A photo or voice note goes through OCR or transcription first, then the same battery.
- Outside the 24 hour window a reply must be a template; the window is tracked per conversation.

### Cost = with Jev and without Jev

One message, judged and answered. The two paths differ only in the judgment layer; provider
fees sit outside both (rate INR 95 = USD 1).

~~~text
+---------------+--------------------------------+--------------------------------------------+
| line          | with Jev                       | without Jev                                |
+===============+================================+============================================+
| Calls         | one call, 2.0k in, output free | one 3.0k/500 call plus 0.3 guardrail calls |
+---------------+--------------------------------+--------------------------------------------+
| Retries       | none, the answers are typed    | a 20% pad, counted per user below          |
+---------------+--------------------------------+--------------------------------------------+
| USD / message | 0.000084                       | 0.000443                                   |
+---------------+--------------------------------+--------------------------------------------+
| INR / message | 0.008                          | 0.044 gross, 0.027 after the cache credit  |
+---------------+--------------------------------+--------------------------------------------+
~~~

~~~text
+---------------------+----------------------+--------------------------+
| line                | with Jev             | without Jev              |
+=====================+======================+==========================+
| Messages / month    | 1,500                | 1,500                    |
+---------------------+----------------------+--------------------------+
| Judgment            | INR 11.97            | INR 51.30                |
+---------------------+----------------------+--------------------------+
| Guardrail           | inside the same call | INR 1.50                 |
+---------------------+----------------------+--------------------------+
| Reply prose         | INR 1.00             | inside the judgment call |
+---------------------+----------------------+--------------------------+
| Retry and parse pad | none                 | INR 10.26                |
+---------------------+----------------------+--------------------------+
| Cache credit, 60%   | -                    | -INR 23.15               |
+---------------------+----------------------+--------------------------+
| AI / user / month   | INR 12.97            | INR 39.91                |
+---------------------+----------------------+--------------------------+
~~~

- Provider fees are equal in both paths and stay outside the tables: a service reply inside
  the 24 hour window is free, an India utility template is INR 0.115 and marketing INR 0.8631,
  and the platform charges USD 0.0001 per outbound message after 10,000 free each month.
- The product-wide before line in sec 9 is INR 42.73; the INR 2.82 difference is long work
  (quotes, reports) that no channel message triggers.

### Team channel linking

~~~text
+-------------------------------------------+
| Members & chat                    Close   |
| Slice House                               |
+-------------------------------------------+
| Team chat                                 |
| One team destination.                     |
| Slack - #slice-house                      |
| [ Join team channel ]                     |
| [ Connect my account ]                    |
+-------------------------------------------+
| Send this command to TAR in your channel  |
|   link K7Q2-M4                            |
| Expires after 10 minutes                  |
| [ Confirm link ]  [ Refresh connection ]  |
+-------------------------------------------+
~~~

### Customer channels

~~~text
+-------------------------------------------+
| Channels                                  |
| Customer                                  |
|   WhatsApp    +91 98xx xx21  connected    |
|   Instagram   @slicehouse    connected    |
|   Telegram    @slicehouse    connected    |
|   Website chat               native       |
|   Email       hello@slice     native      |
| Team channel                              |
|   Slack       #slice-house   linked       |
+-------------------------------------------+
~~~

- A provider outage degrades to the Inbox; a message is never a lost record.

### Channel vendor = Zernio, chosen

~~~text
+--------------+----------------------------------------------------------------------------------------------------+
| question     | answer                                                                                             |
+==============+====================================================================================================+
| Chosen       | Zernio, for both families, in one integration                                                      |
+--------------+----------------------------------------------------------------------------------------------------+
| Coverage     | 10 networks plus blogs and ads; WhatsApp, Telegram, Instagram DM, Messenger                        |
+--------------+----------------------------------------------------------------------------------------------------+
| Price        | 1-2 accounts free, then $6 / $3 / $1 per account per month (about INR 85 at $1)                    |
+--------------+----------------------------------------------------------------------------------------------------+
| Messages     | 10,000 outbound free per month, then $0.0001 each; Meta fees at zero markup                        |
+--------------+----------------------------------------------------------------------------------------------------+
| No extras    | no seats, no platform fee, no per-message markup; cheaper per account than Ayrshare                |
+--------------+----------------------------------------------------------------------------------------------------+
| Cost rule    | a separate measured line drawn from credits, never bundled (3 accounts about INR 255/mo)           |
+--------------+----------------------------------------------------------------------------------------------------+
| Fallback     | if the publishing meter outgrows its credits (the 101+ band), self-host Postiz for publishing only |
+--------------+----------------------------------------------------------------------------------------------------+
| Honest flags | young vendor after a rebrand; OAuth token custody; shared team rate limits; 98.2% token refresh    |
+--------------+----------------------------------------------------------------------------------------------------+
~~~

## 13. Plans and credits = the meter the person sees

The envelope is sold as credits, so the whole cost model stays visible in one screen. One
credit costs Rs.0.10; a paid plan grants a thousand credits a month, and optional AI is
drawn from that grant (sec 8, sec 9).

~~~text
+--------------------+-------------------+------------------+-----------------------+
| item               | price             | credits          | note                  |
+====================+===================+==================+=======================+
| India plan         | Rs.500 / month    | 1,000 / month    | 1 credit = Rs.0.10    |
+--------------------+-------------------+------------------+-----------------------+
| Top-Up Starter     | Rs.100            | 1,000            | at cost               |
+--------------------+-------------------+------------------+-----------------------+
| Top-Up Growth      | Rs.500            | 5,000            | at cost               |
+--------------------+-------------------+------------------+-----------------------+
| Top-Up Scale       | Rs.1,000          | 10,000           | at cost               |
+--------------------+-------------------+------------------+-----------------------+
| Owned workspace    | -                 | 100 / month each | included in the plan  |
+--------------------+-------------------+------------------+-----------------------+
| Joined workspace   | free              | -                | member access         |
+--------------------+-------------------+------------------+-----------------------+
| Personal workspace | free              | -                | one identity, private |
+--------------------+-------------------+------------------+-----------------------+
| Manual actions     | free              | -                | no model call         |
+--------------------+-------------------+------------------+-----------------------+
| Public browsing    | free              | -                | reads are free        |
+--------------------+-------------------+------------------+-----------------------+
| Expiry             | none while active | -                | -                     |
+--------------------+-------------------+------------------+-----------------------+
~~~

~~~text
+---------------------------+-------------------+
| agent                     | credits per query |
+===========================+===================+
| Workspace Agent           | 2                 |
+---------------------------+-------------------+
| Messaging and CRM         | 2-5               |
+---------------------------+-------------------+
| Sales and Growth          | 10-50             |
+---------------------------+-------------------+
| Operations and Finance    | 3-20              |
+---------------------------+-------------------+
| Site Builder              | 0                 |
+---------------------------+-------------------+
| Research and Intelligence | 2-100             |
+---------------------------+-------------------+
~~~

~~~text
+-------------------------------------------+
| Credits & Agents                    x     |
| [ Credits ]   Workspace    Agents         |
+-------------------------------------------+
|             1,000,000                     |
|                credits                    |
|         ( - )  +1,000  ( + )              |
|         [ Pay Rs.1,000 ]                  |
+-------------------------------------------+
| Credit Packs                              |
| Work Pack        Rs.500/mo  1,000 credits |
| Top-Up Starter   Rs.100     1,000 credits |
| Top-Up Growth    Rs.500     5,000 credits |
| Top-Up Scale     Rs.1,000  10,000 credits |
| Expiry           None while active        |
+-------------------------------------------+
~~~

- Credits meter optional AI only: manual work, checkout and reads never draw one.
- Exhaustion pauses optional AI first (sec 8).
- Credits are the product's own unit; tokens and dollars never appear in the app.

## 14. Restaurant end to end = every screen in one day

One cafe, one day, eleven stages. The stage grid names the screens; each screen is drawn
once in this document, so this walkthrough references it and never repeats it.

~~~text
+------------+---------+----------------------------+---------------------------------+----------------------+
| stage      | role    | screens                    | Jev decides                     | code commits         |
+============+=========+============================+=================================+======================+
| 1 Open     | owner   | Create workspace, Space    | -                               | workspace and roles  |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 2 Install  | owner   | Bots, Bot detail           | -                               | bots and flows       |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 3 Setup    | owner   | POS, Product form          | product details draft           | product and register |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 4 Sell     | cashier | POS sale                   | items, quantity, modifiers      | order and payment    |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 5 Receive  | cashier | Receipt                    | -                               | payment and receipt  |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 6 Prepare  | kitchen | Inbox order row            | -                               | item states          |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 7 Handover | cashier | Record card, Record detail | -                               | fulfilment           |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 8 Message  | owner   | Inbox, Review              | intent and item, uncertain band | order draft          |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 9 Refund   | manager | Approval, Action form      | clause and urgency              | refund on approval   |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 10 Close   | owner   | Space, Register            | -                               | day totals           |
+------------+---------+----------------------------+---------------------------------+----------------------+
| 11 Check   | owner   | Plans and credits          | -                               | credit spend         |
+------------+---------+----------------------------+---------------------------------+----------------------+
~~~

Stages six to nine use the screens already drawn in sec 11: the Inbox order row, the Record
card, the Record detail, the Review card, the Action form and the Approval. The remaining
screens of the day follow.

### First run

~~~text
+-------------------------------------------+
| [logo]                                    |
| New workspace                             |
| A shared place for your work.             |
| Workspace name                            |
| [ My workspace                 ]          |
| [          Create workspace          ]    |
| Cancel                                    |
+-------------------------------------------+
~~~

### The sale

~~~text
+-------------------------------------------+
| < POS  Slice House                   ...  |
| Register open                             |
| Sell  Orders  Stock  Customers  Register  |
| [ Search products or barcode ]            |
+-------------------------------------------+
| [M] Margherita   [G] Garlic Bread         |
| [C] Chai         [L] Lemon Soda           |
+-------------------------------------------+
| Cart - 3                         Clear    |
| [icon] Add customer   Priya               |
|   2 x Margherita  Rs.440.00     - 2 +     |
|   1 x Garlic Bread Rs.180.00    - 1 +     |
| Discount % [0]                            |
| Subtotal Rs.620  Tax Rs.31  Total Rs.651  |
| [ Order details ]  [ Cash ]  [ UPI ]      |
+-------------------------------------------+
~~~

### The receipt

~~~text
+-------------------------------------------+
| Payment recorded                          |
| Order #1044                               |
+-------------------------------------------+
|   2 x Margherita             Rs.440.00    |
|   1 x Garlic Bread           Rs.180.00    |
|   Total                      Rs.651.00    |
|   Method                     Cash         |
|   Change                     Rs.49.00     |
+-------------------------------------------+
| [ Share receipt ] [Return sale] [ Done ]  |
+-------------------------------------------+
~~~

### The register

~~~text
+-------------------------------------------+
| Register                                  |
+-------------------------------------------+
| Sales today        Rs.18,420   12 orders  |
| Low stock          2 items                |
| Opening cash       Rs.2,000               |
| Expected cash      Rs.20,420              |
+-------------------------------------------+
| [ Close register ]                        |
+-------------------------------------------+
~~~

### The site

~~~text
+-------------------------------------------+
| Site Studio                         x     |
| Draft, preview and publish your site      |
| BUSINESS BRIEF                            |
|   Slice House                             |
| SITE STRUCTURE                            |
|   1  Home                    [x]          |
|   2  Menu                    [x]          |
+-------------------------------------------+
| [ Open live site ]                        |
| [ Create draft ]   [ Publish ]            |
+-------------------------------------------+
~~~

### The device

~~~text
+-------------------------------------------+
| < Settings                                |
| APPEARANCE                                |
|   Theme Mode                    Light >   |
| AI MODELS & ENGINE                        |
|   Embedding Model 384-dim       Ready     |
|   Hammer LLM 0.5B               Cached    |
|   LFM 2.5 LLM 1.2B              Download  |
| ACCOUNT                                   |
|   Priya - priya@example.com               |
|   Sign Out                                |
| tar. Version 1.0.0                        |
+-------------------------------------------+
~~~

- Every screen above shares the states strip and the review band rules of sec 11.
- The cashier never sees a Jev answer; the kitchen never sees a price (role policy).

## 15. POS = every screen, two ways

The POS runs complete deterministically in the app, and the same actions are reachable
agentically from a team channel, a customer channel, the website chatbot or a voice note.
Both paths converge on the same gateway actions. The sell, receipt and register screens are
drawn in sec 14; this section adds the remaining POS screens and the two-path view.

~~~text
cashier taps                    channel, chatbot or voice
     |                                    |
     v                                    v
CODE, deterministic                 ONE JEV CALL
     |                                    |
     +----------------+-------------------+
                      v
        RUNTIME  the same actions, the same log
~~~

### Every POS screen, by flow

~~~text
+----------+---------------+---------------+------------------+----------------------+
| flow     | step          | screen        | lane             | commits              |
+==========+===============+===============+==================+======================+
| SETUP    | store details | Setup         | CODE             | store settings       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | first product | Product form  | CODE + JEV draft | product record       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | opening stock | Stock adjust  | CODE             | stock movement       |
+----------+---------------+---------------+------------------+----------------------+
| SETUP    | open the till | Register      | CODE             | register session     |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | pick items    | POS sale      | CODE             | cart, then order     |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | take payment  | POS sale      | CODE             | order + payment      |
+----------+---------------+---------------+------------------+----------------------+
| SELL     | hand over     | Receipt       | CODE             | fulfilment           |
+----------+---------------+---------------+------------------+----------------------+
| RETURN   | select lines  | Return sale   | CODE             | return + refund path |
+----------+---------------+---------------+------------------+----------------------+
| CUSTOMER | add a person  | Customer form | CODE             | contact record       |
+----------+---------------+---------------+------------------+----------------------+
| REGISTER | close the day | Register      | CODE             | day totals           |
+----------+---------------+---------------+------------------+----------------------+
~~~

**Setup**

~~~text
+-------------------------------------------+
| Set up your store                         |
| Three steps, about a minute               |
+-------------------------------------------+
| 1  Store details            done          |
| 2  First product        [ Add product ]   |
| 3  Register             [ Open register ] |
+-------------------------------------------+
| [ Continue ]                              |
+-------------------------------------------+
~~~

**Product form**

~~~text
+-------------------------------------------+
| < Product                                 |
| [ Details ]   Inventory   More            |
+-------------------------------------------+
| Name        [ Margherita       ]          |
| Price       [ Rs.220           ]          |
| Category    [ Pizza v          ]          |
+-------------------------------------------+
| Jev draft   [ Draft with Jev ]            |
| [ Save ]                                  |
+-------------------------------------------+
~~~

**Stock adjust**

~~~text
+-------------------------------------------+
| < Adjust Margherita                       |
+-------------------------------------------+
| On hand          24                       |
| [ - ]  [ 2 ]  [ + ]                       |
| Reason  [ delivery arrival  v ]           |
| New on hand      22                       |
+-------------------------------------------+
| [ Update stock ]                          |
+-------------------------------------------+
~~~

**Customer**

~~~text
+-------------------------------------------+
| < Add customer                            |
+-------------------------------------------+
| Name     [ Priya               ]          |
| Phone    [ +91 98xx xx21       ]          |
| Note     [ regular, no onions  ]          |
+-------------------------------------------+
| [ Save customer ]                         |
+-------------------------------------------+
~~~

**Return sale**

~~~text
+-------------------------------------------+
| < Return sale                             |
+-------------------------------------------+
| Order #1044         paid Rs.651           |
| [x] 2 x Margherita   Rs.440.00            |
| [ ] 1 x Garlic Bread Rs.180.00            |
| Reason  [ damaged item  v ]               |
+-------------------------------------------+
| [ Return selected ]                       |
+-------------------------------------------+
~~~

### The same sale, two ways

~~~text
+----------+-------------------+-----------------------------------+------------+
| step     | in the app        | from a channel                    | lane       |
+==========+===================+===================================+============+
| Start    | tap New order     | send a message or ask the chatbot | -          |
+----------+-------------------+-----------------------------------+------------+
| Items    | tap product tiles | JEV item CHOICE over the menu     | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Quantity | - 2 + stepper     | JEV quantity CHOICE               | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Modifier | note field        | JEV modifier NOULs                | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Customer | pick a contact    | JEV customer CHOICE, top 5        | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Payment  | tap Cash or UPI   | JEV pay CHOICE                    | CODE / JEV |
+----------+-------------------+-----------------------------------+------------+
| Commit   | pos.order.save    | pos.order.save                    | RUNTIME    |
+----------+-------------------+-----------------------------------+------------+
| Receipt  | the same receipt  | the same receipt                  | CODE       |
+----------+-------------------+-----------------------------------+------------+
~~~

### Inputs that drive the same actions

~~~text
+------------------+----------------------------------+-------------------------+------------------------------+
| input            | path                             | example                 | extra cost                   |
+==================+==================================+=========================+==============================+
| tap              | CODE, local, no model            | cashier takes the order | none                         |
+------------------+----------------------------------+-------------------------+------------------------------+
| team channel     | command to the gateway           | start T1-3F             | none                         |
+------------------+----------------------------------+-------------------------+------------------------------+
| customer channel | ingress, then one Jev call       | WhatsApp order          | INR 0.008                    |
+------------------+----------------------------------+-------------------------+------------------------------+
| website chat     | native adapter, one Jev call     | the chatbot on the site | INR 0.008                    |
+------------------+----------------------------------+-------------------------+------------------------------+
| voice note       | transcription, then one Jev call | the owner dictates      | INR 0.008 plus transcription |
+------------------+----------------------------------+-------------------------+------------------------------+
~~~

- Both paths commit the same action ids through the same gateway; an order tapped in the app
  and one placed from WhatsApp are indistinguishable in the log.
- The app path is fully deterministic: no model call for a price, a stock count, a total or
  a payment.
- The agentic path adds exactly one Jev call (INR 0.008) and nothing else; typed answers fill
  the same fields the buttons fill.
- Agentic inputs can be switched off per workspace; POS keeps working while optional AI is
  paused.

## 16. Site bot = a chat, one plan, one check, persona routes

Tapping the Site Bot opens a chat. Everything else follows the same boundary as the rest of
TAR: the LLM creates (the design compile, the page code, the copy), code and the database
execute and hold truth, and Jev chooses, scores, approves and routes. Jev never designs,
never writes code or copy, and never invents a price, a product or a discount.

### The chat is the front door

~~~text
+-------------------------------------------+
| Site bot                          Draft   |
+-------------------------------------------+
| You  make a landing page for farmers,     |
|      warm and simple                      |
| Bot  Done. Warm counter design, hero,     |
|      menu, hours and contact. Copy is     |
|      grounded: 4 of 4 checks passed.      |
|      [ Preview ]   [ Publish ]            |
+-------------------------------------------+
| [ Ask for a change...              ] [>]  |
+-------------------------------------------+
| [ Change design ]   [ Add a page ]        |
+-------------------------------------------+
~~~

- One message can build, change, set up personas or publish; each message is routed by one
  Jev call and commits through the gateway as a registered action.
- The chat is a WRITE surface: the only place a model speaks in the open.
- A change request returns a draft; nothing reaches a visitor until publish.

### The build = design.md to design.json to a release

~~~text
+-------------+---------------+----------------------------------------+
| asset       | created by    | purpose                                |
+=============+===============+========================================+
| design.md   | owner or LLM  | the human visual reference             |
+-------------+---------------+----------------------------------------+
| design.json | LLM, once     | the compact typed rules Jev reads      |
+-------------+---------------+----------------------------------------+
| components  | LLM and code  | the allowed building blocks            |
+-------------+---------------+----------------------------------------+
| variants    | LLM, reviewed | approved page combinations per persona |
+-------------+---------------+----------------------------------------+
| decisions   | code          | the question bundles Jev answers       |
+-------------+---------------+----------------------------------------+
| data        | database      | products, stock, prices, hours         |
+-------------+---------------+----------------------------------------+
~~~

The LLM reads the full design.md once and compiles design.json, the compact typed manifest
(theme, style, colors, pastels, the rules: no shadows, radius floors, the component list).
From then on Jev receives only that compact manifest and the one decision, never the whole
markdown again.

~~~text
+---------+------------+-------------------------------------------------------------------+
| step    | lane       | exactly                                                           |
+=========+============+===================================================================+
| Chat    | APP        | one message: build, change, personas or publish                   |
+---------+------------+-------------------------------------------------------------------+
| Facts   | CODE       | records, hours, contact, the design.json manifest                 |
+---------+------------+-------------------------------------------------------------------+
| Compile | LLM        | design.md becomes design.json once; pages and copy are generated  |
+---------+------------+-------------------------------------------------------------------+
| Checks  | CODE       | no shadows, radius floors, palette, fonts, prices match           |
+---------+------------+-------------------------------------------------------------------+
| Review  | JEV        | semantic fit: too SaaS-like, pastels at random, missing editorial |
+---------+------------+-------------------------------------------------------------------+
| Publish | RUNTIME    | approval binds the release hash; R2 keeps every release           |
+---------+------------+-------------------------------------------------------------------+
| Visits  | JEV        | one routing call per session, then one slot call per page         |
+---------+------------+-------------------------------------------------------------------+
| Refresh | CODE + JEV | facts changed: re-render free, only broken slots re-asked         |
+---------+------------+-------------------------------------------------------------------+
~~~

- The plan is stored: a regeneration re-renders free and asks again only for what broke.
- Publish binds the approval to one release hash; R2 keeps every release for rollback.

### The design library = design.md files

Each design is one design.md in the open DESIGN.md shape. The site bot ships a curated
library and an owner may upload their own; code parses and validates every file before it
can be chosen. Jev selects one with a Choice over the identifier and its descriptors.

~~~text
+----------+--------------------------------------+---------------------------------------------+
| part     | holds                                | used by                                     |
+==========+======================================+=============================================+
| tokens   | colors, type, corners, spacing, name | code compiles CSS; Jev sees the descriptors |
+----------+--------------------------------------+---------------------------------------------+
| sections | allowed cards, order rules, variants | code builds the page; Jev picks presence    |
+----------+--------------------------------------+---------------------------------------------+
| tone     | two lines of voice and examples      | the copy call and the check call            |
+----------+--------------------------------------+---------------------------------------------+
| proof    | one example release that shipped     | the owner in the picker                     |
+----------+--------------------------------------+---------------------------------------------+
~~~

### Every judgment, mapped

~~~text
+-----------------+-------------------------------------+------------------------------------------+
| area            | Jev decides                         | example                                  |
+=================+=====================================+==========================================+
| Request routing | what the message wants              | "build a landing page" or "edit pricing" |
+-----------------+-------------------------------------+------------------------------------------+
| Readiness       | what the plan is missing            | a goal, a CTA, an audience or content    |
+-----------------+-------------------------------------+------------------------------------------+
| Template        | which existing template fits        | a quote landing for a supplier           |
+-----------------+-------------------------------------+------------------------------------------+
| Components      | which allowed blocks to use         | hero photo, then quilt cards             |
+-----------------+-------------------------------------+------------------------------------------+
| Sections        | order and presence per page         | specs first for engineers                |
+-----------------+-------------------------------------+------------------------------------------+
| CTA             | the safest next action              | request a quote, not buy now             |
+-----------------+-------------------------------------+------------------------------------------+
| Design review   | does the output fit the rules       | too SaaS-like, lime overused             |
+-----------------+-------------------------------------+------------------------------------------+
| Revision        | what kind of regeneration is needed | content only, or a full redesign         |
+-----------------+-------------------------------------+------------------------------------------+
| Publish gate    | publish, revise or send to a person | pass only at high confidence             |
+-----------------+-------------------------------------+------------------------------------------+
| Persona         | which visitor type this is          | family, budget, business, health         |
+-----------------+-------------------------------------+------------------------------------------+
| Intent          | what the visitor wants now          | buy, compare, quote, support             |
+-----------------+-------------------------------------+------------------------------------------+
| Variant         | which approved experience to serve  | procurement hero or reseller hero        |
+-----------------+-------------------------------------+------------------------------------------+
| Language        | which language route                | a Tamil speaking visitor gets Tamil      |
+-----------------+-------------------------------------+------------------------------------------+
| Personalization | is using history safe enough        | only at high confidence                  |
+-----------------+-------------------------------------+------------------------------------------+
| Catalog routing | which categories to show            | water testing to meters and reagents     |
+-----------------+-------------------------------------+------------------------------------------+
| Lead score      | how serious a lead is               | a high value lead goes to sales now      |
+-----------------+-------------------------------------+------------------------------------------+
| Chat routing    | is an LLM call justified            | tracking needs none, complexity does     |
+-----------------+-------------------------------------+------------------------------------------+
| Tool approval   | may the agent act                   | create a quote, or not                   |
+-----------------+-------------------------------------+------------------------------------------+
| Escalation      | when to stop automating             | money, complaints, low confidence        |
+-----------------+-------------------------------------+------------------------------------------+
| Agent role      | which specialist handles it         | sales, support, catalog, logistics       |
+-----------------+-------------------------------------+------------------------------------------+
| Answer check    | is a reply acceptable               | contradicts product data, regenerate     |
+-----------------+-------------------------------------+------------------------------------------+
| Data quality    | is the entity data usable           | a product with no price or image         |
+-----------------+-------------------------------------+------------------------------------------+
| Workflow next   | the next defined step               | lead, contacted, quoted, converted       |
+-----------------+-------------------------------------+------------------------------------------+
| Experiments     | which variant to test               | hero A against hero B                    |
+-----------------+-------------------------------------+------------------------------------------+
| Signals         | what the visit implies              | browsing, buying, leaving, support       |
+-----------------+-------------------------------------+------------------------------------------+
| Notify          | does a person need to know now      | an urgent lead, a payment issue          |
+-----------------+-------------------------------------+------------------------------------------+
| Cost control    | skip the LLM where a card serves    | orders and FAQs need no call             |
+-----------------+-------------------------------------+------------------------------------------+
~~~

### The check and the gate

Deterministic checks stay code: no box-shadow, button radius at or above the floor, canvas
colour, the approved palette, font fallbacks, and prices and stock against the database.
Jev adds only the semantic review: visual fit, named violations, safe to publish,
confidence. The route is publish at high confidence, revise with the named violation, or a
person when money or policy is involved.

### Persona routes = one site, chosen per visitor

Variants are approved once; a visit picks among them:

~~~text
+---------------------------------+----------------+----------------------------------------+
| signals                         | Jev persona    | site shown                             |
+=================================+================+========================================+
| reorders milk and snacks weekly | family shopper | weekly essentials, saved list, slots   |
+---------------------------------+----------------+----------------------------------------+
| sorts by price, uses coupons    | budget shopper | offers, bundles, price rows            |
+---------------------------------+----------------+----------------------------------------+
| adds 20 kg rice and bulk oil    | business buyer | bulk prices, GST invoice, repeat order |
+---------------------------------+----------------+----------------------------------------+
| searches organic and millet     | health focused | organic and nutrition filters          |
+---------------------------------+----------------+----------------------------------------+
| first visit, no signals         | unknown        | the balanced default home              |
+---------------------------------+----------------+----------------------------------------+
~~~

~~~text
+-------------------------------------------+
| Visitors see                              |
| [ Farmer ]  [ Company ]  [ Default ]      |
+-------------------------------------------+
| Persona    company           p 0.92       |
| Hero       supply-chain proof             |
| CTA        request a quote                |
| Row        services and proof             |
| Language   English                        |
+-------------------------------------------+
| [ Preview as visitor ]  [ Tune variants ] |
+-------------------------------------------+
~~~

- No LLM runs on a visit: one Jev call picks the persona, intent and language; the slot
  picks follow in one batched call per page; code renders existing components, and low
  confidence serves the default page.
- Prices, products and stock always come from the database; Jev never shows a fact nobody
  stored.
- The LLM runs only when a visitor asks for something unique, and Jev decides whether that
  call is justified.

### Agentic persona sites = per-slot selection and measurement

A persona site is four overlays. Layer 0 is the build (the code and approved variant sets,
compiled once). Layer 1 is the session persona (one Jev call, stored). Layer 2 is the
per-slot selection (one Jev batched call per page). Layers 3 and 4 are measurement and the
offline adaptation loop. Jev is present only in Layer 1 and Layer 2; everything else is code
or the offline LLM.

~~~text
+------------------------------------------------------------------+
| LAYER 4  ADAPT   offline LLM proposes, code allocates            |
+------------------------------------------------------------------+
| LAYER 3  MEASURE treatment exposure + outcome logged             |
+------------------------------------------------------------------+
| LAYER 2  SLOT    per-slot Jev pick from approved variants        |
+------------------------------------------------------------------+
| LAYER 1  PERSONA session-level Jev call: signals -> persona      |
+------------------------------------------------------------------+
| LAYER 0  BUILD   design.md -> design.json -> LLM compiles code   |
+------------------------------------------------------------------+
~~~

A slot is the smallest page unit Jev can personalize: hero copy, section heading, proof
block, CTA, background. For every slot the workspace holds an approved variant set, written
by the LLM in the build and reviewed before publish. Jev picks one variant per slot from
that set; it never invents.

~~~text
+---------------+-------------------------------------+-----------------------------------+
| slot          | decision                            | approved set shape                |
+===============+=====================================+===================================+
| hero copy     | which headline or body text to use  | approved headlines per persona    |
+---------------+-------------------------------------+-----------------------------------+
| hero design   | which color and layout emphasis     | approved visual treatments        |
+---------------+-------------------------------------+-----------------------------------+
| section order | which page ordering to use          | approved orderings per persona    |
+---------------+-------------------------------------+-----------------------------------+
| proof block   | which testimonial or stat set       | approved proof sets               |
+---------------+-------------------------------------+-----------------------------------+
| CTA           | which call-to-action                | approved CTA variants             |
+---------------+-------------------------------------+-----------------------------------+
| background    | which background color or tone      | approved palette entries          |
+---------------+-------------------------------------+-----------------------------------+
| presence      | should this slot appear             | variants include an absent option |
+---------------+-------------------------------------+-----------------------------------+
| display gate  | does the visitor pass the condition | a yes or no list of gate rules    |
+---------------+-------------------------------------+-----------------------------------+
~~~

Rules:
- No Jev call sits in the render path. Persona and slot decisions are computed once per
  session (or precomputed per segment) and stored; the edge reads the stored decision, so
  personalization has no LCP cost.
- Every slot has an approved variant set. Jev picks from it; it never invents. If the set
  has no match for the persona, the default is served.
- The workspace owns the isolation boundary: approved variants, candidate copy and display
  gates never leak across workspaces.
- Slots are bounded per page to avoid decision fatigue (six to ten is the practical range).
- The default page is always the fallback if confidence is low or the slot set has no match.
- A failed or uncertain Jev call never blocks the page; it falls back to the default and
  logs the fallback for the offline job to review.

### The measurement loop = improve without re-generating

Every personalized visit is logged with its thesis, slot choices and outcome. A deterministic
control path (the generic default) exists for direct comparison.

~~~text
measure exposure + outcome
        |
        v
offline LLM proposes new hypotheses and variants
        |
        v
code allocates weight; approved variants created
        |
        v
Jev picks from the updated variant sets
        |
        v
measure again
~~~

- An offline LLM job reads the measurement log and proposes new hypotheses; code allocates
  weight toward proven variants and archives those below a minimum lift.
- The hypothesis loop is optional, but the whole personalization value depends on it; without
  it the site stays at the static build with no adaptation.
- Approved variants created by the loop must pass the same Jev review battery that the
  original site passed: no design-system violation can ship without a check.
- Metrics the code tracks: conversion rate per thesis, variant lift, confidence in the
  hypothesis and time since the last hypothesis was validated.

### Screens

**Pick a design**

~~~text
+-------------------------------------------+
| Pick a design                             |
| Matched to a cafe, warm and simple        |
+-------------------------------------------+
| [*] Warm counter     cafe, warm, dense    |
| [ ] Clean slate      minimal, airy        |
| [ ] Night kitchen    dark, bold, food     |
| [ ] Market stall     playful, bright      |
| [ ] Atelier          editorial, quiet     |
| [ ] Grid             technical, sharp     |
+-------------------------------------------+
| [ Use this design ]   [ See it live ]     |
+-------------------------------------------+
~~~

**Site plan**

~~~text
+-------------------------------------------+
| Site plan                                 |
| Slice House - from workspace facts        |
+-------------------------------------------+
| Sections                                  |
| [x] hero        warm line from the brief  |
| [x] menu        12 products, six shown    |
| [x] about       three-line story          |
| [x] hours       from the hours record     |
| [ ] gallery     no photos yet             |
| [x] contact     address, phone, email     |
+-------------------------------------------+
| Copy check  4 of 4 grounded, no claims    |
| [ Publish ]   [ Edit sections ]           |
+-------------------------------------------+
~~~

- The Site Studio entry is drawn in sec 14; the chat and the persona preview are drawn above
  in this section.

### Cost = the build and the visit

Rate INR 95 = USD 1. Jev USD 0.042 per 1M input with free output; DeepSeek V4 Flash
USD 0.09 / 0.18.

~~~text
+-------------------------+------------------------------------+---------------------------------------------+
| line                    | with Jev                           | without Jev                                 |
+=========================+====================================+=============================================+
| Compile design.md once  | LLM call, INR 0.10                 | the same                                    |
+-------------------------+------------------------------------+---------------------------------------------+
| Plan per build          | Jev 2.6k = INR 0.010               | the LLM invents the choices                 |
+-------------------------+------------------------------------+---------------------------------------------+
| Generate pages and copy | LLM, about INR 0.12                | the same, but unconstrained                 |
+-------------------------+------------------------------------+---------------------------------------------+
| Checks                  | code, free                         | the same                                    |
+-------------------------+------------------------------------+---------------------------------------------+
| Review                  | Jev 2.2k = INR 0.009               | human proofreading                          |
+-------------------------+------------------------------------+---------------------------------------------+
| Retries                 | rare, the choices were constrained | one or two extra generations, INR 0.12 each |
+-------------------------+------------------------------------+---------------------------------------------+
| Total first build       | about INR 0.24                     | about INR 0.36-0.48 with retries            |
+-------------------------+------------------------------------+---------------------------------------------+
~~~

~~~text
+----------------------------+-----------------------------------------+------------------------------------+
| line                       | with Jev routing                        | without                            |
+============================+=========================================+====================================+
| Decision                   | one Jev call, 1.2k = INR 0.005          | an LLM personalization, INR 0.034  |
+----------------------------+-----------------------------------------+------------------------------------+
| 8 slots per page (batched) | one call, 5.6k = INR 0.022              | one LLM personalization, INR 0.034 |
+----------------------------+-----------------------------------------+------------------------------------+
| Render                     | existing components, free               | generated or restyled per visit    |
+----------------------------+-----------------------------------------+------------------------------------+
| Repeat visits              | served from the same approved variant   | repeated LLM calls                 |
+----------------------------+-----------------------------------------+------------------------------------+
| Escalation                 | one LLM call only where it is justified | every unique ask already paid      |
+----------------------------+-----------------------------------------+------------------------------------+
| At 100k visits a month     | INR 500                                 | INR 3,400 or more                  |
+----------------------------+-----------------------------------------+------------------------------------+
~~~

- Jev pays for itself where it skips an LLM call or gates a release; run on every request
  it only adds a small cost.
- Site Builder stays at 0 credits (sec 13): a workspace builds once or twice, and visits are
  the cheap path above.

## 17. Workflow builder = a sentence, one composition, a reviewed flow

A sentence becomes a flow draft. Jev composes the goal, trigger, steps, wiring, guards and
waits from the workspace's own action catalog; code validates and mints; a person publishes.
Execution is deterministic: the runtime walks the graph, a step starts when its dependencies
finish, and every step re-checks authority at run time. Jev never runs a flow and never
publishes one.

### The flow model we need

~~~text
+---------+----------------------------------+-------------------------------------------------------+
| part    | holds                            | example                                               |
+=========+==================================+=======================================================+
| trigger | what starts the run              | manual, a record event, a schedule, a channel message |
+---------+----------------------------------+-------------------------------------------------------+
| steps   | the actions and their edges      | order.list -> account.get -> summarize                |
+---------+----------------------------------+-------------------------------------------------------+
| args    | where each field comes from      | a literal, the record, or a named step output         |
+---------+----------------------------------+-------------------------------------------------------+
| needs   | the steps that must finish first | step 3 waits on steps 1 and 2                         |
+---------+----------------------------------+-------------------------------------------------------+
| guard   | an approved condition            | only if the order is paid                             |
+---------+----------------------------------+-------------------------------------------------------+
| wait    | a signal that pauses the step    | until the provider confirms                           |
+---------+----------------------------------+-------------------------------------------------------+
| on_fail | the declared recovery            | retry, skip, escalate, or park for a person           |
+---------+----------------------------------+-------------------------------------------------------+
~~~

Today a flow is an ordered list of action ids with no engine behind it; this section defines
the shape that both the composer and the walker use.

### Registered actions = current callable boundary

The current harness registers the 28 actions below. A Flow can only contain these registered
IDs after the Bot is installed. `flow.publish` accepts an ordered list and `flow.start`
creates a Run at its first action; it does not yet execute a general multi-step graph. The
catalog is the implementation source of truth at `tarharness/src/registry/catalog.ts` and
`tarharness/src/pos/catalog.ts`.

| Area | Registered actions |
|---|---|
| Flow and Bots | `flow.publish`, `flow.start`, `directory.install`, `directory.remove` |
| Records and tasks | `record.create`, `record.update`, `task.create`, `task.complete` |
| POS setup and products | `pos.open`, `pos.setup`, `pos.product.save`, `pos.product.content.save`, `pos.product.draft`, `pos.stock.adjust` |
| POS customers and orders | `pos.customer.save`, `pos.order.save`, `pos.order.item.update`, `pos.order.cancel`, `pos.checkout`, `pos.refund` |
| POS register | `pos.register.open`, `pos.register.close` |
| Sites | `site.generate`, `site.update`, `site.compile`, `site.publish`, `site.rollback`, `site.refresh` |
| Web research | `web.search` |

The existing templates cover POS sales, orders and returns, stock, customers and register;
Sales follow-up and review; Team onboarding and review; Operations requests and review; and
Site building and preview. Missing Sales, CRM, service, support, purchasing, finance and
messaging actions are target capabilities, not callable actions today.

### The composition pipeline

~~~text
+----------+------------+------------------------------------------------------------------------------------------------------+
| step     | lane       | exactly                                                                                              |
+==========+============+======================================================================================================+
| Goal     | JEV        | one call: goal kind CHOICE, record kind CHOICE, trigger CHOICE, outcome CHOICE, must-haves NOULs     |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Recall   | CODE       | shortlist actions from the workspace catalog by keyword, role and output type                        |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Steps    | JEV        | per candidate: needed NOUL, action CHOICE, needs NOUL over the last five steps, field sources CHOICE |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Guards   | JEV        | pick from approved operators; code compiles the condition                                            |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Validate | JEV + CODE | JEV: goal reached, inputs bound, none forbidden; CODE: ids exist, acyclic, bounded, gates inserted   |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Review   | HUMAN      | the canvas is approved; publish mints the definition                                                 |
+----------+------------+------------------------------------------------------------------------------------------------------+
| Run      | RUNTIME    | a step starts when its needs finish; authority is rechecked at each step                             |
+----------+------------+------------------------------------------------------------------------------------------------------+
~~~

### Every composition judgment, mapped

~~~text
+--------------+------------------------------------+--------------------------------------------------+
| area         | Jev decides                        | example                                          |
+==============+====================================+==================================================+
| Goal         | what the sentence wants            | a morning brief from orders and the account      |
+--------------+------------------------------------+--------------------------------------------------+
| Trigger      | what starts it                     | manual now, or on every paid order               |
+--------------+------------------------------------+--------------------------------------------------+
| Recall       | which actions are relevant         | shortlist three of the current twenty eight      |
+--------------+------------------------------------+--------------------------------------------------+
| Steps        | which action each step runs        | pos.orders.list, then crm.account.get            |
+--------------+------------------------------------+--------------------------------------------------+
| Edges        | which step feeds which             | summarize needs steps 1 and 2                    |
+--------------+------------------------------------+--------------------------------------------------+
| Binding      | where each field comes from        | the record id from step 1 output                 |
+--------------+------------------------------------+--------------------------------------------------+
| Guard        | which approved condition applies   | only if the order is paid                        |
+--------------+------------------------------------+--------------------------------------------------+
| Wait         | which signal pauses a step         | until the provider confirms                      |
+--------------+------------------------------------+--------------------------------------------------+
| Gates        | does money or access need a person | a refund step becomes an approval                |
+--------------+------------------------------------+--------------------------------------------------+
| Validate     | is the draft sound                 | every input bound, no cycle, no forbidden action |
+--------------+------------------------------------+--------------------------------------------------+
| Reuse        | is this an existing flow           | offer the published one instead                  |
+--------------+------------------------------------+--------------------------------------------------+
| Failure      | what happens on a failed step      | retry once, then park for a person               |
+--------------+------------------------------------+--------------------------------------------------+
| Review after | did the run reach the goal         | score the run, feed the loop                     |
+--------------+------------------------------------+--------------------------------------------------+
| Cost         | reuse instead of recomposing       | no calls when the fingerprint matches            |
+--------------+------------------------------------+--------------------------------------------------+
~~~

### The gate

Code rejects any step naming an action outside the catalog, any forbidden action and any
cycle; money, access and publication steps are rewritten as human approvals; the draft is
inert until a person publishes it. A model may propose, never mint authority.

### Execution is deterministic

Steps start when their needs finish; results pass only by explicit binding; every step
re-checks roles and policy at run time; a failed step follows its declared on_fail or parks
the run for a person; the scheduler owns recovery. Jev may be consulted mid-run only for a
step declared a judgment step; it never picks a new step.

### The workflow canvas

~~~text
+-------------------------------------------+
| Workflow lab                     Jev on   |
| "brief me before the 10am call"           |
+-------------------------------------------+
| 4 steps                     [ Build ]     |
| [1] List orders       pos.orders.list     |
|       |                                   |
| [2] Get account      crm.account.get      |
|       |                                   |
| [3] Summarize        judge.summarize      |
|       |                                   |
| [4] Create doc       doc.create           |
+-------------------------------------------+
| 4 steps, every input bound, no money step |
| [ Run once ]  [ Publish ]  [ Edit ]       |
+-------------------------------------------+
~~~

### Cost = composing with Jev and without

~~~text
+------------------+------------------------------------------+--------------------------------------------+
| line             | with Jev                                 | without                                    |
+==================+==========================================+============================================+
| Goal and steps   | two to four calls, 12k in = INR 0.05     | an LLM draft, 8k in / 2k out = INR 0.10    |
+------------------+------------------------------------------+--------------------------------------------+
| Validity         | ids come from the catalog, so they exist | invented tools and bad wiring are rejected |
+------------------+------------------------------------------+--------------------------------------------+
| Retries          | rare                                     | one or two extra drafts, INR 0.10 each     |
+------------------+------------------------------------------+--------------------------------------------+
| Total to a draft | about INR 0.05                           | about INR 0.10 to 0.25                     |
+------------------+------------------------------------------+--------------------------------------------+
| Reuse            | a fingerprint match, no calls            | recompose every time                       |
+------------------+------------------------------------------+--------------------------------------------+
~~~

- Composition happens once per goal; the same sentence reuses the published flow through a
  stored fingerprint, with no calls.
- When no action fits a step, Jev returns no candidate and the draft shows a
  missing-capability note instead of inventing one.

### Limits

- Steps are bounded (about twelve), and edges look back at most five steps, so the question
  count stays cheap.
- Guards use approved operators only; code compiles them, so no free-form expression ships.
- A large catalog needs two-stage recall: a category choice, then the action choice.

## 18. Memory = rows, one pack, one excerpt

TAR remembers what the work teaches. Memory is not chat history, and not a file
store: it is one record type, a compiled pack, and a bounded excerpt that rides the
one Jev call (sec 5). An agent reads memory; only the engine writes it.

### One record type

~~~text
+------------+--------------------------------------------------------------------+
| kind       | holds                                                              |
+============+====================================================================+
| profile    | identity, context, autonomy calibration, communication style       |
+------------+--------------------------------------------------------------------+
| preference | what the person or the workspace prefers                           |
+------------+--------------------------------------------------------------------+
| person     | a member, customer or supplier worth remembering                   |
+------------+--------------------------------------------------------------------+
| fact       | a durable truth: hours, an arrangement, a standing instruction     |
+------------+--------------------------------------------------------------------+
| recap      | what happened in a period, composed in code from records           |
+------------+--------------------------------------------------------------------+
| pack       | the compiled revision the next turn reads                          |
+------------+--------------------------------------------------------------------+
~~~

- Memory is read-only to every agent, bot and model: no turn writes a row.
- Rows live in the workspace database, so authority, versions, replay and traces
  apply unchanged.

### The memory record

~~~text
+------------+------------------------------------------------------------+
| field      | rule                                                       |
+============+============================================================+
| kind       | one word: profile, preference, person, fact, recap, pack   |
+------------+------------------------------------------------------------+
| aliases    | the words that must find it: names, spellings, synonyms    |
+------------+------------------------------------------------------------+
| links      | the other memory rows and records it relates to            |
+------------+------------------------------------------------------------+
| source     | the turn or event id the row came from                     |
+------------+------------------------------------------------------------+
| state      | fresh, superseded or forgotten                             |
+------------+------------------------------------------------------------+
| expires    | set for ephemeral facts; swept in code                     |
+------------+------------------------------------------------------------+
| importance | drives excerpt ranking; a person can raise it              |
+------------+------------------------------------------------------------+
| confidence | the band of the answer that wrote it                       |
+------------+------------------------------------------------------------+
| version    | every change is a new version, never an edit               |
+------------+------------------------------------------------------------+
~~~

~~~text
fresh --correct--> superseded --prune--> forgotten
  ^                                        |
  +------------- expires (code) -----------+
~~~

- A correction is a new row that supersedes the old one; the old row stays readable.
- A row is never deleted. Forgotten is a state, and the trace keeps the reason.

### The pack

~~~text
memory rows -> WORK compile (cron + threshold) -> R2 bytes + hash on the pack row
~~~

- The pack is compiled by the WORK lane, never by a turn: cron sees 25 new events,
  or 24h with any change, and the queue runs the compile.
- It is a pinned revision: a compile writes a pack row carrying the hash, the size
  and the time, and a turn records the pack revision its state was built from.
- Pack cap 8k tokens (sec 8). Over the cap, code prunes by importance, age and
  expiry.

### The excerpt

~~~text
+-----------+-------+--------------------------------------------------+
| step      | lane  | exactly                                          |
+===========+=======+==================================================+
| shortlist | CODE  | alias and keyword match over fresh rows, cap 20  |
+-----------+-------+--------------------------------------------------+
| rank      | CODE  | match x importance x recency, cap 300 tokens     |
+-----------+-------+--------------------------------------------------+
| gate      | JEV   | two Nouls ride the call already being paid for   |
+-----------+-------+--------------------------------------------------+
~~~

**Rule = the excerpt is chosen in code.** SQL and aliases shortlist; the ranking is
match times importance times recency; the cap is 300 tokens. Jev never searches and
never sees the pack.

- The two Nouls ask whether using this history is safe, and whether memory
  contradicts the turn. A failing answer drops or flags the excerpt.
- The safety question is the sec 16 personalization question, reused; no second
  question is invented for it.

### The consolidation job

~~~text
+-----------+---------+-----------------------------------------------------+
| step      | lane    | exactly                                             |
+===========+=========+=====================================================+
| trigger   | WORK    | cron sees 25 new events, or 24h with any change     |
+-----------+---------+-----------------------------------------------------+
| shortlist | CODE    | recent events, open rows, regex candidates          |
+-----------+---------+-----------------------------------------------------+
| judge     | JEV     | one call per batch: the questions below             |
+-----------+---------+-----------------------------------------------------+
| commit    | RUNTIME | rows, links, supersede, the new pack, the trace     |
+-----------+---------+-----------------------------------------------------+
| review    | HUMAN   | uncertain merges and forgets go to the Inbox        |
+-----------+---------+-----------------------------------------------------+
~~~

- One call per batch, one idempotency key per batch: a retry replays, never
  duplicates.
- Only code-shortlisted candidates enter the state, so consolidation cost is
  bounded by the shortlist, not by everything memory holds.

### Forgetting

~~~text
+--------------------------------------------------+
| FORGET  allergy note on Priya                    |
+--------------------------------------------------+
| row      the note and the two turns behind it    |
+--------------------------------------------------+
| effect   the next pack stops carrying it         |
+--------------------------------------------------+
| kept     the row stays as forgotten in the log   |
+--------------------------------------------------+
| [ Forget it ]                   [ Keep ]         |
+--------------------------------------------------+
~~~

- Ephemeral facts carry expires and are swept in code; nothing asks.
- A durable fact forgets only by a human decision, and the card states exactly
  what the next pack stops carrying.

### Every memory judgment, mapped

Consolidation asks these in one call per batch; recall rides the call the turn
already makes.

~~~text
+----------------------------------+--------+-----------------------------------------+
| question                         | shape  | what code does                          |
+==================================+========+=========================================+
| same fact as another row         | NOUL   | over 0.7: supersede the loser and link  |
+----------------------------------+--------+-----------------------------------------+
| the old row still holds          | NOUL   | under 0.3: supersede it as stale        |
+----------------------------------+--------+-----------------------------------------+
| durable or ephemeral             | CHOICE | sets the expiry default for the row     |
+----------------------------------+--------+-----------------------------------------+
| which row this corrects          | CHOICE | shortlist plus none; supersede the pick |
+----------------------------------+--------+-----------------------------------------+
| how important this is            | SCORE  | sets importance for excerpt ranking     |
+----------------------------------+--------+-----------------------------------------+
| this needs a person              | NOUL   | yes opens an Inbox card                 |
+----------------------------------+--------+-----------------------------------------+
| safe to use this history         | NOUL   | the sec 16 question, reused at recall   |
+----------------------------------+--------+-----------------------------------------+
| memory contradicts the turn      | NOUL   | prefer the turn, mark the row           |
+----------------------------------+--------+-----------------------------------------+
~~~

### Screens = memory is readable and correctable

Memory is a saved view in Space, not a fourth surface (sec 11). The view shows rows
with their kind, source turn and state; the actions are raise importance, open the
source turn, and forget. Durable forgets arrive in the Inbox as a Review card.

~~~text
+--------------------------------------------------+
| MEMORY                                           |
+--------------------------------------------------+
| Allergy note    person       fresh, 2 sources    |
+--------------------------------------------------+
| Prep time       fact         fresh, 1 source     |
+--------------------------------------------------+
| Deposit         preference   fresh, 1 source     |
+--------------------------------------------------+
| [ Raise ]   [ Open source ]   [ Forget ]         |
+--------------------------------------------------+
~~~

### Cost = with memory and without

~~~text
+----------------------+-------------------+------------------+
| line                 | with memory       | without memory   |
+======================+===================+==================+
| recall               | INR 1.80 a month  | 0                |
+----------------------+-------------------+------------------+
| consolidation        | INR 0.48 a month  | 0                |
+----------------------+-------------------+------------------+
| total memory         | INR 2.28          | 0                |
+----------------------+-------------------+------------------+
| AI line, per user    | INR 19.10         | INR 16.82        |
+----------------------+-------------------+------------------+
| a fact stated once   | recalled          | re-asked or lost |
+----------------------+-------------------+------------------+
| failure mode         | a stale excerpt   | no continuity    |
+----------------------+-------------------+------------------+
~~~

- Assumptions are sec 9: 1,500 turns per user per month, Jev at 2,000 input tokens
  (USD 0.042 per 1M, INR 95 = USD 1), output free.
- Recall adds 300 tokens to turns already paid for: 450k tokens a month = INR 1.80.
  Consolidation is 60 runs at 2.0k tokens = INR 0.48.
- Reconciliation: the sec 9 AI line moves INR 16.82 -> INR 19.10. The INR 100
  envelope and the INR 400 margin floor both hold.

### Limits

- The excerpt is the ceiling: a fact the shortlist never offers can never be chosen.
- A wrong merge loses a fact; merges supersede rather than delete, and undo via the
  trace.
- The pack is a pinned revision: a change mid-session waits for the next compile.
- Ranking can starve a rare fact, so importance is settable by a person: an allergy
  outranks a preference.
- No vector index, no embeddings and no memory vendor: recall stays in code, and
  the one vendor is already Jev.
- No agent write access and no silent forgetting: rows change through the gateway,
  and durability is a human decision.
- Procedures stay Flows (sec 17); memory never stores a how-to.
- Markdown is a rendering, not the store: memory reads in Space today, and exports
  to OKF only when a human-export need is measured.
- Not rebuilt: the records table and gateway, traces, the queue and cron, the R2
  pointer and hash pattern, the Inbox, and the sec 16 personalization question.

## 19. Adoption and proof

**Rule = a route is enabled only where the log proves it right.**

~~~text
off  -->  offline evaluation  -->  sampled shadow  -->  enabled route
          (held-out cases)        (Jev logs only)      (proven only)

        every step kept per route, never for the product as a whole
~~~

- Offline evaluation: at least 1,000 held-out representative cases per route, English
  and the launch languages, including ambiguous input, injection attempts and refusals.
- Sampled shadow: Jev reads and logs its proposal; code acts as before. Nothing changes
  for the user; the log measures the route against real outcomes.
- Enabled: only where the log shows the judgment meets or beats the current path on
  completed tasks, latency and cost.
- Metrics per route: cost per correctly completed task, end-to-end latency, abstention
  rate, escalation rate, injection resistance.

Build order:

~~~text
+-------+----------------------------------------------------+---------------------------------------+
| Stage | Deliver                                            | Must prove                            |
+=======+====================================================+=======================================+
| 1     | Kernel and gateway (exists today)                  | one path, replay, no duplicate effect |
+-------+----------------------------------------------------+---------------------------------------+
| 2     | Judgment layer: bundles, one call per turn, traces | typed answers stored and replayed     |
+-------+----------------------------------------------------+---------------------------------------+
| 3     | Memory: rows, pack, excerpt, consolidation         | recall measured on held-out turns     |
+-------+----------------------------------------------------+---------------------------------------+
| 4     | Router ladder, gates, budgets                      | no spend on deterministic work        |
+-------+----------------------------------------------------+---------------------------------------+
| 5     | App surfaces: review band, drafts, ai-paused       | offline never lies about truth        |
+-------+----------------------------------------------------+---------------------------------------+
| 6     | First routes enabled alone                         | a measured win, then the next route   |
+-------+----------------------------------------------------+---------------------------------------+
| 7     | Scale and contracts                                | rate limits, price, residency         |
+-------+----------------------------------------------------+---------------------------------------+
~~~

## 20. Risks and references

~~~text
+----------------------------------------+--------------------------------------------------------------------------------------+
| Risk                                   | Honest statement                                                                     |
+========================================+======================================================================================+
| Jev is not cheaper than one cheap call | It wins only where it replaces measurable work; single-judgment turns lose           |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Batching neutrality is a vendor claim  | Verify 20-60 questions on noisy real state; measure task success, not just stability |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Thresholds are guesses until earned    | Every gate needs labelled TAR data per action; demos are starting points             |
+----------------------------------------+--------------------------------------------------------------------------------------+
| English-first quality                  | Hindi, Tamil, Bahasa and Vietnamese route more to review; ops cost, not AI cost      |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Text only                              | A photo or voice user always needs OCR or Whisper in front; cascades cost real money |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Single vendor, early access            | Rate limits bind before price: density hits them first; keep a WRITE fallback        |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Residency                              | Personal data leaving to a closed-weight foreign model needs a legal answer          |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Flat cost                              | Nothing gets cheaper with scale; the credit cap and gates stay load-bearing          |
+----------------------------------------+--------------------------------------------------------------------------------------+
| The excerpt is the ceiling             | A fact the shortlist never offers can never be chosen; coverage is the limit         |
+----------------------------------------+--------------------------------------------------------------------------------------+
| A wrong merge loses a fact             | Merges supersede and never delete, undo via the trace; uncertain merges wait         |
+----------------------------------------+--------------------------------------------------------------------------------------+
| The pack is a pinned revision          | A change mid-session waits for the next compile: minutes of lag, not instant         |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Ranking can starve a rare fact         | An allergy must outrank a preference: importance is settable by a person             |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Consolidation cost grows with rows     | Only shortlisted candidates enter state; the shortlist is the scaling edge           |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Memory is derived personal data        | It leaves to a closed-weight model; the residency answer covers memory too           |
+----------------------------------------+--------------------------------------------------------------------------------------+
~~~

~~~text
+----------------------------------+--------------------------------------------------------+
| Source                           | Guidance taken                                         |
+==================================+========================================================+
| jev/jev.md                       | Jev contract, recipes, confidence bands, honest limits |
+----------------------------------+--------------------------------------------------------+
| TypeSafe docs (docs.typesafe.ai) | API, models, jaggedness page                           |
+----------------------------------+--------------------------------------------------------+
| techstack.md                     | Envelope, prices, exchange rate, scale model           |
+----------------------------------+--------------------------------------------------------+
| tarv8 sec 8-9, tarv9 sec 3/10    | Break-even rules, router gate, budget discipline       |
+----------------------------------+--------------------------------------------------------+
| tarv10.md                        | Core objects, execution laws, screen grammar           |
+----------------------------------+--------------------------------------------------------+
~~~

**TAR = reusable core + domain rules + one judgment call per turn. Jev proposes;
Runtime accepts; the log remembers.**
