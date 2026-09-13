# TAR v5 - Architecture

> One record. One Authority. Three surfaces: Space, Inbox, Bots.

TAR is one execution Authority over one record table, with three screens. This document is the design; Section 12 marks what is built and what is still target.

===============================================================================
# PART A - THE SYSTEM
===============================================================================

Everything TAR does follows one path.

~~~text
intent   human / channel / schedule
  |
  |  executor: code | model | human
  v
+---------------------------------------------------------------+
| AUTHORITY   the only writer                                   |
| authenticate -> authorize -> validate -> versions             |
+---------------------------------------------------------------+
  |
  |  one workspace transaction
  v
+---------------------------------------------------------------+
| COMMIT   one atomic write                                     |
|   business changes   Records                                  |
|   Run transition     Runs                                     |
|   Event              audit + replay result                    |
|   Delivery intent    external effect                          |
+---------------------------------------------------------------+
  |
  +--> Inbox task      when a person is needed
  |
  +--> Delivery        when the outside world is touched
~~~

**Design rules**

1. One writer - every official effect goes through the Authority.
2. One record table - every business fact is a `records` row; the workspace database is the tenant.
3. Deterministic first - code unless interpretation is genuinely needed.
4. One human queue - all human work is an Inbox task.
5. Three surfaces - Space, Inbox, Bots.
6. Bots are packages, not processes - installing one configures; it does not start an agent.
7. Blobs stay out of the database - R2 holds large content; a Record holds its key.
8. Local-first is a client concern - the device caches permitted data; only the Authority commits shared truth.

**The three screens**

~~~text
+---------------------------------------------------------------+
|  [ Space ]   [ Inbox ]   [ Bots ]                             |
+---------------------------------------------------------------+
| SPACE   the role workbench                                    |
|    Sales today    12,400   metric                             |
|    New sale       open     entry                              |
|    Low stock      3        metric                             |
|    Kitchen queue  open     view                               |
|                                                               |
| INBOX   all human work                                        |
|    Prepare order o17   kitchen   due now                      |
|    Approve refund o17  owner     due 10:30                    |
|    filters: Mine, Unassigned, Team, Approvals                 |
|                                                               |
| BOTS    capabilities                                          |
|    [ Search bots ]                                            |
|    [ME]  Personal        pinned, on device                    |
|          Your private space; no members, no credits           |
|    [PO]  POS Bot         installed, 5 flows                   |
|          Sell, take payments and keep stock in sync           |
|    [SA]  Sales Bot       add                                  |
|          Capture customers, follow up and keep deals moving   |
|    [TE]  Team Bot        add                                  |
|          Onboard people and keep assigned work clear          |
|    [OP]  Operations Bot  add                                  |
|          Handle requests and routine operational work         |
|    [SI]  Site Bot        add                                  |
|          Public website and visitor journeys by prompt        |
+---------------------------------------------------------------+
~~~

Space shows what the role can do, Inbox is the one human queue, and Bots is where capability arrives: a chat-style list, each row opening its Flows or offering `add`. **Personal** is pinned at the top like saved messages - not a Bot, not a workspace you switch to, but a private on-device scope with its own screen.

## 1. VOCABULARY

Three primitives, one execution model, one package. Nothing else is user-facing.

| Kind | Concept | Meaning | Internal name |
|---|---|---|---|
| Primitive | **Record** | Any stored fact - contact, order, task, message, run, site | `records` row |
| Primitive | **Action** | A registered, versioned capability: `app` or `human` | action registry |
| Primitive | **Authority** | The policy + commit boundary for shared Records and external effects | `executeGateway` |
| Model | **Harness** | How a step runs: context + policy + tools + budget | gateway + executors |
| Package | **Bot** | Capability pack: records + Actions + Flows + cards + Inbox work + roles | `definitions` rows |
| Definition | **Flow** | A Bot's ordered Run template | `definitions` kind=`flow` |
| Surface | **Space** | The role's workbench of cards | `canvas` over `definitions` |
| Surface | **Inbox** | Every task a person must act on | view over `type='task'` |
| Surface | **Bots** | Installed capability and the directory | view over `definitions` |
| Connection | **Channel** | An inbound/outbound link with a verified sender | channel link + control ledger |

A Run, a site, a message and a Bot install are all Records. The **Authority** is TAR's policy-enforcement point (PEP) and its unit of work - the only writer. `artifact`, tool, skill, model, MCP and sandbox are engineering terms; users see Records, Flows, Actions, Bots.

- **An Action is `app` or `human`.** Model work is a Harness step, not a fourth Action type.
- **A Channel is a connection, not a view.** A Record plus a verified adapter, not a third screen.

## 2. AUTHORITY - ONE COMMIT CONTRACT

The path above is the only write path. Every registered Action passes the same gate: registered ID, role check, required fields, input fingerprint, replay lookup, then one transaction that writes business state and the audit Event together. Action IDs such as `order.place` are namespaced identifiers, not column names.

| Boundary | Rule |
|---|---|
| Replay | workspace + key binds actor, Action ID/version and input hash; returns the saved result without re-executing |
| Conflict | same key with changed input or explicit version fails; unique key and checked writes prevent duplicate effects |
| Concurrency | expected version checked inside the transaction; require the intended affected rows |
| Reads | project permitted rows and fields; screen visibility is not access control |
| Retry | re-invokes execution, bounded; a legitimate re-run takes a new occurrence key; stale input needs a new decision |
| External effect | commit a Delivery intent; use a stable provider key; reconcile uncertain outcomes |
| Separate stores | D1, Turso, R2 and providers share no transaction - bridge with a durable intent and a saved result |

**Runtime.** The Authority runs on Cloudflare Workers with Effect v4 (`effect@4.0.0-rc.112`) and `@libsql/client` for remote Turso access. Cloudflare supplies HTTP, D1 control data, Queues and scheduled recovery; Turso stores one operational database per workspace; R2 stores large content.

Money, stock, assignment and approvals never use last-write-wins; money and counts are integers. Access and definition-management Actions are owner/admin-only and never model-controlled.

## 3. RECORDS + STORAGE

| Store | Holds | Authority |
|---|---|---|
| Control / D1 | identity, membership, invites, channel links, chat command ledger | access; rows carry `workspace` |
| Workspace / Turso | business Records, definitions, Runs, Events | one isolated database per workspace |
| Objects / R2 | media, product content, site releases | immutable content referenced by DB |
| Device / local SQLite | permitted cache, drafts, pending Actions | local persistence; shared changes require the Authority |

One table holds everything; the workspace connection is the tenant, so business rows carry no `workspace`.

~~~text
+---------------------------------------------------------------+
| records   one row per business fact                           |
|   id        text pk                                           |
|   type      text    contact|order|task|message|run|pos.*|site |
|   title     text                                              |
|   state     text                                              |
|   data      json    type-specific facts                       |
|   owner     text?   business ownership                        |
|   assignee  text?   human task assignment                     |
|   due       int?    due time (UTC ms)                         |
|   version   int     optimistic concurrency                    |
|   created   int     UTC ms                                    |
|   updated   int     UTC ms                                    |
|   archived  int?    archive marker                            |
+---------------------------------------------------------------+
| definitions   Bots, Flows and workspace kits                  |
|   id, kind ('flow'|'bot'|'kit'), name, version, state, data   |
+---------------------------------------------------------------+
| runs   pinned Flow occurrences                                |
|   id, flow_id, flow_version, occurrence, state, action_id,    |
|   context json, version                                       |
+---------------------------------------------------------------+
| events   audit + replay ledger                                |
|   id, kind, run_id, record_id, action_id, state, actor_id,    |
|   input_hash, idempotency_key UNIQUE, data json               |
+---------------------------------------------------------------+
~~~

| Rule | Meaning |
|---|---|
| Names | physical columns are single lowercase ASCII words |
| Notation | `data.contact` is a path; `roles[]` is an array |
| Units | money = integer minor units + currency; rates = basis points; time = UTC milliseconds |
| Identity | `contact` stores a contact ID; `owner` is business ownership; `assignee` is human assignment |
| Extension | type-specific facts live in `data`; hot common filters stay columns |
| Removal | archive Records; protected definitions and audit keep their own retention |

| Keep in DB | Put in R2 |
|---|---|
| prices, stock, reservations, order lines, payment facts | images, video, receipts, attachments |
| assignment, status, short messages, searchable metadata | long documents, large message bodies |
| Flow definitions, compact audit | site releases, large traces and tool results |

Small text and JSON stay inline; review payloads around 32 KB. Blobs never enter the replicated database; devices fetch them on demand. DB and R2 share no transaction: authorize upload, verify hash/size/type, then commit the reference. Cleanup never races attachment. Credentials live in secret storage, never in Records.

## 4. HARNESS - HOW A STEP RUNS

The Harness is the one execution path behind the assistant, every Flow, every Bot and every Channel. It assembles what a step sees, bounds what a step may do, and hands every effect to the Authority.

~~~text
+---------------------------------------------------------------+
| HARNESS    context + policy + tools + budget for one step     |
| EXECUTORS  code | model | human                               |
| EFFECT     only the Authority commits (Section 2)             |
+---------------------------------------------------------------+
~~~

| Executor | Used for | May commit? |
|---|---|---|
| **code** | calculations, validation, transactions, integrations, known rules | yes, through the Authority |
| **model** | one structured call, or a bounded tool loop within a step budget | proposes only |
| **human** | judgement, missing facts, required approval | replies through Inbox; the Authority validates |

It picks the cheapest sufficient executor: `code -> model -> human`.

**Step contract.** Every step declares its executor, its context sources, the tools it may call, its output schema and its budget. A step may call only the tools it declared, so no prompt can widen its own reach.

| Guarantee | Rule |
|---|---|
| One path | Assistant, Flows, Bots and Channels all call the same Authority |
| Proposals | model output is a schema-validated proposal; a commit performs the effect |
| Context is data | records, messages and tool output are data, never authority |
| Bounded | a loop ends on success, budget or handoff - never blindly; a step cannot exceed its declared tools |
| Durable | a completed Action returns its saved result even if its implementation has retired |
| Failure | save progress; bounded retry or Inbox handoff; manual work stays available |

Today the loop is **single-step**: one request drives one Action through the Authority. Multi-step Runs, waiting and resumption are the next increment (Section 12). The only model call in the service is `pos.product.draft` (`@cf/meta/llama-3.1-8b-instruct-fast`): it suggests catalog wording from facts the user entered, never sets price, tax, barcode, SKU or stock, and every suggestion stays editable.

## 5. BOTS - THE CAPABILITY SYSTEM

A Bot is a package of business capability: the records it owns, the Actions it adds, the Flows it ships, the cards it puts on Space, the work it puts in the Inbox and the roles it expects. It is not a running agent - installing it configures the workspace; deterministic steps stay code and only reasoning steps call a model.

~~~yaml
Bot:
  id: pos
  title: POS Bot
  category: Retail
  guidance: "Set up your store, add products, open the register."
  flows:    [sell, orders, stock, customers, register]
  records:  [product, order, payment, register, movement, customer]
  actions:  [pos.open, pos.order.save, pos.checkout, pos.refund, pos.stock.adjust]
  roles:    [cashier, kitchen, stock]
~~~

| Part | Means | Surfaces as |
|---|---|---|
| `flows` | template processes it ships, each a set of steps | Space cards, Run history |
| `records` | types it introduces | records lists, forms, search |
| `actions` | registered tools it adds | Space entries, Flow steps |
| `roles` | work roles it expects | assignment, card visibility |
| `guidance` | setup text | Bots screen |

Installing a Bot writes `definitions` rows (bot + kit + flows) and changes all three surfaces at once, through the Authority: Space gets role-appropriate cards, Inbox gets human work templates, Bots shows installed state. Removing it archives those definitions while preserving Records, Runs and history.

**Lifecycle.** `publish (immutable revision) -> install (resolve, pin, preview) -> configure -> remove (archive, keep work)`.

**Four ways capability arrives**

| Kind | What it is | Adds code? | Example |
|---|---|---|---|
| Core | always present | built in | contacts, tasks, files, search, Inbox |
| Directory Bot | reviewed pack + starter config | sometimes, via a pack | POS, Sales, Team, Operations, Site |
| Custom Flow | user composes existing Actions into a new Flow | no | a house process built from Team + POS Actions |
| Pack | reviewed code adding a new Action or invariant | yes | a payment provider adapter, a tax rule |

A Custom Flow never writes code; a Pack is the only route to new executable capability, and it always goes through review.

**Creating a Bot - from prompt to pack**

~~~text
+---------------------------------------------------------------+
| describe the business                                         |
|   --> identify Records and relationships                      |
|   --> discover registered Actions                             |
|   --> draft Flows, Space cards and role defaults              |
|   --> flag access, approvals and high-risk effects            |
|   --> user reviews a compact preview                          |
|   --> Authority publishes the Bot                             |
+---------------------------------------------------------------+
~~~

**Packaging rules.** User prompts and imported content are never executable code; only reviewed Packs add Actions; the Authority governs every effect whatever Bot requested it; cards, Flows and triggers bind to registered IDs, never arbitrary SQL or JavaScript; removal is archival by default and destructive deletion is a separate reviewed Action.

**Contacts - the one Core record every Bot shares**

Contacts and Organizations are **Core Records**: always present, owned by no Bot. There is **no Contacts Bot** - a Bot that owned contacts would fork the one customer record. What a business installs is a Bot that *operates on* Contacts.

~~~text
+---------------------------------------------------------------+
| CORE   contact + organization + link                          |
|        always present; owned by no Bot                        |
+---------------------------------------------------------------+
~~~

| Core record | Holds |
|---|---|
| `contact` | a person - `roles[]`, handles, consent |
| `organization` | a company; contacts reference it |
| `link` | a relationship: source, target, relation |

A contact holds `roles[]` - `lead, customer, candidate, employee, vendor, partner`; a role never grants access (Section 10), membership does. A `link` is a relationship Record between two contacts or a contact and an organization (employment, referral, household) - not a side table.

~~~text
+---------------------------------------------------------------+
| a contact   from a form, channel, import or Run               |
| flow.start  the contact becomes the Run subject               |
| Flow        lead-capture / qualify / follow-up                |
| steps       Actions, human Inbox tasks, waits                 |
| produces    deal | application | ticket | task                |
| Inbox       a person decides                                  |
+---------------------------------------------------------------+
~~~

**Who operates on Contacts.** Bots declare the contact roles they serve and contribute cards, Flows and Inbox work to the shared Contacts view; they never copy process fields onto the person.

| Bot | Contact roles | Produces |
|---|---|---|
| Sales | lead, customer | deal, quote, follow-up |
| Support | customer | ticket, conversation |
| Hiring | candidate, employee | application, offer, onboarding task |
| POS | customer | order, payment |
| Custom Flow | any permitted | any permitted Action + Record |

- **Sales** owns the *deal* process, never the contact.
- **Hiring** runs over the same contacts with roles `candidate` and `employee`; its onboarding Flow may propose membership, but only owner/admin Actions grant access.
- **Custom sales** is a Custom Flow inside the installed Sales Bot - compose existing Actions (`lead.capture` -> `qualify` -> an approval task -> `quote.send`); no code, no new Bot.
- **Relationship flows** (referral, renewal, win-back, check-in) are Flows whose subject is a contact or a `link`, triggered by schedule or channel.

## 6. SPACE - THE ROLE-BASED SCREEN

Space answers one question: given my role and the installed Bots, what can I see and do here?

~~~text
+---------------------------------------------------------------+
| eligible = owner/admin OR role match                          |
| visible  = eligible + the member's pinned selection           |
| data     = query policy + scope + permitted fields            |
+---------------------------------------------------------------+
~~~

| Card kind | Binds to | Opens |
|---|---|---|
| **data (metric)** | a registered metric + parameters | the value and its permitted source Records |
| **view** | a registered view over a Record type | the filtered records |
| **action** | exactly one Action | a form or a confirmation |
| **flow** | a published Flow | a new Run, or an existing one |

| Rule | Meaning |
|---|---|
| One resolver | Role decides eligibility; the member pins/reorders within it |
| No new execution | opening a query card never starts a Run |
| Registered queries | queries own joins, filters, aggregation and indexes; cards store typed parameters |
| In-place edit | owners add, remove and reorder cards directly |
| Operational landing | staff roles such as kitchen or support may land in their Inbox instead |

A published `kit` definition may contain `data.canvas.cards`. Cards contain no execution logic; they bind to registered data, Actions or published Flows. Without a published kit, TAR supplies a minimal canvas.

## 7. INBOX - ALL HUMAN WORK

Inbox is the single queue for everything that needs a person: every human step becomes an Inbox task, whatever produced it.

~~~text
+---------------------------------------------------------------+
| task = title + assignee + state + due                         |
| data = record?, roles[], action, run?, step?, kind            |
+---------------------------------------------------------------+
~~~

| Becomes an Inbox task when | Source |
|---|---|
| a Run reaches a human step | Flow |
| an Action requires approval before its effect | approval |
| work failed and a person can act | failure recovery |
| a conversation needs a reply | Channel |
| code detected a condition a person must judge | review / exception |

| Concern | One rule |
|---|---|
| Storage | Inbox queries existing `type='task'` records; no separate queue |
| Filters | Mine = assigned to me; Unassigned = eligible/unclaimed; Team = permitted team work; Approvals |
| Claim | atomically assign eligible unclaimed work; one winner |
| Complete | the required domain Action commits the outcome; dismissing is not completion |
| Ownership | the task owns assignment; the case owns its lifecycle |
| Dedupe | one task per human responsibility, not one per message |
| Notifications | point to existing work; routine events and retries stay in history |

Standalone tasks need no Run.

## 8. FLOWS + RUNS - ORDERED WORK

~~~text
+---------------------------------------------------------------+
| Flow   revision + trigger + audience + input + steps          |
| step   id + Action bindings + next / condition / wait         |
| Run    pinned Flow + cursor + principal + checkpoints         |
+---------------------------------------------------------------+
| ready --> running --> done                                    |
|           |                                                   |
|           +--> waiting --> running                            |
|           +--> failed / cancelled                             |
+---------------------------------------------------------------+
~~~

A Flow template is authored inside its Bot, then materialised on install:

~~~text
+---------------------------------------------------------------+
| flows   in the Bot definition                                 |
|   - id: sell                                                  |
|     title: New sale                                           |
|     steps: [pos.order.save, human: confirm, checkout]         |
+---------------------------------------------------------------+
  |
  |  install
  v
+---------------------------------------------------------------+
| definitions   workspace DB   kind='flow'   published          |
+---------------------------------------------------------------+
  |
  |  flow.start
  v
+---------------------------------------------------------------+
| run   a records row, when started                             |
+---------------------------------------------------------------+
~~~

The title is the label; steps bind only to registered Actions. A human step creates an Inbox task and the Run waits. A Custom Flow is authored through `flow.publish` into the same `definitions` table.

**Current scope.** `flow.start` creates a Run pinned to the Flow version and its first Action, and writes the audit Event. Advancing the cursor between steps, waiting on Inbox and resuming, budgets, strategies and checkpoints are the next increment (Section 12). Today a Run is a pinned record plus audit trail; multi-step work is composed by Actions that commit their own domain outcome.

| User experience | Engine behavior |
|---|---|
| Simple editor | Who, When, Conditions, Message + readable steps |
| Advanced editor | registered Actions, bindings, branches and waits |
| Human step | title + person/eligible roles + source + required Action + optional due time |
| Draft | same Flow definition, validator and publishing path |

~~~text
+---------------------------------------------------------------+
| draft --> configure --> validate --> publish --> run          |
|           schemas + refs             immutable                |
+---------------------------------------------------------------+
~~~

New publications affect new Runs; active Runs keep their pinned Flow and Action versions.

| Audience | Entry and authority |
|---|---|
| `team` | member -> role/grant checks -> permitted Actions |
| `customer` | public form/channel -> validation, consent, rate limits -> restricted grant |
| `both` | limited customer entry -> explicitly authorized team handoff |

## 9. CHANNELS

| Family | Direction | Adapters | Status |
|---|---|---|---|
| Team | in + out | Slack, Discord, Google Chat | live |
| Customer | in + out | website chat, email, messaging | future |
| Social | out | Zernio | future |

~~~text
+---------------------------------------------------------------+
| verify webhook -> dedupe(provider + account + event)          |
|   --> resolve verified sender                                 |
|   --> allowlisted command through the Authority               |
|   --> acknowledge -> reply with the result                    |
+---------------------------------------------------------------+
~~~

| Rule | Detail |
|---|---|
| Identity | a verified link binds a chat account to a TAR member; TAR permissions apply in the room |
| Commands | an allowlist only (`done`, `start`, `ready`); everything else points to TAR |
| Ledger | commands are durable in the control plane with bounded retry and a status reply |
| Privacy | no business payloads, roles or private details are posted to the room |

Conversation is a lightweight Record, unique by channel + the adapter's stable thread reference. Related threads may link to the same contact without merging automatically.

## 10. MEMBERS + ACCESS

~~~text
+---------------------------------------------------------------+
| Google sign-in                                                |
|   --> Personal       (pinned, on device, free)                |
|   --> Work Space     --> members + shared Records             |
+---------------------------------------------------------------+
~~~

| Access | Rule |
|---|---|
| Workspace | isolated database + membership + timezone, currency and business-day settings |
| Base roles | `owner`, `admin`, `member`, `guest` |
| Work roles | labels such as cashier, cook, stock; a member holds one `workRole` |
| Scope | own = ownership; team = explicitly permitted roles; all = permitted workspace data |
| Assignment | permits defined task access, not unrestricted source-record access |
| Fields | the Authority projects allowed fields for app and model |
| Revocation | subsequent access denied; in-flight effects reconciled |

A contact role never grants access: membership and access rules do. Access and secret Actions are owner/admin-only.

**Personal is a pinned scope, not a Bot.** It is not a workspace to switch to and not a `definitions` Bot: a private, device-local scope shown as a fixed pinned entry in the Bots screen. It has no members, costs no credits, and never enters a work workspace database - so an owner/admin can never read it. Work workspaces you belong to appear beside it; there is no full-screen workspace switcher.

### HTTP surface

| Route | Purpose |
|---|---|
| `GET /health` | liveness and provisioning status |
| `GET /v1/actions` | registered Actions and interface contracts |
| `GET+POST /v1/workspaces` | list (provisions Personal) or create a workspace |
| `GET /v1/workspaces/:slug/canvas` | Space cards for the member's role |
| `GET /v1/workspaces/:slug/inbox` | tasks + projections + permissions |
| `GET /v1/workspaces/:slug/directory` | Bots, Flows, install state |
| `GET+PUT /v1/workspaces/:slug/definitions` | workspace definitions |
| `GET /v1/workspaces/:slug/{records,pos/*,site}` | permitted reads |
| `POST /v1/workspaces/:slug/actions/:id` | the Authority (requires `Idempotency-Key`) |
| `GET+POST+PUT .../members`, `.../team-chat` | membership and channel links |
| `POST /v1/channels/{slack,discord,google-chat}/events` | verified inbound channel webhook |
| `GET /v1/sites/:slug` | published site for a workspace |

## 11. SITE BOT - PUBLISHED WEB

The Site Bot turns workspace records into a public site. It is a Directory Bot - a package of Actions over one Record type - not a running agent, a second database or a visual builder.

~~~yaml
Site Bot:
  records: [site]
  actions: [site.generate, site.update, site.compile, site.publish, site.rollback, site.refresh]
  roles:   [owner, admin]
~~~

| Action | Does |
|---|---|
| `site.generate` | build a draft `site` Record from a title, prompt and theme |
| `site.update` | apply typed operations to the draft: `set_theme`, `set_locale`, `add_card`, `update_card`, `remove_card` |
| `site.compile` | render a release candidate: hash and file metadata, no bytes stored |
| `site.publish` | render, write an immutable release to R2, point the live release |
| `site.rollback` | repoint the live release to an earlier manifest |
| `site.refresh` | recompute collection items from workspace records, with no model call |

**A page is a fixed catalog, not freeform output.** A site is pages of typed Cards, rendered to semantic HTML and CSS with zero client runtime.

| Card family | Card family |
|---|---|
| navigation, hero, content, collection, features, proof | faq, hours, contact, form, cta, footer |

Three reviewed themes ship with the Bot: `editorial-chalk`, `streetwear-dark` and `minimal-clean`. Design tokens render to CSS variables; the theme owns colour, type, radius and spacing.

~~~text
+---------------------------------------------------------------+
| draft --> update (typed ops) --> compile (hash)               |
|       --> publish (R2 + pointer) --> serve                    |
|       |                                                       |
|       +--> rollback repoints to an earlier manifest           |
+---------------------------------------------------------------+
~~~

| Rule | Detail |
|---|---|
| Store | the `site` Record holds the definition, the live release id and manifest metadata - never page bytes |
| Blobs | a release writes `.../releases/{releaseId}/index.html` and `/style.css` to R2 (Section 3) |
| Deterministic | identical definition and tooling produce identical bytes |
| Serve | `GET /v1/sites/:slug` resolves the live manifest and streams `index.html` from R2 |
| Recovery | older releases stay in R2; rollback is a pointer change |
| Removal | removing the Bot archives its definitions and preserves accepted work |

**Boundaries.** Drafting uses a reviewed template today, not a model call - `site.generate` does not call the AI binding. This release has no variants, surfaces, journeys, policies or DESIGN.md contract: a site is pages of Cards, three themes and typed update operations. Anything more arrives later as a reviewed addition.

## 12. BUILT VS TARGET

A capability is not real until it leaves this table.

| Promise | Status | Note |
|---|---|---|
| Single-writer Authority | built | every Action commits through the Gateway and the shared commit contract |
| Replay, versions, audit Events | built | |
| Bots: install / remove / Custom Flow | built | |
| Space, Inbox, team chat | built | |
| Site Bot: catalog, themes, compile, publish, rollback, refresh | built | |
| R2 site releases | built | releases are written to R2; the Record keeps the manifest and hash |
| Model steps | partial | only `pos.product.draft` (Section 4); `site.generate` is a reviewed template, not a model call |
| Advancing Runs (multi-step, wait/resume) | **not built** | `runs` rows are created and audited, never advanced |
| Budgets, `strategy` (`single`/`verify`), `parallel` | **not built** | no behaviour |
| Delivery intents + delivery state machine | **not built** | external effects are synchronous today |
| Approvals | **not built** | no approval Action is registered |
| Sandbox, learning / proposed corrections | **not built** | |
| Local-first sync | client plan | lives in the app, not this service |

The workspace schema carries only what runs: `definitions`, `records`, `runs` and `events`.

## 13. PRICING - A CREDIT PAYS FOR A MEASURED COST

One wallet pays for everything; a credit is money and every charge maps to a measured cost. Deterministic work is free (Design rule 3).

| Rule | Meaning |
|---|---|
| One wallet | personal and work usage draw the same balance; no separate plans or workspace limits |
| Cost, not margin | top-ups pass through at cost, with no expiry while the account is active |
| Inference is the only variable | a model is charged only where one actually runs |
| Unbuilt is unpriced | a capability enters this table only when it leaves Section 12 |

**The wallet.** Rs. 500 / month gives 1,000 credits at Rs. 0.10 each - the Rs. 100 cost envelope (see [techstack.md](techstack.md)); price and grant are both monthly. Top-ups: Rs. 100 = 1,000 credits, Rs. 500 = 5,000, Rs. 1,000 = 10,000, credited at cost.

| Item | Credits | Basis |
|---|---:|---|
| Personal workspace | 0 | device-local SQLite |
| Each active owned workspace | 100 / month | one Turso database: storage, operations and sync |
| Joined workspace | 0 for the member | the owner's wallet |
| Deterministic Actions - `record.*`, `task.*`, `pos.*` (except drafts), `flow.*`, `directory.*` | 0 | code through the Authority |
| Site Actions - `site.generate`, `update`, `compile`, `publish`, `rollback`, `refresh` | 0 | reviewed template and deterministic renderer; no inference |
| Keeping a site live | 0 extra | R2 release objects sit inside the workspace reservation |
| Model step - `pos.product.draft` | 0.02 cr | the only model call in the service (Section 4) |
| OCR, voice, research swarms, campaigns, lead batches, photo cleanup | - | not built; priced when they leave Section 12 |
| WhatsApp, SMS, domains, payment processing | separate | third-party pass-through |

A site's only recurring cost is storage, already inside the workspace reservation.

===============================================================================
# PART B - A PIZZA STORE, END TO END
===============================================================================

~~~text
+---------------------------------------------------------------+
| Slice House = one Work Space                                  |
| Muthu = owner | Malar = admin/cashier | Iniya = cashier       |
| Velan = cook                                                  |
| Pizza Store = POS Bot (+ Inventory, Kitchen as they arrive)   |
+---------------------------------------------------------------+
~~~

| Space card | Kind | Target | Roles |
|---|---|---|---|
| Sales today | metric | `pos.summary.sales` | owner/admin |
| New sale | entry | `pos.open` | owner/admin/cashier |
| Kitchen queue | view | open kitchen tasks | kitchen |
| Low stock | metric | `pos.summary.lowStock` | owner/admin/stock |
| Close shift | entry | `shift-close` Flow | owner/admin/cashier |

| Person | Space defaults | Inbox |
|---|---|---|
| Muthu | Sales today, Low stock | approvals |
| Malar | Sales today, New sale, Low stock | shift review |
| Iniya | New sale, Close shift | handover |
| Velan | Kitchen queue | preparation tasks; default landing |

~~~text
+---------------------------------------------------------------+
| order-take      interpret -> quote -> order.save -> checkout  |
| orders-returns  find sale -> refund                           |
| stock-receive   delivery -> movements -> stock                |
| shift-close     count -> compare -> close                     |
| kitchen-prepare task -> start -> ready -> done                |
|                                                               |
| Accept    check stock + order + totals (one commit)           |
| Prepare   kitchen ready -> order completes                    |
| Fulfil    consume stock + payment -> receipt                  |
| Cancel    release unconsumed lines                            |
+---------------------------------------------------------------+
~~~

Available = stock. A duplicate tap returns the saved result; a UPI payment is recorded only after the cashier confirms receipt and supplies a unique reference. Velan receives items and quantities, not prices or phone numbers. Sales, Team, Operations and Site Bots have the same shape.

===============================================================================
# REFERENCES
===============================================================================

| Topic | Sources |
|---|---|
| Agents and context | [Effective agents](https://www.anthropic.com/engineering/building-effective-agents), [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) |
| Harness design | [Harness engineering](https://mindwiredai.com/2026/05/13/harness-engineering-ai-agents-2026/), [minimalist harness guide](https://niraya666.github.io/en/posts/agent-harness-minimalist-design-guide-2026/) |
| Durable execution | [Durable execution for LLM agents](https://vadim.blog/durable-execution-llm-agents/), [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/), [events](https://developers.cloudflare.com/workflows/build/events-and-parameters/) |
| Single writer | [Single writer principle](https://mkabdelrahman.github.io/posts/eda-single-write-principle/), [Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) |
| Storage | [Turso pricing](https://turso.tech/pricing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Sync + access | [Local-first guide](https://turso.tech/blog/building-local-first-apps-the-complete-guide-to-offline-first-database-sync), [sync](https://docs.turso.tech/sync/usage), [authorization](https://docs.turso.tech/sdk/authorization) |
| Runtime | [Turso serverless](https://docs.turso.tech/sdk/ts/quickstart), [Effect](https://effect.website/), [Worker lifecycle](https://developers.cloudflare.com/workers/runtime-apis/context/) |

> **The Authority commits truth. Bots package capability. Space shows the role what matters. Inbox holds human work. Runs make progress auditable.**
