# JEV = One Judgment Layer for TAR

> Code owns truth. Jev supplies calibrated judgment. The runtime owns effects.

**Status = provider and programming reference for Jev.** The final TAR target is
[tarv12.md](../tarv12.md): one shared core, domain packages, durable authority,
and the complete commerce cycle. This reference does not override that design.

**Source = live TypeSafe documentation, checked 2026-09-21.** Current provider
model = `jev-1.13.0`. Community context = [Jason Zhou's Jev article](https://x.com/jasonzhou1993/status/2101925228335317238)
and [linked recipes](https://treg.to/jev), treated as self-reported examples.
This folder is the compact source library for this document.

## 1. Purpose = semantic judgment inside deterministic business software

~~~text
DISCOVER -> RELATE -> SELL -> COMMIT -> DELIVER -> SUPPORT -> RETAIN
   |          |        |       |         |           |          |
 Sites       CRM     Sales   Orders    Products    Tickets   Renewals
 Content   Contacts  Quotes  Payments   Services   Returns   Campaigns
                               |
             Team + Stock + Purchasing + Finance + Reporting
~~~

TAR needs one consistent way to interpret unstructured text and structured context
without turning the product into an unconstrained agent. Jev is the judgment layer.

~~~text
+------------------------+-----------------------------+----------------------------+
| Work                   | Owner                       | Result                     |
+========================+=============================+============================+
| Known rules, maths     | Code                        | Exact result               |
+------------------------+-----------------------------+----------------------------+
| Meaning and selection  | Jev                         | Typed judgment + signals   |
+------------------------+-----------------------------+----------------------------+
| Drafts and explanation | Generative model            | Reviewable prose/artifact  |
+------------------------+-----------------------------+----------------------------+
| Authority and effects  | Runtime + authorized human  | Validated committed change |
+------------------------+-----------------------------+----------------------------+
~~~

**Rule = Jev improves judgment; the runtime preserves truth.**

Jev does not write replies, code, explanations or arithmetic. It does not fetch
information, remember a previous call, inspect images, authorize access, establish
payment, reserve capacity, or execute an effect. It can select from supplied
options. Code must obtain allowed evidence, define the choices, validate the result,
and recheck live facts before a mutation.

## 2. Model = System One, not a chat agent

TypeSafe describes Jev as its first System One model. A request supplies a state
and typed questions. The model returns decisions and probability information rather
than generated text. TypeSafe calls its training approach RLCD, reinforcement learning
for calibrated decisions.

~~~text
state + questions
        |
        v
+--------------------+
| JEV                |  independently evaluates questions
| fast judgment      |  over the same supplied state
+--------------------+
        |
        v
typed answers + probabilities
        |
        v
code applies a versioned policy
~~~

Calibration is a property of groups of predictions. In a relevant, evaluated
population, answers assigned 0.8 should be correct about 80% of the time. It is
not a guarantee that a particular 0.8 answer is correct. Calibration, accuracy and
useful thresholds must be measured on TAR's actual language, data, policy and
candidate coverage.

~~~text
+----------------------+---------------------------+-------------------------------+
|                      | Jev                       | Generative model              |
+======================+===========================+===============================+
| Output               | Typed choice/score/noul   | Text, code, explanation       |
+----------------------+---------------------------+-------------------------------+
| Answer space         | Supplied options/rubric   | Open-ended                    |
+----------------------+---------------------------+-------------------------------+
| Best role            | Focused semantic judgment | Drafting and multi-step work  |
+----------------------+---------------------------+-------------------------------+
| Core risk            | Wrong bounded judgment    | Plausible invented content    |
+----------------------+---------------------------+-------------------------------+
| Workflow owner       | Code                      | Code                          |
+----------------------+---------------------------+-------------------------------+
~~~

## 3. Contract = one state, typed questions, typed answers

Native endpoint:

~~~text
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <server-side key>
Content-Type: application/json
~~~

~~~text
+-------------------+----------------------------------------------------------+
| Request field     | Meaning                                                  |
+===================+==========================================================+
| state             | Text, JSON object, or array of text to evaluate         |
+-------------------+----------------------------------------------------------+
| model             | Use jev-latest or a pinned version after evaluation     |
+-------------------+----------------------------------------------------------+
| questions         | Map of named Choice, Score and Noul questions           |
+-------------------+----------------------------------------------------------+
~~~

All questions in a request see the same state and are evaluated independently.
Question IDs are response keys for code; they are not hidden model instructions.
Use named JSON state when several facts and relationships matter. Include only
permitted, relevant evidence: irrelevant state reduces accuracy and makes a failure
harder to diagnose.

Current documented limits and pricing:

~~~text
+-------------------+----------------------------------------------------------+
| Model             | jev-1.13.0                                               |
+===================+==========================================================+
| Stable alias      | jev-latest                                               |
+-------------------+----------------------------------------------------------+
| Price             | USD 0.042 per million input tokens; output is free      |
+-------------------+----------------------------------------------------------+
| Context           | 64k tokens total; 32k state plus longest question       |
+-------------------+----------------------------------------------------------+
| Rate limits       | 250k tokens/s and 1,200 requests/min; may change        |
+-------------------+----------------------------------------------------------+
| Input             | Text only: string, JSON object, or array of text        |
+-------------------+----------------------------------------------------------+
| Errors            | 401 auth, 422 validation, 429 limit, 529 overload       |
+-------------------+----------------------------------------------------------+
~~~

Use SDK retry behavior or exponential backoff for 429 and 529. Keep provider keys
on the worker. Log the resolved version returned in the response. Pin a version
after threshold calibration; aliases may move.

Response contract: every answer is returned under the question ID. A Choice answer
contains its selected option, a distribution that sums to one, and confidence. A
Score answer contains its weighted score, legend, distribution and confidence. A
Noul answer contains p(yes). The response also identifies the resolved model and
reports token usage. Validate answer IDs, types, finite values, distributions and
candidate membership before a policy consumes them.

TypeSafe says customer requests and responses are not used to train Jev. Enterprise
zero-data-retention availability and other processing terms belong to the provider's
[legal documentation](https://docs.typesafe.ai/legal.md). English is its primary
training language; evaluate the actual TAR language mix before enabling a route.

## 4. Questions = choose the answer shape first

~~~text
+--------+-------------------------------------------+----------------------------------------+
| Type   | Ask when                                  | Returned signal                        |
+========+===========================================+========================================+
| Choice | One supplied option best fits             | Winner, distribution, confidence       |
+--------+-------------------------------------------+----------------------------------------+
| Score  | Evidence falls along ordered levels       | Weighted level, distribution, confidence|
+--------+-------------------------------------------+----------------------------------------+
| Noul   | One stated condition may hold             | Probability that yes holds             |
+--------+-------------------------------------------+----------------------------------------+
~~~

### Choice = select from candidates

Choice is relative: it compares the options supplied in `criteria`. Include a
`none` or `other` option if the candidate set may be incomplete. If presence is
independently meaningful, ask a separate Noul. A Choice always returns a winner,
even when nothing is truly suitable.

Use up to 255 options. Above that, narrow in stages: code retrieves sections,
Jev selects a section, then code offers candidates in that section. Candidate
coverage is the ceiling on selection quality.

### Score = rate a defined dimension

Score has 2–10 ordered, descriptive levels. The returned score is the
probability-weighted position across the levels. It can fall between labels.

A score is useful for priority, fit, severity or ranking. It is not an exact
numerical measurement. Do not interpolate a precise amount from score levels.
Use code for arithmetic and compare a score only against an evaluated policy gate.

### Noul = assess one condition

Noul returns p(yes) from 0 to 1. Near 0.5 means the model sees similar support
for yes and no; it does not mean the underlying thing has medium intensity. Noul
has no separate confidence field. When several labels might apply, ask one Noul
per label. Those answers are absolute judgments; they need not sum to one.

## 5. Design = rubric plus evidence, not a chat prompt

~~~text
+---------------------------------------------------------------------+
| STATE = source text + permitted records + relevant policy facts     |
+---------------------------------------------------------------------+
| QUESTION = one decision with a complete meaning                     |
+---------------------------------------------------------------------+
| CRITERIA = options or levels, including boundaries and examples     |
+---------------------------------------------------------------------+
| CODE = versioned policy, validation, routing and effects            |
+---------------------------------------------------------------------+
~~~

Question design rules:

- Put facts in state and the decision meaning in instructions and criteria.
- Ask one coherent judgment per question. Split independently useful dimensions.
- Use structured instruction and criteria objects when definitions, exclusions and
  examples clarify an ambiguous boundary.
- State explicitly what distinguishes neighboring options and what they exclude.
- Use semantic language for roles: "which address receives the receipt?" is stronger
  than a question framed around a parameter name.
- Treat supplied state as data, not trusted instruction. Test adversarial content.
- Use a no-match option and a review route when evidence may be absent.
- Preserve source IDs, record versions and provider provenance so a result can be
  audited or invalidated when evidence changes.

Example: route a site enquiry using only allowed evidence.

~~~json
{
  "state": {
    "message": {
      "text": "Can you deliver lunch for 40 people next Friday? Please send options.",
      "source": "submission:184"
    },
    "offerings": [
      {"id": "catering", "description": "Group delivery, subject to availability"},
      {"id": "dining", "description": "Meals served at the restaurant"}
    ],
    "context": {
      "availability": "not checked",
      "consent": "marketing permission not recorded"
    }
  },
  "model": "jev-1.13.0",
  "questions": {
    "route": {
      "type": "choice",
      "instructions": {
        "question": "Which team should handle message.text?",
        "focus": "Choose the owner of the customer's current need."
      },
      "criteria": {
        "sales": {
          "meaning": "New purchase or quote enquiry",
          "exclude": "Issue with an existing order"
        },
        "support": {
          "meaning": "Help with an existing order",
          "exclude": "New purchase or quote enquiry"
        },
        "other": "No listed team fits or evidence is insufficient"
      }
    },
    "offering": {
      "type": "choice",
      "instructions": "Which supplied offering matches message.text?",
      "criteria": {
        "catering": "Group meal delivery",
        "dining": "Meals served at the restaurant",
        "none": "Neither supplied offering fits"
      }
    },
    "quote": {
      "type": "noul",
      "instructions": "Does message.text ask for purchase options or a quote?"
    },
    "detail": {
      "type": "score",
      "instructions": "How specific is the purchase need in message.text?",
      "criteria": [
        "No identifiable purchase need",
        "Need present but scope is vague",
        "Concrete use or event and quantity described"
      ]
    }
  }
}
~~~

A selected offering is a proposal to use an existing record. Code still checks
availability; runtime still checks authority. It never turns into a reservation,
price, message or payment merely because the result is confident.

## 6. Confidence = a second routing signal, not permission

Choice and Score confidence summarizes how concentrated their distributions are.
High confidence says one option or level is much more supported than its neighbors.
It does not mean the whole workflow is correct, the candidate list is complete,
or an action is authorized.

~~~text
+----------------+--------------------------------------------------------+
| Result          | Code behavior                                          |
+================+========================================================+
| High confidence | Allow a low-risk, evaluated automatic route            |
+----------------+--------------------------------------------------------+
| Medium          | Ask for confirmation, gather evidence, or review       |
+----------------+--------------------------------------------------------+
| Low             | Clarify, use a broader fallback, model, or person      |
+----------------+--------------------------------------------------------+
~~~

Set thresholds per decision and consequence. A read-only relevance filter can
accept a lower gate than a refund, merge, deletion, suspension or outreach.
Keep the raw distributions. Do not reduce a multi-answer action to the minimum
confidence or multiply values into a fake joint probability; gates must be
evaluated against observed completed outcomes.

A policy can change thresholds and reuse a stored assessment only while the
evidence, model, question meaning and access context remain valid. A changed
rubric or changed evidence requires a fresh assessment.

## 7. Composition = one useful bundle, then code decides

~~~text
message / record
       |
       v
+----------------------------------------------------------+
| Jev bundle                                               |
| route + optional branch questions + universal checks     |
+----------------------------------------------------------+
       |
       v
code reads only relevant answers
       |
       +--> deterministic handler
       +--> generative model with bounded evidence
       +--> clarification or human review
       +--> no action
~~~

Ask independent, useful questions together when they share the same state.
Speculative fan-out avoids a second round trip: ask ticket category, bug severity,
refund request and frustration in one request; code reads severity only when the
category is bug. Extra questions still consume tokens and request budget.

Use another call only after a first judgment is needed to retrieve evidence,
construct new state, or choose the next bounded candidate set.

~~~text
+----------------------------+---------------------------------------------------+
| Pattern                    | Shape                                             |
+============================+===================================================+
| Intent routing             | Choice handler; code dispatches bounded path      |
+----------------------------+---------------------------------------------------+
| Candidate selection        | Code/regex retrieves; Choice selects; code copies |
+----------------------------+---------------------------------------------------+
| Reranking                  | One relevance Noul per candidate; code sorts      |
+----------------------------+---------------------------------------------------+
| Composite scoring          | Atomic Scores; code owns weights and exclusions   |
+----------------------------+---------------------------------------------------+
| Confidence fallback        | Fine Choice then broader parent route             |
+----------------------------+---------------------------------------------------+
| Guardrails                 | Hazard Nouls + severity Score + explicit policy  |
+----------------------------+---------------------------------------------------+
| Extraction cascade         | Extract; verify fields; escalate failures         |
+----------------------------+---------------------------------------------------+
~~~

The official cookbook library provides tested shapes for reranking, semantic line
search, function selection, entity alignment, RAG passage filtering, citation checks,
date extraction, hierarchical classification, structure recovery and feature
discovery. Use a cookbook to choose a decomposition, then validate it against TAR's
own records and outcomes. The complete current links are in [sources.md](sources.md).

**Rule = recall in code, precision in Jev.** Search, SQL, parsers and regex find
candidates. Jev selects or judges them. Code copies chosen source values verbatim
and validates/normalizes them; Jev must not invent identifiers, money, dates or
addresses.

## 8. Safety = judgment can inform an action, never replace its proof

~~~text
+----------------------------------------------+------------------------------------------+
| Never delegated to Jev                       | Deterministic owner                      |
+==============================================+==========================================+
| Authentication, authority, role, consent     | Policy and gateway                       |
+----------------------------------------------+------------------------------------------+
| Arithmetic, tax, totals, date comparison     | Code                                     |
+----------------------------------------------+------------------------------------------+
| Stock, capacity, payment and settlement      | Transaction + provider evidence          |
+----------------------------------------------+------------------------------------------+
| Publishing definitions or provider effects   | Authorized runtime and outbox             |
+----------------------------------------------+------------------------------------------+
| Secret handling and personal-data access     | Server policy and field filtering        |
+----------------------------------------------+------------------------------------------+
| Durable truth and replay                     | Committed records and operation keys     |
+----------------------------------------------+------------------------------------------+
~~~

For a high-risk request, the complete path is:

~~~text
captured request
  -> authorize evidence access
  -> reserve AI budget
  -> Jev assessment outside transaction
  -> validate response and policy
  -> create reviewable action proposal
  -> recheck authority, versions and live facts
  -> commit state + log + task atomically
  -> effect through outbox with a stable idempotency key
  -> record observed provider outcome
~~~

The action must be specific: actor, resource, amount, destination, versions and
expiry. A changed request requires fresh validation and, where required, a fresh
approval. Replaying an accepted operation returns its saved outcome; it does not
call a provider or model again.

For guardrails, use a hazard-to-action map, severity and route precedence, not
only two thresholds. Screen both inbound user text and generated output with
separate batteries. A model-detected risk can route to support or review. It
does not authorize punitive action on its own.

## 9. Limits = use Jev for what it is good at

The documented Jev 1.13 limitations shape TAR's boundary.

~~~text
+-----------------------------+----------------------------------------------------+
| Failure shape               | TAR response                                       |
+=============================+====================================================+
| Literal wording/negation    | State exact condition and boundary cases           |
+-----------------------------+----------------------------------------------------+
| Arithmetic or counting      | Compute and compare in code                        |
+-----------------------------+----------------------------------------------------+
| Dates and time windows      | Extract bounded parts; parse/compare in code       |
+-----------------------------+----------------------------------------------------+
| Multi-hop indirection       | Reduce hops; point at explicit state fields        |
+-----------------------------+----------------------------------------------------+
| Irrelevant large state      | Retrieve/filter before inference                    |
+-----------------------------+----------------------------------------------------+
| Adversarial state content   | Precise rubric, hostile fixtures, review route     |
+-----------------------------+----------------------------------------------------+
| Contradictory rubric        | Align instructions and criteria                    |
+-----------------------------+----------------------------------------------------+
| Missing invariants          | Do not expect negated Nouls to complement          |
+-----------------------------+----------------------------------------------------+
| Generation request          | Use a generative model, then verify bounded claims |
+-----------------------------+----------------------------------------------------+
~~~

A Choice probability for `yes` is not interchangeable with a Noul for the same
sentence. A Noul and its negation need not sum to one. Do not transfer thresholds
between primitives without evaluation.

The model accepts text only. Image, audio and video must be transformed into
permitted, reviewable text or structured evidence first. Do not let unverified OCR
or transcription silently become business truth.

## 10. Domains = one semantic layer across the business cycle

~~~text
+-------------+---------------------------------------+--------------------------------------------+
| Domain      | Jev judgment                          | Code/runtime retains                         |
+=============+=======================================+============================================+
| Sites       | Submission intent and content fit     | Reviewed release, consent, publication       |
+-------------+---------------------------------------+--------------------------------------------+
| CRM         | Candidate match and relationship tags | Identity, merge approval, field access       |
+-------------+---------------------------------------+--------------------------------------------+
| Sales       | Need, fit, urgency and owner          | Contact permission, pricing, send approval   |
+-------------+---------------------------------------+--------------------------------------------+
| Products    | Requested catalog candidate           | Catalog truth, stock, price and tax          |
+-------------+---------------------------------------+--------------------------------------------+
| Services    | Offering or skill match               | Calendar arithmetic, capacity and booking    |
+-------------+---------------------------------------+--------------------------------------------+
| Commerce    | Source values for a draft order       | Totals, reservation, payment and fulfillment |
+-------------+---------------------------------------+--------------------------------------------+
| Support     | Route, urgency and evidence relevance | Policy, authorized remedy and refund         |
+-------------+---------------------------------------+--------------------------------------------+
| Operations  | Exception priority and evidence fit   | Receiving, shipping, supplier effects        |
+-------------+---------------------------------------+--------------------------------------------+
| Finance     | Semantic document match               | Ledger, reconciliation and settlement        |
+-------------+---------------------------------------+--------------------------------------------+
~~~

The same decision grammar works everywhere:

~~~text
see permitted facts -> retrieve candidates -> Jev judgment -> code validates
                                                        |
                                                        v
                                        proposal -> authorize -> commit -> observe
~~~

Jev is optional. If a known rule, exact lookup or calculation answers the question,
do not call a model.

## 11. Community GTM examples = useful shape, unverified benchmark

Jason Zhou's article describes three Jev-plus-enrichment workflows. They are useful
because they place the cheap semantic decision before a more expensive retrieval or
human step. Costs, accuracy and performance are author-reported; the author sells
the enrichment service used in the examples.

~~~text
+----------------------+-----------------------------------------+-----------------------------------+
| Workflow             | Judgment bundle                         | Reported result                   |
+======================+=========================================+===================================+
| Signup triage        | Fraud Noul, segment Choice, upsell Score| 236/day; Jev about USD 0.01/day   |
+----------------------+-----------------------------------------+-----------------------------------+
| Buying signals       | Topic Noul, fit Score, role Choice      | 368 people; 45 emails; under USD1 |
+----------------------+-----------------------------------------+-----------------------------------+
| Launch radar         | Relevance, kind, source, organic, score | 168 posts in about 12 seconds     |
+----------------------+-----------------------------------------+-----------------------------------+
~~~

Lessons worth retaining:

- Run relevance judgment before paid enrichment; retrieval can return semantically
  wrong but keyword-matching items.
- Compute exact ratios such as views per follower in code; ask Jev only what their
  business meaning implies.
- Separate fit, role and risk where each changes a different routing decision.
- Log evidence, full distributions, provider cost and observed downstream outcome.
- Treat a fraud or "paid engagement" assessment as a review signal. It is not proof.

The linked recipe has two important issues: its signup display is synthetic, and
its launch routing can place "artificial engagement" into the organic lane.
TAR must have explicit `artificial` and `uncertain` routes. The recipe's
`boolean` type belongs to a gateway adapter; the native TypeSafe API calls the
yes/no primitive `noul`.

## 12. Operations = evaluate, shadow, enable, monitor

~~~text
+----------------+--------------------------------------------------------------+
| Stage          | Proof                                                        |
+================+==============================================================+
| Define         | Bounded action, review route and measurable outcome          |
+----------------+--------------------------------------------------------------+
| Label          | Representative examples, boundaries and no-match cases        |
+----------------+--------------------------------------------------------------+
| Develop        | Rubric set with candidate coverage and source lineage         |
+----------------+--------------------------------------------------------------+
| Evaluate       | Held-out accuracy, calibration, review rate and task outcome  |
+----------------+--------------------------------------------------------------+
| Shadow         | Store proposals; existing process retains control              |
+----------------+--------------------------------------------------------------+
| Enable         | Only reversible/low-risk routes that meet the chosen bar       |
+----------------+--------------------------------------------------------------+
| Monitor        | Drift, costs, latency, version changes and human overrides    |
+----------------+--------------------------------------------------------------+
~~~

Evaluation dataset rules:

- Split development, threshold tuning and held-out evaluation data.
- Keep duplicates and related records in one split to avoid leakage.
- Include missing evidence, overlapping options, adversarial text and the language
  mix TAR will actually receive, including Tamil, English and mixed content.
- Measure false positives/negatives, coverage, calibration by probability bin,
  review burden, end-to-end p50/p95 latency, provider failures and completed-task cost.
- Compare with deterministic rules and a suitable text-model baseline on identical
  evidence and outcomes.
- Re-evaluate after changing model version, rubric, candidate generation, provider
  data, policy, language mix or consequence.

Reserve AI budget before a call and reconcile actual usage after it. An AI outage
pauses intelligence, never manual commerce. Record state reference, question version,
resolved model, raw answer, policy version, route, cost and observed result with
access controls separate from the ordinary business log.

## 13. Delivery = prove the foundation, then expand by domain

~~~text
+----------------+-------------------------------------------------------------+
| Stage          | Deliver                                                     |
+================+=============================================================+
| Foundation     | Jev adapter, question registry, traces, budgets, fallback  |
+----------------+-------------------------------------------------------------+
| Support        | Shadow ticket route/urgency with human review              |
+----------------+-------------------------------------------------------------+
| Sales          | Candidate lead fit and owner, no automatic outreach         |
+----------------+-------------------------------------------------------------+
| Commerce       | Candidate/source selection for drafts only                  |
+----------------+-------------------------------------------------------------+
| Verification   | Evidence checks and field-level escalation                  |
+----------------+-------------------------------------------------------------+
| Expansion      | Domain bundles only after their own held-out proof           |
+----------------+-------------------------------------------------------------+
~~~

First TAR integration: support routing. It is reversible, exposes representative
language, supports a clear human fallback, and can be compared with the existing
workflow. Do not begin with bans, payments, refunds, record merges or outbound
messaging.

## 14. References = current source of truth

~~~text
+---------------------------------------+----------------------------------------------------+
| Resource                              | Use                                                |
+=======================================+====================================================+
| [Jev source library](README.md)       | Current primary documentation and research          |
+---------------------------------------+----------------------------------------------------+
| [TypeSafe models](https://docs.typesafe.ai/models.md) | Price, limits, aliases and data handling   |
+---------------------------------------+----------------------------------------------------+
| [Native API](https://docs.typesafe.ai/api.md) | Request, answer and error contract          |
+---------------------------------------+----------------------------------------------------+
| [Known limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) | Boundaries     |
+---------------------------------------+----------------------------------------------------+
~~~

**TAR = reusable core + domain rules + configurable experience. Jev supplies
bounded judgment; Runtime preserves authority, evidence and truth.**
