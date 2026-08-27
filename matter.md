# TAR: Matter, Motion, Graph, Memory, Pipelines, Flow, Inbox & GenUI
### Unified Business and Operating Architecture · Turso · Cloudflare · OKF

---

## 1. System Formulas & Core Ontology

```text
System    = Matter + Motion + Graph + Memory + Pipelines + Flow + Inbox + GenUI

Matter    = Current business state
            People, organizations, products, orders, invoices, tickets, tasks

Motion    = Immutable facts about change
            Sales, payments, messages, stock changes, stage changes, approvals

Graph     = Durable structural relationships
            assigned_to, works_at, supplied_by, stored_at, variant_of

Memory    = Useful context and knowledge
            OKF documents + recent motion history + derived search indexes

Pipelines = Versioned stage machines
            Sales, support, hiring, restock, delivery, kitchen, shifts

Flow      = Reliable automation
            Trigger -> validate -> transact -> reason -> approve -> execute -> record

Inbox     = Each user's unified action feed
            Digest, approvals, assigned work, reminders, urgent signals

GenUI     = Role-aware interface generated from trusted definitions
            Speak, tap, done; at most three primary cards; deeper work in sheets
```

### Non-negotiable rules

1. Turso owns operational state and events. OKF owns instructions, policies, templates, and long-form knowledge.
2. D1 owns identity, membership, authorization routes, billing, and service lifecycle.
3. Tarai is the only authoritative write path. TarApp never receives a workspace write credential.
4. TarApp syncs one read-only Personal Sync DB containing only data the user is allowed and likely to need offline.
5. Every mutation is idempotent. State change, motion append, and outbox creation commit in one database transaction.
6. AI may propose or draft; deterministic code validates and executes. Consequential actions require policy evaluation and, when required, approval.
7. Authorization is enforced before reads, writes, projections, AI context assembly, and external delivery.
8. Operational records use stable IDs, integer type codes, integer timestamps, and integer minor currency units.

---

## 2. Authority & Data Boundaries

| Store | Authoritative responsibility |
|---|---|
| **D1 Control DB** | Users, workspaces, memberships, roles, database routes, token lifecycle, wallets, ledger, plans, service state |
| **Workspace Turso DB** | Workspace matter, motion, graph, pipelines, requests, approvals, and transactional outbox |
| **Personal Turso DB** | Personal matter/motion/graph plus the user's inbox and authorized offline projections |
| **TarApp local sync replica** | Read-only local copy of the Personal Turso DB; disposable and rebuildable |
| **TarApp device DB** | Local-only request outbox, drafts, preferences, and sync metadata; never authoritative business state |
| **R2 OKF storage** | Policies, roles, canvas definitions, skills, wiki, templates, site artifacts, verified cold archives |
| **KV** | Derived, versioned cache and lookup pointers only; never the sole source of truth |
| **Search index** | Derived keyword/vector index over authorized Turso and OKF content; rebuildable from source |
| **Analytics/Logs** | Usage, latency, sync health, workflow health, model cost, security and audit telemetry |

### Clean split: HOW versus WHAT

```text
OKF / R2 = HOW the workspace operates
           Policies, SOPs, roles, UI definitions, prompts, templates, wiki

Turso    = WHAT exists and WHAT happened
           Catalog, prices, stock, orders, invoices, tickets, assignments, events
```

Operational catalog fields required for checkout or offline work—SKU, barcode, name, price, currency, tax code, quantity, and status—belong in Turso. OKF may hold rich descriptions, merchandising guidance, and document templates, but must not be a second authority for price, tax, or stock.

---

## 3. Master Architecture & Request Flow

```text
Signals
  TarApp | Web forms | WhatsApp | Telegram | Discord | Email | POS | Voice
     |
     v
Tarai Gateway
  Authenticate -> resolve tenant -> authorize -> validate -> deduplicate
     |
     v
Workspace transaction
  Update Matter -> append Motion -> create Outbox/Approval -> commit
     |
     +--------------------------+
     |                          |
     v                          v
Flow workers                Projection worker
  AI/deterministic work       Resolve recipients and minimum payload
  External side effects       Upsert into each Personal DB
  Retries and reconciliation          |
     |                                v
     +-------------------------> Personal Sync DB
                                      |
                                      v pull
                                TarApp local replica
                                      |
                                      v
                                Inbox + GenUI
```

### Tarai responsibilities

1. Verify OIDC identity and current D1 membership on every request.
2. Resolve the correct personal or workspace database without trusting a client-supplied host.
3. Enforce role, capability, field, record, and risk policies.
4. Execute all authoritative writes and append their motion records atomically.
5. Deduplicate retries and return the original response for the same request.
6. Run pipelines, approvals, agents, projections, archives, and external actions through durable workflows.
7. Issue short-lived, database-scoped, read-only Personal DB tokens for sync.
8. Route signed channel webhooks to a workspace through verified channel-account mappings.
9. Serve published sites from immutable versioned artifacts and route public forms through rate-limited endpoints.

### Audiences and entry points

| Audience | Entry point | Maximum scope |
|---|---|---|
| Owner/admin | TarApp and authenticated private channels | Explicit administrative capabilities, approvals, and permitted reports |
| Member | TarApp and verified workspace channels | Assigned role, station, records, and field-level capabilities |
| Customer | Public site/widget and verified messaging | Public catalog plus their own order/support context; never internal workspace data |
| System | Workflow, queue, and cron | Predeclared service identity, tenant, action, budget, and expiry |

### Execution model

- **Tar router:** request-scoped intent resolution and typed action routing. It may read, summarize, and draft within current authorization.
- **Bounded modules:** Sales, Support, Site, Ops, and Analyst receive narrow task contracts and minimum fact slices. They never receive broad credentials or unrestricted tenant access.
- **Durable workflows:** own multi-step jobs that must survive retries, waits, approvals, outages, and deploys.
- **Routines/chores:** small scheduled policies—due condition -> idempotent action or approval -> motion -> next due time. A routine is not an autonomous agent.
- **Optional conversation:** v1 remains request/response. Persistent multi-turn conversation may later use one feature-flagged conversation runtime keyed by user and scope; its transcript is not business truth and it cannot expand tool permissions.

Tarai v1 uses no application Durable Object. Add one only when a measured requirement needs serialized, low-latency conversational state that Turso plus Workflows cannot provide. Site builds, reports, OCR, approvals, and schedules remain Workflow jobs.

### Implementation boundaries

`src/app.ts` owns explicit routes and middleware; `domain/` owns schemas, policies, facts, and idempotency; `data/` owns D1/Turso/R2 repositories; `tools/` owns typed application actions; `modules/` owns bounded domain reasoning; `workflows/` owns durable jobs; `genui/` owns canvas and data-view contracts; `channels/` owns provider adapters; and `cloudflare.ts` exports workflows, cron, and telemetry. Dependencies point inward toward domain contracts, not between provider adapters.

---

## 4. Storage Topology & Least-Data Offline Sync

```text
USER SIGNS UP
  -> one Personal Turso DB is provisioned
  -> one encrypted local sync replica is bootstrapped in TarApp

USER CREATES WORKSPACE
  -> one Workspace Turso DB is provisioned
  -> owner membership and service records are committed in D1

USER JOINS WORKSPACE
  -> no additional mobile database
  -> authorized offline rows are projected into that user's Personal DB
```

### Workspace DB

- Authoritative workspace `matter`, `motion`, and `graph`.
- Pipeline definitions and active flow state.
- Idempotency requests, routines/jobs, approvals, and transactional outbox.
- No user inbox table and no direct mobile credential.

### Personal DB

- Authoritative personal matter, motion, and graph.
- Unified inbox from personal work and all joined workspaces.
- A projection table containing only authorized, minimal workspace read models.
- No workspace authority: a projection can be stale and can always be rebuilt.

### Partial sync rule

Turso sync is database-scoped, not an arbitrary row-filtering mechanism. TAR achieves partial sync by writing only approved projections into each user's Personal DB. TarApp pulls that database; it never syncs the full Workspace DB.

Projection policies must specify:

- eligible roles or explicit recipients;
- allowed fields and redactions;
- offline necessity and maximum row count;
- expiry time and removal tombstones;
- source workspace, source record, source version, and projection version.

Examples:

- A waiter receives assigned tables, active orders, menu availability, and ready alerts—not payroll or all customers.
- A technician receives assigned jobs, required parts, site details, and recent notes—not the full CRM.
- A cashier receives sellable products and current price/stock projections—not supplier contracts.

### TarApp sync protocol

1. TarApp authenticates with Tarai.
2. Tarai returns the Personal DB URL and a short-lived read-only token scoped to that database.
3. TarApp opens `@tursodatabase/sync-react-native` with a device-local path, remote URL, and token callback.
4. Reads are served only from the local replica.
5. `db.pull()` runs after sign-in, on foreground, after network recovery, on push invalidation, and on manual refresh.
6. A modest active-session cadence may be used when push invalidation is unavailable; continuous five-second polling is not the default.
7. Business writes never call `db.run()` on the sync replica. They call Tarai or enter the separate device outbox while offline.
8. Logout, revocation, account switch, or device de-registration closes and securely removes the replica and cached encryption material.

The local file must be encrypted at rest. Tokens are short-lived and refresh through Tarai. Revocation stops future pulls; because previously downloaded data cannot be remotely un-read, projection minimization, expiry, device security, and local wipe are mandatory.

---

## 5. Canonical Tenant Schema

The same canonical `matter`, `motion`, and `graph` definitions are used in Personal and Workspace databases. Personal databases additionally contain `inbox` and `projection`. Workspace databases additionally contain `request`, `routine`, `job`, `approval`, and `outbox`.

```sql
CREATE TABLE matter (
  id          TEXT PRIMARY KEY,
  type        INTEGER NOT NULL,
  data        TEXT NOT NULL CHECK (json_valid(data)),
  state       INTEGER NOT NULL DEFAULT 1,
  version     INTEGER NOT NULL DEFAULT 1,
  created     INTEGER NOT NULL,
  updated     INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE motion (
  id           TEXT PRIMARY KEY,
  type         INTEGER NOT NULL,
  actor        TEXT NOT NULL,
  ref          TEXT,
  data         TEXT NOT NULL CHECK (json_valid(data)),
  idem         TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  created      INTEGER NOT NULL,
  deleted_at   INTEGER
);

CREATE TABLE graph (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  target      TEXT NOT NULL,
  kind        INTEGER NOT NULL,
  data        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  version     INTEGER NOT NULL DEFAULT 1,
  created     INTEGER NOT NULL,
  updated     INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE inbox (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  workspace_id  TEXT,
  type          INTEGER NOT NULL,
  title         TEXT NOT NULL,
  ref           TEXT,
  priority      INTEGER NOT NULL DEFAULT 1,
  status        INTEGER NOT NULL DEFAULT 1,
  data          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
  version       INTEGER NOT NULL DEFAULT 1,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL,
  deleted_at    INTEGER
);

CREATE TABLE projection (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL,
  collection     INTEGER NOT NULL,
  source_id      TEXT NOT NULL,
  type           INTEGER NOT NULL,
  data           TEXT NOT NULL CHECK (json_valid(data)),
  source_version INTEGER NOT NULL,
  expires        INTEGER,
  updated        INTEGER NOT NULL,
  deleted_at     INTEGER,
  UNIQUE (workspace_id, collection, source_id)
);

CREATE TABLE request (
  idem          TEXT PRIMARY KEY,
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,
  payload_hash  TEXT NOT NULL,
  status        INTEGER NOT NULL,
  response      TEXT,
  created       INTEGER NOT NULL,
  completed     INTEGER,
  expires       INTEGER
);

CREATE TABLE routine (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  schedule      TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  config        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config)),
  policy_version TEXT NOT NULL,
  state         INTEGER NOT NULL DEFAULT 1,
  next_run      INTEGER NOT NULL,
  last_run      INTEGER,
  version       INTEGER NOT NULL DEFAULT 1,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE job (
  id            TEXT PRIMARY KEY,
  routine_id    TEXT REFERENCES routine(id),
  action        TEXT NOT NULL,
  idem          TEXT NOT NULL UNIQUE,
  input         TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input)),
  result        TEXT CHECK (result IS NULL OR json_valid(result)),
  status        INTEGER NOT NULL DEFAULT 1,
  attempts      INTEGER NOT NULL DEFAULT 0,
  run_after     INTEGER NOT NULL,
  lease_owner   TEXT,
  lease_until   INTEGER,
  last_error    TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE approval (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  actor         TEXT NOT NULL,
  required_role TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  payload_hash  TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status        INTEGER NOT NULL DEFAULT 1,
  expires       INTEGER NOT NULL,
  decided_by    TEXT,
  reason        TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);

CREATE TABLE outbox (
  id            TEXT PRIMARY KEY,
  kind          INTEGER NOT NULL,
  ref           TEXT,
  destination   TEXT NOT NULL,
  payload       TEXT NOT NULL CHECK (json_valid(payload)),
  idem          TEXT NOT NULL UNIQUE,
  status        INTEGER NOT NULL DEFAULT 1,
  attempts      INTEGER NOT NULL DEFAULT 0,
  next_attempt  INTEGER NOT NULL,
  lease_owner   TEXT,
  lease_until   INTEGER,
  provider_ref  TEXT,
  last_error    TEXT,
  created       INTEGER NOT NULL,
  updated       INTEGER NOT NULL
);
```

### Required indexes

```sql
CREATE INDEX idx_matter_live
  ON matter(type, state, updated DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_motion_type
  ON motion(type, created DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX idx_motion_ref
  ON motion(ref, created DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX idx_graph_source
  ON graph(source, kind) WHERE deleted_at IS NULL;
CREATE INDEX idx_graph_target
  ON graph(target, kind) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unq_graph_live_edge
  ON graph(source, target, kind) WHERE deleted_at IS NULL;
CREATE INDEX idx_inbox_pending
  ON inbox(user_id, status, priority DESC, created DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_projection_workspace
  ON projection(workspace_id, collection, type, updated DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_outbox_due
  ON outbox(status, next_attempt) WHERE status IN (1, 4);
CREATE INDEX idx_routine_due
  ON routine(state, next_run) WHERE state = 1;
CREATE INDEX idx_job_due
  ON job(status, run_after) WHERE status IN (1, 4);
```

Hot module fields may receive versioned SQLite expression indexes, such as barcode, SKU, stage, or due date. Queries select only required columns. Schema migrations are versioned, forward-tested, restartable, and applied by the provisioning/migration workflow—not by TarApp.

### Data conventions

- IDs: UUIDv7 or an equivalent sortable, collision-resistant identifier with a type prefix.
- Timestamps: Unix milliseconds in UTC; timezone is presentation metadata.
- Money: integer minor units plus ISO currency, never floating point.
- Quantities: integer base units where possible; otherwise documented fixed precision.
- JSON: validated at the boundary and compact on storage; common indexed fields use stable keys.
- Updates: optimistic concurrency through `version`; stale writes receive `409 Conflict` with current state.
- Deletes: tombstone first; hard-delete only under the retention policy and after dependent records are handled.

---

## 6. Immutable Type Registry

Codes are append-only. A code is never reused or given a new meaning. Aliases exist in application code, not in stored data.

```text
MATTER (1-99)                 MOTION (101-299)
1   person                    101 sale
2   organization              102 refund
3   product                   103 quote_issued
4   service                   104 invoice_issued
5   listing                   105 purchase_order_issued
6   document                  106 vendor_bill_received
7   asset                     107 payment_recorded
8   location                  108 stock_received
9   flow_definition           109 stock_transferred
10  flow                      110 stock_adjusted
11  note                      111 stock_written_off
12  goal                      112 booking_created
13  expense                   113 booking_cancelled
14  order                     114 shipment_created
15  ticket                    115 delivery_completed
16  booking                   116 activity_recorded
17  invoice                   117 assignment_changed
18  quote                     118 clocked_in
19  shipment                  119 clocked_out
20  task                      120 flow_stage_changed
21  resource                  121 flow_completed
22  payment                   122 flow_dropped
                               123 status_changed
                               124 order_placed
                               125 order_ready
                               126 order_served
                               127 ticket_opened
                               128 ticket_resolved
                               129 approval_requested
                               130 approval_decided
                               131 low_stock_detected

PERSONAL MOTION (201-299)    GRAPH (1-49)
201 expense_logged            1 placed_by       order -> person
202 reminder_triggered        2 supplied_by     product -> organization
203 goal_updated              3 fulfills        shipment -> order
204 personal_note_added       4 works_at        person -> organization
                               5 assigned_to     task/flow/ticket -> person
                               6 stored_at       product/asset -> location
                               7 issued_by       invoice/document -> organization
                               8 for_contact     flow/ticket -> person
                               9 in_flow         matter -> flow_definition
                              10 owned_by        flow/document -> person
                              11 about           note/document -> matter
                              13 linked_to       matter -> matter
                              14 variant_of      product -> product
                              15 served_by       order -> person
                              16 responsible_for person -> location/resource

INBOX TYPE (1-9)             MATTER STATE
1 task                        0 inactive
2 alert                       1 active
3 approval                    2 pending
4 reminder                    3 closed
5 notification                4 archived
6 suggestion

INBOX STATUS                 REQUEST STATUS
0 dismissed                   1 processing
1 pending                     2 completed
2 done

APPROVAL STATUS              OUTBOX STATUS
1 pending                     1 pending
2 approved                    2 leased
3 rejected                    3 delivered
4 expired                     4 retry
5 executed                    5 dead

ROUTINE STATE                JOB STATUS
0 paused                      1 queued
1 active                      2 leased / running
2 disabled                    3 completed
                              4 retry
                              5 failed / dead
                              6 cancelled

PROJECTION COLLECTION
1 matter  2 motion  3 graph  4 module_read_model
```

Graph endpoints are matter IDs in the same tenant database. A workspace membership may map its D1 user to a workspace person matter ID so assignment edges can resolve to an authenticated recipient. Membership itself remains authoritative in D1 and is not duplicated as a graph edge. Transaction line items remain immutable snapshots in order/sale motion data rather than graph rows.

---

## 7. Idempotent Write & External-Action Protocol

Every mutating Tarai request requires an `Idempotency-Key` generated once by the client and retained across retries. Use at least 128 bits of randomness; time and action names may be prefixes for debugging but are not the uniqueness guarantee.

### Typed tool and risk contract

Every action has versioned input/output schemas, tenant resolution, capability and field policy, rate/cost limits, idempotency behavior, audit motion, error codes, and an undo/compensation contract where possible. Modules receive action interfaces—not database, payment, messaging, storage, or model credentials.

| Risk | Default behavior |
|---|---|
| Read | Execute within authorized fact slices and return source/version provenance |
| Draft | Save a versioned draft; no external delivery |
| Reversible write | Execute only when explicitly requested or confirmed; expose an undo window/compensation action |
| Consequential | Require an authorized review/approval unless a narrow, versioned automation policy explicitly permits it |
| Restricted | Require fresh strong authorization, explicit approval, immutable audit, and no background policy bypass |

Payments, credential changes, member removal, destructive retention changes, and expansion of permissions remain restricted. A budget or automation policy narrows this contract; it never upgrades the caller's capability.

### Database mutation

```text
1. Authenticate and authorize.
2. Validate the canonical request and compute payload_hash.
3. Begin a transaction in the authoritative tenant DB.
4. Insert request(idem, actor, action, payload_hash, pending).
   - Existing key + same hash + completed -> return stored response.
   - Existing key + different hash -> 409 idempotency_conflict.
   - Concurrent duplicate -> wait/re-read; never execute twice.
5. Validate versions, price, stock, limits, and policy inside the transaction.
6. Update Matter and Graph as needed.
7. Append Motion rows using deterministic per-effect idempotency keys.
8. Insert Approval or Outbox rows for later work.
9. Store the canonical response and mark the request completed.
10. Commit and return the stored response.
```

Failed transactions leave no partial business state. Retryable failures return a stable machine-readable error and retry hint. Idempotency records outlive the longest offline retry window; financial and external-effect keys are retained with their audit records.

### External effects

Email, WhatsApp, payment, PDF, webhook, and site-publish actions run from the transactional outbox after commit. Workers claim due rows with leases, retry with exponential backoff and jitter, and record provider IDs and responses. Provider idempotency keys are used when available. Because arbitrary external systems cannot guarantee exactly-once delivery, TAR guarantees durable intent, at-least-once processing, deduplication where supported, and explicit reconciliation where it is not.

### Approvals

An approval binds action, immutable payload hash, requester, required role, policy version, and expiry. Approval does not mutate the original payload. Execution re-checks membership, policy, expiry, target version, and available funds/stock before creating an idempotent outbox action.

---

## 8. Offline Writes & Conflict Handling

Offline operation does not bypass Tarai. TarApp stores an authenticated request envelope in its separate device outbox and submits it when connectivity returns.

```text
Device outbox status:
pending -> inflight -> accepted
                   -> retry_wait -> inflight
                   -> needs_review
                   -> rejected_final
```

Each queued request contains a stable idempotency key, device ID, user/workspace scope, action and schema version, payload and hash, expected entity versions, creation time, and retry metadata.

Rules:

1. A timeout or network error returns the item to `retry_wait`; it is never permanently rejected merely because delivery failed.
2. Retries use the same idempotency key, authenticated Tarai endpoint, exponential backoff, jitter, and a maximum cadence.
3. Only a successful canonical Tarai response marks the item accepted.
4. Validation conflicts become `needs_review` with current price, stock, version, or policy information.
5. Permanent authentication, membership, malformed-request, or prohibited-action failures become `rejected_final`.
6. Accepted responses are pulled into the Personal DB projection and replace provisional UI state.

### Offline POS

- TarApp may calculate and display a provisional cart from its latest catalog projection.
- It labels offline sales as pending and does not issue a final tax invoice or confirmed receipt before Tarai accepts them.
- Tarai atomically revalidates SKU, unit price, currency, tax rule, stock, permissions, and duplicate payment reference.
- The workspace chooses an explicit oversell policy: reject, allow negative stock, reserve a device quota, or require review.
- Orders snapshot item name, SKU, unit price, discounts, tax rate, tax amount, currency, and quantity. Later catalog changes never rewrite history.

---

## 9. Projection, Inbox & GenUI

### Projection pipeline

```text
Committed Motion
  -> select projection policy
  -> resolve explicit assignment, responsibility, and role
  -> minimize and redact payload
  -> upsert deterministic projection/inbox ID
  -> retry until delivered
  -> emit tombstone when access or relevance ends
```

Projection delivery is idempotent and version-aware. An older workflow cannot overwrite a newer projection. Failures enter a reconciliation queue with alerts. Membership removal stops new projections, prevents token renewal, creates tombstones, and prompts device cleanup.

### Inbox contract

1. **Digest** — concise summary of completed background activity.
2. **Approvals** — immutable proposals waiting for an authorized decision.
3. **Signals** — assigned work, deadlines, anomalies, and urgent changes.

Pending tasks are not removed merely due to age. Completion and dismissal go through Tarai. Push notification is a hint; the Personal DB inbox is durable truth.

### Three-zone experience

```text
ZONE 1  GLANCE
        Critical/offline notice + explicit Personal/Workspace/Life Mode switch

ZONE 2  NOW
        At most three primary cards: urgent action, useful signal, primary tool

ZONE 3  ACT
        Three contextual chips + search/intent field + voice input
```

Deep tools—contacts, pipelines, inventory, reports, calendars, maps, and configuration—open in a slide-up sheet or dedicated screen and leave the main screen stable. “Three taps” is the target for routine actions, not a reason to skip review, accessibility, authentication, or safety steps.

### Modes and action dock

- Personal, workspace, shift, and gig modes are explicit contexts, never authorization boundaries.
- Time, location, recent activity, and assignment may suggest a mode or reorder cards only with consent. The user's manual choice remains stable until they change it or accept a suggestion.
- Idle state offers at most three safe action chips. Typed input resolves registered actions locally where possible. Voice is transcribed through Tarai; provider secrets never enter TarApp.
- Natural-language intent always resolves to a typed action and validated parameters. Risky, financial, or external actions open a review sheet before execution.
- The glance bar may contain operational notices or clearly labeled sponsorship. Sponsored content cannot imitate alerts, use sensitive targeting, displace critical notices, or affect authorization and ranking of required work.

### Declarative canvas contract

`personal/canvas.md` and `workspaces/{workspace_id}/team/canvas.md` describe presentation; they do not contain executable code, credentials, authorization rules, or arbitrary SQL.

```yaml
schema: 1
version: 12
min_app_version: 1.0.0
modes:
  shop:
    roles: [owner, manager, cashier]
    chips:
      - action: inventory.view_low
        label: Check low stock
    blocks:
      - id: shift-sales
        component: metric-card
        data_view: metrics.shift_sales
        params: { period: today }
        roles: [owner, manager]
      - id: register
        component: quick-pos
        data_view: catalog.sellable
        params: { limit: 100 }
        roles: [owner, manager, cashier]
```

Required canvas limits include maximum modes, blocks, chips, nesting depth, string length, payload size, and supported schema/app versions. Unknown fields are ignored only when the schema permits it; unknown components, actions, or data views fail closed.

### Safe data binding

- Canvas blocks reference a registered `data_view` and validated parameters. Raw SQL from OKF, AI output, channel messages, or TarApp is prohibited.
- Tarai owns each data-view query, allowed columns, role/capability policy, row limit, timeout, cache policy, and offline projection policy.
- TarApp normally binds blocks to its authorized Personal DB projections. Online refresh calls the typed Tarai data-view endpoint, never a general SQL endpoint.
- Role filtering in TarApp improves usability only. Tarai repeats authorization before returning data or executing an action.
- Owners do not receive an unconditional “see everything” bypass; sensitivity and regulated-data policies still apply.

### Native component registry

The registry is signed, versioned, pure React Native, and extensible through reviewed app releases. Core primitives include:

| Component | Purpose |
|---|---|
| `task-inbox` | Assigned tasks, approvals, and urgent signals |
| `metric-card` | A bounded metric and comparison |
| `quick-pos` | Fast catalog, table, cart, and checkout entry |
| `stock-sheet` | Count, receive, transfer, and correct stock |
| `pipeline-card` | Stage-based work with allowed transitions |
| `contact-card` | Authorized customer/supplier actions |
| `action-confirm` | Review and confirm a typed action |
| `data-grid` | Bounded, typed rows and columns |

Every component has a typed prop schema, maximum data size, empty/loading/error/offline states, accessibility contract, supported actions, and minimum app version. GenUI never executes remote JavaScript or HTML inside TarApp.

### Canvas customization

Only authorized roles can propose canvas changes. Voice or text is converted into a structured patch over registered components, data views, and actions. TarApp shows a live preview and permission impact; the owner/admin explicitly applies it. Tarai validates, versions, audits, and stores the new canvas, retains the prior version for rollback, and invalidates the relevant cache. AI may suggest adaptations but cannot silently publish them or expand access.

---

## 10. OKF, Memory & Site Builder

Stable workspace IDs are used in storage paths; mutable subdomains are routing aliases.

```text
workspaces/{workspace_id}/
├── index.md
├── business/
│   ├── profile.md
│   └── tax-policy.md
├── people/
│   └── roles.md
├── team/
│   ├── canvas.md
│   └── roster.md            # generated human-readable D1 projection
├── skills/
│   └── {module}.md
├── wiki/
│   ├── brand.md
│   ├── offerings.md
│   ├── logistics.md
│   ├── proof.md
│   ├── team.md
│   ├── faqs/{name}.md
│   ├── policies/{name}.md
│   └── templates/{name}.md
├── site/
│   ├── brand.md
│   ├── design.md
│   ├── pages.md
│   ├── facts.json
│   ├── drafts/{version}/
│   ├── versions/{version}/
│   └── live.json
└── archives/
    └── {dataset}/{date}/{chunk}
```

Every mutable OKF object has a content hash, version, actor, and update time. KV keys include the source versions; publication swaps an immutable pointer only after validation. Cache invalidation never relies on time alone.

### Memory and retrieval

Motion supplies episodic context; OKF supplies durable knowledge; a derived search index supplies keyword and semantic retrieval. Each indexed chunk carries tenant, source ID/version, content hash, sensitivity, and access tags. Tarai filters candidates by current authorization before loading source content, limits context to the task, records sources used by AI, and propagates updates, revocations, and deletions. Embeddings and summaries are rebuildable derivatives, never independent truth.

### Site Builder boundary

Site Builder is a bounded Tarai module backed by durable Workflows, not a standalone public service or second trusted mobile backend. TarApp calls authenticated Tarai site routes; the module receives a job contract only after Tarai authorizes it. Site Builder:

- reads a minimum, versioned fact package supplied by Tarai;
- reads approved design sources and writes draft/render artifacts to scoped R2/KV;
- never receives Turso platform credentials or a general tenant database binding;
- never writes OKF facts directly; it returns structured proposed diffs for Tarai approval;
- cannot publish or unpublish without a Tarai-authorized, idempotent action.

### Grounded FactSheet

Each build pins a `FactSheet` and its source versions:

```text
identity + audience + voice + offerings + proof + team + logistics + policies
```

Authority order is:

1. live operational Turso data for price, currency, availability, stock, booking, and measured metrics;
2. approved OKF facts for identity, voice, logistics, policies, FAQs, biographies, and sourced proof;
3. the owner's submitted description only as a draft bootstrap for missing facts.

Names, prices, currency, hours, contacts, URLs, statistics, and policy terms are copied exactly. Testimonials remain verbatim and require a source/consent marker. Missing facts are omitted or clearly requested from the owner; they are never invented. A correction creates a structured proposed diff, requires authorization/approval, bumps `facts_version`, and invalidates only dependent sections.

Each section receives only its required fact slice:

| Section | Allowed facts |
|---|---|
| Hero/about/story | identity, audience, voice, approved value propositions |
| Products/menu/pricing | exact offerings, price, currency, availability |
| Contact/map/booking | logistics and approved booking data |
| Testimonials/stats/press | sourced proof only |
| Team | approved public profiles only |
| FAQ | approved FAQ entries |
| Footer | logistics and policy links |

### Site generation pipeline

```text
UNDERSTAND -> GROUND -> STYLE -> COMPILE -> PLAN -> WRITE
           -> SYNTHESIZE -> VERIFY -> ASSEMBLE -> DRAFT -> PUBLISH
```

- **Understand:** normalize the owner's goal into typed business/design intent.
- **Ground:** build the versioned FactSheet from authorized sources.
- **Style:** select an approved design or accept an explicit style choice.
- **Compile:** deterministically convert design tokens, component vocabulary, imagery rules, layout rules, and do/don't constraints.
- **Plan:** create pages, sections, fact mappings, asset slots, navigation, and CTAs; allow owner review.
- **Write:** produce non-repetitive copy from fact slices in one coordinated pass.
- **Synthesize:** generate scoped section markup/CSS using only compiled tokens and vocabulary.
- **Verify:** run deterministic blocking gates and bounded repair.
- **Assemble:** add deterministic shell, assets, metadata, structured data, forms, and security policy.
- **Draft/Publish:** store immutable artifacts; publication atomically swaps the live pointer.

The model/provider, prompt versions, cost, and latency are operational configuration—not architectural guarantees.

### Design compiler and verification contract

`site/design.md` may define theme, mood, colors, typography, type scale, spacing, radii, layout metrics, components, surfaces, elevation, imagery, constraints, brand references, and agent guidance. The deterministic compiler consumes supported sections once and produces:

- resolved CSS tokens and aliases;
- a reusable component vocabulary;
- layout, surface, elevation, and imagery rules;
- typed constraints and a compact design digest;
- safe universal defaults for missing or malformed sections.

Generated sections cannot add scripts, external trackers, arbitrary forms, unknown CSS tokens, or unapproved network calls. Before a draft can publish, deterministic gates verify:

1. parse balance, sanitization, scoped CSS, and allowed markup;
2. known tokens/components and compiled design constraints;
3. exact FactSheet values and no unsupported claims/placeholders;
4. responsive behavior, accessibility, keyboard/focus behavior, contrast, and reduced motion;
5. explicit image dimensions/aspect ratios, useful alt text, lazy loading, and no avoidable layout shift;
6. valid internal links, navigation targets, forms, SEO metadata, canonical URL, social metadata, and applicable JSON-LD;
7. CSP/security headers, no secret leakage, no mixed content, and asset size budgets.
8. rendered mobile/tablet/desktop viewports, overflow and interaction smoke tests, and visual-regression fixtures for the deterministic shell and design corpus.

Blocking failures trigger bounded repair or a deterministic safe section fallback. They never publish silently.

### Assets, cache, jobs, and publishing

- Asset order: approved uploaded asset -> approved generated asset -> branded local SVG placeholder. Published pages do not depend on random external image URLs.
- Icons are an allowlisted local set using `currentColor`; unknown names use a safe fallback.
- Hero assets may load eagerly; non-critical assets are lazy. Every asset declares dimensions.
- A render key includes design version, facts version, page/section brief, asset versions, compiler version, and prompt version. Editing one section reuses unaffected verified renders.
- Builds run as durable, checkpointed workflows. Each stage and section is resumable and idempotent; retries never recreate completed artifacts.
- Draft and live versions are separate. Publish/unpublish/restyle/edit/asset/fact operations are idempotent, authorized, audited, and reversible.
- Visitor delivery resolves hostname -> D1 workspace/site route -> immutable live pointer -> cached artifact. A normal page request performs no LLM work.
- Public forms use schema validation, rate limits, bot protection, content/attachment limits, privacy consent, and idempotent Tarai ingestion.

### TarApp Site Studio

Site Studio is the control surface for description, style selection, plan review, fact correction, asset upload, section editing, restyle, preview, publish, unpublish, and job status. It uses typed Tarai routes only, displays cached versus newly rendered states, opens draft/live pages in the system browser, and contains no site-builder or provider credentials.

The minimum typed route families are: create/generate site, read job status, read/update plan, read/propose fact corrections, upload/replace asset slots, edit one section, restyle, preview, publish, unpublish, list versions, and rollback. Mutations require an idempotency key and expected version. Public delivery supports the verified workspace subdomain and optional ownership-verified custom domains; routing never trusts the raw host without a D1 mapping.

---

## 11. Team, Roles & Channels

### Membership authority and lifecycle

D1 membership is the sole access authority. OKF `team/roster.md` is a generated, human-readable projection for portability; editing it cannot grant access.

Control records cover invitations, memberships, role/capability policy, workspace-person mapping, connected provider accounts, and external sender identities. Invitations have normalized email, intended role, inviter, expiry, state, and idempotency key. Memberships carry a monotonically increasing version used by caches and projection reconciliation.

```text
INVITE
  owner/admin supplies verified email + role + optional person/handles
  -> D1 pending invitation

ACCEPT
  authenticated identity accepts
  -> active D1 membership + workspace person mapping
  -> canvas/projection eligibility

CHANGE
  authorized role/capability update in D1
  -> membership version bump -> cache invalidation -> projection reconciliation

OFFBOARD
  revoke D1 membership first
  -> stop token renewal and writes -> tombstones/local wipe prompt
  -> channel removal through outbox where provider supports it
```

Email may match an existing invitation, but TarApp never discovers or joins workspaces by scanning OKF email addresses. No join code, chat command, contact record, or channel handle can independently create membership. Channel invitations/removals are best-effort external effects; D1 revocation is immediate authority.

Roles are named capability bundles. Consequential capabilities remain explicit, and regulated/field-level restrictions can narrow any role, including owner. Workspace person records connect operational assignment edges to D1 users without making person records authentication authority.

### Authorization cache and pre-AI gate

Worker memory and KV may cache signed/versioned membership decisions to reduce D1 reads. Cache keys include workspace, provider account, external sender or user, membership version, and policy version. Cache is bounded, short-lived, invalidated on changes, and never more permissive than D1. On uncertainty or backend failure, consequential work fails closed.

Every channel message passes signature, replay, membership, capability, rate, and data-sensitivity checks before any LLM call. AI receives the minimum role/context badge and only authorized fact slices. Sensitive results are not posted into a group merely because the requester is authorized; delivery audience is independently checked and may require a private authenticated surface.

### Multi-tenant channel routing

Each connected account is registered in D1:

```text
provider + external_account_id -> workspace_id + status + secret_version
```

Webhook handling:

1. Verify the provider signature against the raw body before parsing.
2. Enforce timestamp/replay limits and provider event-ID idempotency.
3. Resolve the workspace from the verified account mapping—not message text or one global environment variable.
4. Resolve the sender to an active identity/membership under explicit onboarding rules.
5. Authorize the command, append inbound motion, and enqueue processing.
6. Deliver through the transactional outbox and record provider delivery IDs.

Commands such as role changes, stock corrections, refunds, publishing, or shift assignment use the same typed actions, policies, idempotency, and approvals as TarApp. Channels never create a privileged bypass.

---

## 12. Pipeline & Business Invariants

**Definition contract**

| Element | Contract |
|---|---|
| Pipeline definitions | Versioned matter records |
| Each transition declares | Source stages, target stage, required role, validations, automation hooks, approval policy, timeout, compensation behavior |
| Historical stability | An active flow pins its definition version, so later edits never change historical behavior |

**Routine spec**

| Element | Contract |
|---|---|
| A routine specifies | Tenant, action, schedule, timezone/DST behavior, typed configuration, policy version, capability, budget/spend cap, audience, start/end dates, pause/disable state |
| Automation rule | Automatic execution only for actions and limits explicitly approved by policy; otherwise the routine creates an approval |

| Flow | Sequence | Invariants |
|---|---|---|
| **Routines & chores** | Bounded cron due-row scan<br>→ atomically claim routine as a deterministic job<br>→ advance `next_run` exactly once<br>→ start Workflow | Cron only scans due rows + housekeeping<br>Leases, bounded attempts, backoff, checkpoints, dead-letter/reconciliation<br>Telemetry per attempt; Motion per outcome<br>Deploys/overlapping cron never create a second job per occurrence |
| **Notifications** | Evaluate recipient + policy checks<br>→ create outbox effect | Recipient, consent, template version, sensitivity, locale, quiet hours, frequency cap, escalation path all checked first |
| **Sales & CPQ** | Proposal<br>→ snapshot catalog + pricing<br>→ draft quote<br>→ approval when required<br>→ outbox delivery<br>→ open/sign/payment motions | Totals in integer minor units<br>Currency, tax, discount, template versions retained |
| **POS & stock** | Accepted payment/order<br>→ atomic stock condition check<br>→ order state<br>→ sale + stock motions<br>→ receipt outbox<br>→ low-stock evaluation | Refund/cancellation = payment reversal + stock restoration + audit motion in one idempotent operation |
| **Restaurant service** | Order ready<br>→ resolve active assignment<br>→ project minimal alert to responsible staff<br>→ acknowledge/serve<br>→ append motion | Reassignment: tombstone old recipient, project to new |
| **Support & SLA** | Inbound message<br>→ ticket matter<br>→ SLA deadline<br>→ authorized knowledge retrieval<br>→ draft response<br>→ approval policy<br>→ outbox send<br>→ delivery motion<br>→ resolution | SLA timers are durable workflows, never in-memory |
| **Reorder** | Stock crosses threshold<br>→ `low_stock_detected` motion<br>→ `supplied_by` resolution<br>→ PO draft on current supplier terms<br>→ approval<br>→ outbox delivery | Repeated stock updates dedupe against the active reorder window |

---

## 13. Retention, Archive & Recovery

Retention is policy-driven per workspace, record class, region, and legal hold; 90 days is a hot-storage target, never a universal deletion rule.

| Record class | Retention |
|---|---|
| Pending inbox items | Until completed, dismissed, cancelled, or policy-resolved |
| Completed/dismissed inbox | Tombstone at 30 days; hard-delete after a further 7-day recovery window |
| Workspace projections | Expire by policy, commonly 7–90 days; revocation creates immediate tombstones |
| Motion | Leaves hot storage after 90 days when allowed; financial, tax, security, healthcare, and legal records follow longer required retention |
| Matter | Tombstones on delete; hard-delete only after dependency checks, archive verification, recovery window, and legal-hold evaluation |
| Idempotency keys | Survive the longest retry/offline horizon; financial and external-effect keys stay with their audit record |

```text
ARCHIVAL PROCEDURE

1 FREEZE    consistent cursor / snapshot boundary
2 EXPORT    versioned, compressed chunks with row counts + checksums
3 VERIFY    R2 manifest written and verified
4 RESTORE   test restoration of representative chunks
5 DELETE    hard-delete verified hot rows in bounded batches
6 COMPACT   per Turso guidance; soft deletion alone reclaims no storage
7 RECORD    archive + deletion motions, no sensitive payloads exposed
```

**Recovery readiness** — every D1 + tenant database requires: documented point-in-time recovery · periodic restore tests · regional placement · schema-version compatibility · recovery-time/recovery-point objectives.

---

## 14. Security, Privacy & Operations

**Hard rules**

| Area | Rule |
|---|---|
| Secrets | No AI, Turso, database-write, payment, messaging, or R2 secret compiled into TarApp or stored in `EXPO_PUBLIC_*` |
| Sync tokens | Read-only, database-scoped, short-lived; further issuance revoked immediately; issued tokens expire quickly |
| Device storage | Sensitive local files encrypted at rest; keys in platform secure storage |
| External input | Always size-limited, schema-validated, rate-limited, and untrusted—including AI output and OKF content |
| Logging | Redact tokens, message bodies, health data, payment data, and compact JSON payloads by default |
| Regulated modules | Consent, purpose limitation, regional controls, access auditing, export/deletion workflows, and compliance review before activation |

**Sandbox boundary** — none in v1. If a later OCR/import/document/report/code task needs one: isolated, short-lived, no production credentials, egress allowlist, immutable input mounts, CPU/memory/time/output budgets, malware/content checks, tenant-scoped R2 artifacts, automatic destruction. Results promote only through a typed Tarai action + normal approval.

**Cost & model control** — per tenant/action budgets (token, model, Workflow, storage, notification, sandbox) with hard caps; model aliases, fallbacks, prompt versions, and flags live in versioned configuration, never prompts or mobile code; new models, channels, modules, components, or autonomous policies launch behind a feature flag + tenant allowlist with evaluation/rollback criteria.

**Observability**

| Domain | Signals |
|---|---|
| Requests | Latency, errors, correlation IDs, deduplication, conflicts |
| Workflows/outbox | Age, retries, dead letters, leases, outbox latency |
| Projections/sync | Lag, recipient counts, redaction failures, pull health, bytes |
| Storage | Database size, archives, restores, migrations |
| AI | Cost, model/prompt/tool versions, grounded-source coverage, policy decisions, approval outcomes |

```text
ALERT ON   stuck outbox rows · projection lag · repeated authorization failures
           webhook signature failures · payment reconciliation differences
           archive verification failures · capacity thresholds
```

**Release gates** — all must pass:

| Gate | Coverage |
|---|---|
| 1 Worker CI | Tests, typecheck, build, dry-run deploy, migration tests |
| 2 TarApp CI | Typecheck, lint, production bundle, offline queue, token refresh, logout wipe, upgrade migrations |
| 3 Tenant safety | Isolation, field redaction, assignment routing, replay, idempotency, concurrency, oversell, approval race, revocation |
| 4 Canvas/GenUI | Schema limits, data-view authorization, component compatibility, mode stability, accessibility |
| 5 Site Builder | Fact grounding, sanitizer, design constraints, responsive/accessibility, CSP, asset budget, cache invalidation, resumability, publish, rollback |
| 6 Routines | Overlap, lease expiry, retry/dead-letter, quiet hours, budget exhaustion, duplicate schedules |
| 7 Recovery drills | Backup restore, workflow retry, channel replay, provider outage, partial-deployment rollback |
| 8 Compatibility | Schema, type registry, API contract, OKF paths, canvas/data-view registry, app versions mutually compatible |

---

## 15. Delivery Order

| Phase | Delivers |
|---|---|
| 1 | Canonical schema and migrations |
| 2 | Tarai-only mutations and durable idempotency |
| 3 | Personal read-only sync bootstrap, token refresh, pull lifecycle, encryption |
| 4 | Authorized projection policies, tombstones, reconciliation, unified inbox |
| 5 | Reliable device outbox and offline POS conflict handling |
| 6 | D1 team lifecycle, role capabilities, authorization cache, channel identities |
| 7 | Approvals, transactional outbox, channels, and external delivery |
| 8 | Versioned OKF, data-view registry, native GenUI, canvas preview and rollback |
| 9 | Grounded Site Builder, design compiler, verification, draft/live publishing |
| 10 | Retention, archive verification, restore drills, observability, regulated modules |
| 11 | Optional conversation and constrained extensions, only after measured demand |

```text
PHASE GATE       end-to-end path + failure tests + observability + rollback must pass
                 before the next phase begins
EXPANSION RULE   additional industries only after Phases 1-5 are proven under
                 concurrency, offline recovery, revocation, and tenant-isolation tests
```

### v1 boundaries

| Boundary | v1 excludes |
|---|---|
| Client execution | Arbitrary SQL, arbitrary mobile widgets, generated executable code, remote HTML/JavaScript in TarApp |
| Write authority | Direct Workspace DB credential in TarApp; any authoritative business write outside Tarai |
| Autonomy | Payment capture, booking, refund, purchase, credential change, member removal, destructive deletion, external outreach, live publishing |
| Services | Standalone Site Agent service; duplicated business-fact authority |
| Runtime state | Application Durable Object or persistent conversation without measured product need |
| Sandbox | Any sandbox with production credentials or unrestricted network/filesystem access |
| Claims | Untested latency/throughput/availability/cost promises; commitments come only after load and recovery testing |

**Definition of done**

| # | Check | Passes when |
|---|---|---|
| 1 | Least privilege | Owner, member, customer, and system routine each complete only their permitted path |
| 2 | Safe resume | An interrupted job resumes safely |
| 3 | No double effects | Duplicate requests, webhooks, and schedules cannot duplicate an effect |
| 4 | Instant revocation | Revocation blocks new access immediately |
| 5 | Accountable | Every published fact, outbound action, model/tool decision, and data mutation is attributable and within budget |
| 6 | Reversible | Each of those is reversible or compensatable where the domain permits |
