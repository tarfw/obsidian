# TAR v12 — Canonical Architecture

| Item | Contract |
| --- | --- |
| Product | One trusted system for personal work, teams, commerce, sites and agent assisted action |
| Authority | This file is the sole system architecture; [Space](space.md), [Commerce](commerce.md) and [Site](site.md) are its product contracts |
| Runtime | `tarapp/` Expo client + `tarharness/` Cloudflare Worker |
| Data policy | Fresh schema only; no compatibility layer, legacy migration or silent shape conversion |
| Decision policy | Deterministic rules decide facts; Jev ranks uncertain choices; people approve consequential effects |

## 1. Product model

```text
                         TAR
                          |
             +------------+------------+
             |                         |
      COMMERCE KERNEL              AGENT CONTROL
      exact business state         judgment + planning
             |                         |
      Durable Flow Books        Jev / agent adapter
             |                         |
             +------ ACTION GATEWAY ---+
                          |
              +-----------+-----------+
              |           |           |
            API/MCP     Sandbox      Browser
            preferred   files/code   Playwright/CUA
```

The Action Gateway is the only mutation boundary. Agents, UI, chat providers,
Flow Books and future tools call the same registered Actions. No agent receives
direct database authority.

## 2. User surfaces

| Surface | Purpose | Projection |
| --- | --- | --- |
| Space | What matters in the user’s current context | One workspace + role + owner; automatic when clear, asks when uncertain |
| Inbox | Human actions needing attention | Authorized items across every workspace, grouped as Mine, Available and Waiting |
| Ask TAR | Turn an outcome into a reviewable next Action | Jev ranks registered Actions; the user reviews before execution |
| Flow Books | Repeat a durable multi-step process | Versioned definition, fixed run snapshot, replay-safe steps |
| Site | Public business presence | Typed pages and cards compiled into immutable releases |
| Artifact | A durable document or interactive result | Workspace-scoped record metadata plus R2 content when large |

Space changes context. Inbox remains global unless the user applies a workspace
filter. The day shown in [space.md](space.md) is illustrative data, never a
hardcoded routine or profession list.

## 3. Runtime ownership

| Component | Owns | Source |
| --- | --- | --- |
| TAR App | Native presentation, auth token, review and intent | `tarapp/src/` |
| Worker | Identity, authorization, routing, recovery and public delivery | `tarharness/src/index.ts` |
| Control store | Users, workspaces, members, context holds, chat and dispatch | D1 via `src/db/control.ts` |
| Workspace store | Business records, flows, events, turns and consent | one Turso database per workspace |
| Gateway | validation, permissions, idempotency and mutation | `src/gateway/actions.ts` |
| Commerce | catalog through refund and balanced postings | `src/commerce/` |
| Space | context resolution and cross-workspace projections | `src/space/` |
| Site | typed schema, compiler, releases and rollback | `src/site/` |
| Blob store | product content and immutable site release files | private R2 buckets |
| Recovery | queued chat work, Flow dispatch and scheduled sweeps | Queues, Workflows and cron |

## 4. Storage

```text
D1 CONTROL                         TURSO WORKSPACE
users                              definitions / editions
workspaces                         records / links / consents
members                            runs / steps / events / turns
contexts                           effects / approvals / assessments
invites / chat / dispatches

R2 PRODUCT_CONTENT                 R2 SITE_RELEASES
long catalog content               immutable HTML/CSS release files
```

| Rule | Effect |
| --- | --- |
| Workspace isolation | Each workspace has its own operational database and membership check |
| Compact facts | Searchable state, quantities, prices and references remain in Turso |
| Large content | Documents, media and compiled releases live in R2; records keep keys, hashes and versions |
| Integer arithmetic | Money uses currency minor units; stock uses integer base units |
| Audit | Accepted effects append events with actor, Action, input hash and idempotency key |
| Clean boot | One idempotent workspace schema and one consolidated D1 migration create the current model |

## 5. Identity and authority

1. Google OIDC proves the user identity.
2. D1 resolves active workspace membership and platform role.
3. A work role narrows the visible projection and eligible Actions.
4. The Gateway validates the registered Action and current authority again.
5. Workspace data is opened only after authorization.

Platform roles are `owner`, `admin`, `member` and `guest`. Work roles are open
text such as chef, cashier, courier or sales; they do not create a fixed list of
professions. Provider roles from Slack, Discord or Google Chat never become TAR
authority.

## 6. Action Gateway

```text
intent
  -> authenticate
  -> authorize workspace + Action
  -> validate typed input
  -> fingerprint(actor, Action, input)
  -> claim/replay idempotency key
  -> commit exact state + event atomically
  -> return canonical result
```

| Action family | Examples |
| --- | --- |
| Records | `record.create`, `contact.create`, `organization.create`, `task.create` |
| Context | `routine.save` |
| Commerce | `catalog.item.save` through `refund.record` |
| POS | product, cart, checkout, return, stock and register Actions |
| Flows | `flow.publish`, `flow.start`, `flow.advance`, `flow.suggest` |
| Sites | generate, update, compile, publish, rollback and refresh |
| Research | `web.search` with a claimed paid turn |

An Action declares its version, type, fields, roles, interface and effects.
Unknown Actions are rejected. A reused operation key with different input is
rejected. Registered state transitions cannot be bypassed with generic record
writes.

## 7. Jev and agent execution

| Need | Mechanism |
| --- | --- |
| Clear rule or calculation | ordinary code and SQL |
| Ambiguous selection or ranking | Jev choice with probabilities |
| Suggested next Action | Jev ranks the registered catalog and returns a review flag |
| Long reasoning or tool use | agent adapter calls the Gateway |
| External system with an API/MCP | API/MCP adapter |
| Files or code | isolated sandbox adapter |
| No usable API | browser adapter with screenshot and approval gates |

Jev never changes money, stock, ownership or permissions. Its answer is typed
advice. Current runtime ships Jev Action ranking; agent, sandbox and browser
drivers are replaceable adapters and cannot change the commerce kernel.

## 8. Durable Flow Books

```text
published definition v3
        |
        +-> immutable edition v3
                 |
                 +-> run snapshots v3 + inputs
                           |
                           +-> step 0 -> event
                           +-> step 1 -> event
                           +-> pause/retry/resume
```

A run retains the edition it started with. Every step has an occurrence,
version, state, input and output. Internal reviewed steps can be dispatched to a
Cloudflare Workflow. External or consequential steps wait for a person. Turns,
idempotency keys and audit events make retries safe after timeout or crash.

## 9. Domain flow

```text
supplier -> purchase -> receive -> stock
customer -> order -> reserve -> fulfil -> invoice -> payment -> refund
                                      \-> balanced postings
```

[commerce.md](commerce.md) defines the exact records and invariants. Domains
such as restaurant, retail, delivery, taxi or services reuse the same shared
cycle and add domain packages only for distinct facts or Actions.

## 10. Site flow

```text
workspace facts -> typed draft -> validate -> compile all pages
       -> immutable R2 candidate -> atomic publish pointer -> serve / rollback
```

[site.md](site.md) defines page cards, live bindings and release rules. Generated
content cannot invent business facts. Public mutations remain policy gated and
must enter the Action Gateway.

## 11. HTTP contract

| Route | Meaning |
| --- | --- |
| `GET /health` | runtime and provisioning health |
| `GET /v1/workspaces` | authorized workspace list with role and owner |
| `GET /v1/space` | resolved context and its server-built sections |
| `PUT /v1/context` | hold one context or resume automatic selection |
| `GET /v1/inbox` | one cross-workspace human-action projection |
| `GET /v1/workspaces/:slug/actions` | eligible Action and interface registry |
| `POST /v1/workspaces/:slug/actions/:id` | sole mutation entry point |
| `GET /v1/workspaces/:slug/records` | authorized records/search |
| `GET /v1/workspaces/:slug/flows` | Flow Books and resumable runs |
| `GET /v1/sites/:slug/*` | current immutable public site release |

All authenticated mutations require an idempotency key. Public delivery uses
strict content types, caching and security headers.

## 12. Production gates

| Gate | Command or proof |
| --- | --- |
| Worker types | `npm run check` in `tarharness/` |
| Worker behavior | `npm test` in `tarharness/` |
| Worker package | `wrangler deploy --dry-run` |
| App types + lint | `npx tsc --noEmit` and `npm run lint` in `tarapp/` |
| App release config | `npm run release:check` |
| Control data | apply `0001_control.sql` to a clean production D1 database |
| Secrets | OIDC, Turso and optional provider/Jev keys exist only as Worker or EAS secrets |
| Observability | Worker logs, D1 state, queue retries and Flow dispatch state are visible |

Deployment does not weaken these contracts. Missing optional credentials hide
the related Action rather than substituting an unsafe path.
