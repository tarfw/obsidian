
> Local speed. Shared truth. One Jev call per turn.

**Status = target architecture.** The first release proves the core; domain packages extend it. Basis = v8, v9, v10 and the TypeSafe reference in jev.md (model jev-1.13.0).

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
- A probability near a threshold flips an action, so the middle is an explicit uncertain
  outcome routed to a person, never silently to a model.
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
- Thresholds are set per action by its stakes and tuned on labelled TAR examples. A demo
  threshold is a starting point, not a rule.

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
| My Agent | one identity's private work                        | workspace data without live permission |
+----------+----------------------------------------------------+----------------------------------------+
~~~

### Space = permitted facts first

~~~text
+-------------------------------------------+
| Slice House                Today 19 Sep   |
+-------------------------------------------+
| Sales    Rs.18,420       Open orders   4  |
| Kitchen  2 preparing     1 ready   [Open] |
| Sales    3 follow-ups due          [Open] |
| Site     1 enquiry new             [Open] |
+-------------------------------------------+
| [ New order ]   [ New lead ]   [ Ask ]    |
+-------------------------------------------+
~~~

### Inbox = decisions and exceptions

~~~text
+-------------------------------------------+
| Inbox                              6 open |
+-------------------------------------------+
| REVIEW   Jev unsure  order #1044   [Open] |
| APPROVE  Refund #1038  Rs.250      [Open] |
| DUE      Follow up Priya           [Open] |
| FAILED   Receipt #1042            [Retry] |
| CONFLICT Draft order changed     [Review] |
+-------------------------------------------+
| Completed today                    [View] |
+-------------------------------------------+
~~~

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

- The raw probability stays visible beside the band; the person decides, code records.

### Bots = capabilities

~~~text
+-------------------------------------------+
| Bots                             Manage   |
+-------------------------------------------+
| (M) My Agent                     pinned   |
| your private work                         |
+-------------------------------------------+
| (P) POS      orders, stock      installed |
| (S) Sales    leads, quotes      installed |
| (C) CRM      contacts           installed |
| (T) Team     members, jobs      installed |
| (R) Support  tickets           available  |
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

### Record card = one card, morphs by state

~~~text
+-------------------------------------------+
| ORDER #1044   new             [ Accept ]  |
| ORDER #1044   preparing       [  Ready ]  |
| ORDER #1044   paid            [Hand over] |
| ORDER #1044   handed over      complete   |
+-------------------------------------------+
~~~

- The card carries the action for its current step, so the common path never leaves it.

### Record detail = facts, lines, then one action

~~~text
+-------------------------------------------+
| < Order #1044                       Edit  |
+-------------------------------------------+
| Preparation        ready                  |
| Payment            paid                   |
| Fulfilment         waiting handover       |
+-------------------------------------------+
| Items                                     |
| 2 x Margherita      Rs.440         ready  |
| 1 x Garlic Bread    Rs.180         ready  |
+-------------------------------------------+
| Tax                 Rs.31                 |
| TOTAL               Rs.651                |
+-------------------------------------------+
| [              Hand over             ]    |
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
+----+---------------+---------------------------------------+----------------------+
| #  | screen        | job                                   | primary action       |
+====+===============+=======================================+======================+
| 1  | Boot          | load database and identity            | -                    |
+----+---------------+---------------------------------------+----------------------+
| 2  | Sign in       | establish identity                    | Continue with Google |
+----+---------------+---------------------------------------+----------------------+
| 3  | First run     | create or join a workspace            | Create workspace     |
+----+---------------+---------------------------------------+----------------------+
| 4  | Space         | permitted facts, metrics, actions     | a block action       |
+----+---------------+---------------------------------------+----------------------+
| 5  | Inbox         | work needing a person                 | the item action      |
+----+---------------+---------------------------------------+----------------------+
| 6  | Review        | one unsure judgment with its evidence | Accept or ask        |
+----+---------------+---------------------------------------+----------------------+
| 7  | Bots          | installed and available capabilities  | Install              |
+----+---------------+---------------------------------------+----------------------+
| 8  | My Agent      | private work for one identity         | Ask                  |
+----+---------------+---------------------------------------+----------------------+
| 9  | Bot detail    | what a bot owns and does              | Install              |
+----+---------------+---------------------------------------+----------------------+
| 10 | Record card   | the step state plus its legal actions | the step action      |
+----+---------------+---------------------------------------+----------------------+
| 11 | Record detail | one record in full                    | the record action    |
+----+---------------+---------------------------------------+----------------------+
| 12 | Action form   | schema-driven input                   | Submit               |
+----+---------------+---------------------------------------+----------------------+
| 13 | Confirmation  | review a consequential action         | Confirm              |
+----+---------------+---------------------------------------+----------------------+
| 14 | Approval      | one decision bound to one proposal    | Approve              |
+----+---------------+---------------------------------------+----------------------+
| 15 | POS sale      | take an order                         | Accept order         |
+----+---------------+---------------------------------------+----------------------+
| 16 | Stock adjust  | correct a quantity                    | Save                 |
+----+---------------+---------------------------------------+----------------------+
| 17 | Flow view     | a process and its runs                | Start                |
+----+---------------+---------------------------------------+----------------------+
| 18 | Run progress  | durable progress and the wait         | the wait action      |
+----+---------------+---------------------------------------+----------------------+
| 19 | Search        | find records and actions              | Open                 |
+----+---------------+---------------------------------------+----------------------+
| 20 | Settings      | account, device, models               | -                    |
+----+---------------+---------------------------------------+----------------------+
| 21 | Offline       | local reads, queued turns             | Retry now            |
+----+---------------+---------------------------------------+----------------------+
| 22 | AI paused     | manual work continues                 | Continue manually    |
+----+---------------+---------------------------------------+----------------------+
~~~

## 12. Adoption and proof

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
| 3     | Router ladder, gates, budgets                      | no spend on deterministic work        |
+-------+----------------------------------------------------+---------------------------------------+
| 4     | App surfaces: review band, drafts, ai-paused       | offline never lies about truth        |
+-------+----------------------------------------------------+---------------------------------------+
| 5     | First routes enabled alone                         | a measured win, then the next route   |
+-------+----------------------------------------------------+---------------------------------------+
| 6     | Scale and contracts                                | rate limits, price, residency         |
+-------+----------------------------------------------------+---------------------------------------+
~~~

## 13. Risks and references

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
| Single vendor, early access            | Price, behavior and rate limits can move; the WRITE fallback must exist              |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Residency                              | Personal data leaving to a closed-weight foreign model needs a legal answer          |
+----------------------------------------+--------------------------------------------------------------------------------------+
| Flat cost                              | Nothing gets cheaper with scale; the credit cap and gates stay load-bearing          |
+----------------------------------------+--------------------------------------------------------------------------------------+
~~~

~~~text
+----------------------------------+--------------------------------------------------------+
| Source                           | Guidance taken                                         |
+==================================+========================================================+
| jev.md                           | Jev contract, recipes, confidence bands, honest limits |
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
