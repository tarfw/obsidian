# TARAI — Unified Product & Architecture Plan

**Status:** implementation blueprint · **Project:** `tarai` · **Runtime:** one Cloudflare Worker with Flue-ready modules · **Clients:** TarApp, channels, storefront

## 1. Product contract

Tarai is the one AI operating system for a person and their workspace. A user uses **Tar**; Tar gives safe answers, prepares work, routes specialised work, and asks for approval before any consequential external action.

| Principle | Rule |
|---|---|
| One front door | Owners use workspace Tar; members use role-scoped Tar; customers reach only Sales or Support. |
| Truth before prose | Business facts live in Turso/OKF. The model may phrase facts but never invent, overwrite, or calculate them. |
| AI proposes; code authorizes | Every tool enforces workspace, role, schema, budget, idempotency, and approval policy. |
| Native, calm UI | TarApp shows at most three timely cards; deeper work opens a temporary sheet. No generated HTML or JS in the mobile app. |
| Durable by design | Turso owns business state; Workflows own long jobs; Flue conversations are optional, not a v1 dependency. |
| Small first | Build one complete owner-to-result path before adding agents, channels, or verticals. |

## 2. Final architecture

```
 TarApp / web widget / verified channels
                 │ authenticated request or webhook
                 ▼
 ┌────────────────────────── TARAI Worker ──────────────────────────┐
 │ Hono edge: auth · rate limits · identity · role gate · API        │
 │ Tarai modules: routing · sales · support · site · operations       │
 │ Tools: typed, least-privilege business actions                    │
 │ Workflows: site publish · scheduled routine · approval process    │
 │ Cron: due-routine scan and housekeeping only                       │
 └───────┬──────────────────┬───────────────────┬───────────────────┘
         │                  │                   │
       Turso               R2                  KV
       truth          OKF + assets       read cache only
```

TarApp is currently action-first: intent resolution, typed tools, native GenUI, Turso, and OKF are sufficient. Tarai v1 creates no application Durable Objects. If persistent multi-turn agent chat is later validated, enable one Flue conversation agent; Flue will then create its conversation Durable Objects automatically. Cloudflare Workflows own multi-step jobs that must survive waits, retries, approval, and deploys. No standalone `siteagent` service exists.

| Store | Owns | Never use it for |
|---|---|---|
| Turso | tenants, identities, roles, matter, motion, routines, job ledger, approvals, idempotency keys | edge-cacheable HTML or large assets |
| R2 / OKF | workspace markdown, versioned diffs, site sections, uploads, generated artifacts | transactional locks or authorization decisions |
| KV | rendered-page cache, public facts snapshot, short-lived membership cache | canonical facts, job state, locks, or approvals |
| Optional Flue DO SQLite | transcript and recovery state for a future persistent conversation | business truth, routines, site jobs, or caches |

### v1 Durable Object decision

| Capability | v1 implementation | DO |
|---|---|---:|
| TarApp owner command | request/response route + typed tool + Turso audit | No |
| Personal scope | existing personal Turso scope + native GenUI | No |
| Channel webhook | verify, authorize, enqueue/execute, return | No |
| Persistent multi-turn chat | feature-flagged Flue conversation keyed by `user + scope` | Later, only if validated |
| Site/OCR/report job | Workflow + Turso/R2 checkpoints | No application DO |

## 3. Identity, tenancy, and policy

```
request → verify channel/OIDC identity → resolve tenant + membership
        → code policy gate → module or typed tool → audit event
```

| Audience | Entry point | Allowed scope |
|---|---|---|
| Owner | TarApp, private channel DM | workspace administration, approvals, all permitted reports |
| Member | TarApp, verified workspace channel | assigned role, station, and permitted records only |
| Customer | storefront widget, WhatsApp | public catalogue, order/help context; never internal data |
| System | workflow/cron | predeclared service identity and tenant-scoped job only |

`team.md` is a readable OKF projection, not the authorization database. Tarai writes it from approved Turso membership changes and records every revision in `log.md`. An inactive member is denied immediately by Turso policy; KV can only accelerate a read. Use an OIDC provider (Google may be first) and verified channel identity linking—never trust a display name or handle alone.

## 4. Agents

Tarai v1 is request/response and action-first. Tier 2 modules are invoked through narrow task contracts; they do not receive broad credentials or unrestricted chat access. A persistent Flue conversation is a later opt-in capability.

| Tier | Module/agent | Current identity | Mission | Can act without approval |
|---|---|---|---|---|
| 1 | **Tar router** | `request_id + user_id + scope` | intent resolution, routing, approvals, owner help | reads, drafts, internal summaries |
| 1 optional | **Tar Conversation** | `conversation:{user}:{scope}` | persistent multi-turn chat, only after product validation | same policy as Tar router |
| 2 | **Sales / Support** | `request_id + customer_id + scope` | factual catalogue, FAQ, quote and issue intake | public answers, drafts, ticket creation |
| 2 | **Site** | `job_id + scope` | plan, generate, verify and publish a business site | draft only; live publish needs owner approval |
| 2 | **Ops / Analyst** | `job_id + scope` | stock, bookings, reports, anomalies and forecasts | detect, advise and propose |
| 3 | **Marketing / Finance / Intake / Team** | `job_id + scope` | campaigns, invoice drafts, OCR staging, roster/canvas proposals | drafts or staging only |

Chores are not agents. A chore is a small scheduled policy: `due condition → idempotent action or approval → audit event → next due time`. A chore can graduate to automatic execution only after an owner sets an explicit policy, spend cap, audience, and expiry.

## 5. Tool and approval contract

Every tool has typed input/output, a tenant filter, permission requirement, validation schema, audit event, and stable idempotency key. No agent obtains database, payment, channel, or provider credentials.

| Risk class | Examples | Behaviour |
|---|---|---|
| Read | report, availability, FAQ | execute and cite source facts |
| Draft | message, invoice, marketing copy, site plan | save versioned draft and show review |
| Reversible write | task, stock correction, canvas proposal | confirm when user did not explicitly request it; record undo window |
| Consequential | send external message, publish, booking, refund, purchase | owner/authorized-role approval plus idempotency key |
| Restricted | payment capture, credential change, member removal | explicit approval, strong authorization, immutable audit record |

Approval records contain `tenant_id`, actor, action type, normalized payload hash, expiry, policy version, and resulting idempotency key. A retry may read a completed result, never repeat an uncertain external side effect.

## 6. Knowledge and data model

```
Turso truth ──approved projection──► OKF markdown ──read slice──► agents / Site
          └────audit motion────────► reports, routines, GenUI
```

| Object | Canonical form | Purpose |
|---|---|---|
| `workspace`, `member`, `role`, `permission` | Turso | tenant access and lifecycle |
| `matter` | Turso | current entities: product, booking, task, customer, invoice |
| `motion` | Turso append-only | order, correction, approval, delivery, report-sent events |
| `routine`, `job`, `attempt` | Turso | scheduling, leasing, retry and backoff |
| `approval`, `idempotency` | Turso | safe external effects |
| `wiki/*`, `team/team.md`, `team/canvas.md`, `site/*` | R2/OKF | human-readable, versioned workspace knowledge |

Fact access is slice-based: pricing gets offerings; contact gets logistics; testimonials and FAQs stay verbatim. A fact change emits a structured diff and bumps only the affected slice hash. Agents must mark unknown facts as unknown; they never bootstrap a fact into truth without review.

## 7. Site Agent: module, not service

The Site module lives in `tarai/src/modules/site.ts`. It uses deterministic compilers plus bounded LLM work; it never receives write credentials for canonical business facts.

```
description + workspace scope
  → understand → fact slices → style/compile → plan ── owner review ─┐
  → copy → section synthesis → facts/security/visual verification     │
  → draft artifacts → owner publish approval → R2 + KV public page ◄──┘
```

| Stage | Deterministic responsibility | Model responsibility |
|---|---|---|
| Ground | read approved FactSheet slices | none |
| Compile | tokens, vocabulary, constraints, asset slots | none |
| Plan | validate paths, section kinds, coverage | propose information architecture |
| Write/Synth | validate schema and scope CSS | distinct copy and section markup/CSS |
| Verify | facts, sanitizer, CSP, links, responsive/a11y/visual checks | repair only from precise violations |
| Publish | immutable version, cache promotion, rollback pointer | none |

Generated site output is isolated from TarApp. Sanitize HTML; reject scripts, event handlers, remote CSS/JS, unsafe URLs and cross-tenant asset paths. Pages are immutable R2 versions; KV is merely the serving cache. Render keys use `style_hash + section_brief_hash + fact_slice_hash + compiler_version + prompt_version`, so a price update rerenders the menu, not the whole site.

## 8. GenUI and team canvas

TarApp is a native, declarative client. It calls Tarai APIs; it never connects directly to Turso and never runs arbitrary SQL, HTML, or agent-generated code.

```
┌───────────────────────────────────────────────────────────────┐
│ Glance bar: mode + one important notice                        │
├───────────────────────────────────────────────────────────────┤
│ Live action stream: at most 3 cards (task, metric, primary UI) │
├───────────────────────────────────────────────────────────────┤
│ Action dock: 3 contextual chips + text/voice intent            │
└───────────────────────────────────────────────────────────────┘
             tap / speak → native review sheet → confirm
```

| Native block | Use | Data source contract |
|---|---|---|
| `task-inbox` | approvals and assigned work | `tasks.list(scope, filters)` |
| `metric-card` | sales, earnings, workload | `metrics.get(metric, period)` |
| `quick-pos` | checkout/table flow | `pos.session(id)` |
| `stock-sheet` | counted inventory | `inventory.list(threshold)` |
| `pipeline-card` | leads/deals | `pipeline.list(stage)` |
| `contact-card` | customer/supplier action | `contacts.get(id)` |
| `action-confirm` | high-risk review | `approval.preview(id)` |
| `data-grid` | bounded operational list | registered `data_view` + typed filters |

`canvas.md` declares only registered blocks, registered data views, typed filters, role visibility, and action IDs. It cannot contain SQL. An owner asks Tar to change the canvas; Tar produces a validated diff and native preview; the owner applies it. Personal and workspace canvases are separate. Offline operation queues signed, idempotent commands locally and reconciles through Tarai when connected.

## 9. Channels, routines, and sandbox

| Capability | Design |
|---|---|
| Channels | Verify provider signature, map immutable provider ID to member/customer, acknowledge quickly, then dispatch to the correct typed Tarai route. An optional persistent conversation is added only when needed. |
| Routines | Cron selects due Turso rows; a Workflow claims one job atomically, performs bounded steps, records result, then calculates the next run. |
| Notifications | Sender policy, recipient, template and quiet hours are checked before an approval-gated send. |
| Sandbox | Start with no sandbox. Add an isolated, short-lived sandbox only for approved OCR/import/report/code jobs, with no production credentials, egress allowlist, CPU/time budget and R2 artifacts. |

## 10. Repository layout

```
tarai/
├── package.json  vite.config.ts  wrangler.jsonc  tsconfig.json
├── src/
│   ├── app.ts                    # Hono routes, auth, webhook verification
│   ├── agents/                   # optional Tar conversation adapter only
│   ├── modules/                  # sales, support, site, ops, analyst
│   ├── tools/                    # typed policy-enforced application actions
│   ├── workflows/                # site-publish, routine, approval execution
│   ├── domain/                   # schemas, authorization, facts, idempotency
│   ├── data/                     # Turso repositories and OKF/R2 projection
│   ├── genui/                    # canvas schema, registered data views
│   ├── channels/                 # provider adapters
│   └── cloudflare.ts             # cron, Workflow exports, observability
├── skills/                       # narrowly-scoped, versioned Flue skills
├── migrations/                   # Turso SQL; Flue DO migrations only if enabled later
└── test/                         # unit, contract, workflow, visual fixtures
```

`wrangler.jsonc` declares R2, KV, Workers AI/AI Gateway, Workflow bindings, and observability. It declares Flue-generated Durable Object migrations only when the optional conversation agent is enabled. Secrets remain platform secrets. Pin model aliases and provider fallback in configuration, not prompts or code.

## 11. Delivery plan

| Phase | Outcome | Exit gate |
|---|---|---|
| 0 — Foundation | new `tarai` Worker, OIDC/channel identity gate, Turso/R2/KV contracts, tracing | authenticated request reaches a typed route; no direct DB from client |
| 1 — Safe vertical slice | action-first Tar router + approval inbox + one native GenUI task/metric flow | owner can request, review, approve, audit and undo a reversible action |
| 2 — Revenue slice | factual Sales/Support plus Site draft-to-publish Workflow | customer answer is fact-grounded; site plan/publish requires owner approval |
| 3 — Operations | routines, Ops, Analyst, role canvas and member lifecycle | duplicate/retry/outage tests show no duplicate external effect |
| 4 — Optional conversation | measure real demand for persistent chat; add one Flue Tar conversation only if justified | restart, streaming, retention and cost tests pass; otherwise remain DO-free |
| 5 — Extensions | Marketing, Finance, Intake, Team, constrained sandbox | each extension passes its policy, cost and operational SLO gates |

Do not begin a later phase until the prior phase's end-to-end tests and rollback are demonstrated. Add a new model, channel, agent, or native block only behind a feature flag and tenant allowlist.

## 12. Operational standards and acceptance

| Area | Required standard |
|---|---|
| Security | verified webhook/OIDC identity, tenant filter in every query, RBAC tool enforcement, schema validation, rate/budget limits, encrypted secrets, audit log |
| Reliability | idempotency for effects, workflow retry/backoff/dead letter, job lease, R2 version rollback, tested deploy/restart recovery |
| AI quality | fact-grounded answers, structured tool calls, prompt/version provenance, evaluation fixtures, human review for consequential output |
| UX | three visible cards maximum, native review sheet, accessibility labels/focus, optimistic offline queue with explicit sync state |
| Site quality | fact/security/a11y/link checks, viewport screenshots, visual regression fixtures, immutable preview then explicit publish |
| Cost | per-tenant token, sandbox, Workflow and notification budgets; hard caps; dashboard and monthly cost review |
| Observability | structured logs with correlation IDs, traces, job/approval metrics, alert on failures/backlog/budget exhaustion |

**Definition of done:** an owner, member and customer can each complete their permitted path; an interrupted job resumes safely; a duplicate webhook cannot duplicate an effect; a revoked member loses access immediately; every published fact, outbound message and UI action is attributable, reversible where possible, and within budget.

## 13. Explicit non-goals for v1

- No arbitrary SQL, generated executable code, arbitrary mobile widgets, or direct client database access.
- No autonomous payments, bookings, outreach, publishing, member removal, or knowledge writes.
- No application Durable Objects in v1; Flue conversation Durable Objects are an optional later capability.
- No standalone Site Agent Worker or duplicated business truth.
- No promise of exact latency/cost before load tests; targets become commitments only after measurement.
