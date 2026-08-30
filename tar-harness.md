# TAR Harness

**Canonical product and architecture standard**

## Abstract

TAR is a local-first work platform for a general workforce. Owners and admins define Data, Bots, Workflows, Steps and access. Workers receive role-filtered Data, Inbox work and Action Cards. Deterministic code owns official state changes; bounded AI may assist or control an agentic Step without gaining authority to commit changes. The Gateway enforces this boundary across online, offline and external-system work.

## 1. Product model

```text
Workspace
|-- Data
|   `-- Products, customers, orders, sales and any custom business records
|-- Bots
|   `-- Bot
|       `-- Workflows
|           `-- Workflow
|               `-- ordered Steps
`-- Gateway
    `-- validates and records every official change
```

| Word | Meaning |
| :--- | :--- |
| Artifact | Internal term for official shared business data. Normal UI says **Data**. |
| Bot | A named capability, such as POS Bot or Support Bot. |
| Workflow | A sequence of work owned by a Bot. |
| Step | One thing that happens next in a Workflow. |
| Card | Optional UI shown when a person must see, choose, enter or confirm something. |
| App function | Registered deterministic calculation, validation, save, send or integration. |
| AI help | Language understanding, research, drafting or recommendation. |
| Gateway | The only authority that can commit official Data or external-system changes. |

A Step may use any combination of a Card, App function and AI help. Most Steps do not need a Card. **Step is the only builder term for work.**

| Step | Card | App function | AI help |
| :--- | :---: | :---: | :---: |
| Select products | Yes | Optional | No |
| Calculate total | No | Yes | No |
| Take payment | Yes | Yes | No |
| Update inventory | No | Yes | No |
| Recommend products | Sometimes | Optional | Yes |

AI may propose a result but cannot directly write records, process payments, change permissions or call consequential external systems.

## 2. Step execution standard

A Step is the only unit of work exposed by the builder. Its implementation may combine one or more registered action primitives.

```text
Step
|-- mode            deterministic | agentic
|-- actions[]       one or more registered primitives
|-- card?           optional human interface
|-- entry           conditions required to start
|-- access          permitted roles and record scope
|-- next            success transition
`-- on_error        deterministic failure transition
```

### 2.1 Execution modes

| Mode | Control rule |
| :--- | :--- |
| `deterministic` | Code follows declared actions and transitions. It may call bounded AI help, but the LLM does not choose tools or the next Step. |
| `agentic` | The LLM may reason and choose among explicitly allowed actions and transitions. Gateway-controlled code still validates and performs official changes. |

AI help is a capability; agentic is a control mode. Therefore, a deterministic Step may use AI to extract or draft a declared output, while an agentic Step may decide how to pursue a bounded objective.

An agentic Step declares:

```text
objective
context
allowed_actions
allowed_transitions
output_schema
budget
timeout
fallback
```

The LLM may read permitted context, call allowlisted read/draft capabilities, select an allowed transition and propose a change. It cannot expand its allowlist, change its budget, bypass approval or directly commit Data, payments, permissions or external effects. Invalid, uncertain or exhausted runs follow the declared fallback.

```text
Agentic Step reasons
  -> selects allowed action or transition
  -> Gateway validates authority, input and current state
  -> deterministic code executes or rejects
  -> result and rationale are recorded
```

### 2.2 Action primitives

| Primitive | Purpose |
| :--- | :--- |
| `database` | Read Data or request an official Data change through the Gateway. |
| `tool` | Run a registered deterministic function or integration. |
| `skill` | Run a bounded AI capability with declared inputs and outputs. |
| `sandbox` | Execute isolated code with explicit limits and no implicit authority. |
| `subagent` | Delegate bounded AI work and return a result to the current Step. |
| `channel` | Send or receive through an approved external communication channel. |
| `schedule` | Start or resume work at a time, delay or recurrence. |
| `inbox` | Assign human work or request input, confirmation or approval. |

Primitives are implementation details beneath a Step. People build and run Steps; they do not manually orchestrate primitives. Every primitive declares validation, permission, idempotency, timeout, retry and audit behavior. AI primitives can propose outputs but cannot grant themselves authority to commit changes.

### 2.3 Card standard

Cards are reusable interfaces, not separate business records or execution primitives.

| Card | Purpose |
| :--- | :--- |
| Inbox Card | Present the current assigned human task, input or approval. |
| Action Card | Start or advance a permitted Workflow. |
| Data Card | Present a permitted record or record list. |
| Report Card | Present a deterministic role-relevant summary. |

A Step Card belongs to the active Step. A Home Card is a role-filtered projection or Workflow launcher. A Data Card presents Data; it does not become the Data itself. Card definitions live inside approved Data or Bot definitions and are rendered from authorized Personal DB content. No separate Cards table is required.

## 3. AI-first builder

```text
Describe the work
  -> TAR asks short guided questions
  -> TAR checks existing Workspace Data
  -> TAR reuses suitable Data or proposes new Data and fields
  -> TAR drafts the Bot, Workflows and ordered Steps
  -> person reviews Data, fields and actions
  -> Gateway creates the approved definitions
```

The review stays simple:

```text
POS Bot
  Data: Products, Customers, Sales, Inventory

  Checkout
    1. Select products
    2. Calculate total
    3. Take payment
    4. Update inventory
    5. Send receipt

  [Create Bot]  [Change something]  [More options]
```

TAR never silently creates structures, copies sensitive information or grants access. **More options** exposes field types, relationships, validation, statuses and permissions.

## 4. Storage architecture

```text
Control DB    -> identity, Workspaces, memberships and database routing
Workspace DB  -> official shared truth
Personal DB   -> local-first personal truth, working set, Inbox and commands
R2 / OKF      -> files, long content and knowledge
Gateway       -> permission, validation, commitment, sync and audit
```

| Store | Quantity | Local-first? | Purpose |
| :--- | :---: | :---: | :--- |
| Control DB | One | No | Platform identity and routing. |
| Workspace DB | One per Workspace | No | Canonical collaborative Data and automation state. |
| Personal DB | One per person | Yes | Personal Data and authorized offline work. |
| R2 bucket | One | No | Files, OKF knowledge, imports and exports. |

The mobile app syncs only the Personal DB and never receives unrestricted Workspace DB credentials.

### 4.1 Control DB

| Table | Purpose |
| :--- | :--- |
| `users` | Google identities; Google user ID is permanent, not email. |
| `spaces` | Workspace metadata and DB routing. |
| `members` | Workspace role, membership state and access version. |
| `devices` | Device registration, last access and revocation. |

### 4.2 Workspace DB

Each Workspace DB has six tables. It does not repeat a Workspace ID in every row.

| Table | Purpose |
| :--- | :--- |
| `defs` | Versioned Data and Bot definitions. |
| `records` | Official Products, Orders, Contacts, approvals and file metadata. |
| `links` | Record relationships. |
| `runs` | Active and completed Workflow executions. |
| `access` | Role rules for each Data type. |
| `events` | Immutable, idempotent audit history. |

```text
defs(id, kind, name, body, version, status, created, updated)
  kind: data | bot

records(id, type, title, data, status, version, owner, created, updated)

links(id, from_id, to_id, kind, data, created)

runs(id, bot, workflow, step, state, data, version, created, updated)

access(role, type, scope, read, add, edit, remove, offline)
  scope: all | team | assigned | own | none

events(id, kind, actor, ref, data, idem, created)
```

`defs.body` contains fields, validation and display rules when `kind = data`; it contains Bot settings and complete ordered Workflows and Steps when `kind = bot`. Approvals and file metadata are typed `records`; binary files are not.

### 4.3 Personal local-first DB

| Table | Purpose |
| :--- | :--- |
| `defs` | Personal and authorized Workspace definitions. |
| `records` | Personal records and authorized Workspace working set. |
| `links` | Relationships required by the working set. |
| `inbox` | Tasks, approvals, requested input, mentions and notifications. |
| `commands` | Append-only offline actions awaiting validation. |
| `sync` | Cursor, access version, expiry and checkpoint state. |

The working set contains assigned, owned, recent, Inbox-linked, offline-pinned or explicitly downloaded records. These records are complete enough to use offline; their Workspace versions remain official.

Turso partial sync reduces bootstrap and bandwidth for this authorized Personal DB. Partial sync is not an authorization boundary.

## 5. R2 and OKF

```text
users/{user}/files/{file}
spaces/{space}/files/{record}/{file}
spaces/{space}/okf/{type}/{record}.md
spaces/{space}/exports/{export}
```

Use one OKF Markdown file per record by default for its long description, detailed specifications, FAQ, provenance and Agent knowledge. Images, video, audio and PDFs remain separate R2 objects. Split the OKF file only for size, permission or independent-update needs.

| Information | Store |
| :--- | :--- |
| Searchable, filterable, transactional or offline fields | `records` |
| Long text and Agent knowledge | One OKF file |
| Images, video, audio and PDFs | R2 objects |
| R2/OKF references | `records.data` |
| Change history | `events` |

External content is stored only when the person owns it or has permission.

## 6. Access and local-first operation

| Role | Default access |
| :--- | :--- |
| Owner | Everything. |
| Admin | Workspace management except ownership and billing. |
| Member | Allowed Data and team, assigned or owned records. |
| Guest | Explicitly selected read-only Data. |

Roles set the maximum permission. A Bot or Step may narrow it but cannot broaden it. Offline access is explicit per Data type; sensitive Data can set `offline = false`.

```text
Person acts locally
  -> UI updates immediately
  -> command enters Personal DB
  -> Turso pushes when connected
  -> Gateway checks membership, role, Bot, Step, schema and base version
  -> Workspace DB accepts or rejects
  -> Gateway appends an event
  -> confirmed result returns to Personal DB
```

```text
commands(id, space, action, target, data, base_version, status, created)
  status: pending | accepted | rejected | conflict
```

The device can read `defs`, `records`, `links` and `inbox`, and append `commands`. It cannot directly edit Workspace records, definitions or permissions.

The UI shows **Pending sync** until confirmation. Ordinary independent field changes may merge deterministically. Payments, approvals, inventory deductions and permissions never use automatic last-write-wins; conflicts pause for review or a registered resolution function.

Local databases are encrypted with a device-protected key. Access expires, membership changes increment the access version, revoked records are removed on reconnection, and logout removes the local key and cache.

## 7. Gateway

For every official change, the Gateway checks:

1. Workspace membership and role.
2. Bot and Step authority.
3. Data schema and current state.
4. Record version and idempotency key.
5. Approval and duplicate-protection requirements.

It then rejects the request or commits it and appends an audit event. A rejection remains visible with a corrective message.

## 8. Inbox Step functions

Inbox connects a person to a waiting Workflow:

```text
inbox.create
inbox.assign
inbox.request_input
inbox.request_approval
inbox.complete
```

```text
Workflow waits for a person
  -> Gateway creates Personal Inbox item
  -> person responds online or offline
  -> response becomes a command
  -> Gateway validates it
  -> Workflow continues and Inbox item completes
```

```text
inbox(id, space, run, step, kind, title, body,
      status, priority, due, version, created)
```

The Inbox item references the official Workspace run; it does not replace it.

## 9. Agent access

Agents query official Workspace Data through Gateway tools. They receive only relevant definitions, permission-filtered query results, current Workflow context and registered Step actions. They never receive an entire database or use Personal projections for official decisions.

The same safety boundary applies to AI help and agentic Steps. AI help returns a declared result to fixed control flow. An agentic Step may select allowlisted actions or transitions, but every official effect remains a deterministic Gateway execution.

```text
Agent proposes -> Gateway validates -> person approves when required -> code commits
```

Use indexed SQL and full-text search before embeddings. Use embeddings only for semantic retrieval over long OKF knowledge.

## 10. App UI

```text
Workspace
|-- Home
|   |-- Now
|   |-- Actions
|   `-- My Data
|-- Inbox
|-- Data
`-- More
    `-- Manage              owner/admin only
        |-- Bots
        |-- Data definitions
        |-- Workflows
        |-- Steps
        `-- Access
```

### 10.1 Ownership and visibility

| Owner/admin manages | Worker uses |
| :--- | :--- |
| Bots and Bot settings | Role-based Home |
| Data definitions and fields | Permitted Data records |
| Workflows and ordered Steps | Action Cards |
| Action primitives and integration bindings | Current Inbox tasks |
| Roles, access and offline policy | Assigned work and reports |

Workers do not normally see builder definitions. `More -> Manage` is visible only when the person's role grants management access.

### 10.2 Role-based Home

```text
Now       -> current Inbox work
Actions   -> permitted Workflow launchers
My Data   -> relevant Data and deterministic reports
```

Home is derived locally from authorized Bot definitions, Workflow state, Inbox and Personal DB Data. It is not manually assembled per person and requires no separate Home or Cards table.

To stay uncluttered, Home shows one primary Now Card, up to three Action Cards and up to two Data or Report Cards. Additional content uses **View all**. Priority is deterministic: urgent Inbox work, due work, active runs, then permitted launchers and summaries.

Data supports browse, search, add, view, permitted editing, archive, offline availability and pending-sync state. Destructive actions use an overflow menu and confirmation. Normal UI always says **Data**, not Artifact.

## 11. Canonical rules

1. Workspace DB holds official shared truth; Personal DB enables authorized local-first work.
2. Bots own Workflows; Workflows contain ordered Steps.
3. A Step may combine optional Card, App function and AI help.
4. Gateway is the only path to official Data or external-system changes.
5. Inbox is a deterministic human-action primitive that can pause and resume runs.
6. R2/OKF holds heavy content, not operational truth; default to one OKF file per record.
7. Synchronize only the active authorized working set and project changes only to affected people.
8. Use one Personal sync connection per person and one database per real Workspace, never per Bot.
9. Use SQL search before embeddings.
10. AI plans and assists; deterministic code authorizes and commits.
11. Owners and admins manage definitions; workers receive role-filtered runtime Cards, Data and Inbox work.
12. Action primitives remain beneath Steps and never appear as a second builder model.
13. Every Step declares `deterministic` or `agentic` control mode.
14. Agentic Steps may choose only allowlisted actions and transitions; the Gateway retains execution authority.

> **Bots provide capability. Workflows organise Steps. Workspace Data holds truth. Personal Data enables offline work. Inbox connects people to work. Gateway protects every official change.**
