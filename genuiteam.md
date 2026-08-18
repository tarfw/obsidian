# GenUI Team & Canvas Architecture Specification (`genuiteam.md`)

This document is the standard architectural specification for **GenUI Canvas Layouts**, declarative **`canvas.md`** and **`team.md`** files in the OKF Vault, **Parametric SQL Query Binding across Registered Native Components via Turso API**, **Admin Voice/Text Canvas Customization (Groq Whisper)**, and **Universal Multi-Vertical Role-Scoped Collaboration**.

---

## 1. System Architecture & High-Level Flow

The GenUI Canvas is a pure, native declarative view layer. It maintains zero separate database tables of its own. It reads layout definitions stored in the **OKF Vault** (`team/canvas.md`) and binds them directly to live records in **Turso SQLite** (`matter` and `motion` tables) via the **Turso Database API**.

```
+------------------------------------------------------------------------------+
| OKF VAULT (team/)                                                            |
|   * team/canvas.md  --> Declarative UI layout (blocks, chips, role scopes)   |
|   * team/team.md    --> Declarative member roster (roles, permissions)       |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Layout parsed via parseCanvasMarkdown()
                                       v
+------------------------------------------------------------------------------+
| GENUI NATIVE REGISTRY (tarapp/src/gen-ui/registry)                           |
|   * ComponentRegistry.ts --> Map of type-safe native TSX components          |
|   * NativeRenderer.tsx   --> Parametric renderer executing SectionProps      |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Queries Turso DB via Turso API (tar.db)
                                       v
+------------------------------------------------------------------------------+
| GENUI SCREEN (tarapp/src/gen-ui/GenUIScreen.tsx)                             |
|   * Zone 1: Workspace Switcher & Context Header                              |
|   * Zone 2: Live Action Stream (Query-bound, role-filtered active blocks)    |
|   * Zone 3: Parametric Action Dock & Zero-Typing Intent Bar                  |
+------------------------------------------------------------------------------+
```

### Core Data Storage Model:
- **`OKF: team/canvas.md`**: Single source of truth for screen layouts, active blocks, custom query bindings, and role assignments.
- **`OKF: team/team.md`**: Single source of truth for workspace staff roster, permissions, and connected channel handles.
- **Backend 3-Tier Edge Cache**: Keeps active member handles and roles in RAM/KV for sub-2ms security verification on chat webhooks.
- **Turso SQLite Database (`matter` & `motion`)**: Centralized workspace database queried directly via Turso API (`tar.db`).

---

## 2. Universal Vertical Mapping (Works Across All Industries)

The GenUI architecture is completely vertical-agnostic. The exact same 8 native components, `canvas.md`, and `team.md` parametric schemas power any business model:

| Vertical | Roles in `team.md` | Primary Canvas Blocks in `canvas.md` | Core Data in SQLite |
| :--- | :--- | :--- | :--- |
| **Retail & Grocery** | `owner`, `manager`, `cashier`, `stock_clerk` | `metric-card` (Sales), `quick-pos` (Register), `stock-sheet` (Inventory) | Products, Barcodes, Daily Transactions |
| **Clinic & Healthcare** | `owner`, `doctor`, `receptionist`, `nurse` | `task-inbox` (Patient Queue), `contact-card` (Directory), `data-grid` (Appointments) | Patients, Slots, Vitals, Consultations |
| **Field Services & Trades** | `owner`, `dispatcher`, `technician` | `task-inbox` (Job Tickets), `stock-sheet` (Parts Log), `contact-card` (Clients) | Job Work Orders, Parts, Site Visits |
| **Logistics & Delivery** | `owner`, `fleet_manager`, `driver` | `task-inbox` (Delivery Queue), `action-confirm` (Trip Review), `contact-card` (Customer) | Waybills, Stops, Proof of Delivery |
| **Agency & Professional** | `owner`, `account_exec`, `consultant` | `pipeline-card` (Deals), `metric-card` (Revenue), `contact-card` (Clients) | Leads, Pipelines, Invoices, Retainers |
| **Hospitality & Dining** | `owner`, `manager`, `staff`, `fulfillment` | `quick-pos` (Floor Grid), `task-inbox` (Order Queue), `metric-card` (Sales) | Menu Items, Floor Tables, Live Orders |
| **Gym & Fitness** | `owner`, `trainer`, `front_desk` | `data-grid` (Member Check-ins), `task-inbox` (Classes), `metric-card` (Active Members)| Memberships, Class Slots, Attendance |

---

## 3. Frictionless Team Lifecycle (Contacts + Pipeline + `team.md`)

Team onboarding and offboarding are managed directly through **Contacts** and **Pipelines** in TarApp, synchronizing declaratively to **`team.md`**. Authentication is strictly handled via **Google Sign-In** matching—there are **no join codes** and **no administrative bot commands** in group chats.

```
+------------------------------------------------------------------------------+
| 1. OWNER / ADMIN PROVISIONS MEMBER (Contacts / Pipeline)                     |
|    * Action: Assigns contact to workspace team with designated role          |
|    * Parameters: User Google Email, Channel Handle, Role, Permissions        |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Writes to OKF Vault
                                       v
+------------------------------------------------------------------------------+
| 2. DECLARATIVE ROSTER (OKF: team/team.md)                                    |
|    * Standard schema recording members, Google emails, roles, and channels   |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Background Event Sync
                                       v
+------------------------------------------------------------------------------+
| 3. GOOGLE AUTH APP MOUNTING & AUTOMATED CHANNEL SYNC                         |
|    * User signs into TarApp with Google (email automatically matches team.md)|
|    * Workspace surfaces immediately with role-scoped Canvas                  |
|    * TarAgent syncs member handle to linked Telegram/Discord channels        |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Upon member deactivation / removal
                                       v
+------------------------------------------------------------------------------+
| 4. ATOMIC OFFBOARDING                                                        |
|    * Updating status to 'former' in team.md immediately revokes workspace    |
|    * Bot automatically ejects member from all linked communication groups    |
+------------------------------------------------------------------------------+
```

### Standard `team.md` Specification:
- **`members` list**: Each entry specifies `user_id`, `name`, `email` (Google Account), `handle` (Telegram/Discord), `role`, `section` (department/zone), `status` (`active` or `former`), and an array of `permissions`.
- **Google Sign-In Matching**: When a user signs in with Google, TarApp matches their authenticated email address against `team.md` across all authorized workspaces and attaches their role automatically with zero join codes.
- **Automated Communication Sync**: Adding a member to `team.md` prompts TarAgent to invite their handle to linked communication channels; archiving or removing them immediately revokes their workspace access and removes them from channels.

---

## 4. Parametric Query Binding for Registered Native Components

Instead of writing new code or creating separate `.tsx` files for every custom requirement, the **existing 8 core registered components** are dynamically customized by binding them to custom Turso SQLite queries and filters in `team/canvas.md`.

```
+------------------------------------------------------------------------------+
| 1. DECLARATION IN team/canvas.md                                             |
|    * Block uses an existing registered component: 'metric-card', 'data-grid' |
|    * Custom SQL query or filter defined in props: query: "SELECT ..."        |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Layout engine queries Turso API (tar.db)
                                       v
+------------------------------------------------------------------------------+
| 2. RUNTIME DATA ENRICHMENT                                                   |
|    * Turso Database API runs query -> Returns matching rows / values         |
|    * Injects data directly into component props (props.data / props.value)   |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Native crash-proof presentation
                                       v
+------------------------------------------------------------------------------+
| 3. REGISTERED NATIVE COMPONENT RENDERS DATA                                  |
|    * MetricCard -> Renders live calculated metric with micro-graph           |
|    * DataTable / DataGrid -> Renders custom columns and rows                 |
|    * TaskInbox -> Renders custom filtered action queue                       |
|    * StockSheet -> Renders custom filtered inventory stepper                 |
+------------------------------------------------------------------------------+
```

### Examples of Query-Bound Native Components in `team/canvas.md`:

#### A. `metric-card` Bound to Custom Calculation:
```yaml
- id: blk_revenue_pulse
  title: Total Shift Revenue
  type: metric-card
  roles: [owner, manager]
  props:
    title: "Today's Net Total"
    query: "SELECT COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count FROM motion WHERE at >= unixepoch('start of day')"
    valueFormat: "currency"
```

#### B. `data-grid` Bound to Custom Filtered Entity Query:
```yaml
- id: blk_urgent_tickets
  title: Priority Queue
  type: data-grid
  roles: [owner, operator]
  props:
    title: "Urgent Work Orders"
    query: "SELECT id, title, ref, price, status FROM matter WHERE type = 14 AND status = 'urgent' ORDER BY updated DESC LIMIT 10"
    columns: ["title", "ref", "price", "status"]
```

#### C. `stock-sheet` Bound to Low-Stock Inventory Query:
```yaml
- id: blk_critical_stock
  title: Low Stock Watch
  type: stock-sheet
  roles: [owner, manager, staff]
  props:
    query: "SELECT id, title, qty, min_qty, price FROM matter WHERE type = 1 AND qty <= min_qty ORDER BY qty ASC"
```

#### D. `task-inbox` Bound to Role-Specific Action Queue:
```yaml
- id: blk_assigned_tasks
  title: My Station Queue
  type: task-inbox
  roles: [staff, operator]
  props:
    query: "SELECT id, title, status, data FROM matter WHERE type = 10 AND status = 'pending' AND role = :current_role"
```

---

## 5. Admin Canvas Customization (Voice & Text with Groq Whisper)

Canvas layouts are modified **strictly by the Admin/Owner** through a simple, frictionless natural interaction workflow. There is no manual YAML editing and no bloated toggle modal.

```
+------------------------------------------------------------------------------+
| 1. ADMIN INITIATES CUSTOMIZATION                                             |
|    * Taps "[ 🎨 Customize Canvas ]" Suggestion Chip in Action Dock          |
|    * Canvas Edit Screen opens with voice & text input                        |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Natural Voice / Text Request
                                       v
+------------------------------------------------------------------------------+
| 2. FAST INTENT PROCESSING                                                    |
|    * Voice Input: Transcribed via Groq AI Whisper (whisper-large-v3-turbo)   |
|    * Text Input: e.g. "Show patient queue and appointment booking"           |
|    * Configures registered components with appropriate queries               |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Admin reviews live visual preview
                                       v
+------------------------------------------------------------------------------+
| 3. ONE-TAP CONFIRMATION & APPLIED TO team/canvas.md                          |
|    * Admin taps [ Apply Canvas ]                                             |
|    * Writes updated layout directly to OKF: team/canvas.md                   |
|    * Instantly refreshes active live stream for workspace team               |
+------------------------------------------------------------------------------+
```

### Customization Rules:
1. **Admin/Owner Exclusive**: Staff members only see their assigned operational tools; only verified Admins/Owners have the Suggestion Chip to open the Canvas Edit Screen.
2. **Groq AI Whisper Engine**: Uses `whisper-large-v3-turbo` for near-instantaneous (< 300ms) voice transcription.
3. **Live Visual Preview**: The screen renders the proposed cards before saving. Tapping `[ Apply Canvas ]` commits the change to `team/canvas.md`.

---

## 6. High-Scale 3-Tier Caching & Pre-LLM Edge Guardrails

When team members interact with the bot in Telegram, Discord, or WhatsApp, security and role checks are enforced **at the backend edge in < 2ms without wasting LLM tokens or incurring database costs**.

```
+------------------------------------------------------------------------------+
| TIER 1: Worker RAM (LRU Cache — Top 5,000 Active Members)                    |
|   * Speed: 0.01 ms (Instant in-memory lookup in edge isolate)                |
|   * Capacity: Capped at ~5 MB RAM per isolate with automatic LRU eviction    |
|   * Cost: $0.00 (Zero Database Reads, Zero LLM Tokens)                       |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Cache Miss (First message of the day)
                                       v
+------------------------------------------------------------------------------+
| TIER 2: Cloudflare Workers KV / Edge Cache API                               |
|   * Speed: 1 - 2 ms                                                          |
|   * Capacity: Unlimited (Handles millions of team members globally)          |
|   * Cost: Free tier covers 10M reads/day; fractions of a penny thereafter    |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Cache Miss / Cold Start
                                       v
+------------------------------------------------------------------------------+
| TIER 3: Backend Persistent SQLite (D1 / Turso)                               |
|   * Speed: 5 - 10 ms                                                         |
|   * Stores master durable state and OKF-synced records                       |
+------------------------------------------------------------------------------+
```

### Pre-LLM Message Processing Flow:

```
+------------------------------------------------------------------------------+
| 1. MEMBER SENDS CHAT MESSAGE IN GROUP                                        |
|    * Example: @handle submits an operational update or transaction           |
|    * Platform sends verified Sender ID and @handle to Webhook API            |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Hits Edge Worker
                                       v
+------------------------------------------------------------------------------+
| 2. PRE-LLM CODE GATE (0 LLM Tokens Spent — Tier 1 / Tier 2 Cache)            |
|    * In-memory check: Is sender active in team.md cache?                     |
|    * Unauthorized or former staff: Rejected immediately in < 2ms (0 Tokens)  |
|    * Authorized member: Role extracted ('staff', 'operator', 'manager', etc.)|
+--------------------------------------v---------------------------------------+
                                       |
                                       | If conversational intent requires AI
                                       v
+------------------------------------------------------------------------------+
| 3. LEAN CONTEXT INJECTION & TOOL VERIFICATION (~20 Tokens)                   |
|    * Only injects a 1-line badge: "Sender: @handle | Role: staff"            |
|    * Sensitive queries (e.g. financials) auto-reroute to user's private DM   |
|    * Backend tool enforces code-level permissions before writing to SQLite   |
+------------------------------------------------------------------------------+
```

---

## 7. Role-Based Canvas Resolution & Live Collaboration

All team members in a workspace query the shared **Turso SQLite database** via the Turso API (`tar.db`), maintaining real-time consistency while presenting role-specific interfaces.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PRIMARY TURSO CLOUD                             │
│                  (Central ACID Source of Truth & Database)                  │
└───────────────────▲─────────────────────────────────────▲───────────────────┘
                    │ Turso API (tar.db)                  │ Turso API (tar.db)
                    ▼                                     ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────────┐
│ FRONT-LINE OPERATIONAL DEVICE        │ │ OWNER / EXECUTIVE DEVICE           │
│ • Role: 'staff' (Action Grid / Task) │ │ • Role: 'owner' (KPI Pulse & BI)   │
│ • Live tickets & data from Turso API │ │ • Real-time live sales from Turso  │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

### Live Universal Collaborative Flow:

```
+------------------------------------------------------------------------------+
| 1. FRONT-LINE OPERATIONAL TERMINAL                                           |
|    * Active Role: 'staff' (Canvas displays Task Grid / Entry Terminal)       |
|    * Action: Submits new entity transaction or status update                 |
|    * Writes to SQLite: INSERT INTO matter (type=RegisteredCode, status='new')|
|                        INSERT INTO motion (motion=EventCode, amount=Value)   |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Turso Database API Update
                                       v
+------------------------------------------------------------------------------+
| 2. FULFILLMENT / QUEUE TERMINAL                                              |
|    * Active Role: 'operator' (Canvas displays Action Inbox / Task Queue)     |
|    * Immediate Action Inbox surfacing of the pending entity                  |
|    * Action: Transitions status from 'pending' -> 'completed'                |
+--------------------------------------v---------------------------------------+
                                       |
                                       | Turso Database API Update
                                       v
+------------------------------------------------------------------------------+
| 3. OWNER / EXECUTIVE DASHBOARD                                               |
|    * Active Role: 'owner' (Canvas displays MetricCard & Analytics Pulse)     |
|    * Live aggregate counters update instantly from new motion records        |
+------------------------------------------------------------------------------+
```

### Runtime Role Resolution Rules:
1. **Role Matching**: When TarApp loads `canvas.md`, it compares each block's `roles` list with `currentWorkspace.role`.
2. **Public Blocks**: Blocks without explicit `roles` constraints are rendered for all workspace members.
3. **Owner Superview**: Workspace owners automatically have full visibility across all blocks.
4. **Staff Scoping**: Staff members only see blocks matching their assigned operational role.

---

## 8. Implementation Plan (Ready for Production Execution)

Upon your confirmation, implementation will proceed through four structured phases:

1. **Phase 1: Declarative `team.md` & 3-Tier Pre-LLM Edge Security**
   - Implement `team.md` parser/serializer in `taragent` and `tarapp`.
   - Wire Contacts & Pipeline stage transitions to update `team.md` and sync Tier 1 RAM LRU / Tier 2 KV / Tier 3 SQLite.
   - Implement the **Pre-LLM Code Gate** in `taragent` to reject unauthorized messages in < 2ms without token consumption.
   - Connect automated Telegram/Discord group join/kick events to `team.md` lifecycle.
   - Enable private DM delivery for sensitive queries.

2. **Phase 2: Google Sign-In Identity Matching (Zero Join Codes)**
   - Connect Google Auth email matching to automatically surface accessible workspaces and assign user roles on login.

3. **Phase 3: Generic Query Binding for the 8 Registered Components via Turso API**
   - Extend `enrichBlock` in `workspaces.tsx` and `layout-engine.ts` to execute `props.query` via `tar.db.query()` and pass formatted results into `props.data` / `props.value` for `metric-card`, `data-grid`, `stock-sheet`, `task-inbox`, etc.
   - Apply role filtering in `workspaces.tsx` so staff members only see their role-specific blocks.

4. **Phase 4: Admin Voice & Text Canvas Customizer Screen**
   - Implement the Admin Suggestion Chip `[ 🎨 Customize Canvas ]` and Canvas Edit Screen.
   - Integrate Groq AI Whisper (`whisper-large-v3-turbo`) for sub-second voice transcription.
   - Wire 1-tap `[ Apply Canvas ]` to serialize and commit layout changes to `team/canvas.md`.
