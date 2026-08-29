# TAR: AI Agent & Flow Architecture Guide
### Artifact · Pipeline · Step · Action · Common Harness · HITL Gates · Turso Local-First

---

## 1. Core Law & Formulas: App vs. Agent

$$\text{Agent} = \underbrace{\text{Model (LLM)}}_{\text{Reasoning Engine}} + \underbrace{\text{Context (Artifact + Memory + Skills)}}_{\text{Fuzzy State \& Knowledge}} + \underbrace{\text{Harness (Tools + Hooks + Persistence)}}_{\text{Execution, Safety \& Storage}}$$

$$\text{App} = \underbrace{\text{Code (Deterministic Logic)}}_{\text{Exact Program Engine}} + \underbrace{\text{Context (Artifact + Database + Rules)}}_{\text{Structured Data \& Invariants}} + \underbrace{\text{Harness (Tools + Gateway + Storage + UI Canvas)}}_{\text{Runtime, Security \& Presentation}}$$

---

### 📊 Direct Architectural Comparison

| Formula Pillar | ⚡ THE APP (Deterministic System) | 🤖 THE AGENT (Non-Deterministic Actor) |
| :--- | :--- | :--- |
| **1. The Engine** *(Model vs. Code)* | **Deterministic Program Code** (`if/else`, SQL, APIs, math). Exact, 0ms, 100% predictable. | **Model (LLM)** (Gemini, Claude, GPT). Semantic reasoning, intent classification, and fuzzy adaptation. |
| **2. Context: Artifact** *(What exists)* | Reads/writes exact database columns & JSON records in Turso/SQLite. | Understands the semantic meaning of the Artifact's attributes, history, and status. |
| **3. Context: Memory** *(Experience)* | Exact relational indices, motion timestamps, and raw event logs. | Synthesizes conversational context and past customer interactions across channels. |
| **4. Context: Skills / Rules** *(Guidelines)* | Hardcoded business rules, invariant schema validators, and constraints. | Reads unstructured Markdown SOPs and prompt guidelines to decide best approach. |
| **5. Harness: Tools** *(Execution)* | **Hosts and provides** the executable APIs (Stripe, WhatsApp, DB writers). | **Selects and invokes** which tool to call based on current goal. |
| **6. Harness: Hooks** *(Safety & HITL)* | **Enforces** the security gates, rate limits, and 1-tap manager approval screens. | **Pauses and waits** at approval gates when attempting high-risk actions. |
| **7. Harness: Persistence** *(Storage)* | **Owns** SQLite/Turso CDC sync, S3 vaults, and transactional commit logs. | **Stateless**: Reads from and writes back to the App's persistence layer. |

---

## 2. The Core Hierarchy

$$\text{Artifact} \longrightarrow \text{Pipeline} \longrightarrow \text{Step} \longrightarrow \text{Action}$$

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ARTIFACT (What Exists & Remembers)                                       │
│    • Domain entity / state object (Order, Contact, Ticket, Invoice).        │
│    • Holds live JSON attributes, attached vault blobs & short-term context. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. PIPELINE (The Workflow Roadmap)                                          │
│    • State machine defining valid transitions, SLA rules & stage order.     │
│    • Can be dynamic (bound to artifact) or scoped per agent role.           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. STEP (The Active Milestone / Checkpoint)                                 │
│    • The current position where work executes (e.g., Ingest, Enrich, Close).│
│    • Governed by strict Step Entry & Exit validation criteria.              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. ACTION (The Execution Primitive - 1 of 10 Types)                         │
│    • The atomic unit of work that mutates state, calls APIs, or sends msgs. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mobile Screen Anatomy (Where Human, App & Agent Meet)

The mobile screen is a deterministic projection of the Artifact, its current Pipeline Step, and the active Agent proposal:

```text
+-------------------------------------------------------------+
| 9:41                                                 5G [■] |
| [≡] Deals / Acme Corp                                [🔍]  [ + ] |
+-------------------------------------------------------------+
| 1. ARTIFACT STATE (0ms Local Turso Read)                    |
│    🏢 Acme Corp · $45,000 · Score: 95/100 (Tier-1)          │
│    👤 Sarah Chen (VP Engineering) · @sarah@acme.com         │
+-------------------------------------------------------------+
| 2. PIPELINE ROADMAP & ACTIVE STEP                           |
│    [✔ Ingest] ──► [✔ Enrich] ──► [*● Proposal Review*] ──► [Won]
+-------------------------------------------------------------+
| 3. NON-DETERMINISTIC AGENT WORK (Agentic Activity Feed)     |
│    🤖 AI SDR (2m ago):                                      |
│    "Enriched profile via LinkedIn MCP. Computed $45k quote  |
│     with 10% annual discount based on 50 seat request."     │
+-------------------------------------------------------------+
| 4. HITL RISK GATE (Human 1-Tap Slide-Up Approval Card)      |
│    ┌───────────────────────────────────────────────────┐    │
│    │ ⏸️ PENDING APPROVAL: Send $45,000 quote to Sarah?  │    │
│    │ [ ✕ Reject ]         [ 1-Tap: Approve & Send ✔ ]  │    │
│    └───────────────────────────────────────────────────┘    │
+-------------------------------------------------------------+
| 5. DETERMINISTIC APP ACTIONS (1-Tap Fast-Path Chips)        |
│    ( 📞 Call )  ( 💬 WhatsApp )  ( 📝 Add Note )  ( ⚡ Re-Run AI )│
+-------------------------------------------------------------+
| [ ⌘ Command Menu ]                       [ + New Action ]   |
+-------------------------------------------------------------+
```

---

## 4. The 10 Typed Action Primitives

| # | Action Primitive | Role & Capability | Example |
| :---: | :--- | :--- | :--- |
| **1** | **`Tool`** | Deterministic function or 3rd-party API | `calendar.book_slot()`, `tax.calculate()` |
| **2** | **`MCP`** | External data & resources via Model Context Protocol | `mcp.linkedin_enrichment`, `mcp.fetch_crm` |
| **3** | **`Skill`** | Procedural SOPs, rules & prompt playbooks | `skill:lead_qualification`, `skill:seo_audit` |
| **4** | **`Subagent`** | Spawns dedicated autonomous helper worker | `subagent:researcher`, `subagent:coder` |
| **5** | **`Sandbox`** | Isolated runtime VM/container execution | `sandbox.run_python()`, `sandbox.exec_bash()`|
| **6** | **`Routing`** | Conditional branch, reassignment or escalation | `route_if(deal > $30k, step="executive")` |
| **7** | **`Database`** | Reads/mutates local-first Turso DB & vector stores | `turso.update_artifact()`, `vector_search()` |
| **8** | **`Subflow`** | Invokes a nested or external durable workflow | `start_workflow("kyc_verification_flow")` |
| **9** | **`Schedule`** | Sets timers, cron jobs & delayed wakeups | `schedule_in(days=3, action="send_nudge")` |
| **10** | **`Channel`** | Dispatches message to chat/external surfaces | `channel.send(target="whatsapp", text=...)` |

---

## 5. The 5-Part Agent Specification

```yaml
# agent_spec.yaml
agent:
  id: sales_sdr
  name: "Sales SDR Agent"
  role: sdr
  model: "gemini-2.0-flash"
  temperature: 0.1

pipeline_scope:
  mode: "inherit_from_artifact" # or explicit list: [inbound_sales, outbound]
  assigned_steps: [ingest, enrich, outreach]

context:
  skills:
    - "skills/sales/lead_qualification.md"
    - "skills/pricing/2026_matrix.md"
  memory:
    conversation_window: 10
    audit_log_lookback: true

allowed_actions:
  tools: [calendar_lookup, calculate_quote]
  mcp: [linkedin_search, clearbit_lookup]
  subagents: [company_researcher]
  channels: [whatsapp, email]
  database: [update_artifact]
  schedule: [set_timer]

hooks:
  step_exit_validation: true
  human_in_the_loop:
    trigger_if: "action.amount > 10000"
    approver_role: "sales_manager"
    surface: "app_screen_card"
```

---

## 6. Master Flow (End-to-End Execution)

```text
  INPUT SURFACES (Deterministic App Screen vs Agentic Chat)
  ┌─ MOBILE SCREEN (Deterministic App) ┐     ┌─ CHANNEL INGRESS (WhatsApp/Slack) ┐
  │ 9:41                 [Workspace v] │     │ "Sarah needs 50 seats quote."     │
  │ • Artifact Card (0ms Local Read)   │     │ (Free-form text / voice / webhook)│
  │ • Current Step & 1-Tap Action Chip │     └─────────────────┬─────────────────┘
  └──────────────────┬─────────────────┘                       │
                     │ Direct Typed Action                     ▼ 🤖 AGENTIC LOOP
                     │ (e.g., Approve / Move)        [ LLM + Memory + Skills + MCP ]
                     │                                         │
                     │                                         ▼ Proposes Typed Action
                     └──────────────────────┬──────────────────┘
                                            │ Typed Action (1 of 10 Action Primitives)
                                            ▼
  +─────────────────────────────────────────────────────────────────────────────+
  | COMMON CORE HARNESS (Tarai Gateway / Cloudflare Worker)                     |
  | 1. Auth & Role Check ──► 2. Idempotency Lock ──► 3. Step Pre-Validation     |
  +──────────────────────────────────────┬──────────────────────────────────────+
                                         │
                                         ▼
  +─────────────────────────────────────────────────────────────────────────────+
  | WORKSPACE TURSO DB (Atomic Single Transaction)                              |
  |   [ Artifact Mutation ]  +  [ Motion/Audit Append ]  +  [ Outbox Enqueue ]  |
  |   (Updates Step / State)    (Immutable Event Log)       (Guaranteed Effects)|
  +──────────────────────────────────────┬──────────────────────────────────────+
                                         │
                                         ▼ Leased Outbox Workers
  +─────────────────────────────────────────────────────────────────────────────+
  | OUTBOX FOUR PILLARS (Guaranteed Asynchronous Side-Effects)                  |
  | • Channel Replies   • Inbox / Push    • External Tools/APIs  • Async Jobs   |
  |   (WhatsApp/Slack)    (1-Tap Approvals) (Stripe / DocuSign)    (Timers/Cron)|
  +──────────────────────────────────────┬──────────────────────────────────────+
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
  ┌─ MOBILE APP (0ms Local Replica) ──┐       ┌─ CHANNEL OUTPUT ───────────────┐
  │ ◐ ART-204 (Active Artifact)       │       │ [WhatsApp / Slack Notification]│
  │ • Step: "Proposal Sent" (Updated) │       │ "Quote dispatched to Sarah ✔"  │
  │ • Instant Offline Sync (Turso)    │       │ (Delivered via Outbox)         │
  └───────────────────────────────────┘       └────────────────────────────────┘
```

---

## 7. Architecture Invariants (Non-Negotiables)

1. **Common Core Harness:** Both human UI taps and AI agent proposals funnel through the exact same Gateway, permissions, and atomic database commits.
2. **Stateless Agents:** Agents store no permanent private state; state lives exclusively in the **Artifact (Turso DB)**.
3. **Strict Typed Actions:** Agents cannot execute raw database writes or unvalidated HTTP calls; they must emit one of the **10 Typed Action Primitives**.
4. **Offline First:** Artifacts and Canvas manifests replicate locally to mobile devices for 0ms reads and offline queueing.
