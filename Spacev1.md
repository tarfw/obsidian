Spacev1

the right environment for the moment

**“When my day changes, my Space changes with me.”**

| Status | Architecture |
| --- | --- |
| Discussion proposal · 2026-09-25 · future behavior | [tarv12.md](tarv12.md) remains the sole consolidated target. |

## 1. Core idea

Space adapts **content + tools + layout + detail** to the person's current activity and needs. It includes information, guidance, and work; pending decisions and goals are ingredients.

```text
Same person throughout the day
  + Workspace: whose data and access?
  + Context:   what am I doing now?
  = Space:     the environment that helps now

Restaurant -> Kitchen / Cashier   [same workspace, different views]
Own shop   -> Selling / Closing   [separate workspace and records]
```

| Principle | Meaning |
| --- | --- |
| Open to any activity | Morning, work, study, parenting, gardening, creativity, travel, hobbies, etc. |
| Proportional to need | One timer, a guide, a board, a map, a form, or full POS; show as much as helps. |
| Context ≠ authority | Selecting “Cashier” never grants cashier permissions; customers/partners receive scoped transaction participation. |
| Start with one context | Compatible personal tools may accompany it on a personal view. Shared terminals use the business audience. |

## 2. A day in Space

Illustrative experiences; live data/actions require supported capabilities and user setup.

| Time / context | Workspace | Role | Workspace owner |
| --- | --- | --- | --- |
| 5 am · Morning | Personal | Individual | User |
| 9 am · Kitchen | Northstar Restaurant | Chef | Restaurant operator |
| 9 am · Cashier | Northstar Restaurant | Cashier | Restaurant operator |
| 3 pm · Deliveries | My Delivery Work | Courier | User (independent) |
| 6 pm · Taxi | My Taxi Work | Driver | User (independent) |
| 8 pm · Office / sales | Employer's Sales Team | Sales employee | Employer |
| 10 pm · Own sandwich shop | My Sandwich Shop | Owner / seller | User |

| Context | Main surface | Relevant evidence |
| --- | --- | --- |
| Morning | Exercise guide, timer, notes, first commitment | Routine, available time, chosen content, actual start |
| Kitchen | Orders, preparation priorities, timers, station notes, ingredient exceptions | Restaurant, station, active shift, access |
| Cashier | POS, open bills, payment status, shift totals | Same restaurant; cashier activity and access |
| Deliveries | Pickup, drop-off, navigation, notes, progress | Started session; supported provider data or manual input |
| Taxi | Trip, destination, minimal controls; summary when stationary | Active trip and supported integration |
| Office / sales | Meeting material, follow-ups, documents, deadlines | Employer, role, assignments, explicit focus |
| Own sandwich shop | Selling, orders, ingredients, closing work | Own business, current activity, owner access |

| Context | Inbox example: my human action |
| --- | --- |
| Morning | Complete a personally scheduled task or confirm an appointment. An employer's assigned action stays available under its own scope. |
| Kitchen | Prepare assigned items at the grill/drinks station; mark quantities ready or report a blocker. |
| Cashier | Collect payment or correct an eligible bill; any required manager approval becomes that manager's step. |
| Deliveries | Claim an offered job, reach pickup, collect, then deliver as each step becomes eligible. |
| Taxi | Accept a trip, reach pickup, start/end the ride; act through safe controls. |
| Office / sales | Prepare an assigned quote or follow-up; route approval to the authorized person. |
| Own sandwich shop | Accept an order, prepare/hand over food, or complete an assigned purchasing/closing step. |

Ownership above is illustrative. Delivery/taxi may instead use an operator-owned workspace with the user as a member. Connecting a provider such as Uber Eats does not make that provider the TAR workspace owner.

**Time is a clue.** Late shifts, days off, and unfinished trips can change the expected context. Minimize interaction while driving.

### Workspace rules to plan

| Concern | Plan |
| --- | --- |
| Identity and joining | One account can own personal/business workspaces and join others through verified invitations. A contact or job title alone grants no membership. |
| Owner vs work role | Owner controls the workspace; chef/cashier/driver describes work. Membership or scoped participation plus authorized assignments governs actions. |
| Same business | Kitchen/cashier share one restaurant workspace and records. Change context only; require each role's actual access. |
| Workspace boundaries | Separate organizations keep separate data. Activities under the same owner can share a workspace where data/access fit; no new workspace per context. |
| Configuration | Owners/admins configure shared capabilities, assignments, and defaults; members personalize allowed views and pins. |
| Connected providers | Bind each connection to its workspace and authorized account. Recheck provider scope; personal preferences cannot import employer data elsewhere. |
| Switching and revocation | Show workspace, active work role, and owner in the context picker. Revalidate membership/assignment changes, cached plans, and actions; preserve draft scope. |

## 3. Switching and control

```text
Intent + actual activity + confirmed plans + enabled signals
                              |
                 Known transition? -> Code
                 Ambiguous meaning? -> JEV
                              |
            Clear + enabled -> Adapt automatically
            Uncertain       -> Ask
            Manual hold     -> Keep chosen context
```

**Confirmed:** automatic when clear; ask when uncertain; visible override.

| Rule | Behavior |
| --- | --- |
| Signals | Explicit requests; shifts, register, jobs, trips, unfinished work; routines/calendar; optional enabled place/device; preferences/corrections. |
| Visible context | Always show workspace + context, e.g. “Northstar / Kitchen.” Give a factual reason for a switch. |
| Stable controls | Switch, pin, hide, hold, find, and ask remain accessible. Keep `Space / Inbox / Ask TAR` navigation. |
| Flexible surface | Expand POS/boards; focus guides on one step; show little in quiet moments. Required operational exceptions remain visible. |
| Stable interaction | Preserve active forms, payment controls, and screen position. Update values; suggest a new context without interrupting work. |
| Stable transitions | Use fresh evidence and recent corrections; avoid repeated switching near schedule boundaries. Manual choice/hold overrides inferred routines. |
| Workspace change | Allow configured presentation transitions after current access checks. Never blend private and shared audiences. |
| Effects | A screen switch alone cannot clock in, accept jobs, start paid sessions, publish, or send messages. |
| Continuity | Save drafts before switching; retain carts, drafts, and in-flight commands in their original workspace; provide return access. |

Cards, Inbox items, and conversations reference the same underlying work.

### Inbox: my part in shared work

**Inbox = the human actions I am responsible for, or eligible to claim.** Each action has a subject, permitted actor, prerequisites, and completion rule. Personal tasks use the same contract.

```text
Business work: order / ride / sale / service / purchase
                         |
            Domain rules + reviewed process
                         |
          Independently assignable human steps
              /          |           \
         Customer      Worker       Partner
          Inbox         Inbox        Inbox
              \          |           /
             Validated action + saved result
                         |
                Enable the next steps

SPACE = tools for my current activity
INBOX = my human steps across authorized work
CHAT  = request, discuss, track, and open those same steps
```

This revises the earlier Inbox proposal: routine human work belongs here, including preparation and delivery. Informational updates remain on the order/work timeline or chat. Conversations live under Ask TAR in this proposed UX amendment to `tarv12.md`.

#### One restaurant order

Customer finds a restaurant through TAR chat and submits a supported customer order action. The restaurant owns the order; the customer receives access to their own transaction.

| Person / role | Their Inbox action | Becomes actionable when |
| --- | --- | --- |
| Owner or eligible order desk member | Accept or decline the order | A valid request reaches the authorized order queue |
| Grill worker | Prepare the assigned burgers; mark quantities ready | Order accepted and the recipe's preparation conditions pass |
| Drinks worker | Prepare the assigned drinks; mark quantities ready | Same conditions; independent station work can run in parallel |
| Packing worker | Check required items and pack | All required station quantities are ready |
| Courier | Accept job → reach pickup → collect → deliver | Dispatch policy offers the job; each later step checks its own prerequisites |
| Customer | Pay → confirm receipt when required → rate or skip | Payment policy requires payment; delivery enables receipt/feedback steps |

```text
Example: payment required before pickup

Accepted order -> Grill ----+
               -> Drinks ---+-> Pack ------+
Customer payment -> verified receipt -----+-> Pickup -> Deliver
                                                        |
                                             Receipt / optional rating
```

Courier assignment/travel may begin before packing; pickup waits for readiness and required payment. Payment may instead occur before acceptance or after service under that domain's rules. “Order received” is an update unless an actual confirmation is requested. Optional rating can be skipped or expire; it never blocks commercial completion.

#### Small steps, manageable cards

| Design | Rule |
| --- | --- |
| Split | Create a separate step where assignee, station, dependency, or required evidence differs. Recipe/menu mappings route known items in code. |
| Group | Show one useful card per work/stage/assignee, with item quantities and a checklist. Preserve individual step identity; no card per trivial movement. |
| Progress | A courier card advances through reach, pickup, and delivery. Prior receipts remain accessible. |
| Completion | Human preparation uses an authorized attestation and any required evidence. Payment/delivery use their defined verification rules. A model score never marks work done. |
| Synchronize | The kitchen board in Space and its Inbox card read the same steps. Acting in either updates both. |

```text
Order #142 · Northstar · Grill · Assigned to you
Prepare: 2 burgers / no onion on item 2
Due: 12:40 · Source: accepted order
[Start]  ->  [Mark ready]     [Report problem]
```

#### Assignment, access, and lifecycle

```text
waiting -> ready -> active -> done
             |       |
             +---- blocked -> resolve / reassign
             +---- cancelled when work is withdrawn

ready + eligible pool -> one atomic claim -> one assignee
```

These are proposed lifecycle meanings; migrate through adapters for existing state spellings.

| Concern | Contract |
| --- | --- |
| Mine | Assigned ready/active human steps across personal, employer, and transaction scopes. Space context affects presentation, never membership in the list. |
| Available | Eligible shared queues/offers. Several members may see one offer; one valid claim wins. Ownership alone does not assign every order to the owner. |
| Waiting / history | Blocked prerequisites and future tasks remain inspectable; completed work goes to history. Only enabled assigned work contributes to My actions count; offers have a separate count. |
| Audience | Private Inbox spans permitted scopes. Shared terminals show only their authorized station/business; each action records its permitted actor. |
| Customer / partner | Verified transaction participation permits only the relevant order/job and actions. Buying from a restaurant does not make the customer a restaurant member. |
| Across businesses | Keep canonical records in their owning workspaces. Link counterpart jobs and exchange scoped handoff events; the courier's job can belong to a delivery operator. |
| Access checks | Membership or a scoped participant grant, assignment, current record state, connection scope, and action policy must pass at execution. Job titles and JEV choices grant no authority. |
| Handover | Persist reassignment and invalidate the old assignment before another person acts. Off-duty/no-capacity cases go to an eligible pool or named escalation owner. |
| Changes / failures | Cancellation or changed quantities invalidate obsolete steps; partial work remains recorded. Reconcile uncertain external effects before retrying; compensation/refunds are separate authorized actions. |
| Priority | Required deadlines, active work, and operational policy lead. Context fit may order otherwise comparable steps; unrelated personal tasks remain findable. Quiet/driving modes control interruptions. |
| Suggestions | Keep unsolicited recommendations in Space. Add a human task when the person requests it or an enabled process assigns an actual action. |

A person may participate as a customer in one business, employee in another, and owner of a third. Inbox aggregates their authorized responsibilities; it never copies those businesses' entire records into a common workspace.

#### One execution contract across domains

| Domain | Example human handoffs |
| --- | --- |
| Supermarket | Customer pays → picker gathers items → customer approves substitution → packer packs → courier delivers |
| Taxi | Driver accepts → reaches pickup → starts/ends trip → rider pays or confirms if required |
| Sales | Employee qualifies → authorized person approves quote → customer accepts/pays → fulfilment acts |
| Services | Customer books → provider accepts → technician performs → customer confirms → accounts settles |
| Purchasing / returns | Buyer approves → supplier fulfils → receiver checks; returns route inspection, approval, and refund steps |
| Personal work | User schedules a task → it becomes due → user acts; no business transaction is required |

Domains supply records, exact rules, eligible actors, actions, and reviewed processes. Their domain data remains explicit; every human step uses the same shared core.

| Backend piece | Minimal responsibility |
| --- | --- |
| Human task | Reuse the planned task contract: `subject`, `action`, `assignee` or `pool`, `requires`, `due`, `state`, `version`, `result`; link its run/step. |
| Runner | The existing task/Flow execution framework advances only eligible steps; persists waits; wakes on relevant events. |
| Inbox | An indexed projection of tasks/assignments and participant grants. Paginate by assignee/pool/state/due; keep origin scope on every reference. |
| Commit | Gateway checks current version/assignment; records accepted result and a durable event. Replay keys prevent duplicate accepted actions from chat, Space, Inbox, or retries. |
| Recovery | Resume from durable results; repair missed dispatch. External systems may need reconciliation rather than another effect attempt. |
| Cross-scope listing | Use bounded scoped reads; add a recoverable per-person reference index only when needed. Recheck access against the owning workspace. |

No separate runner, task database, or continuously active model is needed for each person, station, or business type.

#### Where JEV adds value

| Primitive | Useful semantic work | Code boundary |
| --- | --- | --- |
| Choice | Match a free-text request to a supported action/process, or a note to a candidate task/station | Candidates must be permitted; include no-match. Known recipe/station routing is exact. |
| Noul | Does a message ask for a change, report a blocker, or contain an unresolved instruction? | Preserve source evidence; clarify uncertainty. Do not infer payment, consent, or completion. |
| Score | Rank eligible ready work or suggest a suitable assignee using relevant supplied context | Enforce role, shift, capacity, deadlines, and fairness in code. Automatic assignment requires enabled policy. |
| Shared assessment | Interpret a new ambiguous event once; reuse its answers in Inbox, Space, and chat | Reassess changed evidence; no JEV call for listing, claiming, ticking a known step, or ordinary handoffs. |

A standard structured restaurant order can traverse all human steps with **zero additional JEV calls**. Natural-language intake and ambiguous exceptions may use JEV. New process structures require a reviewed recipe or separately drafted/validated plan; JEV cannot invent missing capabilities.

Sources: [TypeSafe building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) · [Function selection](https://docs.typesafe.ai/cookbooks/function_calling).

## 4. What JEV does

JEV returns typed judgments; TAR composes and renders the Space.

| Mechanism | Question / responsibility | Result |
| --- | --- | --- |
| **Choice** | Which permitted context, activity, guide, source, or view fits? | Select an eligible candidate; include stay/none/unclear where needed. |
| **Noul** | Does this message end the activity? Does this note concern this job? Does this suggestion address the need? | Probability of one semantic condition; clarify or retain a stable default when uncertain. |
| **Score** | How relevant/useful is this candidate for the activity and stated goal? | Rank comparable candidates using a shared rubric. |
| **Code** | Access, schedules, device support, stock, required fields, trip/payment state, calculations, layout constraints | Exact checks, rules, execution, and rendering. |

| Interpretation | Constraint |
| --- | --- |
| Choice probabilities | Compare options within that question; use consistent per-candidate Scores for graded card rankings. |
| Noul | Probability of yes, not degree/intensity. |
| Confidence | Describes answer distribution; guarantees neither correctness nor permission. |
| Questions | Batch independent questions over shared evidence; stage dependent questions after selection/retrieval. |
| Candidate coverage | JEV cannot select an omitted option. Retrieve bounded candidates, provide no-match, and measure misses. |

Docs: [State](https://docs.typesafe.ai/concepts/state) · [Choice](https://docs.typesafe.ai/primitives/choice) · [Noul](https://docs.typesafe.ai/primitives/noul) · [Score](https://docs.typesafe.ai/primitives/score) · [Confidence](https://docs.typesafe.ai/confidence).

## 5. Automatically designed

```text
Reusable components + relevant records + supported layout
                         |
                    Your Space
```

| Level | Behavior | Responsibility |
| --- | --- | --- |
| Select | Open an existing timer, POS, board, or routine | Code for exact input; JEV for ambiguous intent/context |
| Compose · normal path | Choose content/components; arrange a suitable surface | JEV judges fit; code handles layout, ordering rules, accessibility, and rendering |
| Create · when needed | New illustration, instructions, copy, or specialized UI | Separate generator/authored asset; JEV may select the brief/material or assess a draft |

| Example / limit | Approach |
| --- | --- |
| Yoga | Reuse a chosen/supported guide, images, steps, and timer; create new assets separately when needed. |
| New study context | Combine existing notes, documents, timer, and tasks. Domains add capabilities through shared packages. |
| Missing capability | Show unavailable/setup path. A card cannot create an unsupported integration. |
| Generation | JEV does not write prose, generate images, or produce executable UI code. Cache compositions and update live values. |

Docs: [System One](https://docs.typesafe.ai/concepts/system-one) · [Function selection](https://docs.typesafe.ai/cookbooks/function_calling).

## 6. One backend path

```text
Request / meaningful event / due transition
 -> Enabled signals: minimal permitted context metadata
 -> Code or JEV selects context
 -> Recheck workspace access and audience
 -> Retrieve scoped facts + eligible components
 -> Reuse assessments or ask missing semantic questions
 -> Code composes a versioned Space plan
 -> App renders tools, cards, and live values
 -> User action -> existing Gateway -> saved result
```

| Part | Contract |
| --- | --- |
| Retrieval | Detailed personal/employer/customer data only within selected authorized scope and audience. No cross-business blending in model state or UI. |
| Shared catalog | Component purpose, inputs, dependencies, presentation, eligible actions, semantic questions. Domains add human-step assignment/completion rules and exact business records. |
| `records` | Validated context preferences where lifecycle fits; business records remain authoritative. |
| `definitions` | Reusable compositions/templates where appropriate. |
| `assessments` | Proposed reusable judgment contract from `tarv12.md`. |
| Space plan | Derived references, selected components, scope, and versions; never replacement business truth. |
| Context vocabulary | `owner`, `workspace`, `role`, `intent`, `schedule`, `place`, `activity`, `pins`, `layout`. Role describes presentation; membership grants authority. |
| Storage | Validate/migrate proposed contracts before use. Add dedicated storage only for demonstrated lifecycle/query needs. |

One composition path serves every context. Gateway and domain rules own execution.

## 7. Efficient, fresh, personal

| Situation | Behavior |
| --- | --- |
| Unchanged Space | Render saved plan + current permitted values; no complete AI redesign. |
| Exact event | Use code: known shift transition or new order updating a kitchen board. |
| Ambiguous event | Assess relevant meaning, e.g. a supplier message. Batch independent questions; allow a second stage for newly retrieved evidence. |
| Assessment reuse | Match evidence, workspace, audience, candidates, question version/meaning, model, and relevant time assumptions. Access revocation takes effect immediately. |
| New display weights | Recombine existing raw scores when meanings/evidence remain valid; changed goals/activity may require reassessment. |
| Late response | Discard obsolete composition results. Controls and commands retain their explicit workspace binding. |
| Offline / JEV unavailable | Permitted cached views + manual selection; label stale data; verify shared effects through existing rules. |
| Prefetch | Selectively prepare likely next definitions/permitted data; measure benefit against unused work/cost. |
| Onboarding | Begin with minimum useful routine/tools and memberships; no need to configure an entire life. |
| Corrections | Exact settings use code; ambiguous wording may use JEV. Explicit corrections affect future composition immediately. |
| Learning | Behavior suggests inspectable preferences; retain source, scope, freshness, and removal controls. Clicks alone do not prove benefit. |
| Boundaries | Personal preferences cannot change employer policy, others' views, published processes, authority, or recurring-action controls. Evaluate shared ranking changes on held-out data. |

Optimize navigation effort, correct completion, and full cost. Performance/savings remain unproven.

Docs: [Fan-out](https://docs.typesafe.ai/patterns/fan-out) · [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring) · [Building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

### Monthly JEV cost for the example day

Illustrative **one person, 30 days**: morning, one restaurant role, delivery, taxi, office, and own shop = six context entries/day. Assume five known transitions and one ambiguous transition/day; two Space compositions and three ambiguous Inbox events/day. The token estimates include state **and** questions; assessments are reused across Space and Inbox. This budgets context/semantic interpretation, not every participant's end-to-end commerce costs. Standard human handoffs add no JEV calls; actual ambiguous order volume must be budgeted separately.

| Monthly work | Events | JEV calls | Input tokens/call | Monthly tokens | JEV cost (USD) | JEV cost (INR) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Known context transitions | 150 | 0 | — | 0 | $0 | ₹0 |
| Ambiguous context transitions | 30 | 30 | 1,000 | 30,000 | $0.00126 | ₹0.121 |
| Changed Space compositions | 60 | 60 | 3,000 | 180,000 | $0.00756 | ₹0.725 |
| Ambiguous Inbox events | 90 | 90 | 1,500 | 135,000 | $0.00567 | ₹0.543 |
| Inbox opens/filters | 300 | 0 | — | 0 | $0 | ₹0 |
| **Total per person/month** | | **180** | | **345,000** | **$0.01449** | **₹1.389 (about ₹1.39)** |

At the [published Jev 1.13 price](https://docs.typesafe.ai/models) of **$0.042 per million input tokens**, cost = input tokens ÷ 1,000,000 × $0.042; output tokens are free. INR uses **$1 = ₹95.85**, rounded from the [Wise USD/INR rate](https://wise.com/us/currency-converter/usd-to-inr-rate/history) checked 2026-09-25. Multiply USD cost by 95.85; displayed row amounts are rounded. If all six context entries/day, six compositions/day, and seven Inbox events/day each require JEV at the same token sizes, the estimate rises to **570 calls, 1,035,000 input tokens, $0.04347 ≈ ₹4.17/month**. These are JEV-only illustrations, not measured TAR usage; transcription, generation, tools, infrastructure, retries, and provider charges are separate. Recompute from actual billed tokens, current pricing, and exchange rate.

## 8. First proof and decisions

```text
Personal morning -> Restaurant: Kitchen / Cashier -> Own shop
 Guide/timer/note    Role-appropriate board or POS    Separate data
```

| Check | Include |
| --- | --- |
| Prototype | Customer orders in chat → one eligible member accepts → two kitchen stations prepare → pack → courier picks up/delivers → customer confirms/rates. Test configured payment timing and same steps in Space/Inbox. |
| Later integrations | Delivery/taxi need verified provider capabilities or manual input. Label simulated/sample data. |
| Disruptions | Competing claims, item/quantity changes, partial preparation, cancellation after payment, missing worker, duplicate/delayed events, offline completion, revoked participation, shared terminal, and context changes with unfinished work. |
| Measure | Time to tool/action, correct assignment/context, unwanted switches, missed or duplicate steps, corrections, handoff delay, isolation, and full cost per completed process. |
| Compare | Manual context selection and simple schedules. |

| Decision | Position |
| --- | --- |
| Switching · confirmed | Automatic when clear; ask when uncertain; visible override |
| Inbox purpose · clarified | Each person's actionable human steps, including routine work, across authorized scopes |
| Inbox design · proposed | Mine + Available; waiting/history filters; conversations under Ask TAR; scoped customer/partner participation |
| Visual freedom · proposed | Compose reliable components; create/reuse new assets or components when useful |
| Control · proposed | Visible context; switch, pin, hide, hold |
| Scope · proposed | One primary context first; assess access/attention before enabling combinations |

**Product test: When the person's activity changes, does Space become immediately useful?**
