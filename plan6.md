# plan6.md — Tar System: Full Finalised Architecture

---

## 1. The App at a Glance

```
tarapp (React Native mobile)
  │
  ├── Inbox Screen       → unified task/action feed (all workspaces)
  ├── Canvas Screen      → GenUI workspace (role-specific modules)
  ├── Workspace Switcher → switch between personal + joined workspaces
  └── Site Preview       → view/publish public storefront (optional)

taragent (Cloudflare Worker)
  │
  ├── Reads OKF (S3/KV)  → knows HOW things work
  ├── Reads/Writes Turso → knows WHAT is happening
  ├── Routes inbox items → pushes to correct user's personal DB
  └── Renders site       → serves *.tarai.space to public visitors

OKF (S3 + KV cache)
  └── Brain of every workspace: config, roles, canvas, skills, wiki

Turso (SQLite per workspace / per user)
  └── Memory of every workspace: live data, events, relationships
```

---

## 2. Database Structure

### 2A. Personal DB — One Per User, Auto-Created on Signup

Every user has exactly **one personal DB**. This is also their personal workspace.
No separate "personal workspace DB" — they are the same thing.

```
PERSONAL DB (user_{id})
│
├── matter    → personal items (type stored as INTEGER, see §13)
│               type=13  expense   personal spending, cash log
│               type=1   person    family, friends, personal contacts
│               type=12  goal      savings goal, fitness goal
│               type=11  note      personal notes
│               type=7   asset     personal belongings tracked
│
├── motion    → personal events (type stored as INTEGER, see §13)
│               type=201  expense_log            personal spending recorded
│               type=202  reminder_triggered     reminder fired
│               type=203  goal_update            progress on a personal goal
│               type=204  personal_note          personal note added
│
│               NOTE: clock_in / clock_out is a WORKSPACE motion.
│               Personal DB only receives an inbox notification
│               that it happened — it does not store the event.
│
├── graph     → personal relationships (rel stored as INTEGER, see §13)
│               src=contact  rel=13 tgt=goal       (linked_to)
│               src=user     rel=12 tgt=workspace  (member_of — membership registry)
│
└── inbox     → ALL tasks unified (personal + all joined workspaces)
                id, user_id, workspace_id, workspace_name,
                type (INTEGER, see §13), title, ref,
                priority, due, status, created_at

                workspace_id = NULL    → personal task
                workspace_id = ws_001  → pushed from restaurant workspace
                workspace_id = ws_002  → pushed from second job workspace
```

---

### 2B. Workspace DB — One Per Workspace Created

Created when any user creates a new workspace (restaurant, shop, clinic, etc.).

```
WORKSPACE DB (ws_{subdomain})
│
├── matter    → workspace items (one entity, many types)
│             NOTE: type is stored as INTEGER (see §13 type map)
│
│   PEOPLE & COMPANIES (Contacts)
│   type=1  person    role=staff/manager/admin/customer/contact/patient/tenant
│   type=2  company   subtype=client/vendor/partner
│
│   ITEMS
│   type=3  product   physical goods, with stock quantity
│   type=4  service   appointments, consultations, offerings
│   type=5  listing   catalog items, real estate, subscriptions
│   type=6  document  specific contracts, signed POs, receipts
│   type=7  asset     equipment, vehicles, tools, furniture
│   type=8  location  warehouse, store room, branch, zone
│
│   CONTACTS & PIPELINES
│   type=9  pipeline  a named workflow with stages (workspace-defined)
│   type=10 card      a contact's entry in a pipeline
│
├── motion    → workspace events (type stored as INTEGER, see §13)
│               type=101  sale               order completed
│               type=102  refund             money returned
│               type=103  quote              price quote sent
│               type=104  invoice            invoice raised
│               type=105  purchase_order     PO sent to vendor
│               type=106  vendor_bill        bill received from vendor
│               type=107  payment            payment in or out
│               type=108  stock_receive      goods received into location
│               type=109  stock_transfer     stock moved between locations
│               type=110  stock_adjust       manual stock correction
│               type=111  stock_writeoff     damaged/lost stock removed
│               type=112  booking            appointment scheduled
│               type=113  booking_cancel     booking cancelled
│               type=114  shipment           delivery dispatched
│               type=115  delivery           delivery completed
│               type=116  activity           call, meeting, note on contact/card
│               type=117  assignment         task assigned to staff
│               type=118  clock_in           staff arrived
│               type=119  clock_out          staff left
│               type=120  card_stage         pipeline card moved to next stage
│               type=121  card_won           pipeline card closed as won
│               type=122  card_lost          pipeline card closed as lost
│               type=123  status_change      any entity state updated
│
├── graph     → STRUCTURAL relationships only (rel stored as INTEGER, see §14)
│
│               RULE: graph rows are for persistent entity relationships.
│               Transactional relationships (order→items, sale→products)
│               live inside the motion/matter `data` JSON field — NOT here.
│               This keeps graph row count flat and queries fast.
│
│               src=booking     rel=1  tgt=person      (placed_by)
│               src=shipment    rel=3  tgt=order       (fulfills)
│               src=person      rel=4  tgt=company     (works_at)
│               src=person      rel=5  tgt=location    (assigned_to section/tables)
│               src=product     rel=6  tgt=location    (stored_at warehouse)
│               src=vendor_bill rel=7  tgt=company     (from vendor)
│               src=card        rel=8  tgt=person      (for_contact)
│               src=card        rel=9  tgt=pipeline    (in_pipeline)
│               src=card        rel=10 tgt=person      (owned_by staff)
│               src=activity    rel=11 tgt=card/person (about)
│
│               REMOVED: src=order rel=2 tgt=product (contains item)
│               → Store as JSON in motion type=101 data field:
│                 { "items": [{"sku":"CC500","qty":2,"price":3.50}] }
│
└── NO inbox table
    Workspace does not own inbox.
    taragent worker routes motion events and pushes to each
    relevant user's personal DB inbox table instead.
```

---

## 3. Inbox Flow — How Workspace Events Reach the User

```
WORKSPACE EVENT OCCURS
(e.g. kitchen marks order ready → motion type=125 order_ready created)
        │
        ▼
taragent Worker detects motion
        │
        ▼
Worker resolves: who needs to act on this?
(reads graph: order → assigned_to → Ahmed)
        │
        ▼
Worker pushes to Ahmed's PERSONAL DB inbox:
  {
    workspace_id:   "ws_restaurant_001",
    workspace_name: "Al Noor Restaurant",
    type:           "task",
    title:          "T12 food is ready — serve now",
    ref:            "motion_id_xyz",
    priority:       "high",
    status:         "pending"
  }
        │
        ▼
Ahmed's Inbox Screen shows it
alongside all his other tasks from all workspaces
```

**Inbox types that flow through:**

| Type | Example |
|---|---|
| `task` | "T12 food ready — serve now" |
| `alert` | "T9 customer waiting 20 min" |
| `approval` | "Manager needs to approve refund" |
| `reminder` | "Clock out in 15 minutes" |
| `notification` | "New reservation at 7 PM" |
| `suggestion` | AI: "Add Tips Tracker module?" |

---

## 4. OKF Structure — Brain of Every Workspace

OKF lives in S3 (with KV cache for fast reads). It is the knowledge and
configuration layer. It tells the system HOW things work.

```
workspaces/{subdomain}/
│
├── index.md                 → WorkspaceRoot
│                              name, type, modules enabled, plan tier
│
├── business/
│   └── profile.md           → BusinessProfile
│                              who you are, industry, contact, hours
│
├── people/
│   └── roles.md             → RoleBlueprints
│                              waiter  → [table_grid, order_tracker...]
│                              chef    → [order_queue, prep_timer...]
│                              billing → [payment_terminal, daily_sales...]
│
├── team/
│   ├── members.md           → TeamConfiguration
│   │                          who is on the team, their role,
│   │                          section, assigned tables/zones, shift
│   │
│   └── canvas.md            → CanvasLayout
│                              module layout per role
│                              time-of-day rules (lunch rush, shift end)
│                              AI-updated as usage patterns are learned
│
├── wiki/                    → Workspace Wiki (AI-readable knowledge)
│   ├── policies/
│   │   └── {name}.md        → business rules, return policy, SOPs
│   ├── faqs/
│   │   └── common.md        → Q&A for AI agent to answer customers
│   └── templates/
│       └── {name}.md        → document templates (invoice, PO, quote)
│                              (actual instances go in workspace matter)
│
├── products/
│   ├── index.md             → CatalogIndex
│   │                        category list, total item count, last updated
│   │                        quick SKU → category lookup table
│   └── {category}.md        → CategoryCatalog (one file per category)
│                            full item definitions for that category
│                            e.g. beverages.md, food.md, electronics.md
│                            each file cached in KV independently
│                            no item limit — add as many categories as needed
│
├── skills/
│   └── {module}.md          → Module Skill Definition
│                              data source (Turso query)
│                              actions it supports (which motions)
│                              display type (grid/list/card/map)
│                              scope filter (assigned_tables etc)
│
└── site/                    → Only if site is activated (tarsite)
    ├── brand.md             → BrandTokens (colors, fonts, logo)
    ├── design.md            → DesignSystem
    ├── pages.md             → SitePages (routing, nav)
    ├── layouts/*.json       → PageLayout per page (JSON)
    └── posts/*.md           → Blog or content posts
```

**OKF vs Matter — the clean split:**

| OKF (knows HOW) | Matter (knows WHAT) |
|---|---|
| Invoice template | Specific invoice for customer X |
| Product catalog definition | Live product with current stock |
| Warehouse zone config | Actual stock at that location |
| Role blueprint for waiter | Ahmed's actual role assignment |
| Skill: how to process a sale | motion: actual sale that happened |
| Company policy document | Signed contract with vendor |

---

## 5. Item Hybrid — OKF Definition + Turso Live State

Item DEFINITIONS live in OKF. Item LIVE STATE lives in Turso.
No product limit — catalog scales by splitting into category files.

### OKF — What the Item IS (definition, rarely changes)

```
products/
├── index.md              → SKU → file lookup  (fast resolve)
│                          Maps every SKU to its chunk file.
│                          Updated whenever a chunk file is added.
├── beverages.md          → beverage definitions (up to 100 items)
├── beverages_002.md      → overflow chunk when first file hits 100
├── food.md               → food definitions
└── {category}.md         → one file per category, one chunk per 100 items
```

> **Chunking rule**: When a category file reaches **100 items**, split into
> `{category}_002.md`, `{category}_003.md`, etc. `index.md` stores the
> `SKU → filename` mapping so lookups stay O(1) regardless of catalog size.
> A single 500-item category that hasn’t been chunked would load the entire
> file just to resolve one SKU — chunking prevents that read amplification.

Each category file:
```md
# beverages.md

- sku: CC500
  name: Coca Cola 500ml
  price: 3.50           ← REMOVED from OKF
  unit: bottle
  barcode: "12345678"
  supplier: vendor_001

- sku: WTR1L
  name: Water 1L
  unit: bottle
  barcode: "87654321"
```

**Price is NOT in OKF.** It lives in Turso so AI dynamic pricing
and manual updates happen instantly via a single DB write.

### Turso — What is Happening to the Item (live, changes constantly)

```sql
-- matter table: lean rows with price included
id    type  title            ref     price  qty   min_qty  status
──────────────────────────────────────────────────────────────────
001   3     Coca Cola 500ml  CC500   3.50   48    10       1
002   3     Water 1L         WTR1L   1.00   120   20       1
003   3     Pepsi 500ml      PP500   4.00   0     10       0   ← out of stock
```

`title`   → kept in Turso for search and list views
`ref`     → SKU, links to full definition in OKF
`price`   → live here — AI dynamic pricing updates this instantly
`qty`     → decreases on every sale
`min_qty` → low stock threshold — taragent alerts inbox when qty < min_qty
`status`  → 1=active, 0=inactive

### How It Works at Any Scale

```
USER SEARCHES "cola"
  ↓
  Turso: SELECT id, title, ref, price, qty, status
         FROM matter WHERE type=3 AND title LIKE '%cola%'
  ↓
  Returns: [{ title:"Coca Cola", price:3.50, qty:48 }]
  ↓
  App shows list with live price + stock — no OKF needed

USER TAPS item to view full details
  ↓
  KV: products/index.md → CC500 → beverages.md
  KV: products/beverages.md → CC500 entry (name, unit, barcode, supplier)
  ↓
  App merges: Turso (price, qty) + OKF (description, specs) → full screen

SALE RECORDED (Coca Cola x2)
  ↓
  Turso: UPDATE matter SET qty = qty - 2 WHERE ref = 'CC500'
  motion: type=101 (sale) with price snapshot in data field
  OKF products/beverages.md: untouched

AI DYNAMIC PRICING (price change)
  ↓
  Turso: UPDATE matter SET price = 4.00 WHERE ref = 'CC500'
  motion: type=123 (status_change) → price change logged with timestamp
  AI can read full price history from motion table
```

### Per Item Type Split

| Type | OKF Stores | Turso Stores |
|---|---|---|
| 3 Product | name, SKU, unit, barcode, category, supplier | **price**, qty, min_qty, status, location |
| 4 Service | name, duration, steps, capacity, description | **price**, status, assigned_staff |
| 5 Listing | name, features, description, photos | **price**, status |
| 6 Document | templates only | file_url, status |
| 7 Asset | name, serial, specs, purchase info | condition, assigned_to, location |
| 8 Location | name, zones, capacity, address | status, utilisation |

---

### Additional Considerations (all resolved)

**1. Price History (AI dynamic pricing audit)**
Every price change creates a `motion type=123` record with old price,
new price, timestamp, and reason. AI reads this history to learn
demand patterns and optimise future pricing.

**2. Low Stock Alerts (`min_qty`)**
Each product has a `min_qty` field in Turso.
taragent checks after every sale: if `qty < min_qty` →
push inbox alert to manager: "Coca Cola running low — 8 left"

**3. Product Variants (size, colour, etc.)**
Each variant = its own matter row with its own price/qty.
Linked to parent product via graph:
```
src=variant_001  rel=14(variant_of)  tgt=product_001
src=variant_002  rel=14(variant_of)  tgt=product_001
```
Add `rel=14 variant_of` to graph type map in §13.

**4. Tax Rate**
Tax is a workspace-level setting — not per product.
Lives in OKF `business/profile.md` as `tax_rate: 15%`.
App applies tax at checkout. Turso prices are always pre-tax.

**5. Idempotency Keys on Motion Writes**
If taragent times out mid-write and the client retries, the same sale motion
could be inserted twice — creating a phantom duplicate sale with no visible error.

Every `motion` row has an `idem` column with a UNIQUE constraint:
```sql
ALTER TABLE motion ADD COLUMN idem TEXT UNIQUE;
```
The client generates `idem` before the request: `{workspace}:{user}:{timestamp_ms}:{action}`.
All motion inserts use `INSERT OR IGNORE INTO motion ... (idem) VALUES (?)`.
A duplicate write silently no-ops — the first write wins, the retry is discarded.

This is a single schema line and one change to the insert pattern.
Without it, any network blip in a busy restaurant causes phantom duplicate sales.

---

## 6. GenUI Canvas — How It Works

Canvas is a **pure view layer**. It has no DB table of its own.
It reads from OKF (what to show) + Turso (live data to show).

```
CANVAS SCREEN = OKF canvas.md (layout) + Turso matter/motion (data)
```

### Canvas Switches Per Active Workspace

```
PERSONAL WORKSPACE ACTIVE
  Reads: personal OKF  → personal canvas.md
         personal DB   → matter (expenses, goals, contacts)
  Shows: personal modules (expense tracker, goals, commute)

RESTAURANT WORKSPACE ACTIVE
  Reads: workspace OKF → team/canvas.md (waiter layout for Ahmed)
         workspace DB  → matter (tables, menu)
                         motion (live orders)
  Shows: work modules (Table Grid, Order Tracker, Menu Ref)
```

### Module Types on Canvas

| Type | Who Assigns It | Example |
|---|---|---|
| Work-nature | Auto from role blueprint | Table Grid POS (waiter) |
| Personal | User picks from library | Expense Tracker, Goals |
| Report Card | Auto-generated from data | Hours worked, Tips earned |
| AI-suggested | Worker detects pattern | "Add Stock Quick-Check?" |

### Module Skill Definition (skills/*.md)

```md
# table_grid_pos

type: work_module
display: grid
data_source: matter WHERE type='table'
scope: assigned_tables        (from team/members.md)
realtime: true

actions:
  - create_order  → motion type=sale
  - view_order    → matter type=14 order
  - close_table   → motion type=payment

ui:
  grid_columns: 5
  item_shape:   circle
  states:
    free:     green
    occupied: orange
    alert:    red
    paid:     blue
```

### Time-of-Day Canvas Rules (team/canvas.md)

```md
time_rules:
  - from: "10:00" to: "12:00"
    primary: [table_grid_pos, shift_checklist]

  - from: "12:00" to: "15:00"
    primary: [table_grid_pos]
    expand: table_grid_pos        (full width during lunch rush)

  - from: "17:30" to: "18:00"
    primary: [handover_panel, report_card]
    auto_generate: handover_note  (AI writes from day's motions)
```

### Canvas vs Inbox — Final Separation

| | Inbox Screen | Canvas Screen |
|---|---|---|
| Data source | Personal DB `inbox` table | OKF `canvas.md` + Turso `matter/motion` |
| Changes per workspace? | No — always unified | Yes — reshapes per active workspace |
| Has its own DB table? | Yes | No — pure view |
| What it shows | Tasks to act on | Tools to do the work |

---

## 7. Workspace Membership and DB Count

```
EVERY USER
  Personal DB (= personal workspace)   always 1, auto on signup

WORKSPACES THEY CREATE
  Each new workspace created           +1 workspace DB

WORKSPACES THEY JOIN
  No new DB created                    worker pushes to their inbox
```

**Example — Restaurant Worker Ahmed:**

| DB | Owned By | Ahmed's Access |
|---|---|---|
| Ahmed's Personal DB | Ahmed | Full owner |
| Al Noor Restaurant DB | Restaurant Owner | Member (waiter role) |

Total DBs Ahmed touches: **2** — owns **1**

**Example — Restaurant Owner:**

| DB | Owned By | Owner's Access |
|---|---|---|
| Owner's Personal DB | Owner | Full owner |
| Branch 1 Workspace DB | Owner | Admin |
| Branch 2 Workspace DB | Owner | Admin |

Total: **3 DBs** — owns all 3

---

## 8. Site (tarsite) — Optional Per Workspace

```
WITHOUT SITE: workspace = internal operations only
              staff, orders, inventory, contacts — no public access

WITH SITE:    workspace gets a public subdomain
              storea.tarai.space
              priced separately as a feature add-on
```

Site lives in workspace OKF under `site/` folder.
taragent renders it for public visitors.

Public form submissions (orders, bookings, contact) write directly
into workspace `matter` and `motion`, which then push inbox items
to the relevant staff member's personal DB.

---

## 9. taragent Worker — What It Does

```
taragent (Cloudflare Worker)
│
├── RESOLVES intent from tarapp & channels
│     "Record a sale" → reads OKF skills/ → executes correct flow
│
├── READS / WRITES Turso
│     Creates matter, motion, graph records
│
├── ROUTES inbox items
│     Detects motion events → resolves who to notify →
│     pushes to correct user's personal DB inbox
│
├── CHANNELS Gateway (Telegram, Discord, Slack, etc.)
│     Webhooks receive messages & slash commands →
│     parses intent via OKF skills → updates Turso →
│     syncs team members & pushes alerts back to channels
│
├── RENDERS public site
│     *.tarai.space requests → reads OKF site/ + workspace matter →
│     returns responsive HTML to public visitor
│
├── UPDATES canvas
│     Tracks module usage → rewrites canvas.md when AI detects pattern
│     Runs time-of-day cron → updates KV with current canvas layout
│
└── HANDLES site forms
      POST /api/order, /api/booking, /api/contact →
      writes to workspace matter + motion →
      pushes inbox to relevant staff
```

---

## 10. Contacts & Pipelines

Replaces CRM. Two separate, clean concepts.

**Contacts** — everyone the workspace interacts with (not just customers).
**Pipelines** — workspace-defined workflows a contact moves through.

```
CONTACTS (matter)
  type=1  person    role=customer/contact/patient/tenant/applicant/...
  type=2  company   subtype=client/vendor/partner

PIPELINES (matter)
  type=9  pipeline  name, stages[], workspace_id
  e.g. { name: "Sales", stages: ["Lead","Proposal","Won"] }
  e.g. { name: "Support", stages: ["Open","In Progress","Closed"] }

CARDS (matter)
  type=10 card      a contact's journey in one pipeline
                    links to: contact + pipeline + stage + owner (staff)

EVENTS (motion)
  type=120  card_stage   card moved to next stage
  type=121  card_won     completed successfully
  type=122  card_lost    dropped / not progressed
  type=116  activity     call, meeting, note logged against a card or contact
```

**Key rule:** A contact can be in multiple pipelines at the same time.

| Business | Pipeline Examples |
|---|---|
| Restaurant | Reservation Pipeline, Complaint Pipeline |
| Clinic | Patient Onboarding, Insurance Approval |
| Real Estate | Buyer Pipeline, Landlord Pipeline |
| B2B Sales | Sales Pipeline, Renewal Pipeline |
| HR | Recruitment Pipeline, Onboarding Pipeline |

**OKF files for Contacts & Pipelines:**
```
skills/contacts.md     → how contacts are added, searched, tagged
skills/pipelines.md    → how cards are created and moved
wiki/pipelines/
  └── {name}.md        → stage rules per pipeline
                          (e.g. flag card if no activity for 7 days)
```

---

## 11. Full Flow — End to End example

```
NEW WORKSPACE CREATED (e.g. Al Noor Restaurant)
  ↓
taragent creates workspace DB ws_alnoor (matter / motion / graph)
OKF scaffold written to S3:
  workspaces/alnoor/
  ├── index.md
  ├── business/profile.md
  ├── people/roles.md
  └── team/members.md
Workspace subdomain: alnoor.tarai.space (site optional, off by default)

ADMIN ADDS AHMED AS WAITER (VIA TELEGRAM: /role @ahmed waiter section:B tables:12-15)
  ↓
OKF team/members.md updated: Ahmed, role=waiter, section=B, tables=12-15
Workspace matter: person record created (type=1, role=staff, handle=@ahmed)
Workspace graph:  Ahmed assigned_to tables [12, 13, 14, 15] (rel=5)
Bot DMs Ahmed a 1-click magic join link
  ↓
Ahmed taps link → tarapp binds his user_{id} to the workspace
Ahmed's personal DB graph: src=user_ahmed rel=12(member_of) tgt=ws_alnoor

AHMED OPENS APP
  ↓
Workspace switcher: Personal | Al Noor Restaurant
Ahmed taps Al Noor → Canvas switches to restaurant workspace
tarapp reads: OKF team/canvas.md       → waiter layout
tarapp reads: OKF skills/*.md            → how to render each module
tarapp queries: workspace matter         → tables 12-15 with live status
Canvas renders: Table Grid + Order Tracker + Menu Ref + Reservation View

CUSTOMER SITS AT TABLE 12, AHMED TAKES ORDER
  ↓
Ahmed taps T12 on Table Grid → order flow opens
Workspace matter:
  - T12 (type=8 location) status: 1 (free) → 2 (occupied)
  - New customer record created (type=1 person, role=customer)
  - Order record created (type=14 order, table=T12_id, status=1, items=[...])
    NOTE: type=14 order must be added to OKF types.md
Workspace graph:
  - src=order_id rel=1(placed_by) tgt=customer_id
  - src=order_id rel=15(served_by) tgt=ahmed_person_id
    NOTE: rel=15 served_by must be added to OKF types.md
Workspace motion:
  - type=124 order_placed (order_id, table=12, items=[...], by=ahmed)
    NOTE: type=124 must be added to OKF types.md
  - type=123 status_change (entity=order_id, old=none, new=preparing)
  - product stock reserved (optional: qty hold in matter.data)

KITCHEN MARKS ORDER READY
  ↓
Workspace motion:
  - type=125 order_ready (order_id, table=12)
    NOTE: type=125 must be added to OKF types.md
  - type=123 status_change (entity=order_id, old=preparing, new=ready)
taragent detects order_ready:
  - reads order.data.table_id  → T12
  - graph lookup: T12 assigned_to Ahmed (rel=5)
  - pushes to Ahmed's personal DB inbox:
    {
      workspace_id: "ws_alnoor",
      workspace_name: "Al Noor Restaurant",
      type: 1,             // task
      title: "T12 food is ready — serve now",
      ref: "order_id",
      priority: 3,         // high
      status: 1            // pending
    }
Ahmed's Inbox Screen shows it immediately (optional Telegram alert)

AHMED SERVES, CUSTOMER PAYS
  ↓
Workspace motion:
  - type=126 order_served (order_id, table=12, by=ahmed)
    NOTE: type=126 must be added to OKF types.md
  - type=107 payment (order_id, method=cash, amount, ref=txn_001)
  - type=101 sale (order completed; amount, tax, items snapshot)
Workspace matter:
  - Order record (type=14) status: 1 → 3 (paid)
  - T12 (type=8 location) status: 2 → 4 (paid / blue on Table Grid)
  - Product quantities deducted from stock
Canvas Report Card module updates from today's motions:
  - tables_served +1
  - revenue +X

SHIFT ENDS
  ↓
Ahmed: "clock out" in app (or Telegram)
Workspace motion: type=119 clock_out (by=ahmed, shift_hours=Y)
taragent pushes to Ahmed's personal DB inbox:
  {
    workspace_id: "ws_alnoor",
    type: 5,             // notification
    title: "Shift complete — handover ready",
    status: 1
  }
Canvas auto-reshapes → handover_panel surfaces (time rule 17:30)
AI reads today's motions for Ahmed → auto-writes handover note in OKF wiki/handover/YYYY-MM-DD.md
```

> All type codes introduced in this example (`type=14 order`, `motion 124–126`, `rel=15 served_by`)
> are registered in §14 Rule 1 and in `OKF: types.md`.

---

## 12. Role Canvas Module Reference

| Role             | Core Canvas Modules                                              |
| ---------------- | ---------------------------------------------------------------- |
| Waiter / Server  | Table Grid POS, Order Tracker, Menu Quick Ref, Reservation View  |
| Chef / Cook      | Order Queue, Prep Timer, Allergen Alert, Stock Check             |
| Billing / POS    | Payment Terminal, Pending Bills, Daily Sales, Cash Log           |
| Manager          | Staff Overview, All Orders, Sales Dashboard, Report Cards        |
| Delivery Driver  | Live Map, Delivery Queue, COD Tracker, Vehicle Log               |
| Retail Staff     | Barcode/POS, Stock Lookup, Return Requests, Promotions           |
| Office / Admin   | Meeting Schedule, Document Access, Team Status                   |
| Healthcare       | Patient Queue, Vitals Logger, Appointment Schedule, Supply Check |
| Teacher          | Class Schedule, Attendance Taker, Assignment Tracker             |
| Field Technician | Job Ticket Queue, Site Map, Parts Log, Photo Report              |

---

## 13. OKF vs Turso — The Governing Rule

> **OKF = the brain. Knows HOW things work.**
> Configuration, knowledge, templates, role blueprints, canvas layouts,
> skills, policies, wiki, site design.
> Static or slow-changing. AI reads it to understand the workspace.

> **Turso = the memory. Knows WHAT happened.**
> Live data, events, relationships, counts, records.
> Fast-changing. App and worker read/write it constantly.

| Question | Answer lives in |
|---|---|
| What modules does a waiter get? | OKF `people/roles.md` |
| How is the canvas laid out at lunch rush? | OKF `team/canvas.md` |
| What tables does Ahmed serve? | Turso `graph` (rel=5 assigned_to) |
| What is currently on order at T12? | Turso `matter` (type=order) |
| How does a sale get processed? | OKF `skills/orders.md` |
| What sales happened today? | Turso `motion` (type=101) |
| What is the return policy? | OKF `wiki/policies/returns.md` |
| Who is the customer for order #123? | Turso `graph` (rel=1 placed_by) |
| What is the invoice template? | OKF `wiki/templates/invoice.md` |
| What is the specific invoice for Ali? | Turso `matter` (type=6) |

---

## 14. DB Optimisation Rules

### Rule 1 — Integer Type Codes (not strings)

`type` column in every table stores an **integer**, not a string.
Type names live in OKF `types.md` — not in the DB.
Saves ~60–80% storage on the type column. Integer comparison is faster.

```
OKF: types.md

MATTER TYPES                        RANGE RESERVATION
────────────                        ─────────────────────────────────────────
1  = person                         1–49    core matter types (this plan)
2  = company                        50–99   reserved for future core types
3  = product                        100–199 custom matter (workspace-defined)
4  = service
5  = listing
6  = document
7  = asset
8  = location
9  = pipeline
10 = card
11 = note
12 = goal
13 = expense
14 = order           order / ticket / job being processed

MOTION TYPES                        RANGE RESERVATION
────────────────────                ─────────────────────────────────────────
101 = sale                          101–199 core workspace motion (this plan)
102 = refund                        200–299 personal motion types
103 = quote                         300–399 custom motion (workspace-defined)
104 = invoice                       400+    reserved
105 = purchase_order
106 = vendor_bill
107 = payment
108 = stock_receive
109 = stock_transfer
110 = stock_adjust
111 = stock_writeoff
112 = booking
113 = booking_cancel
114 = shipment
115 = delivery
116 = activity
117 = assignment
118 = clock_in
119 = clock_out
120 = card_stage
121 = card_won
122 = card_lost
123 = status_change
124 = order_placed   order created, kitchen not yet started
125 = order_ready    kitchen finished, waiting for service
126 = order_served   order delivered to customer

PERSONAL MOTION TYPES
─────────────────────
201 = expense_log
202 = reminder_triggered
203 = goal_update
204 = personal_note

INBOX TYPES                         RANGE RESERVATION
────────────                        ─────────────────────────────────────────
1 = task                            1–9  core inbox types
2 = alert                           10+  reserved
3 = approval
4 = reminder
5 = notification
6 = suggestion

GRAPH REL TYPES (rel column)        STRUCTURAL RELATIONSHIPS ONLY
─────────────────────────────       (transactional links live in motion data JSON)
1  = placed_by     order/booking → person
2  = RESERVED      (was: contains order→product — moved to motion data JSON)
3  = fulfills      shipment → order
4  = works_at      person → company / workspace
5  = assigned_to   person → location/tables
6  = stored_at     product → location
7  = from          vendor_bill → company
8  = for_contact   card → person/company
9  = in_pipeline   card → pipeline
10 = owned_by      card → person (staff)
11 = about         activity → card/person
12 = member_of     user → workspace (membership registry)
13 = linked_to     contact → goal
14 = variant_of    variant → parent product
15 = served_by      order → person (staff who served it)
16–49              reserved for future core rel types
50+                workspace-defined custom rel types
```

---

### Rule 2 — Compact JSON Keys in `data` Column

The `data` column stores JSON per row. Use short keys.
Key map lives in OKF `types.md` alongside type codes.

```
❌  { "first_name": "Ahmed", "phone_number": "050..." }
✅  { "fn": "Ahmed", "ph": "050..." }
```

---

### Rule 3 — Composite Indexes

Create these indexes on every DB at creation time:

```sql
-- matter: filter by type + status is the most common query
CREATE INDEX idx_matter ON matter (type, status);

-- motion: filter by type + time range
CREATE INDEX idx_motion ON motion (type, timestamp DESC);

-- graph: lookups by source or target
CREATE INDEX idx_graph_src ON graph (src, rel);
CREATE INDEX idx_graph_tgt ON graph (tgt, rel);

-- inbox: always by user + status (personal DB)
CREATE INDEX idx_inbox ON inbox (user_id, status, created_at DESC);
```

---

### Rule 4 — Soft Deletes and Row Purging

**Soft Delete Column — `deleted_at`**

`status` (INTEGER) encodes operational state: `0` = inactive/out-of-stock, `1` = active.
It must NOT be used to signal deletion — those are different concepts and conflating them causes query bugs.

Every table (`matter`, `motion`, `graph`, `inbox`) has:
```sql
deleted_at TIMESTAMP NULL DEFAULT NULL
```
- `deleted_at = NULL`  → row is live
- `deleted_at = <timestamp>` → row is soft-deleted, hidden from all app queries

All app queries append: `WHERE deleted_at IS NULL`
All indexes include the condition implicitly via partial index:
```sql
CREATE INDEX idx_matter ON matter (type, status) WHERE deleted_at IS NULL;
```

**Nightly Purge Job (taragent cron)**

```
inbox   deleted_at IS NOT NULL AND deleted_at < now - 7d   → hard delete
inbox   status=done AND deleted_at IS NULL                 → soft delete after 30d
motion  deleted_at IS NULL AND at < now - 90d              → archive to OKF snapshot,
                                                              then soft delete
matter  deleted_at IS NOT NULL AND deleted_at < now - 30d → hard delete
```

Motion events older than 90 days are rarely queried live.
Reports and history are generated from archived OKF snapshots.
This keeps DB row count flat and storage cost predictable.

---

### Rule 5 — Selective SELECT (Never SELECT *)

Always fetch only the columns the UI needs.

```sql
-- ❌ Pulls full data JSON blob on every row
SELECT * FROM matter WHERE type = 1;

-- ✅ Only what the list view needs
SELECT id, title, status FROM matter WHERE type = 1 LIMIT 50;

-- ✅ Only what the inbox screen needs
SELECT id, title, type, priority, workspace_id, created_at
FROM inbox
WHERE user_id = ? AND status = 1
ORDER BY priority DESC, created_at DESC
LIMIT 50;
```

---

### Optimisation Impact Summary

| Rule | Benefit |
|---|---|
| Integer type codes | ~70% less storage on type column, faster index scans |
| Compact JSON keys | ~30–40% less storage on data column |
| Composite indexes | ~70–90% fewer rows scanned per query |
| Row purging | Storage cost stays flat over time |
| Selective SELECT | ~50–70% less data transferred per query |

---

## 15. Channels Architecture — Current vs New Plan

Channels (Telegram, Discord, Slack, WhatsApp) allow team members and customers to interact with workspaces via conversational messages, quick slash commands, and automated alert feeds without needing to keep the mobile app open at all times.

### Current Implementation vs New Plan

```
CURRENT IMPLEMENTATION (Legacy)
┌─────────────────────────────────────────────────────────────────────────┐
│ • Hardcoded slash commands & manual regex matching in webhook files.    │
│ • Flat D1 tables (channels, members, workspaces) with string scopes.    │
│ • Direct DB writes using legacy string types ('customer', 'order').     │
│ • Workspace owns an `inbox` table where pending approvals sit.          │
│ • Member management requires separate channel roles vs app users.       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Refactored To
NEW ARCHITECTURE (plan6)
┌─────────────────────────────────────────────────────────────────────────┐
│ • Channels act as a lightweight conversational Gateway into taragent.   │
│ • Channel messages parsed via OKF Skills (skills/*.md) + LLM intent.    │
│ • Writes to Workspace Turso using Integer Type Codes & compact JSON.    │
│ • NO workspace inbox table — events push to User Personal DBs.          │
│ • Zero-UI Member Onboarding: Channel membership IS the workspace team. │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Side-by-Side Comparison

| Feature / Layer | Current Channel Implementation (`taragent/src/channels`) | New Architecture (`plan6.md`) |
|---|---|---|
| **Storage Schema** | String types (`'customer'`, `'product'`, `'order'`), legacy columns (`value`, `scope`, `at`, `updated`) | Integer type codes (`type=1` person, `type=3` product, `type=101` sale), compact JSON keys (`fn`, `ph`, `amt`) |
| **Intent Processing** | Hardcoded regex / string matching in `telegram.ts` (`lowerText.includes('contact')`, `lowerText.includes('refund')`) | **OKF Skill-Driven**: `taragent` matches intent against workspace `skills/*.md` (e.g. `orders.md`, `contacts.md`) via LLM reasoning |
| **Task / Inbox Flow** | Inserted into Workspace DB `inbox` table (`type='refund'`, `status='pending_approval'`) | **Personal DB Push**: `taragent` resolves responsible staff via Turso `graph` and inserts directly into their **Personal DB `inbox` table** |
| **Channel Config & Routing** | D1 `channels` table maps `chat_id` → `scope` | D1 `channels` table maps `chat_id` → `subdomain` (Turso workspace DB + OKF S3 prefix) |
| **Role Enforcement** | Flat lookup in D1 `members` table | Evaluates user against OKF `people/roles.md` + OKF `team/members.md` + Turso `matter` (type=1) |
| **Response & Alerts** | Synchronous bot reply to chat | Two-way: Instant bot reply + asynchronous notification dispatch to member personal DBs & channel pings |

---

## 16. Channel-First Member Management & Zero-UI Onboarding

### The Problem with Traditional App Member Management
In typical business software:
1. Owner has to open an admin dashboard, type staff emails/phones, configure permissions, and send email invites.
2. Staff must receive an email, click a link, create a password, download the app, and log in.
3. Owner *also* has to create a Telegram or Discord group for daily team chatter.
4. When someone joins, leaves, or changes shifts, owner must update both the chat group and the app dashboard (dual management, inevitable desync).
5. Mobile app UI gets cluttered with bulky "Manage Team", "Permissions Matrix", and "Invite Staff" forms.

### The Tar Solution: Channel-First, Zero-UI Onboarding
**The Telegram/Discord group is the primary interface for team management.**
There are no member invitation screens in `tarapp`. The chat channel serves as the single source of truth.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ZERO-UI MEMBER ONBOARDING LIFECYCLE                       │
└──────────────────────────────────────────────────────────────────────────────┘

 1. LINK WORKSPACE (One-Time)
    Owner in Telegram/Discord group:
    👉 /link alnoor
    └─ taragent binds group chat_id to workspace `alnoor`

 2. ASSIGN ROLE IN CHAT
    Owner in chat:
    👉 /role @ahmed waiter tables:12-15
    ├─ 1. taragent writes to OKF `team/members.md`
    ├─ 2. Turso Workspace DB: creates matter type=1 (person: Ahmed, handle: @ahmed)
    └─ 3. Turso Workspace DB: creates graph rel=5 (assigned_to tables 12-15)

 3. ZERO-FRICTION 1-TAP BINDING
    Bot replies in chat (or DMs Ahmed):
    "👋 Ahmed, you've been assigned Waiter at Al Noor Restaurant!
     Tap to open your workspace: [Open in TarApp](https://alnoor.tarai.space/join?token=xyz)"
    └─ Ahmed taps link → opens tarapp → binds Ahmed's user_{id}
    └─ Ahmed's Personal DB: graph src=ahmed rel=12(member_of) tgt=ws_alnoor

 4. INSTANT READY CANVAS
    Ahmed opens tarapp:
    ├─ Workspace Switcher shows: "Al Noor Restaurant"
    └─ Canvas auto-loads Waiter layout (Table Grid 12-15, Order Queue) from OKF
```

### Complete Lifecycle Actions via Channel

| Owner / Admin Action in Chat | What taragent Automatically Executes | tarapp UI / System Impact |
|---|---|---|
| `/role @fatima chef` | 1. OKF `team/members.md` updated with `@fatima` as `chef`<br>2. Workspace Turso `matter` creates `type=1` person record<br>3. Bot DMs Fatima magic join link | When Fatima taps link, `tarapp` automatically mounts the **Kitchen Order Queue Canvas** |
| `/role @ahmed manager` | 1. OKF `team/members.md` role updated to `manager`<br>2. Workspace Turso `matter` updated | Next time Ahmed opens `tarapp`, Canvas switches from Table Grid to **Manager Dashboard Canvas** |
| `/remove @ahmed`<br>*(or Ahmed leaves group)* | 1. `taragent` marks Ahmed `status=0` in workspace `matter`<br>2. Graph `rel=4 (works_at)` deleted<br>3. Ahmed's personal DB `graph` `rel=12 (member_of)` removed | Workspace disappears from Ahmed's `tarapp` Workspace Switcher immediately. Access revoked. |
| `/team` | `taragent` queries OKF `team/members.md` + Turso `matter` | Bot displays live list of team members, active roles, and table/zone assignments in chat |

### Why This Design is Uncluttered & Perfect

1. **Zero UI Clutter in `tarapp`**:
   - `tarapp` contains zero forms for managing staff, passwords, or permission toggles.
   - Mobile app focuses 100% on what matters: the **Unified Inbox** (tasks to act on) and the **GenUI Canvas** (tools to do work).
2. **Zero Dual Management**:
   - Adding, promoting, or removing staff happens right where the team already communicates (Telegram / Discord).
   - Leaving the Telegram group automatically revokes app access.
3. **No Setup Friction for Staff**:
   - Staff don't need manual invites or credential setup. Tapping the bot's magic link securely binds their personal DB to the workspace in 1 click.
4. **Channel-Only Staff Supported**:
   - Part-time staff or drivers who don't want to install `tarapp` can still receive tasks and log sales/motions directly inside Telegram.
   - Staff who use `tarapp` get the rich interactive Canvas and unified inbox. Both share the exact same Turso DB.

---

## 17. The Hybrid Channel + tarapp Decision Framework

The Tar system is built on a deliberate hybrid model: **Channels handle what text is best at; tarapp handles what a rich UI is best at.** Neither is a fallback — they are complementary surfaces designed for different cognitive modes and contexts.

---

### Core Insight: Two Modes of Work

```
REACTIVE MODE  (things that just happened — quick, in-the-flow)
  Best surface:  Channel (Telegram / Discord)
  Context:       Staff already in the group chat. No app switch needed.
  Input:         Natural language text or short slash commands.
  Output:        Instant bot confirmation in the same thread.

ACTIVE MODE  (things the user intentionally navigates to — requires focus)
  Best surface:  tarapp (GenUI Canvas + Inbox Screen)
  Context:       Staff opens the app to do structured operational work.
  Input:         Tapping live data grids, visual forms, spatial layouts.
  Output:        Real-time visual state (table map, queues, reports).
```

---

### Decision Table — Channel vs tarapp

| Action | Channel ✅ / ❌ | tarapp ✅ / ❌ | Why |
|---|---|---|---|
| Log a sale | ✅ `Table 7: 2x burger $45 cash` | ✅ Also via POS Canvas | Channels win mid-service — zero context switch needed |
| Log a refund request | ✅ `refund $20 wrong item` | ✅ Also works | Happens inside the team conversation; manager notified instantly |
| Clock in / out | ✅ `clock in` / `clock out` | ✅ Also works | Quick gesture at shift start/end; chat is already open |
| Report a stock issue | ✅ `Coca Cola ran out` | ✅ Also works | On-the-spot capture; manager alerted in same thread |
| Add a customer / contact | ✅ `Add customer Fatima 050-xxx` | ✅ Also works | Captured during a call or visit; no form needed |
| Ask a policy / wiki question | ✅ `what is our return policy?` | ❌ Not applicable | OKF wiki query; needs no app, just a text answer |
| **Add / onboard a team member** | ✅ `/role @ahmed waiter` | ❌ NOT in tarapp | Channel is the single authority — no dual management |
| **Change role / offboard member** | ✅ `/role @ahmed manager` / `/remove @ahmed` | ❌ NOT in tarapp | Channel is source of truth; revokes app access instantly |
| View live table floor status | ❌ Text cannot show a live grid | ✅ Canvas — Table Grid | Requires spatial map of 20+ tables with live colour states |
| Work through an order queue | ❌ Sequence unmanageable in text | ✅ Canvas — Order Queue | Ordered list with tap-to-complete and countdown timers |
| Process payment / POS checkout | ❌ Too many structured inputs | ✅ Canvas — Payment Terminal | Item picker, totals, payment method, receipt — all visual |
| View unified inbox (all tasks) | ❌ Cannot render prioritised list | ✅ Inbox Screen | Priority + multi-workspace sorting; one-tap actions |
| Approve a pending task | ✅ `approve ibx_xyz` (works) | ✅ Inbox — better with context | Approval card shows full details before confirming |
| Check daily sales / report | ✅ Bot can summarise in text | ✅ Canvas — better with charts | Numbers with trends are faster to read visually |
| Manage pipeline / card stages | ❌ Too relational for text | ✅ Canvas — Pipeline module | Kanban stages; visual state of all active deals |
| Browse / search product catalog | ❌ Long lists break in text | ✅ Canvas — Stock Lookup / POS | Searchable, filterable, image-capable list |
| View delivery map | ❌ Impossible in text | ✅ Canvas — Live Map module | GPS positions + delivery sequence require a map |
| Shift handover note | ✅ Bot auto-posts to group | ✅ Canvas — Handover panel | Both: AI writes the note; surfaces on channel and app |

---

### The Five Rules That Make This Hybrid Correct

**Rule 1 — Channels own membership. tarapp owns the work surface.**
No staff roster UI in `tarapp`. The channel is the admin console for who is on the team and what role they hold. This eliminates duplicate effort — one place, one truth.

**Rule 2 — Channel captures; tarapp displays.**
A waiter types "Table 5 paid $80 cash" in Telegram → `taragent` logs the sale motion, pushes the inbox notification. The manager sees it on the Canvas Report Card in real time. Input lives where people are (chat); structured state display lives in the app.

**Rule 3 — Text is best for events. UI is best for state.**
"2 burgers sold" is an event — a sentence captures it perfectly. "Which tables are free right now" is live spatial state — needs a visual floor plan. The model never confuses these two things.

**Rule 4 — tarapp has zero admin screens.**
Because channels handle team management and OKF holds workspace configuration, `tarapp` never shows a Settings → Members, Permissions, Roles, or Invitations screen. The entire UI is purely operational — Inbox and Canvas.

**Rule 5 — Channel-only is a valid first-class tier.**
A small shop with 2 staff may never install `tarapp`. They operate entirely via Telegram. `taragent` logs all sales, contacts, and events into Turso. When they upgrade later, the full history and team structure is already there waiting.

---

### Collaboration: Where Channel Ends and tarapp Begins

The Telegram/Discord group **is the team collaboration layer** — daily chat, quick announcements, and rapid event capture. `tarapp` is not a collaboration tool — it is an **operations tool**. The two have no overlap by design.

```
TEAM COLLABORATION (channels do this)
  ├── Announcements:   "Lunch rush at 12, all hands"
  ├── Event capture:   "Table 12 paid — clock out now"
  ├── Bot alerts:      taragent pushes notifications back to group
  ├── Membership:      /role, /remove, /team
  └── Knowledge:       "what is our return policy?" → AI answers from OKF wiki

OPERATIONS (tarapp does this)
  ├── Inbox:      all tasks across all workspaces, prioritised, actionable
  ├── Canvas:     live work surface — tables, queues, POS, maps, pipelines
  └── Reports:    sales, hours, trends — always current, always visual
```

There is deliberately **no in-app team chat in `tarapp`** — because Telegram, WhatsApp, and Discord already exist and are categorically better at group messaging than any in-app chat could be. Building one would duplicate a solved problem, add UI complexity, and create a ghost channel nobody uses while the real conversation stays in Telegram.

---

### Is This the Best Hybrid Approach?

**Yes. Here is why it is architecturally superior to every alternative:**

| Alternative | Problem |
|---|---|
| **App-only** (all management in `tarapp`) | Forces install + login before onboarding starts. Admin builds and maintains team management screens. Constant desync with the chat group staff use anyway. |
| **Channel-only** (everything via Telegram) | Cannot show a live 20-table floor plan, payment terminal, or prioritised inbox. Text is one-dimensional; complex operational state is unrepresentable. |
| **Separate chat built into tarapp** | Rebuilding what Telegram already does best. Staff won't switch their daily messaging habits. Creates a ghost channel. Two chat apps, zero benefit. |
| **Email / link invitations** | High friction. Email invites get ignored. Password resets create support overhead. Onboarding a new waiter takes days instead of seconds. |
| **This hybrid (Tar)** | Channels own membership + team communication (zero friction, where staff already are). `tarapp` owns structured operations + live visual state. Both read/write the same Turso DB. No duplication. No admin overhead. No desync. |

The design works because it **respects where people naturally are** (the chat group) and **adds power exactly where text cannot go** (the GenUI Canvas). Neither surface tries to be the other.

---

## 18. Inbox Real-Time Delivery — Turso Sync

The inbox table lives in the user's **personal DB** (`user_{id}`) on Turso.
`taragent` writes rows to it remotely when workspace events occur.
`tarapp` uses `@tursodatabase/sync-react-native` — already set up — which keeps a
**local SQLite replica** of the personal DB on the device.

This means the inbox problem is already solved. No Durable Objects, no SSE, no polling loop.

```
taragent writes inbox row → remote personal DB (Turso)
                                      │
                         syncInterval / db.pull()
                                      │
                                      ▼
                         Local SQLite replica on device
                                      │
                                      ▼
                         tarapp reads local — instant, offline-capable
```

### Configuration

```js
const db = new Database({
  path: getDbPath('user_ahmed.db'),
  url:  'libsql://user-ahmed.turso.io',
  authToken: '...',
  syncInterval: 5,       // pull every 5s when app is active
});

// Also pull explicitly on app foreground
AppState.addEventListener('change', state => {
  if (state === 'active') db.pull();
});
```

### Why this works for inbox

| Property | Behaviour |
|---|---|
| **Read latency** | ~0ms — reads local SQLite, no network |
| **New row visibility** | Within 5s (next `pull()` tick) or instant on foreground |
| **Offline** | Inbox readable with no connection |
| **taragent writes** | Go directly to remote Turso — unaffected |
| **Extra infrastructure** | None — same personal DB, same Turso account |
| **Battery** | Transfers WAL delta only (one row of text) — negligible |

The `syncInterval: 5` (seconds) is sufficient for inbox. A 5-second delay between
"kitchen marks order ready" and the waiter seeing it in the Inbox Screen is
imperceptible in practice. Call `db.pull()` on app foreground for instant refresh.
