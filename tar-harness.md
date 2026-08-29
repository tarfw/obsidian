# TAR Harness: A Dual-Engine Compound Architecture for Deterministic Workspaces & Autonomous Agents
### Canonical Specification & Architecture Whitepaper
**Status:** Canonical Standard · **Primitives:** Artifact · Pipeline · Step · Action · Skill

> **Core Doctrine:** Keep the architecture uncluttered, deterministic, and complete. A compound AI system must maintain strict separation between the deterministic host application and non-deterministic cognitive agents.

---

## 1. Core Law & Formulas: App vs. Agent

$$\mathbf{Compound\;System} = \mathbf{App\;(Deterministic\;Host)} \;+\; \mathbf{Agent\;(Cognitive\;Actor)}$$

$$\text{Agent} = \underbrace{\text{Model (LLM)}}_{\text{Reasoning Engine}} + \underbrace{\text{Context (Artifact + Memory + Skills)}}_{\text{Fuzzy State \& Knowledge}} + \underbrace{\text{Harness (Tools + Hooks + Persistence)}}_{\text{Execution, Safety \& Storage}}$$

$$\text{App} = \underbrace{\text{Code (Deterministic Logic)}}_{\text{Exact Program Engine}} + \underbrace{\text{Context (Artifact + Database + Rules)}}_{\text{Structured Data \& Invariants}} + \underbrace{\text{Harness (Tools + Gateway + Storage + UI Canvas)}}_{\text{Runtime, Security \& Presentation}}$$

### 1.1 The Division of Automation
* **The App** automates **DETERMINISTIC** jobs *(Fast, 0ms local read, $0 cost, 100% exact math, CRUD, tokens, timers, state machine transitions)*.
* **The Agent** automates **NON-DETERMINISTIC** jobs *(Intent parsing, triage, research, drafting, adaptive tool selection, and cognitive reasoning)*.

---

## 2. The Core Hierarchy & Split of Ownership

$$\mathbf{Artifact\;(Nouns)} \;\longrightarrow\; \mathbf{Pipeline\;(Verbs\;+\;Cards)} \;\longrightarrow\; \mathbf{Step\;(Stage)} \;\longrightarrow\; \mathbf{Action\;(1\;of\;10\;Primitives)}$$

```text
+-----------------------------------------------------------------------------+
| 1. ARTIFACT SCHEMA (Nouns -- What Exists & Remembers)                       |
|    * Domain entity / state object (Sale, Order, Lead, Ticket, Table).       |
|    * Stored in local Turso DB; 0ms local read projection; never edited directly.|
+-----------------------------------------------------------------------------+
| 2. PIPELINE MANIFEST (Verbs & UI States -- The Workflow Roadmap)            |
|    * State machine defining legal transitions, SLA rules & stage order.     |
|    * Declares per-step Card Render Mode, Giant Primary Button & Action Chips|
+-----------------------------------------------------------------------------+
| 3. STEP (The Active Milestone / Checkpoint)                                 |
|    * Operational stage (e.g., Cart -> Tender -> Receipt, or Ingest -> Close).|
|    * Governed by strict Entry Conditions (entry_if) & Role Permissions.     |
+-----------------------------------------------------------------------------+
| 4. ACTION PRIMITIVES (The 10 Typed Execution Protocols)                     |
|    * The atomic unit of work (Tool, Database, Channel, MCP, Skill, etc.).   |
+-----------------------------------------------------------------------------+
```

---

## 3. The 10 Typed Action Primitives

The Gateway defines **10 fixed primitive type protocols** (the execution standard), under which developers register **infinite dynamic implementations**:

| # | Action Primitive | Execution Nature | Description & Capability | Extensible Example |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **`Tool`** | Deterministic | Local/remote TypeScript function or API call | `tool:stripe_charge`, `tool:print_kot` |
| **2** | **`Database`** | Transactional CRUD | Reads/mutates local Turso DB & vector stores | `database:update_artifact`, `database:park_sale` |
| **3** | **`Channel`** | External I/O | Dispatches messages to external chat/SMS | `channel:whatsapp_biz`, `channel:telegram_bot` |
| **4** | **`MCP`** | Dynamic Context | External resource query via Model Context Protocol | `mcp:linkedin_enrich`, `mcp:postgres_query` |
| **5** | **`Skill`** | Procedural Knowledge | SOP playbooks, prompt instructions & domain rules | `skill:search_product.md`, `skill:pricing.md` |
| **6** | **`Subagent`** | Autonomous Worker | Spawns dedicated background worker agent | `subagent:researcher`, `subagent:coder` |
| **7** | **`Sandbox`** | Isolated Execution | Runs untrusted scripts/code in isolated VM | `sandbox:run_python`, `sandbox:exec_bash` |
| **8** | **`Routing`** | State Control | Evaluates branches, reassigns or escalates | `route_if(total > 10000, "manager_review")` |
| **9** | **`Schedule`** | Temporal Timer | Sets durable timers, cron jobs & delayed wakeups | `schedule_in(days=3, "send_nudge")` |
| **10** | **`Subflow`** | Durable Orchestration| Invokes a child or external durable workflow | `start_workflow("kyc_verification_flow")` |

---

## 4. Dual-Door Ingress & The 5-Step Universal Execution Map

Every workflow begins at the Ingress Gate before traversing the **5 Universal Execution Steps**:

```text
               +----------------------------------------------+
               |              THE INGRESS GATE                |
               |        "How Work Reaches the System"         |
               +----------------------┬-----------------------+
                                      |
               +----------------------┴-----------------------+
               |                                              |
               v                                              v
+------------------------------+              +------------------------------+
|  DOOR A: APP CANVAS (Manual) |              | DOOR B: CHANNELS (External)  |
| * Operator taps "+ New Sale" |              | * WhatsApp / Telegram / SMS  |
| * 0ms Local Turso Read       |              | * Email (AgentMail inbox)    |
| * 1-Tap Action Chip          |              | * Public Webhook / Form      |
+--------------┬---------------+              +--------------┬---------------+
               |                                             |
               |                                             v
               |                              +------------------------------+
               |                              | 0. ARTIFACT RESOLUTION GATE  |
               |                              | * Match Phone/Email to DB    |
               |                              | * OR Auto-Create new Artifact|
               |                              | * Auto-Bind Target Pipeline  |
               |                              +--------------┬---------------+
               |                                             |
               +----------------------┬----------------------+
                                      v
+-----------------------------------------------------------------------------+
| 1. ARTIFACT RESOLUTION & BINDING                                            |
|    * Artifact loaded into memory / created with initial state               |
+-----------------------------------------------------------------------------+
| 2. PIPELINE ROUTING                                                         |
|    * Deterministic / Agentic binding of the pipeline roadmap                |
+-----------------------------------------------------------------------------+
| 3. PIPELINE STEP & CARD PROJECTION                                          |
|    * Active step projects its Card Layout, Giant Button, and Action Chips   |
+-----------------------------------------------------------------------------+
| 4. ACTION EXECUTION (Deterministic vs. Agentic)                             |
|    * Deterministic Button Tap -> Fast local tool execution (0ms, $0 cost)   |
|    * Agentic Reasoning -> Proposes typed action (Halts at 1-Tap HITL Gate)  |
+-----------------------------------------------------------------------------+
| 5. ATOMIC COMMIT & OUTBOX DISPATCH                                          |
|    * Core Gateway commits state in Turso + appends audit log + enqueues side-effects|
+-----------------------------------------------------------------------------+
```

---

## 5. Declarative Manifests & Dynamic Binding

### 5.1 Agent & Ingress Manifest (`agents/sales_agent.yaml`)
```yaml
agent:
  id: sales_sdr
  name: "Sales SDR Agent"
  role: sdr
  model: "gemini-2.0-flash"

ingress:
  channels:
    - type: mobile_canvas
      enabled: true
    - type: whatsapp
      enabled: true
      account: "+1 (555) 019-2834"
    - type: email
      enabled: true
      inbox: "sales@myworkspace.tar.ai"

  artifact_resolution:
    target_artifact: "lead"
    match_by: ["phone", "email"]
    auto_create_if_missing: true
    initial_pipeline: "computer_sale_pipeline"

pipeline_scope:
  mode: "inherit_from_artifact"
  assigned_steps: "auto"

allowed_actions:
  tools: [real_call_search, calendar_book]
  channels: [whatsapp, email]
  database: [update_artifact]

hooks:
  human_in_the_loop:
    trigger_if: "action.amount > 10000 || confidence < 0.75"
    surface: "mobile_app_1tap_card"
    approver_role: "sales_manager"
```

### 5.2 Declarative Pipeline with Square/Shopify POS Morphing (`pipelines/pos_sale.yaml`)
```yaml
pipeline:
  id: pos_sale
  target_artifact: sale

  steps:
    # -- STEP 1: CART (Items & Total) ------------------------
    - id: cart
      entry_if: "len(artifact.items) > 0"
      card:
        render: "cart_list"
        primary_action:
          label: "CHARGE Rs.{artifact.total}"
          action: "tool:start_payment"
          allowed_roles: ["cashier", "manager", "admin"]
        secondary_chips:
          - { label: "Discount", action: "tool:apply_discount", allowed_roles: ["manager", "admin"] }
          - { label: "Park", action: "database:park_sale", allowed_roles: ["cashier", "manager", "admin"] }
          - { label: "Void", action: "database:void_sale", allowed_roles: ["admin"] }

    # -- STEP 2: TENDER (Takeover Grid) ----------------------
    - id: tender
      entry_if: "artifact.status == 'charging'"
      card:
        render: "tender_grid"
        primary_action:
          label: "CONFIRM CASH / CARD / UPI"
          action: "tool:settle_payment"
          allowed_roles: ["cashier", "manager", "admin"]

    # -- STEP 3: RECEIPT (Completed) --------------------------
    - id: receipt
      entry_if: "artifact.status == 'settled'"
      card:
        render: "receipt_view"
        primary_action:
          label: "NEW SALE"
          action: "database:create_sale"
          allowed_roles: ["cashier", "manager", "admin"]
```

---

## 6. UI Surface Architecture (Workspace Canvas & Action Surfaces)

The Workspace Canvas is a **0ms local-first stream of Actionable Artifact Cards**, structured into 4 ergonomic layers:

```text
+-------------------------------------------------------------+
| 9:41              [ Flagship Store * Cashier v ]    ( * )   |
+-------------------------------------------------------------+
| 1. ACTIVE ARTIFACT CARD (Square/Shopify Morphing View)      |
| +- SALE #1042 * Filter Coffee x 2 * Total: Rs.315 ---------+|
| | ☕ 2x Filter Coffee Rs.300 * Tax Rs.15                   ||
| |                                                           ||
| | +- SECONDARY ACTION CHIPS (Step & Role Scoped) ----------+||
| | | ( Park Sale )  ( Note )                                ||| <-- In-Card Chips
| | +--------------------------------------------------------+||
| | +--------------------------------------------------------+||
| | |                   CHARGE  Rs.315                       ||| <-- 52px Giant Button
| | +--------------------------------------------------------+||
| +----------------------------------------------------------+|
+-------------------------------------------------------------+
| 2. HORIZONTAL SUGGESTION CHIPS (Above Input Bar)            |
| +----------------------------------------------------------+|
| | ( + New Sale ) ( Quick POS ) ( Floor Plan ) ( AI Insights )||| <-- Workspace Shortcuts
| +----------------------------------------------------------+|
+-------------------------------------------------------------+
| 3. BOTTOM COMMAND / INPUT BAR                               |
| +----------------------------------------------------------+|
| | [ Cmd ] Scan barcode, type command, or ask AI...    [ -> ]|| <-- Universal Input
| +----------------------------------------------------------+|
+-------------------------------------------------------------+
```

### 6.1 Standard Card Render Templates
* **`cart_list`**: Interactive line items, quantity steppers, and tax calculation.
* **`tender_grid`**: Full-screen Cash / Card / UPI split tender pad.
* **`metrics_dashboard`**: Real-time sales rollups, net revenue, and top-selling product tiles.
* **`circle_grid`**: 3-column x N-row circular seat/table layout for restaurant floor plans.
* **`lead_summary`**: Contact information, qualification score, and next follow-up action.
* **`receipt_view`**: Settlement confirmation, digital receipt dispatch, and "New Sale" restart.

---

## 7. Architecture Invariants (Non-Negotiables)

1. **Common Gateway Authority:** Every state change--initiated by a human button tap or an autonomous AI agent--must pass through the Tarai Gateway. Zero direct database writes.
2. **Stateless Agent Execution:** Agents maintain no private, persistent in-memory state. All memory, context, and history are anchored to the **Artifact in Turso DB**.
3. **Strict Action Typing:** AI and UI cannot generate open-ended arbitrary mutations. Actions must compile into one of the **10 Typed Action Primitives**.
4. **Dumb Card Renderer:** The React Native card component contains zero hardcoded `if (step === '...')` conditionals; it strictly renders the active step's manifest block.
5. **Role-Aware Filtering:** Higher roles (Manager, Admin) and lower roles (Cashier) share the identical UI renderer; unauthorized chips are automatically masked or routed to 1-tap approval gates.
6. **Local-First & Offline Resilience:** Artifact projections sync locally via Turso CDC. The UI functions at 0ms offline and queues requests with idempotency keys.
7. **Human-in-the-Loop Supremacy:** High-risk actions automatically halt in `pending_approval` until unlocked by authorized 1-tap human confirmation on the mobile card.
