# JEV = TypeSafe System One Model

> Fast, typed judgments with calibrated probabilities. Code owns the workflow; Jev supplies the common sense.

**Source = live TypeSafe docs, read 2026-09-20 (docs.typesafe.ai, model jev-1.13.0).** Working skill = .agents/skills/typesafe-ai/SKILL.md (pattern and cookbook index). This file is the project reference for what Jev is, how a call is shaped, and where it may and may not act in TAR.

## 1. What Jev is = fast typed judgments

- Jev is the flagship model of TypeSafe and the first System One model.
- It reads natural language and returns typed answers with probabilities.
- It does not generate text, code or explanations. It does not pick the next step.
- Most calls finish in about 100 ms, so it fits live user paths.
- Probabilities are calibrated: trained against outcomes to reflect real uncertainty.
  Calibration is a group property; it does not guarantee any single answer.
- Stable across repeats: over 15 repeats of a 14-question rubric, its mean per-question
  standard deviation was 0.0102; the compared LLM conditions moved run to run, even at
  temperature 0. Repeat agreement measures stability, not correctness.
- Text in, judgment out: input is a string, a JSON object, or an array of text.
  No image, audio or video.

| | Jev | Text LLM |
|---|---|---|
| Output | typed value + probabilities over your options | generated text |
| Answer space | only the options you supplied | anything |
| Speed | about 100 ms | seconds |
| Role | one narrow judgment per question | free-form writing and reasoning |
| Failing | wrong option, flagged by low confidence | plausible wrong text, silent |

~~~text
+----------------------+   +----------------------+   +----------------------+
| state                |   | Jev (one call)       |   | typed answers        |
| + questions          +-->+                      +-->+ + probabilities      |
+----------------------+   +----------------------+   +----------------------+
~~~

## 2. One call = one state plus many questions

Endpoint = POST https://api.typesafe.ai/v1/systemone with Authorization: Bearer key.
SDKs = Python (typesafe-sdk) and JavaScript (@typesafe-ai/sdk, Node 20+); builder helpers
noul(), choice() and score() construct the questions, answers come back typed, and both
SDKs retry 429 and 529 with backoff by default.

- One request carries one state and any number of questions.
- All questions see the same state and run in parallel; they cannot see each other's answers.
- Extra questions cost only their tokens and barely add latency.
- Batching is answer-neutral. The docs asked 13 questions in one call and one question per call,
  5 repeats each; the answers matched, with the same run-to-run noise. Each question is scored
  on its own against the state, so no answer depends on which questions share its request.

State shapes:

| Shape | Use for |
|---|---|
| string | one message or passage |
| object | named fields: message, record, policy |
| array | a sequence of messages or records |

Rules:

- Put content in the state and the judgment in the question.
- Send only what the question needs; unrelated detail lowers accuracy.
- Point at parts of the state with backtick paths, for example `ticket.messages[0].text`.
- Question IDs are for your code and are not sent to the model; write the full meaning in instructions.

Example request:

```json
{
  "state": {
    "ticket_message": "I was charged twice for order A-104. Please refund the duplicate.",
    "refund_policy": "Duplicate charges are eligible for a refund."
  },
  "model": "jev-latest",
  "questions": {
    "refund_requested": {
      "type": "noul",
      "instructions": "Does `ticket_message` request a refund?"
    },
    "topic": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {
        "billing": "Charges, invoices, refunds",
        "technical": "Bugs, outages, integrations",
        "account": "Login, profile, security"
      }
    },
    "frustration": {
      "type": "score",
      "instructions": "How frustrated does the customer appear?",
      "criteria": ["Calm", "Frustrated but civil", "Very angry"]
    }
  }
}
```

Example response, one typed answer per question ID:

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "refund_requested": { "type": "noul", "noul": 0.97 },
    "topic": {
      "type": "choice",
      "choice": "billing",
      "probabilities": { "billing": 0.88, "technical": 0.12, "account": 0.0 },
      "confidence": 0.81
    },
    "frustration": {
      "type": "score",
      "score": 1.05,
      "legend": { "0": "Calm", "1": "Frustrated but civil", "2": "Very angry" },
      "probabilities": { "0": 0.0, "1": 0.95, "2": 0.05 },
      "confidence": 0.92
    }
  },
  "usage": { "input_tokens": 318, "output_tokens": 34 }
}
```

## 3. Three question types = pick by the shape of the answer

| Type | Asks | Returns | Use when |
|---|---|---|---|
| Choice | which of these? | choice, probabilities, confidence | the answer is one of a known set with no order |
| Score | how far on this scale? | score, legend, probabilities, confidence | a degree along described ordered levels |
| Noul | is this true? | noul, the probability of yes from 0 to 1 | a clean yes/no where the probability is the signal |

Choice:
- Up to 255 options; each option can carry what it covers, what it is not for, and examples.
- Add an "other" or "none" option when the list may not cover the input, and pair a Choice
  with an existence Noul when "is it there at all" is its own question: a Choice always
  returns a winner.
- Its distribution compares the options against each other. More than 255 candidates:
  narrow in two stages (pick the section, then the item).

Score:
- 2 to 10 ordered levels; the answer is probability-weighted and can fall between levels (1.05).
- Levels must describe concrete situations and stand on their own.
- Use comparable per-item Scores for graded ranking.

Noul:
- One value: the probability that yes holds. Near 1 = strong yes, near 0 = strong no,
  near 0.5 = the model is unsure, not medium intensity.
- No separate confidence field; the value itself carries the uncertainty.
- Optional criteria state what yes and no mean.
- When several labels may apply, ask one Noul per label; a Noul is absolute, a Choice is relative.

Picking rules:
- Choose the type whose answer code can act on directly: a Choice maps to a branch,
  a Score to a threshold, a Noul to an if.
- One narrow judgment per question; split complex judgments and combine the answers in code.
- instructions and criteria may be strings, objects, or arrays; use structure when
  definitions, contrasts or examples clarify the question.
- A question you may not need is close to free; ask it anyway in the same call.

## 4. Confidence = the second decision axis

- Every Choice and Score answer carries confidence from 0 to 1, computed from the shape
  of its probability distribution: concentrated on one option = high, spread out = low.
- Confidence says how settled this answer is. It does not say the workflow is right,
  and it is not permission to act.
- A Noul has no confidence; a Noul near 0.5 already means unsure.

| Band | Behavior |
|---|---|
| high | act automatically |
| medium | act with caution: confirm, flag, or gather more |
| low | do not act: route to a person or a bigger model |

- The band edges are set per action by its stakes; the costlier the action, the higher the gate.
- Tune thresholds on your own data; demo numbers are examples, not universal rules.
- Low confidence on a harmless preference can be ignored; answers on unused branches cost nothing to skip.
- A decision built from several answers takes the confidence of its weakest answer, not the
  product: one wrong argument spoils the whole call.
- A probability near a threshold flips the action (0.49 against 0.51), so give the middle an
  explicit uncertain outcome and route it to a person: the docs example returns no below 0.30,
  uncertain from 0.30 through 0.70 inclusive, yes above 0.70. Escalation is code over the
  returned probability - no extra question, no second call.
- A band absorbs jitter (a repeat can move a value a few hundredths), but values near an edge
  can still cross it, and clearing the band is not proof of correctness. Keep the raw
  probability visible beside the banded outcome.
- An unsure answer can fall back to the coarser label that follows from it - a 75-way group
  to its division - instead of a second call; the docs test lifted its unsure set from 40%
  to 70% right that way.

## 5. Patterns = compose in code

| Pattern | What it does | Gain |
|---|---|---|
| Speculative fan-out | one call carries many questions, including ones only some inputs need; code uses the answers that apply | cost, speed |
| Confidence-gated routing | the answer says what; confidence says whether to act | safety |
| Composite scoring | split a judgment into atomic questions, weight the answers in code | tunable without re-prompting |
| Intent routing | classify intent, then route to code, a specialist model, or a person | cost, speed |
| Guardrail screening | one Noul per hazard plus a severity Score screens each message going into and coming out of an LLM call | safety |

- Ask every independent question over the same state in one call. The docs 13-question example
  (8 Noul + 2 Choice + 3 Score over one 54,000-character document): one call = $0.000497 and
  0.27s; 13 separate calls = $0.006090 and 2.71s - 12.2x cheaper, 10.0x faster, same answers.
- The saving is the shared state: N single calls pay for the state N times, one batched call
  pays once. The more the state dominates the request, the nearer the saving comes to a full Nx.
- The time figure sums the single calls, so it assumes one at a time; fired concurrently the
  time gap shrinks, but the Nx token cost stays.
- A second call is only for when the first answer is needed to fetch evidence, build new
  state, or decide the next options.
- Route and fill: one Choice over the handler names plus one question per fixed-list argument
  in the same request - the function-calling cookbook packs 54 questions per command and reads
  only the chosen handler's answers. Bools are Nouls; free text, numbers and dates take no
  question and keep the function default.
- An optional argument takes a "was it stated?" Noul, so a command that never mentions a window
  leaves it unset instead of confidently inventing one. Write questions about the role, not the
  parameter name: matching is on meaning, and the same ticker list fills symbol (named first,
  the one measured) and benchmark (the yardstick).
- Guardrails: one request per message with a Noul per hazard plus a severity Score; each
  hazard compares against a review threshold and an action threshold, severity can raise a
  review to a block, and precedence (support, block, review, pass) picks the action.
- A policy is those thresholds under a name: the same stored assessment routes differently
  under strict and permissive policies, and a mild hazard can go to review or a support path
  instead of a block.
- Weights, thresholds and display rules live in code; changing them never re-runs inference.
- Reduce each answer to one tracked number when testing: Noul = p(yes), Choice = its max
  probability, Score = its value divided by the top level.
- Typed output guarantees the shape, not the truth.

## 6. Cookbook recipes = proven shapes with numbers

Every row is a docs cookbook recipe with its reported figures.

| Recipe | Shape | Result |
|---|---|---|
| Re-ranking | code retrieves a shortlist; one Noul per query-candidate pair, answers sorted by noul | top-1 5% to 18%, top-10 38% to 62%; 1,200 calls for $0.0645 |
| Line search | state lines carry ids; one Choice over all line ids plus an existence Noul, one request per query | 218 lines in one request; present ~0.9, absent ~0.05 |
| Skill selection | one Choice ranks all 182 skills; a second request reads the top 3 with per-candidate Nouls | wrong loads 16.8% to 7.3%, needless 9.8% to 4.0% |
| Entity alignment | one Score per pair whose 3 levels are the 3 actions: merge, curator, leave unlinked | 450 pairs: 8.9% merge, 11.1% curator, 80% leave; no threshold to fit |
| Date extraction | one Choice per date part over bounded options plus "not stated"; code assembles and validates | correct dates 0.91 to 0.97 confidence; never-stated returned none at 0.46 |
| Value extraction | regex finds candidate spans; one Choice picks the span; code copies it verbatim | an exact copy that cannot be invented or digit-transposed |
| Extraction cascade | cheap model extracts; one call flags per-field problems; any flag over 0.7 escalates to a reasoning model | the cascade frontier sits above every single model; ~0.81 quality for ~$0.10 per extraction |
| Structure recovery | pass 1 heals line breaks (one Noul per pair); pass 2 classifies each block plus companion questions | 2 requests (16 + 62 questions), 28 lines to 17 blocks; flag blocks under 0.55 |
| Hierarchical classification | sibling Choice per frontier, beam search over the probability distribution | beam K=3 found 4/4 expected leaves; greedy 2/4 |
| Confidence fallback | one Choice over 75 groups; report the group at 0.9+ confidence, else its parent division | 27/30 right when confident, 12/30 when not; fallback lifts the unsure set to 70% |
| Passage filter | 4 Nouls per passage (relevance, evidence, contradiction, injection); code routes thresholds in fixed order | an injection ranked first was dropped; passages under threshold still reach the prompt |
| Citation check | code string-matches each quote; one Choice then says supports, contradicts or says nothing | a fabricated citation was caught with no call; confidence under 0.8 goes to review |
| Feature discovery | questions become numeric features for a classical model; its errors drive the next round of questions | held-out RMSE 3.09 to 1.77; most of the gain in round 1 |
| Repeat stability | 15 repeats of one rubric; a top probability under 0.60 returns uncertain | raw agreement 90.8% to 99.2%, 74.2% still automatic; std dev 0.0098 |

- Recall in code, precision in Jev: search or regex supplies the candidates and Jev selects
  among them. It cannot pick what was not offered, so candidate coverage sets the ceiling.
- Aggregate per-field flags with max, not mean: one confident red flag must not be averaged away.
- Make a suggestion ignorable: in the skill test a confident wrong pick turned 7 right
  answers wrong while 37 wrong ones were fixed.

## 7. Price and limits = input tokens only

Model = jev-1.13.0. Aliases jev-latest and jev-preview both point to it today.

| Fact | Value |
|---|---|
| Price | USD 0.042 per million input tokens (USD 42 per billion) |
| Output tokens | free |
| Rate limits | 250,000 tokens per second and 1,200 requests per minute, adjusting dynamically |
| Context | 64k tokens per request (state plus all questions); 32k for state plus the longest question |
| Input | text only |
| Customization | none per account; the same weights serve every customer. Shape answers through state, instructions and criteria |
| Data | not trained on customer requests or responses; zero data retention for enterprise |

- The response reports which versioned model answered; if you tune thresholds, pin that
  version ID instead of an alias and move when you are ready.
- English is the primary training language; other languages, including CJK, work with
  lower accuracy. Test on your own content and route on confidence.
- Console = console.typesafe.ai; run a state and its questions live and share the result as a link.
- Measured on one 14-question rubric: 111ms and $0.000043 per call, against 1.1s to 13.9s and
  $0.00095 to $0.034 for the compared LLMs - 10x to 125x slower and 22x to 805x more expensive.

Errors:

| Code | Meaning |
|---|---|
| 401 | missing or bad API key |
| 422 | request failed validation |
| 429 | rate limit hit; back off and retry |
| 529 | service overloaded; back off and retry |

- Keep the API key server-side in web apps.

## 8. Honest limits = the Jev 1.13 failure modes

Jev answers the question you wrote, not the one you meant. Every edge below has a fix.

| Failure | Fix |
|---|---|
| Literal reading: negations and implied intent are missed | write the exact condition; put boundary cases in criteria |
| Math and counting: not a calculator; counts drift as lists grow | all arithmetic in code |
| Dates: read as text, not as ordered quantities | extract parts with a Choice over enumerated values plus a "not stated" option; compare in code |
| Indirection: double negatives and multi-hop reasoning lose accuracy | ask directly; point at the state by name |
| Irrelevant detail: accuracy falls as the state grows with noise | filter in code first; send only what the question needs |
| Adversarial content: state is data; injected text can steer answers | precise criteria; test hostile inputs before shipping |
| Contradictory instructions and criteria | align the two; criteria extend the instruction |
| No structural invariants: a Noul and its negation do not sum to 1; a Noul and a yes/no Choice do not agree | word each question directly; never carry a threshold from one type to another |
| No generation: chaining choices to build text is slow and bad | find candidates with regex or a text model; let Jev pick, and let code render the final text |

- Use a Score to pass a threshold, not to read an exact number between two levels.
- Never ask Jev what code can compute exactly.

## 9. Jev in TAR = the semantic layer only

- The Router (tarv10 sec 2) selects per action: code, Jev, a generative model, or a person.
- Jev's output lands as the optional AI proposal on the action request; the Runtime still
  authorizes, validates and commits it. A free-text request can become a typed action whose
  arguments were filled from closed sets (sec 5).
- Jev routes the ticket and reads urgency. It never decides the refund (tarv10 support section).
- Never by Jev: permissions, arithmetic, settlement, policy truth.
  Models cannot publish executable definitions or grant permissions (tarv10 sec 3).
- Decisions are saved and pinned at commit time; they are never recomputed on replay.
- First deployment is shadow mode: Jev reads and logs proposals, code acts. Promote a
  judgment to acting only where the log shows it is right.
- Not every workflow takes a Jev call; where a rule, lookup or calculation answers, code answers.
- The cost gate - when Jev beats cheaper text models on measured work - is owned by
  tarv8.md sec 8 and the sources in tarv9.md, not restated here.

~~~text
  message, ticket, note
          |
          v
+----------------------+
| Router               |   selects code, Jev, model or person
+----------------------+
          |
          v
+----------------------+
| Jev (optional)       |   typed judgment: route, urgency, intent
+----------------------+
          |
          v
+----------------------+
| Action request       |   with optional AI proposal
+----------------------+
          |
          v
+----------------------+
| Runtime              |   authorize + validate + commit
+----------------------+
          |
          v
   STATE + LOG + TASKS
~~~
